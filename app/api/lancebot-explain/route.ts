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
  const { question, correctAnswer, userAnswer, notebookTitle, noteContent, username } = await req.json();

  const noteText = noteContent ? extractText(noteContent) : "";

  const systemPrompt = `${buildHelpSystemPrompt(username)}

You are reacting to a wrong answer during a quiz on "${notebookTitle}".
1 sentence max. Give the correct answer and the single key reason why. Be direct, no filler.

${noteText ? `Notes context:\n"""\n${noteText.slice(0, 3000)}\n"""` : ""}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Question: ${question}\nCorrect answer: ${correctAnswer}\nStudent answered: ${userAnswer}` },
    ],
    temperature: 0.6,
    max_tokens: 60,
  });

  return NextResponse.json({
    explanation: completion.choices[0]?.message?.content?.trim() ?? "That's not it — check your notes on this one! 📝",
  });
}
