"use client";

import Link from "next/link";
import { Trash2, ArrowUpRight, FolderInput, Pencil } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Folder { _id: string; name: string; emoji: string; color: string; }

interface NotebookCardProps {
  notebook: {
    id: string;
    title: string;
    color: string;
    emoji: string;
    created_at: string;
    card_count?: number;
    folderId?: string;
  };
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  folders?: Folder[];
  onMoveToFolder?: (notebookId: string, folderId: string | undefined) => void;
}

export default function NotebookCard({ notebook, onDelete, onEdit, folders = [], onMoveToFolder }: NotebookCardProps) {
  const date = new Date(Number(notebook.created_at)).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowFolderMenu(false);
    }
    if (showFolderMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFolderMenu]);

  return (
    <div className="group relative rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
      style={{ boxShadow: `0 0 0 1px ${notebook.color}22` }}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at top left, ${notebook.color}, transparent 65%)` }}
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at bottom right, ${notebook.color}, transparent 65%)` }}
      />

      <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-3xl border border-white/5 group-hover:border-white/10 transition-all duration-300">
        {/* Top glow bar */}
        <div
          className="h-1 w-full rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, ${notebook.color}, ${notebook.color}88)` }}
        />

        <Link href={`/notebooks/${notebook.id}`} className="block p-6">
          {/* Emoji bubble */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{
              background: `${notebook.color}20`,
              border: `1.5px solid ${notebook.color}50`,
              boxShadow: `0 4px 20px ${notebook.color}30`,
            }}
          >
            {notebook.emoji}
          </div>

          <h3 className="font-bold text-white text-xl leading-tight mb-2 truncate">
            {notebook.title}
          </h3>
          <p className="text-gray-500 text-sm">{date}</p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5">
            {notebook.card_count !== undefined && notebook.card_count > 0 ? (
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: `${notebook.color}20`, color: notebook.color, border: `1px solid ${notebook.color}40` }}
              >
                {notebook.card_count} {notebook.card_count === 1 ? "card" : "cards"}
              </span>
            ) : (
              <span className="text-xs text-gray-600 font-medium">No cards yet</span>
            )}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0"
              style={{ background: `${notebook.color}30`, color: notebook.color }}
            >
              <ArrowUpRight size={14} />
            </div>
          </div>
        </Link>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); onEdit(notebook.id); }}
              className="p-2 rounded-xl text-gray-500 hover:text-blue-400 hover:bg-blue-950/50"
              title="Edit notebook"
            >
              <Pencil size={15} />
            </button>
          )}
          {folders.length > 0 && onMoveToFolder && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.preventDefault(); setShowFolderMenu((v) => !v); }}
                className="p-2 rounded-xl text-gray-500 hover:text-purple-400 hover:bg-purple-950/50"
                title="Move to folder"
              >
                <FolderInput size={15} />
              </button>
              {showFolderMenu && (
                <div className="absolute right-0 top-9 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[160px] bounce-in">
                  {notebook.folderId && (
                    <button
                      onClick={(e) => { e.preventDefault(); onMoveToFolder(notebook.id, undefined); setShowFolderMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 flex items-center gap-2"
                    >
                      Remove from folder
                    </button>
                  )}
                  {folders.map((f) => (
                    <button
                      key={f._id}
                      onClick={(e) => { e.preventDefault(); onMoveToFolder(notebook.id, f._id); setShowFolderMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 flex items-center gap-2 ${notebook.folderId === f._id ? "text-purple-400" : "text-gray-200"}`}
                    >
                      <span>{f.emoji}</span>{f.name}
                      {notebook.folderId === f._id && <span className="ml-auto text-purple-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); onDelete(notebook.id); }}
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-950/50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
