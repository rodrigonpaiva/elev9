import type {
  CreateDailyCheckInRequest,
  DailyCheckInHistoryResponse,
  DailyCheckInResponse,
  GetDailyCheckInHistoryQuery,
  ProgressSummaryResponse,
} from "@elev9/types";

import type { HttpClient } from "./http-client";

export function createProgressApi(httpClient: HttpClient) {
  return {
    createDailyCheckIn(
      input: CreateDailyCheckInRequest,
    ): Promise<DailyCheckInResponse> {
      return httpClient.request<DailyCheckInResponse>({
        method: "POST",
        path: "/progress/daily-check-in",
        body: input,
      });
    },
    getDailyCheckInHistory(
      query?: GetDailyCheckInHistoryQuery,
    ): Promise<DailyCheckInHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set("limit", String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : "";

      return httpClient.request<DailyCheckInHistoryResponse>({
        method: "GET",
        path: `/progress/daily-check-ins${suffix}`,
      });
    },
    getSummary(period?: "week" | "month"): Promise<ProgressSummaryResponse> {
      const query = period ? `?period=${period}` : "";

      return httpClient.request<ProgressSummaryResponse>({
        method: "GET",
        path: `/progress/summary${query}`,
      });
    },
  };
}
