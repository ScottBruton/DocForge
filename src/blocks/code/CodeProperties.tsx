import type { BlockPropertiesProps } from '@/registry/types';
import type { CodeBlock } from '@/schema';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function CodeProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (block.type !== 'code') return null;
  const b = block as CodeBlock;
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <label className="block text-xs text-zinc-400">
        Language
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.language}
          onChange={(e) => onUpdate({ content: { ...b.content, language: e.target.value } })}
        />
      </label>
    </div>
  );
}
