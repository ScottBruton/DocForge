import type { Style, StylesFile } from '@/schema';
import { createId } from '@/lib/utils';
import { createDefaultStyles } from '@/lib/defaultStyles';

export interface ExtractedWordStyle {
  styleId: string;
  name: string;
  type: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  alignment: Style['alignment'];
}

function attr(node: Element, name: string): string | null {
  return node.getAttribute(`w:${name}`) ?? node.getAttribute(name);
}

function child(node: Element, tag: string): Element | null {
  const ns = node.getElementsByTagName(`w:${tag}`);
  return ns.length > 0 ? ns[0]! : null;
}

function childVal(node: Element | null, tag: string, attrName = 'val'): string | null {
  if (!node) return null;
  const el = child(node, tag);
  if (!el) return null;
  return attr(el, attrName);
}

function parseRunProperties(rPr: Element | null): Partial<ExtractedWordStyle> {
  if (!rPr) return {};
  const colorVal = childVal(rPr, 'color');
  const color = colorVal && colorVal !== 'auto' ? `#${colorVal}` : '#000000';
  const sz = childVal(rPr, 'sz');
  const fontSize = sz ? Number(sz) / 2 : 11;
  const fonts = child(rPr, 'rFonts');
  const fontFamily =
    (fonts && (attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi'))) || 'Calibri';
  return {
    fontFamily,
    fontSize,
    bold: !!child(rPr, 'b'),
    italic: !!child(rPr, 'i'),
    underline: !!child(rPr, 'u'),
    color,
  };
}

function inferCategory(name: string, styleId: string): Style['category'] {
  const n = name.toLowerCase();
  const id = styleId.toLowerCase();
  if (n.includes('heading 1') || id.includes('heading1') || id === 'title') return 'heading1';
  if (n.includes('heading 2') || id.includes('heading2')) return 'heading2';
  if (n.includes('heading 3') || id.includes('heading3')) return 'heading3';
  if (n.includes('caption')) return 'caption';
  if (n.includes('quote')) return 'quote';
  if (n.includes('code') || n.includes('source')) return 'code';
  if (n.includes('table')) return 'table';
  if (n.includes('list')) return 'list';
  return 'body';
}

export function parseDocxStylesXml(stylesXml: string): ExtractedWordStyle[] {
  const doc = new DOMParser().parseFromString(stylesXml, 'application/xml');
  const styles = Array.from(doc.getElementsByTagName('w:style'));
  const results: ExtractedWordStyle[] = [];

  for (const styleNode of styles) {
    const styleId = attr(styleNode, 'styleId');
    if (!styleId) continue;
    const type = attr(styleNode, 'type') ?? 'paragraph';
    if (type !== 'paragraph' && type !== 'character') continue;

    const name = childVal(styleNode, 'name') ?? styleId;
    const pPr = child(styleNode, 'pPr');
    const rPr = child(styleNode, 'rPr') ?? child(styleNode, 'rPr');
    const runProps = parseRunProperties(rPr);
    const jc = childVal(pPr, 'jc') as Style['alignment'] | null;

    results.push({
      styleId,
      name,
      type,
      fontFamily: runProps.fontFamily ?? 'Calibri',
      fontSize: runProps.fontSize ?? 11,
      bold: runProps.bold ?? false,
      italic: runProps.italic ?? false,
      underline: runProps.underline ?? false,
      color: runProps.color ?? '#000000',
      alignment: jc ?? 'left',
    });
  }

  return results;
}

export function mergeWordStylesIntoDocForge(
  extracted: ExtractedWordStyle[],
  existing?: StylesFile,
): { stylesFile: StylesFile; mappings: Array<{ wordStyleId: string; wordStyleName: string; docforgeStyleId: string; extractedJson: string }> } {
  const base = existing ?? createDefaultStyles();
  const styles = [...base.styles];
  const mappings: Array<{ wordStyleId: string; wordStyleName: string; docforgeStyleId: string; extractedJson: string }> = [];

  for (const wordStyle of extracted) {
    const category = inferCategory(wordStyle.name, wordStyle.styleId);
    let match = styles.find(
      (s) => s.name.toLowerCase() === wordStyle.name.toLowerCase() || s.category === category,
    );

    if (!match) {
      match = {
        id: createId(),
        name: wordStyle.name,
        category,
        fontFamily: wordStyle.fontFamily,
        fontSize: wordStyle.fontSize,
        bold: wordStyle.bold,
        italic: wordStyle.italic,
        underline: wordStyle.underline,
        color: wordStyle.color,
        backgroundColor: 'transparent',
        alignment: wordStyle.alignment,
        spacingBefore: 0,
        spacingAfter: 8,
        lineSpacing: 1.15,
        borderTop: false,
        borderBottom: false,
        borderColor: '#3f3f46',
      };
      styles.push(match);
    } else {
      match = {
        ...match,
        name: wordStyle.name,
        fontFamily: wordStyle.fontFamily,
        fontSize: wordStyle.fontSize,
        bold: wordStyle.bold,
        italic: wordStyle.italic,
        underline: wordStyle.underline,
        color: wordStyle.color,
        alignment: wordStyle.alignment,
      };
      const idx = styles.findIndex((s) => s.id === match!.id);
      if (idx >= 0) styles[idx] = match;
    }

    mappings.push({
      wordStyleId: wordStyle.styleId,
      wordStyleName: wordStyle.name,
      docforgeStyleId: match.id,
      extractedJson: JSON.stringify(wordStyle),
    });
  }

  return {
    stylesFile: { version: base.version, styles },
    mappings,
  };
}

export function mapWordStyleToDocForgeStyleId(
  wordStyleName: string | null | undefined,
  mappings: Array<{ wordStyleName: string; docforgeStyleId: string }>,
  styles: Style[],
  fallbackCategory: Style['category'] = 'body',
): string {
  if (wordStyleName) {
    const mapping = mappings.find(
      (m) => m.wordStyleName.toLowerCase() === wordStyleName.toLowerCase(),
    );
    if (mapping) return mapping.docforgeStyleId;
  }
  return styles.find((s) => s.category === fallbackCategory)?.id ?? styles[0]?.id ?? '';
}
