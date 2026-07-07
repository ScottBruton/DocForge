import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, ClipboardCheck, X, XCircle,
} from 'lucide-react';
import { useAuditStore, useDocumentStore, useProjectStore } from '@/stores';
import { AIAuditService } from '@/services/ai/AIAuditService';
import { computeDiffSnippet, previewAuditBlockMerge } from '@/services/ai/auditMerge';
import {
  AUDIT_CRITERIA,
  extractBlockPreview,
  type AuditCriterionId,
  type AuditFinding,
  type JustificationStrength,
  JUSTIFICATION_STRENGTH_LABELS,
  type SuggestionStatus,
} from '@/services/ai/auditTypes';
import { findBlock } from '@/lib/documentFactory';
import { getCellValue } from '@/blocks/table/tableUtils';
import type { Block } from '@/schema';
import { ListItemDiffHighlight, ContextualChangePreview } from '@/components/ai/AuditTextHighlight';

const DEFAULT_CRITERIA: AuditCriterionId[] = AUDIT_CRITERIA.filter(
  (c) => c.id !== 'linked_document',
).map((c) => c.id);

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-900/40 text-red-300 border-red-800',
  warning: 'bg-amber-900/40 text-amber-300 border-amber-800',
  suggestion: 'bg-blue-900/40 text-blue-300 border-blue-800',
  info: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const JUSTIFICATION_STRENGTH_STYLES: Record<JustificationStrength, string> = {
  weak: 'bg-red-900/40 text-red-300 border-red-800',
  ok: 'bg-amber-900/40 text-amber-300 border-amber-800',
  strong: 'bg-green-900/40 text-green-300 border-green-800',
};

