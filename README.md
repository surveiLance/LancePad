# LancePad

An AI-powered study app built around notebooks. Paste your notes, import a PDF, or start from scratch — LanceBot turns your content into flashcards, quizzes, and explanations on demand.

---

## Features

### Notebooks
- Create notebooks with custom emoji, color, and folder organization
- Rich text editor (TipTap) with bold, italic, headings, lists, blockquotes, highlights, and images
- Paste images directly from clipboard or upload via toolbar
- Auto-save with 1.5s debounce

### LanceBot (AI Tutor)
- Chat with an AI tutor scoped to your notebook's notes
- Detects edit intent — asks to reformat, organize, or expand your notes
- Preview edits before applying, with one-click undo
- Floating LanceBot on every page with contextual Tagalog/English quips

### Import
- Import PDF, Word (.docx), or plain text files into your notes
- Preview extracted text before inserting
- **Clean & Insert** — LanceBot reformats raw imported content into structured study notes

### Quizzes
- Generate multiple choice, identification, or fill-in-the-blank quizzes from your notes
- Review past quiz sessions with score history

### Flashcards
- Auto-generate cards from notes or create them manually
- Card review with correct/incorrect tracking

### Summary
- One-click AI summary of your entire notebook
- Copy to clipboard

### Export
- Download notes as a Markdown file
- Print or save as PDF via browser print

### Pomodoro Timer
- Persistent across all pages — keeps running when you navigate between notebook, quiz, study sessions
- Focus (25min), Short Break (5min), Long Break (15min) presets
- Custom time input (minutes + seconds)
- Browser notifications when session ends
- In-header on the notebook page, floating bottom-right everywhere else

### Calendar & Tasks
- Task manager with due dates linked to notebooks or folders
- 7-day strip and upcoming tasks on the home screen
- Full calendar view

### Folders
- Organize notebooks into color-coded, emoji-labeled folders
- Rename, recolor, re-emoji folders after creation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database & Auth | Convex + Convex Auth |
| AI (chat/tutor) | Groq — `llama-3.1-8b-instant` |
| Rich text editor | TipTap 3 |
| Styling | Tailwind CSS v4 |
| PDF extraction | pdfjs-dist (client-side) |
| Word extraction | mammoth (client-side) |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Convex](https://convex.dev) account
- A [Groq](https://console.groq.com) API key

### Installation

```bash
git clone https://github.com/YoLurks/study-app
cd study-app
npm install
```

### Environment

Create a `.env.local` file:

```env
GROQ_API_KEY=your_groq_api_key
CONVEX_DEPLOYMENT=your_convex_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_convex_public_url
```

### Run

```bash
npm run dev
```

This starts both the Next.js dev server (port 3001) and the Convex dev server concurrently.

---

## Project Structure

```
app/
  notebooks/
    [id]/
      page.tsx          # Main notebook editor + LanceBot chat
      cards/            # Flashcard review
      quizzes/          # Past quiz sessions
      study/            # Active quiz session
      tutor/            # Dedicated tutor chat
  calendar/             # Full calendar + task manager
  auth/                 # Login / signup
  api/
    tutor/              # Streaming LanceBot tutor
    lancebot-edit/      # Note editing via AI
    lancebot-help/      # Floating bot help panel
    generate-quiz/      # Quiz generation
    summarize/          # One-click summary
    ...

components/
  NoteEditor.tsx        # TipTap editor with toolbar
  PomodoroTimer.tsx     # Global persistent timer
  PasteImportModal.tsx  # File import (PDF/DOCX/TXT)
  SummaryModal.tsx      # AI summary modal
  FloatingLanceBot.tsx  # Ambient bot on all pages

convex/
  schema.ts             # Database schema
  notebooks.ts
  notes.ts
  folders.ts
  cards.ts
  tasks.ts
  quizSessions.ts
  tutorMessages.ts
  userProfiles.ts

lib/
  timer-store.ts        # Module-level Pomodoro state (persists across navigation)
  lancebot-store.ts     # Note content broadcast store
  export-notes.ts       # Markdown + print/PDF export
  markdown-to-tiptap.ts # Markdown → TipTap JSON converter
```

---

## License

MIT
