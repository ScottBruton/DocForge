import type { Document } from '@/schema';
import type { StylesFile } from '@/schema';
import type { Asset } from '@/schema';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  PageBreak,
  BorderStyle,
} from 'docx';
import { getBlockDefinition } from '@/registry/BlockRegistry';
import type { Block } from '@/schema';
import { readAssetAsDataUrl } from '@/services/AssetService';

function headingLevel(level: number) {
  const levels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];
  return levels[Math.min(level - 1, 5)] ?? HeadingLevel.HEADING_1;
}

async function blockToDocx(block: Block, assets: Asset[]): Promise<(Paragraph | Table)[]> {
  switch (block.type) {
    case 'heading':
      return [
        new Paragraph({
          text: block.content.text,
          heading: headingLevel(block.content.level),
        }),
      ];
    case 'paragraph':
      return [
        new Paragraph({
          children: [new TextRun(block.content.text)],
          alignment: block.content.alignment === 'center' ? 'center' : undefined,
        }),
      ];
    case 'quote':
      return [
        new Paragraph({
          children: [new TextRun({ text: block.content.text, italics: true })],
          indent: { left: 720 },
        }),
      ];
    case 'code':
      return [
        new Paragraph({
          children: [new TextRun({ text: block.content.code, font: 'Consolas' })],
        }),
      ];
    case 'bulletList':
      return block.content.items.map(
        (item) =>
          new Paragraph({
            text: item.text,
            bullet: { level: 0 },
          }),
      );
    case 'numberedList':
      return block.content.items.map(
        (item) =>
          new Paragraph({
            text: item.text,
            numbering: { reference: 'default-numbering', level: 0 },
          }),
      );
    case 'checklist':
      return block.content.items.map(
        (item) =>
          new Paragraph({
            children: [new TextRun(`${item.checked ? '☑' : '☐'} ${item.text}`)],
          }),
      );
    case 'equation':
      return [new Paragraph({ children: [new TextRun(block.content.latex)] })];
    case 'horizontalRule':
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
        }),
      ];
    case 'pageBreak':
      return [new Paragraph({ children: [new PageBreak()] })];
    case 'figure': {
      const items: Paragraph[] = [];
      if (block.content.caption && block.content.captionPosition === 'above') {
        items.push(new Paragraph({ children: [new TextRun({ text: block.content.caption, italics: true })] }));
      }
      const asset = assets.find((a) => a.id === block.content.assetId);
      if (asset?.localPath) {
        try {
          const dataUrl = await readAssetAsDataUrl(asset.localPath);
          const base64 = dataUrl.split(',')[1];
          if (base64) {
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            items.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: bytes,
                    transformation: { width: 400, height: 300 },
                    type: 'png',
                  }),
                ],
              }),
            );
          }
        } catch {
          items.push(new Paragraph({ children: [new TextRun(`[Figure: ${asset.filename}]`)] }));
        }
      }
      if (block.content.caption && block.content.captionPosition === 'below') {
        items.push(new Paragraph({ children: [new TextRun({ text: block.content.caption, italics: true })] }));
      }
      return items;
    }
    case 'table': {
      const rows = block.content.rows.map((_, ri) => {
        const cells = block.content.columns.map((_, ci) => {
          const cell = block.content.cells.find((c) => c.row === ri && c.col === ci);
          return new TableCell({
            children: [new Paragraph(cell?.value ?? '')],
            shading: ri === 0 && block.content.headerRow ? { fill: 'E8E8E8' } : undefined,
          });
        });
        return new TableRow({ children: cells });
      });
      const tableItems: (Paragraph | Table)[] = [];
      if (block.content.caption) {
        tableItems.push(new Paragraph({ children: [new TextRun({ text: block.content.caption, italics: true })] }));
      }
      tableItems.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }),
      );
      return tableItems;
    }
    default:
      return [new Paragraph({ children: [new TextRun('')] })];
  }
}

export class WordService {
  static async exportDocx(
    document: Document,
    _styles: StylesFile,
    assets: Asset[],
  ): Promise<Blob> {
    const children: (Paragraph | Table)[] = [];

    for (const section of document.sections) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
        }),
      );
      for (const block of section.blocks) {
        getBlockDefinition(block.type).wordExportHandler(block, { styles: new Map(), assets: new Map() });
        const items = await blockToDocx(block, assets);
        children.push(...items);
      }
    }

    const doc = new DocxDocument({
      sections: [{ children }],
    });

    const buffer = await Packer.toBlob(doc);
    return buffer;
  }

  static async importDocx(_bytes: ArrayBuffer): Promise<Document | null> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: _bytes });
    const { createEmptyDocument, createBlock, createSection } = await import('@/lib/documentFactory');
    const { createDefaultStyles } = await import('@/lib/defaultStyles');
    const styles = createDefaultStyles();
    const bodyStyle = styles.styles.find((s) => s.category === 'body')?.id ?? '';

    const doc = createEmptyDocument();
    doc.sections = [];

    const paragraphs = result.value.split('\n').filter((p) => p.trim());
    const section = createSection('Imported Content', 0);
    for (const text of paragraphs) {
      const block = createBlock('paragraph', bodyStyle);
      if (block.type === 'paragraph') {
        block.content.text = text;
      }
      section.blocks.push(block);
    }
    doc.sections.push(section);
    return doc;
  }

  static async isComAvailable(): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ success: boolean }>('word_com_ping');
      return result.success;
    } catch {
      return false;
    }
  }

  static async syncToWord(document: Document): Promise<{ success: boolean; message: string }> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const payload = JSON.stringify({ sections: document.sections });
      const result = await invoke<{ success: boolean; message: string }>('word_com_command', {
        command: 'write_document',
        payload,
      });
      return result;
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }

  static async pushToLinkedWord(
    document: Document,
    styles: StylesFile,
    assets: Asset[],
    projectPath: string,
  ): Promise<{ success: boolean; message: string; path?: string }> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const blob = await WordService.exportDocx(document, styles, assets);
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!);
      const base64 = btoa(bin);

      const path = await invoke<string>('write_linked_word_document', {
        projectPath,
        base64Data: base64,
      });

      await invoke('mark_word_document_synced', { projectPath });

      const comAvailable = await WordService.isComAvailable();
      if (comAvailable) {
        await invoke('word_com_command', {
          command: 'open_document',
          payload: JSON.stringify({ path }),
        }).catch(() => {});
      }

      return { success: true, message: 'Linked Word document updated', path };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }
}
