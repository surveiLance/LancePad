"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Pencil, Folder, BookOpen, ChevronDown } from "lucide-react";
import LanceBot from "@/components/LanceBot";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const TASK_EMOJIS = ["📚", "✏️", "🧠", "📝", "🎯", "⚡", "🔥", "💡", "📖", "🏆"];

type LinkValue =
  | { type: "none" }
  | { type: "folder"; id: string }
  | { type: "notebook"; id: string };

interface Folder { _id: string; name: string; emoji: string; color: string; }
interface Notebook { _id: string; title: string; emoji: string; folderId?: string; }

function LinkPicker({
  value,
  onChange,
  folders,
  notebooks,
}: {
  value: LinkValue;
  onChange: (v: LinkValue) => void;
  folders: Folder[];
  notebooks: Notebook[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const label = (() => {
    if (value.type === "folder") {
      const f = folders.find((x) => x._id === value.id);
      return f ? <span className="flex items-center gap-1.5"><span className="text-base">{f.emoji}</span><span className="text-white font-medium">{f.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-semibold">Folder</span></span> : "Folder";
    }
    if (value.type === "notebook") {
      const nb = notebooks.find((x) => x._id === value.id);
      return nb ? <span className="flex items-center gap-1.5"><span className="text-base">{nb.emoji}</span><span className="text-white font-medium">{nb.title}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 font-semibold">Notebook</span></span> : "Notebook";
    }
    return <span className="text-gray-500">No link</span>;
  })();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden bounce-in max-h-64 overflow-y-auto">
          {/* None */}
          <button
            type="button"
            onClick={() => { onChange({ type: "none" }); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors ${value.type === "none" ? "text-purple-400" : "text-gray-400"}`}
          >
            <X size={13} />
            No link
            {value.type === "none" && <Check size={12} className="ml-auto" />}
          </button>

          {/* Folders section */}
          {folders.length > 0 && (
            <>
              <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-gray-800">
                <Folder size={11} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Folders</span>
              </div>
              {folders.map((f) => (
                <button
                  key={f._id}
                  type="button"
                  onClick={() => { onChange({ type: "folder", id: f._id }); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-800 transition-colors border-l-2 ${value.type === "folder" && value.id === f._id ? "text-white bg-amber-950/20" : "text-gray-200"}`}
                  style={{ borderLeftColor: f.color }}
                >
                  <span className="text-lg">{f.emoji}</span>
                  <span className="text-sm font-medium flex-1">{f.name}</span>
                  {value.type === "folder" && value.id === f._id && <Check size={13} className="text-amber-400" />}
                </button>
              ))}
            </>
          )}

          {/* Notebooks section */}
          {notebooks.length > 0 && (
            <>
              <div className="px-3 py-1.5 flex items-center gap-1.5 border-t border-gray-800">
                <BookOpen size={11} className="text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Notebooks</span>
              </div>
              {notebooks.map((nb) => (
                <button
                  key={nb._id}
                  type="button"
                  onClick={() => { onChange({ type: "notebook", id: nb._id }); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-800 transition-colors ${value.type === "notebook" && value.id === nb._id ? "text-white bg-purple-950/20" : "text-gray-200"}`}
                >
                  <span className="text-lg">{nb.emoji}</span>
                  <span className="text-sm font-medium flex-1">{nb.title}</span>
                  {value.type === "notebook" && value.id === nb._id && <Check size={13} className="text-purple-400" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function today() {
  return toDateStr(new Date());
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState<LinkValue>({ type: "none" });
  const [newEmoji, setNewEmoji] = useState("📚");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("📚");
  const [editLink, setEditLink] = useState<LinkValue>({ type: "none" });

  const notebooks = useQuery(api.notebooks.list) ?? [];
  const folders = useQuery(api.folders.list) ?? [];
  const selectedTasks = useQuery(api.tasks.getByDate, { date: selectedDate }) ?? [];
  const allTasks = useQuery(api.tasks.getUpcoming, { from: `${year}-01-01`, days: 366 }) ?? [];

  const createTask = useMutation(api.tasks.create);
  const toggleTask = useMutation(api.tasks.toggle);
  const removeTask = useMutation(api.tasks.remove);
  const updateTask = useMutation(api.tasks.update);

  // Build set of dates that have tasks
  const taskDates = new Set(allTasks.map((t) => t.date));

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    await createTask({
      title: newTitle.trim(),
      date: selectedDate,
      notebookId: newLink.type === "notebook" ? newLink.id as Id<"notebooks"> : undefined,
      folderId: newLink.type === "folder" ? newLink.id as Id<"folders"> : undefined,
      emoji: newEmoji,
    });
    setNewTitle("");
    setNewLink({ type: "none" });
    setShowForm(false);
  }

  function startEdit(task: typeof selectedTasks[0]) {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditEmoji(task.emoji ?? "📚");
    if (task.folderId) setEditLink({ type: "folder", id: task.folderId });
    else if (task.notebookId) setEditLink({ type: "notebook", id: task.notebookId });
    else setEditLink({ type: "none" });
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    await updateTask({
      id: editingId as Id<"tasks">,
      title: editTitle.trim(),
      emoji: editEmoji,
      ...(editLink.type === "notebook" ? { notebookId: editLink.id as Id<"notebooks">, clearFolder: true } : { clearNotebook: true }),
      ...(editLink.type === "folder" ? { folderId: editLink.id as Id<"folders">, clearNotebook: true } : { clearFolder: true }),
    });
    setEditingId(null);
  }

  const todayStr = today();
  const selectedTasksEnriched = selectedTasks.map((t) => ({
    ...t,
    notebook: notebooks.find((n) => n._id === t.notebookId),
    folder: folders.find((f) => f._id === t.folderId),
  }));

  return (
    <div className="min-h-screen bg-gray-950 fade-slide-up">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-700/10 blur-3xl rounded-full" />
      </div>

      <header className="relative border-b border-white/5 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/notebooks" className="text-gray-500 hover:text-gray-300">
            <ArrowLeft size={18} />
          </Link>
          <LanceBot mood="happy" size={28} animate={false} />
          <span className="font-bold text-white text-lg tracking-tight">Study Calendar</span>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Calendar */}
          <div className="bg-gray-900/80 border border-white/5 rounded-3xl p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-white font-bold text-xl">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasTasks = taskDates.has(dateStr);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                        : isToday
                        ? "bg-purple-950/60 text-purple-300 border border-purple-700/50"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {day}
                    {hasTasks && (
                      <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-purple-400"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task panel */}
          <div className="flex flex-col gap-4">
            {/* Date header */}
            <div className="bg-gray-900/80 border border-white/5 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">
                    {selectedDate === todayStr ? "Today" : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                  </p>
                  <h3 className="text-white font-bold text-lg">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  </h3>
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all hover:-translate-y-0.5"
                >
                  <Plus size={14} />
                  Add task
                </button>
              </div>

              {/* Add task form */}
              {showForm && (
                <div className="bg-gray-800/60 border border-white/5 rounded-2xl p-4 mb-4 space-y-3 bounce-in">
                  <div className="flex gap-2">
                    <select
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-2 text-lg focus:outline-none focus:border-purple-500"
                    >
                      {TASK_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task name..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="flex-1 bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <LinkPicker value={newLink} onChange={setNewLink} folders={folders} notebooks={notebooks} />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                      Add
                    </button>
                    <button onClick={() => setShowForm(false)} className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Task list */}
              {selectedTasksEnriched.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">No tasks for this day.</p>
                  <p className="text-gray-600 text-xs mt-1">Click "Add task" to get started 🎯</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTasksEnriched.map((task) => (
                    <div key={task._id}>
                      {editingId === task._id ? (
                        /* ── Inline edit form ── */
                        <div className="bg-gray-800/80 border border-purple-700/40 rounded-2xl p-3 space-y-2 bounce-in">
                          <div className="flex gap-2">
                            <select
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-lg focus:outline-none focus:border-purple-500"
                            >
                              {TASK_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <input
                              autoFocus
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                              className="flex-1 bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-1.5 text-white text-sm placeholder-gray-500 focus:outline-none transition-colors"
                            />
                          </div>
                          <LinkPicker value={editLink} onChange={setEditLink} folders={folders} notebooks={notebooks} />
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex-1 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors">
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal task row ── */
                        <div
                          className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                            task.completed
                              ? "bg-gray-800/30 border-white/5 opacity-60"
                              : "bg-gray-800/60 border-white/5 hover:border-purple-700/30"
                          }`}
                        >
                          <button
                            onClick={() => toggleTask({ id: task._id })}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                              task.completed
                                ? "bg-purple-600 border-purple-600"
                                : "border-gray-600 hover:border-purple-500"
                            }`}
                          >
                            {task.completed && <Check size={12} className="text-white" />}
                          </button>
                          <span className="text-lg flex-shrink-0">{task.emoji ?? "📚"}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${task.completed ? "line-through text-gray-500" : "text-white"}`}>
                              {task.title}
                            </p>
                            {task.folder && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 truncate">
                                <Folder size={10} />
                                {task.folder.emoji} {task.folder.name}
                                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-300 font-semibold">Folder</span>
                              </span>
                            )}
                            {task.notebook && !task.folder && (
                              <Link href={`/notebooks/${task.notebookId}`} className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 truncate">
                                <BookOpen size={10} />
                                {task.notebook.emoji} {task.notebook.title}
                              </Link>
                            )}
                          </div>
                          <button
                            onClick={() => startEdit(task)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-950/40 transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => removeTask({ id: task._id })}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/40 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LanceBot */}
            <div className="flex items-end gap-3">
              <LanceBot mood={selectedTasks.length > 0 ? "happy" : "idle"} size={48} animate />
              <div className="bg-gray-900/80 border border-purple-800/40 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-purple-200 leading-relaxed flex-1">
                {selectedTasks.length === 0
                  ? "No tasks here. Add one if needed 📅"
                  : selectedTasks.every((t) => t.completed)
                  ? "All done. Ayos 🎉"
                  : `${selectedTasks.filter(t => !t.completed).length} ${selectedTasks.filter(t => !t.completed).length === 1 ? "task" : "tasks"} left. Kaya yan 💪`}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
