import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildHelpSystemPrompt } from "@/lib/lancebot";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { question, modelAnswer, userAnswer, notebookTitle, username } = await req.json();

  const prompt = `You are grading a short-answer response for a student studying "${notebookTitle}".

Question: ${question}
Model Answer (reference): ${modelAnswer}
Student's Answer: ${userAnswer}

Grade this and respond as LanceBot. Return JSON only, no markdown:
{
  "correct": true/false,
  "partial": true/false,
  "score": 0-100,
  "feedback": "LanceBot's fun encouraging 2-3 sentence feedback"
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: buildHelpSystemPrompt(username) },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return NextResponse.json(JSON.parse(jsonMatch ? jsonMatch[0] : raw));
  } catch {
    return NextResponse.json({ correct: false, partial: false, score: 0, feedback: "Hmm, trouble grading that — keep going! 🤖" });
  }
}
