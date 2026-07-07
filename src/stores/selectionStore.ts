import { create } from 'zustand';

export type SelectionType = 'document' | 'section' | 'block' | 'none';

interface SelectionStore {
  selectionType: SelectionType;
  selectedSectionIds: string[];
  selectedBlockIds: string[];
  lastSelectedSectionId: string | null;
  lastSelectedBlockId: string | null;
  selectSection: (sectionId: string, multi?: boolean) => void;
  selectBlock: (blockId: string, sectionId: string, multi?: boolean) => void;
  selectDocument: () => void;
  clearSelection: () => void;
  toggleSection: (sectionId: string) => void;
  toggleBlock: (blockId: string, sectionId: string) => void;
  isSectionSelected: (sectionId: string) => boolean;
  isBlockSelected: (blockId: string) => boolean;
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectionType: 'none',
  selectedSectionIds: [],
  selectedBlockIds: [],
  lastSelectedSectionId: null,
  lastSelectedBlockId: null,

  selectSection: (sectionId, multi = false) => {
    set((s) => ({
      selectionType: 'section',
      selectedSectionIds: multi
        ? s.selectedSectionIds.includes(sectionId)
          ? s.selectedSectionIds
          : [...s.selectedSectionIds, sectionId]
        : [sectionId],
      selectedBlockIds: [],
      lastSelectedSectionId: sectionId,
      lastSelectedBlockId: null,
    }));
  },

  selectBlock: (blockId, sectionId, multi = false) => {
    set((s) => ({
      selectionType: 'block',
      selectedBlockIds: multi
        ? s.selectedBlockIds.includes(blockId)
          ? s.selectedBlockIds
          : [...s.selectedBlockIds, blockId]
        : [blockId],
      selectedSectionIds: [sectionId],
      lastSelectedBlockId: blockId,
      lastSelectedSectionId: sectionId,
    }));
  },

  selectDocument: () =>
    set({
      selectionType: 'document',
      selectedSectionIds: [],
      selectedBlockIds: [],
      lastSelectedSectionId: null,
      lastSelectedBlockId: null,
    }),

  clearSelection: () =>
    set({
      selectionType: 'none',
      selectedSectionIds: [],
      selectedBlockIds: [],
      lastSelectedSectionId: null,
      lastSelectedBlockId: null,
    }),

  toggleSection: (sectionId) => {
    const { selectedSectionIds } = get();
    const next = selectedSectionIds.includes(sectionId)
      ? selectedSectionIds.filter((id) => id !== sectionId)
      : [...selectedSectionIds, sectionId];
    set({
      selectionType: next.length ? 'section' : 'none',
      selectedSectionIds: next,
      selectedBlockIds: [],
      lastSelectedSectionId: sectionId,
    });
  },

  toggleBlock: (blockId, sectionId) => {
    const { selectedBlockIds } = get();
    const next = selectedBlockIds.includes(blockId)
      ? selectedBlockIds.filter((id) => id !== blockId)
      : [...selectedBlockIds, blockId];
    set({
      selectionType: next.length ? 'block' : 'none',
      selectedBlockIds: next,
      selectedSectionIds: [sectionId],
      lastSelectedBlockId: blockId,
      lastSelectedSectionId: sectionId,
    });
  },

  isSectionSelected: (sectionId) => get().selectedSectionIds.includes(sectionId),
  isBlockSelected: (blockId) => get().selectedBlockIds.includes(blockId),
}));
