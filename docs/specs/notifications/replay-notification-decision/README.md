# Replay Notification Decision

## Overview

Replays a persisted `NotificationDecision` against the deterministic formula.

```txt
Bounded Context: Notifications
Module: notifications
Use-case: replay-notification-decision
Canonical name: notifications.notification-decision.replay
```

## Goal

Compare persisted and recalculated notification decisions for drift analysis.
