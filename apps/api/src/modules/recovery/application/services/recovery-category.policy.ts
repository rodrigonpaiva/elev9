import type { RecommendedIntensity } from '../../domain/entities/recovery-snapshot.entity';
import type { RecoveryReadCategory } from '../read-models/recovery-read-model.types';

/**
 * Public vocabulary mapped from the existing deterministic intensity policy.
 * The score calculator and its thresholds are intentionally unchanged.
 */
export class RecoveryCategoryPolicy {
  mapRecommendedIntensity(
    intensity: RecommendedIntensity,
  ): RecoveryReadCategory {
    switch (intensity) {
      case 'recovery':
        return 'low';
      case 'light':
        return 'moderate';
      case 'moderate':
        return 'good';
      case 'hard':
        return 'high';
    }
  }
}
