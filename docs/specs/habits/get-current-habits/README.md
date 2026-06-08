# Get Current Habits

## Overview

Reads the latest canonical habit snapshot for the authenticated user.

```txt
Bounded Context: habits
Module: habits
Use-case: get-current-habits
Canonical name: habits.habit-snapshot.current
```

## Goal

Expose the latest consistency state without recomputing habit logic in the read layer.
