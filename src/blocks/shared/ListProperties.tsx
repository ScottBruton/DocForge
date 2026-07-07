import type { BlockPropertiesProps } from '@/registry/types';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function ListProperties({ block, onUpdate }: BlockPropertiesProps) {
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
      <p className="text-xs text-zinc-500">Edit list items directly in the editor canvas.</p>
    </div>
  );
}
