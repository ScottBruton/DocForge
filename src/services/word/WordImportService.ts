import { invoke } from '@tauri-apps/api/core';
import { ask, open } from '@tauri-apps/plugin-dialog';
import type { Asset } from '@/schema';
import { useDocumentStore } from '@/stores/documentStore';
import { useStyleStore } from '@/stores/styleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAssetStore } from '@/stores/assetStore';
import { useWordImportStore } from '@/stores/wordImportStore';
import { createEmptyDocument } from '@/lib/documentFactory';
import { createDefaultStyles } from '@/lib/defaultStyles';
import { ProjectService } from '@/services/ProjectService';
import { getProjectDialogDefaultPath } from '@/lib/projectDialogs';
import { parseDocxStylesXml, mergeWordStylesIntoDocForge } from '@/services/word/docxStyleParser';
import { htmlToDocument, inferTitleFromFilename } from '@/services/word/htmlToDocument';
import { createId, nowIso } from '@/lib/utils';
import type { AssetType } from '@/schema';

interface ImportAssetBytesResult {
  filename: string;
  local_path: string;
  thumbnail_path: string;
  hash: string;
  asset_type: string;
}

export interface LinkedWordDocument {
  word_path: string;
  imported_at: string;
  last_synced_at?: string | null;
  original_filename: string;
  source_path?: string | null;
}

export class WordImportCancelledError extends Error {
  constructor() {
    super('Import cancelled');
    this.name = 'WordImportCancelledError';
  }
}

interface ImportFromDocxOptions {
  title?: string;
  linkDocument?: boolean;
}

function logStep(message: string) {
  const store = useWordImportStore.getState();
  store.setStep(message);
}

function checkCancelled() {
  if (useWordImportStore.getState().cancelRequested) {
    throw new WordImportCancelledError();
  }
}

async function persistAsset(projectPath: string, asset: Asset): Promise<void> {
  await invoke('upsert_project_asset', {
    projectPath,
    asset: {
      id: asset.id,
      filename: asset.filename,
      local_path: asset.localPath,
      thumbnail_path: asset.thumbnailPath,
      asset_type: asset.type,
      tags: JSON.stringify(asset.tags),
      description: asset.description,
      created_at: asset.createdAt,
      modified_at: asset.modifiedAt,
      usage_count: asset.usageCount,
      referenced_block_ids: JSON.stringify(asset.referencedBlockIds),
      hash: asset.hash ?? '',
    },
  });
}

async function importMediaFromDocx(projectPath: string, docxPath: string): Promise<Asset[]> {
  const results = await invoke<ImportAssetBytesResult[]>('extract_docx_media', {
    projectPath,
    sourcePath: docxPath,
  });

  const assets: Asset[] = [];
  for (const r of results) {
    checkCancelled();
    const asset: Asset = {
      id: createId(),
      filename: r.filename,
      localPath: r.local_path,
      thumbnailPath: r.thumbnail_path,
      type: r.asset_type as AssetType,
      tags: [],
      description: 'Extracted from Word document',
      createdAt: nowIso(),
      modifiedAt: nowIso(),
      usageCount: 0,
      referencedBlockIds: [],
      hash: r.hash,
    };
    await persistAsset(projectPath, asset);
    assets.push(asset);
  }
  return assets;
}

async function extractAndApplyStyles(projectPath: string, docxPath: string): Promise<void> {
  try {
    const stylesXml = await invoke<string>('extract_docx_styles_xml', { sourcePath: docxPath });
    const extracted = parseDocxStylesXml(stylesXml);
    if (extracted.length === 0) return;

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
  } catch {
    /* styles.xml may be missing in minimal docx files */
  }
}

