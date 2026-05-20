"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import LanceBot from "./LanceBot";
import { subscribeNoteContent } from "@/lib/lancebot-store";

const PAGE_QUIPS: Record<string, string[]> = {
  notebooks: [
    "Uy, pumunta ka na dito! Mag-aral na tayo 📚",
    "Bro is just staring at the screen 💀 sige na pre",
    "Nako, ang tagal mo naman. Buksan mo na yung notebook.",
    "Ay sus, ang dami mong notebooks pero di ka nag-aaral 😭",
    "Lodi, ang future mo ay depende sa galaw mo ngayon. Charot. Pero totoo.",
    "Pick a notebook and let's cook 🍳 kaya mo yan",
    "Grabe ka talaga, andito na ako waiting for you 👀",
    "Jusko, pag-aralan mo na bago ka magsisi sa exam 😭",
    "Bet? Bet. Tara na, mag-aral tayo 🚀",
    "Sige lang, manonood lang ako... pero mag-aral ka na ha.",
  ],
  study: [
    "Kaya mo yan lods!! 💜 Maniniwala ako sa'yo",
    "Ay, mali. Pero okay lang, ganyan talaga 😅 next!",
    "Nako, tama! Grabe ka talaga 🎉",
    "Jusko, isipin mo mabuti bago sumagot ha 🤔",
    "Hala, tama ka! Sana ganyan ka sa exam 🙏",
    "Wrong answer? Character development yan pre 💪",
    "I believe in you!! Charot. Hindi charot. Totoo. 💜",
    "Take your time. Wala namang nagmamadali dito. Maliban sa exam mo.",
    "Ay sus, kaya mo yan! Di mo lang alam.",
    "Kung mali ka, okay lang. Natuto ka. Science yan.",
    "Grabe ka, ang bilis mo! Feeling ko matalino ka.",
    "Laban lods! Wag susuko 💪",
  ],
  tutor: [
    "Tanong mo na, binasa ko na lahat ng notes mo 📖",
    "Wala kang dumb question dito. Wala. Tanong mo na.",
    "Grabe, trained talaga ako para dito 🎓 sa'yo lang to",
    "Uy, i-explain ko ulit kung di mo gets. Walang judgement.",
    "Di ako natutulog. Di ako kumakain. Nag-e-explain lang ako. Ibang level.",
    "Stuck ka? Exactly yung reason kung bakit nandito ako 💜",
    "Nabasa ko yung notes mo ng mas maraming beses pa sa'yo tbh.",
    "I-type mo na yung tanong mo, kaya ko yan 😤",
    "Yung tanong na nahihiya kang i-Google? Ako yung sagot dun.",
    "Huwag kang mahiyang magtanong pre. Safe space dito 💜",
  ],
};

