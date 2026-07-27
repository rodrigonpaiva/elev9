import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { BuildCoachDecisionUseCase } from '../build-coach-decision/build-coach-decision.use-case';
import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_CURRENT_COACH_DECISION_ERROR_CODES,
  GetCurrentCoachDecisionError,
} from './get-current-coach-decision.errors';
import { GetCurrentCoachDecisionInput } from './get-current-coach-decision.input';
import { GetCurrentCoachDecisionOutput } from './get-current-coach-decision.output';
import { GetCurrentRecoveryUseCase } from '../../../../recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case';

@Injectable()
export class GetCurrentCoachDecisionUseCase {
  private readonly logger = new Logger(GetCurrentCoachDecisionUseCase.name);

  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly buildCoachDecisionUseCase: BuildCoachDecisionUseCase,
    @Optional()
    private readonly getCurrentRecoveryUseCase?: GetCurrentRecoveryUseCase,
  ) {}

  async execute(
    input: GetCurrentCoachDecisionInput,
  ): Promise<GetCurrentCoachDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCurrentCoachDecisionError(
        GET_CURRENT_COACH_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCurrentCoachDecisionError(
          GET_CURRENT_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestDecision =
        await this.coachDecisionRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestDecision) {
        const recoverySnapshot = this.getCurrentRecoveryUseCase
          ? (await this.getCurrentRecoveryUseCase.execute({ authUserId }))
              .recoverySnapshot
          : null;

        if (
          !recoverySnapshot ||
          !isSourceNewer(
            recoverySnapshot.sourceContext?.generatedAt,
            latestDecision.sourceContext?.generatedAt,
          )
        ) {
          return { coachDecision: latestDecision };
        }

        this.logger.log({
          event: 'coach_stale_decision_rejected',
          userProfileId: userProfile.id,
          localDate: latestDecision.date,
        });
      }

      return await this.buildCoachDecisionUseCase.execute({ authUserId });
    } catch (error) {
      if (error instanceof GetCurrentCoachDecisionError) {
        throw error;
      }

      throw new GetCurrentCoachDecisionError(
        GET_CURRENT_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function isSourceNewer(
  sourceTimestamp: string | undefined,
  targetTimestamp: string | undefined,
): boolean {
  if (!sourceTimestamp || !targetTimestamp) {
    return Boolean(sourceTimestamp && !targetTimestamp);
  }

  return (
    new Date(sourceTimestamp).getTime() > new Date(targetTimestamp).getTime()
  );
}
