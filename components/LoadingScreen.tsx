"use client";

import { useEffect, useState } from "react";
import LanceBot from "./LanceBot";

const QUIPS = [
  "Hintay ka lang pre, kinukuha ko na lahat 📦",
  "Loading... o baka nag-aayos lang ako ng buhok ko 💁",
  "Sandali lang ha, promise mabilis to 😭",
  "Uy wag kang aalis, andito na ako 👀",
  "Bro... ako na bahala. Trust the process 🙏",
  "Konting tiis lang pre, malapit na 💀",
  "Nag-load na to dati mas mabilis... sus 😤",
  "Ikaw ba yun? Teka, inaayos ko pa yung notebook mo 📚",
  "Di ako nagpapahinga para dito ha. Walang pasasalamat. 😤",
  "Almost done... charot, hindi pa. Pero malapit na fr 🙃",
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
