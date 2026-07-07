import { EmptyContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { PageBreakEditor, PageBreakRenderer } from '@/blocks/pageBreak/PageBreakBlock';
import { BaseProperties } from '@/components/inspector/BaseProperties';

export const pageBreakDefinition: BlockDefinition<'pageBreak'> = {
  type: 'pageBreak',
  label: 'Page Break',
  icon: 'SeparatorHorizontal',
  defaultBlock: (styleId) => createBlock('pageBreak', styleId),
  Renderer: PageBreakRenderer,
  Editor: PageBreakEditor,
  PropertiesPanel: ({ block, onUpdate }) => <BaseProperties block={block} onUpdate={onUpdate} />,
  wordExportHandler: () => ({ type: 'pageBreak' }),
  aiSchema: EmptyContentSchema,
  validate: () => [],
};
