import { create } from 'zustand';
import type { AuditResult } from '@/services/ai/auditTypes';

export type AuditCriterionStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export interface AuditCriterionProgress {
  id: string;
  label: string;
  status: AuditCriterionStatus;
  findingsCount?: number;
}

interface AuditStore {
  isModalOpen: boolean;
  isAuditing: boolean;
  currentStep: string;
  progressLog: string[];
  criteriaProgress: AuditCriterionProgress[];
  cancelRequested: boolean;
  lastError: string | null;
  result: AuditResult | null;
  auditWarning: string | null;
  setModalOpen: (open: boolean) => void;
  setStep: (step: string) => void;
  addLog: (message: string) => void;
  setError: (error: string | null) => void;
  setResult: (result: AuditResult | null) => void;
  setAuditWarning: (warning: string | null) => void;
  initCriteriaProgress: (items: Array<{ id: string; label: string }>) => void;
  setCriterionStatus: (id: string, status: AuditCriterionStatus, findingsCount?: number) => void;
  requestCancel: () => void;
  startAudit: () => void;
  endAudit: () => void;
  reset: () => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  isModalOpen: false,
  isAuditing: false,
  currentStep: '',
  progressLog: [],
  criteriaProgress: [],
  cancelRequested: false,
  lastError: null,
  result: null,
  auditWarning: null,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setStep: (currentStep) =>
    set((s) => ({
      currentStep,
      progressLog: [...s.progressLog, currentStep],
    })),
  addLog: (message) => set((s) => ({ progressLog: [...s.progressLog, message] })),
  setError: (lastError) => set({ lastError, isAuditing: false }),
  setResult: (result) => set({ result, lastError: null }),
  setAuditWarning: (auditWarning) => set({ auditWarning }),
  initCriteriaProgress: (items) =>
    set({
      criteriaProgress: items.map((item) => ({
        ...item,
        status: 'pending' as const,
      })),
    }),
  setCriterionStatus: (id, status, findingsCount) =>
    set((s) => ({
      criteriaProgress: s.criteriaProgress.map((item) =>
        item.id === id ? { ...item, status, findingsCount } : item,
      ),
    })),
  requestCancel: () => set({ cancelRequested: true }),
  startAudit: () =>
    set({
      isAuditing: true,
      currentStep: 'Starting audit…',
      progressLog: ['Starting audit…'],
      criteriaProgress: [],
      cancelRequested: false,
      lastError: null,
      result: null,
      auditWarning: null,
    }),
  endAudit: () => set({ isAuditing: false }),
  reset: () =>
    set({
      isAuditing: false,
      currentStep: '',
      progressLog: [],
      criteriaProgress: [],
      cancelRequested: false,
      lastError: null,
      result: null,
      auditWarning: null,
    }),
}));
