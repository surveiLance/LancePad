import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
  const { notebookId, noteContent, notebookTitle, mode } = await req.json();

  const plainText = extractText(noteContent);
  if (!plainText || plainText.length < 20) {
    return NextResponse.json({ error: "Not enough content" }, { status: 400 });
  }

  const isQuizMode = mode === "quiz";

  const prompt = isQuizMode
    ? `You are a quiz generator. Given these notes, generate a challenging quiz.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 quiz questions as JSON. Use ONLY these types:
- "multiple_choice": 4 options, one correct answer (7 questions)
- "short_answer": open-ended, tests deep understanding (3 questions)

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "...",
    "answer": "...",
    "type": "multiple_choice",
    "options": ["option A", "option B", "option C", "option D"]
  }
]

Rules: Make it challenging, use tricky distractors, test application not just recall.`
    : `You are a smart study card generator. Given these notes, generate a diverse set of study cards.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 study cards as JSON. Mix these types:
- "multiple_choice": 4 options, one correct answer (4 cards)
- "fill_blank": question with a blank (use ___) (3 cards)
- "short_answer": open-ended question (2 cards)
- "flashcard": concept on front, explanation on back (1 card)

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "...",
    "answer": "...",
    "type": "multiple_choice",
    "options": ["option A", "option B", "option C", "option D"]
  }
]

Rules: Focus on key concepts, make wrong options plausible, vary difficulty.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  let cards;
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    cards = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse cards" }, { status: 500 });
  }

  await fetchMutation(
    api.cards.replaceAll,
    {
      notebookId: notebookId as Id<"notebooks">,
      cards: cards.map((c: { question: string; answer: string; type: string; options?: string[] }) => ({
        question: c.question,
        answer: c.answer,
        type: c.type as "multiple_choice" | "fill_blank" | "short_answer" | "flashcard",
        options: c.options,
      })),
    }
  );

  return NextResponse.json({ count: cards.length });
}
