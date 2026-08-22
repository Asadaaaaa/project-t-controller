import { TodoRepository } from '#repositoriesPrimaryV1';

class TodoService {
  constructor(server) {
    this.server = server;
    this.TodoRepository = new TodoRepository(this.server);
  }

  async getAllTodos(filters = {}) {
    return this.TodoRepository.getAllTodos(filters);
  }

  async getTodoById(id) {
    return this.TodoRepository.getTodoById(id);
  }

  async updateTodo(id, data) {
    return this.TodoRepository.updateTodo(id, data);
  }
}

export default TodoService;
