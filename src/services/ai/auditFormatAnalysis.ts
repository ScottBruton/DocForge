import type { Block, Document, Section, Style } from '@/schema';

export interface FormattingInconsistency {
  kind: 'figure' | 'table' | 'section_structure' | 'style_usage' | 'caption_pattern';
  severity: 'warning' | 'suggestion' | 'info';
  message: string;
  sectionId?: string;
  sectionTitle?: string;
  blockIds: string[];
  detail?: string;
}

export interface FormattingAnalysis {
  inconsistencies: FormattingInconsistency[];
  figureSummary: Array<{
    blockId: string;
    sectionTitle: string;
    caption: string;
    captionPosition: string;
    alignment: string;
    figureNumbering: boolean;
    styleName: string;
    captionPattern: string | null;
  }>;
  tableSummary: Array<{
    blockId: string;
    sectionTitle: string;
    caption: string;
    columns: number;
    rows: number;
    headerRow: boolean;
    bandedRows: boolean;
    borders: boolean;
    styleName: string;
    captionPattern: string | null;
  }>;
  sectionStructures: Array<{
    sectionId: string;
    title: string;
    blockSequence: string[];
    headingLevels: number[];
  }>;
}

function styleName(styles: Style[], styleId: string): string {
  return styles.find((s) => s.id === styleId)?.name ?? styleId;
}

function captionPattern(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^Figure\s+\d+[:.)-]/i.test(trimmed)) return 'Figure N:';
  if (/^Fig\.?\s*\d+[:.)-]/i.test(trimmed)) return 'Fig. N:';
  if (/^Table\s+\d+[:.)-]/i.test(trimmed)) return 'Table N:';
  if (/^Tab\.?\s*\d+[:.)-]/i.test(trimmed)) return 'Tab. N:';
  if (/^\d+[:.)]\s/.test(trimmed)) return 'N:';
  return 'unnumbered';
}

function modeValue<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function minorityOutliers<T>(values: Array<{ id: string; sectionId: string; sectionTitle: string; value: T }>): Array<{
  id: string;
  sectionId: string;
  sectionTitle: string;
  value: T;
  majority: T;
}> {
  const mode = modeValue(values.map((v) => v.value));
  if (mode === null || values.length < 2) return [];
  return values
    .filter((v) => v.value !== mode)
    .map((v) => ({ ...v, majority: mode }));
}

function sectionBlockSequence(section: Section): string[] {
  return section.blocks
    .filter((b) => b.properties.visible)
    .map((b) => b.type);
}

function sectionHeadingLevels(section: Section): number[] {
  return section.blocks
    .filter((b) => b.properties.visible && b.type === 'heading')
    .map((b) => (b.type === 'heading' ? b.content.level : 0));
}

function compareSimilarSections(document: Document): FormattingInconsistency[] {
  const findings: FormattingInconsistency[] = [];
  const sections = document.sections.filter((s) => s.blocks.some((b) => b.properties.visible));
  if (sections.length < 2) return findings;

  const structures = sections.map((section) => ({
    section,
    sequence: sectionBlockSequence(section),
    signature: sectionBlockSequence(section).join('>'),
  }));

  const bySignature = new Map<string, typeof structures>();
  for (const entry of structures) {
    const list = bySignature.get(entry.signature) ?? [];
    list.push(entry);
    bySignature.set(entry.signature, list);
  }

  const procedureLike = structures.filter(({ section }) =>
    /procedure|protocol|method|step|test/i.test(section.title),
  );

  if (procedureLike.length >= 2) {
    const signatures = new Set(procedureLike.map((p) => p.signature));
    if (signatures.size > 1) {
      findings.push({
        kind: 'section_structure',
        severity: 'warning',
        message: 'Procedure/protocol sections use different block structures',
        detail: procedureLike
          .map(({ section, sequence }) => `"${section.title}": ${sequence.join(' → ') || '(empty)'}`)
          .join('; '),
        blockIds: [],
      });
    }
  }

  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const a = sections[i]!;
      const b = sections[j]!;
      const aSeq = sectionBlockSequence(a);
      const bSeq = sectionBlockSequence(b);
      if (aSeq.length === 0 || bSeq.length === 0) continue;

      const titleSimilar =
        a.title.toLowerCase().split(/\s+/).some((word) =>
          word.length > 4 && b.title.toLowerCase().includes(word),
        );
      if (!titleSimilar) continue;
      if (aSeq.join('>') === bSeq.join('>')) continue;

      const sharedTypes = aSeq.filter((t) => bSeq.includes(t));
      if (sharedTypes.length < 2) continue;

      findings.push({
        kind: 'section_structure',
        severity: 'suggestion',
        message: `Sections "${a.title}" and "${b.title}" appear related but use different layouts`,
        sectionId: a.id,
        sectionTitle: a.title,
        blockIds: [],
        detail: `"${a.title}": ${aSeq.join(' → ')} | "${b.title}": ${bSeq.join(' → ')}`,
      });
    }
  }

  return findings;
}

