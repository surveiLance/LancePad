"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, RotateCcw } from "lucide-react";
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
  const username = useQuery(api.userProfiles.getMe) ?? null;
  const quizSession = useQuery(
    api.quizSessions.get,
    sessionId ? { id: sessionId } : "skip"
  );
  const recordReview = useMutation(api.cards.recordReview);
  const completeSession = useMutation(api.quizSessions.complete);

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [cardState, setCardState] = useState<CardState>("question");
  const [selected, setSelected] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeFeedback, setGradeFeedback] = useState<{ correct: boolean; partial: boolean; feedback: string } | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [botMood, setBotMood] = useState<"idle" | "happy" | "celebrate" | "sad" | "thinking">("idle");
  const [botMessage, setBotMessage] = useState("");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [done, setDone] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState("");

  const CORRECT = ["Yessss! 🔥", "LET'S GO! 🎉", "Boom! ✨", "Nailed it! 🎯", "Clean! 💯", "Sige! 💪"];
  const WRONG   = ["Aww, not quite 😔", "That one's tricky!", "Review that one 👀", "Oops! 😅", "We'll get it next time 💪"];
  const PARTIAL = ["Almost there! 🤏", "Good effort! 💪", "Close! Keep it up ✨", "You got the gist!"];
  const IDLE    = ["You got this! 💪", "Take your time 🤔", "Trust your notes! 📝", "What do you think?", "Breathe. You studied for this 😌"];

  function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }

  function setBotComment(mood: typeof botMood, message: string) {
    setBotMood(mood);
    setBotMessage(message);
  }

  // After moving to a new card, show an idle nudge after a short pause
  useEffect(() => {
    if (done || cardState !== "question") return;
    setBotMessage("");
    setBotMood("idle");
    idleTimerRef.current = setTimeout(() => setBotMessage(pick(IDLE)), 1800);
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, done]);

  // Load cards from either quiz session or flashcard library
  useEffect(() => {
    if (sessionId && quizSession) {
      setCards(quizSession.questions.map((q, i) => ({
        _id: `q-${i}`,
        question: q.question,
        answer: q.answer,
        type: q.type,
        options: q.options,
        isQuiz: true,
      })));
    } else if (!sessionId && allCards && allCards.length > 0) {
      setCards(allCards.map((c) => ({ ...c, _id: c._id, isQuiz: false })));
    }
  }, [sessionId, quizSession, allCards]);

  useEffect(() => {
    if (notebook === null) router.push("/notebooks");
  }, [notebook, router]);

  const card = cards[current];

  function handleMultipleChoice(option: string) {
    if (cardState !== "question" || !card) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setSelected(option);
    setCardState("answered");
    const isCorrect = option === card.answer;
    recordResult(isCorrect, option);
    setBotComment(isCorrect ? "celebrate" : "sad", pick(isCorrect ? CORRECT : WRONG));
  }

  async function handleShortAnswer() {
    if (!shortAnswer.trim() || grading || !card) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setGrading(true);
    setCardState("answered");
    setBotComment("thinking", "Checking your answer... 🤔");

    const res = await fetch("/api/grade-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: card.question, modelAnswer: card.answer, userAnswer: shortAnswer, notebookTitle: notebook?.title, username }),
    });
    const grade = await res.json();
    setGradeFeedback(grade);
    setGrading(false);
    const isCorrect = grade.correct || (grade.partial && grade.score >= 70);
    recordResult(isCorrect, shortAnswer);
    setBotComment(
      grade.correct ? "celebrate" : grade.partial ? "happy" : "sad",
      pick(grade.correct ? CORRECT : grade.partial ? PARTIAL : WRONG),
    );
  }

  function handleRevealFlashcard(isCorrect: boolean) {
    if (!card) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setCardState("revealed");
    recordResult(isCorrect, isCorrect ? card.answer : "incorrect");
    setBotComment(isCorrect ? "celebrate" : "sad", pick(isCorrect ? CORRECT : WRONG));
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

    const res = await fetch("/api/session-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: finalResults, notebookTitle: notebook?.title, username }),
    });
    const { summary: s } = await res.json();
    setSummary(s);
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
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Review these 👀</p>
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
              onKeyDown={(e) => e.key === "Enter" && handleShortAnswer()}
              className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors" />
            {cardState === "question" && <Button onClick={handleShortAnswer} disabled={!shortAnswer.trim()}>Check answer</Button>}
            {cardState === "answered" && (
              <div className={cn("rounded-xl px-4 py-3 text-sm",
                shortAnswer.toLowerCase().trim() === card.answer.toLowerCase().trim()
                  ? "bg-green-900/30 border border-green-700 text-green-300"
                  : "bg-red-900/30 border border-red-700 text-red-300")}>
                <span className="font-semibold">Correct answer: </span>{card.answer}
              </div>
            )}
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

      {/* LanceBot — bottom left with timed speech bubble */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2 pointer-events-none">
        {botMessage && (
          <div
            key={botMessage}
            className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-200 max-w-[180px] leading-relaxed shadow-lg bounce-in"
          >
            {botMessage}
          </div>
        )}
        <LanceBot mood={botMood} size={52} animate={botMood === "thinking" || botMood === "idle"} />
      </div>
    </div>
  );
}
