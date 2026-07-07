import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { HeadingBlock } from '@/schema';
import { createElement } from 'react';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

export function HeadingRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'heading') return null;
  const b = block as HeadingBlock;
  const tag = HEADING_TAGS[Math.min(b.content.level - 1, 5)] ?? 'h1';
  return createElement(
    tag,
    {
      className: `font-semibold text-zinc-100 ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`,
      style: { fontSize: `${28 - b.content.level * 2}px` },
    },
    b.content.text || 'Untitled Heading',
  );
}

export function HeadingEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'heading') return null;
  const b = block as HeadingBlock;
  return (
    <input
      className={`w-full bg-transparent font-semibold text-zinc-100 outline-none ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}
      style={{ fontSize: `${28 - b.content.level * 2}px` }}
      value={b.content.text}
      onChange={(e) => onUpdate({ content: { ...b.content, text: e.target.value } })}
      placeholder="Heading"
    />
  );
}
