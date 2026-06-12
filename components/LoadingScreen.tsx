"use client";

import { useEffect, useState } from "react";
import LanceBot from "./LanceBot";

const QUIPS = [
  "One sec, getting ready 📦",
  "Loading... thinking too 💁",
  "Sandali lang, this should be quick 😭",
  "Uy, don't leave yet. I'm here 👀",
  "Bro... I got this. Trust the process 🙏",
  "Almost there. Tiny patience moment 💀",
  "This loaded faster last time... suspicious 😤",
  "Getting your notebook 📚",
  "Working very hard. Obviously. 😤",
  "Almost done. For real 🙃",
];

function pick() { return QUIPS[Math.floor(Math.random() * QUIPS.length)]; }

export default function LoadingScreen() {
  const [quip, setQuip] = useState("");

  useEffect(() => {
    setQuip(pick());
    const interval = setInterval(() => setQuip(pick()), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center gap-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-700/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex flex-col items-center gap-5">
        <LanceBot mood="thinking" size={110} animate headsetFloat />
        <div
          key={quip}
          className="max-w-xs bg-gray-900 border border-purple-800/50 rounded-2xl px-5 py-3 text-sm text-purple-100 leading-snug text-center shadow-xl"
          style={{ animation: "bubble-in 0.3s ease-out" }}
        >
          {quip}
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-500"
              style={{ animation: `breathe 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