// Reacts to what the user is actually typing
const TYPING_QUIPS = {
  justStarted: [
    "Uy, nag-start na! Let's gooo 📝",
    "Grabe, nag-type na! I'm watching 👁️",
    "Sige, i-dump mo lahat ng notes dito 📋",
  ],
  short: [
    "Dagdag pa! Di pa sapat yan para sa cards 😬",
    "Medyo konti pa... kaya mo pa magdagdag 💪",
    "Nako, need mo pang mag-add ng more notes pre",
  ],
  medium: [
    "Okay na yan! I-generate mo na kung gusto mo 🃏",
    "Grabe, ang dami na ng notes mo! Respect 🫡",
    "Feeling ko marami kang matutunan dito 🧠",
  ],
  long: [
    "JUSKO. Ang dami nang notes. Idol ka talaga 😭🙏",
    "Pre, nagbabasa pa rin ako. Sandali lang 👁️💨",
    "Ang husay mo mag-notes. Siguradong magagamit to.",
  ],
  paused: [
    "Bakit tumigil? Huwag kang susuko 💜",
    "Thinking? Good. I'm thinking too. 🤔",
    "Pag nakapag-generate ka na, proud na ako sa'yo 🫶",
    "Ready ka na bang i-generate? Kaya na yan! ⚡",
    "Take a breath. Then keep going 💪",
  ],
  keywords: [
    { words: ["history", "kasaysayan", "historical"], quip: "Ay history! Fave ko yan. Let's go 📜" },
    { words: ["math", "equation", "algebra", "calculus"], quip: "Math? I gotchu. Masakit pero kaya 🔢" },
    { words: ["science", "biology", "chemistry", "physics"], quip: "Science notes! I will explain everything. Trust. 🔬" },
    { words: ["english", "literature", "essay", "grammar"], quip: "English notes ha? I read, don't worry 📖" },
    { words: ["law", "legal", "constitution", "rights"], quip: "Law? Legit. Complicated pero kaya natin 📃" },
    { words: ["economics", "econ", "supply", "demand"], quip: "Economics? Supply and demand ng utak natin 🏦" },
    { words: ["filipino", "pilipino", "tagalog", "wika"], quip: "Filipino subject? Eto na ang hintay ko 🇵🇭" },
    { words: ["nursing", "medical", "anatomy", "health"], quip: "Medical notes! Future nurse/doc ka ba? SLAY 🩺" },
    { words: ["programming", "code", "function", "algorithm"], quip: "Code notes? Pareho tayo. Built different 💻" },
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

export default function FloatingLanceBot() {
  const pathname = usePathname();
  const [bubble, setBubble] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const prevLengthRef = useRef(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneRef = useRef<Set<string>>(new Set());
  const keywordRef = useRef<Set<string>>(new Set());

  const isNotebookPage = pathname.match(/\/notebooks\/[^/]+$/) !== null;

  function showBubble(text: string) {
    setBubble(text);
    setTimeout(() => setBubble(null), 5000);
  }

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(showTimer);
  }, []);

  // Reset milestone tracking when page changes
  useEffect(() => {
    milestoneRef.current = new Set();
    keywordRef.current = new Set();
    prevLengthRef.current = 0;
    setBubble(null);
  }, [pathname]);

  // Subscribe to note content changes (only on notebook editing page)
  useEffect(() => {
    if (!isNotebookPage || minimized) return;

    const unsub = subscribeNoteContent((raw) => {
      const text = getPlainText(raw);
      const len = text.length;
      const prev = prevLengthRef.current;
      prevLengthRef.current = len;

      if (len === 0) return;

      // Just started typing
      if (prev === 0 && len > 0) {
        setTimeout(() => showBubble(pick(TYPING_QUIPS.justStarted)), 1500);
        return;
      }

      // Keyword detection
      const lower = text.toLowerCase();
      for (const { words, quip } of TYPING_QUIPS.keywords) {
        const key = words[0];
        if (!keywordRef.current.has(key) && words.some((w) => lower.includes(w))) {
          keywordRef.current.add(key);
          setTimeout(() => showBubble(quip), 1000);
          return;
        }
      }

      // Length milestones
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

      // Typing pause detection (stopped typing for 6s)
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        if (len > 30) showBubble(pick(TYPING_QUIPS.paused));
      }, 6000);
    });

    return () => {
      unsub();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [isNotebookPage, minimized]);

  // Generic page quips for non-notebook pages
  useEffect(() => {
    if (isNotebookPage || minimized) return;

    let quips: string[];
    if (pathname.includes("/study")) quips = PAGE_QUIPS.study;
    else if (pathname.includes("/tutor")) quips = PAGE_QUIPS.tutor;
    else quips = PAGE_QUIPS.notebooks;

    const first = setTimeout(() => showBubble(pick(quips)), 3000);
    const interval = setInterval(() => showBubble(pick(quips)), 20000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      setBubble(null);
    };
  }, [pathname, isNotebookPage, minimized]);

  if (!visible) return null;
  if (isNotebookPage) return null;
  if (pathname === "/notebooks") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {bubble && !minimized && (
        <div className="pointer-events-none relative max-w-[190px] bg-gray-900 border border-purple-800/60 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-purple-200 leading-relaxed shadow-xl shadow-black/40" style={{ animation: "bubble-in 0.3s ease-out" }}>
          {bubble}
          <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-gray-900 border-r border-b border-purple-800/60 rotate-45" />
        </div>
      )}

      <button
        className="pointer-events-auto relative cursor-pointer select-none"
        onClick={() => {
          if (minimized) {
            setMinimized(false);
          } else {
            setBubble(null);
            setMinimized(true);
          }
        }}
        title={minimized ? "Bring LanceBot back" : "Hide LanceBot"}
      >
        <div className={minimized ? "opacity-40 hover:opacity-70 transition-opacity" : ""}>
          <LanceBot mood="happy" size={minimized ? 36 : 52} animate={!minimized} />
        </div>
        {!minimized && (
          <div className="absolute inset-0 rounded-full lancebot-glow -z-10 scale-110" />
        )}
      </button>
    </div>
  );
}
