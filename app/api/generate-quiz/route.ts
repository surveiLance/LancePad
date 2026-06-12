import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type QuizQuestion = {
  question: string;
  answer: string;
  type: string;
  options?: string[];
};

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

function normalizeChoice(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeChoice(value).split(" ").filter(Boolean));
}

function jaccardSimilarity(a: string, b: string): number {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  return intersection / (aTokens.size + bTokens.size - intersection);
}

function choicesAreTooSimilar(a: string, b: string): boolean {
  const normalizedA = normalizeChoice(a);
  const normalizedB = normalizeChoice(b);
  if (!normalizedA || !normalizedB) return true;
  if (normalizedA === normalizedB) return true;
  if (normalizedA.length > 8 && normalizedB.length > 8) {
    if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return true;
  }
  return jaccardSimilarity(a, b) >= 0.82;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dedupeChoices(choices: string[]): string[] {
  return choices.reduce<string[]>((unique, choice) => {
    const trimmed = choice.trim();
    if (!trimmed) return unique;
    if (unique.some((existing) => choicesAreTooSimilar(existing, trimmed))) return unique;
    return [...unique, trimmed];
  }, []);
}

function normalizeMultipleChoiceQuestion(question: QuizQuestion, fallbackAnswers: string[]): QuizQuestion | null {
  const answer = question.answer?.trim();
  const prompt = question.question?.trim();
  if (!prompt || !answer) return null;

  const modelOptions = Array.isArray(question.options) ? question.options : [];
  const distractors = dedupeChoices(modelOptions)
    .filter((option) => !choicesAreTooSimilar(option, answer))
    .slice(0, 3);

  const extraDistractors = fallbackAnswers
    .filter((candidate) => !choicesAreTooSimilar(candidate, answer))
    .filter((candidate) => !distractors.some((option) => choicesAreTooSimilar(option, candidate)));

  const options = dedupeChoices([answer, ...distractors, ...extraDistractors]).slice(0, 4);
  if (options.length < 2 || !options.some((option) => choicesAreTooSimilar(option, answer))) return null;

  return {
    ...question,
    question: prompt,
    answer,
    type: "multiple_choice",
    options: shuffle(options),
  };
}

function rebalanceAnswerPositions(questions: QuizQuestion[]): QuizQuestion[] {
  let previousAnswerIndex = -1;
  let streak = 0;

  return questions.map((question) => {
    if (question.type !== "multiple_choice" || !question.options?.length) return question;

    const answerIndex = question.options.findIndex((option) => choicesAreTooSimilar(option, question.answer));
    if (answerIndex === -1) return question;

    if (answerIndex === previousAnswerIndex) {
      streak += 1;
    } else {
      previousAnswerIndex = answerIndex;
      streak = 1;
    }

    if (streak < 3 || question.options.length < 2) return question;

    const options = [...question.options];
    const targetIndex = options.findIndex((_, index) => index !== answerIndex && index !== previousAnswerIndex);
    if (targetIndex === -1) return question;

    [options[answerIndex], options[targetIndex]] = [options[targetIndex], options[answerIndex]];
    previousAnswerIndex = targetIndex;
    streak = 1;

    return { ...question, options };
  });
}

function sanitizeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const fallbackAnswers = questions
    .map((question) => question.answer?.trim())
    .filter((answer): answer is string => Boolean(answer));

  const sanitized = questions
    .map((question) => {
      if (question.type !== "multiple_choice") {
        return {
          ...question,
          question: question.question?.trim(),
          answer: question.answer?.trim(),
        };
      }

      return normalizeMultipleChoiceQuestion(question, fallbackAnswers);
    })
    .filter((question): question is QuizQuestion => Boolean(question?.question && question.answer));

  return rebalanceAnswerPositions(sanitized);
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
Each distractor must be clearly different from the correct answer and from the other distractors. Do not use reworded versions, synonyms, overlapping phrases, or choices where more than one could reasonably be correct.
Randomize the correct answer position independently for each question. Do not put the correct answer in the same letter position repeatedly.

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

  let questions: QuizQuestion[];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    questions = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return NextResponse.json({ error: "parse_error" }, { status: 500 });
  }

  questions = sanitizeQuestions(questions);
  if (!questions.length) {
    return NextResponse.json({ error: "no_valid_questions" }, { status: 500 });
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
