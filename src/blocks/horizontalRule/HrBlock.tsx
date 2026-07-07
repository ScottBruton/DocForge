import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';

export function HrRenderer({ isSelected }: BlockRendererProps) {
  return <hr className={`my-4 border-zinc-700 ${isSelected ? 'ring-1 ring-blue-500/50' : ''}`} />;
}

export function HrEditor(props: BlockEditorProps) {
  return <HrRenderer {...props} block={props.block} />;
}
