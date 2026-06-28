import { Inject, Injectable } from '@nestjs/common';

import { BuildNotificationDecisionError } from '../build-notification-decision/build-notification-decision.errors';
import { BuildNotificationDecisionUseCase } from '../build-notification-decision/build-notification-decision.use-case';
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
import type { GetCurrentNotificationInput } from './get-current-notification.input';
import type { GetCurrentNotificationOutput } from './get-current-notification.output';
import { GetCurrentNotificationError } from './get-current-notification.errors';

@Injectable()
export class GetCurrentNotificationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    private readonly buildNotificationDecisionUseCase: BuildNotificationDecisionUseCase,
  ) {}

  async execute(
    input: GetCurrentNotificationInput,
  ): Promise<GetCurrentNotificationOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCurrentNotificationError(
        NOTIFICATION_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCurrentNotificationError(
          NOTIFICATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestNotification =
        await this.notificationDecisionRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestNotification) {
        return { notificationDecision: latestNotification };
      }

      const built = await this.buildNotificationDecisionUseCase.execute({
        authUserId,
      });

      return built;
    } catch (error) {
      if (error instanceof NotificationReadError) {
        throw error;
      }

      if (error instanceof BuildNotificationDecisionError) {
        throw new GetCurrentNotificationError(
          NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetCurrentNotificationError(
        NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
