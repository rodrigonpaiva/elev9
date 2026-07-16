import { Injectable } from '@nestjs/common';

import type {
  CoachIntelligenceAvailability,
  CoachIntelligenceAvailabilityReasonCode,
  CoachIntelligenceAvailabilityStatus,
  CoachIntelligenceFeatureAvailability,
  CoachIntelligenceFreshness,
  CoachIntelligenceFreshnessStatus,
  CoachIntelligenceSectionAvailability,
  CoachIntelligenceSectionFreshness,
  CoachIntelligenceSectionName,
  CoachIntelligenceSectionState,
  CoachIntelligenceWarning,
  CoachIntelligenceWarningCode,
  CoachIntelligenceWarningSeverity,
  CoachIntelligenceSections,
} from '@elev9/types';

import type { CoachIntelligenceSourceSectionState } from './coach-intelligence.types';

const FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const DATA_SECTIONS: readonly Exclude<
  CoachIntelligenceSectionName,
  'insight' | 'evidence' | 'explainability'
>[] = [
  'training',
  'nutrition',
  'recovery',
  'goals',
  'habits',
  'progress',
  'personalization',
  'notifications',
] as const;

const DERIVED_SECTIONS: readonly Extract<
  CoachIntelligenceSectionName,
  'insight' | 'evidence' | 'explainability'
>[] = ['insight', 'evidence', 'explainability'] as const;

const CORE_SECTION_NAMES: readonly CoachIntelligenceSectionName[] = [
  'training',
  'nutrition',
  'recovery',
  'goals',
  'habits',
  'progress',
] as const;

type SectionStateMap = Pick<
  CoachIntelligenceSections,
  | 'training'
  | 'nutrition'
  | 'recovery'
  | 'goals'
  | 'habits'
  | 'progress'
  | 'personalization'
  | 'notifications'
>;

@Injectable()
export class CoachIntelligenceFreshnessPolicy {
  resolveSectionFreshness(input: {
    generatedAt: string;
    sourceTimestamp?: string;
  }): CoachIntelligenceSectionFreshness {
    const sourceTimestamp = this.normalizeTimestamp(input.sourceTimestamp);

    if (!sourceTimestamp) {
      return Object.freeze({
        status: 'unknown',
        generatedAt: input.generatedAt,
      });
    }

    const generatedAtMs = Date.parse(input.generatedAt);
    const sourceTimestampMs = Date.parse(sourceTimestamp);
    const ageMs = Number.isFinite(generatedAtMs)
      ? Math.max(0, generatedAtMs - sourceTimestampMs)
      : undefined;
    const status: CoachIntelligenceFreshnessStatus =
      typeof ageMs === 'number' && ageMs > FRESHNESS_THRESHOLD_MS
        ? 'stale'
        : 'fresh';

    return Object.freeze({
      status,
      generatedAt: input.generatedAt,
      sourceTimestamp,
      ...(typeof ageMs === 'number' ? { ageMs } : {}),
    });
  }

  resolveAggregateFreshness(input: {
    generatedAt: string;
    sections: SectionStateMap;
  }): CoachIntelligenceFreshness {
    const freshnessEntries = DATA_SECTIONS.map((section) => ({
      section,
      freshness: input.sections[section].freshness,
    }));
    const sourceTimestamps = freshnessEntries
      .map((entry) => entry.freshness.sourceTimestamp)
      .filter((value): value is string => typeof value === 'string');
    const latestSourceTimestamp = this.resolveLatestTimestamp(sourceTimestamps);
    const freshnessStatuses = freshnessEntries.map(
      (entry) => entry.freshness.status,
    );
    const status: CoachIntelligenceFreshnessStatus =
      freshnessStatuses.includes('stale')
        ? 'stale'
        : freshnessStatuses.every((value) => value === 'unknown')
          ? 'unknown'
          : 'fresh';
    const generatedAtMs = Date.parse(input.generatedAt);
    const sourceTimestampMs = latestSourceTimestamp
      ? Date.parse(latestSourceTimestamp)
      : Number.NaN;

    return Object.freeze({
      status,
      generatedAt: input.generatedAt,
      ...(latestSourceTimestamp ? { sourceTimestamp: latestSourceTimestamp } : {}),
      ...(Number.isFinite(generatedAtMs) && Number.isFinite(sourceTimestampMs)
        ? { ageMs: Math.max(0, generatedAtMs - sourceTimestampMs) }
        : {}),
      sections: this.buildFreshnessSectionMap({
        generatedAt: input.generatedAt,
        sections: input.sections,
        status,
        sourceTimestamp: latestSourceTimestamp,
      }),
    });
  }

