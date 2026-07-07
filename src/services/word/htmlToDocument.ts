import type { Document, Section, Block } from '@/schema';
import type { Asset } from '@/schema';
import type { Style } from '@/schema';
import { createBlock, createSection } from '@/lib/documentFactory';
import { getDefaultStyleIdForBlock } from '@/lib/defaultStyles';
import { createId } from '@/lib/utils';

export interface HtmlImportContext {
  styles: Style[];
  assets: Asset[];
  imageUrlToAssetId: Map<string, string>;
}

function textContent(node: Element): string {
  return node.textContent?.trim() ?? '';
}

function createTableBlock(styleId: string, tableEl: HTMLTableElement): Block {
  const block = createBlock('table', styleId);
  if (block.type !== 'table') return block;

  const rows = Array.from(tableEl.querySelectorAll('tr'));
  block.content.rows = rows.map(() => ({ id: createId(), height: 28 }));
  const maxCols = Math.max(...rows.map((r) => r.cells.length), 1);
  block.content.columns = Array.from({ length: maxCols }, () => ({ id: createId(), width: 120 }));
  block.content.cells = [];

  rows.forEach((row, ri) => {
    Array.from(row.cells).forEach((cell, ci) => {
      block.content.cells.push({
        row: ri,
        col: ci,
        value: cell.textContent?.trim() ?? '',
        rowSpan: 1,
        colSpan: 1,
      });
    });
  });

  block.content.headerRow = rows.length > 0;
  return block;
}

function createListBlock(
  type: 'bulletList' | 'numberedList',
  styleId: string,
  listEl: Element,
): Block {
  const block = createBlock(type, styleId);
  if (block.type !== type) return block;
  const items = Array.from(listEl.querySelectorAll(':scope > li')).map((li) => ({
    id: createId(),
    text: li.textContent?.trim() ?? '',
  }));
  block.content.items = items.length > 0 ? items : [{ id: createId(), text: '' }];
  return block;
}

function parseBlockFromElement(element: Element, ctx: HtmlImportContext): Block | null {
  const tag = element.tagName.toLowerCase();

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
    const level = Number(tag[1]);
    const styleId = getDefaultStyleIdForBlock(ctx.styles, 'heading');
    const block = createBlock('heading', styleId);
    if (block.type === 'heading') {
      block.content.text = textContent(element);
      block.content.level = level;
    }
    return block;
  }

  if (tag === 'p') {
    const styleId = getDefaultStyleIdForBlock(ctx.styles, 'paragraph');
    const block = createBlock('paragraph', styleId);
    if (block.type === 'paragraph') {
      block.content.text = textContent(element);
    }
    return block;
  }

  if (tag === 'ul') {
    return createListBlock('bulletList', getDefaultStyleIdForBlock(ctx.styles, 'bulletList'), element);
  }

  if (tag === 'ol') {
    return createListBlock('numberedList', getDefaultStyleIdForBlock(ctx.styles, 'numberedList'), element);
  }

  if (tag === 'table') {
    return createTableBlock(getDefaultStyleIdForBlock(ctx.styles, 'table'), element as HTMLTableElement);
  }

  if (tag === 'img') {
    const src = element.getAttribute('src') ?? '';
    const assetId =
      ctx.imageUrlToAssetId.get(src) ??
      (src.startsWith('docforge-asset://') ? src.replace('docforge-asset://', '') : null);
    const styleId = getDefaultStyleIdForBlock(ctx.styles, 'figure');
    const block = createBlock('figure', styleId);
    if (block.type === 'figure') {
      block.content.assetId = assetId;
      block.content.caption = element.getAttribute('alt') ?? '';
    }
    return block;
  }

  if (tag === 'blockquote') {
    const styleId = getDefaultStyleIdForBlock(ctx.styles, 'quote');
    const block = createBlock('quote', styleId);
    if (block.type === 'quote') {
      block.content.text = textContent(element);
    }
    return block;
  }

  if (tag === 'pre') {
    const styleId = getDefaultStyleIdForBlock(ctx.styles, 'code');
    const block = createBlock('code', styleId);
    if (block.type === 'code') {
      block.content.code = textContent(element);
    }
    return block;
  }

  if (tag === 'hr') {
    return createBlock('horizontalRule', getDefaultStyleIdForBlock(ctx.styles, 'horizontalRule'));
  }

  return null;
}

function collectBlocks(container: Element, ctx: HtmlImportContext): Block[] {
  const blocks: Block[] = [];
  for (const child of Array.from(container.children)) {
    const block = parseBlockFromElement(child, ctx);
    if (block) {
      blocks.push(block);
      continue;
    }
    if (child.children.length > 0) {
      blocks.push(...collectBlocks(child, ctx));
    } else {
      const text = textContent(child);
      if (text) {
        const styleId = getDefaultStyleIdForBlock(ctx.styles, 'paragraph');
        const para = createBlock('paragraph', styleId);
        if (para.type === 'paragraph') para.content.text = text;
        blocks.push(para);
      }
    }
  }
  return blocks;
}

export function htmlToDocument(html: string, ctx: HtmlImportContext, title = 'Imported Document'): Document {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  const sections: Section[] = [];
  let currentSection = createSection('Content', 0);
  let sectionOrder = 0;

  for (const child of Array.from(body.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'h1') {
      if (currentSection.blocks.length > 0 || sections.length > 0) {
        sections.push(currentSection);
      }
      sectionOrder += 1;
      currentSection = createSection(textContent(child) || `Section ${sectionOrder}`, sectionOrder);
      continue;
    }

    const block = parseBlockFromElement(child, ctx);
    if (block) {
      currentSection.blocks.push(block);
    } else if (child.children.length > 0) {
      currentSection.blocks.push(...collectBlocks(child, ctx));
    }
  }

  if (currentSection.blocks.length > 0 || sections.length === 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    sections.push(createSection('Imported Content', 0));
  }

  const now = new Date().toISOString();
  return {
    metadata: {
      title,
      author: '',
      description: 'Imported from Word document',
      createdAt: now,
      modifiedAt: now,
      templateId: 'imported-word',
      version: '1.0.0',
    },
    sections: sections.map((s, i) => ({ ...s, order: i })),
    assetRefs: ctx.assets.map((a) => ({ id: a.id, filename: a.filename, path: a.localPath })),
    version: '1.0.0',
  };
}

export function inferTitleFromFilename(filename: string): string {
  return filename.replace(/\.docx$/i, '').replace(/[-_]/g, ' ');
}
