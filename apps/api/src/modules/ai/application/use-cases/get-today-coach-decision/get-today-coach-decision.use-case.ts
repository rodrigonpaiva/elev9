import { Inject, Injectable } from '@nestjs/common';

import { BuildCoachDecisionUseCase } from '../build-coach-decision/build-coach-decision.use-case';
import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { CoachDecisionDateService } from '../../services/coach-decision-date.service';
import {
  GET_TODAY_COACH_DECISION_ERROR_CODES,
  GetTodayCoachDecisionError,
} from './get-today-coach-decision.errors';
import { GetTodayCoachDecisionInput } from './get-today-coach-decision.input';
import { GetTodayCoachDecisionOutput } from './get-today-coach-decision.output';

@Injectable()
export class GetTodayCoachDecisionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly buildCoachDecisionUseCase: BuildCoachDecisionUseCase,
    private readonly coachDecisionDateService: CoachDecisionDateService,
  ) {}

  async execute(
    input: GetTodayCoachDecisionInput,
  ): Promise<GetTodayCoachDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayCoachDecisionError(
        GET_TODAY_COACH_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayCoachDecisionError(
          GET_TODAY_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.coachDecisionDateService.todayUtcDateString();
      const decision =
        await this.coachDecisionRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (decision) {
        return {
          coachDecision: decision,
        };
      }

      return await this.buildCoachDecisionUseCase.execute({ authUserId });
    } catch (error) {
      if (error instanceof GetTodayCoachDecisionError) {
        throw error;
      }

      throw new GetTodayCoachDecisionError(
        GET_TODAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
