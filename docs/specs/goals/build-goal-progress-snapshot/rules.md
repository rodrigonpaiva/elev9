# Rules

## Goal types

- `lose_weight`
- `gain_muscle`
- `maintain_weight`
- `improve_consistency`
- `improve_recovery`

## Progress rules

### Weight loss

```txt
progress = (startWeight - currentWeight) / (startWeight - targetWeight)
```

### Muscle gain

```txt
progress = (currentWeight - startWeight) / (targetWeight - startWeight)
```

### Consistency

Progress is derived from:

- workout adherence
- streak
- check-in adherence

### Recovery

Progress is derived from:

- readiness trend
- fatigue reduction
- recovery adherence

### Maintain weight

Progress is derived from:

- weight stability
- consistency
- adherence

## General rules

- clamp progress to `0-100`
- missing signals fall back to neutral values
- do not fail the build for sparse data
- use a versioned deterministic formula
- keep source context reduced
