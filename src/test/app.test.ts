import { describe, it, expect } from 'vitest';
import { validateDocument, validateBlock } from '@/schema';
import { createEmptyDocument, createBlock, createSection } from '@/lib/documentFactory';
import { createDefaultStyles } from '@/lib/defaultStyles';
import { documentReducer } from '@/services/documentReducer';
import { moveItem } from '@/lib/documentFactory';
import { setCellValue, pasteFromClipboard, validateTableStructure } from '@/blocks/table/tableUtils';
import { ValidationService } from '@/services/ValidationService';
import { AuditResultSchema, normalizeProposedChange, parseJustificationRating } from '@/services/ai/auditTypes';
import { extractContextAround } from '@/components/ai/AuditTextHighlight';

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

describe('audit response parsing', () => {
  it('coerces incomplete proposedChange to feedback-only findings', () => {
    const result = AuditResultSchema.safeParse({
      summary: 'Review complete',
      findings: [
        {
          id: '1',
          severity: 'warning',
          title: 'Missing content field',
          description: 'Paragraph needs a fix',
          actionable: true,
          proposedChange: { action: 'update_block', blockId: 'b1' },
        },
        {
          id: '2',
          severity: 'suggestion',
          title: 'Missing blockId',
          description: 'Use location fallback',
          actionable: true,
          location: { blockId: 'b2' },
          proposedChange: { action: 'update_block', content: { text: 'Fixed text' } },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.findings).toHaveLength(2);
    expect(result.data.findings[0]?.actionable).toBe(false);
    expect(result.data.findings[1]?.actionable).toBe(true);
    expect(result.data.findings[1]?.proposedChange).toEqual({
      action: 'update_block',
      blockId: 'b2',
      content: { text: 'Fixed text' },
    });
  });

  it('normalizes update_block text shorthand', () => {
    expect(
      normalizeProposedChange(
        { action: 'update_block', blockId: 'b1', text: 'Hello' },
      ),
    ).toEqual({
      action: 'update_block',
      blockId: 'b1',
      content: { text: 'Hello' },
    });
  });
});

describe('justification audit parsing', () => {
  it('parses justification rating and rationale', () => {
    const result = AuditResultSchema.safeParse({
      summary: 'Justification review',
      findings: [
        {
          id: 'j1',
          severity: 'warning',
          categories: ['justifications'],
          title: 'Weak method justification',
          description: 'The rationale for using this test method is vague.',
          actionable: false,
          justificationRating: 'weak',
          justificationRationale: 'No link to acceptance criteria elsewhere in the document.',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.findings[0]?.justificationRating).toBe('weak');
    expect(result.data.findings[0]?.justificationRationale).toContain('acceptance criteria');
  });

  it('normalizes justification rating synonyms', () => {
    expect(parseJustificationRating('Strong')).toBe('strong');
    expect(parseJustificationRating('adequate')).toBe('ok');
    expect(parseJustificationRating('insufficient')).toBe('weak');
  });
});

describe('openai model resolution', () => {
  it('upgrades mini models to gpt-4o', async () => {
    const { resolveQualityTextModel, migrateModelSettings } = await import('@/lib/openaiModels');
    expect(resolveQualityTextModel('gpt-4o-mini')).toBe('gpt-4o');
    expect(resolveQualityTextModel('gpt-4o')).toBe('gpt-4o');
    expect(migrateModelSettings({ defaultModel: 'gpt-4o-mini' })).toEqual({ defaultModel: 'gpt-4o' });
  });
});

describe('formatting audit analysis', () => {
  it('detects mixed figure caption numbering patterns', async () => {
    const { analyzeFormattingConsistency } = await import('@/services/ai/auditFormatAnalysis');
    const { createEmptyDocument, createBlock, createSection } = await import('@/lib/documentFactory');
    const { createDefaultStyles } = await import('@/lib/defaultStyles');
    const styles = createDefaultStyles().styles;
    const doc = createEmptyDocument();
    const section = createSection('Figures');
    const fig1 = createBlock('figure', styles[0]!.id);
    const fig2 = createBlock('figure', styles[0]!.id);
    if (fig1.type === 'figure') {
      fig1.content.caption = 'Figure 1: Sun diagram';
      fig1.content.captionPosition = 'below';
    }
    if (fig2.type === 'figure') {
      fig2.content.caption = 'Fig. 2: Graph';
      fig2.content.captionPosition = 'below';
    }
    section.blocks = [fig1, fig2];
    doc.sections = [section];

    const analysis = analyzeFormattingConsistency(doc, styles);
    expect(analysis.inconsistencies.some((i) => i.kind === 'caption_pattern')).toBe(true);
  });
});

describe('contextual audit highlight', () => {
  it('includes surrounding text around the changed phrase', () => {
    const paragraph =
      'This document describes Test Protocols for cleanability verification. The Test Protocols section outlines all required steps.';
    const result = extractContextAround(paragraph, 'Test Protocols');
    expect(result.context).toContain('describes');
    expect(result.context).toContain('Test Protocols');
    expect(result.context).toContain('for cleanability');
    expect(result.truncatedStart || result.truncatedEnd).toBe(true);
  });
});

describe('audit merge preview', () => {
  it('computes diff snippet for full paragraph rewrites', async () => {
    const { previewAuditBlockMerge } = await import('@/services/ai/auditMerge');
    const styles = createDefaultStyles();
    const block = createBlock('paragraph', styles.styles[0]!.id);
    if (block.type !== 'paragraph') throw new Error('expected paragraph');
    block.content.text = 'The system were design for speed and reliability in all cases.';
    const result = previewAuditBlockMerge(block, {
      text: 'The system was designed for speed and reliability in all cases.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.textSnippetDiff?.before).toContain('were design');
    expect(result.textSnippetDiff?.after).toContain('was designed');
  });

  it('computes diff snippet for table caption changes', async () => {
    const { previewAuditBlockMerge } = await import('@/services/ai/auditMerge');
    const styles = createDefaultStyles();
    const block = createBlock('table', styles.styles[0]!.id);
    if (block.type !== 'table') throw new Error('expected table');
    block.content.caption = '';
    const result = previewAuditBlockMerge(block, {
      caption: 'Table 3: 55.5% IPA Solution Volumes (500ml)',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.textSnippetDiff?.before).toBe('(no caption)');
    expect(result.textSnippetDiff?.after).toContain('Table 3');
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
