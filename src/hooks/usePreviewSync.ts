import { emit, listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useAssetStore, useDocumentStore, useStyleStore, useUIStore } from '@/stores';
import { PreviewSyncService } from '@/services/preview/PreviewSyncService';
import { PREVIEW_EVENTS, type PreviewMode } from '@/services/preview/previewTypes';
import { isPreviewRoute } from '@/services/preview/PreviewWindowService';

export function usePreviewSyncMain(): void {
  useEffect(() => {
    if (isPreviewRoute()) return undefined;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubs: Array<() => void> = [];
    const unlistenFns: Array<() => void> = [];

    const scheduleEmit = () => {
      const { previewOpen, previewDetached } = useUIStore.getState();
      if (!previewOpen && !previewDetached) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void PreviewSyncService.emitUpdate();
      }, 250);
    };

    unsubs.push(useDocumentStore.subscribe(scheduleEmit));
    unsubs.push(useStyleStore.subscribe(scheduleEmit));
    unsubs.push(useAssetStore.subscribe(scheduleEmit));

    void (async () => {
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.requestSync, () => {
          void PreviewSyncService.emitUpdate();
        }),
      );
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.mode, (event) => {
          const mode = event.payload as PreviewMode;
          if (mode === 'word' || mode === 'pdf') {
            useUIStore.getState().setPreviewMode(mode);
          }
        }),
      );
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.dock, () => {
          useUIStore.getState().setPreviewDetached(false);
          useUIStore.getState().setPreviewOpen(true);
        }),
      );
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.closed, () => {
          useUIStore.getState().setPreviewDetached(false);
        }),
      );
    })();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubs.forEach((u) => u());
      unlistenFns.forEach((u) => u());
    };
  }, []);
}

export function usePreviewSyncDetached(
  onPayload: (payload: import('@/services/preview/previewTypes').PreviewPayload) => void,
  onMode: (mode: PreviewMode) => void,
): void {
  useEffect(() => {
    if (!isPreviewRoute()) return undefined;

    const unlistenFns: Array<() => void> = [];

    void (async () => {
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.update, (event) => {
          onPayload(event.payload as import('@/services/preview/previewTypes').PreviewPayload);
        }),
      );
      unlistenFns.push(
        await listen(PREVIEW_EVENTS.mode, (event) => {
          const mode = event.payload as PreviewMode;
          if (mode === 'word' || mode === 'pdf') onMode(mode);
        }),
      );
      await emit(PREVIEW_EVENTS.requestSync);
    })();

    return () => {
      unlistenFns.forEach((u) => u());
    };
  }, [onPayload, onMode]);
}
