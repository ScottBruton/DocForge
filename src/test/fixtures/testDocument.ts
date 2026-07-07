import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Document, Block, Asset } from '@/schema';
import type { StylesFile } from '@/schema';
import { createId, nowIso } from '@/lib/utils';
import { createDefaultStyles, getStyleByCategory } from '@/lib/defaultStyles';
import { validateDocument } from '@/schema';
import { validateStyles } from '@/schema';
import { ValidationService } from '@/services/ValidationService';
import { getBlockDefinition } from '@/registry/BlockRegistry';
import { WordService } from '@/services/word/WordService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '../../..');
export const TEST_ASSETS_DIR = path.join(PROJECT_ROOT, 'TestAssets');
/** Persistent integration test project — open this folder in DocForge after `npm test`. */
export const TEST_OUTPUT_PROJECT_DIR = path.join(PROJECT_ROOT, 'TestOutput', 'integration-test-document');

/** Canonical spec used by builder, assertions, and AI verification prompt. */
export const TEST_DOCUMENT_SPEC = {
  title: 'DocForge Integration Test Document',
  author: 'DocForge Test Suite',
  sections: [
    {
      title: 'Overview',
      blocks: {
        heading: { text: 'Integration Test Report', level: 1 },
        paragraph: {
          text: 'This document validates DocForge content, styling, figures, and tables.',
          alignment: 'left' as const,
        },
        bulletList: ['Schema validation passes', 'Styles are applied via styleId', 'Assets render in figures'],
      },
    },
    {
      title: 'Figures',
      blocks: {
        heading: { text: 'Visual Assets', level: 2 },
        figures: [
          {
            assetFile: 'image.jpg',
            caption: 'Figure 1: Orange and yellow sun illustration',
            alignment: 'center' as const,
            description: 'A flat cartoon sun with an orange centre and yellow pointed rays on white background',
          },
          {
            assetFile: 'graph.png',
            caption: 'Figure 2: Sample line graph (2011–2018)',
            alignment: 'center' as const,
            description: 'Teal line graph with years 2011–2018 on x-axis and values 30–70 on y-axis, peaking at 70 in 2018',
          },
        ],
      },
    },
    {
      title: 'Data',
      blocks: {
        heading: { text: 'Metrics Table', level: 2 },
        table: {
          caption: 'Table 1: Yearly test metrics',
          headers: ['Year', 'Value'],
          rows: [
            ['2012', '40'],
            ['2014', '50'],
            ['2016', '54'],
            ['2018', '70'],
          ],
        },
        quote: {
          text: 'Structured JSON is the single source of truth.',
          attribution: 'DocForge Design Principle',
        },
        code: {
          language: 'typescript',
          code: 'const doc: Document = loadProject("./test-project");',
        },
      },
    },
  ],
} as const;

export interface BuiltTestProject {
  document: Document;
  styles: StylesFile;
  assets: Asset[];
  projectPath: string;
  assetPaths: Record<string, string>;
}

function styleId(styles: StylesFile, category: Parameters<typeof getStyleByCategory>[1]): string {
  const s = getStyleByCategory(styles.styles, category);
  if (!s) throw new Error(`Missing style category: ${category}`);
  return s.id;
}

function makeBlock(
  type: Block['type'],
  style: string,
  content: Block['content'],
  properties?: Partial<Block['properties']>,
): Block {
  return {
    id: createId(),
    type,
    styleId: style,
    content,
    properties: {
      visible: true,
      locked: false,
      spacingBefore: 0,
      spacingAfter: 8,
      pageBreakBefore: false,
      keepWithNext: false,
      ...properties,
    },
    metadata: { createdAt: nowIso(), modifiedAt: nowIso(), notes: 'integration-test' },
  } as Block;
}

