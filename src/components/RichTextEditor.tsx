'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Redo, Undo } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write something...',
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable,
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] px-3 py-2 text-sm text-slate-900 focus:outline-none dark:text-slate-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  if (!editor) return null;

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullet list' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered list' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, label: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, label: 'Redo' },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      {editable && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-700">
          {tools.map(({ icon: Icon, action, active, label }) => (
            <Button
              key={label}
              type="button"
              variant={active ? 'secondary' : 'ghost'}
              size="icon"
              onClick={action}
              aria-label={label}
              className="h-8 w-8"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}
      <div className="relative">
        {!editor.getText() && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
