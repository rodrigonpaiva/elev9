import {
  formatCoachingStyle,
  formatEngagementProfile,
  formatGenericEnumLabel,
  formatGoalStatus,
  formatGoalType,
  formatNotificationStatus,
  formatNotificationType,
  formatRiskLevel,
  formatTrainingRecommendation,
  formatTrend,
} from './enum-labels';

describe('enum-label formatters', () => {
  it('formats goal types', () => {
    expect(formatGoalType('gain_muscle')).toBe('Gain muscle');
    expect(formatGoalType('improve_recovery')).toBe('Improve recovery');
  });

  it('formats goal status', () => {
    expect(formatGoalStatus('in_progress')).toBe('In progress');
  });

  it('formats trend and risk labels', () => {
    expect(formatTrend('declining')).toBe('Declining');
    expect(formatTrend('needs_recovery')).toBe('Needs recovery');
    expect(formatRiskLevel('urgent')).toBe('Urgent');
  });

  it('formats training recommendations', () => {
    expect(formatTrainingRecommendation('normal')).toBe('Normal training');
    expect(formatTrainingRecommendation('reduce_intensity')).toBe(
      'Reduce intensity',
    );
  });

  it('formats notification labels', () => {
    expect(formatNotificationType('goal_achievement')).toBe('Goal achieved');
    expect(formatNotificationStatus('dismissed')).toBe('Dismissed');
  });

  it('formats coaching and engagement labels', () => {
    expect(formatCoachingStyle('motivational')).toBe('Motivational');
    expect(formatEngagementProfile('low_engagement')).toBe('Low engagement');
  });

  it('falls back to a readable generic label', () => {
    expect(formatGenericEnumLabel('future_new_value')).toBe('Future New Value');
  });
});
