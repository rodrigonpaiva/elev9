import { Injectable } from '@nestjs/common';

import {
  COACH_INTELLIGENCE_ERROR_CODES,
  GetCoachIntelligenceError,
} from '../../services/coach-intelligence/coach-intelligence.errors';
import { CoachIntelligenceAggregationService } from '../../services/coach-intelligence/coach-intelligence.aggregation.service';
import type { GetCoachIntelligenceInput } from './get-coach-intelligence.input';
import type { GetCoachIntelligenceOutput } from './get-coach-intelligence.output';

@Injectable()
export class GetCoachIntelligenceUseCase {
  constructor(
    private readonly coachIntelligenceAggregationService: CoachIntelligenceAggregationService,
  ) {}

  async execute(
    input: GetCoachIntelligenceInput,
  ): Promise<GetCoachIntelligenceOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const result = await this.coachIntelligenceAggregationService.build({
        authUserId,
        ...(input.requestId ? { requestId: input.requestId } : {}),
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        ...(input.userProfileId ? { userProfileId: input.userProfileId } : {}),
      });

      return result.aggregate;
    } catch (error) {
      if (error instanceof GetCoachIntelligenceError) {
        throw error;
      }

      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
