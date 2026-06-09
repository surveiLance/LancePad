import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    notebookId: v.id("notebooks"),
    quizType: v.string(),
    name: v.optional(v.string()),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      type: v.string(),
      options: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizSessions", {
      notebookId: args.notebookId,
      quizType: args.quizType,
      name: args.name,
      questions: args.questions,
    });
  },
});

export const get = query({
  args: { id: v.id("quizSessions") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, { notebookId }) => {
    return ctx.db
      .query("quizSessions")
      .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
      .order("desc")
      .collect();
  },
});

export const complete = mutation({
  args: {
    id: v.id("quizSessions"),
    results: v.array(v.object({
      questionIndex: v.number(),
      result: v.union(v.literal("correct"), v.literal("incorrect")),
      userAnswer: v.string(),
    })),
  },
  handler: async (ctx, { id, results }) => {
    await ctx.db.patch(id, { results, completedAt: Date.now() });
  },
});
