import type {
  ConsistencySummaryContract,
  HabitRiskSignalContract,
  HabitSnapshotContract,
} from '../../modules/habits/domain/habits.contract';
import type {
  ConsistencyTrend,
  HabitRiskLevel,
  RiskSignalType,
} from '../../modules/habits/domain/habits.types';

export type HabitReadModel = {
  current?: HabitSnapshotLike;
  summary?: ConsistencySummaryLike;
  riskSignals?: HabitRiskSignalLike[];
};

export type HabitReadModelPayload = {
  current?: HabitSnapshotDashboardPayload;
  summary?: ConsistencySummaryContract;
  riskSignals?: HabitRiskSignalContract[];
};

export type HabitPromptPayload = HabitReadModelPayload;

export type HabitMemoryPayload = {
  habitConsistencyScore: number;
  habitTrend: ConsistencyTrend;
  habitCurrentStreak: number;
  habitRiskLevel: HabitRiskLevel;
};

export type HabitCoachDecisionSignals = {
  habitConsistencyImproving: boolean;
  habitConsistencyDeclining: boolean;
  habitRiskHigh: boolean;
  habitStreakStrong: boolean;
  habitDropoutRisk: boolean;
};

type HabitSnapshotLike =
  | HabitSnapshotContract
  | {
      toJSON: () => HabitSnapshotContract;
    };

type ConsistencySummaryLike =
  | ConsistencySummaryContract
  | {
      toJSON: () => ConsistencySummaryContract;
    };

type HabitRiskSignalLike =
  | HabitRiskSignalContract
  | {
      toJSON: () => HabitRiskSignalContract;
    };

export type HabitSnapshotDashboardPayload = Omit<
  HabitSnapshotContract,
  'sourceContext'
>;

export class HabitReadModelMapper {
  static toDashboardPayload(
    habitReadModel: HabitReadModel | null | undefined,
  ): HabitReadModelPayload | undefined {
    if (!habitReadModel) {
      return undefined;
    }

    const current = habitReadModel.current
      ? this.toSafeSnapshot(habitReadModel.current)
      : undefined;
    const summary = habitReadModel.summary
      ? this.toSummaryPayload(habitReadModel.summary)
      : undefined;
    const riskSignals = habitReadModel.riskSignals
      ? habitReadModel.riskSignals.map((signal) => this.toRiskSignal(signal))
      : undefined;

    if (!current && !summary && !riskSignals) {
      return undefined;
    }

    return {
      ...(current ? { current } : {}),
      ...(summary ? { summary } : {}),
      ...(riskSignals ? { riskSignals } : {}),
    };
  }

  static toPromptPayload(
    habitReadModel: HabitReadModel | null | undefined,
  ): HabitPromptPayload | undefined {
    return this.toDashboardPayload(habitReadModel);
  }

  static toMemoryPayload(
    habitReadModel: HabitReadModel | null | undefined,
  ): HabitMemoryPayload | undefined {
    if (!habitReadModel) {
      return undefined;
    }

    const current = habitReadModel.current
      ? this.toSafeSnapshot(habitReadModel.current)
      : undefined;
    const summary = habitReadModel.summary
      ? this.toSummaryPayload(habitReadModel.summary)
      : undefined;

    if (!current && !summary) {
      return undefined;
    }

    const summarySource = summary ?? {
      score: current?.consistencyScore ?? 50,
      trend: current?.trend ?? 'stable',
      currentStreak: current?.streakDays ?? 0,
      longestStreak: current?.streakDays ?? 0,
      adherenceRate: current?.adherenceScore ?? 50,
      riskLevel: 'low' as HabitRiskLevel,
      updatedAt: current?.generatedAt ?? new Date().toISOString(),
      formulaVersion: current?.formulaVersion ?? 'habit-engine-v1',
      userProfileId: current?.userProfileId ?? '',
    };

    return {
      habitConsistencyScore: summarySource.score,
      habitTrend: summarySource.trend,
      habitCurrentStreak: summarySource.currentStreak,
      habitRiskLevel: summarySource.riskLevel,
    };
  }

  static toCoachDecisionSignals(
    habitReadModel: HabitReadModel | null | undefined,
  ): HabitCoachDecisionSignals | undefined {
    if (!habitReadModel) {
      return undefined;
    }

    const current = habitReadModel.current
      ? this.toSafeSnapshot(habitReadModel.current)
      : undefined;
    const summary = habitReadModel.summary
      ? this.toSummaryPayload(habitReadModel.summary)
      : undefined;
    const riskSignals = habitReadModel.riskSignals
      ? habitReadModel.riskSignals.map((signal) => this.toRiskSignal(signal))
      : [];

    if (!current && !summary && riskSignals.length === 0) {
      return undefined;
    }

    const trend = summary?.trend ?? current?.trend ?? 'stable';
    const currentStreak = summary?.currentStreak ?? current?.streakDays ?? 0;
    const riskLevel = summary?.riskLevel ?? 'low';
    const riskSignalTypes = new Set(riskSignals.map((signal) => signal.type));

    return {
      habitConsistencyImproving: trend === 'improving',
      habitConsistencyDeclining: trend === 'declining',
      habitRiskHigh:
        riskLevel === 'high' ||
        riskSignals.some((signal) => signal.level === 'high'),
      habitStreakStrong: currentStreak >= 5,
      habitDropoutRisk: riskSignalTypes.has('dropout_risk'),
    };
  }

  private static toSafeSnapshot(
    snapshot: HabitSnapshotLike,
  ): HabitSnapshotDashboardPayload {
    const raw = this.unwrap(snapshot);
    const { sourceContext: _sourceContext, ...safeSnapshot } = raw;

    return safeSnapshot;
  }

  private static toSummaryPayload(
    summary: ConsistencySummaryLike,
  ): ConsistencySummaryContract {
    return this.unwrap(summary);
  }

  private static toRiskSignal(
    signal: HabitRiskSignalLike,
  ): HabitRiskSignalContract {
    return this.unwrap(signal);
  }

  private static unwrap<T>(value: { toJSON: () => T } | T): T {
    return typeof value === 'object' &&
      value !== null &&
      'toJSON' in value
      ? value.toJSON()
      : value;
  }
}
