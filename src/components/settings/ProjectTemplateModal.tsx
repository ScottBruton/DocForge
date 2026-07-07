import { useUIStore, useProjectStore } from '@/stores';
import { WordTemplateService } from '@/services/word/WordTemplateService';
import { X, Upload, FileType } from 'lucide-react';

export function ProjectTemplateModal() {
  const isOpen = useUIStore((s) => s.isProjectTemplateOpen);
  const setOpen = useUIStore((s) => s.setProjectTemplateOpen);
  const projectPath = useProjectStore((s) => s.projectPath);
  const template = useProjectStore((s) => s.projectTemplate);
  const error = useProjectStore((s) => s.error);

  if (!isOpen) return null;

  const handleUpload = async () => {
    const ok = await WordTemplateService.uploadProjectTemplate();
    if (ok) setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Project Template</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-400">
          Upload a Word template (.docx) for this project. DocForge extracts its styles and stores
          the template in the project database. Styles are merged into your project&apos;s style sheet
          and used when exporting or updating the linked Word document.
        </p>

        {!projectPath && (
          <p className="mb-3 rounded border border-amber-900/50 bg-amber-950/30 p-2 text-xs text-amber-300">
            Open or create a project first.
          </p>
        )}

        {template && (
          <div className="mb-4 rounded border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <FileType size={16} className="text-blue-400" />
              <span>{template.filename}</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">
              Uploaded {new Date(template.uploaded_at).toLocaleString()}
            </p>
          </div>
        )}

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!projectPath}
            onClick={handleUpload}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <Upload size={14} />
            {template ? 'Replace Template' : 'Upload Template'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
