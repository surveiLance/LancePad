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
  const { instruction, noteContent, notebookTitle, username, editMode } = await req.json();

  const noteText = noteContent ? extractText(noteContent) : "";

  const appendOnly = editMode === "append";
  const systemPrompt = `${buildHelpSystemPrompt(username)}

You are editing a student's notes for "${notebookTitle}".
Return ONLY valid JSON (no markdown code blocks), exactly this structure:
{
  "message": "brief LanceBot-style confirmation in 1 complete sentence",
  "editedMarkdown": "${appendOnly ? "only the new markdown section to append" : "the complete updated notes in markdown format"}"
}

Rules:
- Keep the message concise, mostly English, and complete. No cliffhangers or long jokes.
- editedMarkdown must be ${appendOnly ? "ONLY the new content to append, not the full notebook" : "the COMPLETE updated content — not just the changed part"}
- Preserve everything the student didn't ask you to change
- Use proper markdown: ## for headings, - for bullets, **bold**, etc.
${appendOnly
    ? `- Create only the new section that can be appended to the bottom of the current notes
- Use a clear heading based on the student's request
- If the request asks for an outline, create a real study outline: use a ## topic heading, 3-5 useful ### subsections, concise bullets, important terms, examples when helpful, and 2-4 quick review questions
- If the notebook is empty, make the new section stand alone instead of writing a tiny intro
- Do not return only a definition or 3-4 generic bullets unless the student explicitly asked for a quick note
- If the request asks to continue or expand something, write only the extra material as a new section or subsection
- If the student asks to add info, make it specific and study-ready, not a repeat of the current notes
- The message should clearly say the section was added to the bottom of the notes
- Never return empty editedMarkdown`
    : `- If the notes are empty and they ask to add content, create it from scratch
- If asked to create/start/build an outline, study guide, template, or notes for a topic, return real markdown content in editedMarkdown
- If asked to continue, extend, expand, or add more info to a section, table, concept, or topic, update the relevant part of the existing notes and keep the rest intact
- If the right location is unclear, add a clearly titled new section near the end instead of replacing unrelated notes
- Never respond with only a conversational message for a notes-building request; editedMarkdown must contain the complete updated notes`}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Current notes:\n"""\n${noteText || "(empty)"}\n"""\n\nInstruction: ${instruction}` },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      message: parsed.message ?? "Done! ✨",
      editedMarkdown: parsed.editedMarkdown ?? "",
    });
  } catch {
    return NextResponse.json({ message: "Hmm, couldn't edit that — try again? 😅", editedMarkdown: "" }, { status: 500 });
  }
}
