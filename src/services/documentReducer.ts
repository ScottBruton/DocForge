import type { Document, Section, Block } from '@/schema';
import {
  createBlock,
  createSection,
  findBlock,
  moveItem,
  reorderSections,
  touchDocument,
} from '@/lib/documentFactory';
import { createId } from '@/lib/utils';
import type { BlockType } from '@/schema';

export type DocumentAction =
  | { type: 'LOAD_DOCUMENT'; document: Document }
  | { type: 'ADD_SECTION'; title?: string; afterSectionId?: string }
  | { type: 'RENAME_SECTION'; sectionId: string; title: string }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'DUPLICATE_SECTION'; sectionId: string }
  | { type: 'TOGGLE_SECTION_COLLAPSED'; sectionId: string }
  | { type: 'MOVE_SECTION'; sectionId: string; toIndex: number }
  | { type: 'ADD_BLOCK'; sectionId: string; blockType: BlockType; afterBlockId?: string; block?: Block }
  | { type: 'UPDATE_BLOCK'; blockId: string; updates: Partial<Block> & { content?: Block['content'] } }
  | { type: 'DELETE_BLOCK'; blockId: string }
  | { type: 'DUPLICATE_BLOCK'; blockId: string }
  | { type: 'MOVE_BLOCK'; blockId: string; toSectionId: string; toIndex: number }
  | { type: 'SET_METADATA'; metadata: Partial<Document['metadata']> }
  | { type: 'APPLY_AI_PATCH'; document: Document }
  | { type: 'MERGE_SECTIONS'; sections: Section[] };

export function documentReducer(state: Document, action: DocumentAction): Document {
  switch (action.type) {
    case 'LOAD_DOCUMENT':
      return action.document;

    case 'ADD_SECTION': {
      const order = state.sections.length;
      const section = createSection(action.title ?? 'New Section', order);
      let sections = [...state.sections];
      if (action.afterSectionId) {
        const idx = sections.findIndex((s) => s.id === action.afterSectionId);
        sections.splice(idx + 1, 0, section);
      } else {
        sections.push(section);
      }
      return touchDocument({ ...state, sections: reorderSections(sections) });
    }

    case 'RENAME_SECTION':
      return touchDocument({
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId ? { ...s, title: action.title } : s,
        ),
      });

    case 'DELETE_SECTION':
      return touchDocument({
        ...state,
        sections: reorderSections(state.sections.filter((s) => s.id !== action.sectionId)),
      });

    case 'DUPLICATE_SECTION': {
      const source = state.sections.find((s) => s.id === action.sectionId);
      if (!source) return state;
      const dup: Section = {
        ...JSON.parse(JSON.stringify(source)),
        id: createId(),
        title: `${source.title} (Copy)`,
        blocks: source.blocks.map((b) => ({ ...JSON.parse(JSON.stringify(b)), id: createId() })),
      };
      const idx = state.sections.findIndex((s) => s.id === action.sectionId);
      const sections = [...state.sections];
      sections.splice(idx + 1, 0, dup);
      return touchDocument({ ...state, sections: reorderSections(sections) });
    }

    case 'TOGGLE_SECTION_COLLAPSED':
      return touchDocument({
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId ? { ...s, collapsed: !s.collapsed } : s,
        ),
      });

    case 'MOVE_SECTION': {
      const fromIndex = state.sections.findIndex((s) => s.id === action.sectionId);
      if (fromIndex < 0) return state;
      const sections = moveItem(state.sections, fromIndex, action.toIndex);
      return touchDocument({ ...state, sections: reorderSections(sections) });
    }

    case 'ADD_BLOCK': {
      const block = action.block ?? createBlock(action.blockType, 'body');
      return touchDocument({
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== action.sectionId) return s;
          const blocks = [...s.blocks];
          if (action.afterBlockId) {
            const idx = blocks.findIndex((b) => b.id === action.afterBlockId);
            blocks.splice(idx + 1, 0, block);
          } else {
            blocks.push(block);
          }
          return { ...s, blocks };
        }),
      });
    }

    case 'UPDATE_BLOCK': {
      const found = findBlock(state, action.blockId);
      if (!found) return state;
      return touchDocument({
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== found.section.id) return s;
          return {
            ...s,
            blocks: s.blocks.map((b) => {
              if (b.id !== action.blockId) return b;
              return {
                ...b,
                ...action.updates,
                content: action.updates.content ?? b.content,
                properties: action.updates.properties
                  ? { ...b.properties, ...action.updates.properties }
                  : b.properties,
              } as Block;
            }),
          };
        }),
      });
    }

    case 'DELETE_BLOCK': {
      const found = findBlock(state, action.blockId);
      if (!found) return state;
      return touchDocument({
        ...state,
        sections: state.sections.map((s) =>
          s.id === found.section.id
            ? { ...s, blocks: s.blocks.filter((b) => b.id !== action.blockId) }
            : s,
        ),
      });
    }

    case 'DUPLICATE_BLOCK': {
      const found = findBlock(state, action.blockId);
      if (!found) return state;
      const dup = { ...JSON.parse(JSON.stringify(found.block)), id: createId() };
      return touchDocument({
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== found.section.id) return s;
          const blocks = [...s.blocks];
          blocks.splice(found.index + 1, 0, dup);
          return { ...s, blocks };
        }),
      });
    }

    case 'MOVE_BLOCK': {
      const found = findBlock(state, action.blockId);
      if (!found) return state;
      const block = found.block;
      let sections = state.sections.map((s) =>
        s.id === found.section.id ? { ...s, blocks: s.blocks.filter((b) => b.id !== action.blockId) } : s,
      );
      sections = sections.map((s) => {
        if (s.id !== action.toSectionId) return s;
        const blocks = [...s.blocks];
        blocks.splice(action.toIndex, 0, block);
        return { ...s, blocks };
      });
      return touchDocument({ ...state, sections });
    }

    case 'SET_METADATA':
      return touchDocument({
        ...state,
        metadata: { ...state.metadata, ...action.metadata },
      });

    case 'APPLY_AI_PATCH':
      return touchDocument(action.document);

    case 'MERGE_SECTIONS':
      return touchDocument({ ...state, sections: action.sections });

    default:
      return state;
  }
}
