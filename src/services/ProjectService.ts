import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { Document } from '@/schema';
import { useDocumentStore } from '@/stores/documentStore';
import { useStyleStore } from '@/stores/styleStore';
import { useProjectStore } from '@/stores/projectStore';
import { createEmptyDocument } from '@/lib/documentFactory';
import { createDefaultStyles } from '@/lib/defaultStyles';
import { getTemplateById } from '@/templates';
import { WordImportService } from '@/services/word/WordImportService';
import { getProjectDialogDefaultPath } from '@/lib/projectDialogs';

interface ProjectFiles {
  document_json: string;
  styles_json: string;
  path: string;
}

const LAST_PROJECT_KEY = 'docforge-last-project';

export class ProjectService {
  static rememberProjectPath(path: string): void {
    try {
      localStorage.setItem(LAST_PROJECT_KEY, path);
    } catch {
      /* storage unavailable */
    }
  }

  /** Open a project folder without showing the picker (used for session restore). */
  static async openPath(dir: string): Promise<void> {
    useProjectStore.getState().setLoading(true);
    try {
      const result = await invoke<ProjectFiles>('open_project', { path: dir });
      useDocumentStore.getState().reset(JSON.parse(result.document_json));
      useStyleStore.getState().setStylesFile(JSON.parse(result.styles_json));
      useProjectStore.getState().setProjectPath(result.path);
      const doc = JSON.parse(result.document_json) as Document;
      useProjectStore.getState().setProjectName(doc.metadata.title);
      useDocumentStore.getState().markClean();
      ProjectService.rememberProjectPath(result.path);
      await WordImportService.loadProjectMetadata(result.path);
      await ProjectService.loadRecent().catch(() => {});
    } finally {
      useProjectStore.getState().setLoading(false);
    }
  }

  static async restoreLastProject(): Promise<void> {
    if (useProjectStore.getState().projectPath) return;

    let lastPath: string | null = null;
    try {
      lastPath = localStorage.getItem(LAST_PROJECT_KEY);
    } catch {
      return;
    }
    if (!lastPath) return;

    try {
      await ProjectService.openPath(lastPath);
    } catch {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  }

  static async createNew(templateId = 'blank'): Promise<void> {
    const dir = await open({
      directory: true,
      multiple: false,
      title: 'Choose project folder',
      defaultPath: getProjectDialogDefaultPath(),
    });
    if (!dir || typeof dir !== 'string') return;

    const template = getTemplateById(templateId);
    const document = template?.createDocument() ?? createEmptyDocument(templateId);
    const styles = template?.styles ?? createDefaultStyles();

    const result = await invoke<ProjectFiles>('create_project', {
      path: dir,
      documentJson: JSON.stringify(document, null, 2),
      stylesJson: JSON.stringify(styles, null, 2),
    });

    useDocumentStore.getState().reset(JSON.parse(result.document_json));
    useStyleStore.getState().setStylesFile(JSON.parse(result.styles_json));
    useProjectStore.getState().setProjectPath(result.path);
    useProjectStore.getState().setProjectName(document.metadata.title);
    useDocumentStore.getState().markClean();
    ProjectService.rememberProjectPath(result.path);
    await WordImportService.loadProjectMetadata(result.path);
    await ProjectService.loadRecent().catch(() => {});
  }

  static async open(): Promise<void> {
    const dir = await open({
      directory: true,
      multiple: false,
      title: 'Open project folder',
      defaultPath: getProjectDialogDefaultPath(),
    });
    if (!dir || typeof dir !== 'string') return;
    await ProjectService.openPath(dir);
  }

  static async save(): Promise<void> {
    const path = useProjectStore.getState().projectPath;
    if (!path) {
      await ProjectService.saveAs();
      return;
    }
    await ProjectService.saveToPath(path);
  }

  static async saveAs(): Promise<void> {
    const dir = await save({
      title: 'Save project as',
      defaultPath: getProjectDialogDefaultPath('my-project'),
    });
    if (!dir) return;
    await ProjectService.saveToPath(dir);
    useProjectStore.getState().setProjectPath(dir);
    ProjectService.rememberProjectPath(dir);
    await invoke('add_recent_project', { path: dir }).catch(() => {});
    await ProjectService.loadRecent().catch(() => {});
  }

  static async saveToPath(path: string): Promise<void> {
    const document = useDocumentStore.getState().document;
    const styles = useStyleStore.getState().stylesFile;

    useProjectStore.getState().setSaving(true);
    try {
      await invoke('save_project', {
        path,
        documentJson: JSON.stringify(document, null, 2),
        stylesJson: JSON.stringify(styles, null, 2),
      });
      useDocumentStore.getState().markClean();
      useProjectStore.getState().setLastSavedAt(new Date().toISOString());
    } finally {
      useProjectStore.getState().setSaving(false);
    }
  }

  static async loadRecent(): Promise<void> {
    const recent = await invoke<Array<{ path: string; opened_at: string }>>('list_recent_projects');
    useProjectStore.getState().setRecentProjects(
      recent.map((r) => ({ path: r.path, openedAt: r.opened_at })),
    );
  }

  static exportJson(): void {
    const doc = useDocumentStore.getState().document;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.metadata.title || 'document'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
