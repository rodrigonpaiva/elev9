import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type { CoachChatHistoryMessage } from '@elev9/types';

import { apiClient } from '../api/client';
import { useAuth } from '../auth/auth-provider';
import { useDashboard } from './use-dashboard';
import {
  buildConversationContext,
  createConversationMessage,
  getConversationErrorMessage,
  normalizeHistory,
} from './coach/coach-conversation-helpers';

export { formatCoachMessageTime } from './coach/coach-conversation-helpers';

export type {
  CoachConversationContext,
  CoachConversationMessage,
  CoachConversationMessageKind,
  CoachMessagePart,
} from './coach/coach-conversation-helpers';

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

  const persistMessages = useCallback(
    (nextMessages: CoachConversationMessage[]) => {
      conversationStore.messages = nextMessages;
      setMessages(nextMessages);
    },
    [],
  );

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
    setIsOffline(
      error instanceof ApiClientError && error.code === 'NETWORK_ERROR',
    );
  }
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
