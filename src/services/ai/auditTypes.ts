import { z } from 'zod';
import type { Block, Document, Style } from '@/schema';
import {
  analyzeFormattingConsistency,
  serializeBlockFormatting,
} from '@/services/ai/auditFormatAnalysis';

export const AUDIT_CRITERIA = [
  { id: 'section_consistency', label: 'Consistency between sections', description: 'Terminology, facts, messaging, and structural/formatting patterns align across similar sections' },
  { id: 'coherent_flow', label: 'Coherent flow and structure', description: 'Logical progression, transitions, and narrative arc' },
  { id: 'cross_references', label: 'Cross-references and links', description: 'Internal references, section links, and citations are correct' },
  { id: 'terminology', label: 'Terminology consistency', description: 'Consistent naming of concepts, products, and roles' },
  { id: 'tone_voice', label: 'Tone and voice', description: 'Appropriate, consistent tone for the audience' },
  { id: 'completeness', label: 'Completeness', description: 'Missing content, placeholders, or incomplete sections' },
  { id: 'grammar_clarity', label: 'Grammar and clarity', description: 'Spelling, grammar, readability, and precision' },
  { id: 'formatting_style', label: 'Formatting and style', description: 'Heading levels, list styles, paragraph alignment, and style usage are consistent across similar content' },
  { id: 'figures_tables', label: 'Figures and tables', description: 'Caption wording/numbering, placement, table layout options, and presentation are consistent' },
  { id: 'heading_structure', label: 'Heading hierarchy', description: 'Heading levels, TOC structure, and section organisation' },
  { id: 'linked_document', label: 'Linked Word alignment', description: 'Consistency with linked source document expectations' },
] as const;

export type AuditCriterionId = (typeof AUDIT_CRITERIA)[number]['id'];

export type AuditSeverity = 'critical' | 'warning' | 'suggestion' | 'info';

export type JustificationStrength = 'weak' | 'ok' | 'strong';

export const JUSTIFICATION_STRENGTH_LABELS: Record<JustificationStrength, string> = {
  weak: 'Weak',
  ok: 'OK',
  strong: 'Strong',
};

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'skipped';

/** OpenAI often returns null for omitted optional fields; coerce to undefined. */
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

const AuditLocationSchema = z
  .object({
    sectionId: optionalString,
    sectionTitle: optionalString,
    blockId: optionalString,
    blockType: optionalString,
    excerpt: optionalString,
  })
  .nullish()
  .transform((v) => (v == null ? undefined : v));

export const ProposedChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_block'),
    blockId: z.string(),
    content: z.record(z.unknown()),
    styleId: z.string().optional(),
  }),
  z.object({
    action: z.literal('update_list_items'),
    blockId: z.string(),
    itemUpdates: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        checked: z.boolean().optional(),
      }),
    ),
  }),
  z.object({
    action: z.literal('update_table_cell'),
    blockId: z.string(),
    row: z.number(),
    col: z.number(),
    value: z.string(),
  }),
  z.object({
    action: z.literal('rename_section'),
    sectionId: z.string(),
    title: z.string(),
  }),
  z.object({
    action: z.literal('set_metadata'),
    metadata: z.record(z.unknown()),
  }),
  z.object({ action: z.literal('none') }),
]);

