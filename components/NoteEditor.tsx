"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Quote, Minus, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  isPreview?: boolean;
}

function ToolbarBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        active
          ? "bg-purple-600 text-white"
          : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
      )}
    >
      {children}
    </button>
  );
}

export default function NoteEditor({ content, onChange, isPreview = false }: NoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing your notes here... paste your syllabus, copy from your textbook, jot down key points — Lance will handle the rest 🧠",
      }),
    ],
    content: content ? JSON.parse(content) : "",
    onUpdate({ editor }) {
      onChangeRef.current(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== content) {
      try {
        editor.commands.setContent(content ? JSON.parse(content) : "");
      } catch {}
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-800 bg-gray-950">
        <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} active={false}>
          <Undo2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} active={false}>
          <Redo2 size={15} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic size={15} />
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <ToolbarBtn title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false}>
          <Minus size={15} />
        </ToolbarBtn>
        {isPreview && (
          <span className="ml-auto text-xs text-purple-400 font-medium px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-800/50">
            preview
          </span>
        )}
      </div>

      {/* Editor */}
      <div className={cn("flex-1 overflow-y-auto px-5 py-4 transition-opacity duration-300", isPreview ? "opacity-40 pointer-events-none select-none" : "opacity-100")}>
        <div className="tiptap-editor max-w-2xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
