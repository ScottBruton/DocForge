import { Loader2 } from 'lucide-react';
import { useWordImportStore } from '@/stores/wordImportStore';

export function WordImportModal() {
  const isImporting = useWordImportStore((s) => s.isImporting);
  const currentStep = useWordImportStore((s) => s.currentStep);
  const progressLog = useWordImportStore((s) => s.progressLog);
  const requestCancel = useWordImportStore((s) => s.requestCancel);

  if (!isImporting) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Importing Word document"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="shrink-0 animate-spin text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Importing Word document</h2>
            <p className="mt-0.5 text-xs text-zinc-400">{currentStep}</p>
          </div>
        </div>

        <div className="mt-4 max-h-32 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-500">
          {progressLog.map((line, index) => (
            <div key={`${index}-${line}`}>{line}</div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-zinc-500">
          Please wait — the editor is unavailable until import completes or is cancelled.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={requestCancel}
            className="rounded border border-zinc-600 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Cancel import
          </button>
        </div>
      </div>
    </div>
  );
}