  resolveSectionState<TSectionData>(input: {
    sectionName: CoachIntelligenceSectionName;
    data: TSectionData | null;
    generatedAt: string;
    sourceTimestamp?: string;
    fallbackUsed?: boolean;
    retryable?: boolean;
    reasonCode?: CoachIntelligenceAvailabilityReasonCode;
    disabled?: boolean;
  }): CoachIntelligenceSourceSectionState<TSectionData> {
    const freshness = this.resolveSectionFreshness({
      generatedAt: input.generatedAt,
      sourceTimestamp: input.sourceTimestamp,
    });
    const availability = this.resolveSectionAvailability({
      sectionName: input.sectionName,
      data: input.data,
      freshness,
      fallbackUsed: input.fallbackUsed ?? false,
      retryable: input.retryable ?? false,
      reasonCode: input.reasonCode ?? this.resolveReasonCode(freshness, input.data),
      disabled: input.disabled ?? false,
    });
    const warnings = this.resolveWarnings({
      sectionName: input.sectionName,
      availability,
      freshness,
      fallbackUsed: input.fallbackUsed ?? false,
    });

    return Object.freeze({
      availability,
      freshness,
      data: input.data,
      warnings,
      sourceTimestamp: input.sourceTimestamp,
      fallbackUsed: input.fallbackUsed ?? false,
      retryable: input.retryable ?? false,
      reasonCode: availability.reasonCode,
      generatedAt: input.generatedAt,
    });
  }

  resolveAggregateAvailability(input: {
    sections: SectionStateMap;
    featureEnabled: boolean;
    fallbackUsed: boolean;
  }): CoachIntelligenceAvailability {
    if (!input.featureEnabled) {
      return Object.freeze({
        status: 'disabled',
        fallbackUsed: false,
        retryable: false,
        reasonCode: 'FEATURE_DISABLED',
        sections: this.buildAvailabilitySectionMap({
          status: 'disabled',
          reasonCode: 'FEATURE_DISABLED',
          sections: input.sections,
          fallbackUsed: false,
          retryable: false,
        }),
      });
    }

    const sectionAvailability = this.buildAvailabilitySectionMap({
      sections: input.sections,
    });
    const coreStatuses = CORE_SECTION_NAMES.map(
      (section) => sectionAvailability[section].status,
    );
    const coreUnavailableCount = coreStatuses.filter(
      (status) => status === 'unavailable',
    ).length;
    const hasUnavailableSection = Object.values(sectionAvailability).some(
      (availability) => availability.status === 'unavailable',
    );
    const hasDegradedSection = Object.values(sectionAvailability).some(
      (availability) => availability.status === 'degraded',
    );
    const hasStaleSection = Object.values(sectionAvailability).some(
      (availability) => availability.status === 'stale',
    );
    const fallbackUsed =
      input.fallbackUsed ||
      Object.values(sectionAvailability).some(
        (availability) => availability.fallbackUsed,
      );
    const retryable = Object.values(sectionAvailability).some(
      (availability) => availability.retryable,
    );
    const reasonCode = this.resolveAggregateReasonCode(sectionAvailability);
    const status: CoachIntelligenceAvailabilityStatus =
      coreUnavailableCount === CORE_SECTION_NAMES.length
        ? 'unavailable'
        : coreUnavailableCount > 0 || hasDegradedSection || hasUnavailableSection
          ? 'degraded'
          : hasStaleSection
            ? 'stale'
            : 'available';

    return Object.freeze({
      status,
      fallbackUsed,
      retryable,
      reasonCode,
      sections: sectionAvailability,
    });
  }

  resolveFeatureAvailability(input: {
    sections: SectionStateMap;
  }): CoachIntelligenceFeatureAvailability {
    return Object.freeze({
      insight: true,
      evidence: true,
      explainability: true,
      training: input.sections.training.availability.status !== 'disabled',
      nutrition: input.sections.nutrition.availability.status !== 'disabled',
      recovery: input.sections.recovery.availability.status !== 'disabled',
      goals: input.sections.goals.availability.status !== 'disabled',
      habits: input.sections.habits.availability.status !== 'disabled',
      progress: input.sections.progress.availability.status !== 'disabled',
      personalization:
        input.sections.personalization.availability.status !== 'disabled',
      notifications:
        input.sections.notifications.availability.status !== 'disabled',
    });
  }

