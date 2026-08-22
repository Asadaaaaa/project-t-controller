class UserValidator {
  create = {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 100 },
      "username": { "type": "string", "minLength": 3, "maxLength": 50 },
      "password": { "type": "string", "minLength": 6, "maxLength": 64 },
      "role_id": { "type": "integer", "nullable": true }
    },
    "required": ["name", "username", "password"],
    "additionalProperties": false
  };

  update = {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 100 },
      "username": { "type": "string", "minLength": 3, "maxLength": 50 },
      "password": { "type": "string", "minLength": 6, "maxLength": 64, "nullable": true }
    },
    "additionalProperties": false
  };
}

export default UserValidator;