function analyzeFigures(document: Document, styles: Style[]): {
  summary: FormattingAnalysis['figureSummary'];
  inconsistencies: FormattingInconsistency[];
} {
  const figures: FormattingAnalysis['figureSummary'] = [];
  const inconsistencies: FormattingInconsistency[] = [];

  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (!block.properties.visible || block.type !== 'figure') continue;
      figures.push({
        blockId: block.id,
        sectionTitle: section.title,
        caption: block.content.caption,
        captionPosition: block.content.captionPosition,
        alignment: block.content.alignment,
        figureNumbering: block.content.figureNumbering,
        styleName: styleName(styles, block.styleId),
        captionPattern: captionPattern(block.content.caption),
      });
    }
  }

  if (figures.length < 2) return { summary: figures, inconsistencies };

  const captionPatterns = figures
    .map((f) => f.captionPattern)
    .filter((p): p is string => p !== null);
  const patternMode = modeValue(captionPatterns);
  if (patternMode && captionPatterns.length >= 2) {
    const mixed = figures.filter((f) => f.captionPattern && f.captionPattern !== patternMode);
    if (mixed.length > 0) {
      inconsistencies.push({
        kind: 'caption_pattern',
        severity: 'warning',
        message: `Figure captions use mixed numbering styles (majority: "${patternMode}")`,
        detail: mixed.map((f) => `"${f.caption.slice(0, 60)}" (${f.captionPattern})`).join('; '),
        blockIds: mixed.map((f) => f.blockId),
      });
    }
  }

  const fields: Array<keyof Pick<FormattingAnalysis['figureSummary'][number], 'captionPosition' | 'alignment'>> =
    ['captionPosition', 'alignment'];
  for (const field of fields) {
    const outliers = minorityOutliers(
      figures.map((f) => ({
        id: f.blockId,
        sectionId: '',
        sectionTitle: f.sectionTitle,
        value: f[field],
      })),
    );
    if (outliers.length > 0) {
      inconsistencies.push({
        kind: 'figure',
        severity: 'suggestion',
        message: `Figures disagree on ${field} (most use "${outliers[0]!.majority}")`,
        detail: outliers
          .map((o) => `${o.sectionTitle}: ${o.value}`)
          .join('; '),
        blockIds: outliers.map((o) => o.id),
      });
    }
  }

  const styleOutliers = minorityOutliers(
    figures.map((f) => ({
      id: f.blockId,
      sectionId: '',
      sectionTitle: f.sectionTitle,
      value: f.styleName,
    })),
  );
  if (styleOutliers.length > 0) {
    inconsistencies.push({
      kind: 'style_usage',
      severity: 'suggestion',
      message: `Some figures use a different style (majority: "${styleOutliers[0]!.majority}")`,
      blockIds: styleOutliers.map((o) => o.id),
      detail: styleOutliers.map((o) => `${o.sectionTitle}: ${o.value}`).join('; '),
    });
  }

  const missingCaptions = figures.filter((f) => !f.caption.trim());
  if (missingCaptions.length > 0 && missingCaptions.length < figures.length) {
    inconsistencies.push({
      kind: 'figure',
      severity: 'warning',
      message: 'Some figures are missing captions while others have them',
      blockIds: missingCaptions.map((f) => f.blockId),
      detail: missingCaptions.map((f) => f.sectionTitle).join(', '),
    });
  }

  return { summary: figures, inconsistencies };
}

