import type { BlockPropertiesProps } from '@/registry/types';
import type { TableBlock } from '@/schema';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function TableProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (block.type !== 'table') return null;
  const b = block as TableBlock;
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <label className="block text-xs text-zinc-400">
        Caption
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.caption}
          onChange={(e) => onUpdate({ content: { ...b.content, caption: e.target.value } })}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={b.content.headerRow} onChange={(e) => onUpdate({ content: { ...b.content, headerRow: e.target.checked } })} />
        Header row
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={b.content.repeatHeaderRow} onChange={(e) => onUpdate({ content: { ...b.content, repeatHeaderRow: e.target.checked } })} />
        Repeat header row
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={b.content.bandedRows} onChange={(e) => onUpdate({ content: { ...b.content, bandedRows: e.target.checked } })} />
        Banded rows
      </label>
      <label className="block text-xs text-zinc-400">
        Autofit
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.autofitMode}
          onChange={(e) => onUpdate({ content: { ...b.content, autofitMode: e.target.value as TableBlock['content']['autofitMode'] } })}
        >
          <option value="auto">Auto</option>
          <option value="fixed">Fixed</option>
          <option value="content">Content</option>
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Cell padding
        <input type="number" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm" value={b.content.cellPadding} onChange={(e) => onUpdate({ content: { ...b.content, cellPadding: Number(e.target.value) } })} />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={b.content.borders} onChange={(e) => onUpdate({ content: { ...b.content, borders: e.target.checked } })} />
        Borders
      </label>
    </div>
  );
}
