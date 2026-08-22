class TodoValidator {
  update = {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1 },
      "description": { "type": "string", "nullable": true },
      "priority": { "type": "string", "enum": ["high", "medium", "low"] },
      "status": { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] },
      "assignee": { "type": "string", "nullable": true },
      "deadline": { "type": "string", "nullable": true }
    },
    "additionalProperties": false
  };
}

export default TodoValidator;
