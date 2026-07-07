import type { ComponentType } from 'react';
import type { z } from 'zod';
import type { Block, BlockType } from '@/schema';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
}

export interface BlockEditorProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (updates: Partial<Block> & { content?: Block['content'] }) => void;
}

export interface BlockPropertiesProps {
  block: Block;
  onUpdate: (updates: Partial<Block> & { content?: Block['content'] }) => void;
}

export interface WordExportContext {
  styles: Map<string, unknown>;
  assets: Map<string, string>;
}

export interface WordExportNode {
  type: string;
  content?: unknown;
}

export interface BlockDefinition<T extends BlockType = BlockType> {
  type: T;
  label: string;
  icon: string;
  defaultBlock: (styleId: string) => Block;
  Renderer: ComponentType<BlockRendererProps>;
  Editor: ComponentType<BlockEditorProps>;
  PropertiesPanel: ComponentType<BlockPropertiesProps>;
  wordExportHandler: (block: Block, ctx: WordExportContext) => WordExportNode;
  aiSchema: z.ZodType;
  validate: (block: Block) => ValidationIssue[];
}
