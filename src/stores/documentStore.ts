import { create } from 'zustand';
import type { Document } from '@/schema';
import { createEmptyDocument } from '@/lib/documentFactory';
import { documentReducer, type DocumentAction } from '@/services/documentReducer';

const MAX_HISTORY = 50;

interface HistoryState {
  past: Document[];
  future: Document[];
}

interface DocumentStore {
  document: Document;
  history: HistoryState;
  isDirty: boolean;
  dispatch: (action: DocumentAction, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markClean: () => void;
  reset: (document?: Document) => void;
}

function pushHistory(history: HistoryState, doc: Document): HistoryState {
  const past = [...history.past, doc].slice(-MAX_HISTORY);
  return { past, future: [] };
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: createEmptyDocument(),
  history: { past: [], future: [] },
  isDirty: false,

  dispatch: (action, skipHistory = false) => {
    const { document, history } = get();
    const next = documentReducer(document, action);
    if (next === document) return;
    set({
      document: next,
      history: skipHistory ? history : pushHistory(history, document),
      isDirty: true,
    });
  },

  undo: () => {
    const { document, history } = get();
    if (history.past.length === 0) return;
    const past = [...history.past];
    const previous = past.pop()!;
    set({
      document: previous,
      history: { past, future: [document, ...history.future] },
      isDirty: true,
    });
  },

  redo: () => {
    const { document, history } = get();
    if (history.future.length === 0) return;
    const [next, ...future] = history.future;
    if (!next) return;
    set({
      document: next,
      history: { past: [...history.past, document], future },
      isDirty: true,
    });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
  markClean: () => set({ isDirty: false }),

  reset: (document) =>
    set({
      document: document ?? createEmptyDocument(),
      history: { past: [], future: [] },
      isDirty: false,
    }),
}));
