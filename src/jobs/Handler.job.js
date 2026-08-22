import DailySummaryJob from './dailySummary.job.js';

class JobHandler {
  constructor(server) {
    this.server = server;
    this.init();
  }

  init() {
    new DailySummaryJob(this.server);
  }
}

export default JobHandler;
