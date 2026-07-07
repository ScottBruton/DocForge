import type { Asset, Document, StylesFile } from '@/schema';

export type PreviewMode = 'word' | 'pdf';

export interface PreviewPayload {
  document: Document;
  styles: StylesFile;
  assets: Asset[];
  mode: PreviewMode;
  revision: number;
}

export const PREVIEW_EVENTS = {
  update: 'preview://update',
  requestSync: 'preview://request-sync',
  closed: 'preview://closed',
  dock: 'preview://dock',
  mode: 'preview://mode',
} as const;
