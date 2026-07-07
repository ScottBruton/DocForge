import { Check, Loader2, Circle } from 'lucide-react';
import { useAuditStore } from '@/stores/auditStore';

export function AuditProgressModal() {
  const isAuditing = useAuditStore((s) => s.isAuditing);
  const currentStep = useAuditStore((s) => s.currentStep);
  const progressLog = useAuditStore((s) => s.progressLog);
  const criteriaProgress = useAuditStore((s) => s.criteriaProgress);
  const requestCancel = useAuditStore((s) => s.requestCancel);

  if (!isAuditing) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Running AI audit"
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="shrink-0 animate-spin text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Running AI audit</h2>
            <p className="mt-0.5 text-xs text-zinc-400">{currentStep}</p>
          </div>
        </div>

        {criteriaProgress.length > 0 && (
          <div className="mt-4 max-h-48 space-y-1 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-2">
            {criteriaProgress.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                <CriterionStatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <span
                    className={
                      item.status === 'running'
                        ? 'text-amber-300'
                        : item.status === 'done'
                          ? 'text-zinc-300'
                          : item.status === 'cancelled'
                            ? 'text-zinc-600 line-through'
                            : 'text-zinc-500'
                    }
                  >
                    {item.label}
                  </span>
                  {item.status === 'done' && item.findingsCount !== undefined && (
                    <span className="ml-1 text-[10px] text-zinc-600">
                      ({item.findingsCount} finding{item.findingsCount === 1 ? '' : 's'})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 max-h-24 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-500">
          {progressLog.map((line, index) => (
            <div key={`${index}-${line}`}>{line}</div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-zinc-500">
          Each selected review area is audited separately for thorough coverage. Please wait — the editor is unavailable until the audit completes or is cancelled.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={requestCancel}
            className="rounded border border-zinc-600 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Cancel audit
          </button>
        </div>
      </div>
    </div>
  );
}

function CriterionStatusIcon({ status }: { status: string }) {
  if (status === 'running') {
    return <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-amber-400" />;
  }
  if (status === 'done') {
    return <Check size={14} className="mt-0.5 shrink-0 text-green-400" />;
  }
  if (status === 'cancelled' || status === 'error') {
    return <Circle size={14} className="mt-0.5 shrink-0 text-zinc-600" />;
  }
  return <Circle size={14} className="mt-0.5 shrink-0 text-zinc-600" />;
}
