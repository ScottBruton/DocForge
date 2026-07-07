import { useSettingsStore } from '@/stores';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen } from 'lucide-react';

export function LocationsSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const browseDefaultLocation = async () => {
    const picked = await open({
      directory: true,
      multiple: false,
      title: 'Choose default project location',
      defaultPath: settings.defaultProjectLocation || undefined,
    });
    if (picked && typeof picked === 'string') {
      updateSettings({ defaultProjectLocation: picked });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-200">Locations</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Set where new and existing projects open by default. Open, New, Save As, and Word import
          will start in this folder.
        </p>
      </div>

      <label className="block text-xs text-zinc-400">
        Default project location
        <div className="mt-1 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-300"
            value={settings.defaultProjectLocation}
            onChange={(e) => updateSettings({ defaultProjectLocation: e.target.value })}
            placeholder="e.g. D:\Documents\DocForgeProjects"
          />
          <button
            type="button"
            onClick={browseDefaultLocation}
            className="flex shrink-0 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            <FolderOpen size={14} />
            Browse
          </button>
        </div>
      </label>

      {settings.defaultProjectLocation ? (
        <button
          type="button"
          className="text-xs text-zinc-500 hover:text-zinc-300"
          onClick={() => updateSettings({ defaultProjectLocation: '' })}
        >
          Clear default location
        </button>
      ) : (
        <p className="text-xs text-zinc-600">
          No default set — file dialogs will use the system default location.
        </p>
      )}
    </div>
  );
}
