# Get Goal Milestones

## Overview

Returns the milestone definitions and milestone status for the current goal.

## Context

Milestones make the long-term goal visible in smaller steps, such as percentage completion bands, streak targets, workout counts, or recovery thresholds.

## Goal

Expose milestone progression for the active goal.

## MVP Scope

- read milestones for the current goal
- support deterministic milestone status
- keep the response safe and compact

## Preconditions

- the user can be resolved
- an active goal exists

## Postconditions

- milestone progress is returned

## Related Entities

- `Goal`
- `GoalMilestone`
- `GoalProgressSnapshot`

## Related Specs

- `get-current-goal`
- `build-goal-progress-snapshot`
- `get-goal-achievement-history`

## Business Value

Gives users a clearer path to success by breaking goals into visible checkpoints.

## Important Decisions

- milestones are derived from the current goal type
- milestones are deterministic and versioned
- milestone inflation must be controlled

## Summary

This spec defines goal milestone visibility.
