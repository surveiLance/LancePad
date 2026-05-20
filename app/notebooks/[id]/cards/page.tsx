"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Loader2, Trash2, Plus, BookOpen, ClipboardList, X } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LanceBot from "@/components/LanceBot";
import LoadingScreen from "@/components/LoadingScreen";
import GroqUsageBadge from "@/components/GroqUsageBadge";
import { setGroqUsage } from "@/lib/groq-usage-store";

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
  { type: "multiple_choice", label: "Multiple Choice", desc: "Pick the right answer from 4 options", icon: "🔘" },
  { type: "identification",  label: "Identification",  desc: "Type the exact answer",              icon: "✏️" },
  { type: "fill_blank",      label: "Fill in the Blank", desc: "Complete the missing word",        icon: "📝" },
];

export default function CardsPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const note = useQuery(api.notes.getByNotebook, { notebookId });
  const cards = useQuery(api.cards.getByNotebook, { notebookId });
  const removeCard = useMutation(api.cards.remove);
  const addCard = useMutation(api.cards.add);

  const [generatingCards, setGeneratingCards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const sortedCards = [...(cards ?? [])].sort((a, b) => {
    if (a.isManual && !b.isManual) return -1;
    if (!a.isManual && b.isManual) return 1;
    return 0;
  });

  function handleRateLimitError() {
    setGroqUsage({ remainingTokens: "0", limitTokens: "30000", remainingRequests: null, limitRequests: null, resetTokens: null });
    setGenError("Rate limit hit — Groq resets every 60s. Wait a moment and try again ⏳");
  }

  const handleGenerateCards = useCallback(async () => {
    const noteContent = note?.content;
    if (!noteContent || noteContent.length < 10) {
      setGenError("Add some notes first — LanceBot needs something to work with! 📝");
      return;
    }
    setGeneratingCards(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, noteContent, notebookTitle: notebook?.title, mode: "cards" }),
      });
      const data = await res.json();
      if (data.error === "rate_limit") throw new Error("rate_limit");
      if (data.error) throw new Error(data.error);
      if (data.rateLimitInfo) setGroqUsage(data.rateLimitInfo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      msg === "rate_limit" ? handleRateLimitError() : setGenError("Something went wrong. Try again!");
    } finally {
      setGeneratingCards(false);
    }
  }, [notebookId, note?.content, notebook?.title]);

  async function handleGenerateQuiz(quizType: string) {
    const noteContent = note?.content;
    if (!noteContent || noteContent.length < 10) {
      setGenError("Add some notes first — LanceBot needs something to work with! 📝");
      return;
    }
    setShowQuizPicker(false);
    setGeneratingQuiz(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, noteContent, notebookTitle: notebook?.title, mode: "quiz", quizType }),
      });
      const data = await res.json();
      if (data.error === "rate_limit") throw new Error("rate_limit");
      if (data.error) throw new Error(data.error);
      if (data.rateLimitInfo) setGroqUsage(data.rateLimitInfo);
      router.push(`/notebooks/${notebookId}/study?session=${data.sessionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      msg === "rate_limit" ? handleRateLimitError() : setGenError("Something went wrong. Try again!");
    } finally {
      setGeneratingQuiz(false);
    }
  }

  if (notebook === null) { router.push("/notebooks"); return null; }

  if (!notebook) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/notebooks/${notebookId}`} className="text-gray-500 hover:text-gray-300 flex items-center gap-1.5 text-sm">
            <ArrowLeft size={15} />
            Back to Notes
          </Link>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: notebook.color }} />
          <span className="text-white font-semibold truncate flex-1 text-sm">
            {notebook.emoji} {notebook.title}
          </span>
          <GroqUsageBadge />
          {sortedCards.length > 0 && (
            <span className="text-xs text-gray-500">{sortedCards.length} card{sortedCards.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-3">

        {/* Primary action — Generate Flashcards */}
        <button
          onClick={handleGenerateCards}
          disabled={generatingCards || generatingQuiz}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold border border-gray-700 transition-all hover:-translate-y-0.5"
        >
          {generatingCards
            ? <><Loader2 size={16} className="animate-spin" /> Creating flashcards...</>
            : <><Zap size={16} className="text-yellow-400" /> Generate Flashcards from Notes</>
          }
        </button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowQuizPicker(true)}
            disabled={generatingCards || generatingQuiz}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/40"
          >
            {generatingQuiz
              ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
              : <><BookOpen size={14} /> Start a Quiz</>
            }
          </button>
          <Link
            href={`/notebooks/${notebookId}/quizzes`}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
          >
            <ClipboardList size={14} />
            View Quiz History
          </Link>
        </div>

        {/* Error banner */}
        {genError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm bounce-in">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span>{genError}</span>
            <button onClick={() => setGenError(null)} className="ml-auto text-red-500 hover:text-red-300 text-xs flex-shrink-0">✕</button>
          </div>
        )}

        {/* Flashcards list */}
        {sortedCards.length > 0 && (
          <div className="space-y-3 mt-1">
            {sortedCards.map((card, i) => (
              <div
                key={card._id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 bounce-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${TYPE_COLOR[card.type]}`}>
                      {TYPE_LABEL[card.type]}
                    </span>
                    {card.isManual && (
                      <span className="text-[10px] text-gray-600 font-medium">manual</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeCard({ id: card._id }).catch(() => {})}
                    className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
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
          </div>
        )}

        {/* Create card manually */}
        {showAddCard ? (
          <div className="bg-gray-900 border border-purple-700/40 rounded-2xl p-4 space-y-3 bounce-in">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">New Flashcard</p>
            <textarea
              placeholder="Question..."
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              rows={2}
              autoFocus
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
                Save Card
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
            Create a Card Manually
          </button>
        )}
      </main>

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
                  onClick={() => handleGenerateQuiz(opt.type)}
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
