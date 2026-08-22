import { Op } from 'sequelize';

class TodoRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getAllTodos(filters = {}) {
    const where = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.summary_id) {
      where.summary_id = filters.summary_id;
    }

    return this.models.daily_todos.findAll({
      where,
      include: [
        {
          model: this.models.daily_summaries,
          as: 'summary',
          attributes: ['id', 'summary_date']
        }
      ],
      order: [
        ['created_at', 'DESC']
      ]
    });
  }

  async getTodoById(id) {
    return this.models.daily_todos.findByPk(id, {
      include: [
        {
          model: this.models.daily_summaries,
          as: 'summary'
        }
      ]
    });
  }

  async updateTodo(id, data) {
    const todo = await this.models.daily_todos.findByPk(id);
    if (!todo) return null;
    return todo.update(data);
  }

  async countPendingTodos() {
    return this.models.daily_todos.count({
      where: {
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });
  }

  async countCompletedTodos() {
    return this.models.daily_todos.count({
      where: {
        status: 'completed'
      }
    });
  }
}

export default TodoRepository;
