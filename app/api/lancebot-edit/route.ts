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
  const { instruction, noteContent, notebookTitle, username, notebookType } = await req.json();

  const noteText = noteContent ? extractText(noteContent) : "";

  const isAssignment = notebookType === "assignment";
  const systemPrompt = `${buildHelpSystemPrompt(username)}

You are ${isAssignment ? `helping complete an assignment called "${notebookTitle}"` : `editing a student's notes for "${notebookTitle}"`}.
Return ONLY valid JSON (no markdown code blocks), exactly this structure:
{
  "message": "brief 1-2 sentence LanceBot-style confirmation of what you did",
  "editedMarkdown": "the complete updated ${isAssignment ? "assignment work" : "notes"} in markdown format"
}

Rules:
- editedMarkdown must be the COMPLETE updated content — not just the changed part
- Preserve everything the student didn't ask you to change
- Use proper markdown: ## for headings, - for bullets, **bold**, etc.
${isAssignment
  ? `- This is assignment work — write actual deliverable content, not study notes or summaries
- If given requirements, create a structured draft with headed sections ready to fill in
- Write in an appropriate academic/professional tone unless told otherwise`
  : `- If the notes are empty and they ask to add content, create it from scratch`}`;

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
