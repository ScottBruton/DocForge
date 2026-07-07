import { useUIStore, useStyleStore } from '@/stores';
import { X } from 'lucide-react';

export function StyleManagerModal() {
  const isOpen = useUIStore((s) => s.isStyleManagerOpen);
  const setOpen = useUIStore((s) => s.setStyleManagerOpen);
  const styles = useStyleStore((s) => s.getStyles());
  const updateStyle = useStyleStore((s) => s.updateStyle);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Style Manager</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {styles.map((style) => (
            <div key={style.id} className="rounded border border-zinc-800 p-3">
              <h3 className="mb-2 text-sm font-medium text-zinc-300">{style.name}</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-400">
                  Font family
                  <input
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                    value={style.fontFamily}
                    onChange={(e) => updateStyle(style.id, { fontFamily: e.target.value })}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Font size
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                    value={style.fontSize}
                    onChange={(e) => updateStyle(style.id, { fontSize: Number(e.target.value) })}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Color
                  <input
                    type="color"
                    className="mt-1 h-8 w-full rounded border border-zinc-700 bg-zinc-950"
                    value={style.color.startsWith('#') ? style.color : '#e4e4e7'}
                    onChange={(e) => updateStyle(style.id, { color: e.target.value })}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Line spacing
                  <input
                    type="number"
                    step={0.05}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                    value={style.lineSpacing}
                    onChange={(e) => updateStyle(style.id, { lineSpacing: Number(e.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={style.bold} onChange={(e) => updateStyle(style.id, { bold: e.target.checked })} />
                  Bold
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={style.italic} onChange={(e) => updateStyle(style.id, { italic: e.target.checked })} />
                  Italic
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