async function convertDocxToDocument(
  projectPath: string,
  docxPath: string,
  title: string,
): Promise<ReturnType<typeof htmlToDocument>> {
  checkCancelled();
  logStep('Reading Word document…');

  const base64 = await invoke<string>('read_file_base64', { filePath: docxPath });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const arrayBuffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);

  checkCancelled();
  logStep('Converting document content…');

  const mammoth = await import('mammoth');
  const imageMap = new Map<string, string>();
  let imageIndex = 0;

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        checkCancelled();
        const buffer = await image.read();
        const ext = image.contentType.split('/')[1] ?? 'png';
        const imgFilename = `imported-image-${imageIndex}.${ext}`;
        imageIndex += 1;

        const bytes = new Uint8Array(buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
        const b64 = btoa(bin);

        const imported = await invoke<ImportAssetBytesResult>('import_asset_bytes', {
          projectPath,
          filename: imgFilename,
          base64Data: b64,
          assetType: 'image',
        });

        const asset: Asset = {
          id: createId(),
          filename: imported.filename,
          localPath: imported.local_path,
          thumbnailPath: imported.thumbnail_path,
          type: 'image',
          tags: [],
          description: 'Imported from Word inline image',
          createdAt: nowIso(),
          modifiedAt: nowIso(),
          usageCount: 0,
          referencedBlockIds: [],
          hash: imported.hash,
        };
        await persistAsset(projectPath, asset);
        useAssetStore.getState().addAsset(asset);

        const url = `docforge-asset://${asset.id}`;
        imageMap.set(url, asset.id);
        return { src: url };
      }),
    },
  );

  checkCancelled();
  const allAssets = useAssetStore.getState().assets;
  const styles = useStyleStore.getState().stylesFile.styles;

  const document = htmlToDocument(result.value, {
    styles,
    assets: allAssets,
    imageUrlToAssetId: imageMap,
  }, title);

  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (block.type === 'figure' && block.content.assetId) {
        useAssetStore.getState().incrementUsage(block.content.assetId, block.id);
      }
    }
  }

  document.metadata.title = title;
  return document;
}

async function importFromDocxPath(
  projectPath: string,
  docxPath: string,
  options: ImportFromDocxOptions = {},
): Promise<boolean> {
  const filename = docxPath.split(/[/\\]/).pop() ?? 'document.docx';
  const title = options.title ?? inferTitleFromFilename(filename);
  const linkDocument = options.linkDocument ?? true;

  useWordImportStore.getState().startImport('Preparing import…');
  useProjectStore.getState().setError(null);

  try {
    checkCancelled();
    logStep('Extracting styles…');
    await extractAndApplyStyles(projectPath, docxPath);

    checkCancelled();
    logStep('Extracting media…');
    const assets = await importMediaFromDocx(projectPath, docxPath);
    useAssetStore.getState().setAssets(assets);

    const document = await convertDocxToDocument(projectPath, docxPath, title);

    let linked: LinkedWordDocument | null = null;
    if (linkDocument) {
      checkCancelled();
      logStep('Linking Word document…');
      linked = await invoke<LinkedWordDocument>('link_word_document', {
        projectPath,
        sourcePath: docxPath,
      });
    }

    checkCancelled();
    logStep('Saving project…');
    useDocumentStore.getState().reset(document);
    useProjectStore.getState().setProjectName(title);
    if (linked) {
      useProjectStore.getState().setLinkedWordDocument(linked);
    }
    useDocumentStore.getState().markClean();

    await ProjectService.saveToPath(projectPath);
    ProjectService.rememberProjectPath(projectPath);

    useWordImportStore.getState().endImport('Import complete');
    return true;
  } catch (e) {
    if (e instanceof WordImportCancelledError) {
      useWordImportStore.getState().endImport('Import cancelled');
      useProjectStore.getState().setError('Word import cancelled');
      return false;
    }
    useWordImportStore.getState().endImport(null);
    useProjectStore.getState().setError(String(e));
    return false;
  }
}

async function resolveRefreshDocxPath(linked: LinkedWordDocument): Promise<string | null> {
  const storedPath = linked.source_path?.trim();
  if (storedPath && await invoke<boolean>('file_path_exists', { filePath: storedPath })) {
    return storedPath;
  }

  const defaultPath = storedPath || linked.word_path.replace(/[/\\][^/\\]+$/, '');
  const picked = await open({
    multiple: false,
    title: 'Select Word document to refresh from',
    defaultPath,
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });

  if (!picked || typeof picked !== 'string') return null;
  return picked;
}

