import { useCallback } from 'react';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { TableBlock } from '@/schema';
import {
  deleteColumn,
  deleteRow,
  getCellValue,
  insertColumn,
  insertRow,
  isCellHidden,
  pasteFromClipboard,
  setCellValue,
} from '@/blocks/table/tableUtils';

function TableView({
  block,
  isSelected,
  onUpdate,
  editable,
}: {
  block: TableBlock;
  isSelected: boolean;
  onUpdate?: BlockEditorProps['onUpdate'];
  editable?: boolean;
}) {
  const updateContent = useCallback(
    (content: TableBlock['content']) => onUpdate?.({ content }),
    [onUpdate],
  );

  const handlePaste = (row: number, col: number, e: React.ClipboardEvent) => {
    if (!editable) return;
    const text = e.clipboardData.getData('text/plain');
    if (text.includes('\t') || text.includes('\n')) {
      e.preventDefault();
      updateContent(pasteFromClipboard(block.content, row, col, text));
    }
  };

  return (
    <div className={`overflow-auto ${isSelected ? 'ring-1 ring-blue-500/50 rounded p-1' : ''}`}>
      {block.content.caption && (
        <div className="mb-1 text-sm italic text-zinc-400">{block.content.caption}</div>
      )}
      <table className={`w-full border-collapse text-sm ${block.content.borders ? 'border border-zinc-700' : ''}`}>
        <tbody>
          {block.content.rows.map((row, ri) => (
            <tr key={row.id} style={{ height: row.height }}>
              {block.content.columns.map((col, ci) => {
                if (isCellHidden(block.content, ri, ci)) return null;
                const cell = block.content.cells.find((c) => c.row === ri && c.col === ci);
                const isHeader = block.content.headerRow && ri === 0;
                return (
                  <td
                    key={col.id}
                    colSpan={cell?.colSpan ?? 1}
                    rowSpan={cell?.rowSpan ?? 1}
                    className={`border border-zinc-700 p-1 ${isHeader ? 'bg-zinc-800 font-semibold' : ''} ${block.content.bandedRows && ri % 2 === 1 ? 'bg-zinc-900/50' : ''}`}
                    style={{ width: col.width, padding: block.content.cellPadding }}
                  >
                    {editable ? (
                      <input
                        className="w-full bg-transparent outline-none"
                        value={getCellValue(block.content, ri, ci)}
                        onChange={(e) => updateContent(setCellValue(block.content, ri, ci, e.target.value))}
                        onPaste={(e) => handlePaste(ri, ci, e)}
                      />
                    ) : (
                      getCellValue(block.content, ri, ci)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700" onClick={() => updateContent(insertRow(block.content, block.content.rows.length))}>+ Row</button>
          <button type="button" className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700" onClick={() => updateContent(insertColumn(block.content, block.content.columns.length))}>+ Col</button>
          <button type="button" className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700" onClick={() => updateContent(deleteRow(block.content, block.content.rows.length - 1))}>- Row</button>
          <button type="button" className="rounded bg-zinc-800 px-2 py-0.5 text-xs hover:bg-zinc-700" onClick={() => updateContent(deleteColumn(block.content, block.content.columns.length - 1))}>- Col</button>
        </div>
      )}
    </div>
  );
}

export function TableRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'table') return null;
  return <TableView block={block as TableBlock} isSelected={isSelected} />;
}

export function TableEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'table') return null;
  return <TableView block={block as TableBlock} isSelected={isSelected} onUpdate={onUpdate} editable />;
}
