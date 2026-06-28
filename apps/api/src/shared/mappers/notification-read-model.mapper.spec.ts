import { NotificationDecision } from '../../modules/notifications/domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../modules/notifications/domain/value-objects/notification-influence.value-object';
import { NotificationReadModelMapper } from './notification-read-model.mapper';

describe('NotificationReadModelMapper', () => {
  function buildDecision(
    overrides: Partial<NotificationDecision> = {},
  ): NotificationDecision {
    return new NotificationDecision({
      id: overrides.id ?? 'notification_123',
      userProfileId: overrides.userProfileId ?? 'profile_123',
      date: overrides.date ?? '2026-04-30',
      type: overrides.type?.value ?? 'coach_nudge',
      priority: overrides.priority?.value ?? 'low',
      channel: overrides.channel?.value ?? 'in_app',
      status: overrides.status?.value ?? 'planned',
      title: overrides.title ?? 'Small action, big progress',
      message: overrides.message ?? 'Keep the next step simple and consistent.',
      actionLabel: overrides.actionLabel,
      actionTarget: overrides.actionTarget,
      influences: overrides.influences ?? [
        new NotificationInfluence({
          code: 'COACH_CONSISTENCY_NUDGE',
          label: 'Coach consistency nudge',
          impact: 'neutral',
          source: 'coach',
        }),
      ],
      sourceContext:
        overrides.sourceContext ??
        ({
          coachDecisionId: 'decision_123',
          coachDecisionPriority: 'consistency',
          coachDecisionHeadline: 'Focus on consistency',
          readinessScore: 64,
          fatigueScore: 38,
          fatigueLevel: 'high',
          adaptiveRecommendationType: 'maintain',
          goalProgressTrend: 'stable',
          goalMilestoneClose: false,
          goalAchievementReached: false,
          nutritionAdherence: 72,
          missedWorkouts: 0,
          noRecentActivity: false,
          recentEngagementEventsCount: 2,
          formulaVersion: 'notification-engine-v1',
          generatedAt: '2026-04-30T10:00:00.000Z',
        } as never),
      suppressed: overrides.suppressed ?? true,
      suppressionReasons: overrides.suppressionReasons ?? [
        'same_type_cooldown',
      ],
      fatigueLevel: overrides.fatigueLevel ?? 'high',
      formulaVersion: overrides.formulaVersion ?? 'notification-engine-v1',
      generatedBy: 'deterministic',
      createdAt: overrides.createdAt ?? new Date('2026-04-30T10:00:00.000Z'),
      updatedAt: overrides.updatedAt ?? new Date('2026-04-30T10:00:00.000Z'),
    });
  }

  const engagementSummary = {
    engagementScore: 84,
    fatigueLevel: 'high' as const,
    openedCount: 2,
    clickedCount: 1,
    dismissedCount: 2,
    completedCount: 1,
    recentEventsCount: 6,
  };

  it('maps the dashboard payload without sourceContext leakage', () => {
    const result = NotificationReadModelMapper.toDashboardPayload(
      buildDecision(),
      engagementSummary,
    );

    expect(result).toEqual({
      current: {
        type: 'coach_nudge',
        priority: 'low',
        status: 'planned',
        suppressed: true,
        fatigueLevel: 'high',
      },
      engagementSummary,
    });
    expect(JSON.stringify(result)).not.toContain('sourceContext');
  });

  it('maps the prompt payload without raw history or sourceContext', () => {
    const result = NotificationReadModelMapper.toPromptPayload(
      buildDecision(),
      engagementSummary,
    );

    expect(result).toEqual({
      current: {
        type: 'coach_nudge',
        priority: 'low',
        status: 'planned',
        suppressed: true,
        fatigueLevel: 'high',
      },
      engagementSummary: {
        engagementScore: 84,
        fatigueLevel: 'high',
        dismissedCount: 2,
        recentEventsCount: 6,
      },
    });
    expect(JSON.stringify(result)).not.toContain('sourceContext');
    expect(JSON.stringify(result)).not.toContain('history');
    expect(JSON.stringify(result)).not.toContain('engagement events');
  });

  it('maps the memory payload and keeps only the reduced reference fields', () => {
    const result = NotificationReadModelMapper.toMemoryPayload(
      buildDecision(),
      engagementSummary,
    );

    expect(result).toEqual({
      notificationType: 'coach_nudge',
      suppressed: true,
      fatigueLevel: 'high',
      engagementScore: 84,
    });
    expect(JSON.stringify(result)).not.toContain('sourceContext');
  });

  it('derives coach decision signals from the reduced notification payload', () => {
    const result = NotificationReadModelMapper.toCoachDecisionSignals(
      buildDecision(),
      engagementSummary,
    );

    expect(result).toEqual({
      notificationSuppressed: true,
      notificationFatigueHigh: true,
      notificationDismissedFrequently: true,
      notificationHighEngagement: true,
    });
  });
});
