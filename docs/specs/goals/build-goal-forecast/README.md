# Build Goal Forecast

## Overview

Builds a deterministic forecast for the active goal based on recent progress snapshots.

## Context

The goal forecast is a derived read model. It should not own any raw user signals. It consumes goal progress history and produces a predicted completion date and confidence level.

## Goal

Answer:

- when the goal is likely to be achieved
- how confident the forecast is
- how many days remain under the current pace

## MVP Scope

- deterministic forecast only
- derived from historical progress snapshots
- persist a single current forecast per goal

## Preconditions

- the goal exists
- at least one progress snapshot exists, or the forecast can fall back to low confidence

## Postconditions

- a `GoalForecast` is persisted or refreshed
- the result can be consumed by dashboard and coaching layers

## Related Entities

- `Goal`
- `GoalProgressSnapshot`
- `GoalForecast`

## Related Specs

- `build-goal-progress-snapshot`
- `get-current-goal`
- `get-goal-history`

## Business Value

Provides a simple, explainable estimate of long-term goal completion.

## Important Decisions

- deterministic-first
- use history slope, adherence, and variance
- confidence must be explicit
- no LLM involvement

## Summary

This spec defines the goal forecast read model.
