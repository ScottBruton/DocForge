import OpenAI from 'openai';
import type { Block, Document } from '@/schema';
import { validateBlock } from '@/schema';
import { findBlock } from '@/lib/documentFactory';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuditStore } from '@/stores/auditStore';
import type { DocumentAction } from '@/services/documentReducer';
import {
  AUDIT_CRITERIA,
  AuditResultSchema,
  serializeDocumentForAudit,
  type AuditCriterionId,
  type AuditFinding,
  type AuditOptions,
  type AuditResult,
  type ProposedChange,
} from '@/services/ai/auditTypes';
import { mergeAuditBlockContent } from '@/services/ai/auditMerge';
import { setCellValue } from '@/blocks/table/tableUtils';
import { useStyleStore } from '@/stores/styleStore';
import { resolveQualityTextModel } from '@/lib/openaiModels';

export class AuditCancelledError extends Error {
  constructor() {
    super('Audit cancelled');
    this.name = 'AuditCancelledError';
  }
}

interface AuditPass {
  id: string;
  label: string;
  criterionId?: AuditCriterionId;
  isJustifications?: boolean;
}

function buildPassList(options: AuditOptions): AuditPass[] {
  const passes: AuditPass[] = [];
  for (const criterion of AUDIT_CRITERIA) {
    if (options.criteria.includes(criterion.id)) {
      passes.push({ id: criterion.id, label: criterion.label, criterionId: criterion.id });
    }
  }
  if (options.reviewJustifications) {
    passes.push({ id: 'justifications', label: 'Review justifications', isJustifications: true });
  }
  return passes;
}

