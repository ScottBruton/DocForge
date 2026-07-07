import { create } from 'zustand';
import type { Style, StylesFile } from '@/schema';
import { createDefaultStyles } from '@/lib/defaultStyles';

interface StyleStore {
  stylesFile: StylesFile;
  setStylesFile: (file: StylesFile) => void;
  updateStyle: (id: string, updates: Partial<Style>) => void;
  getStyleById: (id: string) => Style | undefined;
  getStyles: () => Style[];
}

export const useStyleStore = create<StyleStore>((set, get) => ({
  stylesFile: createDefaultStyles(),

  setStylesFile: (stylesFile) => set({ stylesFile }),

  updateStyle: (id, updates) =>
    set((s) => ({
      stylesFile: {
        ...s.stylesFile,
        styles: s.stylesFile.styles.map((st) => (st.id === id ? { ...st, ...updates } : st)),
      },
    })),

  getStyleById: (id) => get().stylesFile.styles.find((s) => s.id === id),
  getStyles: () => get().stylesFile.styles,
}));
