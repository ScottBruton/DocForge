import type { AppSettings } from '@/stores/settingsStore';

const SETTINGS_STORAGE_KEY = 'docforge-app-settings';

type PersistedSettings = Omit<AppSettings, 'openaiApiKey'>;

export function loadPersistedSettings(): Partial<PersistedSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return {};
  }
}

export function persistSettings(settings: AppSettings): void {
  try {
    const { openaiApiKey: _key, ...rest } = settings;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(rest));
  } catch {
    /* storage unavailable */
  }
}

export function getDefaultProjectDirectory(settings: AppSettings): string | undefined {
  const path = settings.defaultProjectLocation.trim();
  return path || undefined;
}
