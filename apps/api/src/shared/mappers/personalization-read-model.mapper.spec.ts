import { PersonalizationReadModelMapper } from './personalization-read-model.mapper';

describe('PersonalizationReadModelMapper', () => {
  const snapshot = {
    id: 'snapshot_123',
    userProfileId: 'profile_123',
    date: '2026-05-18',
    preferredCoachingStyle: 'direct',
    engagementProfile: 'high',
    notificationResponsiveness: 'low',
    goalResponsiveness: 'medium',
    recoveryResponsiveness: 'high',
    habitResponsiveness: 'medium',
    riskOfDisengagement: 'high',
    trend: 'declining',
    sourceContext: {
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-05-18T10:00:00.000Z',
      rawSignals: 'hidden',
    },
    formulaVersion: 'personalization-engine-v1',
    generatedAt: '2026-05-18T10:00:00.000Z',
  } as never;

  const profile = {
    id: 'profile_123',
    userProfileId: 'profile_123',
    preferredCoachingStyle: 'motivational',
    notificationResponsiveness: 'low',
    goalResponsiveness: 'medium',
    recoveryResponsiveness: 'high',
    habitResponsiveness: 'medium',
    engagementProfile: 'high',
    riskOfDisengagement: 'high',
    formulaVersion: 'personalization-engine-v1',
    createdAt: '2026-05-17T10:00:00.000Z',
    updatedAt: '2026-05-18T10:00:00.000Z',
  } as never;

  const patterns = [
    {
      id: 'pattern_1',
      userProfileId: 'profile_123',
      type: 'responds_to_streaks',
      confidence: 'high',
      evidenceCount: 8,
      lastObservedAt: '2026-05-18T09:00:00.000Z',
      formulaVersion: 'personalization-engine-v1',
    },
    {
      id: 'pattern_2',
      userProfileId: 'profile_123',
      type: 'responds_to_goals',
      confidence: 'medium',
      evidenceCount: 4,
      lastObservedAt: '2026-05-17T09:00:00.000Z',
      formulaVersion: 'personalization-engine-v1',
    },
  ] as never;

  it('builds dashboard-safe payloads without sourceContext', () => {
    const result = PersonalizationReadModelMapper.toDashboardPayload({
      snapshot,
      profile,
      patterns,
    });

    expect(result).toEqual({
      snapshot: {
        id: 'snapshot_123',
        userProfileId: 'profile_123',
        date: '2026-05-18',
        preferredCoachingStyle: 'direct',
        engagementProfile: 'high',
        notificationResponsiveness: 'low',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'high',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'high',
        trend: 'declining',
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-05-18T10:00:00.000Z',
      },
      profile,
      patterns,
    });
    expect(JSON.stringify(result)).not.toContain('sourceContext');
  });

  it('builds prompt-safe payloads with reduced behavioral patterns', () => {
    const result = PersonalizationReadModelMapper.toPromptPayload({
      snapshot,
      profile,
      patterns,
    });

    expect(result).toEqual({
      preferredCoachingStyle: 'motivational',
      engagementProfile: 'high',
      notificationResponsiveness: 'low',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'high',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'high',
      topBehavioralPatterns: ['responds_to_streaks', 'responds_to_goals'],
      trend: 'declining',
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-05-18T10:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('sourceContext');
  });

  it('builds memory-safe payloads with only the reduced fields', () => {
    const result = PersonalizationReadModelMapper.toMemoryPayload({
      snapshot,
      profile,
      patterns,
    });

    expect(result).toEqual({
      preferredCoachingStyle: 'motivational',
      engagementProfile: 'high',
      riskOfDisengagement: 'high',
      topBehavioralPatterns: ['responds_to_streaks', 'responds_to_goals'],
    });
  });

  it('builds notification-safe payloads', () => {
    const result = PersonalizationReadModelMapper.toNotificationPayload({
      snapshot,
      profile,
      patterns,
    });

    expect(result).toEqual({
      preferredCoachingStyle: 'motivational',
      notificationResponsiveness: 'low',
      riskOfDisengagement: 'high',
      topBehavioralPatterns: ['responds_to_streaks', 'responds_to_goals'],
    });
  });

  it('builds coach decision signals from the reduced payload', () => {
    const result = PersonalizationReadModelMapper.toCoachDecisionSignals({
      snapshot,
      profile,
      patterns,
    });

    expect(result).toEqual({
      personalizationHighDisengagementRisk: true,
      personalizationRespondsToStreaks: true,
      personalizationRespondsToGoals: true,
      personalizationPrefersDirectCoaching: false,
      personalizationPrefersMotivationalCoaching: true,
      personalizationLowNotificationResponsiveness: true,
    });
  });
});
