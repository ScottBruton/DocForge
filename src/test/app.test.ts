import { describe, it, expect } from 'vitest';
import { validateDocument, validateBlock } from '@/schema';
import { createEmptyDocument, createBlock, createSection } from '@/lib/documentFactory';
import { createDefaultStyles } from '@/lib/defaultStyles';
import { documentReducer } from '@/services/documentReducer';
import { moveItem } from '@/lib/documentFactory';
import { setCellValue, pasteFromClipboard, validateTableStructure } from '@/blocks/table/tableUtils';
import { ValidationService } from '@/services/ValidationService';

describe('schema validation', () => {
  it('validates a valid document', () => {
    const doc = createEmptyDocument();
    const result = validateDocument(doc);
    expect(result.success).toBe(true);
  });

  it('rejects invalid block type', () => {
    const doc = createEmptyDocument();
    const invalid = { ...doc, sections: [{ ...doc.sections[0]!, blocks: [{ id: '1', type: 'invalid', styleId: 'x', content: {}, properties: {}, metadata: {} }] }] };
    const result = validateDocument(invalid);
    expect(result.success).toBe(false);
  });
});

describe('documentReducer', () => {
  it('adds a section', () => {
    const doc = createEmptyDocument();
    const next = documentReducer(doc, { type: 'ADD_SECTION', title: 'Test' });
    expect(next.sections.length).toBe(2);
  });

  it('deletes a block', () => {
    let doc = createEmptyDocument();
    const sectionId = doc.sections[0]!.id;
    doc = documentReducer(doc, { type: 'ADD_BLOCK', sectionId, blockType: 'paragraph' });
    const blockId = doc.sections[0]!.blocks[0]!.id;
    const next = documentReducer(doc, { type: 'DELETE_BLOCK', blockId });
    expect(next.sections[0]!.blocks.length).toBe(0);
  });

  it('moves sections', () => {
    let doc = createEmptyDocument();
    doc = documentReducer(doc, { type: 'ADD_SECTION', title: 'Second' });
    const firstId = doc.sections[0]!.id;
    const firstTitle = doc.sections[0]!.title;
    const next = documentReducer(doc, { type: 'MOVE_SECTION', sectionId: firstId, toIndex: 1 });
    expect(next.sections[1]!.title).toBe(firstTitle);
  });
});

describe('moveItem', () => {
  it('reorders array items', () => {
    const arr = ['a', 'b', 'c'];
    expect(moveItem(arr, 0, 2)).toEqual(['b', 'c', 'a']);
  });
});

describe('table operations', () => {
  it('sets cell value', () => {
    const styles = createDefaultStyles();
    const block = createBlock('table', styles.styles[0]!.id);
    if (block.type !== 'table') throw new Error('expected table');
    const updated = setCellValue(block.content, 0, 0, 'Hello');
    expect(updated.cells.find((c) => c.row === 0 && c.col === 0)?.value).toBe('Hello');
  });

  it('pastes from clipboard format', () => {
    const styles = createDefaultStyles();
    const block = createBlock('table', styles.styles[0]!.id);
    if (block.type !== 'table') throw new Error('expected table');
    const updated = pasteFromClipboard(block.content, 0, 0, 'A\tB\nC\tD');
    expect(updated.cells.length).toBeGreaterThanOrEqual(4);
  });

  it('validates table structure', () => {
    const styles = createDefaultStyles();
    const block = createBlock('table', styles.styles[0]!.id);
    if (block.type !== 'table') throw new Error('expected table');
    const issues = validateTableStructure(block.content);
    expect(issues.length).toBe(0);
  });
});

describe('ValidationService', () => {
  it('detects empty sections', () => {
    const doc = createEmptyDocument();
    const styles = createDefaultStyles().styles;
    const result = ValidationService.validate(doc, styles, []);
    expect(result.warningCount).toBeGreaterThanOrEqual(1);
  });
});

describe('style application', () => {
  it('creates default styles', () => {
    const styles = createDefaultStyles();
    expect(styles.styles.length).toBe(12);
    expect(styles.styles.some((s) => s.category === 'heading1')).toBe(true);
  });
});

describe('asset references', () => {
  it('validates broken asset reference', () => {
    const styles = createDefaultStyles();
    const styleId = styles.styles[0]!.id;
    const doc = createEmptyDocument();
    const section = createSection('Test', 0);
    const figure = createBlock('figure', styleId);
    if (figure.type === 'figure') {
      figure.content.assetId = 'missing-asset';
    }
    section.blocks.push(figure);
    doc.sections = [section];
    const result = ValidationService.validate(doc, styles.styles, []);
    expect(result.issues.some((i) => i.message.includes('Broken asset'))).toBe(true);
  });
});

describe('AI JSON validation', () => {
  it('rejects malformed AI output', () => {
    const result = validateDocument({ invalid: true });
    expect(result.success).toBe(false);
  });
});

describe('block validation', () => {
  it('validates heading block', () => {
    const styles = createDefaultStyles();
    const block = createBlock('heading', styles.styles[0]!.id);
    const result = validateBlock(block);
    expect(result.success).toBe(true);
  });
});
