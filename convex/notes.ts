import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    return ctx.db
      .query("notes")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .first();
  },
});

export const save = mutation({
  args: {
    notebookId: v.id("notebooks"),
    content: v.string(),
  },
  handler: async (ctx, { notebookId, content }) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { content });
    } else {
      await ctx.db.insert("notes", { notebookId, content });
    }
  },
});
