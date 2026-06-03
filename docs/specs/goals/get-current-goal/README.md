# Get Current Goal

## Overview

Returns the canonical active `Goal` for the authenticated user.

## Context

The new Goal Achievement Engine owns long-term outcome state. This use case reads the current active goal from the goal bounded context rather than from `FitnessProfile.goal`.

## Goal

Provide the single source of truth for the user’s current long-term goal.

## MVP Scope

- resolve the authenticated user
- return the active goal
- keep the response deterministic and stable

## Preconditions

- the user can be resolved
- one active goal exists for the user

## Postconditions

- the current goal is returned
- no goal state is mutated

## Related Entities

- `Goal`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`

## Related Specs

- `build-goal-progress-snapshot`
- `build-goal-forecast`
- `get-goal-history`
- `get-goal-milestones`
- `get-goal-achievement-history`

## Business Value

Establishes a canonical goal source of truth for the rest of the product.

## Important Decisions

- one active goal per user in the MVP
- `FitnessProfile.goal` only seeds or informs the canonical goal
- no build endpoint in this MVP

## Summary

This spec defines the read path for the current active goal.
