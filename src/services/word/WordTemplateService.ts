import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useStyleStore } from '@/stores/styleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDocumentStore } from '@/stores/documentStore';
import { parseDocxStylesXml, mergeWordStylesIntoDocForge } from '@/services/word/docxStyleParser';
import { ProjectService } from '@/services/ProjectService';

export class WordTemplateService {
  static async uploadProjectTemplate(): Promise<boolean> {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) {
      useProjectStore.getState().setError('Open or create a project before uploading a template');
      return false;
    }

    const sourcePath = await open({
      multiple: false,
      title: 'Upload Document Template',
      filters: [{ name: 'Word Template', extensions: ['docx'] }],
    });

    if (!sourcePath || typeof sourcePath !== 'string') return false;

    useProjectStore.getState().setError(null);

    try {
      const info = await invoke<{
        id: string;
        filename: string;
        local_path: string;
        uploaded_at: string;
        source_hash: string;
      }>('upload_project_template', {
        projectPath,
        sourcePath,
      });

      const stylesXml = await invoke<string>('extract_docx_styles_xml', {
        sourcePath: info.local_path,
      });
      const extracted = parseDocxStylesXml(stylesXml);
      const current = useStyleStore.getState().stylesFile;
      const { stylesFile, mappings } = mergeWordStylesIntoDocForge(extracted, current);

      useStyleStore.getState().setStylesFile(stylesFile);

      await invoke('save_style_mappings', {
        projectPath,
        mappings: mappings.map((m) => ({
          word_style_id: m.wordStyleId,
          word_style_name: m.wordStyleName,
          docforge_style_id: m.docforgeStyleId,
          extracted_json: m.extractedJson,
        })),
      });

      useDocumentStore.getState().dispatch({
        type: 'SET_METADATA',
        metadata: {
          templateId: 'uploaded-template',
          description: `Using template: ${info.filename}`,
        },
      }, true);

      useProjectStore.getState().setProjectTemplate({
        filename: info.filename,
        local_path: info.local_path,
        uploaded_at: info.uploaded_at,
      });

      await ProjectService.saveToPath(projectPath);
      return true;
    } catch (e) {
      useProjectStore.getState().setError(String(e));
      return false;
    }
  }

  static async getTemplateInfo() {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) return null;
    return invoke<{ filename: string; local_path: string; uploaded_at: string } | null>(
      'get_project_template',
      { projectPath },
    );
  }
}
