import { ApiClientError } from '@elev9/api-client';
import type {
  CoachChatHistoryMessage,
  CoachChatHistoryResponse,
} from '@elev9/types';

import type {
  CoachExplanation,
  CoachPersonaProfile,
  CoachUnifiedCoachIntelligence,
} from './coach-intelligence';
import {
  getCoachConfidenceLabel,
  getCoachFocusLabel,
  getCoachRiskLabel,
  mapUnifiedCoachInsight,
} from './coach-intelligence';
import { formatCoachRelativeTime } from './coach-relative-time';

export type CoachConversationMessageKind =
  | 'coach'
  | 'user'
  | 'system'
  | 'recommendation'
  | 'warning'
  | 'celebration';

export type CoachMessagePart =
  | {
      id: string;
      type: 'paragraph';
      text: string;
    }
  | {
      id: string;
      type: 'bullet';
      text: string;
    }
  | {
      id: string;
      type: 'divider';
    };

export type CoachConversationMessage = CoachChatHistoryMessage & {
  localId: string;
  kind: CoachConversationMessageKind;
  displayParts: CoachMessagePart[];
};

export type CoachConversationContext = {
  status: string;
  summary: string;
  focus: string;
  risk: string;
  confidence: string;
  persona: string;
  topRecommendation: string;
  signals: string[];
  suggestedQuestions: string[];
};

export function normalizeHistory(
  response: CoachChatHistoryResponse,
): CoachConversationMessage[] {
  return response.map((message, index) =>
    createConversationMessage(message, `${message.createdAt}-${index}`),
  );
}

export function createConversationMessage(
  message: CoachChatHistoryMessage,
  localId = createLocalId(message.role),
): CoachConversationMessage {
  return {
    ...message,
    localId,
    kind: getMessageKind(message),
    displayParts: formatCoachMessage(message.content),
  };
}

export function getMessageKind(
  message: CoachChatHistoryMessage,
): CoachConversationMessageKind {
  if (message.role === 'user') {
    return 'user';
  }

  const content = message.content.toLowerCase();

  if (content.includes('warning') || content.includes('be careful')) {
    return 'warning';
  }

  if (content.includes('great work') || content.includes('well done')) {
    return 'celebration';
  }

  if (content.includes('recommend')) {
    return 'recommendation';
  }

  return 'coach';
}

export function formatCoachMessage(content: string): CoachMessagePart[] {
  const trimmed = content.trim();

  if (looksLikeJson(trimmed)) {
    return [
      {
        id: 'paragraph-0',
        type: 'paragraph',
        text: 'I have your coaching context ready. Ask me what you want to adjust today.',
      },
    ];
  }

  const lines = trimmed
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [
      { id: 'paragraph-0', type: 'paragraph', text: 'I am here with you.' },
    ];
  }

  const parts: CoachMessagePart[] = [];

  lines.forEach((line, index) => {
    if (/^(-|\*|•)\s+/.test(line)) {
      parts.push({
        id: `bullet-${index}`,
        type: 'bullet',
        text: line.replace(/^(-|\*|•)\s+/, ''),
      });
      return;
    }

    if (/^---+$/.test(line)) {
      parts.push({ id: `divider-${index}`, type: 'divider' });
      return;
    }

    parts.push({
      id: `paragraph-${index}`,
      type: 'paragraph',
      text: line.replace(/^#{1,6}\s+/, ''),
    });
  });

  return parts;
}

export function buildConversationContext(input: {
  coachStatus?: string;
  hasWorkout: boolean;
  hasRecovery: boolean;
  hasNutrition: boolean;
  hasProgress: boolean;
  priority?: string;
  intelligence?: CoachUnifiedCoachIntelligence | null;
  persona?: CoachPersonaProfile | null;
  explanation?: CoachExplanation | null;
}): CoachConversationContext {
  const signals = [
    input.hasWorkout ? 'Workout' : null,
    input.hasRecovery ? 'Recovery' : null,
    input.hasNutrition ? 'Nutrition' : null,
    input.hasProgress ? 'Progress' : null,
    'Goals',
  ].filter(Boolean) as string[];
  const insight = mapUnifiedCoachInsight({
    intelligence: input.intelligence ?? null,
  });

  return {
    status: input.coachStatus
      ? `Updated ${formatCoachRelativeTime(input.coachStatus, {
          style: 'compact',
        })}`
      : 'Ready to help',
    summary:
      input.explanation?.summary ||
      insight.summary ||
      'Your coach is ready with current context.',
    focus: insight.currentFocus
      ? getCoachFocusLabel(insight.currentFocus)
      : 'Coach',
    risk: insight.currentRisk
      ? getCoachRiskLabel(insight.currentRisk.level)
      : 'No major risk',
    confidence: insight.confidence
      ? getCoachConfidenceLabel(insight.confidence.level)
      : 'Low confidence',
    persona: input.persona
      ? `${input.persona.tone.toLowerCase()} · ${input.persona.verbosity.toLowerCase()}`
      : 'Supportive',
    topRecommendation:
      insight.topRecommendation?.title ?? 'Keep following your plan.',
    signals: signals.slice(0, 5),
    suggestedQuestions: getSuggestedQuestions(input.priority),
  };
}

export function getSuggestedQuestions(priority?: string): string[] {
  const defaults = [
    'How ready am I today?',
    "Should I change today's workout?",
    'What should I eat after training?',
    'Why am I feeling tired?',
  ];

  if (priority === 'nutrition') {
    return [
      'What should I eat next?',
      'How should I time protein today?',
      "Should I adjust food around today's workout?",
      'What is my nutrition priority?',
    ];
  }

  if (priority === 'recovery') {
    return [
      'How should I recover today?',
      "Should I change today's workout?",
      'Why am I feeling tired?',
      'What should I do before sleep?',
    ];
  }

  return defaults;
}

export function getConversationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') {
    return "You're offline.\n\nReconnect to continue your conversation.";
  }

  return 'Unable to reach your coach.';
}

export function resolveAutoSendConversationPrompt(input: {
  initialPrompt?: string | null;
  promptId?: string | null;
  lastAutoPromptId: string | null;
}): { prompt: string; promptId: string } | null {
  const initialPrompt = input.initialPrompt?.trim();
  const promptId = input.promptId ?? initialPrompt;

  if (!initialPrompt || !promptId || input.lastAutoPromptId === promptId) {
    return null;
  }

  return {
    prompt: initialPrompt,
    promptId,
  };
}

export function formatCoachMessageTime(value: string): string {
  return formatCoachRelativeTime(value, { style: 'compact' });
}

function looksLikeJson(value: string): boolean {
  if (!value.startsWith('{') && !value.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
