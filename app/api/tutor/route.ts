import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { buildTutorSystemPrompt } from "@/lib/lancebot";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractText(tiptapJson: string): string {
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

export async function POST(req: NextRequest) {
  const { messages, notebookId, notebookTitle, username } = await req.json();

  const note = await fetchQuery(
    api.notes.getByNotebook,
    { notebookId: notebookId as Id<"notebooks"> }
  );

  const noteText = note?.content ? extractText(note.content) : "";
  const systemPrompt = buildTutorSystemPrompt(notebookTitle, noteText, username);

  const history = messages.slice(-6).map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const { data: stream, response: groqResponse } = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "system", content: systemPrompt }, ...history],
    temperature: 0.7,
    max_tokens: 800,
    stream: true,
  }).withResponse();

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-ratelimit-remaining-tokens": groqResponse.headers.get("x-ratelimit-remaining-tokens") ?? "",
      "x-ratelimit-limit-tokens":     groqResponse.headers.get("x-ratelimit-limit-tokens") ?? "",
      "x-ratelimit-remaining-requests": groqResponse.headers.get("x-ratelimit-remaining-requests") ?? "",
      "x-ratelimit-limit-requests":   groqResponse.headers.get("x-ratelimit-limit-requests") ?? "",
      "x-ratelimit-reset-tokens":     groqResponse.headers.get("x-ratelimit-reset-tokens") ?? "",
    },
  });
}
