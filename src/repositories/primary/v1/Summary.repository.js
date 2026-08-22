class SummaryRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getAllSummaries(userId = null, limit = 30) {
    const where = {};
    if (userId) where.user_id = userId;

    return this.models.daily_summaries.findAll({
      where,
      include: [
        {
          model: this.models.daily_todos,
          as: 'todos'
        },
        {
          model: this.models.users,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ],
      order: [['summary_date', 'DESC']],
      limit
    });
  }

  async getSummaryByDate(date, userId = null) {
    const where = { summary_date: date };
    if (userId) where.user_id = userId;

    return this.models.daily_summaries.findOne({
      where,
      include: [
        {
          model: this.models.daily_todos,
          as: 'todos'
        },
        {
          model: this.models.users,
          as: 'user',
          attributes: ['id', 'name', 'username']
        }
      ]
    });
  }

  async getLatestSummary(userId = null) {
    const where = {};
    if (userId) where.user_id = userId;

    return this.models.daily_summaries.findOne({
      where,
      order: [['summary_date', 'DESC']],
      include: [
        {
          model: this.models.daily_todos,
          as: 'todos'
        }
      ]
    });
  }
}

export default SummaryRepository;
