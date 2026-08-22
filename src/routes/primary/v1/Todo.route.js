import { TodoController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class TodoRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/todos';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.TodoController = new TodoController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('todo.view'),
      (req, res) => this.TodoController.getAllTodos(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('todo.view'),
      (req, res) => this.TodoController.getTodoById(req, res)
    );

    this.API.put(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('todo.update'),
      (req, res) => this.TodoController.updateTodo(req, res)
    );
  }
}

export default TodoRoute;