  resolveWarnings(input: {
    sectionName: CoachIntelligenceSectionName;
    availability: CoachIntelligenceSectionAvailability;
    freshness: CoachIntelligenceSectionFreshness;
    fallbackUsed: boolean;
  }): CoachIntelligenceWarning[] {
    const warnings: CoachIntelligenceWarning[] = [];

    if (input.availability.status === 'disabled') {
      warnings.push(
        this.buildWarning({
          code: 'FEATURE_DISABLED',
          severity: 'HIGH',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'The section is disabled.',
        }),
      );
    }

    if (input.availability.status === 'unavailable') {
      warnings.push(
        this.buildWarning({
          code: 'MISSING_CONTEXT',
          severity: 'MEDIUM',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'The section has no usable data.',
        }),
      );
    }

    if (input.availability.status === 'stale' || input.freshness.status === 'stale') {
      warnings.push(
        this.buildWarning({
          code: 'STALE_CONTEXT',
          severity: 'LOW',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'The section data is stale.',
        }),
      );
    }

    if (input.availability.status === 'degraded') {
      warnings.push(
        this.buildWarning({
          code: 'PARTIAL_RESPONSE',
          severity: 'MEDIUM',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'The section returned partial data.',
        }),
      );
    }

    if (input.availability.retryable) {
      warnings.push(
        this.buildWarning({
          code: 'RETRY_RECOMMENDED',
          severity: 'LOW',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'The section can be retried safely.',
        }),
      );
    }

    if (input.fallbackUsed) {
      warnings.push(
        this.buildWarning({
          code: 'FALLBACK_USED',
          severity: 'LOW',
          sectionName: input.sectionName,
          title: this.sectionTitle(input.sectionName),
          detail: 'A fallback path was used for this section.',
        }),
      );
    }

    return warnings;
  }

  private resolveSectionAvailability(input: {
    sectionName: CoachIntelligenceSectionName;
    data: unknown | null;
    freshness: CoachIntelligenceSectionFreshness;
    fallbackUsed: boolean;
    retryable: boolean;
    reasonCode: CoachIntelligenceAvailabilityReasonCode;
    disabled: boolean;
  }): CoachIntelligenceSectionAvailability {
    if (input.disabled) {
      return Object.freeze({
        status: 'disabled',
        fallbackUsed: false,
        retryable: false,
        reasonCode: 'FEATURE_DISABLED',
      });
    }

    if (input.data === null) {
      const status: CoachIntelligenceAvailabilityStatus =
        input.fallbackUsed ? 'degraded' : 'unavailable';

      return Object.freeze({
        status,
        fallbackUsed: input.fallbackUsed,
        retryable: input.retryable,
        reasonCode: input.reasonCode,
      });
    }

    if (input.freshness.status === 'stale') {
      return Object.freeze({
        status: 'stale',
        fallbackUsed: input.fallbackUsed,
        retryable: input.retryable,
        reasonCode:
          input.reasonCode === 'READY' ? 'STALE_CONTEXT' : input.reasonCode,
      });
    }

    if (input.fallbackUsed) {
      return Object.freeze({
        status: 'degraded',
        fallbackUsed: true,
        retryable: input.retryable,
        reasonCode:
          input.reasonCode === 'READY' ? 'FALLBACK_USED' : input.reasonCode,
      });
    }

    return Object.freeze({
      status: 'available',
      fallbackUsed: false,
      retryable: input.retryable,
      reasonCode: input.reasonCode,
    });
  }

  private buildAvailabilitySectionMap(
    input: {
      sections: SectionStateMap;
      status?: CoachIntelligenceAvailabilityStatus;
      reasonCode?: CoachIntelligenceAvailabilityReasonCode;
      fallbackUsed?: boolean;
      retryable?: boolean;
    },
  ): CoachIntelligenceAvailability['sections'] {
    const dataSectionMap = Object.fromEntries(
      DATA_SECTIONS.map((section) => [
        section,
        input.sections[section].availability,
      ]),
    ) as Record<
      Exclude<CoachIntelligenceSectionName, 'insight' | 'evidence' | 'explainability'>,
      CoachIntelligenceSectionAvailability
    >;

    const derivedStatus = input.status ?? 'available';
    const derivedReasonCode = input.reasonCode ?? 'READY';
    const derivedFallbackUsed = input.fallbackUsed ?? false;
    const derivedRetryable = input.retryable ?? false;

    return Object.freeze(
      Object.fromEntries([
        ...Object.entries(dataSectionMap),
        ...DERIVED_SECTIONS.map((section) => [
          section,
          Object.freeze({
            status: derivedStatus,
            fallbackUsed: derivedFallbackUsed,
            retryable: derivedRetryable,
            reasonCode: derivedReasonCode,
          }),
        ]),
      ]) as CoachIntelligenceAvailability['sections'],
    );
  }

