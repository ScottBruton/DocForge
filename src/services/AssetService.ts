import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAssetStore } from '@/stores/assetStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Asset, AssetType } from '@/schema';

interface ImportResult {
  filename: string;
  local_path: string;
  thumbnail_path: string;
  hash: string;
  asset_type: string;
}

export async function readAssetAsDataUrl(localPath: string): Promise<string> {
  try {
    const base64 = await invoke<string>('read_file_base64', { filePath: localPath });
    const ext = localPath.split('.').pop()?.toLowerCase() ?? 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return '';
  }
}

export class AssetService {
  static async importAssets(): Promise<void> {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) {
      useProjectStore.getState().setError('Save project first before importing assets');
      return;
    }

    const files = await open({
      multiple: true,
      title: 'Import assets',
      filters: [
        { name: 'Assets', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'csv', 'xlsx'] },
      ],
    });

    if (!files) return;
    const paths = Array.isArray(files) ? files : [files];

    for (const sourcePath of paths) {
      if (typeof sourcePath !== 'string') continue;
      const result = await invoke<ImportResult>('import_asset', {
        projectPath,
        sourcePath,
      });

      const asset = useAssetStore.getState().addAsset({
        filename: result.filename,
        localPath: result.local_path,
        thumbnailPath: result.thumbnail_path,
        type: result.asset_type as AssetType,
        tags: [],
        description: '',
        hash: result.hash,
      });
      await AssetService.persistAssetToDb(asset);
    }
  }

  static async persistAssetToDb(asset: Asset): Promise<void> {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) return;
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

  static async deleteUnused(asset: Asset): Promise<void> {
    if (asset.usageCount > 0) return;
    await invoke('delete_asset_file', { filePath: asset.localPath });
    if (asset.thumbnailPath) {
      await invoke('delete_asset_file', { filePath: asset.thumbnailPath }).catch(() => {});
    }
    useAssetStore.getState().removeAsset(asset.id);
  }

  static getAssetForBlock(assetId: string | null): Asset | undefined {
    if (!assetId) return undefined;
    return useAssetStore.getState().getAssetById(assetId);
  }
}
