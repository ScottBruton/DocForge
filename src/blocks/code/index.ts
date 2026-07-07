import { CodeContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { CodeEditor, CodeRenderer } from '@/blocks/code/CodeBlock';
import { CodeProperties } from '@/blocks/code/CodeProperties';

export const codeDefinition: BlockDefinition<'code'> = {
  type: 'code',
  label: 'Code Block',
  icon: 'Code',
  defaultBlock: (styleId) => createBlock('code', styleId),
  Renderer: CodeRenderer,
  Editor: CodeEditor,
  PropertiesPanel: CodeProperties,
  wordExportHandler: (block) => ({ type: 'code', content: block.type === 'code' ? block.content : {} }),
  aiSchema: CodeContentSchema,
  validate: () => [],
};
