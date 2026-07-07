import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useProjectStore, useDocumentStore, useWordImportStore } from '@/stores';
import { ProjectService } from '@/services/ProjectService';
import { WordImportService } from '@/services/word/WordImportService';
import { WordService } from '@/services/word/WordService';
import { useAssetStore } from '@/stores/assetStore';
import { useStyleStore } from '@/stores/styleStore';

function projectDisplayName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() ?? path;
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<'file' | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const projectPath = useProjectStore((s) => s.projectPath);
  const linkedWord = useProjectStore((s) => s.linkedWordDocument);
  const isImporting = useWordImportStore((s) => s.isImporting);

  const closeMenus = useCallback(() => {
    setOpenMenu(null);
    setRecentOpen(false);
  }, []);

  const openFileMenu = useCallback(async () => {
    setOpenMenu('file');
    await ProjectService.loadRecent().catch(() => {});
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        closeMenus();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenus]);

  const runAndClose = (action: () => void | Promise<void>) => {
    closeMenus();
    void action();
  };

  const handleExportDocx = async () => {
    const document = useDocumentStore.getState().document;
    const styles = useStyleStore.getState().stylesFile;
    const assets = useAssetStore.getState().assets;
    const blob = await WordService.exportDocx(document, styles, assets);
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.metadata.title || 'document'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={barRef}
      className="flex h-7 shrink-0 items-center border-b border-zinc-800 bg-zinc-950 px-2 text-xs select-none"
    >
      <div className="relative">
        <button
          type="button"
          className={`rounded px-2 py-0.5 ${
            openMenu === 'file'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
          onClick={() => (openMenu === 'file' ? closeMenus() : void openFileMenu())}
          onMouseEnter={() => {
            if (openMenu) void openFileMenu();
          }}
        >
          File
        </button>

        {openMenu === 'file' && (
          <div
            className="absolute left-0 top-full z-50 mt-0.5 min-w-[220px] rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
            role="menu"
          >
            <MenuItem label="New Project" shortcut="Ctrl+N" onClick={() => runAndClose(() => ProjectService.createNew())} />
            <MenuItem label="Open Project…" shortcut="Ctrl+O" onClick={() => runAndClose(() => ProjectService.open())} />
            <MenuSeparator />
            <MenuItem
              label="Save"
              shortcut="Ctrl+S"
              onClick={() => runAndClose(() => ProjectService.save())}
            />
            <MenuItem label="Save As…" onClick={() => runAndClose(() => ProjectService.saveAs())} />
            <MenuSeparator />
            <MenuItem
              label="Import Word…"
              disabled={isImporting}
              onClick={() => runAndClose(() => { void WordImportService.importWordDocument(); })}
            />
            {linkedWord && (
              <MenuItem
                label="Refresh Content from Word"
                disabled={isImporting}
                onClick={() => runAndClose(() => { void WordImportService.refreshWordContent(); })}
              />
            )}
            <MenuItem label="Export DOCX…" onClick={() => runAndClose(handleExportDocx)} />
            <MenuItem label="Export JSON…" onClick={() => runAndClose(() => ProjectService.exportJson())} />
            <MenuSeparator />
            <div
              className="relative"
              onMouseEnter={() => setRecentOpen(true)}
              onMouseLeave={() => setRecentOpen(false)}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                role="menuitem"
              >
                <span>Recent Projects</span>
                <ChevronRight size={14} className="text-zinc-500" />
              </button>

              {recentOpen && (
                <div
                  className="absolute left-full top-0 z-50 ml-0.5 min-w-[280px] max-w-[420px] rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
                  role="menu"
                >
                  {recentProjects.length === 0 ? (
                    <div className="px-3 py-1.5 text-zinc-500">No recent projects</div>
                  ) : (
                    recentProjects.map((project) => {
                      const isCurrent = project.path === projectPath;
                      return (
                        <button
                          key={project.path}
                          type="button"
                          title={project.path}
                          className={`flex w-full flex-col px-3 py-1.5 text-left hover:bg-zinc-800 ${
                            isCurrent ? 'text-blue-300' : 'text-zinc-200'
                          }`}
                          role="menuitem"
                          onClick={() =>
                            runAndClose(async () => {
                              await ProjectService.openPath(project.path);
                              await ProjectService.loadRecent();
                            })
                          }
                        >
                          <span className="truncate font-medium">{projectDisplayName(project.path)}</span>
                          <span className="truncate text-[10px] text-zinc-500">{project.path}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  shortcut,
  disabled,
  onClick,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left ${
        disabled
          ? 'cursor-not-allowed text-zinc-600'
          : 'text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] text-zinc-500">{shortcut}</span>}
    </button>
  );
}

function MenuSeparator() {
  return <div className="my-1 border-t border-zinc-800" role="separator" />;
}
