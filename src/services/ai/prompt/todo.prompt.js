export const buildTodoPrompt = (conversationText) => {
  return `Extract actionable tasks from this conversation text:
"""
${conversationText}
"""

Return a JSON array of objects with title, description, priority ('high'|'medium'|'low'), assignee, and deadline (YYYY-MM-DD or null).`;
};
