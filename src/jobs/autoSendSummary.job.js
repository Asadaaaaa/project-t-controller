import cron from 'node-cron';
import ConfigService from '../services/primary/v1/Config.service.js';

class AutoSendSummaryJob {
  constructor(server) {
    this.server = server;
    this.configService = new ConfigService(this.server);
    this.init();
  }

  get models() {
    return this.server.model?.models;
  }

  init() {
    // Run every minute to check if any user's scheduled time has arrived
    cron.schedule('* * * * *', async () => {
      if (!this.models?.auto_summary_configs) return;

      try {
        const now = new Date();
        const currentHHmm = now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit'
        }); // e.g. "18:00"

        const todayStr = now.toLocaleDateString('en-CA', {
          timeZone: 'Asia/Jakarta'
        }); // e.g. "2026-09-05"

        const activeConfigs = await this.models.auto_summary_configs.findAll({
          where: { is_enabled: true }
        });

        if (!activeConfigs || activeConfigs.length === 0) return;

        for (const config of activeConfigs) {
          if (
            config.send_time === currentHHmm &&
            config.last_sent_date !== todayStr &&
            config.target_chat_id
          ) {
            this.server.sendLogs(
              `[AutoSendSummaryJob] ⏰ Waktu pengiriman cocok (${currentHHmm} WIB)! Mengirim summary untuk user ${config.user_id || 'default'} ke ${config.target_chat_name || config.target_chat_id}...`
            );

            try {
              await this.configService.sendDailySummaryToChat(
                config.user_id,
                config.target_chat_id,
                config.target_chat_name
              );
              this.server.sendLogs(
                `[AutoSendSummaryJob] ✅ Auto send summary berhasil dikirim ke ${config.target_chat_name || config.target_chat_id}`
              );
            } catch (err) {
              this.server.sendLogs(
                `[AutoSendSummaryJob] ❌ Gagal auto send summary untuk config #${config.id}: ${err.message}`
              );
            }
          }
        }
      } catch (err) {
        this.server.sendLogs(`[AutoSendSummaryJob] Error in scheduler tick: ${err.message}`);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Jakarta'
    });

    this.server.sendLogs('[AutoSendSummaryJob] Background cron scheduler registered (running every minute, Asia/Jakarta).');
  }
}

export default AutoSendSummaryJob;
