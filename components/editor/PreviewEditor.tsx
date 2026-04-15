"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Link as LinkIcon,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from 'lucide-react';
import { cn, cleanHtml, stripHtml } from '@/lib/utils';
import { useEffect } from 'react';

interface PreviewEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  style?: React.CSSProperties;
  singleLine?: boolean;
}

export function PreviewEditor({ content, onChange, className, style, singleLine }: PreviewEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        codeBlock: false,
      }),
      Link.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    immediatelyRender: false,
    content: content,
    editorProps: {
      handleKeyDown: (view, event) => {
        if (singleLine && event.key === 'Enter') {
          return true;
        }
        return false;
      },
      attributes: {
        class: cn(
          "focus:outline-none min-h-[1em]",
          singleLine ? "whitespace-nowrap overflow-hidden" : "",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (singleLine) {
        onChange(stripHtml(html));
      } else {
        onChange(cleanHtml(html));
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <>
      <BubbleMenu 
        editor={editor} 
        className="flex bg-white border rounded-lg shadow-2xl p-1 gap-0.5 overflow-hidden z-[100]"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-7 w-7 p-0", editor.isActive('bold') && "bg-slate-100 text-primary")}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-7 w-7 p-0", editor.isActive('italic') && "bg-slate-100 text-primary")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn("h-7 w-7 p-0", editor.isActive('underline') && "bg-slate-100 text-primary")}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = prompt('Enter URL:', editor.getAttributes('link').href || '');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
          }}
          className={cn("h-7 w-7 p-0", editor.isActive('link') && "bg-slate-100 text-primary")}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        
        <div className="w-px h-4 bg-slate-200 self-center mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: 'left' }) && "bg-slate-100 text-primary")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: 'center' }) && "bg-slate-100 text-primary")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: 'right' }) && "bg-slate-100 text-primary")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-slate-200 self-center mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const color = prompt('Color (hex):', '#2563eb');
            if (color) editor.chain().focus().setColor(color).run();
          }}
          className="h-7 w-7 p-0"
        >
          <Palette className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().deleteSelection().run()}
          className="h-7 w-7 p-0 text-destructive hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </BubbleMenu>
      <EditorContent editor={editor} style={style} />
    </>
  );
}
