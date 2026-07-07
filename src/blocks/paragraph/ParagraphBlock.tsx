import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import type { BlockEditorProps, BlockRendererProps } from '@/registry/types';
import type { ParagraphBlock } from '@/schema';

function useParagraphEditor(block: ParagraphBlock, onUpdate: BlockEditorProps['onUpdate'], editable: boolean) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing...' }),
    ],
    content: block.content.tiptap ?? (block.content.text ? `<p>${block.content.text}</p>` : ''),
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate({
        content: {
          ...block.content,
          text: ed.getText(),
          tiptap: ed.getJSON() as Record<string, unknown>,
        },
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  return editor;
}

export function ParagraphRenderer({ block, isSelected }: BlockRendererProps) {
  if (block.type !== 'paragraph') return null;
  const b = block as ParagraphBlock;
  return (
    <div className={`text-zinc-300 ${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}>
      {b.content.text || <span className="text-zinc-600 italic">Empty paragraph</span>}
    </div>
  );
}

export function ParagraphEditor({ block, isSelected, onUpdate }: BlockEditorProps) {
  if (block.type !== 'paragraph') return null;
  const b = block as ParagraphBlock;
  const editor = useParagraphEditor(b, onUpdate, true);

  return (
    <div className={`${isSelected ? 'ring-1 ring-blue-500/50 rounded px-1' : ''}`}>
      <EditorContent editor={editor} className="prose prose-invert max-w-none text-sm" />
    </div>
  );
}
