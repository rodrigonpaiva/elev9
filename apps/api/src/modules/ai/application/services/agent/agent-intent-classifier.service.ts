import { Injectable } from '@nestjs/common';

import type { AgentIntent, AgentRequest } from './agent.types';

export type AgentIntentClassification = {
  intent: AgentIntent;
  matchedPattern?: string;
  rationale: string;
};

type AgentIntentRule = {
  intent: Exclude<AgentIntent, 'GENERAL_CHAT' | 'UNKNOWN'>;
  patterns: string[];
};

const INTENT_RULES: AgentIntentRule[] = [
  {
    intent: 'TRAINING',
    patterns: [
      'workout',
      'training',
      'train',
      'lift',
      'lifting',
      'gym',
      'exercise',
      'routine',
      'strength',
    ],
  },
  {
    intent: 'NUTRITION',
    patterns: [
      'nutrition',
      'meal',
      'meals',
      'food',
      'diet',
      'macro',
      'macros',
      'protein',
      'calorie',
      'calories',
    ],
  },
  {
    intent: 'RECOVERY',
    patterns: [
      'recovery',
      'recover',
      'rest',
      'sleep',
      'fatigue',
      'sore',
      'soreness',
      'deload',
    ],
  },
  {
    intent: 'GOALS',
    patterns: [
      'goal',
      'goals',
      'objective',
      'target',
      'targets',
      'progress toward',
    ],
  },
  {
    intent: 'HABITS',
    patterns: [
      'habit',
      'habits',
      'streak',
      'consistency',
      'routine',
      'discipline',
    ],
  },
  {
    intent: 'PERSONALIZATION',
    patterns: [
      'personalize',
      'personalized',
      'my style',
      'coaching style',
      'tone',
      'preference',
      'preferences',
      'adaptive',
    ],
  },
  {
    intent: 'PROGRESS',
    patterns: [
      'progress',
      'performance',
      'trend',
      'analytics',
      'stats',
      'metric',
      'metrics',
      'adherence',
    ],
  },
  {
    intent: 'DASHBOARD',
    patterns: [
      'dashboard',
      'overview',
      'summary',
      'check in',
      'check-in',
      'home',
      'overall',
    ],
  },
  {
    intent: 'MOTIVATION',
    patterns: [
      'motivate',
      'motivation',
      'encourage',
      'encouragement',
      'stuck',
      'unmotivated',
      'push me',
    ],
  },
  {
    intent: 'PLANNING',
    patterns: [
      'plan',
      'planning',
      'schedule',
      'organize',
      'prepare',
      'next week',
      'tomorrow',
      'weekly plan',
    ],
  },
];

@Injectable()
export class AgentIntentClassifierService {
  classify(
    input: Pick<AgentRequest, 'userMessage'>,
  ): AgentIntentClassification {
    const normalizedMessage = this.normalize(input.userMessage);

    if (this.isUnknown(normalizedMessage)) {
      return {
        intent: 'UNKNOWN',
        rationale: 'Message has too little signal for a deterministic intent.',
      };
    }

    for (const rule of INTENT_RULES) {
      const matchedPattern = rule.patterns.find((pattern) =>
        this.matches(normalizedMessage, pattern),
      );

      if (matchedPattern) {
        return {
          intent: rule.intent,
          matchedPattern,
          rationale: `Matched ${rule.intent.toLowerCase()} pattern "${matchedPattern}".`,
        };
      }
    }

    return {
      intent: 'GENERAL_CHAT',
      rationale:
        'No specific domain pattern matched; defaulting to general chat.',
    };
  }

  private normalize(value: string): string {
    return typeof value === 'string'
      ? value.trim().toLowerCase().replace(/\s+/g, ' ')
      : '';
  }

  private isUnknown(value: string): boolean {
    if (!value) {
      return true;
    }

    const alphaCount = (value.match(/[a-z]/gi) ?? []).length;

    if (alphaCount < 2) {
      return true;
    }

    return /^[^a-z0-9]+$/i.test(value);
  }

  private matches(value: string, pattern: string): boolean {
    const normalizedPattern = pattern.trim().toLowerCase();

    if (!normalizedPattern) {
      return false;
    }

    const escapedPattern = normalizedPattern.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    return new RegExp(`\\b${escapedPattern}\\b`, 'i').test(value);
  }
}
