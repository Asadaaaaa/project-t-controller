import cron from 'node-cron';
import AISummaryService from '../services/ai/summary.service.js';

class DailySummaryJob {
  constructor(server) {
    this.server = server;
    this.aiSummaryService = new AISummaryService(this.server);
    this.init();
  }

  init() {
    // Schedule at 06:00 AM every day in Asia/Jakarta timezone
    cron.schedule('0 6 * * *', async () => {
      this.server.sendLogs('[DailySummaryJob] Triggering 06:00 AM daily summary generation...');
      try {
        // Target date is yesterday
        const yesterday = new Date(Date.now() - 86400000);
        const dateStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        
        this.server.sendLogs(`[DailySummaryJob] Generating summary for date: ${dateStr}`);
        const result = await this.aiSummaryService.generateDailySummary(dateStr);
        this.server.sendLogs(`[DailySummaryJob] Summary generated successfully for ${dateStr}. Messages: ${result.messageCount}, Todos: ${result.todos.length}`);
      } catch (err) {
        this.server.sendLogs(`[DailySummaryJob] Error generating daily summary: ${err.message}`);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Jakarta'
    });

    this.server.sendLogs('[DailySummaryJob] Cron job registered for 06:00 Asia/Jakarta daily.');
  }
}

export default DailySummaryJob;