async function confirmRefreshIfDirty(): Promise<boolean> {
  if (!useDocumentStore.getState().isDirty) return true;
  return ask(
    'Refreshing will replace the current document content with the latest Word file. Unsaved changes will be lost. Continue?',
    { title: 'Refresh from Word', kind: 'warning' },
  );
}

export class WordImportService {
  static async importWordDocument(): Promise<boolean> {
    const docxPath = await open({
      multiple: false,
      title: 'Open Word Document',
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (!docxPath || typeof docxPath !== 'string') return false;

    const filename = docxPath.split(/[/\\]/).pop() ?? 'document.docx';
    const title = inferTitleFromFilename(filename);
    let projectPath = useProjectStore.getState().projectPath;

    if (!projectPath) {
      const parentDir = docxPath.replace(/[/\\][^/\\]+$/, '') || docxPath;
      const suggestedProjectDir = `${parentDir}\\${title}-docforge`;

      const folder = await open({
        directory: true,
        multiple: false,
        title: 'Save imported document — choose or create a project folder',
        defaultPath: getProjectDialogDefaultPath(suggestedProjectDir),
      });
      if (!folder || typeof folder !== 'string') return false;

      const emptyDoc = createEmptyDocument('imported-word');
      emptyDoc.metadata.title = title;
      const styles = createDefaultStyles();
      await invoke('create_project', {
        path: folder,
        documentJson: JSON.stringify(emptyDoc, null, 2),
        stylesJson: JSON.stringify(styles, null, 2),
      });
      projectPath = folder;
      useProjectStore.getState().setProjectPath(folder);
      useProjectStore.getState().setProjectName(title);
      ProjectService.rememberProjectPath(folder);
    }

    return importFromDocxPath(projectPath, docxPath, { title, linkDocument: true });
  }

  static async refreshWordContent(): Promise<boolean> {
    const projectPath = useProjectStore.getState().projectPath;
    const linked = useProjectStore.getState().linkedWordDocument;
    if (!projectPath || !linked) {
      useProjectStore.getState().setError('No linked Word document for this project');
      return false;
    }

    const confirmed = await confirmRefreshIfDirty();
    if (!confirmed) return false;

    const docxPath = await resolveRefreshDocxPath(linked);
    if (!docxPath) return false;

    const title = inferTitleFromFilename(linked.original_filename);
    return importFromDocxPath(projectPath, docxPath, { title, linkDocument: true });
  }

  static async loadProjectMetadata(projectPath: string): Promise<void> {
    try {
      const assets = await invoke<Array<{
        id: string;
        filename: string;
        local_path: string;
        thumbnail_path: string;
        asset_type: string;
        tags: string;
        description: string;
        created_at: string;
        modified_at: string;
        usage_count: number;
        referenced_block_ids: string;
        hash: string;
      }>>('load_project_assets', { projectPath });

      useAssetStore.getState().setAssets(
        assets.map((a) => ({
          id: a.id,
          filename: a.filename,
          localPath: a.local_path,
          thumbnailPath: a.thumbnail_path,
          type: a.asset_type as AssetType,
          tags: JSON.parse(a.tags || '[]'),
          description: a.description,
          createdAt: a.created_at,
          modifiedAt: a.modified_at,
          usageCount: a.usage_count,
          referencedBlockIds: JSON.parse(a.referenced_block_ids || '[]'),
          hash: a.hash,
        })),
      );

      const linked = await invoke<LinkedWordDocument | null>('get_linked_word_document', { projectPath });
      useProjectStore.getState().setLinkedWordDocument(linked);

      const template = await invoke<{ filename: string; local_path: string; uploaded_at: string } | null>(
        'get_project_template',
        { projectPath },
      );
      useProjectStore.getState().setProjectTemplate(template);
    } catch {
      /* metadata.db may not exist on older projects */
    }
  }
}
