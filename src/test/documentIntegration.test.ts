/**
 * @vitest-environment node
 * Integration tests use Node (not jsdom) so OpenAI SDK can run server-side with .env API key.
 */
import '@/test/loadEnv';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  TEST_DOCUMENT_SPEC,
  TEST_OUTPUT_PROJECT_DIR,
  buildFullTestProject,
  readProjectFromDisk,
  verifyDocumentStructure,
} from '@/test/fixtures/testDocument';
import { hasOpenAIApiKey, verifyDocumentWithOpenAI } from '@/test/helpers/aiVerify';

describe('document integration — create, validate, persist', () => {
  it('creates a full test document with content, styles, figures, and tables', async () => {
    const project = await buildFullTestProject();
    console.log(`\nTest project saved to: ${TEST_OUTPUT_PROJECT_DIR}\n`);

    const check = verifyDocumentStructure(project.document, project.styles, project.assets);
    expect(check.ok, check.errors.join('\n')).toBe(true);

    expect(project.document.metadata.title).toBe(TEST_DOCUMENT_SPEC.title);
    expect(project.document.sections.map((s) => s.title)).toEqual(
      TEST_DOCUMENT_SPEC.sections.map((s) => s.title),
    );

    const h1 = project.document.sections[0]?.blocks.find((b) => b.type === 'heading');
    expect(h1?.type).toBe('heading');
    if (h1?.type === 'heading') {
      expect(h1.content.text).toBe('Integration Test Report');
      expect(h1.content.level).toBe(1);
    }

    const figures = project.document.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.type === 'figure');
    expect(figures).toHaveLength(2);

    for (const filename of ['image.jpg', 'graph.png'] as const) {
      const assetPath = project.assetPaths[filename];
      expect(assetPath).toBeTruthy();
      const stat = await fs.stat(assetPath!);
      expect(stat.isFile()).toBe(true);
    }
  });

  it('persists to disk and reloads with identical structure', async () => {
    const project = await buildFullTestProject();

    const reloaded = await readProjectFromDisk(project.projectPath);
    const check = verifyDocumentStructure(reloaded.document, reloaded.styles, project.assets);
    expect(check.ok, check.errors.join('\n')).toBe(true);

    expect(reloaded.document.metadata.title).toBe(project.document.metadata.title);
    expect(reloaded.document.sections.length).toBe(project.document.sections.length);

    const docPath = path.join(project.projectPath, 'document.json');
    const stylesPath = path.join(project.projectPath, 'styles.json');
    await expect(fs.access(docPath)).resolves.toBeUndefined();
    await expect(fs.access(stylesPath)).resolves.toBeUndefined();
  });

  it('exports to DOCX without error', async () => {
    const project = await buildFullTestProject();

    const docxPath = path.join(project.projectPath, 'export.docx');
    const stat = await fs.stat(docxPath);
    expect(stat.size).toBeGreaterThan(1000);
    console.log(`DOCX export saved to: ${docxPath}`);
  });
});

describe('document integration — OpenAI verification', () => {
  it(
    'AI agrees the built document matches the expected spec (with vision on test assets)',
    async (ctx) => {
      if (!hasOpenAIApiKey()) {
        console.warn('Skipping AI test: VITE_OPENAI_API_KEY not found in .env');
        ctx.skip();
        return;
      }

      const project = await buildFullTestProject();

      const localCheck = verifyDocumentStructure(project.document, project.styles, project.assets);
      expect(localCheck.ok, localCheck.errors.join('\n')).toBe(true);

      const aiResult = await verifyDocumentWithOpenAI(project.document, project.styles);

      console.log('\n--- AI Verification Result ---');
      console.log(`Passes: ${aiResult.passes}`);
      console.log(`Score: ${aiResult.score}/100`);
      console.log(`Summary: ${aiResult.summary}`);
      if (aiResult.issues.length) console.log(`Issues: ${aiResult.issues.join('; ')}`);
      if (aiResult.figuresVerified) {
        console.log(`Figures: sun=${aiResult.figuresVerified.sunImage}, graph=${aiResult.figuresVerified.lineGraph}`);
      }
      console.log(`Test project saved to: ${TEST_OUTPUT_PROJECT_DIR}`);
      console.log('------------------------------\n');

      expect(aiResult.passes).toBe(true);
      expect(aiResult.score).toBeGreaterThanOrEqual(80);
      expect(aiResult.issues.length).toBeLessThanOrEqual(2);
    },
    120_000,
  );
});
