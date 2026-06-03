# Get Goal Achievement History

## Overview

Returns the achievement history for the authenticated user.

## Context

Goal achievements record when a goal has been completed, how complete it was, and any notes associated with the outcome.

## Goal

Expose a stable history of achieved goals for review and dashboard surfaces.

## MVP Scope

- list goal achievements
- support safe pagination
- keep the records compact and deterministic

## Preconditions

- the user can be resolved
- one or more achievement records may exist

## Postconditions

- the user’s achievement history is returned

## Related Entities

- `Goal`
- `GoalAchievement`

## Related Specs

- `get-current-goal`
- `get-goal-history`
- `get-goal-milestones`

## Business Value

Creates a durable record of completed long-term outcomes.

## Important Decisions

- achievement records are separate from current goal state
- the response should stay compact
- no raw source context should be exposed

## Summary

This spec defines the long-term achievement history read path.
