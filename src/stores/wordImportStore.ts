import { create } from 'zustand';

interface WordImportStore {
  isImporting: boolean;
  currentStep: string;
  progressLog: string[];
  cancelRequested: boolean;
  lastMessage: string | null;
  startImport: (step?: string) => void;
  setStep: (step: string) => void;
  addLog: (message: string) => void;
  requestCancel: () => void;
  endImport: (message?: string | null) => void;
  reset: () => void;
}

export const useWordImportStore = create<WordImportStore>((set) => ({
  isImporting: false,
  currentStep: '',
  progressLog: [],
  cancelRequested: false,
  lastMessage: null,

  startImport: (step = 'Starting import…') =>
    set({
      isImporting: true,
      currentStep: step,
      progressLog: [step],
      cancelRequested: false,
      lastMessage: null,
    }),

  setStep: (currentStep) =>
    set((s) => ({
      currentStep,
      progressLog: [...s.progressLog, currentStep],
    })),

  addLog: (message) =>
    set((s) => ({
      progressLog: [...s.progressLog, message],
    })),

  requestCancel: () => set({ cancelRequested: true }),

  endImport: (lastMessage = null) =>
    set({
      isImporting: false,
      cancelRequested: false,
      lastMessage,
    }),

  reset: () =>
    set({
      isImporting: false,
      currentStep: '',
      progressLog: [],
      cancelRequested: false,
      lastMessage: null,
    }),
}));
