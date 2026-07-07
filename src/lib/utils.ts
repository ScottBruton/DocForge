import type { BlockType } from '@/schema';

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  figure: 'Figure',
  table: 'Table',
  bulletList: 'Bullet List',
  numberedList: 'Numbered List',
  checklist: 'Checklist',
  quote: 'Quote',
  equation: 'Equation',
  code: 'Code Block',
  horizontalRule: 'Horizontal Rule',
  pageBreak: 'Page Break',
};

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
