import { Inject, Injectable } from '@nestjs/common';

import {
  ENGAGEMENT_EVENT_REPOSITORY,
  type EngagementEventRepository,
} from '../../../domain/repositories/engagement-event.repository';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  type NotificationDecisionRepository,
} from '../../../domain/repositories/notification-decision.repository';
import {
  NOTIFICATION_HISTORY_REPOSITORY,
  type NotificationHistoryRepository,
} from '../../../domain/repositories/notification-history.repository';
import type { NotificationStatus } from '../../../domain/notifications.types';
import {
  USER_PROFILE_REPOSITORY,
  type UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  RECORD_ENGAGEMENT_EVENT_ERROR_CODES,
  RecordEngagementEventError,
} from './record-engagement-event.errors';
import type { RecordEngagementEventInput } from './record-engagement-event.input';
import type { RecordEngagementEventOutput } from './record-engagement-event.output';

@Injectable()
export class RecordEngagementEventUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    @Inject(NOTIFICATION_HISTORY_REPOSITORY)
    private readonly notificationHistoryRepository: NotificationHistoryRepository,
    @Inject(ENGAGEMENT_EVENT_REPOSITORY)
    private readonly engagementEventRepository: EngagementEventRepository,
  ) {}

  async execute(
    input: RecordEngagementEventInput,
  ): Promise<RecordEngagementEventOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const notificationId =
      typeof input.notificationId === 'string'
        ? input.notificationId.trim()
        : '';

    if (!authUserId || !notificationId) {
      throw new RecordEngagementEventError(
        RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INVALID_INPUT,
        'Invalid notification engagement input.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new RecordEngagementEventError(
          RECORD_ENGAGEMENT_EVENT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const notificationDecision =
        await this.notificationDecisionRepository.findById(notificationId);

      if (!notificationDecision) {
        throw new RecordEngagementEventError(
          RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
          'Notification decision not found.',
        );
      }

      if (notificationDecision.userProfileId !== userProfile.id) {
        throw new RecordEngagementEventError(
          RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
          'Notification decision not found.',
        );
      }

      const occurredAt = new Date();
      const status = resolveNotificationStatusForEvent(input.type);
      const resolvedNotificationDecisionId =
        notificationDecision.id ?? notificationId;
      const engagementEvent = await this.engagementEventRepository.create({
        userProfileId: userProfile.id,
        notificationDecisionId: resolvedNotificationDecisionId,
        type: input.type,
        occurredAt,
        metadata: sanitizeMetadata(input.metadata),
      });

      const updatedNotificationDecision =
        await this.notificationDecisionRepository.updateStatus(
          resolvedNotificationDecisionId,
          status,
        );

      if (!updatedNotificationDecision) {
        throw new RecordEngagementEventError(
          RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
          'Notification decision not found.',
        );
      }

      let historyEntry = undefined;
      const previousStatus = notificationDecision.status.value;
      if (previousStatus !== status) {
        historyEntry = await this.notificationHistoryRepository.create({
          userProfileId: userProfile.id,
          notificationDecisionId: resolvedNotificationDecisionId,
          previousStatus,
          nextStatus: status,
          reason: input.type,
          occurredAt,
          metadata: {
            engagementEventId: engagementEvent.id,
            engagementEventType: input.type,
          },
        });
      }

      return {
        engagementEvent,
        notificationDecision: updatedNotificationDecision,
        historyEntry,
      };
    } catch (error) {
      if (error instanceof RecordEngagementEventError) {
        throw error;
      }

      throw new RecordEngagementEventError(
        RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function resolveNotificationStatusForEvent(
  eventType: RecordEngagementEventInput['type'],
): NotificationStatus {
  switch (eventType) {
    case 'impression':
      return 'sent';
    case 'opened':
    case 'clicked':
      return 'opened';
    case 'dismissed':
      return 'dismissed';
    case 'completed':
      return 'completed';
    default:
      return 'planned';
  }
}

function sanitizeMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized = sanitizeValue(metadata) as Record<string, unknown>;
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sensitiveKeys = new Set([
    'auth',
    'authUserId',
    'authorization',
    'body',
    'cookie',
    'cookies',
    'headers',
    'llm',
    'password',
    'prompt',
    'raw',
    'request',
    'session',
    'sourceContext',
    'secret',
    'token',
    'userProfileId',
  ]);

  return Object.entries(value).reduce<Record<string, unknown>>(
    (accumulator, [key, nestedValue]) => {
      if (sensitiveKeys.has(key)) {
        return accumulator;
      }

      const sanitizedValue = sanitizeValue(nestedValue);
      if (sanitizedValue !== undefined) {
        accumulator[key] = sanitizedValue;
      }

      return accumulator;
    },
    {},
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
