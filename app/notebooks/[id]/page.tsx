"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, BookOpen, MessageCircle, Save, Loader2, FileText, Trash2, X, ClipboardList, Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NoteEditor from "@/components/NoteEditor";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import { setNoteContent as pushNoteContent } from "@/lib/lancebot-store";

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  short_answer: "Short Answer",
  flashcard: "Flashcard",
};

const TYPE_COLOR: Record<string, string> = {
  multiple_choice: "bg-purple-900/60 text-purple-300 border-purple-700/40",
  fill_blank: "bg-blue-900/60 text-blue-300 border-blue-700/40",
  short_answer: "bg-amber-900/60 text-amber-300 border-amber-700/40",
  flashcard: "bg-green-900/60 text-green-300 border-green-700/40",
};

const QUIZ_TYPES = [
  { type: "multiple_choice", label: "Multiple Choice", desc: "4 options, one correct answer", icon: "🔘" },
  { type: "identification", label: "Identification", desc: "Type the exact answer", icon: "✏️" },
  { type: "fill_blank", label: "Fill in the Blank", desc: "Complete the missing word", icon: "📝" },
];

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const note = useQuery(api.notes.getByNotebook, { notebookId });
  const cards = useQuery(api.cards.getByNotebook, { notebookId });
  const saveNote = useMutation(api.notes.save);
  const removeCard = useMutation(api.cards.remove);
  const addCard = useMutation(api.cards.add);

  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState<"cards" | "quiz" | null>(null);
  const [view, setView] = useState<"notes" | "cards">("notes");
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [botHovering, setBotHovering] = useState(false);
  const [botMuted, setBotMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInstruction, setHelpInstruction] = useState("");
  const [helpResponse, setHelpResponse] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);

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

  useEffect(() => { return () => pushNoteContent(""); }, []);
  useEffect(() => { if (notebook === null) router.push("/notebooks"); }, [notebook, router]);

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

  async function generate(mode: "cards" | "quiz", quizType?: string) {
    if (!noteContent || noteContent.length < 10) {
      alert("Add some notes first — LanceBot needs something to work with! 📝");
      return;
    }
    setGenerating(mode);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, noteContent, notebookTitle: notebook?.title, mode, quizType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (mode === "quiz") {
        router.push(`/notebooks/${notebookId}/study?session=${data.sessionId}`);
      } else {
        setView("cards");
      }
    } catch {
      alert("Something went wrong. Try again!");
    } finally {
      setGenerating(null);
    }
  }

  const sortedCards = [...(cards ?? [])].sort((a, b) => {
    if (a.isManual && !b.isManual) return -1;
    if (!a.isManual && b.isManual) return 1;
    return 0;
  });
  const cardCount = sortedCards.length;

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
          <div className="flex items-center gap-2">
            <Link href={`/notebooks/${notebookId}/quizzes`}>
              <Button size="sm" variant="secondary"><ClipboardList size={13} />Quizzes</Button>
            </Link>
            {cardCount > 0 && (
              <Link href={`/notebooks/${notebookId}/tutor`}>
                <Button size="sm" variant="secondary"><MessageCircle size={13} />Tutor</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full px-4 py-5 gap-4">

        {/* Action buttons + view toggle */}
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => setShowQuizPicker(true)}
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
          {cardCount > 0 && (
            <button
              onClick={() => setView(v => v === "notes" ? "cards" : "notes")}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold border transition-all hover:-translate-y-0.5 ${
                view === "cards"
                  ? "bg-amber-600/20 border-amber-600/40 text-amber-300"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {view === "cards" ? <FileText size={15} /> : <Zap size={15} className="text-yellow-400" />}
              {view === "cards" ? "Notes" : `${cardCount} Cards`}
            </button>
          )}
        </div>

        {/* Main content area */}
        {view === "notes" ? (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
              <NoteEditor content={noteContent} onChange={handleNoteChange} />
            </div>
            {cardCount === 0 && (
              <button
                onClick={() => { setView("cards"); setShowAddCard(true); }}
                className="flex-shrink-0 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-gray-700 hover:border-purple-600/60 text-gray-500 hover:text-purple-400 text-sm font-semibold transition-all hover:bg-purple-950/10"
              >
                <Plus size={15} />
                Add cards
              </button>
            )}
          </div>
        ) : cardCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <LanceBot mood="sad" size={64} />
            <div>
              <p className="text-white font-semibold mb-1">No cards left</p>
              <p className="text-gray-500 text-sm">Generate new ones or go back to your notes.</p>
            </div>
            <button
              onClick={() => setView("notes")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-semibold transition-all"
            >
              <FileText size={14} />
              Back to Notes
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
            {sortedCards.map((card, i) => (
              <div
                key={card._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 bounce-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${TYPE_COLOR[card.type]}`}>
                    {TYPE_LABEL[card.type]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">#{i + 1}</span>
                    <button
                      onClick={() => removeCard({ id: card._id }).catch(() => {})}
                      className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-white text-sm font-medium mb-3 leading-relaxed">{card.question}</p>

                {card.type === "multiple_choice" && card.options && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {card.options.map((opt, j) => (
                      <div
                        key={j}
                        className={`px-3 py-2 rounded-xl text-xs border ${
                          opt === card.answer
                            ? "bg-green-900/40 border-green-600/50 text-green-300"
                            : "bg-gray-800/60 border-gray-700/60 text-gray-400"
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {card.type !== "multiple_choice" && (
                  <div>
                    <div className="flex items-center gap-2 my-2">
                      <div className="h-px flex-1 bg-gray-800" />
                      <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Answer</span>
                      <div className="h-px flex-1 bg-gray-800" />
                    </div>
                    <div className="px-3 py-2 bg-purple-950/40 border border-purple-700/30 rounded-xl text-sm text-purple-200 leading-relaxed">
                      {card.answer}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add card manually */}
            {showAddCard ? (
              <div className="bg-gray-900 border border-purple-700/40 rounded-2xl p-4 space-y-3 bounce-in">
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">New Flashcard</p>
                <textarea
                  placeholder="Question..."
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none resize-none transition-colors"
                />
                <textarea
                  placeholder="Answer..."
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none resize-none transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!newQ.trim() || !newA.trim()) return;
                      await addCard({ notebookId, question: newQ.trim(), answer: newA.trim() });
                      setNewQ(""); setNewA(""); setShowAddCard(false);
                    }}
                    disabled={!newQ.trim() || !newA.trim()}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    Add Card
                  </button>
                  <button
                    onClick={() => { setShowAddCard(false); setNewQ(""); setNewA(""); }}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCard(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 hover:border-purple-600/60 text-gray-500 hover:text-purple-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-purple-950/10"
              >
                <Plus size={15} />
                Add card manually
              </button>
            )}
          </div>
        )}

      </div>

      {/* Help panel */}
      {helpOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-80 bg-gray-900 border border-purple-800/50 rounded-2xl shadow-2xl overflow-hidden bounce-in">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-purple-300">✏️ Ask LanceBot</span>
            <button onClick={() => { setHelpOpen(false); setHelpResponse(""); setHelpInstruction(""); }} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
          <div className="p-3 space-y-2">
            <textarea
              placeholder="What do you need help with?"
              value={helpInstruction}
              onChange={(e) => setHelpInstruction(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!helpInstruction.trim() || helpLoading) return;
                  setHelpLoading(true); setHelpResponse("");
                  const res = await fetch("/api/lancebot-help", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ instruction: helpInstruction, noteContent, pageContext: "their notebook notes page" }),
                  });
                  const reader = res.body?.getReader(); const dec = new TextDecoder();
                  let full = "";
                  while (reader) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    full += dec.decode(value, { stream: true });
                    setHelpResponse(full);
                  }
                  setHelpLoading(false);
                }
              }}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
            />
            {helpResponse && (
              <div className="bg-gray-800/80 rounded-xl px-3 py-2.5 text-sm text-gray-200 max-h-52 overflow-y-auto leading-relaxed whitespace-pre-wrap">{helpResponse}</div>
            )}
            <p className="text-[10px] text-gray-600">Press Enter to ask</p>
          </div>
        </div>
      )}

      {/* LanceBot — fixed bottom left with hover menu */}
      <div
        className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2"
        onMouseEnter={() => setBotHovering(true)}
        onMouseLeave={() => setBotHovering(false)}
      >
        {botHovering && (
          <div className="flex flex-col gap-1.5" style={{ animation: "bubble-in 0.15s ease-out" }}>
            <button
              onClick={() => { setHelpOpen((o) => !o); setBotHovering(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800/70 border border-purple-700/60 text-xs text-purple-200 font-medium transition-colors"
            >
              ✏️ Help
            </button>
            <button
              onClick={() => setBotMuted((m) => !m)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 font-medium transition-colors"
            >
              {botMuted ? "🔊 Unmute" : "🤐 Quiet"}
            </button>
          </div>
        )}
        <LanceBot
          mood={botMuted ? "muted" : generating ? "thinking" : cardCount > 0 ? "happy" : "idle"}
          size={52}
          animate={!botMuted}
        />
      </div>

      {/* Quiz type picker modal */}
      {showQuizPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowQuizPicker(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-80 mx-4 bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-lg">Choose Quiz Type</h3>
              <button onClick={() => setShowQuizPicker(false)} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-5">How do you want to be tested?</p>
            <div className="space-y-3">
              {QUIZ_TYPES.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setShowQuizPicker(false); generate("quiz", opt.type); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-600/50 text-left transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{opt.label}</p>
                    <p className="text-gray-500 text-xs">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
