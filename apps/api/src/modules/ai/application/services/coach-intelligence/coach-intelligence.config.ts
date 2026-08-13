import { Injectable } from '@nestjs/common';

import { CoachIntelligenceConfigurationError } from './coach-intelligence.errors';

@Injectable()
export class CoachIntelligenceConfigService {
  private readonly enabled = this.readBoolean(
    'AI_COACH_INTELLIGENCE_ENABLED',
    false,
  );

  isEnabled(): boolean {
    return this.enabled;
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const value = process.env[key];

    if (typeof value !== 'string') {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === '') {
      return fallback;
    }

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    throw new CoachIntelligenceConfigurationError(`Invalid value for ${key}.`);
  }
}
