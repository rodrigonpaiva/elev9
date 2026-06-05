import { Inject, Injectable } from '@nestjs/common';

import {
  BuildNotificationDecisionError,
} from '../build-notification-decision/build-notification-decision.errors';
import { BuildNotificationDecisionUseCase } from '../build-notification-decision/build-notification-decision.use-case';
import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  NotificationDecisionRepository,
} from '../../../domain/repositories/notification-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import type { GetTodayNotificationInput } from './get-today-notification.input';
import type { GetTodayNotificationOutput } from './get-today-notification.output';
import { GetTodayNotificationError } from './get-today-notification.errors';

@Injectable()
export class GetTodayNotificationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    private readonly buildNotificationDecisionUseCase: BuildNotificationDecisionUseCase,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: GetTodayNotificationInput,
  ): Promise<GetTodayNotificationOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayNotificationError(
        NOTIFICATION_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayNotificationError(
          NOTIFICATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.platformDateService.getTodayDateString();
      const existingNotification =
        await this.notificationDecisionRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingNotification) {
        return { notificationDecision: existingNotification };
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
        throw new GetTodayNotificationError(
          NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetTodayNotificationError(
        NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
