import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildHelpSystemPrompt } from "@/lib/lancebot";

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
  const { noteContent, notebookTitle, username } = await req.json();
  const noteText = noteContent ? extractText(noteContent) : "";

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `${buildHelpSystemPrompt(username)}\n\nYou are summarizing a student's notes for "${notebookTitle}". Use the same concise LanceBot voice: mostly English, direct, complete thoughts. Return ONLY valid JSON: {"summary": "a concise markdown summary with headings and bullets"}`,
      },
      {
        role: "user",
        content: `Summarize these notes into key points, main concepts, and important details. Keep it concise but complete:\n\n${noteText}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const { summary } = JSON.parse(raw);
    return NextResponse.json({ summary: summary ?? "" });
  } catch {
    return NextResponse.json({ summary: "" }, { status: 500 });
  }
}
