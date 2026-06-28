export type ReadinessScoreProps = {
  value: number;
};

export class ReadinessScore {
  readonly value: number;

  constructor(value: number) {
    this.value = clampScore(value);
  }

  toJSON(): ReadinessScoreProps {
    return {
      value: this.value,
    };
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}
