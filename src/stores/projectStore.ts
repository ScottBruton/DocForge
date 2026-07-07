import { create } from 'zustand';

export interface LinkedWordDocumentInfo {
  word_path: string;
  imported_at: string;
  last_synced_at?: string | null;
  original_filename: string;
}

export interface ProjectTemplateInfo {
  filename: string;
  local_path: string;
  uploaded_at: string;
}

interface ProjectStore {
  projectPath: string | null;
  projectName: string;
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  recentProjects: Array<{ path: string; openedAt: string }>;
  error: string | null;
  linkedWordDocument: LinkedWordDocumentInfo | null;
  projectTemplate: ProjectTemplateInfo | null;
  setProjectPath: (path: string | null) => void;
  setProjectName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSavedAt: (at: string | null) => void;
  setRecentProjects: (projects: Array<{ path: string; openedAt: string }>) => void;
  setError: (error: string | null) => void;
  setLinkedWordDocument: (doc: LinkedWordDocumentInfo | null) => void;
  setProjectTemplate: (template: ProjectTemplateInfo | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectPath: null,
  projectName: 'Untitled',
  isLoading: false,
  isSaving: false,
  lastSavedAt: null,
  recentProjects: [],
  error: null,
  linkedWordDocument: null,
  projectTemplate: null,
  setProjectPath: (projectPath) => set({ projectPath }),
  setProjectName: (projectName) => set({ projectName }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setRecentProjects: (recentProjects) => set({ recentProjects }),
  setError: (error) => set({ error }),
  setLinkedWordDocument: (linkedWordDocument) => set({ linkedWordDocument }),
  setProjectTemplate: (projectTemplate) => set({ projectTemplate }),
}));
