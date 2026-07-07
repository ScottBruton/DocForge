import { useDocumentStore, useSelectionStore } from '@/stores';
import { getBlockDefinition } from '@/registry/BlockRegistry';

export function EditorCanvas() {
  const document = useDocumentStore((s) => s.document);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const selectBlock = useSelectionStore((s) => s.selectBlock);
  const isBlockSelected = useSelectionStore((s) => s.isBlockSelected);

  if (document.sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <p>Add a section to start editing</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-2xl font-bold text-zinc-100">{document.metadata.title}</h1>
        {document.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="border-b border-zinc-800 pb-1 text-lg font-semibold text-zinc-300">
              {section.title}
            </h2>
            {section.blocks.length === 0 ? (
              <p className="text-sm italic text-zinc-600">No blocks in this section</p>
            ) : (
              section.blocks.map((block) => {
                if (!block.properties.visible) return null;
                const def = getBlockDefinition(block.type);
                const Editor = def.Editor;
                const selected = isBlockSelected(block.id);
                return (
                  <div
                    key={block.id}
                    className={`group relative rounded px-2 py-1 ${selected ? 'bg-blue-950/20' : 'hover:bg-zinc-900/50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectBlock(block.id, section.id);
                    }}
                  >
                    <Editor
                      block={block}
                      isSelected={selected}
                      onUpdate={(updates) =>
                        dispatch({ type: 'UPDATE_BLOCK', blockId: block.id, updates })
                      }
                    />
                  </div>
                );
              })
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
