"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlock from "@tiptap/extension-code-block";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Undo, Redo, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  surfaceStyle?: "default" | "glass" | "neumorphic";
}

export function RichTextEditor({ content, onChange, placeholder = "Start writing...", surfaceStyle = "default" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default codeBlock to use our custom one
      }),
      CodeBlock,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      "flex flex-col h-full border border-border rounded-lg overflow-hidden shadow-sm",
      surfaceStyle === "glass" && "surface--glass",
      surfaceStyle === "neumorphic" && "surface--neumorphic",
      surfaceStyle === "default" && "border border-border/70 surface--default"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-transparent flex-wrap">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-7 w-7", editor.isActive("bold") && "bg-accent")}
          title="Bold"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-7 w-7", editor.isActive("italic") && "bg-accent")}
          title="Italic"
        >
          <Italic className="size-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("h-7 w-7", editor.isActive("heading", { level: 1 }) && "bg-accent")}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("h-7 w-7", editor.isActive("heading", { level: 2 }) && "bg-accent")}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn("h-7 w-7", editor.isActive("heading", { level: 3 }) && "bg-accent")}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("h-7 w-7", editor.isActive("bulletList") && "bg-accent")}
          title="Bullet List"
        >
          <List className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("h-7 w-7", editor.isActive("orderedList") && "bg-accent")}
          title="Numbered List"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("h-7 w-7", editor.isActive("blockquote") && "bg-accent")}
          title="Quote"
        >
          <Quote className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn("h-7 w-7", editor.isActive("codeBlock") && "bg-accent")}
          title="Code Block"
        >
          <Code className="size-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-7 w-7"
          title="Undo"
        >
          <Undo className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-7 w-7"
          title="Redo"
        >
          <Redo className="size-4" />
        </Button>
      </div>
      
      {/* Editor Content */}
      <div className={cn(
        "flex-1 overflow-y-auto bg-transparent"
      )}>
        <div className="h-full bg-transparent">
          <EditorContent editor={editor} className="h-full bg-transparent" />
        </div>
      </div>
    </div>
  );
}