export function normalizeProposedChange(
  raw: unknown,
  location?: z.infer<typeof AuditLocationSchema>,
): ProposedChange | undefined {
  if (raw == null) return undefined;

  const parsed = ProposedChangeSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  if (typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const action = obj.action;

  if (action === 'none') return { action: 'none' };

  if (action === 'update_block') {
    const blockId =
      (typeof obj.blockId === 'string' ? obj.blockId : undefined) ?? location?.blockId;
    let content: Record<string, unknown> | undefined;
    if (typeof obj.content === 'object' && obj.content !== null && !Array.isArray(obj.content)) {
      content = obj.content as Record<string, unknown>;
    } else if (typeof obj.text === 'string') {
      content = { text: obj.text };
    }
    if (blockId && content && Object.keys(content).length > 0) {
      return {
        action: 'update_block',
        blockId,
        content,
        ...(typeof obj.styleId === 'string' ? { styleId: obj.styleId } : {}),
      };
    }
    if (blockId && typeof obj.styleId === 'string') {
      return { action: 'update_block', blockId, content: {}, styleId: obj.styleId };
    }
    return undefined;
  }

  if (action === 'update_list_items') {
    const blockId =
      (typeof obj.blockId === 'string' ? obj.blockId : undefined) ?? location?.blockId;
    const itemUpdates = Array.isArray(obj.itemUpdates) ? obj.itemUpdates : [];
    const validUpdates = itemUpdates.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [];
      const row = item as Record<string, unknown>;
      if (typeof row.id !== 'string' || typeof row.text !== 'string') return [];
      return [{
        id: row.id,
        text: row.text,
        ...(typeof row.checked === 'boolean' ? { checked: row.checked } : {}),
      }];
    });
    if (blockId && validUpdates.length > 0) {
      return { action: 'update_list_items', blockId, itemUpdates: validUpdates };
    }
    return undefined;
  }

  if (action === 'update_table_cell') {
    const blockId =
      (typeof obj.blockId === 'string' ? obj.blockId : undefined) ?? location?.blockId;
    const row = typeof obj.row === 'number' ? obj.row : Number(obj.row);
    const col = typeof obj.col === 'number' ? obj.col : Number(obj.col);
    const value = typeof obj.value === 'string' ? obj.value : undefined;
    if (blockId && Number.isInteger(row) && Number.isInteger(col) && value !== undefined) {
      return { action: 'update_table_cell', blockId, row, col, value };
    }
    return undefined;
  }

  if (action === 'rename_section') {
    const sectionId =
      (typeof obj.sectionId === 'string' ? obj.sectionId : undefined) ?? location?.sectionId;
    const title = typeof obj.title === 'string' ? obj.title : undefined;
    if (sectionId && title) {
      return { action: 'rename_section', sectionId, title };
    }
    return undefined;
  }

  if (action === 'set_metadata') {
    const metadata =
      typeof obj.metadata === 'object' && obj.metadata !== null && !Array.isArray(obj.metadata)
        ? (obj.metadata as Record<string, unknown>)
        : undefined;
    if (metadata && Object.keys(metadata).length > 0) {
      return { action: 'set_metadata', metadata };
    }
    return undefined;
  }

  return undefined;
}

function parseCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === 'string');
}

export function parseJustificationRating(raw: unknown): JustificationStrength | undefined {
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.toLowerCase().trim();
  if (['weak', 'poor', 'insufficient', 'inadequate'].includes(normalized)) return 'weak';
  if (['ok', 'okay', 'adequate', 'acceptable', 'moderate', 'fair'].includes(normalized)) return 'ok';
  if (['strong', 'good', 'compelling', 'robust', 'solid', 'convincing'].includes(normalized)) return 'strong';
  return undefined;
}

function parseAuditFinding(raw: unknown, index: number): AuditFinding | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const severity = obj.severity;
  if (
    severity !== 'critical'
    && severity !== 'warning'
    && severity !== 'suggestion'
    && severity !== 'info'
  ) {
    return null;
  }

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title) return null;

  const locationParsed = AuditLocationSchema.safeParse(obj.location);
  const location = locationParsed.success ? locationParsed.data : undefined;
  const proposedChange = normalizeProposedChange(obj.proposedChange, location);

  let actionable = obj.actionable === true;
  if (actionable && (!proposedChange || proposedChange.action === 'none')) {
    actionable = false;
  }

  const id =
    typeof obj.id === 'string' && obj.id.trim().length > 0 ? obj.id.trim() : `finding-${index + 1}`;

  let suggestedWording =
    typeof obj.suggestedWording === 'string' && obj.suggestedWording.trim()
      ? obj.suggestedWording.trim()
      : undefined;
  if (!suggestedWording && proposedChange?.action === 'update_block' && proposedChange.content?.text) {
    suggestedWording = String(proposedChange.content.text);
  }
  if (!suggestedWording && proposedChange?.action === 'update_table_cell') {
    suggestedWording = proposedChange.value;
  }

  return {
    id,
    severity,
    categories: parseCategories(obj.categories),
    title,
    description: typeof obj.description === 'string' ? obj.description : '',
    location,
    actionable,
    proposedChange: proposedChange ?? undefined,
    justificationRating: parseJustificationRating(obj.justificationRating),
    justificationRationale:
      typeof obj.justificationRationale === 'string' ? obj.justificationRationale : undefined,
    suggestedWording,
  };
}

