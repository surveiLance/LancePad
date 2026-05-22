"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Save, Loader2, ClipboardList,
  Send, RotateCcw, Zap, X,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NoteEditor from "@/components/NoteEditor";
import LanceBot from "@/components/LanceBot";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/ui/Button";
import { setNoteContent as pushNoteContent } from "@/lib/lancebot-store";
import { setGroqUsage } from "@/lib/groq-usage-store";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

const QUIZ_TYPES = [
  { type: "multiple_choice", label: "Multiple Choice", desc: "4 options, one correct answer", icon: "🔘" },
  { type: "identification",  label: "Identification",  desc: "Type the exact answer",         icon: "✏️" },
  { type: "fill_blank",      label: "Fill in the Blank", desc: "Complete the missing word",   icon: "📝" },
];

const STARTER_PROMPTS = [
  "Quick summary of key points",
  "Quiz me on what I should know",
  "Explain this like I'm 5",
  "What are connections between main concepts?",
];

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const note = useQuery(api.notes.getByNotebook, { notebookId });
  const savedMessages = useQuery(api.tutorMessages.getByNotebook, { notebookId });
  const saveNote = useMutation(api.notes.save);
  const addMessage = useMutation(api.tutorMessages.add);
  const clearMessages = useMutation(api.tutorMessages.clear);

  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showQuizPicker, setShowQuizPicker] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [botMood, setBotMood] = useState<"idle" | "happy" | "thinking" | "celebrate" | "sad">("happy");
  const [mobileTab, setMobileTab] = useState<"notes" | "chat">("notes");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Load persisted messages; fall back to greeting if none exist
  const historyLoaded = useRef(false);
  useEffect(() => {
    if (savedMessages === undefined || !notebook || historyLoaded.current) return;
    historyLoaded.current = true;
    if (savedMessages.length > 0) {
      setMessages(savedMessages.map((m) => ({ role: m.role, content: m.content })));
    } else {
      setMessages([{
        role: "assistant",
        content: `Hey! 👋 I'm LanceBot, your tutor for **${notebook.title}**.\n\nAsk me anything — summaries, explanations, practice questions — I got you.`,
      }]);
    }
  }, [savedMessages, notebook]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function generateQuiz(quizType: string) {
    if (!noteContent || noteContent.length < 10) {
      setQuizError("Add some notes first — LanceBot needs something to work with! 📝");
      return;
    }
    setGenerating(true);
    setQuizError(null);
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
      if (msg === "rate_limit") {
        setGroqUsage({ remainingTokens: "0", limitTokens: "12000", remainingRequests: null, limitRequests: null, resetTokens: null });
        setQuizError("Rate limit hit — Groq resets every 60s. Wait a moment and try again ⏳");
      } else {
        setQuizError("Something went wrong. Try again!");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || chatLoading) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setChatLoading(true);
    setBotMood("thinking");
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    await addMessage({ notebookId, role: "user", content });

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, notebookId, notebookTitle: notebook?.title }),
      });
      if (!res.body) throw new Error("No stream");
      setGroqUsage({
        remainingTokens: res.headers.get("x-ratelimit-remaining-tokens"),
        limitTokens: res.headers.get("x-ratelimit-limit-tokens"),
        remainingRequests: res.headers.get("x-ratelimit-remaining-requests"),
        limitRequests: res.headers.get("x-ratelimit-limit-requests"),
        resetTokens: res.headers.get("x-ratelimit-reset-tokens"),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: fullText }]);
      }
      setBotMood("happy");
      await addMessage({ notebookId, role: "assistant", content: fullText });
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Oof, something went wrong 😅 Try again?" }]);
      setBotMood("sad");
    } finally {
      setChatLoading(false);
    }
  }

  if (notebook === undefined) return <LoadingScreen />;

  if (notebook === null) return null;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md flex-shrink-0">
        <div className="px-4 h-14 flex items-center gap-3">
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
             saved  ? <><Save size={11} className="text-green-400" /> Saved</>   : null}
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => setMobileTab("notes")}
          className={cn("flex-1 py-2.5 text-sm font-semibold transition-colors", mobileTab === "notes" ? "text-white border-b-2 border-purple-500" : "text-gray-500")}
        >
          📝 Notes
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={cn("flex-1 py-2.5 text-sm font-semibold transition-colors", mobileTab === "chat" ? "text-purple-400 border-b-2 border-purple-500" : "text-gray-500")}
        >
          🤖 LanceBot
        </button>
      </div>

      {/* Split body */}
      <div className="flex-1 flex min-h-0">

        {/* Left — Notes */}
        <div className={cn("flex-1 flex-col min-h-0 border-r border-gray-800/60 p-4 gap-3 relative", "md:flex", mobileTab === "notes" ? "flex" : "hidden")}>
          <div className="flex-shrink-0 grid grid-cols-2 gap-2">
            <Link
              href={`/notebooks/${notebookId}/cards`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
            >
              <Zap size={14} className="text-yellow-400" />
              Cards
            </Link>
            <button
              onClick={() => setShowQuizPicker(true)}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/40"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
              Quiz
            </button>
          </div>

          {quizError && (
            <div className="flex-shrink-0 flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm bounce-in">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <span>{quizError}</span>
              <button onClick={() => setQuizError(null)} className="ml-auto text-red-500 hover:text-red-300 text-xs flex-shrink-0">✕</button>
            </div>
          )}

          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <NoteEditor content={noteContent} onChange={handleNoteChange} />
          </div>

          {/* LanceBot ambient presence */}
          <div className="absolute bottom-6 left-6 flex flex-col items-start gap-2 pointer-events-none">
            {noteContent.length < 10 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-400 max-w-[160px] leading-relaxed shadow-lg bounce-in">
                Start typing your notes — I'll help you study! ✏️
              </div>
            )}
            <LanceBot
              mood={generating ? "thinking" : noteContent.length > 50 ? "happy" : "idle"}
              size={52}
              animate
            />
          </div>
        </div>

        {/* Right — LanceBot chat */}
        <div className={cn("w-full md:w-80 xl:w-96 flex-col min-h-0 bg-gray-950", "md:flex", mobileTab === "chat" ? "flex" : "hidden")}>
          {/* Bot header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 flex-shrink-0">
            <LanceBot mood={botMood} size={42} animate={botMood === "thinking"} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">LanceBot</p>
              <p className="text-gray-500 text-xs truncate">
                {chatLoading ? "typing..." : `tutor · ${notebook.emoji} ${notebook.title}`}
              </p>
            </div>
            <button
              onClick={async () => {
                await clearMessages({ notebookId });
                setMessages([{ role: "assistant", content: "Fresh start! 🔄 What do you want to go over?" }]);
                setBotMood("happy");
              }}
              className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title="Clear chat"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2 bounce-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 mt-0.5">
                    <LanceBot mood={i === messages.length - 1 ? botMood : "idle"} size={26} animate={false} />
                  </div>
                )}
                <div className={cn(
                  "max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-gray-900 border border-gray-800 text-gray-200"
                    : "bg-purple-600 text-white",
                )}>
                  {msg.content
                    ? <MarkdownText text={msg.content} />
                    : <span className="text-gray-500 animate-pulse">...</span>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Starter prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs text-purple-300 bg-purple-950/40 border border-purple-900/50 hover:bg-purple-900/40 px-2.5 py-1 rounded-full transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-800/60 px-3 py-3 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-900 border border-gray-800 focus-within:border-purple-600/60 rounded-xl px-3 py-2 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Ask LanceBot anything..."
                rows={1}
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none text-xs leading-relaxed"
                style={{ maxHeight: 80 }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || chatLoading}
                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz modal */}
      {showQuizPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowQuizPicker(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-80 mx-4 bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Quiz</h3>
              <button
                onClick={() => setShowQuizPicker(false)}
                className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* View past quizzes */}
            <Link
              href={`/notebooks/${notebookId}/quizzes`}
              onClick={() => setShowQuizPicker(false)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-left transition-all hover:-translate-y-0.5 mb-4"
            >
              <ClipboardList size={18} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">View Past Quizzes</p>
                <p className="text-gray-500 text-xs">Review your previous quiz results</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Start a new quiz</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>

            <div className="space-y-2">
              {QUIZ_TYPES.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setShowQuizPicker(false); generateQuiz(opt.type); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-600/50 text-left transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xl">{opt.icon}</span>
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

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="font-semibold mt-2">{line.slice(3)}</h3>;
        if (line.startsWith("# "))  return <h2 key={i} className="font-bold text-base mt-2">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2">
            <span className="text-purple-400 flex-shrink-0">•</span>
            <span>{renderInline(line.slice(2))}</span>
          </div>
        );
        if (/^\d+\. /.test(line)) {
          const [num, ...rest] = line.split(". ");
          return (
            <div key={i} className="flex gap-2">
              <span className="text-purple-400 flex-shrink-0">{num}.</span>
              <span>{renderInline(rest.join(". "))}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-gray-800 px-1 rounded text-purple-300 text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}
