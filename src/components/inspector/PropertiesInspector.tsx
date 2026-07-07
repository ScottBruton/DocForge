import { useDocumentStore, useSelectionStore } from '@/stores';
import { getBlockDefinition } from '@/registry/BlockRegistry';
import { findBlock } from '@/lib/documentFactory';
import { FileText } from 'lucide-react';

export function PropertiesInspector() {
  const document = useDocumentStore((s) => s.document);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const selectionType = useSelectionStore((s) => s.selectionType);
  const lastBlockId = useSelectionStore((s) => s.lastSelectedBlockId);
  const lastSectionId = useSelectionStore((s) => s.lastSelectedSectionId);

  if (selectionType === 'block' && lastBlockId) {
    const found = findBlock(document, lastBlockId);
    if (found) {
      const def = getBlockDefinition(found.block.type);
      const Panel = def.PropertiesPanel;
      return (
        <div className="h-full overflow-auto p-3">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {def.label} Properties
          </h3>
          <Panel
            block={found.block}
            onUpdate={(updates) =>
              dispatch({ type: 'UPDATE_BLOCK', blockId: found.block.id, updates })
            }
          />
        </div>
      );
    }
  }

  if (selectionType === 'section' && lastSectionId) {
    const section = document.sections.find((s) => s.id === lastSectionId);
    if (section) {
      return (
        <div className="h-full overflow-auto p-3">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Section</h3>
          <label className="block text-xs text-zinc-400">
            Title
            <input
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
              value={section.title}
              onChange={(e) =>
                dispatch({ type: 'RENAME_SECTION', sectionId: section.id, title: e.target.value })
              }
            />
          </label>
          <p className="mt-3 text-xs text-zinc-500">{section.blocks.length} blocks</p>
        </div>
      );
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-zinc-600">
      <FileText size={32} className="mb-2 opacity-50" />
      <p className="text-sm">Select a block or section to edit properties</p>
    </div>
  );
}
