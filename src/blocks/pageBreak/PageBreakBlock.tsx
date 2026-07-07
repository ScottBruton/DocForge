import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';

export function PageBreakRenderer({ isSelected }: BlockRendererProps) {
  return (
    <div className={`my-4 flex items-center gap-2 ${isSelected ? 'ring-1 ring-blue-500/50 rounded' : ''}`}>
      <div className="h-px flex-1 border-t border-dashed border-zinc-600" />
      <span className="text-xs text-zinc-500">Page Break</span>
      <div className="h-px flex-1 border-t border-dashed border-zinc-600" />
    </div>
  );
}

export function PageBreakEditor(props: BlockEditorProps) {
  return <PageBreakRenderer {...props} block={props.block} />;
}
