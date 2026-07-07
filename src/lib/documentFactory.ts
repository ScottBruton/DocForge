import type { Document, Section, Block, BlockType } from '@/schema';
import { createId, nowIso } from '@/lib/utils';

export function createEmptyDocument(templateId?: string): Document {
  const now = nowIso();
  return {
    metadata: {
      title: 'Untitled Document',
      author: '',
      description: '',
      createdAt: now,
      modifiedAt: now,
      templateId,
      version: '1.0.0',
    },
    sections: [createSection('Introduction', 0)],
    assetRefs: [],
    version: '1.0.0',
  };
}

export function createSection(title: string, order: number): Section {
  return {
    id: createId(),
    title,
    order,
    collapsed: false,
    blocks: [],
  };
}

export function createBlock(type: BlockType, styleId: string): Block {
  const base = {
    id: createId(),
    styleId,
    properties: {
      visible: true,
      locked: false,
      spacingBefore: 0,
      spacingAfter: 0,
      pageBreakBefore: false,
      keepWithNext: false,
    },
    metadata: { createdAt: nowIso(), modifiedAt: nowIso() },
  };

  switch (type) {
    case 'heading':
      return { ...base, type, content: { text: 'New Heading', level: 1, numberingEnabled: false, includeInToc: true } };
    case 'paragraph':
      return { ...base, type, content: { text: '', alignment: 'left', indentation: 0 } };
    case 'figure':
      return {
        ...base,
        type,
        content: {
          assetId: null,
          caption: '',
          widthPercent: 100,
          alignment: 'center',
          wrap: 'inline',
          keepWithCaption: true,
          captionPosition: 'below',
          figureNumbering: true,
        },
      };
    case 'table':
      return {
        ...base,
        type,
        content: {
          columns: [
            { id: createId(), width: 120 },
            { id: createId(), width: 120 },
          ],
          rows: [
            { id: createId(), height: 28 },
            { id: createId(), height: 28 },
          ],
          cells: [
            { row: 0, col: 0, value: 'Header 1', rowSpan: 1, colSpan: 1 },
            { row: 0, col: 1, value: 'Header 2', rowSpan: 1, colSpan: 1 },
            { row: 1, col: 0, value: '', rowSpan: 1, colSpan: 1 },
            { row: 1, col: 1, value: '', rowSpan: 1, colSpan: 1 },
          ],
          caption: '',
          headerRow: true,
          repeatHeaderRow: false,
          bandedRows: true,
          autofitMode: 'auto',
          cellPadding: 4,
          borders: true,
        },
      };
    case 'bulletList':
    case 'numberedList':
      return { ...base, type, content: { items: [{ id: createId(), text: 'List item' }] } };
    case 'checklist':
      return { ...base, type, content: { items: [{ id: createId(), text: 'Task', checked: false }] } };
    case 'quote':
      return { ...base, type, content: { text: '', attribution: '' } };
    case 'equation':
      return { ...base, type, content: { latex: 'E = mc^2' } };
    case 'code':
      return { ...base, type, content: { code: '', language: 'plaintext' } };
    case 'horizontalRule':
      return { ...base, type, content: {} };
    case 'pageBreak':
      return { ...base, type, content: {} };
    default:
      throw new Error(`Unknown block type: ${type satisfies never}`);
  }
}

export function findBlock(document: Document, blockId: string): { section: Section; block: Block; index: number } | null {
  for (const section of document.sections) {
    const index = section.blocks.findIndex((b) => b.id === blockId);
    if (index >= 0) {
      return { section, block: section.blocks[index]!, index };
    }
  }
  return null;
}

export function findSection(document: Document, sectionId: string): Section | null {
  return document.sections.find((s) => s.id === sectionId) ?? null;
}

export function reorderSections(sections: Section[]): Section[] {
  return sections.map((s, i) => ({ ...s, order: i }));
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  if (item === undefined) return result;
  result.splice(to, 0, item);
  return result;
}

export function collectAllIds(document: Document): string[] {
  const ids: string[] = [];
  for (const section of document.sections) {
    ids.push(section.id);
    for (const block of section.blocks) {
      ids.push(block.id);
    }
  }
  return ids;
}

export function touchDocument(doc: Document): Document {
  return {
    ...doc,
    metadata: { ...doc.metadata, modifiedAt: nowIso() },
  };
}
