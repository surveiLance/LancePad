"use client";

import { useState } from "react";
import { NOTEBOOK_COLORS, NOTEBOOK_EMOJIS, randomFrom } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface Folder { _id: Id<"folders">; name: string; emoji: string; color: string; }

interface CreateNotebookModalProps {
  onClose: () => void;
  onCreate: (title: string, color: string, emoji: string, folderId?: Id<"folders">) => Promise<void>;
  folders?: Folder[];
  defaultFolderId?: Id<"folders">;
}

export default function CreateNotebookModal({ onClose, onCreate, folders = [], defaultFolderId }: CreateNotebookModalProps) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(randomFrom(NOTEBOOK_COLORS));
  const [emoji, setEmoji] = useState(randomFrom(NOTEBOOK_EMOJIS));
  const [folderId, setFolderId] = useState<Id<"folders"> | undefined>(defaultFolderId);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onCreate(title.trim(), color, emoji, folderId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">New Notebook</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Philippine History Q3"
              autoFocus
              required
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
              Icon
            </label>
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

          {/* Color */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
              Color
            </label>
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

          {/* Folder */}
          {folders.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Folder (optional)</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFolderId(undefined)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${!folderId ? "border-purple-500 bg-purple-600/20 text-purple-300" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}>
                  No folder
                </button>
                {folders.map((f) => (
                  <button key={f._id} type="button" onClick={() => setFolderId(f._id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-1.5 ${folderId === f._id ? "border-purple-500 bg-purple-600/20 text-purple-300" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}>
                    <span>{f.emoji}</span>{f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview + submit */}
          <div
            className="rounded-2xl overflow-hidden border border-gray-700 mt-2"
            style={{ borderTopColor: color, borderTopWidth: 4 }}
          >
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <div>
                <span className="font-semibold text-white">{title || "Notebook title"}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Notebook"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
