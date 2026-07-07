import { ListContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { ListEditor, ListRenderer } from '@/blocks/shared/ListBlock';
import { ListProperties } from '@/blocks/shared/ListProperties';

export const bulletListDefinition: BlockDefinition<'bulletList'> = {
  type: 'bulletList',
  label: 'Bullet List',
  icon: 'List',
  defaultBlock: (styleId) => createBlock('bulletList', styleId),
  Renderer: (props) => <ListRenderer {...props} listType="bullet" />,
  Editor: (props) => <ListEditor {...props} listType="bullet" />,
  PropertiesPanel: ListProperties,
  wordExportHandler: (block) => ({ type: 'bulletList', content: block.type === 'bulletList' ? block.content : {} }),
  aiSchema: ListContentSchema,
  validate: () => [],
};
