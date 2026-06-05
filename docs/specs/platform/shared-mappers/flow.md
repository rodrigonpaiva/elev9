# Flow

1. Core engines produce their own domain read models.
2. Boundary mappers transform those models into API-specific DTOs.
3. Dashboard and AI use shared reduced shapes when multiple consumers need the same data.
4. No presentation DTO leaks into domain or repository code.

