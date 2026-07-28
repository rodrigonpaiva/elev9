import type { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import type { RecoveryTrendDirection } from '../read-models/recovery-read-model.types';

const MINIMUM_POINTS = 2;
const STABLE_THRESHOLD = 5;

export class RecoveryTrendPolicy {
  calculate(snapshots: RecoverySnapshot[]): {
    direction: RecoveryTrendDirection;
    comparedDays: number;
  } {
    const valid = snapshots
      .filter((snapshot) => this.isUsable(snapshot))
      .sort((left, right) => left.date.localeCompare(right.date));

    if (valid.length < MINIMUM_POINTS) {
      return { direction: 'insufficient_data', comparedDays: valid.length };
    }

    const splitIndex = Math.floor(valid.length / 2);
    const first = valid.slice(0, splitIndex);
    const second = valid.slice(splitIndex);
    const firstAverage = this.average(first.map((snapshot) => snapshot.readinessScore));
    const secondAverage = this.average(second.map((snapshot) => snapshot.readinessScore));
    const difference = secondAverage - firstAverage;

    return {
      direction:
        difference >= STABLE_THRESHOLD
          ? 'improving'
          : difference <= -STABLE_THRESHOLD
            ? 'declining'
            : 'stable',
      comparedDays: valid.length,
    };
  }

  private isUsable(snapshot: RecoverySnapshot): boolean {
    return Boolean(
      snapshot.sourceContext?.generatedAt &&
        Number.isFinite(new Date(snapshot.sourceContext.generatedAt).getTime()),
    );
  }

  private average(values: number[]): number {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }
}
