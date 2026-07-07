import type { BlockPropertiesProps } from '@/registry/types';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export function EquationProperties({ block, onUpdate }: BlockPropertiesProps) {
  return (
    <div className="space-y-3">
      <BaseProperties block={block} onUpdate={onUpdate} />
    </div>
  );
}
