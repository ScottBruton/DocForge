import { create } from 'zustand';
import { getEnvOpenAIApiKey } from '@/lib/env';
import { loadPersistedSettings, persistSettings } from '@/lib/settingsPersistence';

export interface AppSettings {
  openaiApiKey: string;
  defaultModel: string;
  visionModel: string;
  temperature: number;
  maxTokens: number;
  apiBaseUrl: string;
  autosaveEnabled: boolean;
  autosaveIntervalMs: number;
  defaultProjectLocation: string;
}

const defaultSettings: AppSettings = {
  openaiApiKey: getEnvOpenAIApiKey(),
  defaultModel: 'gpt-4o',
  visionModel: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  apiBaseUrl: 'https://api.openai.com/v1',
  autosaveEnabled: true,
  autosaveIntervalMs: 2000,
  defaultProjectLocation: '',
};

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: { ...defaultSettings, ...loadPersistedSettings() },
  updateSettings: (updates) =>
    set((s) => {
      const settings = { ...s.settings, ...updates };
      persistSettings(settings);
      return { settings };
    }),
  resetSettings: () => {
    persistSettings(defaultSettings);
    set({ settings: { ...defaultSettings } });
  },
}));
