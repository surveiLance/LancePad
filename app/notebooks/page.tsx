"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Check, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NotebookCard from "@/components/NotebookCard";
import CreateNotebookModal from "@/components/CreateNotebookModal";
import LanceBot from "@/components/LanceBot";
import Link from "next/link";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const LOADING_QUIPS = [
  "Hintay ka lang pre, kinukuha ko na lahat 📦",
  "Loading... o baka nag-aayos lang ako ng buhok ko 💁",
  "Sandali lang ha, promise mabilis to 😭",
  "Uy wag kang aalis, andito na ako 👀",
  "Bro... ako na bahala. Trust the process 🙏",
  "Konting tiis lang pre, malapit na 💀",
  "Nag-load na to dati mas mabilis... sus 😤",
  "Ikaw ba yun? Teka, inaayos ko pa yung notebook mo 📚",
];

function LoadingScreen() {
  const [quip, setQuip] = useState(LOADING_QUIPS[0]);

  useEffect(() => {
    setQuip(LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)]);
    const interval = setInterval(() => {
      setQuip(LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center gap-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-700/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex flex-col items-center gap-5">
        <LanceBot mood="thinking" size={110} animate headsetFloat />
        <div
          key={quip}
          className="max-w-xs bg-gray-900 border border-purple-800/50 rounded-2xl px-5 py-3 text-sm text-purple-100 leading-snug text-center shadow-xl"
          style={{ animation: "bubble-in 0.3s ease-out" }}
        >
          {quip}
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-500"
              style={{ animation: `breathe 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NotebooksPage() {
  const router = useRouter();
  const notebooksQuery = useQuery(api.notebooks.list);
  const notebooks = notebooksQuery ?? [];
  const loading = notebooksQuery === undefined;
  const createNotebook = useMutation(api.notebooks.create);
  const removeNotebook = useMutation(api.notebooks.remove);
  const toggleTask = useMutation(api.tasks.toggle);
  const [showCreate, setShowCreate] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const now = new Date();
  const todayStr = toDateStr(now);
  const todayTasks = useQuery(api.tasks.getByDate, { date: todayStr }) ?? [];
  const upcomingTasks = useQuery(api.tasks.getUpcoming, { from: todayStr, days: 90 }) ?? [];

  // Build 7-day strip starting today
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return { date: d, str: toDateStr(d) };
  });

  const greetings = [
    "Ready to lock in? 🔒",
    "What are we cooking today? 🍳",
    "Back again! Let's get it 🚀",
    "Your brain is about to level up 🧠",
  ];
  const greeting = greetings[Math.floor(Date.now() / 86400000) % greetings.length];

  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    const pending = todayTasks.filter((t) => !t.completed);
    const upcoming = upcomingTasks.filter((t) => t.date !== todayStr && !t.completed);

    const quips = pending.length > 0 ? [
      `Uy! May ${pending.length} task ka pa ngayon. Sige na pre 👀`,
      `${pending[0]?.title}? Di pa tapos yan! Tara na 💪`,
      `Huwag mong kalimutan yung tasks mo ngayon ha! 📅`,
    ] : upcoming.length > 0 ? [
      `May ${upcoming.length} incoming tasks ka pa. Plan na! 📅`,
      `Uy, may darating na tasks. Mag-aral na habang maaga 📚`,
      `I see your schedule. Busy ka pre. Kaya mo yan 💪`,
    ] : [
      "Uy, pumunta ka na dito! Mag-aral na tayo 📚",
      "Bro is just staring at the screen 💀 sige na pre",
      "Walang tasks? Perfect time mag-aral nang walang pressure 😌",
      "Lodi, mag-add ka ng tasks sa calendar para di ka malimot 📅",
      "Bet? Tara na, mag-aral tayo 🚀",
    ];

    const show = () => setBubble(quips[Math.floor(Math.random() * quips.length)]);
    const first = setTimeout(show, 2000);
    const interval = setInterval(show, 15000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [todayTasks.length, upcomingTasks.length]);

  async function handleCreate(title: string, color: string, emoji: string) {
    const id = await createNotebook({ title, color, emoji });
    router.push(`/notebooks/${id}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notebook? This can't be undone.")) return;
    await removeNotebook({ id: id as Id<"notebooks"> });
  }

  // Group all upcoming tasks by date, excluding today, hide completed
  const upcomingByDate = (() => {
    const dateMap = new Map<string, typeof upcomingTasks>();
    for (const t of upcomingTasks) {
      if (t.date === todayStr || t.completed) continue;
      if (!dateMap.has(t.date)) dateMap.set(t.date, []);
      dateMap.get(t.date)!.push(t);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([str, tasks]) => ({ date: new Date(str + "T00:00:00"), str, tasks }));
  })();

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-700/10 blur-3xl rounded-full" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LanceBot mood="happy" size={30} animate={false} />
            <span className="font-bold text-white text-lg tracking-tight">LancePad</span>
          </div>
          <Link href="/calendar" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium transition-all">
            <Calendar size={15} />
            Calendar
          </Link>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-10 bounce-in">
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">{greeting}</h1>
          <p className="text-gray-400 mt-2 text-base">Pick a notebook or start a new one.</p>
          <div className="relative mt-6 flex items-end justify-center">
            <LanceBot mood={todayTasks.filter(t => !t.completed).length > 0 ? "thinking" : "happy"} size={88} animate />
            {bubble && (
              <div
                key={bubble}
                className="absolute left-full ml-3 bottom-3 w-56 bg-gray-900 border border-purple-800/50 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-purple-100 leading-snug shadow-xl"
                style={{ animation: "bubble-in 0.3s ease-out" }}
              >
                {bubble}
                <div className="absolute -left-1.5 bottom-3 w-3 h-3 bg-gray-900 border-l border-b border-purple-800/50 rotate-45" />
              </div>
            )}
          </div>
        </div>

        {/* Body: notebooks + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* Left: Notebooks */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Your Notebooks</h2>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-purple-900/50 hover:-translate-y-0.5"
              >
                <Plus size={15} />
                New Notebook
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-900/60 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : notebooks.length === 0 ? (
              <div className="text-center py-20">
                <LanceBot mood="thinking" size={72} className="mx-auto mb-4" />
                <p className="text-white font-bold text-lg">No notebooks yet!</p>
                <p className="text-gray-500 text-sm mt-1 mb-5">Create one and I'll help you study it 🧠</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-900/50"
                >
                  <Plus size={15} />
                  Create your first notebook
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notebooks.map((nb, i) => (
                  <div key={nb._id} className="bounce-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <NotebookCard
                      notebook={{ ...nb, id: nb._id, created_at: nb._creationTime.toString() }}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setShowCreate(true)}
                  className="group border-2 border-dashed border-gray-800 hover:border-purple-600/60 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-purple-400 transition-all min-h-[180px] hover:bg-purple-950/10"
                >
                  <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-semibold">New Notebook</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Calendar sidebar */}
          <div className="flex flex-col gap-4">

            {/* 7-day strip */}
            <div className="bg-gray-900/80 border border-white/5 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">This Week</h3>
                <Link href="/calendar" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-0.5">
                  Full calendar <ChevronRight size={12} />
                </Link>
              </div>

              {/* Day strip */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {weekDays.map(({ date, str }, idx) => {
                  const isToday = str === todayStr;
                  const dayTasks = upcomingTasks.filter((t) => t.date === str);
                  const hasTasks = dayTasks.length > 0;
                  const isHovered = hoveredDay === str;
                  return (
                    <div
                      key={str}
                      className="relative"
                      onMouseEnter={() => hasTasks && setHoveredDay(str)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <Link href="/calendar"
                        className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all hover:-translate-y-0.5 ${isToday ? "bg-purple-600" : "hover:bg-gray-800"}`}
                      >
                        <span className={`text-xs font-medium mb-1 ${isToday ? "text-purple-200" : "text-gray-500"}`}>
                          {DAY_LABELS[date.getDay()]}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-300"}`}>
                          {date.getDate()}
                        </span>
                        {hasTasks && (
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 transition-all ${
                            dayTasks.every((t) => t.completed)
                              ? isToday ? "bg-white/20 blur-[1px]" : "bg-purple-400/25 blur-[1px]"
                              : isToday ? "bg-white/60" : "bg-purple-400"
                          }`} />
                        )}
                      </Link>
                      {isHovered && (
                        <div
                          className={`absolute bottom-full z-50 w-52 bg-gray-800 border border-purple-700/50 rounded-2xl px-3 py-2.5 shadow-xl ${idx < 3 ? "left-0" : idx > 4 ? "right-0" : "left-1/2 -translate-x-1/2"}`}
                          style={{ animation: "bubble-in 0.15s ease-out" }}
                        >
                          <p className="text-xs font-semibold text-purple-300 mb-2">
                            {DAY_LABELS[date.getDay()]} · {date.getDate()}
                          </p>
                          <div className="space-y-2">
                            {dayTasks.slice(0, 4).map((t) => {
                              const nb = notebooks.find((n) => n._id === t.notebookId);
                              return (
                                <div key={t._id}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{t.emoji ?? "📚"}</span>
                                    <span className={`text-xs truncate ${t.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{t.title}</span>
                                  </div>
                                  {nb && (
                                    <div className="mt-0.5 ml-5 flex items-center gap-1.5">
                                      <span className="text-[10px] text-gray-500">{nb.emoji} {nb.title}</span>
                                      <Link
                                        href={`/notebooks/${nb._id}`}
                                        className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 px-1.5 py-0.5 rounded-md transition-colors"
                                      >
                                        Check →
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {dayTasks.length > 4 && (
                              <p className="text-xs text-gray-500">+{dayTasks.length - 4} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today's tasks */}
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Today</p>
                {todayTasks.length === 0 ? (
                  <p className="text-gray-600 text-xs py-2">No tasks today. <Link href="/calendar" className="text-purple-500 hover:text-purple-400">Add one →</Link></p>
                ) : (
                  <div className="space-y-1.5">
                    {todayTasks.map((task) => (
                      <div key={task._id} className={`flex items-center gap-2.5 transition-all ${task.completed ? "opacity-50" : ""}`}>
                        <button
                          onClick={() => toggleTask({ id: task._id })}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all ${task.completed ? "bg-purple-600 border-purple-600" : "border-gray-600 hover:border-purple-500"}`}
                        >
                          {task.completed && <Check size={10} className="text-white" />}
                        </button>
                        <span className="text-sm flex-shrink-0">{task.emoji ?? "📚"}</span>
                        <span className={`text-sm flex-1 truncate ${task.completed ? "line-through text-gray-500" : "text-gray-200"}`}>
                          {task.title}
                        </span>
                        {task.notebookId && (
                          <Link href={`/notebooks/${task.notebookId}`} className="text-purple-400 hover:text-purple-300 flex-shrink-0">
                            <ChevronRight size={14} />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming */}
            {upcomingByDate.length > 0 && (
              <div className="bg-gray-900/80 border border-white/5 rounded-3xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Coming Up</h3>
                <div className="space-y-4">
                  {upcomingByDate.map(({ date, str, tasks }) => (
                    <div key={str}>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">
                        {DAY_LABELS[date.getDay()]} · {MONTH_SHORT[date.getMonth()]} {date.getDate()}
                      </p>
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const nb = notebooks.find((n) => n._id === task.notebookId);
                          return (
                            <div key={task._id}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{task.emoji ?? "📚"}</span>
                                <span className="text-sm text-gray-300 truncate">{task.title}</span>
                              </div>
                              {nb && (
                                <div className="mt-1 ml-6 flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{nb.emoji} {nb.title}</span>
                                  <Link
                                    href={`/notebooks/${nb._id}`}
                                    className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 px-2 py-0.5 rounded-lg transition-colors"
                                  >
                                    Check notebook →
                                  </Link>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showCreate && (
        <CreateNotebookModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
