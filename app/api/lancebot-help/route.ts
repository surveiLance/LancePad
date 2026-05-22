import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildHelpSystemPrompt } from "@/lib/lancebot";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { instruction, noteContent, pageContext, username } = await req.json();

  const contextBlock = noteContent
    ? `\nThe user's current notes:\n"""\n${noteContent.slice(0, 2000)}\n"""`
    : "";

  const pageBlock = pageContext
    ? `\nThe user is currently on: ${pageContext}`
    : "";

  const systemPrompt = `${buildHelpSystemPrompt(username)}${pageBlock}${contextBlock}`;

  const stream = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: instruction },
    ],
    temperature: 0.7,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
