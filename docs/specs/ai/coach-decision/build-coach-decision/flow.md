# Flow - Build Coach Decision

## Main Flow

1. Validate the authenticated session.
2. Resolve `UserProfile` from `authUserId`.
3. Resolve the latest recovery, nutrition, and adaptive training signals.
4. Resolve progress signals such as streak and recent activity.
5. Build a reduced `sourceContext`.
6. Compute `priority`, `headline`, `summary`, `actionItems`, and `influences`.
7. Optionally ask the LLM to polish wording only.
8. Persist the decision via daily upsert.
9. Return the persisted `CoachDecision`.

## Alternative Flows

- If one signal is missing, continue with the signals that are available.
- If all optional signals are missing, produce a safe consistency or motivation decision.
- If LLM wording fails, return the deterministic wording.

