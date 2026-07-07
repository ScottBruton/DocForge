/** OpenAI API key from project-root `.env` (Vite: must be prefixed with VITE_). */
export function getEnvOpenAIApiKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function isOpenAIKeyFromEnv(): boolean {
  return getEnvOpenAIApiKey().length > 0;
}
