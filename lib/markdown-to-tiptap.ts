type TextNode = { type: "text"; text: string; marks?: { type: string }[] };
type TiptapNode = { type: string; attrs?: Record<string, unknown>; content?: TiptapNode[] | TextNode[] };

function parseInline(text: string): TextNode[] {
  const result: TextNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) result.push({ type: "text", text: text.slice(last, match.index) });
    const m = match[0];
    if (m.startsWith("**")) result.push({ type: "text", text: m.slice(2, -2), marks: [{ type: "bold" }] });
    else if (m.startsWith("*")) result.push({ type: "text", text: m.slice(1, -1), marks: [{ type: "italic" }] });
    else result.push({ type: "text", text: m.slice(1, -1), marks: [{ type: "code" }] });
    last = match.index + m.length;
  }
  if (last < text.length) result.push({ type: "text", text: text.slice(last) });
  return result.length ? result : [{ type: "text", text: "" }];
}

export function markdownToTiptap(md: string): object {
  const lines = md.split("\n");
  const content: TiptapNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      content.push({ type: "heading", attrs: { level: 3 }, content: parseInline(line.slice(4)) });
    } else if (line.startsWith("## ")) {
      content.push({ type: "heading", attrs: { level: 2 }, content: parseInline(line.slice(3)) });
    } else if (line.startsWith("# ")) {
      content.push({ type: "heading", attrs: { level: 1 }, content: parseInline(line.slice(2)) });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: TiptapNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(lines[i].slice(2)) }] });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(lines[i].replace(/^\d+\. /, "")) }] });
        i++;
      }
      content.push({ type: "orderedList", attrs: { start: 1 }, content: items });
      continue;
    } else if (line.startsWith("> ")) {
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: parseInline(line.slice(2)) }] });
    } else if (line === "---" || line === "***" || line === "___") {
      content.push({ type: "horizontalRule" });
    } else if (line.trim() !== "") {
      content.push({ type: "paragraph", content: parseInline(line) });
    }

    i++;
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
