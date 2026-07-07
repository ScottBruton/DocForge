import { useAssetStore } from '@/stores';
import type { BlockPropertiesProps } from '@/registry/types';
import type { FigureBlock } from '@/schema';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function FigureProperties({ block, onUpdate }: BlockPropertiesProps) {
  if (block.type !== 'figure') return null;
  const b = block as FigureBlock;
  const assets = useAssetStore((s) => s.assets);

  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <label className="block text-xs text-zinc-400">
        Asset
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.assetId ?? ''}
          onChange={(e) => onUpdate({ content: { ...b.content, assetId: e.target.value || null } })}
        >
          <option value="">None</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>{a.filename}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Caption
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.caption}
          onChange={(e) => onUpdate({ content: { ...b.content, caption: e.target.value } })}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Width %
        <input
          type="range"
          min={10}
          max={100}
          className="mt-1 w-full"
          value={b.content.widthPercent}
          onChange={(e) => onUpdate({ content: { ...b.content, widthPercent: Number(e.target.value) } })}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Alignment
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.alignment}
          onChange={(e) =>
            onUpdate({
              content: { ...b.content, alignment: e.target.value as FigureBlock['content']['alignment'] },
            })
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Text wrap
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.wrap}
          onChange={(e) =>
            onUpdate({ content: { ...b.content, wrap: e.target.value as FigureBlock['content']['wrap'] } })
          }
        >
          <option value="inline">Inline</option>
          <option value="square">Square</option>
          <option value="tight">Tight</option>
          <option value="top-bottom">Top & Bottom</option>
        </select>
      </label>
      <label className="block text-xs text-zinc-400">
        Caption position
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={b.content.captionPosition}
          onChange={(e) =>
            onUpdate({
              content: { ...b.content, captionPosition: e.target.value as FigureBlock['content']['captionPosition'] },
            })
          }
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
      </label>
    </div>
  );
}
