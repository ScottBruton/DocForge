import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import { PREVIEW_EVENTS } from '@/services/preview/previewTypes';

const PREVIEW_LABEL = 'preview';

export class PreviewWindowService {
  static async openDetached(): Promise<void> {
    const existing = await WebviewWindow.getByLabel(PREVIEW_LABEL);
    if (existing) {
      await existing.setFocus();
      return;
    }

    const preview = new WebviewWindow(PREVIEW_LABEL, {
      url: '/?preview=1',
      title: 'DocForge — Preview',
      width: 960,
      height: 1080,
      minWidth: 420,
      minHeight: 320,
      center: true,
      resizable: true,
    });

    preview.once('tauri://destroyed', () => {
      void emit(PREVIEW_EVENTS.closed);
    });
  }

  static async closeDetached(): Promise<void> {
    const existing = await WebviewWindow.getByLabel(PREVIEW_LABEL);
    if (existing) {
      await existing.close();
    }
  }

  static async dockDetached(): Promise<void> {
    await emit(PREVIEW_EVENTS.dock);
    await PreviewWindowService.closeDetached();
  }

  static isPreviewWindow(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  static async getWindowLabel(): Promise<string> {
    return getCurrentWebviewWindow().label;
  }
}

export function isPreviewRoute(): boolean {
  return PreviewWindowService.isPreviewWindow();
}
