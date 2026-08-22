class AuthValidator {
    login = {
        "type": "object",
        "properties": {
            "identity": {
                "type": "string",
                "minLength": 1,
                "maxLength": 60,
                "nullable": false
            },
            "password": {
                "type": "string",
                "minLength": 1,
                "maxLength": 64,
                "nullable": false
            }
        },
        "required": [
            "identity", "password"
        ],
        "additionalProperties": false
    };

    refreshToken = {
        "type": "object",
        "properties": {
            "refreshToken": {
                "type": "string",
                "nullable": false
            }
        },
        "required": [
            "refreshToken"
        ],
        "additionalProperties": false
    }
}

export default AuthValidator;