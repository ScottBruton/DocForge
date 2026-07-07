import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod';
import type { Document } from '@/schema';
import { TEST_DOCUMENT_SPEC, TEST_ASSETS_DIR } from '@/test/fixtures/testDocument';

const AiVerificationSchema = z.object({
  passes: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()),
  summary: z.string(),
  figuresVerified: z.object({
    sunImage: z.boolean(),
    lineGraph: z.boolean(),
  }).optional(),
});

export type AiVerificationResult = z.infer<typeof AiVerificationSchema>;

function loadApiKey(): string | null {
  const key = process.env.VITE_OPENAI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

async function imageToBase64(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return buf.toString('base64');
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

/** Summarise document JSON for AI (strip ids, keep content). */
export function summariseDocumentForAi(document: Document): object {
  return {
    metadata: document.metadata,
    sections: document.sections.map((s) => ({
      title: s.title,
      order: s.order,
      blocks: s.blocks.map((b) => ({
        type: b.type,
        styleId: b.styleId,
        content: b.content,
        properties: {
          visible: b.properties.visible,
          spacingBefore: b.properties.spacingBefore,
          spacingAfter: b.properties.spacingAfter,
        },
      })),
    })),
  };
}

export async function verifyDocumentWithOpenAI(
  document: Document,
  stylesJson: object,
): Promise<AiVerificationResult> {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY not set in .env — skipping AI verification');
  }

  const client = new OpenAI({ apiKey });
  const summary = summariseDocumentForAi(document);

  const imageJpg = path.join(TEST_ASSETS_DIR, 'image.jpg');
  const graphPng = path.join(TEST_ASSETS_DIR, 'graph.png');
  const [jpgB64, pngB64] = await Promise.all([
    imageToBase64(imageJpg),
    imageToBase64(graphPng),
  ]);

  const systemPrompt = `You are a QA verifier for DocForge, a structured document editor.
You receive:
1) The EXPECTED document specification (what the test intended to build)
2) The ACTUAL document JSON summary
3) The styles.json content
4) Two reference images that should be embedded as figures

Respond ONLY with JSON matching this schema:
{
  "passes": boolean,
  "score": number (0-100),
  "issues": string[],
  "summary": string,
  "figuresVerified": { "sunImage": boolean, "lineGraph": boolean }
}

Set passes=true only if the actual document matches the expected structure, content, styles references, table data, figure captions, and the images match their described content (sun illustration and 2011-2018 line graph).`;

  const userText = `EXPECTED SPEC:
${JSON.stringify(TEST_DOCUMENT_SPEC, null, 2)}

ACTUAL DOCUMENT:
${JSON.stringify(summary, null, 2)}

STYLES (excerpt — verify styleIds exist and categories cover heading/body/table/caption/quote/code/list):
${JSON.stringify({ styleCount: (stylesJson as { styles?: unknown[] }).styles?.length, names: (stylesJson as { styles?: { name: string; category: string }[] }).styles?.map((s) => `${s.name} (${s.category})`) }, null, 2)}

Verify the document is correctly implemented. The two attached images are the figure assets (sun and line graph).`;

  const response = await client.chat.completions.create({
    model: process.env.VITE_OPENAI_DEFAULT_MODEL?.trim() || 'gpt-4o',
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeFor('image.jpg')};base64,${jpgB64}`, detail: 'low' },
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeFor('graph.png')};base64,${pngB64}`, detail: 'low' },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as unknown;
  const result = AiVerificationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`AI returned invalid verification JSON: ${result.error.message}\nRaw: ${raw}`);
  }
  return result.data;
}

export function hasOpenAIApiKey(): boolean {
  return loadApiKey() !== null;
}
