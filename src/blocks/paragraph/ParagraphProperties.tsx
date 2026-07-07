import type { BlockPropertiesProps } from '@/registry/types';
import type { ParagraphBlock } from '@/schema';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function ParagraphProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (block.type !== 'paragraph') return null;
  const b = block as ParagraphBlock;
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <label className="block text-xs text-zinc-400">
        Alignment
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.alignment}
          onChange={(e) =>
            onUpdate({
              content: {
                ...b.content,
                alignment: e.target.value as ParagraphBlock['content']['alignment'],
              },
            })
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Indentation
        <input
          type="number"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.indentation}
          onChange={(e) => onUpdate({ content: { ...b.content, indentation: Number(e.target.value) } })}
        />
      </label>
    </div>
  );
}
