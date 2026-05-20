import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LANCEBOT_SYSTEM_PROMPT } from "@/lib/lancebot";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { question, modelAnswer, userAnswer, notebookTitle } = await req.json();

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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: LANCEBOT_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return NextResponse.json(JSON.parse(jsonMatch ? jsonMatch[0] : raw));
  } catch {
    return NextResponse.json({ correct: false, partial: false, score: 0, feedback: "Hmm, trouble grading that — keep going! 🤖" });
  }
}
