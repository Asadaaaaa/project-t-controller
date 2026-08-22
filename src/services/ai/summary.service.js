import { z } from 'zod';
import GeminiService from './gemini.service.js';
import { buildSummaryPrompt } from './prompt/summary.prompt.js';
import { Op } from 'sequelize';
import axios from 'axios';

const TodoItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).catch('medium'),
  assignee: z.string().nullable().optional(),
  deadline: z.string().nullable().optional()
});

const SummaryResponseSchema = z.object({
  summary: z.string().min(1),
  markdown: z.string().optional(),
  highlights: z.array(z.string()).catch([]),
  decisions: z.array(z.string()).catch([]),
  todos: z.array(TodoItemSchema).catch([])
});

function buildMarkdownReport(dateStr, summary, highlights = [], decisions = [], todos = []) {
  let md = `# 📅 Ringkasan Harian WhatsApp — ${dateStr}\n\n`;
  md += `## 📌 Ringkasan Umum\n${summary}\n\n`;

  if (highlights && highlights.length > 0) {
    md += `## 💬 Poin Diskusi & Catatan Obrolan\n`;
    highlights.forEach((h) => {
      md += `- ${h}\n`;
    });
    md += `\n`;
  }

  if (decisions && decisions.length > 0) {
    md += `## 🎯 Keputusan yang Diambil\n`;
    decisions.forEach((d) => {
      md += `- ${d}\n`;
    });
    md += `\n`;
  }

  md += `## ✅ Action Items & To-Do List (${todos?.length || 0})\n`;
  if (todos && todos.length > 0) {
    todos.forEach((t) => {
      const priorityTag = (t.priority || 'medium').toUpperCase();
      const assigneeTag = t.assignee ? ` | 👤 @${t.assignee}` : '';
      const deadlineTag = t.deadline ? ` | ⏰ Deadline: ${t.deadline}` : '';
      md += `- [ ] **${t.title}** [${priorityTag}]${assigneeTag}${deadlineTag}\n`;
      if (t.description) {
        md += `  > ${t.description}\n`;
      }
    });
  } else {
    md += `*Tidak ada action items spesifik untuk hari ini.*\n`;
  }

  return md;
}

class AISummaryService {
  constructor(server) {
    this.server = server;
    this.gemini = new GeminiService(server);
  }

