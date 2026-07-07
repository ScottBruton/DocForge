import { z } from 'zod';

export const AssetTypeSchema = z.enum([
  'image',
  'logo',
  'icon',
  'pdf',
  'cad-render',
  'graph',
  'table-data',
  'other',
]);

export const AssetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  localPath: z.string(),
  thumbnailPath: z.string().default(''),
  type: AssetTypeSchema,
  tags: z.array(z.string()).default([]),
  description: z.string().default(''),
  createdAt: z.string(),
  modifiedAt: z.string(),
  usageCount: z.number().default(0),
  referencedBlockIds: z.array(z.string()).default([]),
  hash: z.string().optional(),
});

export type Asset = z.infer<typeof AssetSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetsFileSchema = z.object({
  assets: z.array(AssetSchema),
});

export type AssetsFile = z.infer<typeof AssetsFileSchema>;
