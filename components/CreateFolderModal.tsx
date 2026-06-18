"use client";

import { useState } from "react";
import { NOTEBOOK_COLORS, randomFrom } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EmojiPicker from "@/components/EmojiPicker";
import { X } from "lucide-react";

interface CreateFolderModalProps {
  onClose: () => void;
  onCreate: (name: string, color: string, emoji: string) => Promise<void>;
}

const FOLDER_EMOJIS = ["📁", "📚", "🧪", "🔬", "📐", "🧮", "🌍", "🏛️", "💻", "🎨", "🎵", "⚽", "🧬", "📊", "✏️", "🔭"];

export default function CreateFolderModal({ onClose, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(randomFrom(NOTEBOOK_COLORS));
  const [emoji, setEmoji] = useState(randomFrom(FOLDER_EMOJIS));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), color, emoji);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">New Folder</h2>
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
              {loading ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
