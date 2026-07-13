import { Injectable } from '@nestjs/common';

import { CoachPersonaEnginePolicy } from './coach-persona-engine.policy';
import type {
  CoachPersonaEngineInput,
  CoachPersonaGuidance,
  CoachPersonaMetadata,
} from './coach-persona-engine.types';

@Injectable()
export class CoachPersonaEngineService {
  constructor(
    private readonly policy: CoachPersonaEnginePolicy = new CoachPersonaEnginePolicy(),
  ) {}

  build(input: CoachPersonaEngineInput): CoachPersonaGuidance {
    const profile = this.policy.resolveProfile(input);
    const communicationRules = this.policy.resolveCommunicationRules({
      profile,
      guidance: input,
    });
    const metadata = this.policy.resolveMetadata({
      profile,
      guidance: input,
      rules: communicationRules,
    });

    return Object.freeze({
      ...profile,
      communicationStyle: Object.freeze({
        ...profile.communicationStyle,
      }),
      communicationRules: Object.freeze([...communicationRules]),
      metadata: Object.freeze({
        ...metadata,
      }) as CoachPersonaMetadata,
    });
  }
}
