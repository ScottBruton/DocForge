import { useSettingsStore } from '@/stores';
import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';
import { isOpenAIKeyFromEnv } from '@/lib/env';

export function AiSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const keyFromEnv = isOpenAIKeyFromEnv();

  useEffect(() => {
    if (keyFromEnv) return;
    invoke<{ key: string | null }>('get_api_key')
      .then((r) => {
        if (r.key) updateSettings({ openaiApiKey: r.key });
      })
      .catch(() => {});
  }, [keyFromEnv, updateSettings]);

  const handleSaveKey = async () => {
    if (keyFromEnv) return;
    await invoke('store_api_key', { key: settings.openaiApiKey });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-200">AI</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Configure OpenAI settings for document generation and AI actions.
        </p>
      </div>

      <label className="block text-xs text-zinc-400">
        OpenAI API Key
        <input
          type="password"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm disabled:opacity-60"
          value={settings.openaiApiKey}
          onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
          onBlur={handleSaveKey}
          disabled={keyFromEnv}
          placeholder={keyFromEnv ? 'Loaded from .env' : 'sk-...'}
        />
        {keyFromEnv ? (
          <span className="mt-1 block text-[10px] text-green-500">
            Using VITE_OPENAI_API_KEY from .env
          </span>
        ) : (
          <span className="mt-1 block text-[10px] text-zinc-600">
            Or set VITE_OPENAI_API_KEY in a .env file at the project root
          </span>
        )}
      </label>

      <label className="block text-xs text-zinc-400">
        Default Model
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          value={settings.defaultModel}
          onChange={(e) => updateSettings({ defaultModel: e.target.value })}
        />
      </label>

      <label className="block text-xs text-zinc-400">
        Vision Model
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          value={settings.visionModel}
          onChange={(e) => updateSettings({ visionModel: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-zinc-400">
          Temperature
          <input
            type="number"
            step={0.1}
            min={0}
            max={2}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            value={settings.temperature}
            onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Max Tokens
          <input
            type="number"
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            value={settings.maxTokens}
            onChange={(e) => updateSettings({ maxTokens: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="block text-xs text-zinc-400">
        API Base URL
        <input
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          value={settings.apiBaseUrl}
          onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
        />
      </label>
    </div>
  );
}
