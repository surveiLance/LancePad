"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import LanceBot from "./LanceBot";
import { subscribeNoteContent } from "@/lib/lancebot-store";

const PAGE_QUIPS: Record<string, string[]> = {
  notebooks: [
    "Pick a notebook. Let's study 📚",
    "Sige, open a notebook.",
    "One notebook. Small start.",
    "Study now, panic less later.",
    "Future you says thanks.",
    "Let's study 📚",
    "I'm here 👀",
    "Tiny step. Big payoff.",
    "Tara, start one.",
    "Those notebooks are waiting.",
  ],
  cards: [
    "Generate cards when ready 👀",
    "Flashcards? Solid choice 🧠",
    "One card, one concept.",
    "Review a few. Kaya yan 💪",
    "Add cards. Drill later 📇",
    "Cards are a good move 🤌",
    "Card count looks good.",
  ],
  quizzes: [
    "Review past quizzes 👀",
    "Wrong answers are clues 🗺️",
    "Quiz history. Nice work 😤",
    "Mistakes = free reviewers. Take notes literally.",
    "Check the scores 📈",
    "See what needs another pass.",
  ],
  study: [
    "One question at a time 💜",
    "Think it through.",
    "Make this one count 🎉",
    "Read carefully 🤔",
    "Practice now, easier later.",
    "Wrong answer? Useful data.",
    "I believe in you. Fr.",
    "Take your time.",
    "You know more than you think.",
    "Wrong means we learn.",
    "Fast is good. Accurate is better.",
    "Laban 💪",
  ],
  tutor: [
    "Ask away. I read the notes 📖",
    "No dumb questions here. Sige, send it.",
    "Built for this moment 🎓",
    "Still fuzzy? I can retry.",
    "I explain. That's the job.",
    "Stuck? I'm here 💜",
    "I read the notes. Probably twice.",
    "Send the question 😤",
    "Ask the awkward question.",
    "Safe study zone 💜",
  ],
};

const TYPING_QUIPS = {
  justStarted: [
    "Uy, you started. Let's gooo 📝",
    "Momentum. Nice 👁️",
    "Sige, dump the notes 📋",
  ],
  short: [
    "Add a bit more 😬",
    "More detail helps 💪",
    "A few more notes.",
  ],
  medium: [
    "Enough to generate 🃏",
    "Solid notes. Respect 🫡",
    "Good material here 🧠",
  ],
  long: [
    "Lots of notes. Respect 😭",
    "Still reading 👁️",
    "Useful notes. Nice.",
  ],
  paused: [
    "Paused? All good 💜",
    "Thinking is allowed 🤔",
    "Generate when ready 🫶",
    "Looks ready ⚡",
    "Breathe. Continue 💪",
  ],
  keywords: [
    { words: ["history", "kasaysayan", "historical"], quip: "History. Let's go 📜" },
    { words: ["math", "equation", "algebra", "calculus"], quip: "Math? Kaya yan 🔢" },
    { words: ["science", "biology", "chemistry", "physics"], quip: "Science notes 🔬" },
    { words: ["english", "literature", "essay", "grammar"], quip: "English notes 📖" },
    { words: ["law", "legal", "constitution", "rights"], quip: "Law. Legit 📃" },
    { words: ["economics", "econ", "supply", "demand"], quip: "Economics time 🏦" },
    { words: ["filipino", "pilipino", "tagalog", "wika"], quip: "Filipino subject 🇵🇭" },
    { words: ["nursing", "medical", "anatomy", "health"], quip: "Medical notes 🩺" },
    { words: ["programming", "code", "function", "algorithm"], quip: "Code notes 💻" },
  ],
};

function getPlainText(tiptapJson: string): string {
  try {
    const doc = JSON.parse(tiptapJson);
    function walk(node: { type?: string; text?: string; content?: unknown[] }): string {
      if (node.type === "text") return node.text ?? "";
      if (node.content) return (node.content as typeof node[]).map(walk).join(" ");
      return "";
    }
    return walk(doc).replace(/\s+/g, " ").trim();
  } catch {
    return tiptapJson;
  }
}

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function bubbleDuration(text: string) {
  return Math.min(8500, Math.max(3500, text.length * 70));
}

