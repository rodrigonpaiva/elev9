import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachChatHistoryMessage,
  CoachChatHistoryResponse,
} from '@elev9/types';

import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import { useDashboard } from './use-dashboard';

export type CoachConversationMessageKind =
  | 'coach'
  | 'user'
  | 'system'
  | 'recommendation'
  | 'warning'
  | 'celebration';

export type CoachConversationMessage = CoachChatHistoryMessage & {
  localId: string;
  kind: CoachConversationMessageKind;
  displayParts: CoachMessagePart[];
};

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

export type CoachConversationContext = {
  status: string;
  signals: string[];
  suggestedQuestions: string[];
};

export type CoachConversationResult = {
  messages: CoachConversationMessage[];
  context: CoachConversationContext;
  draftMessage: string;
  errorMessage: string | null;
  isLoadingHistory: boolean;
  isSending: boolean;
  isOffline: boolean;
  isContextBannerDismissed: boolean;
  scrollOffset: number;
  setDraftMessage: (value: string) => void;
  setContextBannerDismissed: (value: boolean) => void;
  setScrollOffset: (value: number) => void;
  loadHistory: (options?: { refresh?: boolean }) => Promise<void>;
  sendMessage: (message?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
};

const CHAT_HISTORY_LIMIT = 80;

const conversationStore: {
  messages: CoachConversationMessage[];
  draftMessage: string;
  contextBannerDismissed: boolean;
  scrollOffset: number;
  lastFailedMessage: string | null;
} = {
  messages: [],
  draftMessage: '',
  contextBannerDismissed: false,
  scrollOffset: 0,
  lastFailedMessage: null,
};

export function useCoachConversation(): CoachConversationResult {
  const { signOut } = useAuth();
  const dashboard = useDashboard();
  const [messages, setMessages] = useState<CoachConversationMessage[]>(
    conversationStore.messages,
  );
  const [draftMessage, setDraftMessageState] = useState(
    conversationStore.draftMessage,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(
    conversationStore.messages.length === 0,
  );
  const [isSending, setIsSending] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isContextBannerDismissed, setContextBannerDismissedState] = useState(
    conversationStore.contextBannerDismissed,
  );
  const [scrollOffset, setScrollOffsetState] = useState(
    conversationStore.scrollOffset,
  );

  const persistMessages = useCallback((nextMessages: CoachConversationMessage[]) => {
    conversationStore.messages = nextMessages;
    setMessages(nextMessages);
  }, []);

  const loadHistory = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!options?.refresh && conversationStore.messages.length === 0) {
        setIsLoadingHistory(true);
      }

      setErrorMessage(null);

      try {
        const response = await apiClient.ai.getChatHistory({
          limit: CHAT_HISTORY_LIMIT,
        });
        setIsOffline(false);
        persistMessages(normalizeHistory(response));
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.code === 'AUTH_INVALID_SESSION'
        ) {
          await signOut();
          return;
        }

        setOfflineFromError(error);
        setErrorMessage(getConversationErrorMessage(error));
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [persistMessages, signOut],
  );

  useEffect(() => {
    if (conversationStore.messages.length > 0) {
      setIsLoadingHistory(false);
      return;
    }

    void loadHistory();
  }, [loadHistory]);

  const sendMessage = useCallback(
    async (input?: string) => {
      const message = (input ?? draftMessage).trim();

      if (message.length === 0 || isSending) {
        return;
      }

      conversationStore.lastFailedMessage = null;
      setErrorMessage(null);
      setDraftMessageState('');
      conversationStore.draftMessage = '';

      const userMessage = createConversationMessage({
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      });

      trackCoachConversationEvent('coach_message_sent');
      persistMessages([...conversationStore.messages, userMessage]);
      setIsSending(true);

      try {
        const response = await apiClient.ai.sendChatMessage({ message });
        const assistantMessage = createConversationMessage({
          role: 'assistant',
          content: response.reply,
          createdAt: new Date().toISOString(),
        });

        setIsOffline(false);
        persistMessages([...conversationStore.messages, assistantMessage]);
        trackCoachConversationEvent('coach_message_received');
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.code === 'AUTH_INVALID_SESSION'
        ) {
          await signOut();
          return;
        }

        conversationStore.lastFailedMessage = message;
        setDraftMessageState(message);
        conversationStore.draftMessage = message;
        setOfflineFromError(error);
        setErrorMessage(getConversationErrorMessage(error));
      } finally {
        setIsSending(false);
      }
    },
    [draftMessage, isSending, persistMessages, signOut],
  );

  const retryLastMessage = useCallback(async () => {
    const message = conversationStore.lastFailedMessage ?? draftMessage;

    trackCoachConversationEvent('coach_retry_message');
    await sendMessage(message);
  }, [draftMessage, sendMessage]);

  const setDraftMessage = useCallback((value: string) => {
    conversationStore.draftMessage = value;
    setDraftMessageState(value);
  }, []);

  const setContextBannerDismissed = useCallback((value: boolean) => {
    conversationStore.contextBannerDismissed = value;
    setContextBannerDismissedState(value);
  }, []);

  const setScrollOffset = useCallback((value: number) => {
    conversationStore.scrollOffset = value;
    setScrollOffsetState(value);
  }, []);

  const context = useMemo(
    () =>
      buildConversationContext({
        coachStatus: dashboard.coach.data?.updatedAt,
        hasWorkout: Boolean(dashboard.workout.todaysWorkout),
        hasRecovery: Boolean(dashboard.recovery.data),
        hasNutrition: Boolean(dashboard.nutrition.data),
        hasProgress: Boolean(dashboard.progress.data),
        priority: dashboard.coach.data?.priority,
      }),
    [
      dashboard.coach.data,
      dashboard.nutrition.data,
      dashboard.progress.data,
      dashboard.recovery.data,
      dashboard.workout.todaysWorkout,
    ],
  );

  return {
    messages,
    context,
    draftMessage,
    errorMessage,
    isLoadingHistory,
    isSending,
    isOffline,
    isContextBannerDismissed,
    scrollOffset,
    setDraftMessage,
    setContextBannerDismissed,
    setScrollOffset,
    loadHistory,
    sendMessage,
    retryLastMessage,
  };

  function setOfflineFromError(error: unknown) {
    setIsOffline(error instanceof ApiClientError && error.code === 'NETWORK_ERROR');
  }
}

