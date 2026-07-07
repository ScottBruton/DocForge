import { QuoteContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { QuoteEditor, QuoteRenderer } from '@/blocks/quote/QuoteBlock';
import { QuoteProperties } from '@/blocks/quote/QuoteProperties';

export const quoteDefinition: BlockDefinition<'quote'> = {
  type: 'quote',
  label: 'Quote',
  icon: 'Quote',
  defaultBlock: (styleId) => createBlock('quote', styleId),
  Renderer: QuoteRenderer,
  Editor: QuoteEditor,
  PropertiesPanel: QuoteProperties,
  wordExportHandler: (block) => ({ type: 'quote', content: block.type === 'quote' ? block.content : {} }),
  aiSchema: QuoteContentSchema,
  validate: () => [],
};
