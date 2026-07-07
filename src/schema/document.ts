import { z } from 'zod';

export const BlockTypeSchema = z.enum([
  'heading',
  'paragraph',
  'figure',
  'table',
  'bulletList',
  'numberedList',
  'checklist',
  'quote',
  'equation',
  'code',
  'horizontalRule',
  'pageBreak',
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

export const BlockMetadataSchema = z.object({
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  notes: z.string().optional(),
});

export const BaseBlockPropertiesSchema = z.object({
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  spacingBefore: z.number().default(0),
  spacingAfter: z.number().default(0),
  pageBreakBefore: z.boolean().default(false),
  keepWithNext: z.boolean().default(false),
});

export const HeadingContentSchema = z.object({
  text: z.string().default(''),
  level: z.number().min(1).max(6).default(1),
  numberingEnabled: z.boolean().default(false),
  includeInToc: z.boolean().default(true),
});

export const ParagraphContentSchema = z.object({
  tiptap: z.record(z.unknown()).optional(),
  text: z.string().default(''),
  alignment: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  indentation: z.number().default(0),
});

export const ListItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().optional(),
});

export const ListContentSchema = z.object({
  items: z.array(ListItemSchema).default([]),
});

export const QuoteContentSchema = z.object({
  text: z.string().default(''),
  attribution: z.string().optional(),
});

export const EquationContentSchema = z.object({
  latex: z.string().default(''),
});

export const CodeContentSchema = z.object({
  code: z.string().default(''),
  language: z.string().default('plaintext'),
});

export const FigureContentSchema = z.object({
  assetId: z.string().nullable().default(null),
  caption: z.string().default(''),
  widthPercent: z.number().min(10).max(100).default(100),
  maxWidthMm: z.number().optional(),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  wrap: z.enum(['inline', 'square', 'tight', 'top-bottom']).default('inline'),
  keepWithCaption: z.boolean().default(true),
  captionPosition: z.enum(['above', 'below']).default('below'),
  figureNumbering: z.boolean().default(true),
});

export const TableCellSchema = z.object({
  row: z.number(),
  col: z.number(),
  value: z.string().default(''),
  styleId: z.string().optional(),
  rowSpan: z.number().default(1),
  colSpan: z.number().default(1),
});

export const TableContentSchema = z.object({
  columns: z.array(z.object({ id: z.string(), width: z.number().optional() })).default([]),
  rows: z.array(z.object({ id: z.string(), height: z.number().optional() })).default([]),
  cells: z.array(TableCellSchema).default([]),
  caption: z.string().default(''),
  headerRow: z.boolean().default(true),
  repeatHeaderRow: z.boolean().default(false),
  bandedRows: z.boolean().default(true),
  autofitMode: z.enum(['auto', 'fixed', 'content']).default('auto'),
  cellPadding: z.number().default(4),
  borders: z.boolean().default(true),
});

export const EmptyContentSchema = z.object({});

export type EmptyContent = z.infer<typeof EmptyContentSchema>;

const BlockBaseSchema = z.object({
  id: z.string(),
  type: BlockTypeSchema,
  styleId: z.string(),
  properties: BaseBlockPropertiesSchema.default({}),
  metadata: BlockMetadataSchema.default({}),
});

export const BlockSchema = z.discriminatedUnion('type', [
  BlockBaseSchema.extend({ type: z.literal('heading'), content: HeadingContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('paragraph'), content: ParagraphContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('figure'), content: FigureContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('table'), content: TableContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('bulletList'), content: ListContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('numberedList'), content: ListContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('checklist'), content: ListContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('quote'), content: QuoteContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('equation'), content: EquationContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('code'), content: CodeContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('horizontalRule'), content: EmptyContentSchema }),
  BlockBaseSchema.extend({ type: z.literal('pageBreak'), content: EmptyContentSchema }),
]);

export type Block = z.infer<typeof BlockSchema>;
export type HeadingBlock = Extract<Block, { type: 'heading' }>;
export type ParagraphBlock = Extract<Block, { type: 'paragraph' }>;
export type FigureBlock = Extract<Block, { type: 'figure' }>;
export type TableBlock = Extract<Block, { type: 'table' }>;
export type QuoteBlock = Extract<Block, { type: 'quote' }>;
export type EquationBlock = Extract<Block, { type: 'equation' }>;
export type CodeBlock = Extract<Block, { type: 'code' }>;
export type ListBlock = Extract<Block, { type: 'bulletList' | 'numberedList' | 'checklist' }>;

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  collapsed: z.boolean().default(false),
  blocks: z.array(BlockSchema).default([]),
});

export type Section = z.infer<typeof SectionSchema>;

export const DocumentMetadataSchema = z.object({
  title: z.string().default('Untitled Document'),
  author: z.string().default(''),
  description: z.string().default(''),
  createdAt: z.string(),
  modifiedAt: z.string(),
  templateId: z.string().optional(),
  version: z.string().default('1.0.0'),
});

export const AssetRefSchema = z.object({
  id: z.string(),
  filename: z.string(),
  path: z.string(),
});

export const DocumentSchema = z.object({
  metadata: DocumentMetadataSchema,
  sections: z.array(SectionSchema),
  assetRefs: z.array(AssetRefSchema).default([]),
  version: z.string().default('1.0.0'),
});

export type Document = z.infer<typeof DocumentSchema>;

export function validateDocument(data: unknown) {
  return DocumentSchema.safeParse(data);
}

export function validateBlock(data: unknown) {
  return BlockSchema.safeParse(data);
}

export function validateAIOutput(data: unknown) {
  return DocumentSchema.safeParse(data);
}
