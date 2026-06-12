"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Quote, Minus, Undo2, Redo2, Highlighter, ImageIcon } from "lucide-react";
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

function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NoteEditor({ content, onChange, isPreview = false }: NoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing your notes here... paste your syllabus, copy from your textbook, jot down key points — Lance will handle the rest 🧠",
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Highlight.configure({ multicolor: false }),
    ],
    content: content ? JSON.parse(content) : "",
    onUpdate({ editor }) {
      onChangeRef.current(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: { class: "tiptap-editor" },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            imageToBase64(file).then((src) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src })
                )
              );
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    if (current !== content) {
      try {
        // emitUpdate:false prevents onUpdate from feeding back into noteContent state
        editor.commands.setContent(content ? JSON.parse(content) : "", { emitUpdate: false });
      } catch {}
    }
  }, [content, editor]);

  async function handleImageFile(file: File) {
    if (!editor) return;
    const src = await imageToBase64(file);
    editor.chain().focus().setImage({ src }).run();
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-800 bg-gray-950 flex-wrap">
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
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <ToolbarBtn title="Highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")}>
          <Highlighter size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Insert image" onClick={() => fileInputRef.current?.click()} active={false}>
          <ImageIcon size={15} />
        </ToolbarBtn>
        {isPreview && (
          <span className="ml-auto text-xs text-purple-400 font-medium px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-800/50">
            preview
          </span>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
      />

      {/* Editor */}
      <div className={cn("flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 transition-opacity duration-300", isPreview ? "opacity-40 pointer-events-none select-none" : "opacity-100")}>
        <div className="tiptap-editor w-full max-w-5xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
