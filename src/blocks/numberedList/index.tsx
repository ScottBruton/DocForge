import { ListContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { ListEditor, ListRenderer } from '@/blocks/shared/ListBlock';
import { ListProperties } from '@/blocks/shared/ListProperties';

export const numberedListDefinition: BlockDefinition<'numberedList'> = {
  type: 'numberedList',
  label: 'Numbered List',
  icon: 'ListOrdered',
  defaultBlock: (styleId) => createBlock('numberedList', styleId),
  Renderer: (props) => <ListRenderer {...props} listType="numbered" />,
  Editor: (props) => <ListEditor {...props} listType="numbered" />,
  PropertiesPanel: ListProperties,
  wordExportHandler: (block) => ({ type: 'numberedList', content: block.type === 'numberedList' ? block.content : {} }),
  aiSchema: ListContentSchema,
  validate: () => [],
};
