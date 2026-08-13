import { Inject, Injectable, Optional } from '@nestjs/common';

import type {
  NutritionHistoryDayReadModel,
  NutritionHistoryPage,
  NutritionHistoryDaySummary,
  NutritionTrendReadModel,
} from '@elev9/types';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../users/domain/repositories/user-profile.repository';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../domain/repositories/nutrition-plan.repository';
import { NutritionHistoryProjectionService } from './nutrition-history-projection.service';
import { NutritionObservabilityService } from './nutrition-observability.service';

export const NUTRITION_HISTORY_SAFE_ERROR_CODES = {
  INVALID_SESSION: 'NUTRITION_UNAUTHORIZED',
  INVALID_DATE_RANGE: 'NUTRITION_HISTORY_INVALID_DATE_RANGE',
  INVALID_CURSOR: 'NUTRITION_HISTORY_INVALID_CURSOR',
  RANGE_TOO_LARGE: 'NUTRITION_HISTORY_RANGE_TOO_LARGE',
  USER_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_CONFIGURED',
  PROCESSING_FAILED: 'NUTRITION_PROCESSING_FAILED',
} as const;

export class NutritionHistoryQueryError extends Error {
  constructor(
    readonly code: keyof typeof NUTRITION_HISTORY_SAFE_ERROR_CODES,
    message: string,
  ) {
    super(message);
    this.name = 'NutritionHistoryQueryError';
  }
}

@Injectable()
export class NutritionHistoryQueryService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    private readonly projection: NutritionHistoryProjectionService,
    @Optional()
    private readonly observability?: NutritionObservabilityService,
  ) {}

  async getPage(input: {
    authUserId: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }): Promise<NutritionHistoryPage> {
    const startedAt = Date.now();
    const period = resolvePeriod(input.from, input.to);
    const limit = resolveLimit(input.limit);
    const cursorDate = input.cursor ? decodeCursor(input.cursor) : null;
    if (input.cursor && !cursorDate) {
      throw new NutritionHistoryQueryError(
        'INVALID_CURSOR',
        'Invalid history cursor.',
      );
    }
    const profile = await this.loadProfile(input.authUserId);
    const logs =
      await this.nutritionLogRepository.findByUserProfileIdAndDateRange(
        profile.id,
        period.from,
        period.to,
      );
    const days = await this.projectDates(logs);
    const filtered = days
      .filter((day) => !cursorDate || day.date < cursorDate)
      .sort((left, right) => right.date.localeCompare(left.date));
    const pageItems = filtered.slice(0, limit);
    const nextDate = filtered[limit]?.date ?? null;

    const output: NutritionHistoryPage = {
      items: pageItems.map(toSummary),
      pageInfo: {
        nextCursor: nextDate ? encodeCursor(nextDate) : null,
        hasNextPage: Boolean(nextDate),
      },
      period: { ...period, timezone: 'UTC' },
      contractVersion: 'nutrition-history-v1',
    };
    this.observability?.recordHistoryRead({
      operation: 'get_nutrition_history',
      outcome: 'success',
      durationMs: Date.now() - startedAt,
      resultCount: output.items.length,
      dataQuality: output.items.some((item) => item.dataQuality === 'partial')
        ? 'partial'
        : 'complete',
    });
    return output;
  }

  async getDay(input: {
    authUserId: string;
    date: string;
  }): Promise<NutritionHistoryDayReadModel> {
    const startedAt = Date.now();
    assertDate(input.date);
    const profile = await this.loadProfile(input.authUserId);
    const logs = await this.nutritionLogRepository.findByUserProfileIdAndDate(
      profile.id,
      input.date,
    );
    const days = await this.projectDates(logs);
    const output =
      days[0] ??
      this.projection.project({ date: input.date, logs: [], plans: [] });
    this.observability?.recordHistoryRead({
      operation: 'get_nutrition_history_day',
      outcome: 'success',
      durationMs: Date.now() - startedAt,
      resultCount: output.availability === 'no_data' ? 0 : 1,
      dataQuality: output.dataQuality,
      source: output.source,
    });
    return output;
  }

  async getTrends(input: {
    authUserId: string;
    from?: string;
    to?: string;
  }): Promise<NutritionTrendReadModel> {
    const startedAt = Date.now();
    const period = resolvePeriod(input.from, input.to);
    const profile = await this.loadProfile(input.authUserId);
    const logs =
      await this.nutritionLogRepository.findByUserProfileIdAndDateRange(
        profile.id,
        period.from,
        period.to,
      );
    const days = await this.projectDates(logs);
    const output = this.projection.buildTrends({ ...period, days });
    this.observability?.recordHistoryRead({
      operation: 'get_nutrition_trends',
      outcome: 'success',
      durationMs: Date.now() - startedAt,
      resultCount: days.length,
      dataQuality: output.dataQuality,
    });
    return output;
  }

  private async loadProfile(authUserId: string) {
    const normalized = typeof authUserId === 'string' ? authUserId.trim() : '';
    if (!normalized) {
      throw new NutritionHistoryQueryError(
        'INVALID_SESSION',
        'Invalid session.',
      );
    }
    const profile =
      await this.userProfileRepository.findByAuthUserId(normalized);
    if (!profile) {
      throw new NutritionHistoryQueryError(
        'USER_PROFILE_NOT_FOUND',
        'User profile not found.',
      );
    }
    return profile;
  }

  private async projectDates(
    logs: Awaited<
      ReturnType<NutritionLogRepository['findByUserProfileIdAndDateRange']>
    >,
  ) {
    const grouped = new Map<string, typeof logs>();
    for (const log of logs)
      grouped.set(log.date, [...(grouped.get(log.date) ?? []), log]);
    const planIds = [...new Set(logs.map((log) => log.nutritionPlanId))];
    const plans = this.nutritionPlanRepository.findByIds
      ? await this.nutritionPlanRepository.findByIds(planIds)
      : (
          await Promise.all(
            planIds.map((id) => this.nutritionPlanRepository.findById(id)),
          )
        ).filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));

    return [...grouped.entries()].map(([date, dateLogs]) =>
      this.projection.project({ date, logs: dateLogs, plans }),
    );
  }
}

