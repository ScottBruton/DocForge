import { useDocumentStore, useSelectionStore } from '@/stores';
import { AIPipeline } from '@/services/ai/AIPipeline';
import { validateBlock } from '@/schema';
import { useState, useEffect, useRef } from 'react';

const BLOCK_ACTIONS = [
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'technical', label: 'Make technical' },
  { id: 'concise', label: 'Make concise' },
  { id: 'grammar', label: 'Grammar check' },
];

const SECTION_ACTIONS = [
  { id: 'rewrite_section', label: 'Rewrite section' },
  { id: 'generate_missing', label: 'Generate missing content' },
  { id: 'summarise', label: 'Summarise' },
  { id: 'improve_structure', label: 'Improve structure' },
];

export function ContextMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const document = useDocumentStore((s) => s.document);
  const selectionType = useSelectionStore((s) => s.selectionType);
  const lastBlockId = useSelectionStore((s) => s.lastSelectedBlockId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-block]') || target.closest('[data-section]')) {
        e.preventDefault();
        setPos({ x: e.clientX, y: e.clientY });
      }
    };
    const handleClick = () => setPos(null);
    window.addEventListener('contextmenu', handleContext);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('contextmenu', handleContext);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  if (!pos) return null;

  const actions =
    selectionType === 'block'
      ? BLOCK_ACTIONS
      : selectionType === 'section'
        ? SECTION_ACTIONS
        : [];

  const runAction = async (actionId: string) => {
    if (selectionType === 'block' && lastBlockId) {
      for (const section of document.sections) {
        const block = section.blocks.find((b) => b.id === lastBlockId);
        if (!block) continue;
        const result = await AIPipeline.rewriteBlock(JSON.stringify(block), actionId);
        if (!result) return;
        try {
          const parsed = JSON.parse(result);
          const valid = validateBlock(parsed);
          if (valid.success) {
            dispatch({ type: 'UPDATE_BLOCK', blockId: lastBlockId, updates: valid.data });
          }
        } catch {
          /* ignore */
        }
      }
    }
    setPos(null);
  };

  if (actions.length === 0) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-violet-400">AI Actions</div>
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className="block w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
          onClick={() => runAction(a.id)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
