import { HeadingContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { HeadingEditor, HeadingRenderer } from '@/blocks/heading/HeadingBlock';
import { HeadingProperties } from '@/blocks/heading/HeadingProperties';

export const headingDefinition: BlockDefinition<'heading'> = {
  type: 'heading',
  label: 'Heading',
  icon: 'Heading',
  defaultBlock: (styleId) => createBlock('heading', styleId),
  Renderer: HeadingRenderer,
  Editor: HeadingEditor,
  PropertiesPanel: HeadingProperties,
  wordExportHandler: (block) => ({
    type: 'heading',
    content: block.type === 'heading' ? block.content : {},
  }),
  aiSchema: HeadingContentSchema,
  validate: (block) => {
    if (block.type !== 'heading') return [];
    const issues = [];
    if (!block.content.text.trim()) {
      issues.push({ path: 'content.text', message: 'Heading text is empty', severity: 'warning' as const });
    }
    return issues;
  },
};
