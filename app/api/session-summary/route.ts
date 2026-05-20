import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LANCEBOT_SYSTEM_PROMPT } from "@/lib/lancebot";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { results, notebookTitle } = await req.json();

  const correct = results.filter((r: { result: string }) => r.result === "correct");
  const incorrect = results.filter((r: { result: string }) => r.result === "incorrect");

  const prompt = `You are LanceBot summarizing a study session for "${notebookTitle}".
${correct.length} correct out of ${results.length} total.
Missed: ${incorrect.map((r: { question: string }) => r.question).join(", ") || "none"}

Give a 3-sentence session summary as LanceBot — whimsical, direct, specific about what to review. Plain text only.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: LANCEBOT_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(prompt);
  return NextResponse.json({ summary: result.response.text().trim() });
}