  /**
   * Format date to YYYY-MM-DD in Asia/Jakarta
   */
  formatDate(date) {
    if (typeof date === 'string') return date.slice(0, 10);
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates and stores daily summary and todos for a specific target date
   * @param {string} targetDate - 'YYYY-MM-DD'
   * @param {number|null} userId - user triggering the generation
   * @returns {Promise<Object>}
   */
  async generateDailySummary(targetDate, userId = null) {
    const dateStr = this.formatDate(targetDate);
    const models = this.server.model.models;

    // Validate if userId exists in database to prevent foreign key errors
    let validUserId = null;
    if (userId) {
      try {
        const userExists = await models.users.findByPk(userId);
        if (userExists) {
          validUserId = userExists.id;
        }
      } catch (e) {
        validUserId = null;
      }
    }

    const sessionId = validUserId ? `user_${validUserId}` : 'default';

    // Step 0: Pre-sync messages for this specific date and user session directly from WhatsApp Client
    let clientConnected = false;
    try {
      const clientUrl = process.env.WHATSAPP_CLIENT_URL || 'http://localhost:4001';
      const syncResp = await axios.post(`${clientUrl}/sync/date`, { sessionId, date: dateStr, userId: validUserId }, { timeout: 25000 });
      if (syncResp.data?.data?.success) {
        clientConnected = true;
      }
    } catch (syncErr) {
      console.warn(`[AISummaryService:${sessionId}] Pre-sync date ${dateStr} notice:`, syncErr.message);
    }

    // 1. Determine start and end timestamps for the day in milliseconds (Asia/Jakarta is UTC+7)
    const startOfDay = new Date(`${dateStr}T00:00:00+07:00`).getTime();
    const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`).getTime();

    // Query messages for this specific user session
    const messages = await models.whatsapp_messages.findAll({
      where: {
        timestamp: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      },
      include: [
        {
          model: models.whatsapp_chats,
          as: 'chat',
          where: { session_id: sessionId },
          attributes: ['id', 'name', 'whatsapp_chat_id', 'is_group']
        }
      ],
      order: [['timestamp', 'ASC']]
    });

    if (!messages || messages.length === 0) {
      let summaryContent = `Tidak ada percakapan WhatsApp yang tercatat untuk tanggal ${dateStr}.`;
      if (!clientConnected) {
        const sessionRecord = await models.whatsapp_sessions.findOne({ where: { session_id: sessionId } });
        if (!sessionRecord || sessionRecord.status !== 'connected') {
          summaryContent = `WhatsApp Anda belum terhubung. Silakan masuk ke menu WhatsApp Connection dan hubungkan WhatsApp Anda untuk menyinkronkan chat tanggal ${dateStr}.`;
        }
      }

      const fallbackMd = buildMarkdownReport(dateStr, summaryContent, [], [], []);

      const existingRecord = await models.daily_summaries.findOne({
        where: { summary_date: dateStr, user_id: validUserId }
      });

      let summaryRecord;
      if (existingRecord) {
        summaryRecord = await existingRecord.update({
          summary: summaryContent,
          highlights: [],
          decisions: []
        });
      } else {
        summaryRecord = await models.daily_summaries.create({
          user_id: validUserId,
          summary_date: dateStr,
          summary: summaryContent,
          highlights: [],
          decisions: []
        });
      }

      return {
        summary: {
          ...summaryRecord.toJSON(),
          markdown: fallbackMd
        },
        todos: [],
        markdown: fallbackMd,
        messageCount: 0
      };
    }

    // 2. Format conversation text grouped by chat
    const chatsMap = new Map();
    for (const msg of messages) {
      const chatTitle = msg.chat ? (msg.chat.name || msg.chat.whatsapp_chat_id) : 'Direct Chat';
      if (!chatsMap.has(chatTitle)) {
        chatsMap.set(chatTitle, []);
      }
      const timeFormatted = new Date(Number(msg.timestamp)).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit'
      });
      const sender = msg.is_from_me ? 'Me' : (msg.sender || 'Unknown');
      chatsMap.get(chatTitle).push(`[${timeFormatted}] (${msg.message_type || 'chat'}) ${sender}: ${msg.message || ''}`);
    }

    let conversationText = '';
    for (const [chatTitle, chatMsgs] of chatsMap.entries()) {
      conversationText += `\n--- Chat / Group: ${chatTitle} ---\n`;
      conversationText += chatMsgs.join('\n') + '\n';
    }

    // 3. Build Prompt and Call Gemini
    const prompt = buildSummaryPrompt(dateStr, conversationText);
    const rawAiOutput = await this.gemini.generateGeminiResponse(prompt);

    // 4. Parse JSON & Validate Schema
    let parsedJson;
    try {
      const cleanJson = rawAiOutput.replace(/```json\s*|\s*```/g, '').trim();
      parsedJson = JSON.parse(cleanJson);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI JSON output: ${parseErr.message}. Output was: ${rawAiOutput}`);
    }

    const validatedData = SummaryResponseSchema.parse(parsedJson);

    const generatedMarkdown = validatedData.markdown || buildMarkdownReport(
      dateStr,
      validatedData.summary,
      validatedData.highlights,
      validatedData.decisions,
      validatedData.todos
    );

    // 5. Store Summary in DB (Idempotent per user and date)
    const existingSummary = await models.daily_summaries.findOne({
      where: { summary_date: dateStr, user_id: validUserId }
    });

    let savedSummary;
    if (existingSummary) {
      savedSummary = await existingSummary.update({
        summary: validatedData.summary,
        highlights: validatedData.highlights,
        decisions: validatedData.decisions
      });
      await models.daily_todos.destroy({
        where: { summary_id: existingSummary.id }
      });
    } else {
      savedSummary = await models.daily_summaries.create({
        user_id: validUserId,
        summary_date: dateStr,
        summary: validatedData.summary,
        highlights: validatedData.highlights,
        decisions: validatedData.decisions
      });
    }

    // 6. Store Todos in DB
    const createdTodos = [];
    if (validatedData.todos && validatedData.todos.length > 0) {
      for (const todo of validatedData.todos) {
        let deadlineDate = null;
        if (todo.deadline) {
          const parsedDate = new Date(todo.deadline);
          if (!isNaN(parsedDate.getTime())) {
            deadlineDate = parsedDate;
          }
        }

        const savedTodo = await models.daily_todos.create({
          summary_id: savedSummary.id,
          title: todo.title,
          description: todo.description || null,
          priority: todo.priority || 'medium',
          status: 'pending',
          assignee: todo.assignee || null,
          deadline: deadlineDate
        });
        createdTodos.push(savedTodo);
      }
    }

    const fullSummary = await models.daily_summaries.findByPk(savedSummary.id, {
      include: [
        {
          model: models.daily_todos,
          as: 'todos'
        },
        {
          model: models.users,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    return {
      summary: fullSummary,
      todos: createdTodos,
      markdown: generatedMarkdown,
      messageCount: messages.length
    };
  }
}

export default AISummaryService;
