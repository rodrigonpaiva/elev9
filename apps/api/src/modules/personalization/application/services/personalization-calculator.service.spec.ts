import { PersonalizationCalculatorService } from './personalization-calculator.service';

describe('PersonalizationCalculatorService', () => {
  let service: PersonalizationCalculatorService;

  beforeEach(() => {
    service = new PersonalizationCalculatorService();
  });

  describe('coaching style', () => {
    it('returns motivational', () => {
      const result = service.calculate({
        engagementScore: 90,
        notificationCompletionRate: 90,
        notificationDismissalRate: 10,
        recoveryAlertEngagement: 20,
      });

      expect(result.preferredCoachingStyle).toBe('motivational');
    });

    it('returns direct', () => {
      const result = service.calculate({
        engagementScore: 30,
        notificationCompletionRate: 20,
        notificationDismissalRate: 85,
        recoveryAlertEngagement: 20,
      });

      expect(result.preferredCoachingStyle).toBe('direct');
    });

    it('returns educational', () => {
      const result = service.calculate({
        engagementScore: 40,
        notificationCompletionRate: 40,
        notificationDismissalRate: 40,
        recoveryAlertEngagement: 80,
      });

      expect(result.preferredCoachingStyle).toBe('educational');
    });

    it('returns balanced', () => {
      const result = service.calculate({
        engagementScore: 50,
        notificationCompletionRate: 50,
        notificationDismissalRate: 30,
        recoveryAlertEngagement: 30,
      });

      expect(result.preferredCoachingStyle).toBe('balanced');
    });
  });

  describe('engagement profile', () => {
    it.each([
      [{ engagementScore: 10 }, 'low'],
      [{ engagementScore: 50 }, 'medium'],
      [{ engagementScore: 90 }, 'high'],
    ] as const)('maps %o to %s', (input, expected) => {
      expect(service.calculate(input).engagementProfile).toBe(expected);
    });
  });

  describe('responsiveness levels', () => {
    it('returns low', () => {
      const result = service.calculate({
        engagementScore: 10,
        notificationCompletionRate: 10,
        notificationDismissalRate: 90,
        consistencyScore: 10,
        habitTrend: 'declining',
        recoveryTrend: 'declining',
        recoveryAlertEngagement: 10,
        goalTrend: 'declining',
      });

      expect(result.notificationResponsiveness).toBe('low');
      expect(result.goalResponsiveness).toBe('low');
      expect(result.recoveryResponsiveness).toBe('low');
      expect(result.habitResponsiveness).toBe('low');
    });

    it('returns medium', () => {
      const result = service.calculate({
        engagementScore: 50,
        notificationCompletionRate: 50,
        notificationDismissalRate: 50,
        consistencyScore: 50,
        habitTrend: 'stable',
        recoveryTrend: 'stable',
        recoveryAlertEngagement: 50,
        goalTrend: 'stable',
      });

      expect(result.notificationResponsiveness).toBe('medium');
      expect(result.goalResponsiveness).toBe('medium');
      expect(result.recoveryResponsiveness).toBe('medium');
      expect(result.habitResponsiveness).toBe('medium');
    });

    it('returns high', () => {
      const result = service.calculate({
        engagementScore: 90,
        notificationCompletionRate: 90,
        notificationDismissalRate: 10,
        consistencyScore: 90,
        habitTrend: 'improving',
        recoveryTrend: 'improving',
        recoveryAlertEngagement: 90,
        goalTrend: 'improving',
        goalMilestoneReached: true,
        goalAchievementReached: true,
      });

      expect(result.notificationResponsiveness).toBe('high');
      expect(result.goalResponsiveness).toBe('high');
      expect(result.recoveryResponsiveness).toBe('high');
      expect(result.habitResponsiveness).toBe('high');
    });
  });

  describe('risk of disengagement', () => {
    it('returns low', () => {
      expect(
        service.calculate({
          engagementScore: 80,
          notificationDismissalRate: 10,
          habitRiskLevel: 'low',
        }).riskOfDisengagement,
      ).toBe('low');
    });

    it('returns medium', () => {
      expect(
        service.calculate({
          engagementScore: 50,
          notificationDismissalRate: 20,
          habitRiskLevel: 'medium',
        }).riskOfDisengagement,
      ).toBe('medium');
    });

    it('returns high', () => {
      expect(
        service.calculate({
          engagementScore: 20,
          notificationDismissalRate: 80,
          habitRiskLevel: 'high',
        }).riskOfDisengagement,
      ).toBe('high');
    });
  });

  describe('behavioral patterns', () => {
    it('detects responds_to_streaks', () => {
      expect(
        service.calculate({
          consistencyScore: 80,
          habitTrend: 'improving',
        }).behavioralPatterns,
      ).toContain('responds_to_streaks');
    });

    it('detects responds_to_goals', () => {
      expect(
        service.calculate({
          goalMilestoneReached: true,
        }).behavioralPatterns,
      ).toContain('responds_to_goals');
    });

    it('detects responds_to_recovery_guidance', () => {
      expect(
        service.calculate({
          recoveryAlertEngagement: 80,
        }).behavioralPatterns,
      ).toContain('responds_to_recovery_guidance');
    });

    it('detects responds_to_notifications', () => {
      expect(
        service.calculate({
          engagementScore: 80,
          notificationCompletionRate: 60,
        }).behavioralPatterns,
      ).toContain('responds_to_notifications');
    });

    it('detects ignores_low_priority_reminders', () => {
      expect(
        service.calculate({
          notificationDismissalRate: 60,
        }).behavioralPatterns,
      ).toContain('ignores_low_priority_reminders');
    });

    it('detects morning_engagement', () => {
      expect(
        service.calculate({
          activityHourDistribution: {
            morning: 80,
            afternoon: 20,
            evening: 10,
          },
        }).behavioralPatterns,
      ).toContain('morning_engagement');
    });

    it('detects evening_engagement', () => {
      expect(
        service.calculate({
          activityHourDistribution: {
            morning: 10,
            afternoon: 20,
            evening: 80,
          },
        }).behavioralPatterns,
      ).toContain('evening_engagement');
    });

    it('detects high_dismissal_behavior', () => {
      expect(
        service.calculate({
          notificationDismissalRate: 70,
        }).behavioralPatterns,
      ).toContain('high_dismissal_behavior');
    });

    it('detects consistent_check_in_behavior', () => {
      expect(
        service.calculate({
          consistencyScore: 80,
        }).behavioralPatterns,
      ).toContain('consistent_check_in_behavior');
    });
  });

  describe('trend', () => {
    it('returns improving', () => {
      expect(
        service.calculate({
          engagementScore: 90,
          consistencyScore: 90,
          notificationCompletionRate: 90,
          recoveryAlertEngagement: 90,
          previousSnapshotScore: 80,
        }).trend,
      ).toBe('improving');
    });

    it('returns stable', () => {
      expect(
        service.calculate({
          engagementScore: 50,
          consistencyScore: 50,
          notificationCompletionRate: 50,
          recoveryAlertEngagement: 50,
          previousSnapshotScore: 50,
        }).trend,
      ).toBe('stable');
    });

    it('returns declining', () => {
      expect(
        service.calculate({
          engagementScore: 40,
          consistencyScore: 40,
          notificationCompletionRate: 40,
          recoveryAlertEngagement: 40,
          previousSnapshotScore: 50,
        }).trend,
      ).toBe('declining');
    });
  });

  describe('fallbacks', () => {
    it('returns neutral behavior with sparse input', () => {
      const result = service.calculate({});

      expect(result.preferredCoachingStyle).toBe('balanced');
      expect(result.engagementProfile).toBe('medium');
      expect(result.notificationResponsiveness).toBe('medium');
      expect(result.goalResponsiveness).toBe('medium');
      expect(result.recoveryResponsiveness).toBe('medium');
      expect(result.habitResponsiveness).toBe('medium');
      expect(result.riskOfDisengagement).toBe('medium');
      expect(result.trend).toBe('stable');
      expect(result.behavioralPatterns).toEqual([]);
      expect(result.compositeScore).toBe(50);
    });
  });

  describe('formula version', () => {
    it('uses personalization-engine-v1', () => {
      expect(service.calculate({}).formulaVersion).toBe(
        'personalization-engine-v1',
      );
    });
  });
});
