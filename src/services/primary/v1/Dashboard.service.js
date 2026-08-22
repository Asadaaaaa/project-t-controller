import { WhatsappRepository, TodoRepository, SummaryRepository } from '#repositoriesPrimaryV1';

class DashboardService {
  constructor(server) {
    this.server = server;
    this.WhatsappRepository = new WhatsappRepository(this.server);
    this.TodoRepository = new TodoRepository(this.server);
    this.SummaryRepository = new SummaryRepository(this.server);
  }

  async getStats(userId = null) {
    const sessionId = userId ? `user_${userId}` : 'default';
    const session = await this.WhatsappRepository.getSession(sessionId);
    const messagesToday = await this.WhatsappRepository.countMessagesToday(sessionId);
    const activeChats = await this.WhatsappRepository.countActiveChats(sessionId);
    const pendingTodos = await this.TodoRepository.countPendingTodos();
    const completedTodos = await this.TodoRepository.countCompletedTodos();
    const latestSummary = await this.SummaryRepository.getLatestSummary(userId);

    return {
      whatsappStatus: session ? session.status : 'disconnected',
      phoneNumber: session ? session.phone_number : null,
      lastConnectedAt: session ? session.last_connected_at : null,
      messagesToday,
      activeChats,
      pendingTodos,
      completedTodos,
      latestSummary
    };
  }
}

export default DashboardService;
