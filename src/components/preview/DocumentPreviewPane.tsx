import { ExternalLink, Eye, EyeOff, LayoutPanelLeft, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAssetStore, useDocumentStore, useUIStore } from '@/stores';
import { DocumentPreviewContent } from '@/components/preview/DocumentPreviewContent';
import { PreviewSyncService } from '@/services/preview/PreviewSyncService';
import { PreviewWindowService } from '@/services/preview/PreviewWindowService';
import type { PreviewMode, PreviewPayload } from '@/services/preview/previewTypes';
import { usePreviewSyncDetached } from '@/hooks/usePreviewSync';

interface DocumentPreviewPaneProps {
  detached?: boolean;
}

export function DocumentPreviewPane({ detached = false }: DocumentPreviewPaneProps) {
  const previewMode = useUIStore((s) => s.previewMode);
  const setPreviewMode = useUIStore((s) => s.setPreviewMode);
  const setPreviewOpen = useUIStore((s) => s.setPreviewOpen);
  const setPreviewDetached = useUIStore((s) => s.setPreviewDetached);

  const storeDocument = useDocumentStore((s) => s.document);
  const storeAssets = useAssetStore((s) => s.assets);

  const [remotePayload, setRemotePayload] = useState<PreviewPayload | null>(null);

  usePreviewSyncDetached(
    useCallback((payload) => setRemotePayload(payload), []),
    useCallback((mode) => setPreviewMode(mode), [setPreviewMode]),
  );

  const mode = detached ? (remotePayload?.mode ?? previewMode) : previewMode;
  const document = detached ? (remotePayload?.document ?? storeDocument) : storeDocument;
  const assets = detached ? (remotePayload?.assets ?? storeAssets) : storeAssets;

  const setMode = useCallback(
    async (next: PreviewMode) => {
      setPreviewMode(next);
      if (detached) {
        setRemotePayload((prev) => (prev ? { ...prev, mode: next } : prev));
        await PreviewSyncService.emitMode(next);
      } else {
        await PreviewSyncService.emitUpdate(next);
      }
    },
    [detached, setPreviewMode],
  );

  useEffect(() => {
    if (!detached && useUIStore.getState().previewOpen) {
      void PreviewSyncService.emitUpdate();
    }
  }, [detached]);

  const handleDetach = async () => {
    setPreviewDetached(true);
    await PreviewWindowService.openDetached();
    await PreviewSyncService.emitUpdate();
  };

  const handleDock = async () => {
    await PreviewWindowService.dockDetached();
  };

  const handleClose = async () => {
    if (detached) {
      await PreviewWindowService.closeDetached();
      return;
    }
    setPreviewOpen(false);
    if (useUIStore.getState().previewDetached) {
      await PreviewWindowService.closeDetached();
      setPreviewDetached(false);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-zinc-950">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-zinc-800 px-2">
        <Eye size={14} className="text-zinc-500" />
        <span className="text-xs font-medium text-zinc-300">Preview</span>
        <div className="ml-2 flex rounded border border-zinc-700 p-0.5">
          <ModeButton active={mode === 'word'} onClick={() => void setMode('word')}>
            Word
          </ModeButton>
          <ModeButton active={mode === 'pdf'} onClick={() => void setMode('pdf')}>
            PDF
          </ModeButton>
        </div>
        <div className="flex-1" />
        {detached ? (
          <PreviewToolbarButton
            icon={<LayoutPanelLeft size={14} />}
            title="Dock preview into main window"
            onClick={() => void handleDock()}
          />
        ) : (
          <PreviewToolbarButton
            icon={<ExternalLink size={14} />}
            title="Open preview in separate window"
            onClick={() => void handleDetach()}
          />
        )}
        <PreviewToolbarButton
          icon={detached ? <X size={14} /> : <EyeOff size={14} />}
          title={detached ? 'Close preview window' : 'Hide preview panel'}
          onClick={() => void handleClose()}
        />
      </div>
      <div className="min-h-0 flex-1">
        <DocumentPreviewContent document={document} assets={assets} mode={mode} />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
        active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function PreviewToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
    >
      {icon}
    </button>
  );
}

export function DetachedPreviewShell() {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <DocumentPreviewPane detached />
    </div>
  );
}
