import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    return ctx.db
      .query("tutorMessages")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    notebookId: v.id("notebooks"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, { notebookId, role, content }) => {
    return ctx.db.insert("tutorMessages", {
      notebookId,
      role,
      content,
      createdAt: Date.now(),
    });
  },
});

export const clear = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    const msgs = await ctx.db
      .query("tutorMessages")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});
