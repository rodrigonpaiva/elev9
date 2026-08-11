import { Injectable } from '@nestjs/common';

import { CoachIntelligenceSourceAdaptersService } from './coach-intelligence.source-adapters.service';
import type {
  CoachIntelligenceBuildInput,
  CoachIntelligenceContextAssemblyResult,
} from './coach-intelligence.types';

@Injectable()
export class CoachIntelligenceContextAssemblerService {
  constructor(
    private readonly sourceAdaptersService: CoachIntelligenceSourceAdaptersService,
  ) {}

  async resolveUserProfile(input: {
    authUserId: string;
    userProfileId?: string;
  }): Promise<{ id: string; name?: string }> {
    return this.sourceAdaptersService.resolveUserProfile(input);
  }

  async assemble(
    input: CoachIntelligenceBuildInput & {
      generatedAt?: string;
      userProfile?: { id: string; name?: string };
    },
  ): Promise<CoachIntelligenceContextAssemblyResult> {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const userProfile = input.userProfile
      ? Object.freeze({
          id: input.userProfile.id,
          ...(input.userProfile.name ? { name: input.userProfile.name } : {}),
        })
      : await this.sourceAdaptersService.resolveUserProfile({
          authUserId: input.authUserId,
          ...(input.userProfileId
            ? { userProfileId: input.userProfileId }
            : {}),
        });

    const source = await this.sourceAdaptersService.load({
      authUserId: input.authUserId,
      userProfileId: userProfile.id,
      userProfile,
      generatedAt,
    });

    return Object.freeze({
      authUserId: input.authUserId,
      userProfileId: userProfile.id,
      healthContext: source.healthContext,
      source,
      selectedDomains: source.selectedDomains,
      generatedAt,
    });
  }
}
