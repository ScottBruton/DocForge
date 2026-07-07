import { FigureContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { FigureEditor, FigureRenderer } from '@/blocks/figure/FigureBlock';
import { FigureProperties } from '@/blocks/figure/FigureProperties';

export const figureDefinition: BlockDefinition<'figure'> = {
  type: 'figure',
  label: 'Figure',
  icon: 'Image',
  defaultBlock: (styleId) => createBlock('figure', styleId),
  Renderer: FigureRenderer,
  Editor: FigureEditor,
  PropertiesPanel: FigureProperties,
  wordExportHandler: (block) => ({
    type: 'figure',
    content: block.type === 'figure' ? block.content : {},
  }),
  aiSchema: FigureContentSchema,
  validate: (block) => {
    if (block.type !== 'figure') return [];
    const issues = [];
    if (!block.content.assetId) {
      issues.push({ path: 'content.assetId', message: 'Figure has no asset', severity: 'warning' as const });
    }
    if (!block.content.caption.trim()) {
      issues.push({ path: 'content.caption', message: 'Missing caption', severity: 'warning' as const });
    }
    return issues;
  },
};
