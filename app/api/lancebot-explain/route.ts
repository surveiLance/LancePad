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
1 short complete sentence max. Give the correct answer and one reason why. Keep it mostly English, playful but useful, and do not end mid-thought. Use at most one light Filipino connector/reaction like "sige", "uy", "ay", "naman", or "gets?" only if it sounds natural.

${noteText ? `Notes context:\n"""\n${noteText.slice(0, 3000)}\n"""` : ""}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Question: ${question}\nCorrect answer: ${correctAnswer}\nStudent answered: ${userAnswer}` },
    ],
    temperature: 0.6,
    max_tokens: 90,
  });

  return NextResponse.json({
    explanation: completion.choices[0]?.message?.content?.trim() ?? "Not quite — check the notes and try the idea again 📝",
  });
}