function toSummary(
  day: NutritionHistoryDayReadModel,
): NutritionHistoryDaySummary {
  return {
    date: day.date,
    availability: day.availability,
    dataQuality: day.dataQuality,
    adherenceStatus: day.adherenceStatus,
    calories: day.calories
      ? { state: day.calories.state, percentage: day.calories.percentage }
      : null,
    meals: day.mealProgress
      ? {
          completed: day.mealProgress.completed,
          planned: day.mealProgress.planned,
        }
      : null,
  };
}

function resolvePeriod(
  from?: string,
  to?: string,
): { from: string; to: string } {
  const resolvedTo = to ?? utcDateString(new Date());
  const resolvedFrom = from ?? shiftUtcDate(resolvedTo, -29);
  assertDate(resolvedFrom);
  assertDate(resolvedTo);
  if (resolvedFrom > resolvedTo) {
    throw new NutritionHistoryQueryError(
      'INVALID_DATE_RANGE',
      'Invalid history date range.',
    );
  }
  if (countDays(resolvedFrom, resolvedTo) > 90) {
    throw new NutritionHistoryQueryError(
      'RANGE_TOO_LARGE',
      'History range is limited to 90 days.',
    );
  }
  return { from: resolvedFrom, to: resolvedTo };
}

function resolveLimit(limit?: number): number {
  if (limit === undefined) return 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new NutritionHistoryQueryError(
      'INVALID_DATE_RANGE',
      'History limit is invalid.',
    );
  }
  return limit;
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new NutritionHistoryQueryError(
      'INVALID_DATE_RANGE',
      'History date is invalid.',
    );
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new NutritionHistoryQueryError(
      'INVALID_DATE_RANGE',
      'History date is invalid.',
    );
  }
}

function encodeCursor(date: string): string {
  return Buffer.from(JSON.stringify({ date }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): string | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null || !('date' in parsed))
      return null;
    const date = (parsed as { date?: unknown }).date;
    if (typeof date !== 'string') return null;
    assertDate(date);
    return date;
  } catch {
    return null;
  }
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return utcDateString(shifted);
}

function countDays(from: string, to: string): number {
  return (
    Math.floor(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        86_400_000,
    ) + 1
  );
}