export function buildTestDocument(assets: Asset[]): Document {
  const styles = createDefaultStyles();
  const h1 = styleId(styles, 'heading1');
  const h2 = styleId(styles, 'heading2');
  const body = styleId(styles, 'body');
  const captionStyle = styleId(styles, 'caption');
  const tableStyle = styleId(styles, 'table');
  const quoteStyle = styleId(styles, 'quote');
  const codeStyle = styleId(styles, 'code');
  const listStyle = styleId(styles, 'list');

  const imageAsset = assets.find((a) => a.filename === 'image.jpg');
  const graphAsset = assets.find((a) => a.filename === 'graph.png');
  if (!imageAsset || !graphAsset) {
    throw new Error('Test assets image.jpg and graph.png are required');
  }

  const spec = TEST_DOCUMENT_SPEC;
  const now = nowIso();

  const overviewBlocks: Block[] = [
    makeBlock('heading', h1, {
      text: spec.sections[0].blocks.heading.text,
      level: spec.sections[0].blocks.heading.level,
      numberingEnabled: false,
      includeInToc: true,
    }),
    makeBlock('paragraph', body, {
      text: spec.sections[0].blocks.paragraph.text,
      alignment: spec.sections[0].blocks.paragraph.alignment,
      indentation: 0,
    }),
    makeBlock('bulletList', listStyle, {
      items: spec.sections[0].blocks.bulletList.map((text) => ({ id: createId(), text })),
    }),
  ];

  const figureBlocks: Block[] = [
    makeBlock('heading', h2, {
      text: spec.sections[1].blocks.heading.text,
      level: spec.sections[1].blocks.heading.level,
      numberingEnabled: false,
      includeInToc: true,
    }),
    makeBlock('figure', captionStyle, {
      assetId: imageAsset.id,
      caption: spec.sections[1].blocks.figures[0].caption,
      widthPercent: 60,
      alignment: 'center',
      wrap: 'inline',
      keepWithCaption: true,
      captionPosition: 'below',
      figureNumbering: true,
    }),
    makeBlock('figure', captionStyle, {
      assetId: graphAsset.id,
      caption: spec.sections[1].blocks.figures[1].caption,
      widthPercent: 80,
      alignment: 'center',
      wrap: 'inline',
      keepWithCaption: true,
      captionPosition: 'below',
      figureNumbering: true,
    }),
  ];

  const dataBlocks: Block[] = [
    makeBlock('heading', h2, {
      text: spec.sections[2].blocks.heading.text,
      level: spec.sections[2].blocks.heading.level,
      numberingEnabled: false,
      includeInToc: true,
    }),
    makeBlock('table', tableStyle, {
      columns: [
        { id: createId(), width: 100 },
        { id: createId(), width: 100 },
      ],
      rows: [
        { id: createId(), height: 28 },
        ...spec.sections[2].blocks.table.rows.map(() => ({ id: createId(), height: 28 })),
      ],
      cells: [
        { row: 0, col: 0, value: spec.sections[2].blocks.table.headers[0], rowSpan: 1, colSpan: 1 },
        { row: 0, col: 1, value: spec.sections[2].blocks.table.headers[1], rowSpan: 1, colSpan: 1 },
        ...spec.sections[2].blocks.table.rows.flatMap((row, ri) =>
          row.map((val, ci) => ({ row: ri + 1, col: ci, value: val, rowSpan: 1, colSpan: 1 })),
        ),
      ],
      caption: spec.sections[2].blocks.table.caption,
      headerRow: true,
      repeatHeaderRow: false,
      bandedRows: true,
      autofitMode: 'auto',
      cellPadding: 4,
      borders: true,
    }),
    makeBlock('quote', quoteStyle, {
      text: spec.sections[2].blocks.quote.text,
      attribution: spec.sections[2].blocks.quote.attribution,
    }),
    makeBlock('code', codeStyle, {
      code: spec.sections[2].blocks.code.code,
      language: spec.sections[2].blocks.code.language,
    }),
  ];

  return {
    metadata: {
      title: spec.title,
      author: spec.author,
      description: 'Automated integration test document',
      createdAt: now,
      modifiedAt: now,
      templateId: 'technical-report',
      version: '1.0.0',
    },
    sections: [
      { id: createId(), title: spec.sections[0].title, order: 0, collapsed: false, blocks: overviewBlocks },
      { id: createId(), title: spec.sections[1].title, order: 1, collapsed: false, blocks: figureBlocks },
      { id: createId(), title: spec.sections[2].title, order: 2, collapsed: false, blocks: dataBlocks },
    ],
    assetRefs: assets.map((a) => ({ id: a.id, filename: a.filename, path: a.localPath })),
    version: '1.0.0',
  };
}

