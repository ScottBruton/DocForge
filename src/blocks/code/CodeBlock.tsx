import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { CodeBlock } from '@/schema';

export function CodeRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'code') return null;
  const b = block as CodeBlock;
  return (
    <pre className={`overflow-auto rounded bg-zinc-900 p-3 font-mono text-sm text-zinc-300 ${isSelected ? 'ring-1 ring-blue-500/50' : ''}`}>
      <code>{b.content.code}</code>
    </pre>
  );
}

export function CodeEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'code') return null;
  const b = block as CodeBlock;
  return (
    <div className={isSelected ? 'ring-1 ring-blue-500/50 rounded' : ''}>
      <div className="mb-1 text-xs text-zinc-500">{b.content.language}</div>
      <textarea
        className="w-full resize-y rounded bg-zinc-900 p-3 font-mono text-sm text-zinc-300 outline-none"
        value={b.content.code}
        onChange={(e) => onUpdate({ content: { ...b.content, code: e.target.value } })}
        rows={6}
        spellCheck={false}
      />
    </div>
  );
}
