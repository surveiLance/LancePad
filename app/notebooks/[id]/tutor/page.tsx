"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ChatMessage } from "@/types";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Give me a quick summary of the key points",
  "Quiz me on what I should know",
  "What are the most common exam questions for this topic?",
  "I keep forgetting this — explain it like I'm 5",
  "What are the connections between the main concepts?",
];

export default function TutorPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const username = useQuery(api.userProfiles.getMe) ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [botMood, setBotMood] = useState<"idle" | "happy" | "thinking" | "celebrate" | "sad">("happy");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notebook === null) router.push("/notebooks");
  }, [notebook, router]);

  useEffect(() => {
    if (notebook) {
      setMessages([{
        role: "assistant",
        content: `Hey, I'm LanceBot for **${notebook.title}**. Ask for an explanation, quiz, or quick summary.`,
      }]);
    }
  }, [notebook?.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setBotMood("thinking");
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, notebookId, notebookTitle: notebook?.title, username }),
      });
      if (!res.body) throw new Error("No stream");
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
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Oof, something went wrong 😅 Try again?" }]);
      setBotMood("sad");
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([{ role: "assistant", content: "Fresh start. What should we review? 🔄" }]);
    setBotMood("happy");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/notebooks/${notebookId}`} className="text-gray-500 hover:text-gray-300"><ArrowLeft size={18} /></Link>
          <LanceBot mood={botMood} size={32} animate={botMood === "thinking"} />
          <div className="flex-1">
            <span className="font-semibold text-white text-sm">LanceBot</span>
            <span className="text-gray-500 text-xs ml-2">{loading ? "typing..." : `tutor for ${notebook?.emoji} ${notebook?.title}`}</span>
          </div>
          <button onClick={clearChat} className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Clear chat">
            <RotateCcw size={15} />
          </button>
          <Link href={`/notebooks/${notebookId}/study`}><Button size="sm">Study mode</Button></Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3 bounce-in", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 mt-1">
                <LanceBot mood={i === messages.length - 1 ? botMood : "idle"} size={32} animate={false} />
              </div>
            )}
            <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "assistant" ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-purple-600 text-white")}>
              {msg.content ? <MarkdownText text={msg.content} /> : <span className="text-gray-500 animate-pulse">...</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button key={p} onClick={() => sendMessage(p)}
                className="text-xs text-purple-300 bg-purple-950/40 border border-purple-900/50 hover:bg-purple-900/40 px-3 py-1.5 rounded-full transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-900 bg-gray-950 max-w-3xl mx-auto w-full px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-900 border border-gray-800 focus-within:border-purple-600 rounded-2xl px-4 py-3 transition-colors">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask LanceBot anything about this notebook..."
            rows={1} className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none text-sm leading-relaxed" style={{ maxHeight: 120 }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="font-semibold mt-2">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="font-bold text-base mt-2">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2"><span className="text-purple-400 flex-shrink-0">•</span><span>{renderInline(line.slice(2))}</span></div>
        );
        if (/^\d+\. /.test(line)) { const [num, ...rest] = line.split(". "); return (
          <div key={i} className="flex gap-2"><span className="text-purple-400 flex-shrink-0">{num}.</span><span>{renderInline(rest.join(". "))}</span></div>
        ); }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="bg-gray-800 px-1 rounded text-purple-300 text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}
