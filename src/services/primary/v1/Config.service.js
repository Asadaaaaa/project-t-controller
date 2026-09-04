import AISummaryService from '../../ai/summary.service.js';

export class ConfigService {
  constructor(server) {
    this.server = server;
    this.aiSummaryService = new AISummaryService(this.server);
  }

  get models() {
    return this.server.model.models;
  }

  /**
   * Get auto summary configuration for a user (or default)
   */
  async getAutoSummaryConfig(userId = null) {
    let config = await this.models.auto_summary_configs.findOne({
      where: userId ? { user_id: userId } : {}
    });

    if (!config) {
      // Default placeholder config
      return {
        id: null,
        user_id: userId,
        is_enabled: false,
        send_time: '18:00',
        target_chat_id: null,
        target_chat_name: null,
        target_chat_type: 'group',
        last_sent_date: null,
        last_sent_at: null,
        last_sent_status: null,
        last_error_message: null
      };
    }

    return config.toJSON();
  }

  /**
   * Update or create auto summary config
   */
  async updateAutoSummaryConfig(userId = null, data = {}) {
    const {
      is_enabled,
      send_time,
      target_chat_id,
      target_chat_name,
      target_chat_type
    } = data;

    // Validate send_time format HH:mm if provided
    if (send_time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(send_time)) {
      throw new Error('Format jam tidak valid. Gunakan format 24 jam HH:mm (contoh: 18:00).');
    }

    let config = await this.models.auto_summary_configs.findOne({
      where: userId ? { user_id: userId } : {}
    });

    const updateFields = {
      user_id: userId || null
    };

    if (typeof is_enabled === 'boolean') updateFields.is_enabled = is_enabled;
    if (send_time !== undefined) updateFields.send_time = send_time;
    if (target_chat_id !== undefined) updateFields.target_chat_id = target_chat_id;
    if (target_chat_name !== undefined) updateFields.target_chat_name = target_chat_name;
    if (target_chat_type !== undefined) updateFields.target_chat_type = target_chat_type;

    if (config) {
      config = await config.update(updateFields);
    } else {
      config = await this.models.auto_summary_configs.create({
        ...updateFields,
        is_enabled: updateFields.is_enabled ?? false,
        send_time: updateFields.send_time || '18:00',
        target_chat_type: updateFields.target_chat_type || 'group'
      });
    }

    return config.toJSON();
  }

  /**
   * Format summary object into a clean, rich WhatsApp message
   */
  formatSummaryForWhatsApp(dateStr, summaryText, highlights = [], decisions = [], todos = []) {
    let msg = `📅 *RINGKASAN HARIAN WHATSAPP*\n`;
    msg += `🗓 *Tanggal:* ${dateStr}\n\n`;

    msg += `📝 *Deskripsi / Ringkasan Hari Ini:*\n`;
    msg += `${summaryText || 'Tidak ada catatan aktivitas khusus hari ini.'}\n\n`;

    if (highlights && highlights.length > 0) {
      msg += `✅ *Yang Sudah Selesai / Dilakukan:*\n`;
      highlights.forEach((h) => {
        msg += `• ${h}\n`;
      });
      msg += `\n`;
    }

    if (todos && todos.length > 0) {
      msg += `⏳ *To-Do List & Action Items (${todos.length}):*\n`;
      todos.forEach((t) => {
        const priorityEmoji = t.priority === 'high' ? '🔴' : (t.priority === 'low' ? '🟢' : '🟡');
        const priorityLabel = (t.priority || 'medium').toUpperCase();
        const assignee = t.assignee ? ` | 👤 @${t.assignee}` : '';
        const deadline = t.deadline ? ` | ⏰ ${new Date(t.deadline).toLocaleDateString('id-ID')}` : '';
        
        msg += `${priorityEmoji} *[${priorityLabel}]* ${t.title}${assignee}${deadline}\n`;
        if (t.description) {
          msg += `   _${t.description}_\n`;
        }
      });
      msg += `\n`;
    }

    if (decisions && decisions.length > 0) {
      msg += `📌 *Agenda & Rencana Kedepan:*\n`;
      decisions.forEach((d) => {
        msg += `• ${d}\n`;
      });
      msg += `\n`;
    }

    msg += `------------------------------------\n`;
    msg += `_Dikirim otomatis oleh ProjectT Assistant_ 🤖`;

    return msg;
  }

  /**
   * Generate and send daily summary to target room chat
   */
  async sendDailySummaryToChat(userId = null, customTargetChatId = null, customTargetChatName = null) {
    const config = await this.getAutoSummaryConfig(userId);
    const targetChatId = customTargetChatId || config.target_chat_id;
    const targetChatName = customTargetChatName || config.target_chat_name || targetChatId;

    if (!targetChatId) {
      throw new Error('Room chat tujuan belum dipilih. Silakan atur room chat terlebih dahulu.');
    }

    // Determine today in Asia/Jakarta
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    this.server.sendLogs(`[ConfigService] Generating and sending summary for ${todayStr} to ${targetChatName} (${targetChatId})...`);

    // 1. Generate or fetch today's summary
    let summaryResult;
    try {
      summaryResult = await this.aiSummaryService.generateDailySummary(todayStr, userId);
    } catch (err) {
      this.server.sendLogs(`[ConfigService] Error generating daily summary: ${err.message}`);
      throw new Error(`Gagal menghasilkan ringkasan AI: ${err.message}`);
    }

    const summaryRecord = summaryResult?.summary || {};
    const summaryText = summaryRecord.summary || '';
    const highlights = summaryRecord.highlights || [];
    const decisions = summaryRecord.decisions || [];
    const todos = summaryResult?.todos || summaryRecord.todos || [];

    // 2. Format WhatsApp message
    const waMessage = this.formatSummaryForWhatsApp(
      todayStr,
      summaryText,
      highlights,
      decisions,
      todos
    );

    // 3. Dispatch to WhatsApp Client via Socket
    const sessionId = userId ? `user_${userId}` : 'default';

    if (!this.server?.socketHandler) {
      throw new Error('Server socket handler tidak tersedia');
    }

    let sendResult;
    try {
      sendResult = await this.server.socketHandler.sendSendMessage(sessionId, targetChatId, waMessage, userId);
    } catch (socketErr) {
      // Record failure if config exists in DB
      if (config.id) {
        await this.models.auto_summary_configs.update({
          last_sent_date: todayStr,
          last_sent_at: new Date(),
          last_sent_status: 'failed',
          last_error_message: socketErr.message
        }, { where: { id: config.id } });
      }
      throw new Error(`Gagal mengirim pesan ke WhatsApp: ${socketErr.message}`);
    }

    // 4. Record success
    if (config.id) {
      await this.models.auto_summary_configs.update({
        last_sent_date: todayStr,
        last_sent_at: new Date(),
        last_sent_status: 'success',
        last_error_message: null
      }, { where: { id: config.id } });
    }

    this.server.sendLogs(`[ConfigService] ✅ Daily summary successfully sent to ${targetChatName}`);

    return {
      success: true,
      targetChatId,
      targetChatName,
      date: todayStr,
      sendResult
    };
  }
}

export default ConfigService;