  private buildFreshnessSectionMap(input: {
    generatedAt: string;
    sections: SectionStateMap;
    status: CoachIntelligenceFreshnessStatus;
    sourceTimestamp?: string;
  }): CoachIntelligenceFreshness['sections'] {
    const dataSectionMap = Object.fromEntries(
      DATA_SECTIONS.map((section) => [
        section,
        Object.freeze({
          ...input.sections[section].freshness,
        }),
      ]),
    ) as Record<
      Exclude<CoachIntelligenceSectionName, 'insight' | 'evidence' | 'explainability'>,
      CoachIntelligenceSectionFreshness
    >;

    return Object.freeze(
      Object.fromEntries([
        ...Object.entries(dataSectionMap),
        ...DERIVED_SECTIONS.map((section) => [
          section,
          Object.freeze({
            status: input.status,
            generatedAt: input.generatedAt,
            ...(input.sourceTimestamp
              ? { sourceTimestamp: input.sourceTimestamp }
              : {}),
          }),
        ]),
      ]) as CoachIntelligenceFreshness['sections'],
    );
  }

  private resolveAggregateReasonCode(
    sections: CoachIntelligenceAvailability['sections'],
  ): CoachIntelligenceAvailabilityReasonCode {
    const statuses = Object.values(sections);

    if (statuses.some((status) => status.reasonCode === 'FEATURE_DISABLED')) {
      return 'FEATURE_DISABLED';
    }

    if (statuses.some((status) => status.reasonCode === 'SOURCE_TIMEOUT')) {
      return 'SOURCE_TIMEOUT';
    }

    if (statuses.some((status) => status.reasonCode === 'SOURCE_UNAVAILABLE')) {
      return 'SOURCE_UNAVAILABLE';
    }

    if (statuses.some((status) => status.reasonCode === 'PARTIAL_FAILURE')) {
      return 'PARTIAL_FAILURE';
    }

    if (statuses.some((status) => status.reasonCode === 'MISSING_CONTEXT')) {
      return 'MISSING_CONTEXT';
    }

    if (statuses.some((status) => status.reasonCode === 'VALIDATION_FAILED')) {
      return 'VALIDATION_FAILED';
    }

    if (statuses.some((status) => status.reasonCode === 'INSUFFICIENT_SIGNALS')) {
      return 'INSUFFICIENT_SIGNALS';
    }

    if (statuses.some((status) => status.reasonCode === 'NO_SAFE_FALLBACK')) {
      return 'NO_SAFE_FALLBACK';
    }

    if (statuses.some((status) => status.reasonCode === 'POLICY_BLOCKED')) {
      return 'POLICY_BLOCKED';
    }

    if (
      statuses.some((status) => status.reasonCode === 'RETRYABLE_SOURCE_ERROR')
    ) {
      return 'RETRYABLE_SOURCE_ERROR';
    }

    if (statuses.some((status) => status.reasonCode === 'FALLBACK_USED')) {
      return 'FALLBACK_USED';
    }

    if (statuses.some((status) => status.reasonCode === 'STALE_CONTEXT')) {
      return 'STALE_CONTEXT';
    }

    return 'READY';
  }

  private resolveReasonCode(
    freshness: CoachIntelligenceSectionFreshness,
    data: unknown | null,
  ): CoachIntelligenceAvailabilityReasonCode {
    if (data === null) {
      return 'MISSING_CONTEXT';
    }

    if (freshness.status === 'stale') {
      return 'STALE_CONTEXT';
    }

    return 'READY';
  }

  private buildWarning(input: {
    code: CoachIntelligenceWarningCode;
    severity: CoachIntelligenceWarningSeverity;
    sectionName: CoachIntelligenceSectionName;
    title: string;
    detail?: string;
    }): CoachIntelligenceWarning {
    return {
      code: input.code,
      severity: input.severity,
      affectedSections: [input.sectionName],
      retryable:
        input.code === 'RETRY_RECOMMENDED' ||
        input.code === 'FALLBACK_USED' ||
        input.code === 'PARTIAL_RESPONSE',
      title: input.title,
      ...(input.detail ? { detail: input.detail } : {}),
      metadata: Object.freeze({
        sectionName: input.sectionName,
      }),
    };
  }

  private sectionTitle(sectionName: CoachIntelligenceSectionName): string {
    switch (sectionName) {
      case 'insight':
        return 'Insight';
      case 'evidence':
        return 'Evidence';
      case 'explainability':
        return 'Explainability';
      case 'training':
        return 'Training';
      case 'nutrition':
        return 'Nutrition';
      case 'recovery':
        return 'Recovery';
      case 'goals':
        return 'Goals';
      case 'habits':
        return 'Habits';
      case 'progress':
        return 'Progress';
      case 'personalization':
        return 'Personalization';
      case 'notifications':
        return 'Notifications';
      default:
        return sectionName;
    }
  }

  private normalizeTimestamp(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : undefined;
  }

  private resolveLatestTimestamp(values: readonly string[]): string | undefined {
    if (values.length === 0) {
      return undefined;
    }

    const sorted = [...values].sort(
      (left, right) => Date.parse(right) - Date.parse(left),
    );

    return this.normalizeTimestamp(sorted[0]);
  }
}
