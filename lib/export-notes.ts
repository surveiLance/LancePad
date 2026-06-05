type TiptapNode = { type?: string; text?: string; marks?: { type: string }[]; content?: TiptapNode[]; attrs?: Record<string, unknown> };

function nodeToMarkdown(node: TiptapNode, indent = ""): string {
  if (node.type === "text") {
    let t = node.text ?? "";
    if (node.marks?.some((m) => m.type === "bold")) t = `**${t}**`;
    if (node.marks?.some((m) => m.type === "italic")) t = `*${t}*`;
    if (node.marks?.some((m) => m.type === "code")) t = `\`${t}\``;
    return t;
  }
  const children = () => (node.content ?? []).map((c) => nodeToMarkdown(c, indent)).join("");
  switch (node.type) {
    case "doc": return (node.content ?? []).map((c) => nodeToMarkdown(c)).join("\n");
    case "paragraph": return children() + "\n";
    case "heading": return `${"#".repeat((node.attrs?.level as number) ?? 2)} ${children()}\n`;
    case "bulletList": return (node.content ?? []).map((c) => nodeToMarkdown(c, indent)).join("");
    case "orderedList": return (node.content ?? []).map((c, i) => nodeToMarkdown(c, indent + `${i + 1}. `)).join("");
    case "listItem": return `${indent}- ${(node.content ?? []).map((c) => nodeToMarkdown(c)).join("").replace(/\n$/, "")}\n`;
    case "blockquote": return `> ${children().replace(/\n/g, "\n> ")}`;
    case "horizontalRule": return "---\n";
    case "hardBreak": return "  \n";
    case "image": return `![image](${node.attrs?.src ?? ""})\n`;
    default: return children();
  }
}

export function tiptapToMarkdown(tiptapJson: string): string {
  try {
    return nodeToMarkdown(JSON.parse(tiptapJson)).trim();
  } catch {
    return "";
  }
}

export function downloadMarkdown(title: string, tiptapJson: string) {
  const md = `# ${title}\n\n${tiptapToMarkdown(tiptapJson)}`;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printNotes(title: string, tiptapJson: string) {
  const md = tiptapToMarkdown(tiptapJson);
  const html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n/g, "<br>");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.7; }
    h1,h2,h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    li { margin: 4px 0; }
  </style></head><body><h1>${title}</h1><div>${html}</div></body></html>`);
  win.document.close();
  win.print();
}
