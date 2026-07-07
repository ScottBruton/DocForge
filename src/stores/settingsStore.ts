import { create } from 'zustand';
import { getEnvOpenAIApiKey } from '@/lib/env';
import { loadPersistedSettings, persistSettings } from '@/lib/settingsPersistence';
import {
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  migrateModelSettings,
} from '@/lib/openaiModels';

function loadSettings(): AppSettings {
  const persisted = loadPersistedSettings();
  const migrated = migrateModelSettings(persisted);
  const settings = { ...defaultSettings, ...persisted, ...migrated };
  if (migrated.defaultModel || migrated.visionModel) {
    persistSettings(settings);
  }
  return settings;
}

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
  defaultModel: DEFAULT_TEXT_MODEL,
  visionModel: DEFAULT_VISION_MODEL,
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
  settings: loadSettings(),
  updateSettings: (updates) =>
    set((s) => {
      const migrated = migrateModelSettings(updates);
      const settings = { ...s.settings, ...updates, ...migrated };
      persistSettings(settings);
      return { settings };
    }),
  resetSettings: () => {
    persistSettings(defaultSettings);
    set({ settings: { ...defaultSettings } });
  },
}));
