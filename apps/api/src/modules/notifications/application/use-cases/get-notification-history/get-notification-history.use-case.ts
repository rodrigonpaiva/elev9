import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  NotificationDecisionRepository,
} from '../../../domain/repositories/notification-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import type { GetNotificationHistoryInput } from './get-notification-history.input';
import type { GetNotificationHistoryOutput } from './get-notification-history.output';
import { GetNotificationHistoryError } from './get-notification-history.errors';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetNotificationHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
  ) {}

  async execute(
    input: GetNotificationHistoryInput,
  ): Promise<GetNotificationHistoryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetNotificationHistoryError(
        NOTIFICATION_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const limit = this.resolveLimit(input.limit);

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetNotificationHistoryError(
          NOTIFICATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const notificationDecisions =
        await this.notificationDecisionRepository.findManyByUserProfileId(
          userProfile.id,
          { limit },
        );

      return {
        notificationDecisions,
        limit,
      };
    } catch (error) {
      if (error instanceof NotificationReadError) {
        throw error;
      }

      throw new GetNotificationHistoryError(
        NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveLimit(limit: number | undefined): number {
    if (limit === undefined) {
      return DEFAULT_LIMIT;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new GetNotificationHistoryError(
        NOTIFICATION_READ_ERROR_CODES.INVALID_LIMIT,
        `Limit must be between 1 and ${MAX_LIMIT}.`,
      );
    }

    return limit;
  }
}
