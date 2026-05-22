import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
  }).index("by_user", ["userId"]).index("by_username", ["username"]),

  notebooks: defineTable({
    userId: v.optional(v.id("users")),
    title: v.string(),
    color: v.string(),
    emoji: v.string(),
  }).index("by_user", ["userId"]),

  notes: defineTable({
    notebookId: v.id("notebooks"),
    content: v.string(),
  }).index("by_notebook", ["notebookId"]),

  cards: defineTable({
    notebookId: v.id("notebooks"),
    question: v.string(),
    answer: v.string(),
    type: v.union(
      v.literal("multiple_choice"),
      v.literal("fill_blank"),
      v.literal("short_answer"),
      v.literal("flashcard")
    ),
    options: v.optional(v.array(v.string())),
    isManual: v.optional(v.boolean()),
  }).index("by_notebook", ["notebookId"]),

  tasks: defineTable({
    userId: v.optional(v.id("users")),
    title: v.string(),
    date: v.string(),
    notebookId: v.optional(v.id("notebooks")),
    completed: v.boolean(),
    emoji: v.optional(v.string()),
  }).index("by_date", ["date"]).index("by_user", ["userId"]),

  quizSessions: defineTable({
    notebookId: v.id("notebooks"),
    quizType: v.string(),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string())),
    })),
    results: v.optional(v.array(v.object({
      questionIndex: v.number(),
      result: v.union(v.literal("correct"), v.literal("incorrect")),
      userAnswer: v.string(),
    }))),
    completedAt: v.optional(v.number()),
  }).index("by_notebook", ["notebookId"]),

  tutorMessages: defineTable({
    notebookId: v.id("notebooks"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId"]),

  cardReviews: defineTable({
    cardId: v.id("cards"),
    userId: v.optional(v.id("users")),
    result: v.union(
      v.literal("correct"),
      v.literal("incorrect"),
      v.literal("skipped")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_card", ["userId", "cardId"]),
});