export function AuditModal() {
  const isOpen = useAuditStore((s) => s.isModalOpen);
  const setOpen = useAuditStore((s) => s.setModalOpen);
  const isAuditing = useAuditStore((s) => s.isAuditing);
  const lastError = useAuditStore((s) => s.lastError);
  const auditWarning = useAuditStore((s) => s.auditWarning);
  const result = useAuditStore((s) => s.result);
  const resetAudit = useAuditStore((s) => s.reset);

  const document = useDocumentStore((s) => s.document);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const linkedWord = useProjectStore((s) => s.linkedWordDocument);

  const [prompt, setPrompt] = useState('');
  const [criteria, setCriteria] = useState<AuditCriterionId[]>(DEFAULT_CRITERIA);
  const [thoroughness, setThoroughness] = useState<'standard' | 'thorough'>('thorough');
  const [reviewJustifications, setReviewJustifications] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SuggestionStatus>>({});
  const [applyError, setApplyError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'configure' | 'results'>('configure');

  useEffect(() => {
    if (!isOpen) {
      setPhase('configure');
      setSelectedId(null);
      setStatuses({});
      setApplyError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (result && phase === 'configure') {
      setPhase('results');
      const initial: Record<string, SuggestionStatus> = {};
      for (const f of result.findings) {
        initial[f.id] = 'pending';
      }
      setStatuses(initial);
      const firstActionable = result.findings.find((f) => f.actionable && f.proposedChange?.action !== 'none');
      setSelectedId(firstActionable?.id ?? result.findings[0]?.id ?? null);
    }
  }, [result, phase]);

  const toggleCriterion = (id: AuditCriterionId) => {
    setCriteria((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleRunAudit = async () => {
    if (criteria.length === 0 && !reviewJustifications) return;
    const auditCriteria = linkedWord
      ? [...new Set([...criteria, 'linked_document' as AuditCriterionId])]
      : criteria;

    await AIAuditService.runAudit(document, {
      prompt,
      criteria: auditCriteria,
      linkedWordFilename: linkedWord?.original_filename,
      thoroughness,
      reviewJustifications,
    });
  };

  const canRunAudit = criteria.length > 0 || reviewJustifications;

  const selectedFinding = result?.findings.find((f) => f.id === selectedId) ?? null;

  const pendingCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'pending').length,
    [statuses],
  );

  const justificationSummary = useMemo(() => {
    if (!result) return null;
    const rated = result.findings.filter((f) => f.justificationRating);
    if (rated.length === 0) return null;
    return {
      total: rated.length,
      weak: rated.filter((f) => f.justificationRating === 'weak').length,
      ok: rated.filter((f) => f.justificationRating === 'ok').length,
      strong: rated.filter((f) => f.justificationRating === 'strong').length,
    };
  }, [result]);

  const advanceToNext = (findingId: string, updatedStatuses: Record<string, SuggestionStatus>) => {
    if (!result) return;
    const idx = result.findings.findIndex((f) => f.id === findingId);
    const isPending = (id: string) => (updatedStatuses[id] ?? 'pending') === 'pending';
    const next = result.findings.slice(idx + 1).find((f) => isPending(f.id));
    if (next) {
      setSelectedId(next.id);
      return;
    }
    const prev = result.findings.slice(0, idx).find((f) => isPending(f.id));
    if (prev) setSelectedId(prev.id);
  };

  const handleAccept = useCallback(
    (finding: AuditFinding) => {
      setApplyError(null);
      const currentDoc = useDocumentStore.getState().document;
      const built = AIAuditService.buildApplyAction(currentDoc, finding);
      if ('error' in built) {
        setApplyError(built.error);
        return;
      }
      dispatch(built.action);
      setStatuses((prev) => {
        const next = { ...prev, [finding.id]: 'accepted' as const };
        advanceToNext(finding.id, next);
        return next;
      });
    },
    [dispatch, result],
  );

  const handleReject = useCallback(
    (findingId: string) => {
      setApplyError(null);
      setStatuses((prev) => {
        const next = { ...prev, [findingId]: 'rejected' as const };
        advanceToNext(findingId, next);
        return next;
      });
    },
    [result],
  );

  const handleClose = () => {
    setOpen(false);
    resetAudit();
    setPhase('configure');
  };

  const handleBack = () => {
    resetAudit();
    setPhase('configure');
    setStatuses({});
    setSelectedId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-300">AI Audit</h2>
            {phase === 'results' && result && (
              <span className="text-[10px] text-zinc-500">
                {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''}
                {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
              </span>
            )}
          </div>
          <button type="button" onClick={handleClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        {phase === 'configure' ? (
          <>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Additional instructions (optional)
                </label>
                <textarea
                  className="h-24 w-full resize-none rounded border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none"
                  placeholder="e.g. Review against ISO 9001 style, focus on executive summary, check acronyms are defined on first use…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">Review criteria</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-[10px] text-blue-400 hover:underline"
                      onClick={() => setCriteria(AUDIT_CRITERIA.map((c) => c.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-zinc-500 hover:underline"
                      onClick={() => setCriteria([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {AUDIT_CRITERIA.map((criterion) => (
                    <label
                      key={criterion.id}
                      className={`flex cursor-pointer gap-2 rounded border px-2.5 py-2 text-xs transition-colors ${
                        criteria.includes(criterion.id)
                          ? 'border-amber-800/60 bg-amber-950/20 text-zinc-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={criteria.includes(criterion.id)}
                        onChange={() => toggleCriterion(criterion.id)}
                      />
                      <span>
                        <span className="font-medium">{criterion.label}</span>
                        <span className="mt-0.5 block text-[10px] text-zinc-500">{criterion.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {linkedWord && (
                  <p className="mt-2 text-[10px] text-zinc-500">
                    Linked Word document ({linkedWord.original_filename}) will be included in the review scope automatically.
                  </p>
                )}
              </div>

              <label
                className={`flex cursor-pointer gap-3 rounded border px-3 py-3 text-xs transition-colors ${
                  reviewJustifications
                    ? 'border-violet-800/60 bg-violet-950/20 text-zinc-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={reviewJustifications}
                  onChange={(e) => setReviewJustifications(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-zinc-200">Review justifications</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
                    Find statements that justify decisions, methods, requirements, or conclusions.
                    Rate each as Weak, OK, or Strong in context of the full document, and suggest
                    stronger wording where needed.
                  </span>
                </span>
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium text-zinc-300">Review depth</span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex cursor-pointer flex-col rounded border px-3 py-2 text-xs transition-colors ${
                      thoroughness === 'thorough'
                        ? 'border-amber-800/60 bg-amber-950/20 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audit-thoroughness"
                      className="sr-only"
                      checked={thoroughness === 'thorough'}
                      onChange={() => setThoroughness('thorough')}
                    />
                    <span className="font-medium">Thorough</span>
                    <span className="mt-0.5 text-[10px] text-zinc-500">
                      Section-by-section review; returns many findings (recommended).
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer flex-col rounded border px-3 py-2 text-xs transition-colors ${
                      thoroughness === 'standard'
                        ? 'border-amber-800/60 bg-amber-950/20 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audit-thoroughness"
                      className="sr-only"
                      checked={thoroughness === 'standard'}
                      onChange={() => setThoroughness('standard')}
                    />
                    <span className="font-medium">Standard</span>
                    <span className="mt-0.5 text-[10px] text-zinc-500">
                      Focused review; fewer, higher-priority findings.
                    </span>
                  </label>
                </div>
              </div>

              {lastError && <p className="text-xs text-red-400">{lastError}</p>}
            </div>

            <div className="border-t border-zinc-800 p-4">
              <button
                type="button"
                disabled={isAuditing || !canRunAudit}
                onClick={() => void handleRunAudit()}
                className="w-full rounded bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {isAuditing ? 'Auditing…' : 'Run AI Audit'}
              </button>
            </div>
          </>
        ) : (
          result && (
            <>
              <div className="border-b border-zinc-800 px-4 py-3">
                {justificationSummary && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-violet-400">
                      Justifications: {justificationSummary.total}
                    </span>
                    {justificationSummary.weak > 0 && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${JUSTIFICATION_STRENGTH_STYLES.weak}`}>
                        {justificationSummary.weak} weak
                      </span>
                    )}
                    {justificationSummary.ok > 0 && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${JUSTIFICATION_STRENGTH_STYLES.ok}`}>
                        {justificationSummary.ok} ok
                      </span>
                    )}
                    {justificationSummary.strong > 0 && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${JUSTIFICATION_STRENGTH_STYLES.strong}`}>
                        {justificationSummary.strong} strong
                      </span>
                    )}
                  </div>
                )}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    {result.findings.length} finding{result.findings.length === 1 ? '' : 's'}
                  </span>
                </div>
                {auditWarning && (
                  <p className="mb-2 rounded border border-amber-800/60 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-300">
                    {auditWarning}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-zinc-300">{result.summary}</p>
                {result.strengths.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-green-500">Strengths</span>
                    <ul className="mt-1 list-inside list-disc text-xs text-zinc-400">
                      {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-1">
                <div className="w-2/5 shrink-0 overflow-auto border-r border-zinc-800">
                  {result.findings.length === 0 ? (
                    <p className="p-4 text-sm text-zinc-500">No issues found.</p>
                  ) : (
                    result.findings.map((finding) => (
                      <FindingListItem
                        key={finding.id}
                        finding={finding}
                        selected={finding.id === selectedId}
                        status={statuses[finding.id] ?? 'pending'}
                        onClick={() => {
                          setSelectedId(finding.id);
                          setApplyError(null);
                        }}
                      />
                    ))
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-auto p-4">
                  {selectedFinding ? (
                    <FindingDetail
                      finding={selectedFinding}
                      document={document}
                      status={statuses[selectedFinding.id] ?? 'pending'}
                      applyError={applyError}
                      onAccept={() => handleAccept(selectedFinding)}
                      onReject={() => handleReject(selectedFinding.id)}
                    />
                  ) : (
                    <p className="text-sm text-zinc-500">Select a finding to review</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-800 p-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  New audit
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded bg-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600"
                >
                  Done
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

function FindingListItem({
  finding,
  selected,
  status,
  onClick,
}: {
  finding: AuditFinding;
  selected: boolean;
  status: SuggestionStatus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 border-b border-zinc-800/80 px-3 py-2.5 text-left transition-colors ${
        selected ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/40'
      }`}
    >
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] uppercase ${SEVERITY_STYLES[finding.severity]}`}>
            {finding.severity}
          </span>
          {finding.justificationRating && (
            <span
              className={`shrink-0 rounded border px-1 py-0.5 text-[9px] uppercase ${JUSTIFICATION_STRENGTH_STYLES[finding.justificationRating]}`}
            >
              {JUSTIFICATION_STRENGTH_LABELS[finding.justificationRating]}
            </span>
          )}
          {finding.actionable && status === 'pending' && (
            <span className="text-[9px] text-amber-500">Actionable</span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs font-medium text-zinc-200">{finding.title}</div>
        {finding.location?.sectionTitle && (
          <div className="truncate text-[10px] text-zinc-500">{finding.location.sectionTitle}</div>
        )}
      </div>
      <ChevronRight size={14} className="shrink-0 text-zinc-600" />
    </button>
  );
}

function normalizeForPreviewCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function StatusIcon({ status }: { status: SuggestionStatus }) {
  if (status === 'accepted') return <Check size={14} className="mt-0.5 shrink-0 text-green-400" />;
  if (status === 'rejected') return <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" />;
  return <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-600" />;
}

function TextBlockChangePreview({
  currentBlock,
  mergePreview,
  excerpt,
}: {
  currentBlock: Block;
  mergePreview: Extract<MergeAuditResult, { ok: true }>;
  excerpt?: string;
}) {
  const fullBefore = extractBlockPreview(currentBlock);
  const fullAfter = mergePreview.textSnippetDiff?.fullTextAfter
    ?? extractBlockPreview({ ...currentBlock, content: mergePreview.content } as Block);

  let snippetBefore = mergePreview.textSnippetDiff?.before;
  let snippetAfter = mergePreview.textSnippetDiff?.after;
  if (!snippetBefore || !snippetAfter) {
    if (fullBefore !== fullAfter) {
      const diff = computeDiffSnippet(fullBefore, fullAfter);
      snippetBefore = diff.before;
      snippetAfter = diff.after;
    } else {
      snippetBefore = excerpt ?? fullBefore;
      snippetAfter = fullAfter;
    }
  }

  const noVisibleChange = normalizeForPreviewCompare(fullBefore) === normalizeForPreviewCompare(fullAfter);

  return (
    <div className="space-y-2 rounded border border-amber-900/40 bg-amber-950/10 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-amber-500">
        Proposed change
      </div>
      <p className="text-[10px] text-zinc-500">
        Changed wording is highlighted in context — surrounding text is shown for reference.
      </p>

      {noVisibleChange && (
        <p className="text-xs text-amber-400">
          Before and after text are identical — this suggestion may not change the document. Dismiss it or edit manually.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2">
          <div className="text-[10px] text-zinc-500">Before (in context)</div>
          <p className="mt-1">
            <ContextualChangePreview
              fullText={fullBefore}
              changedText={snippetBefore}
              compareText={snippetAfter}
              variant="remove"
            />
          </p>
        </div>
        <div className="rounded border border-green-900/40 bg-green-950/10 p-2">
          <div className="text-[10px] text-green-500">After (in context)</div>
          <p className="mt-1">
            <ContextualChangePreview
              fullText={fullAfter}
              changedText={snippetAfter}
              compareText={snippetBefore}
              variant="add"
            />
          </p>
        </div>
      </div>
    </div>
  );
}

function FindingDetail({
  finding,
  document,
  status,
  applyError,
  onAccept,
  onReject,
}: {
  finding: AuditFinding;
  document: ReturnType<typeof useDocumentStore.getState>['document'];
  status: SuggestionStatus;
  applyError: string | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  const change = finding.proposedChange;
  const isBlockChange =
    change?.action === 'update_block'
    || change?.action === 'update_list_items'
    || change?.action === 'update_table_cell';
  const isTableCellChange = change?.action === 'update_table_cell';
  const isJustificationWeakOrOk =
    finding.justificationRating === 'weak' || finding.justificationRating === 'ok';
  const hasSuggestedWording = Boolean(finding.suggestedWording?.trim());
  const canApply =
    finding.actionable &&
    change &&
    change.action !== 'none' &&
    status === 'pending';

  const currentBlock = useMemo(() => {
    if (!change || change.action === 'rename_section' || change.action === 'set_metadata' || change.action === 'none') {
      return null;
    }
    return findBlock(document, change.blockId)?.block ?? null;
  }, [change, document]);

  const tableCellBefore = useMemo(() => {
    if (!isTableCellChange || !change || change.action !== 'update_table_cell') return null;
    if (!currentBlock || currentBlock.type !== 'table') return null;
    return getCellValue(currentBlock.content, change.row, change.col);
  }, [change, currentBlock, isTableCellChange]);

  const mergePreview = useMemo(() => {
    if (!currentBlock || !change || change.action === 'update_table_cell') return null;
    if (change.action !== 'update_block' && change.action !== 'update_list_items') return null;
    const proposedContent =
      change.action === 'update_list_items'
        ? { items: change.itemUpdates }
        : change.content;
    return previewAuditBlockMerge(currentBlock, proposedContent, {
      excerpt: finding.location?.excerpt,
    });
  }, [change, currentBlock, finding.location?.excerpt]);

  const canSafelyApply = canApply && (isTableCellChange || mergePreview?.ok !== false);
  const showBlockPreview = Boolean(
    currentBlock
    && mergePreview?.ok
    && (change?.action === 'update_block' || change?.action === 'update_list_items'),
  );
  const showSuggestedWording =
    hasSuggestedWording
    && !showBlockPreview
    && !(canApply && isTableCellChange);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${SEVERITY_STYLES[finding.severity]}`}>
            {finding.severity}
          </span>
          {finding.justificationRating && (
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${JUSTIFICATION_STRENGTH_STYLES[finding.justificationRating]}`}
            >
              Justification: {JUSTIFICATION_STRENGTH_LABELS[finding.justificationRating]}
            </span>
          )}
        </div>
        <h3 className="mt-2 text-sm font-semibold text-zinc-100">{finding.title}</h3>
        {finding.location && (
          <p className="mt-1 text-[10px] text-zinc-500">
            {finding.location.sectionTitle && <span>{finding.location.sectionTitle}</span>}
            {finding.location.blockType && <span> · {finding.location.blockType}</span>}
          </p>
        )}
      </div>

      <p className="text-sm leading-relaxed text-zinc-300">{finding.description}</p>

      {finding.justificationRationale && (
        <div className="rounded border border-violet-900/40 bg-violet-950/10 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-violet-400">
            Rating rationale
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">{finding.justificationRationale}</p>
        </div>
      )}

      {finding.location?.excerpt && !showBlockPreview && (
        <div className="rounded border border-zinc-800 bg-zinc-950 p-2">
          <div className="text-[10px] font-medium text-zinc-500">Current excerpt</div>
          <p className="mt-1 text-xs italic text-zinc-400">{finding.location.excerpt}</p>
        </div>
      )}

      {showBlockPreview && mergePreview.itemDiffs && mergePreview.itemDiffs.length > 0 && (
        <div className="space-y-2 rounded border border-amber-900/40 bg-amber-950/10 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-amber-500">
            Proposed change · {mergePreview.itemDiffs.length} list item{mergePreview.itemDiffs.length === 1 ? '' : 's'}
          </div>
          <p className="text-[10px] text-zinc-500">Only the items below would change. All other list entries are preserved.</p>
          <div className="space-y-2">
            {mergePreview.itemDiffs.map((diff) => (
              <div key={diff.itemId} className="rounded border border-zinc-800 bg-zinc-950 p-2">
                <div className="text-[10px] text-zinc-500">Item {diff.index + 1}</div>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] text-zinc-500">Before</div>
                    <p className="mt-0.5">
                      <ListItemDiffHighlight before={diff.before} after={diff.after} side="before" />
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] text-green-500">After</div>
                    <p className="mt-0.5">
                      <ListItemDiffHighlight before={diff.before} after={diff.after} side="after" />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBlockPreview && !mergePreview.itemDiffs?.length && (
        <TextBlockChangePreview
          currentBlock={currentBlock}
          mergePreview={mergePreview}
          excerpt={finding.location?.excerpt}
        />
      )}

      {isBlockChange && mergePreview && !mergePreview.ok && (
        <div className="rounded border border-red-900/40 bg-red-950/20 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-red-400">Unsafe suggestion blocked</div>
          <p className="mt-1 text-xs text-red-300">{mergePreview.reason}</p>
        </div>
      )}

      {canApply && change?.action === 'rename_section' && (
        <div className="rounded border border-amber-900/40 bg-amber-950/10 p-3">
          <div className="text-[10px] font-medium text-amber-500">Proposed section title</div>
          <p className="mt-1 text-sm text-zinc-200">{change.title}</p>
        </div>
      )}

      {canApply && change?.action === 'set_metadata' && (
        <div className="rounded border border-amber-900/40 bg-amber-950/10 p-3">
          <div className="text-[10px] font-medium text-amber-500">Proposed metadata</div>
          <pre className="mt-1 overflow-auto text-xs text-zinc-300">{JSON.stringify(change.metadata, null, 2)}</pre>
        </div>
      )}

      {canApply && isTableCellChange && change?.action === 'update_table_cell' && (
        <div className="space-y-2 rounded border border-amber-900/40 bg-amber-950/10 p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-amber-500">
            Proposed table cell change
          </div>
          <p className="text-[10px] text-zinc-500">
            Row {change.row + 1}, column {change.col + 1}
          </p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-[10px] text-zinc-500">Current</div>
              <p className="mt-0.5 text-xs text-zinc-300">{tableCellBefore || '(empty)'}</p>
            </div>
            <div>
              <div className="text-[10px] text-green-500">Suggested</div>
              <p className="mt-0.5 text-xs text-zinc-200">{change.value}</p>
            </div>
          </div>
        </div>
      )}

      {showSuggestedWording && finding.suggestedWording && (
        <div className="rounded border border-green-900/40 bg-green-950/10 p-3">
          <div className="text-[10px] font-medium text-green-500">
            {isJustificationWeakOrOk ? 'Suggested stronger justification' : 'Suggested wording'}
            {!finding.actionable && ' (copy into document)'}
          </div>
          {finding.location?.excerpt ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-[10px] text-zinc-500">Original</div>
                <p className="mt-1">
                  <ContextualChangePreview
                    fullText={finding.location.excerpt}
                    changedText={finding.location.excerpt}
                    compareText={finding.suggestedWording}
                    variant="remove"
                  />
                </p>
              </div>
              <div>
                <div className="text-[10px] text-green-500">Suggested</div>
                <p className="mt-1">
                  <ContextualChangePreview
                    fullText={finding.suggestedWording}
                    changedText={finding.suggestedWording}
                    compareText={finding.location.excerpt}
                    variant="add"
                  />
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-zinc-200">{finding.suggestedWording}</p>
          )}
        </div>
      )}

      {!hasSuggestedWording
        && !finding.actionable
        && !(change?.action === 'update_block' && change.content?.text)
        && !isTableCellChange && (
        <p className="text-xs text-zinc-500">
          {isJustificationWeakOrOk
            ? 'No suggested wording was returned for this justification — try re-running the audit.'
            : 'This is informational feedback only — no automatic change suggested.'}
        </p>
      )}

      {status === 'accepted' && (
        <p className="text-xs text-green-400">Change applied to document.</p>
      )}
      {status === 'rejected' && (
        <p className="text-xs text-zinc-500">Suggestion dismissed.</p>
      )}

      {applyError && <p className="text-xs text-red-400">{applyError}</p>}

      {canSafelyApply && (
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onAccept}
            className="flex items-center gap-1.5 rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
          >
            <Check size={14} />
            Apply change
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            <XCircle size={14} />
            Dismiss
          </button>
        </div>
      )}

      {finding.actionable && status === 'pending' && change?.action === 'none' && (
        <button
          type="button"
          onClick={onReject}
          className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Mark as reviewed
        </button>
      )}
    </div>
  );
}
