import type { Style, StylesFile } from '@/schema';
import { createId } from '@/lib/utils';

function style(
  name: string,
  category: Style['category'],
  overrides: Partial<Style> = {},
): Style {
  return {
    id: createId(),
    name,
    category,
    fontFamily: 'Segoe UI',
    fontSize: 11,
    bold: false,
    italic: false,
    underline: false,
    color: '#e4e4e7',
    backgroundColor: 'transparent',
    alignment: 'left',
    spacingBefore: 0,
    spacingAfter: 8,
    lineSpacing: 1.15,
    borderTop: false,
    borderBottom: false,
    borderColor: '#3f3f46',
    ...overrides,
  };
}

const DEFAULT_STYLE_DEFS: Array<{ name: string; category: Style['category']; overrides?: Partial<Style> }> = [
  { name: 'Heading 1', category: 'heading1', overrides: { fontSize: 24, bold: true, spacingAfter: 12 } },
  { name: 'Heading 2', category: 'heading2', overrides: { fontSize: 20, bold: true, spacingAfter: 10 } },
  { name: 'Heading 3', category: 'heading3', overrides: { fontSize: 16, bold: true, spacingAfter: 8 } },
  { name: 'Body', category: 'body', overrides: { fontSize: 11 } },
  { name: 'Caption', category: 'caption', overrides: { fontSize: 9, italic: true, color: '#a1a1aa' } },
  { name: 'Quote', category: 'quote', overrides: { italic: true, color: '#a1a1aa', spacingBefore: 8, spacingAfter: 8 } },
  { name: 'Code', category: 'code', overrides: { fontFamily: 'Consolas', fontSize: 10, backgroundColor: '#27272a' } },
  { name: 'Table', category: 'table' },
  { name: 'Table Header', category: 'tableHeader', overrides: { bold: true, backgroundColor: '#27272a' } },
  { name: 'Table Body', category: 'tableBody' },
  { name: 'List', category: 'list' },
  { name: 'Checklist', category: 'checklist' },
];

let cachedDefaults: StylesFile | null = null;

export function createDefaultStyles(): StylesFile {
  if (cachedDefaults) return JSON.parse(JSON.stringify(cachedDefaults));
  const styles = DEFAULT_STYLE_DEFS.map((d) => style(d.name, d.category, d.overrides));
  cachedDefaults = { version: '1.0.0', styles };
  return JSON.parse(JSON.stringify(cachedDefaults));
}

export function getStyleByCategory(styles: Style[], category: Style['category']): Style | undefined {
  return styles.find((s) => s.category === category);
}

export function getDefaultStyleIdForBlock(
  styles: Style[],
  blockType: string,
): string {
  const map: Record<string, Style['category']> = {
    heading: 'heading1',
    paragraph: 'body',
    figure: 'body',
    table: 'table',
    bulletList: 'list',
    numberedList: 'list',
    checklist: 'checklist',
    quote: 'quote',
    equation: 'body',
    code: 'code',
    horizontalRule: 'body',
    pageBreak: 'body',
  };
  const category = map[blockType] ?? 'body';
  return getStyleByCategory(styles, category)?.id ?? styles[0]?.id ?? '';
}
