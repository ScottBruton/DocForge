import { createId } from '@/lib/utils';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { Block } from '@/schema';

type ListBlock = Extract<Block, { type: 'bulletList' | 'numberedList' }>;

export function ListRenderer({ block, isSelected, listType }: BlockRendererProps & { listType: 'bullet' | 'numbered' }) {
  if (block.type !== 'bulletList' && block.type !== 'numberedList') return null;
  const b = block as ListBlock;
  const Tag = listType === 'bullet' ? 'ul' : 'ol';
  return (
    <Tag className={`ml-6 list-outside space-y-1 pl-2 ${listType === 'bullet' ? 'list-disc' : 'list-decimal'} ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''} text-zinc-300`}>
      {b.content.items.map((item) => (
        <li key={item.id} className="pl-1">{item.text}</li>
      ))}
    </Tag>
  );
}

export function ListEditor({ block, isSelected, onUpdate, listType }: BlockEditorProps & { listType: 'bullet' | 'numbered' }) {
  if (block.type !== 'bulletList' && block.type !== 'numberedList') return null;
  const b = block as ListBlock;

  const updateItem = (id: string, text: string) => {
    onUpdate({
      content: {
        ...b.content,
        items: b.content.items.map((i) => (i.id === id ? { ...i, text } : i)),
      },
    });
  };

  const addItem = () => {
    onUpdate({ content: { ...b.content, items: [...b.content.items, { id: createId(), text: '' }] } });
  };

  const Tag = listType === 'bullet' ? 'ul' : 'ol';
  return (
    <Tag className={`ml-4 space-y-1 list-none ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}>
      {b.content.items.map((item, index) => (
        <li key={item.id} className="flex items-start gap-2">
          <span className="w-5 shrink-0 select-none pt-0.5 text-right tabular-nums text-zinc-400">
            {listType === 'bullet' ? '•' : `${index + 1}.`}
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent text-zinc-300 outline-none"
            value={item.text}
            onChange={(e) => updateItem(item.id, e.target.value)}
          />
        </li>
      ))}
      <li className="flex items-center gap-2 pl-7">
        <button type="button" className="text-xs text-blue-400 hover:underline" onClick={addItem}>+ Add item</button>
      </li>
    </Tag>
  );
}

export function ListPropertiesPanel(_props: BlockEditorProps) {
  return <div className="text-xs text-zinc-500">Edit list items in the editor.</div>;
}
