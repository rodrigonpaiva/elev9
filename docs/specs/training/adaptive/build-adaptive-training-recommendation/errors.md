# Errors

## Error Cases

- invalid session
- user profile not found
- fitness profile not found
- training plan not found
- invalid date
- internal error

## Error Mapping

- `invalid session` -> `401 Unauthorized`
- `user profile not found` -> `404 Not Found`
- `training plan not found` -> `404 Not Found`
- invalid inputs -> `400 Bad Request`
- unexpected failure -> `500 Internal Server Error`