export const AuditFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'warning', 'suggestion', 'info']),
  categories: z
    .union([z.array(z.string()), z.null()])
    .optional()
    .transform((v) => v ?? [])
    .default([]),
  title: z.string(),
  description: z.string(),
  location: AuditLocationSchema.optional(),
  actionable: z.boolean(),
  proposedChange: z.custom<ProposedChange | undefined>().optional(),
  justificationRating: z.enum(['weak', 'ok', 'strong']).optional(),
  justificationRationale: z.string().optional(),
  suggestedWording: z.string().optional(),
});

export const AuditResultSchema = z.object({
  summary: z.string(),
  strengths: z
    .union([z.array(z.string()), z.null()])
    .optional()
    .transform((v) => v ?? [])
    .default([]),
  findings: z
    .union([z.array(z.unknown()), z.null()])
    .optional()
    .transform((v) => v ?? [])
    .pipe(
      z.array(z.unknown()).transform((items) =>
        items.flatMap((item, index) => {
          const finding = parseAuditFinding(item, index);
          return finding ? [finding] : [];
        }),
      ),
    ),
});

export type ProposedChange = z.infer<typeof ProposedChangeSchema>;
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;

export interface AuditOptions {
  prompt: string;
  criteria: AuditCriterionId[];
  linkedWordFilename?: string;
  thoroughness?: 'standard' | 'thorough';
  reviewJustifications?: boolean;
}

export function extractBlockPreview(block: Block): string {
  switch (block.type) {
    case 'heading':
      return block.content.text;
    case 'paragraph':
      return block.content.text;
    case 'quote':
      return block.content.text;
    case 'code':
      return block.content.code;
    case 'equation':
      return block.content.latex;
    case 'bulletList':
    case 'numberedList':
    case 'checklist':
      return block.content.items.map((i) => i.text).join('; ');
    case 'figure':
      return block.content.caption || '[Figure]';
    case 'table':
      return block.content.caption || `[Table ${block.content.rows.length}x${block.content.columns.length}]`;
    default:
      return `[${block.type}]`;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function serializeDocumentForAudit(document: Document, styles: Style[] = []): string {
  const formattingAnalysis = analyzeFormattingConsistency(document, styles);

  const compact = {
    metadata: {
      title: document.metadata.title,
      description: document.metadata.description,
      author: document.metadata.author,
    },
    formattingAnalysis: {
      detectedInconsistencies: formattingAnalysis.inconsistencies,
      figureProfiles: formattingAnalysis.figureSummary,
      tableProfiles: formattingAnalysis.tableSummary,
      sectionStructures: formattingAnalysis.sectionStructures,
    },
    sections: document.sections.map((section) => ({
      id: section.id,
      title: section.title,
      blocks: section.blocks
        .filter((b) => b.properties.visible)
        .map((block) => ({
          id: block.id,
          type: block.type,
          styleId: block.styleId,
          formatting: serializeBlockFormatting(block, styles),
          preview: truncate(extractBlockPreview(block), 500),
          content:
            block.type === 'bulletList' || block.type === 'numberedList' || block.type === 'checklist'
              ? { items: block.content.items.map((item) => ({ id: item.id, text: item.text })) }
              : block.type === 'figure'
                ? {
                    caption: block.content.caption,
                    captionPosition: block.content.captionPosition,
                    alignment: block.content.alignment,
                    figureNumbering: block.content.figureNumbering,
                  }
                : block.type === 'table'
                  ? {
                      caption: block.content.caption,
                      headerRow: block.content.headerRow,
                      bandedRows: block.content.bandedRows,
                      borders: block.content.borders,
                      columnCount: block.content.columns.length,
                      rowCount: block.content.rows.length,
                      cells: block.content.cells.map((c) => ({
                        row: c.row,
                        col: c.col,
                        value: truncate(c.value, 300),
                      })),
                    }
                  : block.content,
        })),
    })),
  };
  return JSON.stringify(compact);
}
