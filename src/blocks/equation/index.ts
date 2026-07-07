import { EquationContentSchema } from '@/schema';
import { createBlock } from '@/lib/documentFactory';
import type { BlockDefinition } from '@/registry/types';
import { EquationEditor, EquationRenderer } from '@/blocks/equation/EquationBlock';
import { EquationProperties } from '@/blocks/equation/EquationProperties';

export const equationDefinition: BlockDefinition<'equation'> = {
  type: 'equation',
  label: 'Equation',
  icon: 'Sigma',
  defaultBlock: (styleId) => createBlock('equation', styleId),
  Renderer: EquationRenderer,
  Editor: EquationEditor,
  PropertiesPanel: EquationProperties,
  wordExportHandler: (block) => ({ type: 'equation', content: block.type === 'equation' ? block.content : {} }),
  aiSchema: EquationContentSchema,
  validate: () => [],
};
