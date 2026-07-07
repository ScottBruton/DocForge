import { createId } from '@/lib/utils';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { Block } from '@/schema';

type ChecklistBlock = Extract<Block, { type: 'checklist' }>;

export function ChecklistRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'checklist') return null;
  const b = block as ChecklistBlock;
  return (
    <ul className={`space-y-1 ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}>
      {b.content.items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-zinc-300">
          <input type="checkbox" checked={item.checked ?? false} readOnly className="accent-blue-500" />
          <span className={item.checked ? 'line-through text-zinc-500' : ''}>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChecklistEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'checklist') return null;
  const b = block as ChecklistBlock;

  const updateItem = (id: string, updates: Partial<(typeof b.content.items)[0]>) => {
    onUpdate({
      content: {
        ...b.content,
        items: b.content.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      },
    });
  };

  return (
    <ul className={`space-y-1 ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}>
      {b.content.items.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.checked ?? false}
            onChange={(e) => updateItem(item.id, { checked: e.target.checked })}
            className="accent-blue-500"
          />
          <input
            className="flex-1 bg-transparent text-zinc-300 outline-none"
            value={item.text}
            onChange={(e) => updateItem(item.id, { text: e.target.value })}
          />
        </li>
      ))}
      <li>
        <button
          type="button"
          className="text-xs text-blue-400 hover:underline"
          onClick={() =>
            onUpdate({
              content: { ...b.content, items: [...b.content.items, { id: createId(), text: '', checked: false }] },
            })
          }
        >
          + Add item
        </button>
      </li>
    </ul>
  );
}
