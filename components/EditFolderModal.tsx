"use client";

import { useState } from "react";
import { NOTEBOOK_COLORS } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EmojiPicker from "@/components/EmojiPicker";
import { X } from "lucide-react";

interface EditFolderModalProps {
  folder: { id: string; name: string; color: string; emoji: string };
  onClose: () => void;
  onSave: (id: string, name: string, color: string, emoji: string) => Promise<void>;
}

const FOLDER_EMOJIS = ["📁", "📚", "🧪", "🔬", "📐", "🧮", "🌍", "🏛️", "💻", "🎨", "🎵", "⚽", "🧬", "📊", "✏️", "🔭"];

export default function EditFolderModal({ folder, onClose, onSave }: EditFolderModalProps) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color);
  const [emoji, setEmoji] = useState(folder.emoji);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSave(folder.id, name.trim(), color, emoji);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Edit Folder</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Biology, Math 101" autoFocus required />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Icon</label>
            <EmojiPicker emojis={FOLDER_EMOJIS} value={emoji} onChange={setEmoji} />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {NOTEBOOK_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-700 p-4 flex items-center gap-3" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
            <span className="text-2xl">{emoji}</span>
            <span className="font-semibold text-white">{name || "Folder name"}</span>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
