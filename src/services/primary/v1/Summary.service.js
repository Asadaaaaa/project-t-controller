import { SummaryRepository } from '#repositoriesPrimaryV1';
import AISummaryService from '../../ai/summary.service.js';

class SummaryService {
  constructor(server) {
    this.server = server;
    this.SummaryRepository = new SummaryRepository(this.server);
    this.AiSummaryService = new AISummaryService(this.server);
  }

  async getAllSummaries(userId = null, limit = 30) {
    return this.SummaryRepository.getAllSummaries(userId, limit);
  }

  async getSummaryByDate(date, userId = null) {
    return this.SummaryRepository.getSummaryByDate(date, userId);
  }

  async generateSummary(date, userId = null) {
    const targetDate = date || new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return this.AiSummaryService.generateDailySummary(targetDate, userId);
  }
}

export default SummaryService;
