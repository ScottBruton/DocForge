import { useAssetStore, useUIStore } from '@/stores';
import { AssetService } from '@/services/AssetService';
import { ChevronUp, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { readAssetAsDataUrl } from '@/services/AssetService';

export function AssetLibrary() {
  const isCollapsed = useUIStore((s) => s.isBottomPanelCollapsed);
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel);
  const assets = useAssetStore((s) => s.assets);
  const searchQuery = useAssetStore((s) => s.searchQuery);
  const setSearchQuery = useAssetStore((s) => s.setSearchQuery);
  const typeFilter = useAssetStore((s) => s.typeFilter);
  const setTypeFilter = useAssetStore((s) => s.setTypeFilter);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.filename.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, searchQuery, typeFilter]);

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('application/docforge-asset', assetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="flex h-6 w-full items-center justify-center border-t border-zinc-800 bg-zinc-900/80 text-xs text-zinc-500 hover:text-zinc-300"
        onClick={toggleBottomPanel}
      >
        Asset Library
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col border-t border-zinc-800 bg-zinc-900/50">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <ImageIcon size={14} className="text-zinc-500" />
        <span className="text-xs font-medium text-zinc-400">Asset Library</span>
        <div className="flex-1" />
        <button type="button" className="text-zinc-500 hover:text-zinc-300" onClick={() => AssetService.importAssets()}>
          <Upload size={14} />
        </button>
        <button type="button" className="text-zinc-500 hover:text-zinc-300" onClick={toggleBottomPanel}>
          <ChevronUp size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1">
        <input
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300 outline-none"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs text-zinc-400"
          value={typeFilter ?? ''}
          onChange={(e) => setTypeFilter(e.target.value || null)}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="pdf">PDF</option>
          <option value="table-data">Table data</option>
        </select>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {filteredAssets.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-600">No assets. Import images or files.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDragStart={(e) => handleDragStart(e, asset.id)}
                onDelete={() => AssetService.deleteUnused(asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({
  asset, onDragStart, onDelete,
}: {
  asset: ReturnType<typeof useAssetStore.getState>['assets'][0];
  onDragStart: (e: React.DragEvent) => void;
  onDelete: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (asset.thumbnailPath) {
      readAssetAsDataUrl(asset.thumbnailPath).then(setThumb);
    } else if (asset.localPath) {
      readAssetAsDataUrl(asset.localPath).then(setThumb);
    }
  }, [asset.thumbnailPath, asset.localPath]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded border border-zinc-800 bg-zinc-900 p-1 hover:border-zinc-600"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-zinc-950">
        {thumb ? (
          <img src={thumb} alt={asset.filename} className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon size={20} className="text-zinc-700" />
        )}
      </div>
      <p className="mt-1 truncate text-[10px] text-zinc-500">{asset.filename}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">{asset.usageCount} uses</span>
        {asset.usageCount === 0 && (
          <button type="button" onClick={onDelete} className="text-zinc-700 hover:text-red-400">
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
