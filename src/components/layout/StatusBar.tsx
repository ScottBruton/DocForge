import { useDocumentStore, useProjectStore } from '@/stores';

export function StatusBar() {
  const document = useDocumentStore((s) => s.document);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const projectPath = useProjectStore((s) => s.projectPath);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const isSaving = useProjectStore((s) => s.isSaving);
  const error = useProjectStore((s) => s.error);

  const blockCount = document.sections.reduce((n, s) => n + s.blocks.length, 0);

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-zinc-800 bg-zinc-900/80 px-3 text-xs text-zinc-500">
      <span>{document.sections.length} sections</span>
      <span>{blockCount} blocks</span>
      <span className="truncate flex-1">{projectPath ?? 'No project open'}</span>
      {error && <span className="text-red-400">{error}</span>}
      {isSaving && <span className="text-blue-400">Saving...</span>}
      {!isSaving && isDirty && <span className="text-amber-400">Unsaved changes</span>}
      {!isSaving && !isDirty && lastSavedAt && <span className="text-green-500">Saved</span>}
    </footer>
  );
}