function normalizeHistory(
  response: CoachChatHistoryResponse,
): CoachConversationMessage[] {
  return response.map((message, index) =>
    createConversationMessage(message, `${message.createdAt}-${index}`),
  );
}

function createConversationMessage(
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

function getMessageKind(
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

function formatCoachMessage(content: string): CoachMessagePart[] {
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
    return [{ id: 'paragraph-0', type: 'paragraph', text: 'I am here with you.' }];
  }

  return lines.flatMap((line, index) => {
    if (/^(-|\*|•)\s+/.test(line)) {
      return [
        {
          id: `bullet-${index}`,
          type: 'bullet',
          text: line.replace(/^(-|\*|•)\s+/, ''),
        } as const,
      ];
    }

    if (/^---+$/.test(line)) {
      return [{ id: `divider-${index}`, type: 'divider' } as const];
    }

    return [
      {
        id: `paragraph-${index}`,
        type: 'paragraph',
        text: line.replace(/^#{1,6}\s+/, ''),
      } as const,
    ];
  });
}

function buildConversationContext(input: {
  coachStatus?: string;
  hasWorkout: boolean;
  hasRecovery: boolean;
  hasNutrition: boolean;
  hasProgress: boolean;
  priority?: string;
}): CoachConversationContext {
  const signals = [
    input.hasWorkout ? 'Workout' : null,
    input.hasRecovery ? 'Recovery' : null,
    input.hasNutrition ? 'Nutrition' : null,
    input.hasProgress ? 'Progress' : null,
    'Goals',
  ].filter(Boolean) as string[];

  return {
    status: input.coachStatus
      ? `Updated ${formatRelativeTime(input.coachStatus)}`
      : 'Ready to help',
    signals: signals.slice(0, 5),
    suggestedQuestions: getSuggestedQuestions(input.priority),
  };
}

function getSuggestedQuestions(priority?: string): string[] {
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

function getConversationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') {
    return "You're offline.\n\nReconnect to continue your conversation.";
  }

  return 'Unable to reach your coach.';
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return 'today';
  }

  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  return 'today';
}

export function formatCoachMessageTime(value: string): string {
  return formatRelativeTime(value);
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

export function trackCoachConversationEvent(
  _event:
    | 'coach_chat_opened'
    | 'coach_message_sent'
    | 'coach_message_received'
    | 'coach_suggestion_selected'
    | 'coach_retry_message',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
