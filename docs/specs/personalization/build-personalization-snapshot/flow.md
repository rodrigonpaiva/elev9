1. Resolve the authenticated user.
2. Resolve the user profile.
3. Load the current day using the platform date service.
4. Gather reduced signals from recovery, training, goals, coach decisions, notifications, and habits.
5. Reduce upstream signals into a safe `sourceContext`.
6. Derive coaching style, responsiveness, engagement profile, and risk of disengagement deterministically.
7. Upsert the daily `PersonalizationSnapshot`.
8. Return the persisted snapshot.
