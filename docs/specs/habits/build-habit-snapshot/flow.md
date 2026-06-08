# Flow

1. Resolve the authenticated user.
2. Resolve the user profile.
3. Load the current day using the platform date service.
4. Gather reduced signals from workouts, check-ins, recovery, goals, coach decisions, and notification engagement.
5. Reduce upstream signals into a safe `sourceContext`.
6. Compute `consistencyScore`, `streakDays`, `adherenceScore`, and `trend` deterministically.
7. Upsert the daily `HabitSnapshot`.
8. Return the persisted snapshot.
