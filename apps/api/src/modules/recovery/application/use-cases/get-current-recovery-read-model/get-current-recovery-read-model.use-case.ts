import { Injectable } from '@nestjs/common';

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

@Injectable()
export class GetCurrentRecoveryReadModelUseCase {
  constructor(
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly mapper: RecoveryReadModelMapper,
  ) {}

  async execute(input: { authUserId: string }): Promise<RecoveryCurrentReadModel> {
    try {
      const result = await this.getCurrentRecoveryUseCase.execute(input);
      return this.mapper.mapCurrent(result.recoverySnapshot);
    } catch (error) {
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
