import type {
  RecoveryInsightReadModel,
  RecoveryReadAvailability,
  RecoveryReadCategory,
  RecoveryReadFreshness,
} from '../read-models/recovery-read-model.types';

export class RecoveryInsightPolicy {
  build(input: {
    availability: RecoveryReadAvailability;
    category?: RecoveryReadCategory;
    freshness: RecoveryReadFreshness;
  }): RecoveryInsightReadModel {
    if (input.availability === 'processing_failed') {
      return {
        tone: 'neutral',
        titleKey: 'recovery.insight.processing_failed.title',
        bodyKey: 'recovery.insight.processing_failed.body',
        action: 'try_again_later',
      };
    }

    if (input.availability !== 'available' || !input.category) {
      return {
        tone: 'neutral',
        titleKey: 'recovery.insight.no_data.title',
        bodyKey: 'recovery.insight.no_data.body',
        action: 'complete_check_in',
      };
    }

    if (input.freshness !== 'current') {
      return {
        tone: 'neutral',
        titleKey: 'recovery.insight.refresh_needed.title',
        bodyKey: 'recovery.insight.refresh_needed.body',
        action: 'try_again_later',
      };
    }

    switch (input.category) {
      case 'low':
        return {
          tone: 'caution',
          titleKey: 'recovery.insight.low.title',
          bodyKey: 'recovery.insight.low.body',
          action: 'prioritize_recovery',
        };
      case 'moderate':
        return {
          tone: 'supportive',
          titleKey: 'recovery.insight.moderate.title',
          bodyKey: 'recovery.insight.moderate.body',
          action: 'reduce_intensity',
        };
      case 'good':
        return {
          tone: 'positive',
          titleKey: 'recovery.insight.good.title',
          bodyKey: 'recovery.insight.good.body',
          action: 'train_as_planned',
        };
      case 'high':
        return {
          tone: 'positive',
          titleKey: 'recovery.insight.high.title',
          bodyKey: 'recovery.insight.high.body',
          action: 'train_as_planned',
        };
    }
  }
}
