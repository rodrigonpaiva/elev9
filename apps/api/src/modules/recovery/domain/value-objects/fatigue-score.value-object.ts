export type FatigueScoreProps = {
  value: number;
};

export class FatigueScore {
  readonly value: number;

  constructor(value: number) {
    this.value = clampScore(value);
  }

  toJSON(): FatigueScoreProps {
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

