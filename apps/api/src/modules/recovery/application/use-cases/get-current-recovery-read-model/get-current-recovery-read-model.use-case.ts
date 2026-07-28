import { Injectable, Optional } from '@nestjs/common';

import { GetCurrentRecoveryUseCase } from '../get-current-recovery/get-current-recovery.use-case';
import {
  GET_CURRENT_RECOVERY_ERROR_CODES,
  GetCurrentRecoveryError,
} from '../get-current-recovery/get-current-recovery.errors';
import {
  GET_CURRENT_RECOVERY_READ_MODEL_ERROR_CODES,
  GetCurrentRecoveryReadModelError,
} from './get-current-recovery-read-model.errors';
import type { RecoveryCurrentReadModel } from '../../read-models/recovery-read-model.types';
import { RecoveryReadModelMapper } from '../../services/recovery-read-model.mapper';
import { RecoveryObservabilityService } from '../../services/recovery-observability.service';

@Injectable()
export class GetCurrentRecoveryReadModelUseCase {
  constructor(
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly mapper: RecoveryReadModelMapper,
    @Optional()
    private readonly observability?: RecoveryObservabilityService,
  ) {}

  async execute(input: { authUserId: string }): Promise<RecoveryCurrentReadModel> {
    const startedAt = Date.now();
    try {
      const result = await this.getCurrentRecoveryUseCase.execute(input);
      let response: RecoveryCurrentReadModel;
      try {
        response = this.mapper.mapCurrent(result.recoverySnapshot);
      } catch (error) {
        this.observability?.recordReadModelMappingFailure();
        throw error;
      }
      this.observability?.recordCurrentRequest(
        response.availability === 'available' ? 'success' : 'expected_empty',
        elapsedMs(startedAt),
      );
      if (response.recovery?.freshness === 'legacy') {
        this.observability?.recordLegacySnapshot();
      }
      return response;
    } catch (error) {
      this.observability?.recordCurrentRequest(
        'technical_failure',
        elapsedMs(startedAt),
      );
      if (error instanceof GetCurrentRecoveryError) {
        if (error.code === GET_CURRENT_RECOVERY_ERROR_CODES.INVALID_SESSION) {
          throw new GetCurrentRecoveryReadModelError(
            GET_CURRENT_RECOVERY_READ_MODEL_ERROR_CODES.INVALID_SESSION,
            error.message,
          );
        }
        if (error.code === GET_CURRENT_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND) {
          throw new GetCurrentRecoveryReadModelError(
            GET_CURRENT_RECOVERY_READ_MODEL_ERROR_CODES.USER_PROFILE_NOT_FOUND,
            error.message,
          );
        }
        return {
          availability: 'processing_failed',
          recovery: null,
        };
      }

      throw new GetCurrentRecoveryReadModelError(
        GET_CURRENT_RECOVERY_READ_MODEL_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
