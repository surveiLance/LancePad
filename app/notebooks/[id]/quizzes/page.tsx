"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LanceBot from "@/components/LanceBot";
import Button from "@/components/ui/Button";

const QUIZ_TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  fill_blank: "Fill in the Blank",
};

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function QuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as Id<"notebooks">;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const sessions = useQuery(api.quizSessions.getByNotebook, { notebookId });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (notebook === null) { router.push("/notebooks"); return null; }
  if (!sessions) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <LanceBot mood="thinking" size={60} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/notebooks/${notebookId}`} className="text-gray-500 hover:text-gray-300 flex items-center gap-1.5 text-sm">
            <ArrowLeft size={15} />
            Back
          </Link>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: notebook?.color }} />
          <span className="text-white font-semibold truncate flex-1 text-sm">
            {notebook?.emoji} {notebook?.title} — Quizzes
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <LanceBot mood="idle" size={72} className="mx-auto mb-4" />
            <p className="text-white font-bold text-lg">No quizzes yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-6">Generate a quiz from your notes to get started.</p>
            <Link href={`/notebooks/${notebookId}`}>
              <Button>Go to notebook</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-6">{sessions.length} quiz{sessions.length !== 1 ? "zes" : ""} taken</p>
            {sessions.map((session, si) => {
              const isExpanded = expanded === session._id;
              const completed = !!session.completedAt;
              const correct = session.results?.filter((r) => r.result === "correct").length ?? 0;
              const total = session.questions.length;
              const pct = completed ? Math.round((correct / total) * 100) : null;

              return (
                <div key={session._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  {/* Session header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : session._id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">
                          Quiz #{sessions.length - si}
                        </span>
                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-full">
                          {QUIZ_TYPE_LABEL[session.quizType] ?? session.quizType}
                        </span>
                        {!completed && (
                          <span className="text-xs text-yellow-400 px-2 py-0.5 bg-yellow-950/40 border border-yellow-800/40 rounded-full">
                            Incomplete
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{timeAgo(session._creationTime)}</span>
                        <span>·</span>
                        <span>{total} questions</span>
                        {completed && pct !== null && (
                          <>
                            <span>·</span>
                            <span className={pct >= 80 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}>
                              {correct}/{total} correct ({pct}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!completed && (
                        <Link
                          href={`/notebooks/${notebookId}/study?session=${session._id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm"><ChevronRight size={13} />Resume</Button>
                        </Link>
                      )}
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Expanded: question list */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 divide-y divide-gray-800/60">
                      {session.questions.map((q, qi) => {
                        const res = session.results?.find((r) => r.questionIndex === qi);
                        return (
                          <div key={qi} className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex-shrink-0">
                                {res ? (
                                  res.result === "correct"
                                    ? <CheckCircle2 size={15} className="text-green-400" />
                                    : <XCircle size={15} className="text-red-400" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium mb-1 leading-snug">{q.question}</p>
                                {q.type === "multiple_choice" && q.options && (
                                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                                    {q.options.map((opt, oi) => (
                                      <div
                                        key={oi}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                                          opt === q.answer
                                            ? "bg-green-900/30 border-green-700/50 text-green-300"
                                            : res?.userAnswer === opt
                                            ? "bg-red-900/30 border-red-700/50 text-red-300"
                                            : "bg-gray-800/60 border-gray-700/60 text-gray-500"
                                        }`}
                                      >
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  <span className="text-purple-400 font-medium">Answer: </span>
                                  <span className="text-gray-300">{q.answer}</span>
                                  {res && res.result === "incorrect" && (
                                    <span className="ml-3 text-red-400">
                                      Your answer: {res.userAnswer}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
