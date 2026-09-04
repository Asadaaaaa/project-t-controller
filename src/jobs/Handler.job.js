import DailySummaryJob from './dailySummary.job.js';
import AutoSendSummaryJob from './autoSendSummary.job.js';

class JobHandler {
  constructor(server) {
    this.server = server;
    this.init();
  }

  init() {
    new DailySummaryJob(this.server);
    new AutoSendSummaryJob(this.server);
  }
}

export default JobHandler;
