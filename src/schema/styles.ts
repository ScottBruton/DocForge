import { z } from 'zod';

export const StyleSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    'heading1',
    'heading2',
    'heading3',
    'body',
    'caption',
    'quote',
    'code',
    'table',
    'tableHeader',
    'tableBody',
    'list',
    'checklist',
  ]),
  fontFamily: z.string().default('Segoe UI'),
  fontSize: z.number().default(11),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  color: z.string().default('#e4e4e7'),
  backgroundColor: z.string().default('transparent'),
  alignment: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  spacingBefore: z.number().default(0),
  spacingAfter: z.number().default(8),
  lineSpacing: z.number().default(1.15),
  borderTop: z.boolean().default(false),
  borderBottom: z.boolean().default(false),
  borderColor: z.string().default('#3f3f46'),
});

export type Style = z.infer<typeof StyleSchema>;

export const StylesFileSchema = z.object({
  version: z.string().default('1.0.0'),
  styles: z.array(StyleSchema),
});

export type StylesFile = z.infer<typeof StylesFileSchema>;

export function validateStyles(data: unknown) {
  return StylesFileSchema.safeParse(data);
}
