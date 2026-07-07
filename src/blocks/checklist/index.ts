import { ListContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { ChecklistEditor, ChecklistRenderer } from '@/blocks/checklist/ChecklistBlock';
import { ListProperties } from '@/blocks/shared/ListProperties';

export const checklistDefinition: BlockDefinition<'checklist'> = {
  type: 'checklist',
  label: 'Checklist',
  icon: 'CheckSquare',
  defaultBlock: (styleId) => createBlock('checklist', styleId),
  Renderer: ChecklistRenderer,
  Editor: ChecklistEditor,
  PropertiesPanel: ListProperties,
  wordExportHandler: (block) => ({ type: 'checklist', content: block.type === 'checklist' ? block.content : {} }),
  aiSchema: ListContentSchema,
  validate: () => [],
};
