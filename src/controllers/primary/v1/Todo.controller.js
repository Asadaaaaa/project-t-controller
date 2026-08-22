import { ResponsePresetHelper } from '#helpers';
import { TodoValidator } from '#validatorsPrimaryV1';
import { TodoService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class TodoController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.Ajv = new Ajv();
    this.DataScheme = new TodoValidator();
    this.TodoService = new TodoService(this.server);
  }

  async getAllTodos(req, res) {
    const { status, priority, summary_id } = req.query;
    const todos = await this.TodoService.getAllTodos({ status, priority, summary_id });
    return res.status(200).json(this.ResponsePreset.resOK('OK', todos));
  }

  async getTodoById(req, res) {
    const { id } = req.params;
    const todo = await this.TodoService.getTodoById(id);
    if (!todo) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'Todo not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('OK', todo));
  }

  async updateTodo(req, res) {
    const { id } = req.params;
    const schemeValidate = this.Ajv.compile(this.DataScheme.update);
    if (!schemeValidate(req.body)) {
      return res.status(400).json(this.ResponsePreset.resErr(
        400,
        schemeValidate.errors[0].message,
        'validator',
        schemeValidate.errors[0]
      ));
    }

    try {
      const updated = await this.TodoService.updateTodo(id, req.body);
      if (!updated) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'Todo not found', 'service', null));
      }
      return res.status(200).json(this.ResponsePreset.resOK('Todo updated successfully', updated));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'server', null));
    }
  }
}

export default TodoController;