export default function FloatingLanceBot() {
  const pathname = usePathname();
  const username = useQuery(api.userProfiles.getMe) ?? null;
  const [bubble, setBubble] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [rising, setRising] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInstruction, setHelpInstruction] = useState("");
  const [helpResponse, setHelpResponse] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);

  const mutedRef = useRef(false);
  const noteContentRef = useRef("");
  const prevLengthRef = useRef(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneRef = useRef<Set<string>>(new Set());
  const keywordRef = useRef<Set<string>>(new Set());

  const isNotebookPage = pathname.match(/\/notebooks\/[^/]+$/) !== null;

  function showBubble(text: string) {
    if (mutedRef.current) return;
    setBubble(text);
    setTimeout(() => setBubble(null), bubbleDuration(text));
  }

  function handleShutUp() {
    mutedRef.current = true;
    setMuted(true);
    setBubble("🤐");
    setTimeout(() => setBubble(null), 1200);
    setHovering(false);
  }

  async function handleAskLanceBot() {
    if (!helpInstruction.trim() || helpLoading) return;
    setHelpLoading(true);
    setHelpResponse("");

    let pageContext = "the app";
    if (pathname.includes("/tutor")) pageContext = "the tutor chat page";
    else if (pathname.includes("/study")) pageContext = "a quiz/study session";
    else if (pathname.includes("/quizzes")) pageContext = "the quiz review page";
    else if (pathname.match(/\/notebooks\/[^/]+$/)) pageContext = "their notebook notes page";
    else if (pathname === "/calendar") pageContext = "the calendar page";

    const plainNote = noteContentRef.current
      ? getPlainText(noteContentRef.current)
      : "";

    const res = await fetch("/api/lancebot-help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: helpInstruction,
        noteContent: plainNote || null,
        pageContext,
        username,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) { setHelpLoading(false); return; }

    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      setHelpResponse(full);
    }
    setHelpLoading(false);
  }

  function handleHide() {
    setHovering(false);
    setHiding(true);
    setTimeout(() => setHidden(true), 500);
  }

  function handleRestore() {
    setHidden(false);
    setHiding(false);
    setRising(true);
    mutedRef.current = false;
    setMuted(false);
    // Let the DOM render with rising=true (off-screen), then slide up
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRising(false);
        setTimeout(() => {
          setBubble("Miss me already? 😏");
          setTimeout(() => setBubble(null), 4000);
        }, 520);
      });
    });
  }

  // Always track latest note content for the help panel
  useEffect(() => {
    const unsub = subscribeNoteContent((raw) => { noteContentRef.current = raw; });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    milestoneRef.current = new Set();
    keywordRef.current = new Set();
    prevLengthRef.current = 0;
    setBubble(null);
  }, [pathname]);

  useEffect(() => {
    if (!isNotebookPage || muted) return;

    const unsub = subscribeNoteContent((raw) => {
      const text = getPlainText(raw);
      const len = text.length;
      const prev = prevLengthRef.current;
      prevLengthRef.current = len;

      if (len === 0) return;

      if (prev === 0 && len > 0) {
        setTimeout(() => showBubble(pick(TYPING_QUIPS.justStarted)), 1500);
        return;
      }

      const lower = text.toLowerCase();
      for (const { words, quip } of TYPING_QUIPS.keywords) {
        const key = words[0];
        if (!keywordRef.current.has(key) && words.some((w) => lower.includes(w))) {
          keywordRef.current.add(key);
          setTimeout(() => showBubble(quip), 1000);
          return;
        }
      }

      if (len >= 600 && !milestoneRef.current.has("long")) {
        milestoneRef.current.add("long");
        showBubble(pick(TYPING_QUIPS.long));
        return;
      }
      if (len >= 250 && !milestoneRef.current.has("medium")) {
        milestoneRef.current.add("medium");
        showBubble(pick(TYPING_QUIPS.medium));
        return;
      }
      if (len >= 80 && !milestoneRef.current.has("short")) {
        milestoneRef.current.add("short");
        showBubble(pick(TYPING_QUIPS.short));
        return;
      }

      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        if (len > 30) showBubble(pick(TYPING_QUIPS.paused));
      }, 6000);
    });

    return () => {
      unsub();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [isNotebookPage, muted]);

  useEffect(() => {
    if (isNotebookPage || muted) return;

    let quips: string[];
    if (pathname.includes("/study")) quips = PAGE_QUIPS.study;
    else if (pathname.includes("/tutor")) quips = PAGE_QUIPS.tutor;
    else if (pathname.includes("/cards")) quips = PAGE_QUIPS.cards;
    else if (pathname.includes("/quizzes")) quips = PAGE_QUIPS.quizzes;
    else quips = PAGE_QUIPS.notebooks;

    const first = setTimeout(() => showBubble(pick(quips)), 3000);
    const interval = setInterval(() => showBubble(pick(quips)), 20000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      setBubble(null);
    };
  }, [pathname, isNotebookPage, muted]);

  if (!visible) return null;
  if (pathname === "/notebooks") return null;
  if (isNotebookPage) return null;
  if (pathname.endsWith("/tutor")) return null;
  if (pathname.includes("/study")) return null;
  if (pathname === "/calendar") return null;
  if (pathname.startsWith("/auth")) return null;

  // "COME BACK!" restore button when hidden
  if (hidden) {
    return (
      <button
        onClick={handleRestore}
        className="fixed bottom-6 left-6 z-50 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-purple-900/60 border border-gray-700 hover:border-purple-600/60 text-xs font-bold text-gray-400 hover:text-purple-300 transition-all hover:-translate-y-0.5"
      >
        COME BACK!
      </button>
    );
  }

  return (
    <>
    {/* Help panel — floats above LanceBot */}
    {helpOpen && (
      <div className="fixed bottom-24 left-6 z-50 w-80 bg-gray-900 border border-purple-800/50 rounded-2xl shadow-2xl overflow-hidden bounce-in">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-800">
          <span className="text-xs font-semibold text-purple-300">✏️ Ask LanceBot</span>
          <button onClick={() => { setHelpOpen(false); setHelpResponse(""); setHelpInstruction(""); }} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">✕</button>
        </div>
        <div className="p-3 space-y-2">
          <textarea
            placeholder="What do you need help with? (edit notes, explain something, find info...)"
            value={helpInstruction}
            onChange={(e) => setHelpInstruction(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskLanceBot(); } }}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"
          />
          {helpResponse && (
            <div className="bg-gray-800/80 rounded-xl px-3 py-2.5 text-sm text-gray-200 max-h-52 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {helpResponse}
            </div>
          )}
          <button
            onClick={handleAskLanceBot}
            disabled={!helpInstruction.trim() || helpLoading}
            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {helpLoading ? "LanceBot is thinking... 🤔" : "Ask"}
          </button>
        </div>
      </div>
    )}

    <div
      className="fixed bottom-6 left-6 z-50 pointer-events-none"
      style={{
        transform: (hiding || rising) ? "translateY(120px)" : "translateY(0)",
        opacity: (hiding || rising) ? 0 : 1,
        transition: rising
          ? "transform 0.5s cubic-bezier(0,0,0.2,1), opacity 0.4s ease-out"
          : "transform 0.45s cubic-bezier(0.4,0,1,1), opacity 0.35s ease-in",
      }}
    >
      {/* Speech bubble — sits above the bot, pointer-events-none so it doesn't block */}
      <div className="flex flex-col items-start gap-2 mb-2">
        {bubble && !muted && (
          <div
            key={bubble}
            className="pointer-events-none relative max-w-[190px] bg-gray-900 border border-purple-800/60 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-purple-200 leading-relaxed shadow-xl shadow-black/40"
            style={{ animation: "bubble-in 0.3s ease-out" }}
          >
            {bubble}
            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 border-l border-b border-purple-800/60 rotate-45" />
          </div>
        )}
        {bubble && muted && (
          <div
            key="muted-bubble"
            className="pointer-events-none relative bg-gray-900 border border-gray-700 rounded-2xl rounded-bl-sm px-3 py-2 text-sm shadow-xl"
            style={{ animation: "bubble-in 0.2s ease-out" }}
          >
            🤐
            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 border-l border-b border-gray-700 rotate-45" />
          </div>
        )}
      </div>

      {/* Hover group — avatar + action buttons in one zone */}
      <div
        className="pointer-events-auto flex flex-col items-start gap-2"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Action buttons appear above avatar on hover */}
        {hovering && (
          <div
            className="flex flex-col gap-1.5"
            style={{ animation: "bubble-in 0.15s ease-out" }}
          >
            <button
              onClick={() => { setHelpOpen((o) => !o); setHovering(false); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800/70 border border-purple-700/60 text-xs text-purple-200 font-medium transition-colors"
            >
              ✏️ Help
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={muted ? () => { mutedRef.current = false; setMuted(false); } : handleShutUp}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 font-medium transition-colors"
              >
                {muted ? "🔊 Unmute" : "🤐 Quiet"}
              </button>
              <button
                onClick={handleHide}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 font-medium transition-colors"
              >
                👋 Hide
              </button>
            </div>
          </div>
        )}

        <LanceBot
          mood={muted ? "muted" : "happy"}
          size={52}
          animate={!muted}
        />
      </div>
    </div>
    </>
  );
}
