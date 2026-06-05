"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";

interface SummaryModalProps {
  notebookTitle: string;
  noteContent: string;
  username: string | null;
  onClose: () => void;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm text-gray-200 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-white mt-3 text-base">{line.slice(3)}</h3>;
        if (line.startsWith("# "))  return <h2 key={i} className="font-bold text-white mt-3 text-lg">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2">
            <span className="text-purple-400 flex-shrink-0 mt-0.5">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function SummaryModal({ notebookTitle, noteContent, username, onClose }: SummaryModalProps) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteContent, notebookTitle, username }),
        });
        const { summary: s } = await res.json();
        if (!s) throw new Error();
        setSummary(s);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [noteContent, notebookTitle, username]);

  function handleCopy() {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh] bounce-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Summary</h2>
            <p className="text-gray-500 text-xs mt-0.5">{notebookTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1.5 rounded-lg transition-all">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="text-purple-400 animate-spin" />
              <p className="text-gray-500 text-sm">LanceBot is reading your notes...</p>
            </div>
          )}
          {error && (
            <p className="text-red-400 text-sm text-center py-8">Couldn't generate a summary — try again.</p>
          )}
          {summary && <MarkdownText text={summary} />}
        </div>
      </div>
    </div>
  );
}
