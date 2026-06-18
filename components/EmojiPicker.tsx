"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  emojis: string[];
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ emojis, value, onChange }: EmojiPickerProps) {
  const [customEmoji, setCustomEmoji] = useState(emojis.includes(value) ? "" : value);

  function handleCustomChange(nextValue: string) {
    const nextEmoji = nextValue.trim().slice(0, 8);
    setCustomEmoji(nextEmoji);
    if (nextEmoji) onChange(nextEmoji);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              setCustomEmoji("");
              onChange(emoji);
            }}
            className={cn(
              "text-2xl p-2 rounded-xl border-2 transition-all",
              value === emoji
                ? "bg-purple-600/30 border-purple-500"
                : "border-transparent hover:bg-gray-800",
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950/60 px-3 py-2 focus-within:border-purple-500/60 transition-colors">
        <span className="text-xl leading-none">{customEmoji || value}</span>
        <input
          value={customEmoji}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Add custom emoji"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
        />
      </div>
    </div>
  );
}
