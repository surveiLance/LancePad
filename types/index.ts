export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: "pending_edit" | "undo_edit";
  editedMarkdown?: string;
}
