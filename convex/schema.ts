import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
  }).index("by_notebook", ["notebookId"]),

  tasks: defineTable({
    title: v.string(),
    date: v.string(),
    notebookId: v.optional(v.id("notebooks")),
    completed: v.boolean(),
    emoji: v.optional(v.string()),
  }).index("by_date", ["date"]),

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
