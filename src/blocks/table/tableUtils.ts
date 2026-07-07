import type { TableBlock } from '@/schema';
import type { ValidationIssue } from '@/registry/types';
import { createId } from '@/lib/utils';

export function getCellValue(content: TableBlock['content'], row: number, col: number): string {
  const cell = content.cells.find((c) => c.row === row && c.col === col);
  return cell?.value ?? '';
}

export function setCellValue(
  content: TableBlock['content'],
  row: number,
  col: number,
  value: string,
): TableBlock['content'] {
  const cells = [...content.cells];
  const idx = cells.findIndex((c) => c.row === row && c.col === col);
  if (idx >= 0) {
    cells[idx] = { ...cells[idx]!, value };
  } else {
    cells.push({ row, col, value, rowSpan: 1, colSpan: 1 });
  }
  return { ...content, cells };
}

export function insertRow(content: TableBlock['content'], at: number): TableBlock['content'] {
  const rows = [...content.rows];
  rows.splice(at, 0, { id: createId(), height: 28 });
  const cells = content.cells.map((c) => (c.row >= at ? { ...c, row: c.row + 1 } : c));
  return { ...content, rows, cells };
}

export function deleteRow(content: TableBlock['content'], at: number): TableBlock['content'] {
  if (content.rows.length <= 1) return content;
  const rows = content.rows.filter((_, i) => i !== at);
  const cells = content.cells
    .filter((c) => c.row !== at)
    .map((c) => (c.row > at ? { ...c, row: c.row - 1 } : c));
  return { ...content, rows, cells };
}

export function insertColumn(content: TableBlock['content'], at: number): TableBlock['content'] {
  const columns = [...content.columns];
  columns.splice(at, 0, { id: createId(), width: 120 });
  const cells = content.cells.map((c) => (c.col >= at ? { ...c, col: c.col + 1 } : c));
  return { ...content, columns, cells };
}

export function deleteColumn(content: TableBlock['content'], at: number): TableBlock['content'] {
  if (content.columns.length <= 1) return content;
  const columns = content.columns.filter((_, i) => i !== at);
  const cells = content.cells
    .filter((c) => c.col !== at)
    .map((c) => (c.col > at ? { ...c, col: c.col - 1 } : c));
  return { ...content, columns, cells };
}

export function pasteFromClipboard(
  content: TableBlock['content'],
  startRow: number,
  startCol: number,
  text: string,
): TableBlock['content'] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  let result = { ...content };
  lines.forEach((line, ri) => {
    const cols = line.split('\t');
    cols.forEach((val, ci) => {
      const row = startRow + ri;
      const col = startCol + ci;
      while (row >= result.rows.length) result = insertRow(result, result.rows.length);
      while (col >= result.columns.length) result = insertColumn(result, result.columns.length);
      result = setCellValue(result, row, col, val);
    });
  });
  return result;
}

export function validateTableStructure(content: TableBlock['content']): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (content.rows.length === 0 || content.columns.length === 0) {
    issues.push({ path: 'content', message: 'Table has no rows or columns', severity: 'error' });
  }
  for (const cell of content.cells) {
    if (cell.row >= content.rows.length || cell.col >= content.columns.length) {
      issues.push({ path: `cells[${cell.row},${cell.col}]`, message: 'Cell out of bounds', severity: 'error' });
    }
  }
  return issues;
}

export function isCellHidden(content: TableBlock['content'], row: number, col: number): boolean {
  for (const cell of content.cells) {
    if (cell.rowSpan > 1 || cell.colSpan > 1) {
      if (row >= cell.row && row < cell.row + cell.rowSpan && col >= cell.col && col < cell.col + cell.colSpan) {
        if (row !== cell.row || col !== cell.col) return true;
      }
    }
  }
  return false;
}

export function mergeCells(
  content: TableBlock['content'],
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): TableBlock['content'] {
  const rowSpan = endRow - startRow + 1;
  const colSpan = endCol - startCol + 1;
  const value = getCellValue(content, startRow, startCol);
  const cells = content.cells.filter(
    (c) => !(c.row >= startRow && c.row <= endRow && c.col >= startCol && c.col <= endCol),
  );
  cells.push({ row: startRow, col: startCol, value, rowSpan, colSpan });
  return { ...content, cells };
}
