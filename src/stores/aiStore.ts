import { create } from 'zustand';

export type AIGenerationStep =
  | 'idle'
  | 'analysing_prompt'
  | 'reading_references'
  | 'analysing_assets'
  | 'creating_outline'
  | 'generating_sections'
  | 'generating_tables'
  | 'placing_figures'
  | 'validating_json'
  | 'applying_document'
  | 'complete'
  | 'error';

interface AIStore {
  isGenerating: boolean;
  isModalOpen: boolean;
  currentStep: AIGenerationStep;
  progressLog: string[];
  lastError: string | null;
  setModalOpen: (open: boolean) => void;
  setStep: (step: AIGenerationStep) => void;
  addLog: (message: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  startGeneration: () => void;
  endGeneration: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isGenerating: false,
  isModalOpen: false,
  currentStep: 'idle',
  progressLog: [],
  lastError: null,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setStep: (currentStep) => set({ currentStep }),
  addLog: (message) => set((s) => ({ progressLog: [...s.progressLog, message] })),
  setError: (lastError) => set({ lastError, currentStep: 'error' }),
  reset: () =>
    set({
      isGenerating: false,
      currentStep: 'idle',
      progressLog: [],
      lastError: null,
    }),
  startGeneration: () =>
    set({ isGenerating: true, progressLog: [], lastError: null, currentStep: 'analysing_prompt' }),
  endGeneration: () => set({ isGenerating: false, currentStep: 'complete' }),
}));
