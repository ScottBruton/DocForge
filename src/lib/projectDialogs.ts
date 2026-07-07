import { useSettingsStore } from '@/stores/settingsStore';
import { getDefaultProjectDirectory } from '@/lib/settingsPersistence';

export function getProjectDialogDefaultPath(fallback?: string): string | undefined {
  const fromSettings = getDefaultProjectDirectory(useSettingsStore.getState().settings);
  return fromSettings ?? fallback;
}
