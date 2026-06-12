export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: "pending_edit" | "undo_edit" | "append_edit" | "reverted_edit";
  editedMarkdown?: string;
}
