import type {
  CoachChatHistoryResponse,
  CoachIntelligenceAggregate,
  GetCoachDecisionHistoryQuery,
  GetCoachDecisionHistoryResponse,
  GetCurrentCoachDecisionResponse,
  GetTodayCoachDecisionResponse,
  CoachDecisionReplayResponse,
  GetCoachChatHistoryQuery,
  SendCoachChatRequest,
  SendCoachChatResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createAiApi(httpClient: HttpClient) {
  return {
    sendChatMessage(
      input: SendCoachChatRequest,
    ): Promise<SendCoachChatResponse> {
      return httpClient.request<SendCoachChatResponse>({
        method: 'POST',
        path: '/ai/chat',
        body: input,
      });
    },
    getChatHistory(
      query?: GetCoachChatHistoryQuery,
    ): Promise<CoachChatHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<CoachChatHistoryResponse>({
        method: 'GET',
        path: `/ai/chat/history${suffix}`,
      });
    },
    getTodayCoachDecision(): Promise<GetTodayCoachDecisionResponse> {
      return httpClient.request<GetTodayCoachDecisionResponse>({
        method: 'GET',
        path: '/ai/coach-decision/today',
      });
    },
    getCurrentCoachDecision(): Promise<GetCurrentCoachDecisionResponse> {
      return httpClient.request<GetCurrentCoachDecisionResponse>({
        method: 'GET',
        path: '/ai/coach-decision/current',
      });
    },
    getCoachDecisionHistory(
      query?: GetCoachDecisionHistoryQuery,
    ): Promise<GetCoachDecisionHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetCoachDecisionHistoryResponse>({
        method: 'GET',
        path: `/ai/coach-decision/history${suffix}`,
      });
    },
    replayCoachDecision(id: string): Promise<CoachDecisionReplayResponse> {
      return httpClient.request<CoachDecisionReplayResponse>({
        method: 'GET',
        path: `/ai/coach-decision/debug/${encodeURIComponent(id)}/replay`,
      });
    },
    getCoachIntelligence(): Promise<CoachIntelligenceAggregate> {
      return httpClient.request<CoachIntelligenceAggregate>({
        method: 'GET',
        path: '/ai/coach-intelligence',
      });
    },
  };
}
