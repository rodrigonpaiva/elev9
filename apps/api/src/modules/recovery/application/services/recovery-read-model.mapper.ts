import type { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import type {
  RecoveryCurrentReadModel,
  RecoveryHistoryItemReadModel,
  RecoveryReadAvailability,
  RecoveryReadFreshness,
} from '../read-models/recovery-read-model.types';
import { RecoveryCategoryPolicy } from './recovery-category.policy';
import { RecoveryFactorBreakdownPolicy } from './recovery-factor-breakdown.policy';
import { RecoveryInsightPolicy } from './recovery-insight.policy';

export class RecoveryReadModelMapper {
  constructor(
    private readonly categoryPolicy = new RecoveryCategoryPolicy(),
    private readonly factorBreakdownPolicy = new RecoveryFactorBreakdownPolicy(),
    private readonly insightPolicy = new RecoveryInsightPolicy(),
  ) {}

  mapCurrent(snapshot: RecoverySnapshot): RecoveryCurrentReadModel {
    const freshness = this.getFreshness(snapshot);
    const availability = this.getAvailability(snapshot);

    if (availability !== 'available') {
      return { availability, recovery: null };
    }

    const category = this.categoryPolicy.mapRecommendedIntensity(
      snapshot.recommendedIntensity,
    );

    return {
      availability,
      recovery: {
        score: snapshot.readinessScore,
        fatigueScore: snapshot.fatigueScore,
        category,
        freshness,
        lastUpdatedAt: this.getLastUpdatedAt(snapshot),
        trend: snapshot.recoveryTrend,
        breakdown: this.factorBreakdownPolicy.build(snapshot.sourceContext),
        insight: this.insightPolicy.build({
          availability,
          category,
          freshness,
        }),
      },
    };
  }

  mapHistoryItem(snapshot: RecoverySnapshot): RecoveryHistoryItemReadModel {
    const freshness = this.getFreshness(snapshot);
    const availability = this.getAvailability(snapshot);

    return {
      localDate: snapshot.date,
      score: snapshot.readinessScore,
      category: this.categoryPolicy.mapRecommendedIntensity(
        snapshot.recommendedIntensity,
      ),
      availability,
      freshness,
    };
  }

  getAvailability(snapshot: RecoverySnapshot): RecoveryReadAvailability {
    if (!snapshot) return 'not_available';
    if (snapshot.sourceContext?.recentCheckInsCount === 0) {
      return 'insufficient_data';
    }
    return 'available';
  }

  getFreshness(snapshot: RecoverySnapshot): RecoveryReadFreshness {
    const generatedAt = snapshot.sourceContext?.generatedAt;
    if (
      !snapshot.sourceContext ||
      Object.keys(snapshot.sourceContext).length === 0
    ) {
      return 'legacy';
    }
    if (!generatedAt) return 'unknown';
    if (!Number.isFinite(new Date(generatedAt).getTime())) return 'unknown';
    return 'current';
  }

  private getLastUpdatedAt(snapshot: RecoverySnapshot): string {
    const generatedAt = snapshot.sourceContext?.generatedAt;
    if (generatedAt && Number.isFinite(new Date(generatedAt).getTime())) {
      return new Date(generatedAt).toISOString();
    }
    return snapshot.createdAt.toISOString();
  }
}
