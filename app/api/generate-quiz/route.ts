import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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

function buildPrompt(plainText: string, notebookTitle: string, mode: string, quizType?: string): string {
  if (mode === "cards") {
    return `You are a flashcard generator. Given these notes, generate one flashcard per key topic — cover everything, leave nothing out.

NOTES (from "${notebookTitle}"):
${plainText}

Generate as many cards as the notes require. For short notes that's fine to be 5–10; for detailed notes generate 20–40 or more. Prioritize coverage over hitting a number. Every named concept, definition, date, person, formula, process, and relationship deserves its own card.

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "What is [concept]?",
    "answer": "Clear, complete explanation (1–3 sentences)",
    "type": "flashcard"
  }
]

Rules:
- One card per key topic — do not bundle multiple unrelated ideas into one card
- Cover EVERY distinct concept in the notes, even brief mentions
- Answers must be self-contained and accurate to the notes
- Do not repeat the same question twice`;
  }

  // Quiz mode — branch by quizType
  const type = quizType ?? "multiple_choice";

  const groundingRule = `CRITICAL RULES:
- Base EVERY question and answer STRICTLY on the notes above. Do NOT use outside knowledge.
- The correct answer must be something explicitly stated or directly implied in the notes.
- If the notes don't support a question, skip it and pick a different topic from the notes.`;

  if (type === "multiple_choice") {
    return `You are a quiz generator. Generate a multiple choice quiz based ONLY on the notes below.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 multiple choice questions as JSON. Each question has 4 options, one correct answer.
All 4 options must be plausible and related to the topic — no obviously wrong distractors.
The correct answer must come directly from the notes.

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "...",
    "answer": "correct option text",
    "type": "multiple_choice",
    "options": ["option A", "option B", "option C", "option D"]
  }
]

${groundingRule}`;
  }

  if (type === "identification") {
    return `You are a quiz generator. Generate an identification quiz based ONLY on the notes below.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 short-answer questions as JSON. Each question requires a specific term, name, or concept as the answer.
The answer must be something explicitly in the notes.

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "What is the term for...?",
    "answer": "exact answer from the notes",
    "type": "short_answer"
  }
]

${groundingRule}`;
  }

  if (type === "fill_blank") {
    return `You are a quiz generator. Generate a fill-in-the-blank quiz based ONLY on the notes below.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 fill-in-the-blank questions as JSON. Use ___ for the blank.
The blank must be filled by a key term found in the notes.

CRITICAL: The "answer" field must contain ONLY the word(s) that replace the ___ in the question — nothing more. Do NOT repeat words already visible in the question sentence. For example, if the question is "___ and information are used interchangeably", the answer is "Data", not "Data and information".

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "The ___ is responsible for...",
    "answer": "exact word or short phrase that fills the blank only",
    "type": "fill_blank"
  }
]

${groundingRule}`;
  }

  // fallback: mixed
  return `You are a quiz generator. Generate a quiz based ONLY on the notes below.

NOTES (from "${notebookTitle}"):
${plainText}

Generate exactly 10 quiz questions as JSON. Mix types:
- "multiple_choice": 4 options, one correct answer (7 questions) — all options plausible
- "short_answer": open-ended (3 questions)

Return ONLY valid JSON array, no markdown, no code blocks:
[
  {
    "question": "...",
    "answer": "...",
    "type": "multiple_choice",
    "options": ["option A", "option B", "option C", "option D"]
  }
]

${groundingRule}`;
}

export async function POST(req: NextRequest) {
  const { notebookId, noteContent, notebookTitle, mode, quizType } = await req.json();

  const plainText = extractText(noteContent);
  if (!plainText || plainText.length < 20) {
    return NextResponse.json({ error: "Not enough content" }, { status: 400 });
  }

  const model = "llama-3.1-8b-instant"; // 30k TPM free limit — all endpoints use this

  // Truncate very long notes to keep prompt size reasonable
  const MAX_CHARS = mode === "cards" ? 6000 : 8000;
  const truncated = plainText.length > MAX_CHARS ? plainText.slice(0, MAX_CHARS) + "\n\n[Note truncated for length]" : plainText;

  const prompt = buildPrompt(truncated, notebookTitle, mode, quizType);

  let completion;
  let rateLimitInfo: Record<string, string | null> = {};
  try {
    const { data, response } = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }).withResponse();
    completion = data;
    rateLimitInfo = {
      remainingTokens: response.headers.get("x-ratelimit-remaining-tokens"),
      limitTokens: response.headers.get("x-ratelimit-limit-tokens"),
      remainingRequests: response.headers.get("x-ratelimit-remaining-requests"),
      limitRequests: response.headers.get("x-ratelimit-limit-requests"),
      resetTokens: response.headers.get("x-ratelimit-reset-tokens"),
    };
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    const message = (err as { message?: string }).message ?? "unknown";
    console.error("[generate-quiz] Groq error:", status, message);
    if (status === 429) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }
    return NextResponse.json({ error: "ai_error", detail: message }, { status: 500 });
  }

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  let questions: { question: string; answer: string; type: string; options?: string[] }[];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    questions = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "parse_error" }, { status: 500 });
  }

  if (mode === "quiz") {
    const sessionId = await fetchMutation(api.quizSessions.create, {
      notebookId: notebookId as Id<"notebooks">,
      quizType: quizType ?? "multiple_choice",
      questions: questions.map((q) => ({
        question: q.question,
        answer: q.answer,
        type: q.type,
        options: q.options,
      })),
    });
    return NextResponse.json({ sessionId, rateLimitInfo });
  }

  await fetchMutation(api.cards.replaceAll, {
    notebookId: notebookId as Id<"notebooks">,
    cards: questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      type: q.type as "multiple_choice" | "fill_blank" | "short_answer" | "flashcard",
      options: q.options,
    })),
  });

  return NextResponse.json({ count: questions.length, rateLimitInfo });
}
