# Rules

- mapping is pure and side-effect free
- mappers should not call repositories or use cases
- DTO shape ownership stays in presentation or client boundaries
- shared helpers may normalize repeated structural transforms, but not business logic
