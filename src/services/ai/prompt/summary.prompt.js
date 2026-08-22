export const buildSummaryPrompt = (dateStr, conversationText) => {
  return `You are an expert AI assistant that summarizes WhatsApp conversation logs into structured insights and a comprehensive, ready-to-copy Markdown report.

Date of Conversation: ${dateStr}

Conversation Logs:
"""
${conversationText}
"""

INSTRUCTIONS:
1. Summarize ALL types of conversations from the log, ranging from critical/important business discussions, technical updates, to casual/minor chatter or lightweight discussions.
2. Structure the summary thoroughly so nothing relevant is missed:
   - Overview / Ringkasan Umum.
   - Rincian Percakapan per Topik / Grup (mencakup topik penting, update kerja, maupun diskusi santai/ringan).
   - Keputusan yang Diambil (Decisions Made), jika ada.
   - Daftar Tugas / Action Items (To-Do List), jika ada permintaan atau rencana tindakan.
3. For "todos" (action items):
   - "title": Actionable task title.
   - "description": Context or details.
   - "priority": "high", "medium", or "low".
   - "assignee": Responsible person if mentioned, otherwise null.
   - "deadline": Target date "YYYY-MM-DD" if mentioned, otherwise null.
4. Generate a complete, beautifully formatted "markdown" string containing the entire report (including summary, discussions, decisions, and todos with checkbox format \`- [ ]\`).
5. Use Indonesian (Bahasa Indonesia) naturally.

Respond ONLY with a valid JSON object strictly matching this schema:
{
  "summary": "string containing comprehensive summary overview",
  "markdown": "string containing full GitHub-flavored markdown report including summary, chat details, and todos",
  "highlights": ["string"],
  "decisions": ["string"],
  "todos": [
    {
      "title": "string",
      "description": "string or null",
      "priority": "high" | "medium" | "low",
      "assignee": "string or null",
      "deadline": "YYYY-MM-DD or null"
    }
  ]
}`;
};
