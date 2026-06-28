# Rules

- UTC is the only supported daily boundary in the current platform state.
- date strings remain canonical daily keys.
- no engine may silently interpret local time as the authoritative boundary.
- timezone migration must preserve historical replayability.
