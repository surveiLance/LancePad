import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    return ctx.db
      .query("cards")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .collect();
  },
});

export const replaceAll = mutation({
  args: {
    notebookId: v.id("notebooks"),
    cards: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        type: v.union(
          v.literal("multiple_choice"),
          v.literal("fill_blank"),
          v.literal("short_answer"),
          v.literal("flashcard")
        ),
        options: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { notebookId, cards }) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .collect();
    // Only delete previously generated cards — keep manual ones
    for (const card of existing) {
      if (!card.isManual) await ctx.db.delete(card._id);
    }
    for (const card of cards) {
      await ctx.db.insert("cards", { notebookId, ...card });
    }
  },
});

export const recordReview = mutation({
  args: {
    cardId: v.id("cards"),
    result: v.union(
      v.literal("correct"),
      v.literal("incorrect"),
      v.literal("skipped")
    ),
  },
  handler: async (ctx, { cardId, result }) => {
    await ctx.db.insert("cardReviews", { cardId, result });
  },
});

export const getCountsByNotebook = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("cards").collect();
    const counts: Record<string, number> = {};
    for (const card of all) {
      counts[card.notebookId as string] = (counts[card.notebookId as string] ?? 0) + 1;
    }
    return counts;
  },
});

export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const add = mutation({
  args: {
    notebookId: v.id("notebooks"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, { notebookId, question, answer }) => {
    return ctx.db.insert("cards", { notebookId, question, answer, type: "flashcard", isManual: true });
  },
});

export const getWeakCardIds = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .collect();

    const allReviews = await ctx.db.query("cardReviews").collect();
    const missed = new Set(
      allReviews
        .filter((r) => r.result === "incorrect")
        .map((r) => r.cardId.toString())
    );

    return cards
      .sort((a, b) => {
        const aWeak = missed.has(a._id.toString());
        const bWeak = missed.has(b._id.toString());
        if (aWeak && !bWeak) return -1;
        if (!aWeak && bWeak) return 1;
        return 0;
      })
      .map((c) => c._id);
  },
});
