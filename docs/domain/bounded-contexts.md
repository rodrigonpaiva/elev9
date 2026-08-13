# Bounded Contexts - Elev9 Coach

## 1. Overview

This document defines the current bounded contexts of Elev9 Coach.
Each context owns a clear domain slice, its language, and its canonical read/write models.

The current workspace is still a modular monolith, but the domain boundaries are organized as if each context could be extracted later.

## 2. Current Context Map

```txt
Auth
  -> Users
  -> Fitness
  -> Training
  -> Nutrition
  -> Progress
  -> Recovery
  -> Goals
  -> Habits
  -> Personalization
  -> Notifications
  -> AI / Coach
```

## 3. Core Contexts

### Auth

Owns authentication, sessions, and account security.

### Users

Owns the functional user profile, preferences, language, and timezone.

### Fitness

Owns fitness profile, goals, limitations, availability, and equipment.

### Training

Owns training plans, workout days, sessions, and workout logs.

### Nutrition

Owns nutrition profiles, macro targets, meal plans, meal logs, and meal replacements.

### Progress

Owns daily check-ins, progress summaries, body metrics, and adherence reporting.

### Recovery

Owns recovery snapshots, readiness, fatigue, and recovery trend history.

### Goals

Owns the canonical long-term goal, progress snapshots, forecasts, milestones, and achievements.

### Habits

Owns habit snapshots, consistency summaries, and risk signals.

### Personalization

Owns behavioral patterns, personalization snapshots, and long-horizon adaptation signals.

### Notifications

Owns notification decisions, history, engagement events, and fatigue/suppression logic.

### AI / Coach

Owns coaching read models, explainability, replay surfaces, coach conversation, briefing, memory, insights, ask coach, weekly review, goal guidance, and coach-facing navigation.

## 4. Ownership Rules

- Each context owns its canonical persistence and rules.
- Shared read models are consumed across contexts, but ownership does not move to the consumer.
- The coach layer composes existing signals; it does not own upstream domain truth.

## 5. Product Implications

- Dashboard reads the same shared signals used by coach surfaces.
- Coach Home, Daily Briefing, Insights, Memory, Ask Coach, Weekly Review, Goal Guidance, and Notifications all reuse the same bounded contexts.
- The product now feels cohesive because the same domain language flows through the main user surfaces.

## 6. Summary

The current domain model is centered on adaptive coaching, with AI / Coach as the orchestration layer over recovery, goals, habits, personalization, and notifications.
