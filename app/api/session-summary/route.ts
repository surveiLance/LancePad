import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildHelpSystemPrompt } from "@/lib/lancebot";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { results, notebookTitle, username } = await req.json();

  const correct = results.filter((r: { result: string }) => r.result === "correct");
  const incorrect = results.filter((r: { result: string }) => r.result === "incorrect");

  const prompt = `You are LanceBot summarizing a study session for "${notebookTitle}".
${correct.length} correct out of ${results.length} total.
Missed: ${incorrect.map((r: { question: string }) => r.question).join(", ") || "none"}

Give a 3-sentence session summary as LanceBot — whimsical, direct, specific about what to review. Plain text only.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: buildHelpSystemPrompt(username) },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return NextResponse.json({ summary: completion.choices[0]?.message?.content?.trim() ?? "" });
  } catch {
    return NextResponse.json({ summary: "Great session! Keep reviewing the missed topics and you'll nail them next time. 🤖" });
  }
}
