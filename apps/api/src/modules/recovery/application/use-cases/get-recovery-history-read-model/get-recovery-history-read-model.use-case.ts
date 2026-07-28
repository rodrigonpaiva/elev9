import { Injectable, Optional } from '@nestjs/common';

import { GetRecoveryHistoryUseCase } from '../get-recovery-history/get-recovery-history.use-case';
import {
  GET_RECOVERY_HISTORY_ERROR_CODES,
  GetRecoveryHistoryError,
} from '../get-recovery-history/get-recovery-history.errors';
import {
  GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES,
  GetRecoveryHistoryReadModelError,
} from './get-recovery-history-read-model.errors';
import type { RecoveryHistoryReadModel } from '../../read-models/recovery-read-model.types';
import { RecoveryReadModelMapper } from '../../services/recovery-read-model.mapper';
import { RecoveryTrendPolicy } from '../../services/recovery-trend.policy';
import { RecoveryObservabilityService } from '../../services/recovery-observability.service';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

@Injectable()
export class GetRecoveryHistoryReadModelUseCase {
  constructor(
    private readonly getRecoveryHistoryUseCase: GetRecoveryHistoryUseCase,
    private readonly mapper: RecoveryReadModelMapper,
    private readonly trendPolicy: RecoveryTrendPolicy,
    @Optional()
    private readonly observability?: RecoveryObservabilityService,
  ) {}

  async execute(input: {
    authUserId: string;
    days?: number;
  }): Promise<RecoveryHistoryReadModel> {
    const days = this.resolveDays(input.days);
    const startedAt = Date.now();

    try {
      const result = await this.getRecoveryHistoryUseCase.execute({
        authUserId: input.authUserId,
        limit: days,
      });

      const response = {
        range: { days },
        items: result.recoverySnapshots.map((snapshot) =>
          this.mapper.mapHistoryItem(snapshot),
        ),
        trend: this.trendPolicy.calculate(result.recoverySnapshots),
      };
      this.observability?.recordHistoryRequest(
        response.items.length === 0 ? 'expected_empty' : 'success',
        elapsedMs(startedAt),
      );
      this.observability?.recordTrend(
        response.trend.direction === 'insufficient_data'
          ? 'insufficient_data'
          : 'computed',
      );
      return response;
    } catch (error) {
      this.observability?.recordHistoryRequest(
        'technical_failure',
        elapsedMs(startedAt),
      );
      if (error instanceof GetRecoveryHistoryError) {
        if (error.code === GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_SESSION) {
          throw new GetRecoveryHistoryReadModelError(
            GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES.INVALID_SESSION,
            error.message,
          );
        }
        if (error.code === GET_RECOVERY_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND) {
          throw new GetRecoveryHistoryReadModelError(
            GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES.USER_PROFILE_NOT_FOUND,
            error.message,
          );
        }
        if (error.code === GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT) {
          throw new GetRecoveryHistoryReadModelError(
            GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES.INVALID_RANGE,
            error.message,
          );
        }
      }

      throw new GetRecoveryHistoryReadModelError(
        GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveDays(days?: number): number {
    if (days === undefined) return DEFAULT_DAYS;
    if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
      throw new GetRecoveryHistoryReadModelError(
        GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES.INVALID_RANGE,
        'Invalid recovery history range.',
      );
    }
    return days;
  }
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
