import { Inject, Injectable } from '@nestjs/common';

import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  CoachDecisionCalculatorInput,
  CoachDecisionCalculatorService,
} from '../../services/coach-decision-calculator.service';
import {
  REPLAY_COACH_DECISION_ERROR_CODES,
  ReplayCoachDecisionError,
} from './replay-coach-decision.errors';
import { ReplayCoachDecisionInput } from './replay-coach-decision.input';
import {
  CoachDecisionRecalculatedResult,
  ReplayCoachDecisionOutput,
} from './replay-coach-decision.output';

@Injectable()
export class ReplayCoachDecisionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly coachDecisionCalculatorService: CoachDecisionCalculatorService,
  ) {}

  async execute(
    input: ReplayCoachDecisionInput,
  ): Promise<ReplayCoachDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const coachDecisionId =
      typeof input.coachDecisionId === 'string' ? input.coachDecisionId.trim() : '';

    if (!authUserId) {
      throw new ReplayCoachDecisionError(
        REPLAY_COACH_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!coachDecisionId) {
      throw new ReplayCoachDecisionError(
        REPLAY_COACH_DECISION_ERROR_CODES.INVALID_INPUT,
        'Invalid coach decision id.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplayCoachDecisionError(
          REPLAY_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const coachDecision = await this.coachDecisionRepository.findById(
        coachDecisionId,
      );

      if (!coachDecision || coachDecision.userProfileId !== userProfile.id) {
        throw new ReplayCoachDecisionError(
          REPLAY_COACH_DECISION_ERROR_CODES.COACH_DECISION_NOT_FOUND,
          'Coach decision not found.',
        );
      }

      const recalculated =
        this.coachDecisionCalculatorService.calculate(
          this.mapSourceContextToCalculatorInput(coachDecision.sourceContext),
        );

      const recalculatedResult: CoachDecisionRecalculatedResult = {
        priority: recalculated.priority,
        headline: recalculated.headline,
        summary: recalculated.summary,
        actionItems: [...recalculated.actionItems],
        influences: recalculated.influences.map((influence) =>
          this.serializeInfluence(influence),
        ),
        formulaVersion: recalculated.formulaVersion,
      };

      const differences = this.buildDifferences(coachDecision, recalculatedResult);

      return {
        persisted: coachDecision,
        recalculated: recalculatedResult,
        comparison: {
          matches: differences.length === 0,
          differences,
        },
        replayedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ReplayCoachDecisionError) {
        throw error;
      }

      throw new ReplayCoachDecisionError(
        REPLAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private mapSourceContextToCalculatorInput(
    sourceContext: Record<string, unknown>,
  ): CoachDecisionCalculatorInput {
    return {
      readinessScore: this.resolveNumber(sourceContext.readinessScore),
      fatigueScore: this.resolveNumber(sourceContext.fatigueScore),
      nutritionAdherence: this.resolveNumber(sourceContext.nutritionAdherence),
      adaptiveRecommendationType:
        this.resolveString(sourceContext.adaptiveRecommendationType),
      adaptiveIntensity: this.resolveString(sourceContext.adaptiveIntensity),
      currentStreak: this.resolveNonNegativeInteger(sourceContext.currentStreak),
      missedWorkouts: this.resolveNonNegativeInteger(sourceContext.missedWorkouts),
    };
  }

  private buildDifferences(
    persisted: {
      priority: string;
      headline: string;
      summary: string;
      actionItems: string[];
      influences: unknown[];
      formulaVersion: string;
    },
    recalculated: CoachDecisionRecalculatedResult,
  ): Array<{
    field: 'priority' | 'headline' | 'summary' | 'actionItems' | 'influences' | 'formulaVersion';
    persisted: unknown;
    recalculated: unknown;
  }> {
    const differences: Array<{
      field: 'priority' | 'headline' | 'summary' | 'actionItems' | 'influences' | 'formulaVersion';
      persisted: unknown;
      recalculated: unknown;
    }> = [];

    this.pushDifference(
      differences,
      'priority',
      persisted.priority,
      recalculated.priority,
    );
    this.pushDifference(
      differences,
      'headline',
      persisted.headline,
      recalculated.headline,
    );
    this.pushDifference(
      differences,
      'summary',
      persisted.summary,
      recalculated.summary,
    );
    this.pushDifference(
      differences,
      'actionItems',
      persisted.actionItems,
      recalculated.actionItems,
    );
    this.pushDifference(
      differences,
      'influences',
      persisted.influences,
      recalculated.influences,
    );
    this.pushDifference(
      differences,
      'formulaVersion',
      persisted.formulaVersion,
      recalculated.formulaVersion,
    );

    return differences;
  }

  private pushDifference(
    differences: Array<{
      field: 'priority' | 'headline' | 'summary' | 'actionItems' | 'influences' | 'formulaVersion';
      persisted: unknown;
      recalculated: unknown;
    }>,
    field: 'priority' | 'headline' | 'summary' | 'actionItems' | 'influences' | 'formulaVersion',
    persisted: unknown,
    recalculated: unknown,
  ): void {
    if (!this.areEqual(persisted, recalculated)) {
      differences.push({
        field,
        persisted,
        recalculated,
      });
    }
  }

  private areEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private resolveString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  private resolveNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return undefined;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private resolveNonNegativeInteger(value: unknown): number | undefined {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return undefined;
    }

    return Math.max(0, Math.round(value));
  }

  private serializeInfluence(
    influence: unknown,
  ): CoachDecisionRecalculatedResult['influences'][number] {
    if (
      influence &&
      typeof influence === 'object' &&
      'toJSON' in influence &&
      typeof (influence as { toJSON?: () => unknown }).toJSON === 'function'
    ) {
      return (influence as { toJSON: () => CoachDecisionRecalculatedResult['influences'][number] }).toJSON();
    }

    return influence as CoachDecisionRecalculatedResult['influences'][number];
  }
}
