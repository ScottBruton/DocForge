import { useDocumentStore, useProjectStore, useUIStore, useAIStore } from '@/stores';
import { ProjectService } from '@/services/ProjectService';
import { WordService } from '@/services/word/WordService';
import { WordImportService } from '@/services/word/WordImportService';
import { PreviewSyncService } from '@/services/preview/PreviewSyncService';
import { PreviewWindowService } from '@/services/preview/PreviewWindowService';
import { useAssetStore } from '@/stores/assetStore';
import { useStyleStore } from '@/stores/styleStore';
import {
  FilePlus, FolderOpen, Save, Download, Sparkles, CheckCircle, Settings, Palette,
  FileInput, FileType, RefreshCw, Eye,
} from 'lucide-react';
import { useState } from 'react';

export function Toolbar() {
  const isDirty = useDocumentStore((s) => s.isDirty);
  const isSaving = useProjectStore((s) => s.isSaving);
  const isLoading = useProjectStore((s) => s.isLoading);
  const projectPath = useProjectStore((s) => s.projectPath);
  const linkedWord = useProjectStore((s) => s.linkedWordDocument);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setValidationOpen = useUIStore((s) => s.setValidationOpen);
  const setStyleManagerOpen = useUIStore((s) => s.setStyleManagerOpen);
  const setProjectTemplateOpen = useUIStore((s) => s.setProjectTemplateOpen);
  const setModalOpen = useAIStore((s) => s.setModalOpen);
  const previewOpen = useUIStore((s) => s.previewOpen);
  const previewDetached = useUIStore((s) => s.previewDetached);
  const togglePreview = useUIStore((s) => s.togglePreview);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  const handleImportWord = async () => {
    setSyncMessage(null);
    await WordImportService.importWordDocument();
  };

  const handleUpdateWord = async () => {
    if (!projectPath) return;
    setSyncMessage(null);
    const document = useDocumentStore.getState().document;
    const styles = useStyleStore.getState().stylesFile;
    const assets = useAssetStore.getState().assets;
    const result = await WordService.pushToLinkedWord(document, styles, assets, projectPath);
    setSyncMessage(result.success ? 'Word document updated' : result.message);
    if (result.success) {
      const linked = await import('@tauri-apps/api/core').then((m) =>
        m.invoke<{ word_path: string; imported_at: string; last_synced_at?: string; original_filename: string } | null>(
          'get_linked_word_document',
          { projectPath },
        ),
      );
      useProjectStore.getState().setLinkedWordDocument(linked);
    }
  };

  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-900/80 px-2">
      <span className="mr-3 text-sm font-semibold text-zinc-200">DocForge</span>
      <ToolbarButton icon={<FilePlus size={14} />} label="New" onClick={() => ProjectService.createNew()} shortcut="Ctrl+N" />
      <ToolbarButton icon={<FolderOpen size={14} />} label="Open" onClick={() => ProjectService.open()} shortcut="Ctrl+O" />
      <ToolbarButton icon={<FileInput size={14} />} label="Import Word" onClick={handleImportWord} loading={isLoading} />
      <ToolbarButton icon={<Save size={14} />} label="Save" onClick={() => ProjectService.save()} shortcut="Ctrl+S" active={isDirty} loading={isSaving} />
      <div className="mx-1 h-4 w-px bg-zinc-700" />
      <ToolbarButton
        icon={<Eye size={14} />}
        label="Preview"
        onClick={() => {
          if (previewDetached) {
            void PreviewWindowService.openDetached();
            return;
          }
          const willOpen = !previewOpen;
          togglePreview();
          if (willOpen) void PreviewSyncService.emitUpdate();
        }}
        active={previewOpen || previewDetached}
        title={previewDetached ? 'Preview open in separate window' : 'Toggle live preview panel'}
      />
      <div className="mx-1 h-4 w-px bg-zinc-700" />
      <ToolbarButton icon={<Download size={14} />} label="Export DOCX" onClick={handleExportDocx} />
      <ToolbarButton icon={<Download size={14} />} label="Export JSON" onClick={() => ProjectService.exportJson()} />
      {linkedWord && (
        <ToolbarButton
          icon={<RefreshCw size={14} />}
          label="Update Word"
          onClick={handleUpdateWord}
          accent
          title={`Push changes to ${linkedWord.original_filename}`}
        />
      )}
      <div className="mx-1 h-4 w-px bg-zinc-700" />
      <ToolbarButton icon={<Sparkles size={14} />} label="Generate AI" onClick={() => setModalOpen(true)} shortcut="Ctrl+G" accent />
      <ToolbarButton icon={<CheckCircle size={14} />} label="Validate" onClick={() => setValidationOpen(true)} />
      <div className="flex-1" />
      {syncMessage && <span className="mr-2 text-[10px] text-green-400">{syncMessage}</span>}
      <ToolbarButton icon={<FileType size={14} />} label="Template" onClick={() => setProjectTemplateOpen(true)} />
      <ToolbarButton icon={<Palette size={14} />} label="Styles" onClick={() => setStyleManagerOpen(true)} />
      <ToolbarButton icon={<Settings size={14} />} label="Preferences" onClick={() => setSettingsOpen(true)} />
    </header>
  );
}

function ToolbarButton({
  icon, label, onClick, shortcut, active, loading, accent, title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  active?: boolean;
  loading?: boolean;
  accent?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? (shortcut ? `${label} (${shortcut})` : label)}
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
        accent
          ? 'text-violet-300 hover:bg-violet-900/40'
          : active
            ? 'text-amber-300 hover:bg-zinc-800'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
