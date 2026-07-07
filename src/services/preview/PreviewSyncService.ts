import { emit } from '@tauri-apps/api/event';
import { useAssetStore, useDocumentStore, useStyleStore, useUIStore } from '@/stores';
import type { PreviewMode, PreviewPayload } from '@/services/preview/previewTypes';
import { PREVIEW_EVENTS } from '@/services/preview/previewTypes';

export class PreviewSyncService {
  static buildPayload(mode?: PreviewMode): PreviewPayload {
    const previewMode = mode ?? useUIStore.getState().previewMode;
    return {
      document: useDocumentStore.getState().document,
      styles: useStyleStore.getState().stylesFile,
      assets: useAssetStore.getState().assets,
      mode: previewMode,
      revision: Date.now(),
    };
  }

  static async emitUpdate(mode?: PreviewMode): Promise<void> {
    const { previewOpen, previewDetached } = useUIStore.getState();
    if (!previewOpen && !previewDetached) return;
    await emit(PREVIEW_EVENTS.update, PreviewSyncService.buildPayload(mode));
  }

  static async emitMode(mode: PreviewMode): Promise<void> {
    await emit(PREVIEW_EVENTS.mode, mode);
  }
}