function dedupeFindings(findings: AuditFinding[]): AuditFinding[] {
  const seen = new Set<string>();
  const unique: AuditFinding[] = [];
  for (const finding of findings) {
    const key = [
      finding.title.toLowerCase(),
      finding.location?.blockId ?? '',
      finding.location?.excerpt ?? '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(finding);
  }
  return unique;
}

function mergePassResults(results: AuditResult[], passes: AuditPass[]): AuditResult {
  const allFindings = results.flatMap((result, passIdx) => {
    const passId = passes[passIdx]?.id ?? `pass-${passIdx}`;
    return result.findings.map((finding, index) => ({
      ...finding,
      id: `${passId}-${finding.id}-${index}`,
      categories:
        finding.categories.length > 0
          ? finding.categories
          : passId === 'justifications'
            ? ['justifications']
            : [passId],
    }));
  });

  const strengths = [...new Set(results.flatMap((r) => r.strengths))].slice(0, 15);
  const findings = dedupeFindings(allFindings);

  const summary =
    results.length === 1
      ? results[0]!.summary
      : [
          `Audit completed across ${passes.length} review areas with ${findings.length} total findings.`,
          '',
          ...passes.map((pass, index) => {
            const count = results[index]?.findings.length ?? 0;
            return `• ${pass.label}: ${count} finding${count === 1 ? '' : 's'}`;
          }),
        ].join('\n');

  return { summary, strengths, findings };
}

export class AIAuditService {
  private static log(message: string) {
    useAuditStore.getState().addLog(message);
  }

  private static setStep(message: string) {
    useAuditStore.getState().setStep(message);
  }

  private static checkCancelled() {
    if (useAuditStore.getState().cancelRequested) {
      throw new AuditCancelledError();
    }
  }

  private static getClient(): OpenAI {
    const { settings } = useSettingsStore.getState();
    return new OpenAI({
      apiKey: settings.openaiApiKey,
      baseURL: settings.apiBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  private static buildSystemPrompt(
    options: AuditOptions,
    pass: AuditPass,
    thoroughness: 'standard' | 'thorough',
  ): string {
    const findingGuidance =
      thoroughness === 'thorough'
        ? `- Report every distinct issue for this review area — do not combine multiple problems into one.
- Include info and suggestion-level findings, not only critical/warning items.
- Aim for at least 8–25 findings for this area when issues exist on a document of this size.
- Return up to 40 findings for this pass if needed.`
        : `- Report all meaningful issues for this area; aim for at least 5–15 findings when warranted.
- Return up to 25 findings for this pass.`;

    const focusedScope = pass.isJustifications
      ? `FOCUSED PASS: Review justifications ONLY.`
      : `FOCUSED PASS: Review ONLY for "${pass.label}" (criterion id: ${pass.criterionId}).`;

    const copyEditingBlock =
      pass.criterionId === 'grammar_clarity'
        ? `
COPY EDITING (this pass):
- Review every paragraph, heading, quote, and list item for spelling, grammar, wording, and clarity.
- Return EVERY distinct wording issue as its own actionable finding with update_block.`
        : '';

    const formattingBlock =
      pass.criterionId &&
      ['formatting_style', 'figures_tables', 'section_consistency'].includes(pass.criterionId)
        ? `
FORMATTING (this pass):
- Use formattingAnalysis in the document JSON. Compare similar sections, figures, and tables.
- Report each formatting inconsistency as its own finding.`
        : '';

    const justificationsBlock = pass.isJustifications
      ? `
JUSTIFICATION REVIEW (this pass):
- Identify every explicit or implicit justification: why a method, requirement, sample size, configuration, safety approach, or conclusion is acceptable.
- Each justification is its own finding with categories ["justifications"], justificationRating (weak|ok|strong), and justificationRationale.
- For EVERY weak or ok justification you MUST include suggestedWording: the full improved justification text written as it should appear in the document.
- For weak or ok justifications you MUST also set actionable=true with proposedChange when possible:
  • Paragraphs/headings/quotes: update_block with { "text": "..." } and location.excerpt with the original text.
  • List items: update_list_items with item id and new text.
  • Table cells (e.g. Justification column): update_table_cell with { "blockId", "row", "col", "value" } — use the cells array in the document JSON for row/col.
- NEVER return weak or ok without suggestedWording — do not only explain what is missing.
- Tie suggested wording to evidence, requirements, or objectives stated elsewhere in the document.
- For strong justifications: actionable=false, still include justificationRationale explaining why it is strong.`
      : '';

    return `You are a senior professional document reviewer for DocForge.
${focusedScope}
Return ONLY valid JSON:
{
  "summary": "1-2 paragraph assessment for THIS review area only",
  "strengths": ["optional strengths for this area"],
  "findings": [{ "id", "severity", "categories", "title", "description", "location", "actionable", "proposedChange", "justificationRating", "justificationRationale", "suggestedWording" }]
}

Rules:
- Return findings ONLY for this focused review area.
- categories MUST include "${pass.isJustifications ? 'justifications' : pass.criterionId}".
- Use ONLY sectionId and blockId values from the document JSON.
- For update_block: blockId + content with corrected text; set location.excerpt to original phrase.
- For table cell edits: update_table_cell with blockId, row, col, value (0-based row/col from cells array).
- For lists: use update_list_items, never update_block with items array.
- When actionable=true, proposedChange must include all required fields.
${copyEditingBlock}
${formattingBlock}
${justificationsBlock}
${findingGuidance}`;
  }

  private static buildUserPrompt(
    docJson: string,
    options: AuditOptions,
    pass: AuditPass,
  ): string {
    const criterion = AUDIT_CRITERIA.find((c) => c.id === pass.criterionId);
    const scopeLine = pass.isJustifications
      ? 'Review every justification in the document. Rate each weak/ok/strong. For weak or ok, you MUST provide suggestedWording with stronger replacement text and an applicable proposedChange.'
      : `Review ONLY for: ${criterion?.label ?? pass.label} — ${criterion?.description ?? ''}`;

    return `Document audit — single review area.

${scopeLine}

${options.linkedWordFilename ? `Linked Word document: ${options.linkedWordFilename}\n` : ''}${options.prompt.trim() ? `Additional instructions:\n${options.prompt}\n` : ''}
Document JSON:
${docJson.slice(0, 120000)}`;
  }

  private static async runSinglePass(
    client: OpenAI,
    document: Document,
    docJson: string,
    options: AuditOptions,
    pass: AuditPass,
    auditModel: string,
    auditMaxTokens: number,
    thoroughness: 'standard' | 'thorough',
  ): Promise<{ result: AuditResult | null; truncated: boolean }> {
    const systemPrompt = this.buildSystemPrompt(options, pass, thoroughness);
    const userPrompt = this.buildUserPrompt(docJson, options, pass);

    const response = await client.chat.completions.create({
      model: auditModel,
      temperature: 0.3,
      max_tokens: auditMaxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const truncated = response.choices[0]?.finish_reason === 'length';
    const raw = response.choices[0]?.message?.content ?? '{}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON for ${pass.label}`);
    }

    const validated = AuditResultSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Validation failed for ${pass.label}: ${validated.error.message}`);
    }

    const filtered = AIAuditService.sanitizeFindings(document, validated.data);
    return { result: filtered, truncated };
  }

  static async runAudit(document: Document, options: AuditOptions): Promise<AuditResult | null> {
    const store = useAuditStore.getState();
    const passes = buildPassList(options);

    if (passes.length === 0) {
      store.setError('Select at least one review criterion or enable Review justifications.');
      return null;
    }

    store.startAudit();
    store.initCriteriaProgress(passes.map((p) => ({ id: p.id, label: p.label })));

    try {
      const { settings } = useSettingsStore.getState();
      if (!settings.openaiApiKey?.trim()) {
        store.setError('OpenAI API key is not configured. Set it in Preferences → AI.');
        return null;
      }

      this.setStep('Preparing document for review');
      const styles = useStyleStore.getState().stylesFile.styles;
      const docJson = serializeDocumentForAudit(document, styles);

      const thoroughness = options.thoroughness ?? 'thorough';
      const auditMaxTokens = Math.max(
        settings.maxTokens,
        thoroughness === 'thorough' ? 12000 : 8192,
      );
      const auditModel = resolveQualityTextModel(settings.defaultModel);
      this.log(`Using model: ${auditModel}`);
      this.log(`Running ${passes.length} focused review pass${passes.length === 1 ? '' : 'es'}`);

      const client = this.getClient();
      const passResults: AuditResult[] = [];
      const completedPassIds: string[] = [];
      let anyTruncated = false;
      let cancelled = false;

      for (const pass of passes) {
        if (useAuditStore.getState().cancelRequested) {
          cancelled = true;
          for (const remaining of passes.slice(passes.indexOf(pass))) {
            const current = useAuditStore.getState().criteriaProgress.find((p) => p.id === remaining.id);
            if (current?.status === 'pending' || current?.status === 'running') {
              store.setCriterionStatus(remaining.id, 'cancelled');
            }
          }
          break;
        }

        this.checkCancelled();
        store.setCriterionStatus(pass.id, 'running');
        this.setStep(`Reviewing: ${pass.label}…`);

        try {
          const { result, truncated } = await this.runSinglePass(
            client,
            document,
            docJson,
            options,
            pass,
            auditModel,
            auditMaxTokens,
            thoroughness,
          );
          if (truncated) anyTruncated = true;
          if (result) {
            passResults.push(result);
            completedPassIds.push(pass.id);
            store.setCriterionStatus(pass.id, 'done', result.findings.length);
            this.log(`✓ ${pass.label}: ${result.findings.length} findings`);
          }
        } catch (e) {
          if (e instanceof AuditCancelledError) {
            cancelled = true;
            store.setCriterionStatus(pass.id, 'cancelled');
            break;
          }
          store.setCriterionStatus(pass.id, 'error');
          this.log(`✗ ${pass.label}: ${String(e)}`);
        }
      }

      if (passResults.length === 0) {
        if (cancelled) {
          store.setAuditWarning('Audit cancelled.');
          store.endAudit();
          return null;
        }
        store.setError('Audit did not return any results. Try again or check your API settings.');
        return null;
      }

      const merged = mergePassResults(
        passResults,
        passes.filter((p) => completedPassIds.includes(p.id)),
      );
      this.setStep(`Audit complete — ${merged.findings.length} total findings`);

      if (anyTruncated) {
        store.setAuditWarning(
          `Some review passes may be incomplete (token limit). Increase Max Tokens in Preferences → AI.`,
        );
      } else if (cancelled) {
        store.setAuditWarning('Audit cancelled — showing results from completed review areas.');
      } else {
        store.setAuditWarning(null);
      }

      store.setResult(merged);
      store.endAudit();
      return merged;
    } catch (e) {
      if (e instanceof AuditCancelledError) {
        store.setAuditWarning('Audit cancelled.');
        store.endAudit();
        return null;
      }
      store.setError(String(e));
      return null;
    }
  }

  private static sanitizeFindings(document: Document, result: AuditResult): AuditResult {
    const sectionIds = new Set(document.sections.map((s) => s.id));
    const blockIds = new Set(
      document.sections.flatMap((s) => s.blocks.map((b) => b.id)),
    );

    const findings = result.findings
      .map((finding) => {
        if (!finding.actionable || !finding.proposedChange) return finding;

        const change = finding.proposedChange;
        if (change.action === 'update_block') {
          if (!blockIds.has(change.blockId)) {
            return { ...finding, actionable: false, proposedChange: { action: 'none' as const } };
          }
        }
        if (change.action === 'update_list_items') {
          if (!blockIds.has(change.blockId)) {
            return { ...finding, actionable: false, proposedChange: { action: 'none' as const } };
          }
        }
        if (change.action === 'update_table_cell') {
          if (!blockIds.has(change.blockId)) {
            return { ...finding, actionable: false, proposedChange: { action: 'none' as const } };
          }
        }
        if (change.action === 'rename_section') {
          if (!sectionIds.has(change.sectionId)) {
            return { ...finding, actionable: false, proposedChange: { action: 'none' as const } };
          }
        }
        return finding;
      })
      .filter((f) => f.title.trim().length > 0);

    return { ...result, findings };
  }

  static buildApplyAction(
    document: Document,
    finding: AuditFinding,
  ): { action: DocumentAction } | { error: string } {
    if (!finding.actionable || !finding.proposedChange || finding.proposedChange.action === 'none') {
      return { error: 'This finding has no applicable change' };
    }

    const change: ProposedChange = finding.proposedChange;

    switch (change.action) {
      case 'rename_section':
        return {
          action: { type: 'RENAME_SECTION', sectionId: change.sectionId, title: change.title },
        };

      case 'set_metadata':
        return {
          action: {
            type: 'SET_METADATA',
            metadata: change.metadata as Partial<Document['metadata']>,
          },
        };

      case 'update_table_cell': {
        const found = findBlock(document, change.blockId);
        if (!found || found.block.type !== 'table') {
          return { error: 'Target table no longer exists' };
        }
        const newContent = setCellValue(
          found.block.content,
          change.row,
          change.col,
          change.value,
        );
        const valid = validateBlock({ ...found.block, content: newContent });
        if (!valid.success) {
          return { error: `Suggested table cell content is invalid: ${valid.error.message}` };
        }
        return {
          action: {
            type: 'UPDATE_BLOCK',
            blockId: change.blockId,
            updates: { content: valid.data.content },
          },
        };
      }

      case 'update_block':
      case 'update_list_items': {
        const blockId = change.blockId;
        const found = findBlock(document, blockId);
        if (!found) return { error: 'Target block no longer exists' };

        const updates: Partial<Block> & { content?: Block['content'] } = {};

        if (change.action === 'update_block' && change.styleId) {
          updates.styleId = change.styleId;
        }

        let proposedContent: Record<string, unknown>;
        if (change.action === 'update_list_items') {
          proposedContent = { items: change.itemUpdates };
        } else {
          proposedContent = change.content ?? {};
        }

        if (Object.keys(proposedContent).length > 0) {
          const merged = mergeAuditBlockContent(found.block, proposedContent, {
            excerpt: finding.location?.excerpt,
          });
          if (!merged.ok) return { error: merged.reason };
          updates.content = merged.content;
        }

        if (!updates.content && !updates.styleId) {
          return { error: 'This finding has no applicable change' };
        }

        const valid = validateBlock({ ...found.block, ...updates });
        if (!valid.success) {
          return { error: `Suggested block content is invalid: ${valid.error.message}` };
        }

        return {
          action: {
            type: 'UPDATE_BLOCK',
            blockId,
            updates: {
              ...(updates.styleId ? { styleId: updates.styleId } : {}),
              ...(updates.content ? { content: valid.data.content } : {}),
            },
          },
        };
      }

      default:
        return { error: 'Unknown change type' };
    }
  }
}
