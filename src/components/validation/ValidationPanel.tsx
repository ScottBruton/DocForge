import { useUIStore, useDocumentStore, useStyleStore, useAssetStore } from '@/stores';
import { ValidationService } from '@/services/ValidationService';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

export function ValidationPanel() {
  const isOpen = useUIStore((s) => s.isValidationOpen);
  const setOpen = useUIStore((s) => s.setValidationOpen);
  const document = useDocumentStore((s) => s.document);
  const styles = useStyleStore((s) => s.getStyles());
  const assets = useAssetStore((s) => s.assets);

  if (!isOpen) return null;

  const result = ValidationService.validate(document, styles, assets);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[70vh] w-full max-w-lg overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Validation Results</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>
        <div className="mb-3 flex gap-4 text-xs">
          <span className="text-red-400">{result.errorCount} errors</span>
          <span className="text-amber-400">{result.warningCount} warnings</span>
        </div>
        {result.issues.length === 0 ? (
          <p className="text-sm text-green-400">No issues found.</p>
        ) : (
          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 rounded border border-zinc-800 p-2 text-xs">
                {issue.severity === 'error' ? (
                  <AlertCircle size={14} className="shrink-0 text-red-400" />
                ) : (
                  <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                )}
                <div>
                  <span className="text-zinc-500">{issue.path}</span>
                  <p className="text-zinc-300">{issue.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