export async function copyTestAssetsToProject(projectPath: string): Promise<Asset[]> {
  const assetsDir = path.join(projectPath, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  const files = ['image.jpg', 'graph.png'] as const;
  const assets: Asset[] = [];
  const now = nowIso();

  for (const filename of files) {
    const src = path.join(TEST_ASSETS_DIR, filename);
    const dest = path.join(assetsDir, filename);
    await fs.copyFile(src, dest);
    assets.push({
      id: createId(),
      filename,
      localPath: dest,
      thumbnailPath: '',
      type: 'image',
      tags: ['integration-test'],
      description: TEST_DOCUMENT_SPEC.sections[1].blocks.figures.find((f) => f.assetFile === filename)?.description ?? '',
      createdAt: now,
      modifiedAt: now,
      usageCount: 1,
      referencedBlockIds: [],
    });
  }

  return assets;
}

export async function writeProjectToDisk(
  projectPath: string,
  document: Document,
  styles: StylesFile,
): Promise<void> {
  await fs.mkdir(path.join(projectPath, 'assets'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'thumbnails'), { recursive: true });
  await fs.writeFile(path.join(projectPath, 'document.json'), JSON.stringify(document, null, 2), 'utf-8');
  await fs.writeFile(path.join(projectPath, 'styles.json'), JSON.stringify(styles, null, 2), 'utf-8');
  await fs.writeFile(
    path.join(projectPath, 'README.txt'),
    [
      'DocForge integration test output',
      '',
      'Open this folder in DocForge: File > Open Project',
      '',
      'Files:',
      '  document.json  — document content',
      '  styles.json    — global styles',
      '  assets/        — test images',
      '  export.docx    — Word export (if generated by tests)',
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n'),
    'utf-8',
  );
}

export async function readProjectFromDisk(projectPath: string): Promise<{
  document: Document;
  styles: StylesFile;
}> {
  const docRaw = await fs.readFile(path.join(projectPath, 'document.json'), 'utf-8');
  const stylesRaw = await fs.readFile(path.join(projectPath, 'styles.json'), 'utf-8');
  return {
    document: JSON.parse(docRaw) as Document,
    styles: JSON.parse(stylesRaw) as StylesFile,
  };
}

export async function prepareTestOutputProjectDir(): Promise<string> {
  await fs.rm(TEST_OUTPUT_PROJECT_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_OUTPUT_PROJECT_DIR, { recursive: true });
  return TEST_OUTPUT_PROJECT_DIR;
}

export async function createTempProjectDir(): Promise<string> {
  return prepareTestOutputProjectDir();
}

export async function removeProjectDir(projectPath: string): Promise<void> {
  await fs.rm(projectPath, { recursive: true, force: true });
}

export function verifyDocumentStructure(
  document: Document,
  styles: StylesFile,
  assets: Asset[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  const docResult = validateDocument(document);
  if (!docResult.success) errors.push(`Document schema invalid: ${docResult.error.message}`);

  const stylesResult = validateStyles(styles);
  if (!stylesResult.success) errors.push(`Styles schema invalid: ${stylesResult.error.message}`);

  const validation = ValidationService.validate(document, styles.styles, assets);
  if (validation.errorCount > 0) {
    errors.push(...validation.issues.filter((i) => i.severity === 'error').map((i) => i.message));
  }

  if (document.metadata.title !== TEST_DOCUMENT_SPEC.title) {
    errors.push(`Title mismatch: ${document.metadata.title}`);
  }
  if (document.sections.length !== 3) {
    errors.push(`Expected 3 sections, got ${document.sections.length}`);
  }

  const blockTypes = document.sections.flatMap((s) => s.blocks.map((b) => b.type));
  for (const required of ['heading', 'paragraph', 'bulletList', 'table', 'quote', 'code'] as const) {
    if (!blockTypes.includes(required)) errors.push(`Missing block type: ${required}`);
  }
  if (blockTypes.filter((t) => t === 'figure').length !== 2) {
    errors.push('Expected 2 figure blocks');
  }

  const styleIds = new Set(styles.styles.map((s) => s.id));
  for (const block of document.sections.flatMap((s) => s.blocks)) {
    if (!styleIds.has(block.styleId)) errors.push(`Invalid styleId on block ${block.id}`);
    errors.push(...getBlockDefinition(block.type).validate(block).filter((i) => i.severity === 'error').map((i) => i.message));
  }

  const table = document.sections.flatMap((s) => s.blocks).find((b) => b.type === 'table');
  if (table?.type === 'table') {
    if (table.content.caption !== TEST_DOCUMENT_SPEC.sections[2].blocks.table.caption) {
      errors.push('Table caption mismatch');
    }
    const yearCell = table.content.cells.find((c) => c.row === 0 && c.col === 0)?.value;
    const lastVal = table.content.cells.find((c) => c.row === 4 && c.col === 1)?.value;
    if (yearCell !== 'Year') errors.push('Table header Year missing');
    if (lastVal !== '70') errors.push('Table last value should be 70');
  } else {
    errors.push('Table block missing');
  }

  for (const asset of assets) {
    if (!asset.localPath) errors.push(`Asset ${asset.filename} has no path`);
  }

  return { ok: errors.length === 0, errors };
}

export async function buildFullTestProject(): Promise<BuiltTestProject> {
  const projectPath = await createTempProjectDir();
  const assets = await copyTestAssetsToProject(projectPath);
  const styles = createDefaultStyles();
  const document = buildTestDocument(assets);

  const figures = document.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'figure');
  for (const fig of figures) {
    if (fig.type !== 'figure' || !fig.content.assetId) continue;
    const asset = assets.find((a) => a.id === fig.content.assetId);
    if (asset) asset.referencedBlockIds.push(fig.id);
  }

  await writeProjectToDisk(projectPath, document, styles);

  const blob = await WordService.exportDocx(document, styles, assets);
  await fs.writeFile(path.join(projectPath, 'export.docx'), Buffer.from(await blob.arrayBuffer()));

  return {
    document,
    styles,
    assets,
    projectPath,
    assetPaths: Object.fromEntries(assets.map((a) => [a.filename, a.localPath])),
  };
}
