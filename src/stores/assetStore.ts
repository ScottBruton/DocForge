import { create } from 'zustand';
import type { Asset } from '@/schema';
import { createId, nowIso } from '@/lib/utils';

interface AssetStore {
  assets: Asset[];
  searchQuery: string;
  typeFilter: string | null;
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'modifiedAt' | 'usageCount' | 'referencedBlockIds'>) => Asset;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  incrementUsage: (assetId: string, blockId: string) => void;
  decrementUsage: (assetId: string, blockId: string) => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (type: string | null) => void;
  getFilteredAssets: () => Asset[];
  getAssetById: (id: string) => Asset | undefined;
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  searchQuery: '',
  typeFilter: null,

  setAssets: (assets) => set({ assets }),

  addAsset: (partial) => {
    const asset: Asset = {
      ...partial,
      id: createId(),
      createdAt: nowIso(),
      modifiedAt: nowIso(),
      usageCount: 0,
      referencedBlockIds: [],
    };
    set((s) => ({ assets: [...s.assets, asset] }));
    return asset;
  },

  updateAsset: (id, updates) =>
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === id ? { ...a, ...updates, modifiedAt: nowIso() } : a,
      ),
    })),

  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  incrementUsage: (assetId, blockId) =>
    set((s) => ({
      assets: s.assets.map((a) => {
        if (a.id !== assetId) return a;
        const refs = a.referencedBlockIds.includes(blockId)
          ? a.referencedBlockIds
          : [...a.referencedBlockIds, blockId];
        return { ...a, usageCount: refs.length, referencedBlockIds: refs, modifiedAt: nowIso() };
      }),
    })),

  decrementUsage: (assetId, blockId) =>
    set((s) => ({
      assets: s.assets.map((a) => {
        if (a.id !== assetId) return a;
        const refs = a.referencedBlockIds.filter((r) => r !== blockId);
        return { ...a, usageCount: refs.length, referencedBlockIds: refs, modifiedAt: nowIso() };
      }),
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),

  getFilteredAssets: () => {
    const { assets, searchQuery, typeFilter } = get();
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
  },

  getAssetById: (id) => get().assets.find((a) => a.id === id),
}));
