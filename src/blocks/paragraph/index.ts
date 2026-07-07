import { ParagraphContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { ParagraphEditor, ParagraphRenderer } from '@/blocks/paragraph/ParagraphBlock';
import { ParagraphProperties } from '@/blocks/paragraph/ParagraphProperties';

export const paragraphDefinition: BlockDefinition<'paragraph'> = {
  type: 'paragraph',
  label: 'Paragraph',
  icon: 'Type',
  defaultBlock: (styleId) => createBlock('paragraph', styleId),
  Renderer: ParagraphRenderer,
  Editor: ParagraphEditor,
  PropertiesPanel: ParagraphProperties,
  wordExportHandler: (block) => ({
    type: 'paragraph',
    content: block.type === 'paragraph' ? block.content.text : '',
  }),
  aiSchema: ParagraphContentSchema,
  validate: () => [],
};
