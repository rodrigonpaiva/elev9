# Flow

1. Resolve the authenticated user.
2. Resolve the user profile.
3. Resolve the active goal.
4. Load the most relevant recent signals from progress, nutrition, recovery, and training.
5. Determine the goal type and the progress formula.
6. Compute `currentValue`, `targetValue`, `progressPercentage`, and `trend`.
7. Reduce the source context to a safe snapshot.
8. Upsert the daily `GoalProgressSnapshot`.
9. Return the persisted snapshot.
