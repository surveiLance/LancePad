import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("notebooks").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("notebooks") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    color: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, { title, color, emoji }) => {
    const notebookId = await ctx.db.insert("notebooks", {
      title,
      color,
      emoji,
    });
    await ctx.db.insert("notes", {
      notebookId,
      content: "",
    });
    return notebookId;
  },
});

export const remove = mutation({
  args: { id: v.id("notebooks") },
  handler: async (ctx, { id }) => {
    const nb = await ctx.db.get(id);
    if (!nb) throw new Error("Not found");

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_notebook", (q) => q.eq("notebookId", id))
      .collect();
    for (const note of notes) await ctx.db.delete(note._id);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_notebook", (q) => q.eq("notebookId", id))
      .collect();
    for (const card of cards) {
      const reviews = await ctx.db
        .query("cardReviews")
        .withIndex("by_user_card", (q) => q.eq("userId", undefined).eq("cardId", card._id))
        .collect();
      for (const r of reviews) await ctx.db.delete(r._id);
      await ctx.db.delete(card._id);
    }

    await ctx.db.delete(id);
  },
});
