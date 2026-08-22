class RoleValidator {
  create = {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 50 },
      "description": { "type": "string", "maxLength": 255, "nullable": true },
      "permissions": {
        "type": "array",
        "items": { "type": "integer" }
      }
    },
    "required": ["name"],
    "additionalProperties": false
  };

  update = {
    "type": "object",
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 50 },
      "description": { "type": "string", "maxLength": 255, "nullable": true },
      "permissions": {
        "type": "array",
        "items": { "type": "integer" }
      }
    },
    "additionalProperties": false
  };
}

export default RoleValidator;
