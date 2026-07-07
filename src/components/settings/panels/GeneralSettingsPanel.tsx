import { useSettingsStore } from '@/stores';

export function GeneralSettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-200">General</h3>
        <p className="mt-1 text-xs text-zinc-500">Application behaviour and saving options.</p>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={settings.autosaveEnabled}
          onChange={(e) => updateSettings({ autosaveEnabled: e.target.checked })}
        />
        Autosave enabled
      </label>

      <label className="block text-xs text-zinc-400">
        Autosave interval (ms)
        <input
          type="number"
          min={500}
          step={500}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
          value={settings.autosaveIntervalMs}
          onChange={(e) => updateSettings({ autosaveIntervalMs: Number(e.target.value) })}
          disabled={!settings.autosaveEnabled}
        />
      </label>
    </div>
  );
}
