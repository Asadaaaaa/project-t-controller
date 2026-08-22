class SummaryValidator {
  generate = {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      }
    },
    "additionalProperties": false
  };
}

export default SummaryValidator;
