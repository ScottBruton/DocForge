import type { Document } from '@/schema';
import type { Asset } from '@/schema';
import OpenAI from 'openai';
import { validateAIOutput } from '@/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAIStore } from '@/stores/aiStore';
import type { AIGenerationStep } from '@/stores/aiStore';
import { DocumentSchema } from '@/schema';
import { resolveQualityTextModel, resolveVisionModel } from '@/lib/openaiModels';

export interface GenerationOptions {
  prompt: string;
  referenceTexts: string[];
  selectedAssetIds: string[];
  templateId: string;
  documentType: string;
  tone: string;
  detailLevel: string;
  leaveBlanks: boolean;
}

export class AIPipeline {
  private static log(step: string) {
    useAIStore.getState().addLog(step);
  }

  private static setStep(step: AIGenerationStep) {
    useAIStore.getState().setStep(step);
  }

  private static getClient(): OpenAI {
    const { settings } = useSettingsStore.getState();
    return new OpenAI({
      apiKey: settings.openaiApiKey,
      baseURL: settings.apiBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  static async generate(options: GenerationOptions, assets: Asset[]): Promise<Document | null> {
    const store = useAIStore.getState();
    store.startGeneration();

    try {
      this.setStep('analysing_prompt');
      this.log('Analysing prompt');

      const client = this.getClient();
      const { settings } = useSettingsStore.getState();

      this.setStep('reading_references');
      this.log('Reading reference documents');
      const refContext = options.referenceTexts.join('\n\n---\n\n').slice(0, 30000);

      this.setStep('analysing_assets');
      this.log('Analysing assets');
      const selectedAssets = assets.filter((a) => options.selectedAssetIds.includes(a.id));
      const assetContext = selectedAssets
        .map((a) => `Asset: ${a.filename} (${a.type}) - ${a.description}`)
        .join('\n');

      this.setStep('creating_outline');
      this.log('Creating outline');

      const systemPrompt = `You are DocForge document generator. Output ONLY valid JSON matching this schema:
${JSON.stringify(DocumentSchema.shape, null, 2)}
Block types allowed: heading, paragraph, figure, table, bulletList, numberedList, checklist, quote, equation, code, horizontalRule, pageBreak.
Each block needs: id (uuid), type, styleId (use "body" or "heading1" etc as placeholder), content, properties, metadata.
Document needs: metadata, sections (with id, title, order, collapsed, blocks), assetRefs, version.
Do NOT output markdown, HTML, or Word format.`;

      const userPrompt = `Create a document.
Type: ${options.documentType}
Tone: ${options.tone}
Detail: ${options.detailLevel}
Template: ${options.templateId}
Leave some sections blank: ${options.leaveBlanks}

User prompt:
${options.prompt}

Reference materials:
${refContext}

Available assets (use assetId in figure blocks where appropriate):
${assetContext}`;

      this.setStep('generating_sections');
      this.log('Generating sections');

      const textModel = resolveQualityTextModel(settings.defaultModel);

      const response = await client.chat.completions.create({
        model: textModel,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      this.setStep('generating_tables');
      this.log('Generating tables');
      this.setStep('placing_figures');
      this.log('Placing figures');

      this.setStep('validating_json');
      this.log('Validating JSON');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = await AIPipeline.repairJson(client, raw, 'Invalid JSON syntax');
      }

      let result = validateAIOutput(parsed);
      if (!result.success) {
        this.log('Validation failed, attempting repair...');
        const repaired = await AIPipeline.repairJson(
          client,
          raw,
          result.error.message,
        );
        try {
          parsed = JSON.parse(repaired);
        } catch {
          store.setError('AI output could not be repaired');
          return null;
        }
        result = validateAIOutput(parsed);
        if (!result.success) {
          store.setError(`Validation failed: ${result.error.message}`);
          return null;
        }
      }

      this.setStep('applying_document');
      this.log('Applying document');
      store.endGeneration();
      return result.data;
    } catch (e) {
      store.setError(String(e));
      return null;
    }
  }

  private static async repairJson(client: OpenAI, raw: string, error: string): Promise<string> {
    const { settings } = useSettingsStore.getState();
    const response = await client.chat.completions.create({
      model: resolveQualityTextModel(settings.defaultModel),
      temperature: 0.2,
      max_tokens: settings.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Fix the JSON to match DocForge document schema. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Error: ${error}\n\nJSON to fix:\n${raw}`,
        },
      ],
    });
    return response.choices[0]?.message?.content ?? raw;
  }

  static async rewriteBlock(blockJson: string, action: string): Promise<string | null> {
    const client = AIPipeline.getClient();
    const { settings } = useSettingsStore.getState();
    const response = await client.chat.completions.create({
      model: resolveQualityTextModel(settings.defaultModel),
      temperature: settings.temperature,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Modify the block JSON as requested. Return only the modified block JSON object.',
        },
        { role: 'user', content: `Action: ${action}\n\nBlock:\n${blockJson}` },
      ],
    });
    return response.choices[0]?.message?.content ?? null;
  }
}

export class ReferenceDocReader {
  static async readFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    switch (ext) {
      case 'txt':
      case 'md':
        return file.text();
      case 'csv':
        return file.text();
      case 'docx': {
        const mammoth = await import('mammoth');
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
      }
      case 'xlsx': {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        return wb.SheetNames.map((name) => {
          const sheet = wb.Sheets[name];
          return `Sheet: ${name}\n${sheet ? XLSX.utils.sheet_to_csv(sheet) : ''}`;
        }).join('\n\n');
      }
      case 'pdf':
        return `[PDF: ${file.name}] Text extraction requires server-side processing. OCR placeholder.`;
      default:
        return `[Unsupported: ${file.name}]`;
    }
  }
}
