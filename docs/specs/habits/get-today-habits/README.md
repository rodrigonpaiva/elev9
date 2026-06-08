# Get Today Habits

## Overview

Reads or builds the authenticated user’s habit snapshot for today.

```txt
Bounded Context: habits
Module: habits
Use-case: get-today-habits
Canonical name: habits.habit-snapshot.today
```

## Goal

Provide the current daily consistency view without recalculating habit logic in the controller layer.
