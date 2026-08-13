import { Injectable } from '@nestjs/common';

import {
  AiPromptInjectionAssessment,
  AiSafetyRiskLevel,
} from './ai-safety.types';

const INJECTION_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  {
    pattern: /ignore\s+(?:all\s+)?previous\s+instructions?/i,
    score: 6,
    label: 'ignore_previous_instructions',
  },
  {
    pattern: /reveal\s+(?:the\s+)?system\s+prompt/i,
    score: 6,
    label: 'reveal_system_prompt',
  },
  {
    pattern: /show\s+(?:the\s+)?hidden\s+prompt/i,
    score: 6,
    label: 'show_hidden_prompt',
  },
  {
    pattern: /forget\s+your\s+instructions?/i,
    score: 6,
    label: 'forget_instructions',
  },
  {
    pattern: /developer\s+message/i,
    score: 3,
    label: 'developer_message',
  },
  {
    pattern: /system\s+message/i,
    score: 3,
    label: 'system_message',
  },
  {
    pattern: /act\s+as\s+(?:another|a\s+different)\s+assistant/i,
    score: 5,
    label: 'role_override',
  },
  {
    pattern: /execute\s+hidden\s+instructions?/i,
    score: 6,
    label: 'execute_hidden_instructions',
  },
  {
    pattern: /override\s+safety/i,
    score: 6,
    label: 'override_safety',
  },
  {
    pattern: /prompt\s+injection/i,
    score: 2,
    label: 'prompt_injection_reference',
  },
  {
    pattern: /ignore\s+the\s+above/i,
    score: 2,
    label: 'ignore_the_above',
  },
  {
    pattern: /tell\s+me\s+your\s+instructions/i,
    score: 5,
    label: 'request_instructions',
  },
  {
    pattern: /show\s+me\s+your\s+prompt/i,
    score: 6,
    label: 'show_prompt',
  },
];

@Injectable()
export class AiPromptInjectionDetectorService {
  assess(input: string): AiPromptInjectionAssessment {
    const normalized = this.normalize(input);
    const triggers = new Set<string>();
    let riskScore = 0;

    for (const entry of INJECTION_PATTERNS) {
      if (entry.pattern.test(normalized)) {
        triggers.add(entry.label);
        riskScore += entry.score;
      }
    }

    const repeatedInstructionMentions = this.countMatches(
      normalized,
      /\b(instructions?|prompt|system|developer|policy|safety)\b/gi,
    );

    if (repeatedInstructionMentions >= 6) {
      riskScore += 2;
      triggers.add('repeated_instruction_terms');
    } else if (repeatedInstructionMentions >= 3) {
      riskScore += 1;
      triggers.add('instruction_terms');
    }

    if (this.countMatches(normalized, /```/g) >= 2) {
      riskScore += 1;
      triggers.add('fenced_code');
    }

    if (
      this.countMatches(
        normalized,
        /\b(ignore|reveal|show|forget|override)\b/gi,
      ) >= 3
    ) {
      riskScore += 1;
      triggers.add('instruction_override_language');
    }

    const riskLevel = this.resolveRiskLevel(riskScore);

    return {
      riskLevel,
      riskScore,
      triggers: [...triggers],
    };
  }

  private normalize(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private countMatches(source: string, pattern: RegExp): number {
    const matches = source.match(pattern);

    return matches ? matches.length : 0;
  }

  private resolveRiskLevel(riskScore: number): AiSafetyRiskLevel {
    if (riskScore >= 9) {
      return 'CRITICAL';
    }

    if (riskScore >= 6) {
      return 'HIGH';
    }

    if (riskScore >= 3) {
      return 'MEDIUM';
    }

    if (riskScore >= 1) {
      return 'LOW';
    }

    return 'SAFE';
  }
}
