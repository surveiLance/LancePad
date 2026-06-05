import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), color: v.string(), emoji: v.string() },
  handler: async (ctx, { name, color, emoji }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("folders", { userId, name, color, emoji });
  },
});

export const rename = mutation({
  args: { id: v.id("folders"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(id);
    if (!folder || folder.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { name });
  },
});

export const update = mutation({
  args: { id: v.id("folders"), name: v.string(), color: v.string(), emoji: v.string() },
  handler: async (ctx, { id, name, color, emoji }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(id);
    if (!folder || folder.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { name, color, emoji });
  },
});

export const remove = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(id);
    if (!folder || folder.userId !== userId) throw new Error("Not found");
    // Unlink notebooks from this folder
    const notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_folder", (q) => q.eq("folderId", id))
      .collect();
    await Promise.all(notebooks.map((nb) => ctx.db.patch(nb._id, { folderId: undefined })));
    await ctx.db.delete(id);
  },
});
