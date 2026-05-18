import type {
  CoachChatHistoryResponse,
  GetCoachChatHistoryQuery,
  SendCoachChatRequest,
  SendCoachChatResponse,
} from "@elev9/types";

import type { HttpClient } from "./http-client";

export function createAiApi(httpClient: HttpClient) {
  return {
    sendChatMessage(input: SendCoachChatRequest): Promise<SendCoachChatResponse> {
      return httpClient.request<SendCoachChatResponse>({
        method: "POST",
        path: "/ai/chat",
        body: input,
      });
    },
    getChatHistory(
      query?: GetCoachChatHistoryQuery,
    ): Promise<CoachChatHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set("limit", String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : "";

      return httpClient.request<CoachChatHistoryResponse>({
        method: "GET",
        path: `/ai/chat/history${suffix}`,
      });
    },
  };
}
