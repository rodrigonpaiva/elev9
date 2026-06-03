# Build Goal Progress Snapshot

## Overview

Builds a deterministic daily `GoalProgressSnapshot` for the active goal of a user.

## Context

The repository already has signals that can inform progress:

- `FitnessProfile`
- `WorkoutLog`
- `DailyCheckIn`
- `ProgressSummary`
- `NutritionProgress`
- `NutritionRecommendation`
- `RecoverySnapshot`
- `AdaptiveTrainingRecommendation`
- `CoachDecision`

This spec defines the read-model snapshot that turns those signals into a goal-centric progress record.

## Goal

Persist a daily progress snapshot that can answer:

- how far the user is from the goal
- whether progress is improving, stable, or declining
- what source signals influenced the calculation

## MVP Scope

- build a daily snapshot for one active goal
- compute progress deterministically
- persist via idempotent upsert
- store reduced source context only

## Preconditions

- a `Goal` exists and is active
- the user can be resolved from auth/session
- at least one source signal may be present, but missing signals must not fail the build

## Postconditions

- a `GoalProgressSnapshot` is persisted for the day
- a stable `formulaVersion` is recorded
- the snapshot can be reused by forecast and dashboard layers

## Related Entities

- `Goal`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`

## Related Specs

- `build-goal-forecast`
- `get-current-goal`
- `get-goal-history`
- `get-goal-milestones`
- `get-goal-achievement-history`

## Business Value

Establishes the daily progress source of truth for long-term outcome tracking.

## Important Decisions

- deterministic-first, no LLM involvement
- daily UTC snapshot strategy for now
- `FitnessProfile.goal` is only a seed
- source context must remain reduced and safe

## Summary

This spec defines the primary goal progress read model.
