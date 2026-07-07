import { useEffect, useCallback } from 'react';
import { useDocumentStore, useProjectStore, useSettingsStore, useUIStore, useAIStore, useSelectionStore } from '@/stores';
import { ProjectService } from '@/services/ProjectService';

export function useKeyboardShortcuts() {
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setModalOpen = useAIStore((s) => s.setModalOpen);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 's') {
      e.preventDefault();
      ProjectService.save();
    } else if (ctrl && e.key === 'o') {
      e.preventDefault();
      ProjectService.open();
    } else if (ctrl && e.key === 'n') {
      e.preventDefault();
      ProjectService.createNew();
    } else if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      redo();
    } else if (ctrl && e.key === 'f') {
      e.preventDefault();
      setSearchOpen(true);
    } else if (ctrl && e.key === 'g') {
      e.preventDefault();
      setModalOpen(true);
    } else if (ctrl && e.key === 'd') {
      e.preventDefault();
      const blockId = useSelectionStore.getState().lastSelectedBlockId;
      if (blockId) dispatch({ type: 'DUPLICATE_BLOCK', blockId });
    } else if (e.key === 'Delete') {
      const blockId = useSelectionStore.getState().lastSelectedBlockId;
      if (blockId) dispatch({ type: 'DELETE_BLOCK', blockId });
    }
  }, [undo, redo, dispatch, setSearchOpen, setModalOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useAutosave() {
  const isDirty = useDocumentStore((s) => s.isDirty);
  const projectPath = useProjectStore((s) => s.projectPath);
  const autosaveEnabled = useSettingsStore((s) => s.settings.autosaveEnabled);
  const interval = useSettingsStore((s) => s.settings.autosaveIntervalMs);

  useEffect(() => {
    if (!isDirty || !projectPath || !autosaveEnabled) return;
    const timer = setTimeout(() => {
      ProjectService.save().catch(console.error);
    }, interval);
    return () => clearTimeout(timer);
  }, [isDirty, projectPath, autosaveEnabled, interval]);
}
