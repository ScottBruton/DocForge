import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { QuoteBlock } from '@/schema';

export function QuoteRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'quote') return null;
  const b = block as QuoteBlock;
  return (
    <blockquote className={`border-l-4 border-zinc-600 pl-4 italic text-zinc-400 ${isSelected ? 'ring-1 ring-blue-500/50 rounded' : ''}`}>
      <p>{b.content.text}</p>
      {b.content.attribution && <footer className="mt-1 text-sm not-italic text-zinc-500">— {b.content.attribution}</footer>}
    </blockquote>
  );
}

export function QuoteEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'quote') return null;
  const b = block as QuoteBlock;
  return (
    <blockquote className={`border-l-4 border-zinc-600 pl-4 ${isSelected ? 'ring-1 ring-blue-500/50 rounded' : ''}`}>
      <textarea
        className="w-full resize-none bg-transparent italic text-zinc-400 outline-none"
        value={b.content.text}
        onChange={(e) => onUpdate({ content: { ...b.content, text: e.target.value } })}
        placeholder="Quote text"
        rows={3}
      />
      <input
        className="mt-1 w-full bg-transparent text-sm text-zinc-500 outline-none"
        value={b.content.attribution ?? ''}
        onChange={(e) => onUpdate({ content: { ...b.content, attribution: e.target.value } })}
        placeholder="Attribution"
      />
    </blockquote>
  );
}
