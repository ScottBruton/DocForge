export const DEFAULT_TEXT_MODEL = 'gpt-4o';
export const DEFAULT_VISION_MODEL = 'gpt-4o';

const LIGHTWEIGHT_MODEL_PATTERN = /mini/i;

export function isLightweightModel(model: string): boolean {
  return LIGHTWEIGHT_MODEL_PATTERN.test(model.trim());
}

export function getEnvDefaultTextModel(): string | undefined {
  const fromEnv = import.meta.env.VITE_OPENAI_DEFAULT_MODEL;
  return typeof fromEnv === 'string' && fromEnv.trim() ? fromEnv.trim() : undefined;
}

/** Use the configured model unless it is a lightweight/mini variant. */
export function resolveQualityTextModel(configured?: string): string {
  const candidate = (configured || getEnvDefaultTextModel() || DEFAULT_TEXT_MODEL).trim();
  if (!candidate || isLightweightModel(candidate)) return DEFAULT_TEXT_MODEL;
  return candidate;
}

export function resolveVisionModel(configured?: string): string {
  const candidate = (configured || DEFAULT_VISION_MODEL).trim();
  if (!candidate || isLightweightModel(candidate)) return DEFAULT_VISION_MODEL;
  return candidate;
}

export function migrateModelSettings(settings: {
  defaultModel?: string;
  visionModel?: string;
}): { defaultModel?: string; visionModel?: string } {
  const migrated: { defaultModel?: string; visionModel?: string } = {};
  if (settings.defaultModel && isLightweightModel(settings.defaultModel)) {
    migrated.defaultModel = DEFAULT_TEXT_MODEL;
  }
  if (settings.visionModel && isLightweightModel(settings.visionModel)) {
    migrated.visionModel = DEFAULT_VISION_MODEL;
  }
  return migrated;
}
