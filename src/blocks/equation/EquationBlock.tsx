import katex from 'katex';
import { useMemo } from 'react';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { EquationBlock } from '@/schema';

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return `<span class="text-red-400">Invalid LaTeX</span>`;
  }
}

export function EquationRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'equation') return null;
  const b = block as EquationBlock;
  const html = useMemo(() => renderLatex(b.content.latex), [b.content.latex]);
  return (
    <div
      className={`my-2 text-center ${isSelected ? 'ring-1 ring-blue-500/50 rounded p-2' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function EquationEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'equation') return null;
  const b = block as EquationBlock;
  const html = useMemo(() => renderLatex(b.content.latex), [b.content.latex]);
  return (
    <div className={isSelected ? 'ring-1 ring-blue-500/50 rounded p-2' : ''}>
      <input
        className="mb-2 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-300"
        value={b.content.latex}
        onChange={(e) => onUpdate({ content: { ...b.content, latex: e.target.value } })}
        placeholder="LaTeX equation"
      />
      <div className="text-center" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
