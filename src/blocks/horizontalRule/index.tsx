import { EmptyContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { HrEditor, HrRenderer } from '@/blocks/horizontalRule/HrBlock';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export const horizontalRuleDefinition: BlockDefinition<'horizontalRule'> = {
  type: 'horizontalRule',
  label: 'Horizontal Rule',
  icon: 'Minus',
  defaultBlock: (styleId) => createBlock('horizontalRule', styleId),
  Renderer: HrRenderer,
  Editor: HrEditor,
  PropertiesPanel: ({ block, onUpdate }) => <BaseProperties block={block} onUpdate={onUpdate} />,
  wordExportHandler: () => ({ type: 'horizontalRule' }),
  aiSchema: EmptyContentSchema,
  validate: () => [],
};
