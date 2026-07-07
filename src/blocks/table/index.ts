import { TableContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { TableEditor, TableRenderer } from '@/blocks/table/TableBlock';
import { TableProperties } from '@/blocks/table/TableProperties';
import { validateTableStructure } from '@/blocks/table/tableUtils';

export const tableDefinition: BlockDefinition<'table'> = {
  type: 'table',
  label: 'Table',
  icon: 'Table',
  defaultBlock: (styleId) => createBlock('table', styleId),
  Renderer: TableRenderer,
  Editor: TableEditor,
  PropertiesPanel: TableProperties,
  wordExportHandler: (block) => ({
    type: 'table',
    content: block.type === 'table' ? block.content : {},
  }),
  aiSchema: TableContentSchema,
  validate: (block) => {
    if (block.type !== 'table') return [];
    return validateTableStructure(block.content);
  },
};