function analyzeTables(document: Document, styles: Style[]): {
  summary: FormattingAnalysis['tableSummary'];
  inconsistencies: FormattingInconsistency[];
} {
  const tables: FormattingAnalysis['tableSummary'] = [];
  const inconsistencies: FormattingInconsistency[] = [];

  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (!block.properties.visible || block.type !== 'table') continue;
      tables.push({
        blockId: block.id,
        sectionTitle: section.title,
        caption: block.content.caption,
        columns: block.content.columns.length,
        rows: block.content.rows.length,
        headerRow: block.content.headerRow,
        bandedRows: block.content.bandedRows,
        borders: block.content.borders,
        styleName: styleName(styles, block.styleId),
        captionPattern: captionPattern(block.content.caption),
      });
    }
  }

  if (tables.length < 2) return { summary: tables, inconsistencies };

  const captionPatterns = tables
    .map((t) => t.captionPattern)
    .filter((p): p is string => p !== null);
  const patternMode = modeValue(captionPatterns);
  if (patternMode && captionPatterns.length >= 2) {
    const mixed = tables.filter((t) => t.captionPattern && t.captionPattern !== patternMode);
    if (mixed.length > 0) {
      inconsistencies.push({
        kind: 'caption_pattern',
        severity: 'warning',
        message: `Table captions use mixed numbering styles (majority: "${patternMode}")`,
        blockIds: mixed.map((t) => t.blockId),
        detail: mixed.map((t) => `"${t.caption.slice(0, 60)}" (${t.captionPattern})`).join('; '),
      });
    }
  }

  for (const field of ['headerRow', 'bandedRows', 'borders'] as const) {
    const outliers = minorityOutliers(
      tables.map((t) => ({
        id: t.blockId,
        sectionId: '',
        sectionTitle: t.sectionTitle,
        value: t[field],
      })),
    );
    if (outliers.length > 0) {
      inconsistencies.push({
        kind: 'table',
        severity: 'suggestion',
        message: `Tables disagree on ${field} (most use ${String(outliers[0]!.majority)})`,
        blockIds: outliers.map((o) => o.id),
        detail: outliers.map((o) => `${o.sectionTitle}: ${o.value}`).join('; '),
      });
    }
  }

  const withCaption = tables.filter((t) => t.caption.trim());
  const withoutCaption = tables.filter((t) => !t.caption.trim());
  if (withCaption.length > 0 && withoutCaption.length > 0) {
    inconsistencies.push({
      kind: 'table',
      severity: 'warning',
      message: 'Some tables have captions while others do not',
      blockIds: withoutCaption.map((t) => t.blockId),
      detail: withoutCaption.map((t) => t.sectionTitle).join(', '),
    });
  }

  return { summary: tables, inconsistencies };
}

function analyzeStyleUsage(document: Document, styles: Style[]): FormattingInconsistency[] {
  const findings: FormattingInconsistency[] = [];
  const byType = new Map<string, Array<{ blockId: string; sectionTitle: string; styleName: string }>>();

  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (!block.properties.visible) continue;
      if (block.type === 'horizontalRule' || block.type === 'pageBreak') continue;
      const list = byType.get(block.type) ?? [];
      list.push({
        blockId: block.id,
        sectionTitle: section.title,
        styleName: styleName(styles, block.styleId),
      });
      byType.set(block.type, list);
    }
  }

  for (const [blockType, blocks] of byType) {
    if (blocks.length < 3) continue;
    const outliers = minorityOutliers(
      blocks.map((b) => ({
        id: b.blockId,
        sectionId: '',
        sectionTitle: b.sectionTitle,
        value: b.styleName,
      })),
    );
    if (outliers.length > 0 && outliers.length <= blocks.length / 2) {
      findings.push({
        kind: 'style_usage',
        severity: 'info',
        message: `${blockType} blocks mostly use style "${outliers[0]!.majority}" but ${outliers.length} use a different style`,
        blockIds: outliers.map((o) => o.id),
        detail: outliers.map((o) => `${o.sectionTitle}: ${o.value}`).join('; '),
      });
    }
  }

  return findings;
}

export function analyzeFormattingConsistency(document: Document, styles: Style[]): FormattingAnalysis {
  const sectionStructures = document.sections.map((section) => ({
    sectionId: section.id,
    title: section.title,
    blockSequence: sectionBlockSequence(section),
    headingLevels: sectionHeadingLevels(section),
  }));

  const figureAnalysis = analyzeFigures(document, styles);
  const tableAnalysis = analyzeTables(document, styles);
  const inconsistencies = [
    ...compareSimilarSections(document),
    ...figureAnalysis.inconsistencies,
    ...tableAnalysis.inconsistencies,
    ...analyzeStyleUsage(document, styles),
  ];

  return {
    inconsistencies,
    figureSummary: figureAnalysis.summary,
    tableSummary: tableAnalysis.summary,
    sectionStructures,
  };
}

export function serializeBlockFormatting(block: Block, styles: Style[]): Record<string, unknown> {
  const base = {
    styleId: block.styleId,
    styleName: styleName(styles, block.styleId),
    spacingBefore: block.properties.spacingBefore,
    spacingAfter: block.properties.spacingAfter,
  };

  switch (block.type) {
    case 'heading':
      return { ...base, level: block.content.level, includeInToc: block.content.includeInToc };
    case 'paragraph':
      return { ...base, alignment: block.content.alignment, indentation: block.content.indentation };
    case 'figure':
      return {
        ...base,
        captionPosition: block.content.captionPosition,
        alignment: block.content.alignment,
        figureNumbering: block.content.figureNumbering,
        widthPercent: block.content.widthPercent,
      };
    case 'table':
      return {
        ...base,
        headerRow: block.content.headerRow,
        bandedRows: block.content.bandedRows,
        borders: block.content.borders,
        repeatHeaderRow: block.content.repeatHeaderRow,
        columnCount: block.content.columns.length,
        rowCount: block.content.rows.length,
      };
    case 'quote':
      return { ...base, hasAttribution: Boolean(block.content.attribution?.trim()) };
    case 'code':
      return { ...base, language: block.content.language };
    default:
      return base;
  }
}
