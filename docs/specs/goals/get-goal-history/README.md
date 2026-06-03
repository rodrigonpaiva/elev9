# Get Goal History

## Overview

Returns the history of goals for the authenticated user.

## Context

The product needs a historical view of goal evolution, including achieved and abandoned goals, without treating `FitnessProfile.goal` as the source of truth.

## Goal

Provide a stable history of goal records for dashboard, coaching, and review surfaces.

## MVP Scope

- list goal records
- support safe pagination via limit
- include active, achieved, and abandoned records

## Preconditions

- the user can be resolved
- goal records exist or the result is an empty list

## Postconditions

- a deterministic history list is returned

## Related Entities

- `Goal`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`

## Related Specs

- `get-current-goal`
- `get-goal-milestones`
- `get-goal-achievement-history`

## Business Value

Gives visibility into long-term outcome changes and user journey progression.

## Important Decisions

- default limit is `14`
- maximum limit is `90`
- sort newest first

## Summary

This spec defines the historical read path for goals.
