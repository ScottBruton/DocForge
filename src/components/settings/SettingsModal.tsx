import { useState } from 'react';
import { useUIStore } from '@/stores';
import { X, FolderOpen, Sparkles, SlidersHorizontal } from 'lucide-react';
import { LocationsSettingsPanel } from '@/components/settings/panels/LocationsSettingsPanel';
import { AiSettingsPanel } from '@/components/settings/panels/AiSettingsPanel';
import { GeneralSettingsPanel } from '@/components/settings/panels/GeneralSettingsPanel';

type SettingsSection = 'locations' | 'ai' | 'general';

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: typeof FolderOpen }> = [
  { id: 'locations', label: 'Locations', icon: FolderOpen },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
];

export function SettingsModal() {
  const isOpen = useUIStore((s) => s.isSettingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const [activeSection, setActiveSection] = useState<SettingsSection>('locations');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[min(520px,85vh)] w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
        <nav className="flex w-44 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80">
          <div className="border-b border-zinc-800 px-3 py-3">
            <h2 className="text-sm font-semibold text-zinc-200">Preferences</h2>
          </div>
          <ul className="flex-1 p-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                    activeSection === id
                      ? 'bg-blue-900/40 text-blue-200'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end border-b border-zinc-800 px-3 py-2">
            <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {activeSection === 'locations' && <LocationsSettingsPanel />}
            {activeSection === 'ai' && <AiSettingsPanel />}
            {activeSection === 'general' && <GeneralSettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
