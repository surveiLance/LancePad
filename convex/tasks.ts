import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    const all = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId ?? undefined))
      .collect();
    return all.filter((t) => t.date === date);
  },
});

export const getUpcoming = query({
  args: { from: v.string(), days: v.number() },
  handler: async (ctx, { from, days }) => {
    const userId = await getAuthUserId(ctx);
    const all = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId ?? undefined))
      .collect();
    const fromDate = new Date(from);
    const toDate = new Date(from);
    toDate.setDate(toDate.getDate() + days);
    return all.filter((t) => {
      const d = new Date(t.date);
      return d >= fromDate && d <= toDate;
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    notebookId: v.optional(v.id("notebooks")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return ctx.db.insert("tasks", { ...args, userId: userId ?? undefined, completed: false });
  },
});

export const toggle = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get(id);
    if (!task) return;
    await ctx.db.patch(id, { completed: !task.completed });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    emoji: v.optional(v.string()),
    notebookId: v.optional(v.id("notebooks")),
    clearNotebook: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, title, emoji, notebookId, clearNotebook }) => {
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (emoji !== undefined) patch.emoji = emoji;
    if (clearNotebook) patch.notebookId = undefined;
    else if (notebookId !== undefined) patch.notebookId = notebookId;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
