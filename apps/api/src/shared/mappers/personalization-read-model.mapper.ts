import type {
  BehavioralPatternContract,
  PersonalizationSnapshotContract,
  UserBehaviorProfileContract,
} from '../../modules/personalization/domain/personalization.contract';
import type {
  BehavioralPatternType,
  CoachingStyle,
  EngagementProfile,
  PersonalizationTrend,
  ResponsivenessLevel,
} from '../../modules/personalization/domain/personalization.types';
import type { PersonalizationSourceContext } from '../source-context';

type ValueLike<T> = T | { value: T };

type PersonalizationSourceContextLike = PersonalizationSourceContext;

type PersonalizationSnapshotLike = {
  id?: string;
  userProfileId: string;
  date: string;
  preferredCoachingStyle: ValueLike<CoachingStyle>;
  engagementProfile: ValueLike<EngagementProfile>;
  notificationResponsiveness: ValueLike<ResponsivenessLevel>;
  goalResponsiveness: ValueLike<ResponsivenessLevel>;
  recoveryResponsiveness: ValueLike<ResponsivenessLevel>;
  habitResponsiveness: ValueLike<ResponsivenessLevel>;
  riskOfDisengagement: ValueLike<ResponsivenessLevel>;
  trend: ValueLike<PersonalizationTrend>;
  sourceContext: PersonalizationSourceContextLike;
  formulaVersion: string;
  generatedAt: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type UserBehaviorProfileLike = {
  id?: string;
  userProfileId: string;
  preferredCoachingStyle: ValueLike<CoachingStyle>;
  notificationResponsiveness: ValueLike<ResponsivenessLevel>;
  goalResponsiveness: ValueLike<ResponsivenessLevel>;
  recoveryResponsiveness: ValueLike<ResponsivenessLevel>;
  habitResponsiveness: ValueLike<ResponsivenessLevel>;
  engagementProfile: ValueLike<EngagementProfile>;
  riskOfDisengagement: ValueLike<ResponsivenessLevel>;
  formulaVersion: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

type BehavioralPatternLike = {
  id?: string;
  userProfileId: string;
  type: ValueLike<BehavioralPatternType>;
  confidence: ValueLike<ResponsivenessLevel>;
  evidenceCount: number;
  lastObservedAt: string | Date;
  formulaVersion: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type PersonalizationReadModelSource = {
  snapshot?:
    | PersonalizationSnapshotLike
    | PersonalizationSnapshotContract
    | null;
  profile?: UserBehaviorProfileLike | UserBehaviorProfileContract | null;
  patterns?: Array<BehavioralPatternLike | BehavioralPatternContract> | null;
};

export type PersonalizationDashboardPayload = {
  snapshot?: PersonalizationDashboardSnapshotPayload;
  profile?: UserBehaviorProfileContract;
  patterns?: BehavioralPatternContract[];
};

export type PersonalizationDashboardSnapshotPayload = Omit<
  PersonalizationSnapshotContract,
  'sourceContext'
>;

export type PersonalizationPromptPayload = {
  preferredCoachingStyle?: CoachingStyle;
  engagementProfile?: EngagementProfile;
  notificationResponsiveness?: ResponsivenessLevel;
  goalResponsiveness?: ResponsivenessLevel;
  recoveryResponsiveness?: ResponsivenessLevel;
  habitResponsiveness?: ResponsivenessLevel;
  riskOfDisengagement?: ResponsivenessLevel;
  topBehavioralPatterns: BehavioralPatternType[];
  trend?: PersonalizationTrend;
  formulaVersion?: string;
  generatedAt?: string;
};

export type PersonalizationMemoryPayload = {
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  riskOfDisengagement: ResponsivenessLevel;
  topBehavioralPatterns: BehavioralPatternType[];
};

export type PersonalizationNotificationPayload = {
  preferredCoachingStyle: CoachingStyle;
  notificationResponsiveness: ResponsivenessLevel;
  riskOfDisengagement: ResponsivenessLevel;
  topBehavioralPatterns: BehavioralPatternType[];
};

export type PersonalizationCoachDecisionSignals = {
  personalizationHighDisengagementRisk: boolean;
  personalizationRespondsToStreaks: boolean;
  personalizationRespondsToGoals: boolean;
  personalizationPrefersDirectCoaching: boolean;
  personalizationPrefersMotivationalCoaching: boolean;
  personalizationLowNotificationResponsiveness: boolean;
};

export class PersonalizationReadModelMapper {
  static toDashboardPayload(
    input: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationDashboardPayload | undefined {
    const patterns = input?.patterns ?? [];

    if (!input?.snapshot && !input?.profile && !this.hasPatterns(patterns)) {
      return undefined;
    }

    return {
      ...(input?.snapshot
        ? {
            snapshot: this.toSafeSnapshot(input.snapshot),
          }
        : {}),
      ...(input?.profile ? { profile: this.toSafeProfile(input.profile) } : {}),
      ...(this.hasPatterns(patterns)
        ? { patterns: patterns.map((pattern) => this.toSafePattern(pattern)) }
        : {}),
    };
  }

  static toPromptPayload(
    input: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationPromptPayload | undefined {
    const snapshot = input?.snapshot ?? undefined;
    const profile = input?.profile ?? undefined;
    const patterns = this.sortPatterns(input?.patterns ?? []);

    if (!snapshot && !profile && patterns.length === 0) {
      return undefined;
    }

    const topPatterns = patterns
      .slice(0, 5)
      .map((pattern) => this.resolveValue(pattern.type));

    return {
      preferredCoachingStyle: this.resolveValue(
        profile?.preferredCoachingStyle ?? snapshot?.preferredCoachingStyle,
      ),
      engagementProfile: this.resolveValue(
        profile?.engagementProfile ?? snapshot?.engagementProfile,
      ),
      notificationResponsiveness: this.resolveValue(
        profile?.notificationResponsiveness ??
          snapshot?.notificationResponsiveness,
      ),
      goalResponsiveness: this.resolveValue(
        profile?.goalResponsiveness ?? snapshot?.goalResponsiveness,
      ),
      recoveryResponsiveness: this.resolveValue(
        profile?.recoveryResponsiveness ?? snapshot?.recoveryResponsiveness,
      ),
      habitResponsiveness: this.resolveValue(
        profile?.habitResponsiveness ?? snapshot?.habitResponsiveness,
      ),
      riskOfDisengagement: this.resolveValue(
        profile?.riskOfDisengagement ?? snapshot?.riskOfDisengagement,
      ),
      topBehavioralPatterns: topPatterns,
      trend: this.resolveValue(snapshot?.trend),
      formulaVersion: snapshot?.formulaVersion ?? profile?.formulaVersion,
      generatedAt: snapshot?.generatedAt,
    };
  }

  static toMemoryPayload(
    input: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationMemoryPayload | undefined {
    const snapshot = input?.snapshot ?? undefined;
    const profile = input?.profile ?? undefined;
    const patterns = this.sortPatterns(input?.patterns ?? []);

    const preferredCoachingStyle =
      profile?.preferredCoachingStyle ?? snapshot?.preferredCoachingStyle;
    const engagementProfile =
      profile?.engagementProfile ?? snapshot?.engagementProfile;
    const riskOfDisengagement =
      profile?.riskOfDisengagement ?? snapshot?.riskOfDisengagement;

    if (!preferredCoachingStyle || !engagementProfile || !riskOfDisengagement) {
      return undefined;
    }

    return {
      preferredCoachingStyle: this.resolveValue(preferredCoachingStyle),
      engagementProfile: this.resolveValue(engagementProfile),
      riskOfDisengagement: this.resolveValue(riskOfDisengagement),
      topBehavioralPatterns: patterns
        .slice(0, 5)
        .map((pattern) => this.resolveValue(pattern.type)),
    };
  }

  static toNotificationPayload(
    input: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationNotificationPayload | undefined {
    const snapshot = input?.snapshot ?? undefined;
    const profile = input?.profile ?? undefined;
    const patterns = this.sortPatterns(input?.patterns ?? []);
    const notificationResponsiveness =
      profile?.notificationResponsiveness ??
      snapshot?.notificationResponsiveness;
    const preferredCoachingStyle =
      profile?.preferredCoachingStyle ?? snapshot?.preferredCoachingStyle;
    const riskOfDisengagement =
      profile?.riskOfDisengagement ?? snapshot?.riskOfDisengagement;

    if (
      !notificationResponsiveness ||
      !preferredCoachingStyle ||
      !riskOfDisengagement
    ) {
      return undefined;
    }

    return {
      preferredCoachingStyle: this.resolveValue(preferredCoachingStyle),
      notificationResponsiveness: this.resolveValue(notificationResponsiveness),
      riskOfDisengagement: this.resolveValue(riskOfDisengagement),
      topBehavioralPatterns: patterns
        .slice(0, 5)
        .map((pattern) => this.resolveValue(pattern.type)),
    };
  }

  static toCoachDecisionSignals(
    input: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationCoachDecisionSignals | undefined {
    const snapshot = input?.snapshot ?? undefined;
    const profile = input?.profile ?? undefined;
    const patterns = this.sortPatterns(input?.patterns ?? []);
    const topPatterns = patterns
      .slice(0, 5)
      .map((pattern) => this.resolveValue(pattern.type));

    const preferredCoachingStyle =
      profile?.preferredCoachingStyle ?? snapshot?.preferredCoachingStyle;
    const notificationResponsiveness =
      profile?.notificationResponsiveness ??
      snapshot?.notificationResponsiveness;
    const riskOfDisengagement =
      profile?.riskOfDisengagement ?? snapshot?.riskOfDisengagement;

    if (
      !preferredCoachingStyle &&
      !notificationResponsiveness &&
      !riskOfDisengagement &&
      topPatterns.length === 0
    ) {
      return undefined;
    }

    return {
      personalizationHighDisengagementRisk: riskOfDisengagement === 'high',
      personalizationRespondsToStreaks: topPatterns.includes(
        'responds_to_streaks',
      ),
      personalizationRespondsToGoals: topPatterns.includes('responds_to_goals'),
      personalizationPrefersDirectCoaching: preferredCoachingStyle === 'direct',
      personalizationPrefersMotivationalCoaching:
        preferredCoachingStyle === 'motivational',
      personalizationLowNotificationResponsiveness:
        notificationResponsiveness === 'low',
    };
  }

  private static toSafeSnapshot(
    snapshot: PersonalizationSnapshotLike | PersonalizationSnapshotContract,
  ): PersonalizationDashboardSnapshotPayload {
    return {
      id: snapshot.id,
      userProfileId: snapshot.userProfileId,
      date: snapshot.date,
      preferredCoachingStyle: this.resolveValue(
        snapshot.preferredCoachingStyle,
      ),
      engagementProfile: this.resolveValue(snapshot.engagementProfile),
      notificationResponsiveness: this.resolveValue(
        snapshot.notificationResponsiveness,
      ),
      goalResponsiveness: this.resolveValue(snapshot.goalResponsiveness),
      recoveryResponsiveness: this.resolveValue(
        snapshot.recoveryResponsiveness,
      ),
      habitResponsiveness: this.resolveValue(snapshot.habitResponsiveness),
      riskOfDisengagement: this.resolveValue(snapshot.riskOfDisengagement),
      trend: this.resolveValue(snapshot.trend),
      formulaVersion: snapshot.formulaVersion,
      generatedAt: snapshot.generatedAt,
      createdAt: this.resolveDate(snapshot.createdAt),
      updatedAt: this.resolveDate(snapshot.updatedAt),
    };
  }

  private static hasPatterns(
    patterns:
      | Array<BehavioralPatternLike | BehavioralPatternContract>
      | null
      | undefined,
  ): boolean {
    return Boolean(patterns && patterns.length > 0);
  }

  private static sortPatterns(
    patterns: Array<BehavioralPatternLike | BehavioralPatternContract>,
  ): Array<BehavioralPatternLike | BehavioralPatternContract> {
    return [...patterns].sort((left, right) => {
      if (left.evidenceCount !== right.evidenceCount) {
        return right.evidenceCount - left.evidenceCount;
      }

      const lastObservedDelta =
        new Date(right.lastObservedAt).getTime() -
        new Date(left.lastObservedAt).getTime();

      if (lastObservedDelta !== 0) {
        return lastObservedDelta;
      }

      const createdAtLeft = left.createdAt
        ? new Date(left.createdAt).getTime()
        : 0;
      const createdAtRight = right.createdAt
        ? new Date(right.createdAt).getTime()
        : 0;

      return createdAtRight - createdAtLeft;
    });
  }

  private static toSafeProfile(
    profile: UserBehaviorProfileLike | UserBehaviorProfileContract,
  ): UserBehaviorProfileContract {
    return {
      id: profile.id,
      userProfileId: profile.userProfileId,
      preferredCoachingStyle: this.resolveValue(profile.preferredCoachingStyle),
      notificationResponsiveness: this.resolveValue(
        profile.notificationResponsiveness,
      ),
      goalResponsiveness: this.resolveValue(profile.goalResponsiveness),
      recoveryResponsiveness: this.resolveValue(profile.recoveryResponsiveness),
      habitResponsiveness: this.resolveValue(profile.habitResponsiveness),
      engagementProfile: this.resolveValue(profile.engagementProfile),
      riskOfDisengagement: this.resolveValue(profile.riskOfDisengagement),
      formulaVersion: profile.formulaVersion,
      updatedAt: this.resolveDate(profile.updatedAt),
      createdAt: this.resolveDate(profile.createdAt),
    };
  }

  private static toSafePattern(
    pattern: BehavioralPatternLike | BehavioralPatternContract,
  ): BehavioralPatternContract {
    return {
      id: pattern.id,
      userProfileId: pattern.userProfileId,
      type: this.resolveValue(pattern.type),
      confidence: this.resolveValue(pattern.confidence),
      evidenceCount: pattern.evidenceCount,
      lastObservedAt: this.resolveDate(pattern.lastObservedAt) ?? '',
      formulaVersion: pattern.formulaVersion,
      createdAt: this.resolveDate(pattern.createdAt),
      updatedAt: this.resolveDate(pattern.updatedAt),
    };
  }

  private static resolveValue<T>(value: ValueLike<T> | undefined): T {
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value;
    }

    return value as T;
  }

  private static resolveDate(value?: string | Date): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
