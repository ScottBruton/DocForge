import { useAssetStore } from '@/stores';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { FigureBlock } from '@/schema';
import { ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readAssetAsDataUrl } from '@/services/AssetService';

export function FigureRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'figure') return null;
  return <FigureView block={block as FigureBlock} isSelected={isSelected} />;
}

export function FigureEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'figure') return null;
  return <FigureView block={block as FigureBlock} isSelected={isSelected} onUpdate={onUpdate} editable />;
}

function FigureView({
  block,
  isSelected,
  onUpdate,
  editable,
}: {
  block: FigureBlock;
  isSelected: boolean;
  onUpdate?: BlockEditorProps['onUpdate'];
  editable?: boolean;
}) {
  const asset = useAssetStore((s) => s.getAssetById(block.content.assetId ?? ''));
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!asset?.localPath) {
      setSrc(null);
      return;
    }
    readAssetAsDataUrl(asset.localPath).then(setSrc).catch(() => setSrc(null));
  }, [asset?.localPath]);

  const alignClass =
    block.content.alignment === 'left'
      ? 'mr-auto'
      : block.content.alignment === 'right'
        ? 'ml-auto'
        : 'mx-auto';

  return (
    <figure
      className={`${alignClass} ${isSelected ? 'ring-1 ring-blue-500/50 rounded p-2' : ''}`}
      style={{ width: `${block.content.widthPercent}%`, maxWidth: block.content.maxWidthMm ? `${block.content.maxWidthMm}mm` : undefined }}
    >
      {block.content.captionPosition === 'above' && (
        editable ? (
          <input
            className="mb-2 w-full bg-transparent text-center text-sm italic text-zinc-400 outline-none"
            value={block.content.caption}
            onChange={(e) => onUpdate?.({ content: { ...block.content, caption: e.target.value } })}
            placeholder="Caption"
          />
        ) : (
          <figcaption className="mb-2 text-center text-sm italic text-zinc-400">{block.content.caption}</figcaption>
        )
      )}
      <div className="flex min-h-[120px] items-center justify-center rounded border border-zinc-700 bg-zinc-900/50">
        {src ? (
          <img src={src} alt={block.content.caption || asset?.filename || 'Figure'} className="max-h-64 max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <ImageIcon size={32} />
            <span className="text-xs">{asset ? 'Loading...' : 'No asset assigned'}</span>
          </div>
        )}
      </div>
      {block.content.captionPosition === 'below' && (
        editable ? (
          <input
            className="mt-2 w-full bg-transparent text-center text-sm italic text-zinc-400 outline-none"
            value={block.content.caption}
            onChange={(e) => onUpdate?.({ content: { ...block.content, caption: e.target.value } })}
            placeholder="Caption"
          />
        ) : (
          <figcaption className="mt-2 text-center text-sm italic text-zinc-400">{block.content.caption}</figcaption>
        )
      )}
    </figure>
  );
}
