# Flow - Replay Coach Decision

1. Validate the authenticated session.
2. Resolve `UserProfile`.
3. Load the decision by `decisionId`.
4. Rebuild the decision using the same or a newer formula version.
5. Compare persisted vs recalculated values.
6. Return the drift report.
