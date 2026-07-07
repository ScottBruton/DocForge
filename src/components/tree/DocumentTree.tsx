import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDocumentStore, useSelectionStore, useUIStore } from '@/stores';
import { getAllBlockDefinitions } from '@/registry/BlockRegistry';
import { getDefaultStyleIdForBlock } from '@/lib/defaultStyles';
import { useStyleStore } from '@/stores/styleStore';
import { createBlock } from '@/lib/documentFactory';
import { useAssetStore } from '@/stores/assetStore';
import {
  ChevronDown, ChevronRight, Plus, Copy, Trash2, GripVertical, FileText, Search,
} from 'lucide-react';
import type { BlockType } from '@/schema';
import { BLOCK_LABELS } from '@/lib/utils';
import { useState } from 'react';

export function DocumentTree() {
  const document = useDocumentStore((s) => s.document);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const treeFilter = useUIStore((s) => s.treeFilter);
  const setTreeFilter = useUIStore((s) => s.setTreeFilter);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeSection = document.sections.find((s) => s.id === activeId);
    const overSection = document.sections.find((s) => s.id === overId);

    if (activeSection && overSection) {
      dispatch({ type: 'MOVE_SECTION', sectionId: activeId, toIndex: document.sections.findIndex((s) => s.id === overId) });
      return;
    }

    for (const section of document.sections) {
      const activeBlock = section.blocks.find((b) => b.id === activeId);
      if (!activeBlock) continue;

      for (const targetSection of document.sections) {
        const overBlockIdx = targetSection.blocks.findIndex((b) => b.id === overId);
        if (overBlockIdx >= 0) {
          dispatch({
            type: 'MOVE_BLOCK',
            blockId: activeId,
            toSectionId: targetSection.id,
            toIndex: overBlockIdx,
          });
          return;
        }
      }
    }
  };

  const filterLower = treeFilter.toLowerCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-800 p-2">
        <Search size={14} className="text-zinc-500" />
        <input
          className="flex-1 bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
          placeholder="Filter..."
          value={treeFilter}
          onChange={(e) => setTreeFilter(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-2 flex items-center gap-1 text-xs font-medium text-zinc-400">
          <FileText size={12} />
          Document
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={document.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {document.sections
              .filter((s) => !filterLower || s.title.toLowerCase().includes(filterLower))
              .map((section) => (
                <SortableSection key={section.id} sectionId={section.id} />
              ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          onClick={() => dispatch({ type: 'ADD_SECTION' })}
        >
          <Plus size={12} /> Add Section
        </button>
      </div>
    </div>
  );
}

function SortableSection({ sectionId }: { sectionId: string }) {
  const document = useDocumentStore((s) => s.document);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const selectSection = useSelectionStore((s) => s.selectSection);
  const selectBlock = useSelectionStore((s) => s.selectBlock);
  const isSectionSelected = useSelectionStore((s) => s.isSectionSelected);
  const isBlockSelected = useSelectionStore((s) => s.isBlockSelected);
  const styles = useStyleStore((s) => s.stylesFile.styles);
  const [showAddBlock, setShowAddBlock] = useState(false);

  const section = document.sections.find((s) => s.id === sectionId);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sectionId });

  const handleAssetDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('application/docforge-asset');
    if (!assetId) return;
    const styleId = getDefaultStyleIdForBlock(styles, 'figure');
    const block = createBlock('figure', styleId);
    if (block.type === 'figure') block.content.assetId = assetId;
    dispatch({ type: 'ADD_BLOCK', sectionId: targetSectionId, blockType: 'figure', block });
    useAssetStore.getState().incrementUsage(assetId, block.id);
  };

  if (!section) return null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        className={`group flex items-center gap-1 rounded px-1 py-0.5 text-xs ${
          isSectionSelected(sectionId) ? 'bg-blue-900/30 text-blue-200' : 'text-zinc-400 hover:bg-zinc-800'
        }`}
      >
        <button type="button" className="cursor-grab text-zinc-600 hover:text-zinc-400" {...attributes} {...listeners}>
          <GripVertical size={12} />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_SECTION_COLLAPSED', sectionId })}
        >
          {section.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
        <span
          className="flex-1 cursor-pointer truncate"
          onClick={(e) => selectSection(sectionId, e.ctrlKey || e.shiftKey)}
        >
          {section.title}
        </span>
        <button
          type="button"
          className="hidden text-zinc-600 hover:text-zinc-300 group-hover:block"
          onClick={() => dispatch({ type: 'DUPLICATE_SECTION', sectionId })}
        >
          <Copy size={11} />
        </button>
        <button
          type="button"
          className="hidden text-zinc-600 hover:text-red-400 group-hover:block"
          onClick={() => dispatch({ type: 'DELETE_SECTION', sectionId })}
        >
          <Trash2 size={11} />
        </button>
      </div>
      {!section.collapsed && (
        <div
          className="ml-4"
          data-section={sectionId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleAssetDrop(e, sectionId)}
        >
          <SortableContext items={section.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {section.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                blockId={block.id}
                label={BLOCK_LABELS[block.type]}
                selected={isBlockSelected(block.id)}
                onSelect={(multi) => selectBlock(block.id, sectionId, multi)}
              />
            ))}
          </SortableContext>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-zinc-600 hover:text-zinc-400"
              onClick={() => setShowAddBlock(!showAddBlock)}
            >
              <Plus size={11} /> Block
            </button>
            {showAddBlock && (
              <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
                {getAllBlockDefinitions().map((def) => (
                  <button
                    key={def.type}
                    type="button"
                    className="block w-full px-3 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={() => {
                      const styleId = getDefaultStyleIdForBlock(styles, def.type);
                      const block = def.defaultBlock(styleId);
                      dispatch({ type: 'ADD_BLOCK', sectionId, blockType: def.type as BlockType, block });
                      setShowAddBlock(false);
                    }}
                  >
                    {def.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableBlock({
  blockId, label, selected, onSelect,
}: {
  blockId: string;
  label: string;
  selected: boolean;
  onSelect: (multi: boolean) => void;
}) {
  const dispatch = useDocumentStore((s) => s.dispatch);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: blockId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded px-1 py-0.5 text-xs ${
        selected ? 'bg-blue-900/20 text-blue-300' : 'text-zinc-500 hover:bg-zinc-800/50'
      }`}
    >
      <button type="button" className="cursor-grab text-zinc-700" {...attributes} {...listeners}>
        <GripVertical size={10} />
      </button>
      <span className="flex-1 cursor-pointer truncate" onClick={(e) => onSelect(e.ctrlKey || e.shiftKey)}>
        {label}
      </span>
      <button
        type="button"
        className="hidden group-hover:block"
        onClick={() => dispatch({ type: 'DUPLICATE_BLOCK', blockId })}
      >
        <Copy size={10} />
      </button>
      <button
        type="button"
        className="hidden text-red-500 group-hover:block"
        onClick={() => dispatch({ type: 'DELETE_BLOCK', blockId })}
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
