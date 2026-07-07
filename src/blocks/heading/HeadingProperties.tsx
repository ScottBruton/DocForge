import type { BlockPropertiesProps } from '@/registry/types';
import type { HeadingBlock } from '@/schema';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function HeadingProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (block.type !== 'heading') return null;
  const b = block as HeadingBlock;
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <label className="block text-xs text-zinc-400">
        Level
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.level}
          onChange={(e) => onUpdate({ content: { ...b.content, level: Number(e.target.value) } })}
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>H{l}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={b.content.numberingEnabled}
          onChange={(e) => onUpdate({ content: { ...b.content, numberingEnabled: e.target.checked } })}
        />
        Numbering enabled
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={b.content.includeInToc}
          onChange={(e) => onUpdate({ content: { ...b.content, includeInToc: e.target.checked } })}
        />
        Include in TOC
      </label>
    </div>
  );
}
