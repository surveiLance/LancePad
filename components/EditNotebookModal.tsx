"use client";

import { useState } from "react";
import { NOTEBOOK_COLORS, NOTEBOOK_EMOJIS } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X } from "lucide-react";

interface EditNotebookModalProps {
  notebook: { id: string; title: string; color: string; emoji: string };
  onClose: () => void;
  onSave: (id: string, title: string, color: string, emoji: string) => Promise<void>;
}

export default function EditNotebookModal({ notebook, onClose, onSave }: EditNotebookModalProps) {
  const [title, setTitle] = useState(notebook.title);
  const [color, setColor] = useState(notebook.color);
  const [emoji, setEmoji] = useState(notebook.emoji);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onSave(notebook.id, title.trim(), color, emoji);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Edit Notebook</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notebook title"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {NOTEBOOK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    emoji === e
                      ? "bg-purple-600/30 border-2 border-purple-500"
                      : "border-2 border-transparent hover:bg-gray-800"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {NOTEBOOK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl overflow-hidden border border-gray-700 mt-2"
            style={{ borderTopColor: color, borderTopWidth: 4 }}
          >
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <span className="font-semibold text-white">{title || "Notebook title"}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading || !title.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
