"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, RotateCcw, Lightbulb } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LanceBot from "@/components/LanceBot";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type QuizResult = { questionIndex: number; question: string; result: "correct" | "incorrect"; userAnswer: string; correctAnswer: string };
type CardState = "question" | "answered" | "revealed";

type StudyCard = {
  _id: string;
  question: string;
  answer: string;
  type: string;
  options?: string[];
  isQuiz: boolean;
};

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notebookId = params.id as Id<"notebooks">;
  const sessionId = searchParams.get("session") as Id<"quizSessions"> | null;

  const notebook = useQuery(api.notebooks.get, { id: notebookId });
  const allCards = useQuery(api.cards.getByNotebook, { notebookId });
  const note = useQuery(api.notes.getByNotebook, { notebookId });
  const username = useQuery(api.userProfiles.getMe) ?? null;
  const quizSession = useQuery(
    api.quizSessions.get,
    sessionId ? { id: sessionId } : "skip"
  );
  const recordReview = useMutation(api.cards.recordReview);
  const completeSession = useMutation(api.quizSessions.complete);

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [originalCards, setOriginalCards] = useState<StudyCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [cardState, setCardState] = useState<CardState>("question");
  const [selected, setSelected] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeFeedback, setGradeFeedback] = useState<{ correct: boolean; partial: boolean; feedback: string } | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [botMood, setBotMood] = useState<"idle" | "happy" | "celebrate" | "sad" | "thinking">("idle");
  const [botMessage, setBotMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [botHovered, setBotHovered] = useState(false);

  const CORRECT = ["Yessss! 🔥", "LET'S GO! 🎉", "Correct. Ayos! 🎯", "Sige, that's the move 💪", "Clean answer 💯", "Boom! ✨", "Nice work, talaga 🔥", "Clean! ✅"];
  const WRONG   = ["Not quite, but we can fix it 😔", "Tricky one. Next time 👀", "No worries, review mode lang 💪", "Oops! 😅", "You got this next time 🤙", "Ay, close. Keep going 😄"];
  const PARTIAL = ["Almost there 🤏", "Good effort 💪", "Close, keep it up ✨", "You have the main idea, gets?"];

  function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }

  function setBotComment(mood: typeof botMood, message: string) {
    setBotMood(mood);
    setBotMessage(message);
  }

  // Clear bot message when moving to a new card
  useEffect(() => {
    if (done) return;
    setBotMessage("");
    setBotMood("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, done]);

  // Load cards from either quiz session or flashcard library
  useEffect(() => {
    if (sessionId && quizSession) {
      const loaded = quizSession.questions.map((q, i) => ({
        _id: `q-${i}`,
        question: q.question,
        answer: q.answer,
        type: q.type,
        options: q.options,
        isQuiz: true,
      }));
      setCards(loaded);
      setOriginalCards(loaded);
    } else if (!sessionId && allCards && allCards.length > 0) {
      const loaded = allCards.map((c) => ({ ...c, _id: c._id, isQuiz: false }));
      setCards(loaded);
      setOriginalCards(loaded);
    }
  }, [sessionId, quizSession, allCards]);

  useEffect(() => {
    if (notebook === null) router.push("/notebooks");
  }, [notebook, router]);

  const card = cards[current];

  async function explainWrongAnswer(question: string, correctAnswer: string, userAnswer: string) {
    setBotMood("thinking");
    setBotMessage("");
    try {
      const res = await fetch("/api/lancebot-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, correctAnswer, userAnswer, notebookTitle: notebook?.title, noteContent: note?.content ?? "", username }),
      });
      const { explanation } = await res.json();
      setBotMood("sad");
      setBotMessage(explanation);
    } catch {
      setBotComment("sad", pick(WRONG));
    }
  }

  async function handleHint() {
    if (!card || grading) return;
    setBotHovered(false);
    setBotComment("thinking", "One sec, thinking of a hint... 🤔");
    try {
      const res = await fetch("/api/lancebot-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: card.question,
          correctAnswer: card.answer,
          userAnswer: "give a hint only — do NOT reveal the full answer, just nudge them in the right direction in 1 sentence",
          notebookTitle: notebook?.title,
          noteContent: note?.content ?? "",
          username,
        }),
      });
      const { explanation } = await res.json();
      setBotComment("happy", explanation);
    } catch {
      setBotComment("happy", "Check your notes — the answer is in there, promise 📖");
    }
  }

  function handleMultipleChoice(option: string) {
    if (cardState !== "question" || !card) return;
    setSelected(option);
    setCardState("answered");
    const isCorrect = option === card.answer;
    recordResult(isCorrect, option);
    if (isCorrect) {
      setBotComment("celebrate", pick(CORRECT));
    } else {
      explainWrongAnswer(card.question, card.answer, option);
    }
  }

  function fillBlankIsCorrect(userAnswer: string, correctAnswer: string): boolean {
    const u = userAnswer.toLowerCase().trim();
    const a = correctAnswer.toLowerCase().trim();
    if (u === a) return true;
    // Accept if user typed only the first N words of the answer (handles AI over-generating the answer)
    const uWords = u.split(/\s+/);
    const aWords = a.split(/\s+/);
    return uWords.length < aWords.length && aWords.slice(0, uWords.length).join(" ") === u;
  }

  function handleFillBlank() {
    if (!shortAnswer.trim() || cardState !== "question" || !card) return;
    setCardState("answered");
    const isCorrect = fillBlankIsCorrect(shortAnswer, card.answer);
    recordResult(isCorrect, shortAnswer);
    if (isCorrect) {
      setBotComment("celebrate", pick(CORRECT));
    } else {
      explainWrongAnswer(card.question, card.answer, shortAnswer);
    }
  }

  async function handleShortAnswer() {
    if (!shortAnswer.trim() || grading || !card) return;
    setGrading(true);
    setCardState("answered");
    setBotComment("thinking", "Checking your answer... 🤔");

    let grade = { correct: false, partial: false, score: 0, feedback: "Hmm, trouble grading that — keep going! 🤖" };
    try {
      const res = await fetch("/api/grade-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: card.question, modelAnswer: card.answer, userAnswer: shortAnswer, notebookTitle: notebook?.title, username }),
      });
      grade = await res.json();
    } catch {
      // fall through with default grade
    }
    setGradeFeedback(grade);
    setGrading(false);
    const isCorrect = grade.correct || (grade.partial && grade.score >= 70);
    recordResult(isCorrect, shortAnswer);
    if (grade.correct) {
      setBotComment("celebrate", pick(CORRECT));
    } else if (grade.partial) {
      setBotComment("happy", pick(PARTIAL));
    } else {
      explainWrongAnswer(card.question, card.answer, shortAnswer);
    }
  }

  function handleRevealFlashcard(isCorrect: boolean) {
    if (!card) return;
    setCardState("revealed");
    recordResult(isCorrect, isCorrect ? card.answer : "incorrect");
    if (isCorrect) {
      setBotComment("celebrate", pick(CORRECT));
    } else {
      explainWrongAnswer(card.question, card.answer, "marked as missed");
    }
  }

  function recordResult(isCorrect: boolean, userAnswer: string) {
    if (!card) return;
    const result = isCorrect ? "correct" : "incorrect";
    const idx = current;
    setResults((prev) => [...prev, { questionIndex: idx, question: card.question, result, userAnswer, correctAnswer: card.answer }]);
    if (!card.isQuiz) {
      recordReview({ cardId: card._id as Id<"cards">, result });
    }
  }

  const finishSession = useCallback(async (finalResults: QuizResult[]) => {
    setDone(true);
    setLoadingSummary(true);

    if (sessionId) {
      await completeSession({
        id: sessionId,
        results: finalResults.map((r) => ({
          questionIndex: r.questionIndex,
          result: r.result,
          userAnswer: r.userAnswer,
        })),
      });
    }

    try {
      const res = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: finalResults, notebookTitle: notebook?.title, username }),
      });
      const { summary: s } = await res.json();
      setSummary(s);
    } catch {
      setSummary("Great session! Keep reviewing what you missed and you'll get it next time. 💪");
    }
    setLoadingSummary(false);
  }, [sessionId, completeSession, notebook?.title]);

  async function nextCard() {
    if (current + 1 >= cards.length) {
      await finishSession([...results]);
      return;
    }
    setCurrent((c) => c + 1);
    setCardState("question");
    setSelected("");
    setShortAnswer("");
    setGradeFeedback(null);
    setBotMood("idle");
    setBotMessage("");
  }

  function restartSession() {
    setCards(originalCards);
    setCurrent(0);
    setCardState("question");
    setSelected("");
    setShortAnswer("");
    setGradeFeedback(null);
    setResults([]);
    setBotMood("idle");
    setBotMessage("");
    setDone(false);
    setSummary("");
  }

  function retryWrongAnswers() {
    const wrongCards = results
      .filter((r) => r.result === "incorrect")
      .map((r) => cards[r.questionIndex])
      .filter(Boolean) as StudyCard[];
    setCards(wrongCards);
    setCurrent(0);
    setCardState("question");
    setSelected("");
    setShortAnswer("");
    setGradeFeedback(null);
    setResults([]);
    setBotMood("idle");
    setBotMessage("");
    setDone(false);
    setSummary("");
  }

  if (done) {
    const correctCount = results.filter((r) => r.result === "correct").length;
    const pct = Math.round((correctCount / results.length) * 100);
    const mood = pct >= 80 ? "celebrate" : pct >= 50 ? "happy" : "sad";
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full text-center">
          <LanceBot mood={mood} size={80} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-1">
            {pct >= 80 ? "Absolutely cooked 🔥" : pct >= 50 ? "Decent run 👍" : "We'll get there 💪"}
          </h1>
          <p className="text-gray-400 mb-6">{correctCount} / {results.length} correct ({pct}%)</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left mb-6">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">🤖 LanceBot&apos;s Session Recap</p>
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm"><LanceBot mood="thinking" size={24} animate /> <span>Writing up your recap...</span></div>
            ) : (
              <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
            )}
          </div>
          {results.filter((r) => r.result === "incorrect").length > 0 && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 text-left mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Review these 👀</p>
                <button
                  onClick={retryWrongAnswers}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold border border-purple-800 hover:border-purple-600 rounded-lg px-2.5 py-1 transition-colors"
                >
                  Quiz me on these →
                </button>
              </div>
              <ul className="space-y-1">
                {results.filter((r) => r.result === "incorrect").map((r, i) => (
                  <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                    <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    {r.question}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={restartSession} variant="secondary"><RotateCcw size={15} />Try again</Button>
            <Link href={`/notebooks/${notebookId}`}><Button>Back to notebook</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/notebooks/${notebookId}`} className="text-gray-500 hover:text-gray-300"><ArrowLeft size={18} /></Link>
          <div className="flex-1 text-center">
            <span className="text-gray-400 text-sm">{notebook?.emoji} {notebook?.title}</span>
            {sessionId && <span className="ml-2 text-xs text-purple-400 font-semibold">Quiz</span>}
          </div>
          <span className="text-gray-500 text-sm">{current + 1} / {cards.length}</span>
        </div>
        <div className="h-1 bg-gray-900">
          <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${((current + 1) / (cards.length || 1)) * 100}%` }} />
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {card.type === "multiple_choice" && "Multiple Choice"}
            {card.type === "fill_blank" && "Fill in the Blank"}
            {card.type === "short_answer" && "Short Answer (graded by LanceBot)"}
            {card.type === "flashcard" && "Flashcard"}
          </span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-white text-lg leading-relaxed font-medium">{card.question}</p>
        </div>

        {card.type === "multiple_choice" && (
          <div className="space-y-3">
            {(card.options ?? []).map((option) => {
              const isSelected = selected === option;
              const isCorrect = option === card.answer;
              const showResult = cardState === "answered";
              return (
                <button key={option} onClick={() => handleMultipleChoice(option)} disabled={cardState !== "question"}
                  className={cn("w-full text-left px-5 py-4 rounded-2xl border transition-all font-medium",
                    !showResult && "bg-gray-900 border-gray-800 hover:border-purple-600 hover:bg-gray-800/50",
                    showResult && isCorrect && "bg-green-900/40 border-green-600 text-green-200",
                    showResult && isSelected && !isCorrect && "bg-red-900/40 border-red-600 text-red-200",
                    showResult && !isSelected && !isCorrect && "bg-gray-900 border-gray-800 opacity-50",
                  )}>
                  <div className="flex items-center gap-3">
                    {showResult && isCorrect && <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />}
                    {showResult && isSelected && !isCorrect && <XCircle size={18} className="text-red-400 flex-shrink-0" />}
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {card.type === "fill_blank" && (
          <div className="space-y-3">
            <input type="text" placeholder="Fill in the blank..." value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)} disabled={cardState !== "question"}
              onKeyDown={(e) => e.key === "Enter" && handleFillBlank()}
              className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors" />
            {cardState === "question" && <Button onClick={handleFillBlank} disabled={!shortAnswer.trim()}>Check answer</Button>}
            {cardState === "answered" && (() => {
              const correct = fillBlankIsCorrect(shortAnswer, card.answer);
              return (
                <div className={cn("rounded-xl px-4 py-3 text-sm space-y-1",
                  correct
                    ? "bg-green-900/30 border border-green-700 text-green-300"
                    : "bg-red-900/30 border border-red-700 text-red-300")}>
                  <div><span className="font-semibold">Correct answer: </span>{card.answer}</div>
                  {!correct && <div><span className="font-semibold">Your answer: </span>{shortAnswer}</div>}
                </div>
              );
            })()}
          </div>
        )}

        {card.type === "short_answer" && (
          <div className="space-y-3">
            <textarea placeholder="Type your answer here..." value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)} disabled={cardState !== "question" || grading}
              rows={4} className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors resize-none" />
            {cardState === "question" && <Button onClick={handleShortAnswer} disabled={!shortAnswer.trim() || grading}>{grading ? "LanceBot is grading... 🤖" : "Submit answer"}</Button>}
            {gradeFeedback && (
              <div className={cn("rounded-xl px-4 py-3 text-sm space-y-1",
                gradeFeedback.correct ? "bg-green-900/30 border border-green-700" : gradeFeedback.partial ? "bg-yellow-900/30 border border-yellow-700" : "bg-red-900/30 border border-red-700")}>
                <div className="font-semibold text-white">{gradeFeedback.correct ? "✅ Correct!" : gradeFeedback.partial ? "⚠️ Partial" : "❌ Missed"}</div>
                <p className="text-gray-300">{gradeFeedback.feedback}</p>
                <p className="text-gray-500 text-xs"><span className="font-semibold">Model answer:</span> {card.answer}</p>
              </div>
            )}
          </div>
        )}

        {card.type === "flashcard" && (
          <div className="space-y-3">
            {cardState === "question" && <Button variant="secondary" className="w-full" onClick={() => setCardState("revealed")}>Reveal answer</Button>}
            {cardState === "revealed" && (
              <>
                <div className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-4"><p className="text-gray-300">{card.answer}</p></div>
                <div className="flex gap-3">
                  <Button variant="danger" className="flex-1" onClick={() => handleRevealFlashcard(false)}><XCircle size={15} />Missed it</Button>
                  <Button className="flex-1" onClick={() => handleRevealFlashcard(true)}><CheckCircle2 size={15} />Got it!</Button>
                </div>
              </>
            )}
          </div>
        )}

        {cardState !== "question" && !grading && (
          <Button onClick={nextCard} className="self-end">
            {current + 1 >= cards.length ? "See results" : "Next"}
            <ChevronRight size={15} />
          </Button>
        )}
      </div>

      {/* LanceBot — bottom left */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
        {/* Speech bubble — pointer-events-none so it doesn't block the quiz */}
        {botMessage && (
          <div
            key={botMessage}
            className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 text-base text-gray-200 w-[580px] max-w-[calc(100vw-6rem)] leading-relaxed shadow-lg bounce-in pointer-events-none"
          >
            {botMessage}
          </div>
        )}

        {/* Bot + hint affordance */}
        <div
          className="relative flex flex-col items-start gap-1.5"
          onMouseEnter={() => setBotHovered(true)}
          onMouseLeave={() => setBotHovered(false)}
        >
          {/* Hover actions */}
          {botHovered && cardState === "question" && !done && (
            <div className="flex items-center gap-2 bounce-in">
              <button
                onClick={handleHint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-all shadow-lg"
              >
                <Lightbulb size={12} />
                Get a hint
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <LanceBot mood={botMood} size={72} animate />
            {/* Persistent label */}
            {!botHovered && (
              <div className="mb-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900/80 border border-gray-800 text-gray-500 text-[10px] font-medium select-none bounce-in">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                hover me
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
