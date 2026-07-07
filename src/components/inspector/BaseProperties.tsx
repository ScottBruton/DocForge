import type { BlockPropertiesProps } from '@/registry/types';
import { useStyleStore } from '@/stores';

export function BaseProperties({ block, onUpdate }: BlockPropertiesProps) {
  const styles = useStyleStore((s) => s.getStyles());

  return (
    <div className="space-y-3 border-b border-zinc-800 pb-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Block</h4>
      <label className="block text-xs text-zinc-400">
        Style
        <select
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={block.styleId}
          onChange={(e) => onUpdate({ styleId: e.target.value })}
        >
          {styles.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={block.properties.visible}
          onChange={(e) => onUpdate({ properties: { ...block.properties, visible: e.target.checked } })}
        />
        Visible
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={block.properties.locked}
          onChange={(e) => onUpdate({ properties: { ...block.properties, locked: e.target.checked } })}
        />
        Locked
      </label>
      <label className="block text-xs text-zinc-400">
        Spacing before
        <input
          type="number"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={block.properties.spacingBefore}
          onChange={(e) => onUpdate({ properties: { ...block.properties, spacingBefore: Number(e.target.value) } })}
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Spacing after
        <input
          type="number"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          value={block.properties.spacingAfter}
          onChange={(e) => onUpdate({ properties: { ...block.properties, spacingAfter: Number(e.target.value) } })}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={block.properties.pageBreakBefore}
          onChange={(e) => onUpdate({ properties: { ...block.properties, pageBreakBefore: e.target.checked } })}
        />
        Page break before
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={block.properties.keepWithNext}
          onChange={(e) => onUpdate({ properties: { ...block.properties, keepWithNext: e.target.checked } })}
        />
        Keep with next
      </label>
    </div>
  );
}
