# Flow - Build Notification Decision

1. Resolve the authenticated user profile.
2. Load `CoachDecision` and supporting goal/recovery/training signals.
3. Evaluate notification type, priority, channel, and fatigue rules.
4. Build reduced `sourceContext`.
5. Persist the decision for the day.
6. Return the persisted decision.
