"use client";

import { useState, useRef } from "react";
import { X, Sparkles, ClipboardPaste, Loader2, Upload, FileText, ArrowLeft } from "lucide-react";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";

interface PasteImportModalProps {
  notebookTitle: string;
  username: string | null;
  onClose: () => void;
  onInsert: (tiptapJson: string) => void;
}

function plainTextToTiptap(text: string): string {
  const lines = text.split("\n");
  const content = lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ type: "paragraph", content: [{ type: "text", text: l }] }));
  return JSON.stringify({ type: "doc", content: content.length ? content : [{ type: "paragraph" }] });
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return extractPdf(file);
  if (ext === "docx" || ext === "doc") return extractDocx(file);
  return file.text();
}

type Step = "pick" | "preview";

export default function PasteImportModal({ notebookTitle, username, onClose, onInsert }: PasteImportModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setExtracting(true);
    setFileName(file.name);
    try {
      const extracted = await extractText(file);
      if (!extracted.trim()) throw new Error("No readable text found in this file.");
      setText(extracted);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setExtracting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInsertRaw() {
    onInsert(plainTextToTiptap(text));
    onClose();
  }

  async function handleCleanAndInsert() {
    setCleaning(true);
    setError(null);
    try {
      const res = await fetch("/api/lancebot-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: "Reformat this raw imported content into clean, organized study notes. Add proper headings, bullet points, and structure. Keep all the information.",
          noteContent: plainTextToTiptap(text),
          notebookTitle,
          username,
        }),
      });
      const { editedMarkdown } = await res.json();
      if (!editedMarkdown) throw new Error("No content returned");
      onInsert(JSON.stringify(markdownToTiptap(editedMarkdown)));
      onClose();
    } catch {
      setError("Couldn't clean that up — try inserting as-is instead.");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 bounce-in flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === "preview" && (
              <button onClick={() => setStep("pick")} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">Import File</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {step === "pick" ? "Supports PDF, Word (.docx), and plain text files" : fileName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Step 1: File picker */}
        {step === "pick" && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-14 cursor-pointer transition-all ${
                dragging ? "border-purple-500 bg-purple-950/20" : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
              }`}
            >
              {extracting ? (
                <>
                  <Loader2 size={32} className="text-purple-400 animate-spin" />
                  <p className="text-gray-400 text-sm font-medium">Extracting text...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Upload size={20} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">Drop a file here</p>
                    <p className="text-gray-500 text-xs mt-1">or click to browse</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {["PDF", "DOCX", "TXT"].map((t) => (
                      <span key={t} className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full font-mono">{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </>
        )}

        {/* Step 2: Text preview */}
        {step === "preview" && (
          <>
            <div className="relative">
              <div className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-gray-600 pointer-events-none">
                <FileText size={11} />
                {text.length.toLocaleString()} chars
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-52 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-28 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-600/60 transition-colors leading-relaxed"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInsertRaw}
                disabled={!text.trim() || cleaning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ClipboardPaste size={15} />
                Insert as-is
              </button>
              <button
                onClick={handleCleanAndInsert}
                disabled={!text.trim() || cleaning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-900/40"
              >
                {cleaning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {cleaning ? "Cleaning up..." : "Clean & Insert"}
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center -mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
