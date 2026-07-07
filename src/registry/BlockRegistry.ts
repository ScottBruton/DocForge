import type { BlockDefinition } from './types';
import { headingDefinition } from '@/blocks/heading';
import { paragraphDefinition } from '@/blocks/paragraph';
import { figureDefinition } from '@/blocks/figure';
import { tableDefinition } from '@/blocks/table';
import { bulletListDefinition } from '@/blocks/bulletList';
import { numberedListDefinition } from '@/blocks/numberedList';
import { checklistDefinition } from '@/blocks/checklist';
import { quoteDefinition } from '@/blocks/quote';
import { equationDefinition } from '@/blocks/equation';
import { codeDefinition } from '@/blocks/code';
import { horizontalRuleDefinition } from '@/blocks/horizontalRule';
import { pageBreakDefinition } from '@/blocks/pageBreak';
import type { BlockType } from '@/schema';

const definitions: BlockDefinition[] = [
  headingDefinition,
  paragraphDefinition,
  figureDefinition,
  tableDefinition,
  bulletListDefinition,
  numberedListDefinition,
  checklistDefinition,
  quoteDefinition,
  equationDefinition,
  codeDefinition,
  horizontalRuleDefinition,
  pageBreakDefinition,
];

const registry = new Map<BlockType, BlockDefinition>();

for (const def of definitions) {
  registry.set(def.type, def);
}

export function getBlockDefinition(type: BlockType): BlockDefinition {
  const def = registry.get(type);
  if (!def) throw new Error(`Unregistered block type: ${type}`);
  return def;
}

export function getAllBlockDefinitions(): BlockDefinition[] {
  return [...registry.values()];
}

export function isRegisteredBlockType(type: string): type is BlockType {
  return registry.has(type as BlockType);
}

export function registerBlockDefinition(def: BlockDefinition): void {
  registry.set(def.type, def);
}
