import { create } from 'zustand';

interface UIStore {
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  isBottomPanelCollapsed: boolean;
  isSettingsOpen: boolean;
  isValidationOpen: boolean;
  isStyleManagerOpen: boolean;
  isProjectTemplateOpen: boolean;
  searchOpen: boolean;
  treeFilter: string;
  previewOpen: boolean;
  previewDetached: boolean;
  previewMode: 'word' | 'pdf';
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setBottomPanelHeight: (h: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
  setValidationOpen: (open: boolean) => void;
  setStyleManagerOpen: (open: boolean) => void;
  setProjectTemplateOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setTreeFilter: (filter: string) => void;
  setPreviewOpen: (open: boolean) => void;
  setPreviewDetached: (detached: boolean) => void;
  setPreviewMode: (mode: 'word' | 'pdf') => void;
  togglePreview: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  leftPanelWidth: 260,
  rightPanelWidth: 300,
  bottomPanelHeight: 200,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  isBottomPanelCollapsed: true,
  isSettingsOpen: false,
  isValidationOpen: false,
  isStyleManagerOpen: false,
  isProjectTemplateOpen: false,
  searchOpen: false,
  treeFilter: '',
  previewOpen: false,
  previewDetached: false,
  previewMode: 'word',
  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
  setBottomPanelHeight: (bottomPanelHeight) => set({ bottomPanelHeight }),
  toggleLeftPanel: () => set((s) => ({ isLeftPanelCollapsed: !s.isLeftPanelCollapsed })),
  toggleRightPanel: () => set((s) => ({ isRightPanelCollapsed: !s.isRightPanelCollapsed })),
  toggleBottomPanel: () => set((s) => ({ isBottomPanelCollapsed: !s.isBottomPanelCollapsed })),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setValidationOpen: (isValidationOpen) => set({ isValidationOpen }),
  setStyleManagerOpen: (isStyleManagerOpen) => set({ isStyleManagerOpen }),
  setProjectTemplateOpen: (isProjectTemplateOpen) => set({ isProjectTemplateOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setTreeFilter: (treeFilter) => set({ treeFilter }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setPreviewDetached: (previewDetached) => set({ previewDetached }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  togglePreview: () =>
    set((s) => {
      if (s.previewDetached) return s;
      const previewOpen = !s.previewOpen;
      return { previewOpen };
    }),
}));
