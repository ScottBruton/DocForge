import { useEffect, useMemo, useState, createElement } from 'react';
import katex from 'katex';
import type { Asset, Block, Document, Section } from '@/schema';
import { readAssetAsDataUrl } from '@/services/AssetService';
import { getCellValue, isCellHidden } from '@/blocks/table/tableUtils';
import type { PreviewMode } from '@/services/preview/previewTypes';

interface PreviewBlockProps {
  block: Block;
  mode: PreviewMode;
  assets: Asset[];
}

export function DocumentPreviewContent({
  document,
  assets,
  mode,
}: {
  document: Document;
  assets: Asset[];
  mode: PreviewMode;
}) {
  const pages = useMemo(() => buildPreviewPages(document), [document]);

  if (document.sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Nothing to preview yet
      </div>
    );
  }

  if (mode === 'pdf') {
    return (
      <div className="preview-pdf-canvas h-full overflow-auto p-6">
        <div className="mx-auto flex max-w-[816px] flex-col gap-6">
          {pages.map((page, index) => (
            <article key={`page-${index}`} className="preview-pdf-page">
              {index === 0 && document.metadata.title && (
                <h1 className="preview-doc-title">{document.metadata.title}</h1>
              )}
              {page.map((entry) => (
                <PreviewSectionPart key={entry.key} entry={entry} mode={mode} assets={assets} />
              ))}
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="preview-word-canvas h-full overflow-auto p-6">
      <article className="preview-word-page mx-auto">
        {document.metadata.title && (
          <h1 className="preview-doc-title">{document.metadata.title}</h1>
        )}
        {document.sections.map((section) => (
          <PreviewSection key={section.id} section={section} mode={mode} assets={assets} />
        ))}
      </article>
    </div>
  );
}

type PreviewEntry =
  | { key: string; kind: 'section-title'; title: string }
  | { key: string; kind: 'block'; block: Block };

function PreviewSection({
  section,
  mode,
  assets,
}: {
  section: Section;
  mode: PreviewMode;
  assets: Asset[];
}) {
  return (
    <section className="preview-section">
      <h2 className="preview-section-title">{section.title}</h2>
      {section.blocks.filter((b) => b.properties.visible).map((block) => (
        <PreviewBlock key={block.id} block={block} mode={mode} assets={assets} />
      ))}
    </section>
  );
}

function PreviewSectionPart({
  entry,
  mode,
  assets,
}: {
  entry: PreviewEntry;
  mode: PreviewMode;
  assets: Asset[];
}) {
  if (entry.kind === 'section-title') {
    return <h2 className="preview-section-title">{entry.title}</h2>;
  }
  return <PreviewBlock block={entry.block} mode={mode} assets={assets} />;
}

function buildPreviewPages(document: Document): PreviewEntry[][] {
  const pages: PreviewEntry[][] = [[]];

  for (const section of document.sections) {
    pages[pages.length - 1]!.push({
      key: `section-${section.id}`,
      kind: 'section-title',
      title: section.title,
    });

    for (const block of section.blocks) {
      if (!block.properties.visible) continue;
      if (block.type === 'pageBreak') {
        pages.push([]);
        continue;
      }
      pages[pages.length - 1]!.push({ key: block.id, kind: 'block', block });
    }
  }

  return pages.filter((page) => page.length > 0);
}

function PreviewBlock({ block, mode, assets }: PreviewBlockProps) {
  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.content.level, 1), 6);
      return createElement(
        `h${level}`,
        { className: `preview-heading preview-heading-${level}` },
        block.content.text || 'Untitled Heading',
      );
    }
    case 'paragraph':
      return (
        <p
          className={`preview-paragraph${block.content.alignment === 'center' ? ' text-center' : ''}`}
        >
          {block.content.text || '\u00A0'}
        </p>
      );
    case 'quote':
      return <blockquote className="preview-quote">{block.content.text}</blockquote>;
    case 'code':
      return (
        <pre className="preview-code">
          <code>{block.content.code}</code>
        </pre>
      );
    case 'bulletList':
      return (
        <ul className="preview-list preview-list-bullet">
          {block.content.items.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      );
    case 'numberedList':
      return (
        <ol className="preview-list preview-list-numbered">
          {block.content.items.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ol>
      );
    case 'checklist':
      return (
        <ul className="preview-list preview-list-check">
          {block.content.items.map((item) => (
            <li key={item.id}>
              {item.checked ? '☑' : '☐'} {item.text}
            </li>
          ))}
        </ul>
      );
    case 'equation':
      return <PreviewEquation latex={block.content.latex} />;
    case 'horizontalRule':
      return mode === 'pdf' ? <hr className="preview-hr" /> : <hr className="preview-hr preview-hr-word" />;
    case 'pageBreak':
      return mode === 'word' ? <div className="preview-page-break-label">Page Break</div> : null;
    case 'figure':
      return <PreviewFigure block={block} assets={assets} />;
    case 'table':
      return (
        <div className="preview-table-wrap">
          {block.content.caption && (
            <div className="preview-table-caption">{block.content.caption}</div>
          )}
          <table className={`preview-table${block.content.borders ? ' preview-table-bordered' : ''}`}>
            <tbody>
              {block.content.rows.map((row, ri) => (
                <tr key={row.id}>
                  {block.content.columns.map((col, ci) => {
                    if (isCellHidden(block.content, ri, ci)) return null;
                    const cell = block.content.cells.find((c) => c.row === ri && c.col === ci);
                    const isHeader = block.content.headerRow && ri === 0;
                    return (
                      <td
                        key={col.id}
                        colSpan={cell?.colSpan ?? 1}
                        rowSpan={cell?.rowSpan ?? 1}
                        className={isHeader ? 'preview-table-header' : undefined}
                      >
                        {getCellValue(block.content, ri, ci)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function PreviewEquation({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      return latex;
    }
  }, [latex]);

  return <div className="preview-equation" dangerouslySetInnerHTML={{ __html: html }} />;
}

function PreviewFigure({
  block,
  assets,
}: {
  block: Extract<Block, { type: 'figure' }>;
  assets: Asset[];
}) {
  const asset = assets.find((a) => a.id === block.content.assetId);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!asset?.localPath) {
      setSrc(null);
      return;
    }
    readAssetAsDataUrl(asset.localPath).then(setSrc).catch(() => setSrc(null));
  }, [asset?.localPath]);

  const alignStyle =
    block.content.alignment === 'left'
      ? { marginRight: 'auto' }
      : block.content.alignment === 'right'
        ? { marginLeft: 'auto' }
        : { marginInline: 'auto' };

  return (
    <figure className="preview-figure" style={{ width: `${block.content.widthPercent}%`, ...alignStyle }}>
      {block.content.captionPosition === 'above' && block.content.caption && (
        <figcaption className="preview-figure-caption">{block.content.caption}</figcaption>
      )}
      <div className="preview-figure-frame">
        {src ? (
          <img src={src} alt={block.content.caption || asset?.filename || 'Figure'} className="preview-figure-img" />
        ) : (
          <span className="preview-figure-placeholder">
            {asset ? 'Loading image…' : 'Figure placeholder'}
          </span>
        )}
      </div>
      {block.content.captionPosition === 'below' && block.content.caption && (
        <figcaption className="preview-figure-caption">{block.content.caption}</figcaption>
      )}
    </figure>
  );
}
