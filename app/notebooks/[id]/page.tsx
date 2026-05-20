"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, BookOpen, MessageCircle, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NoteEditor from "@/components/NoteEditor";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import { setNoteContent as pushNoteContent } from "@/lib/lancebot-store";

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const note = useQuery(api.notes.getByNotebook, { notebookId });
  const cards = useQuery(api.cards.getByNotebook, { notebookId });
  const saveNote = useMutation(api.notes.save);

  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState<"cards" | "quiz" | null>(null);

  function handleNoteChange(content: string) {
    setNoteContent(content);
    pushNoteContent(content);
  }

  const noteLoaded = useRef(false);
  useEffect(() => {
    if (note?.content !== undefined && !noteLoaded.current) {
      noteLoaded.current = true;
      setNoteContent(note.content);
      pushNoteContent(note.content);
    }
  }, [note?.content]);

  useEffect(() => {
    return () => pushNoteContent("");
  }, []);

  useEffect(() => {
    if (notebook === null) router.push("/notebooks");
  }, [notebook, router]);

  const handleSave = useCallback(async (content: string) => {
    setSaving(true);
    await saveNote({ notebookId, content });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [notebookId, saveNote]);

  useEffect(() => {
    if (!noteContent) return;
    const timer = setTimeout(() => handleSave(noteContent), 1500);
    return () => clearTimeout(timer);
  }, [noteContent, handleSave]);

  async function generate(mode: "cards" | "quiz") {
    if (!noteContent || noteContent.length < 10) {
      alert("Add some notes first — LanceBot needs something to work with! 📝");
      return;
    }
    setGenerating(mode);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, noteContent, notebookTitle: notebook?.title, mode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (mode === "quiz") {
        router.push(`/notebooks/${notebookId}/study`);
      } else {
        alert(`LanceBot cooked up ${data.count} cards! 🎉`);
      }
    } catch {
      alert("Something went wrong. Try again!");
    } finally {
      setGenerating(null);
    }
  }

  const cardCount = cards?.length ?? 0;

  const botMood = generating ? "thinking" : cardCount > 0 ? "happy" : "idle";
  const botMessage = generating
    ? "Cooking up your cards... 🍳"
    : cardCount > 0
    ? `${cardCount} cards ready! Let's study 🎯`
    : null;

  if (notebook === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LanceBot mood="thinking" size={60} />
      </div>
    );
  }

  if (notebook === null) return null;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/notebooks" className="text-gray-500 hover:text-gray-300 flex items-center gap-1.5 text-sm">
            <ArrowLeft size={15} />
            Back
          </Link>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: notebook.color }} />
          <span className="text-white font-semibold truncate flex-1 text-sm">
            {notebook.emoji} {notebook.title}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {saving ? <><Loader2 size={11} className="animate-spin" /> Saving...</> :
             saved  ? <><Save size={11} className="text-green-400" /> Saved</>  : null}
          </div>
          {cardCount > 0 && (
            <div className="flex items-center gap-2">
              <Link href={`/notebooks/${notebookId}/study`}>
                <Button size="sm"><BookOpen size={13} />Study</Button>
              </Link>
              <Link href={`/notebooks/${notebookId}/tutor`}>
                <Button size="sm" variant="secondary"><MessageCircle size={13} />Tutor</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full px-4 py-5 gap-4">

        {/* Action buttons */}
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => generate("quiz")}
            disabled={!!generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-900/40 hover:-translate-y-0.5"
          >
            {generating === "quiz" ? <Loader2 size={15} className="animate-spin" /> : <BookOpen size={15} />}
            Generate Quiz
          </button>
          <button
            onClick={() => generate("cards")}
            disabled={!!generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm border border-gray-700 transition-all hover:-translate-y-0.5"
          >
            {generating === "cards" ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className="text-yellow-400" />}
            Generate Cards
          </button>
        </div>

        {/* Notes box — scrolls internally */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <NoteEditor content={noteContent} onChange={handleNoteChange} />
        </div>

        {/* LanceBot — standalone, speech bubble on right */}
        <div className="flex-shrink-0 flex items-end gap-3 pb-1">
          <LanceBot mood={botMood} size={52} animate={!!generating} />
          {botMessage && (
            <div className="relative bg-gray-900 border border-purple-800/50 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-purple-100 leading-snug shadow-lg" style={{ animation: "bubble-in 0.3s ease-out" }}>
              {botMessage}
              <div className="absolute -left-1.5 bottom-3 w-3 h-3 bg-gray-900 border-l border-b border-purple-800/50 rotate-45" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
