import type { ProgressSummaryResponse } from "@elev9/types";

import type { HttpClient } from "./http-client";

export function createProgressApi(httpClient: HttpClient) {
  return {
    getSummary(period?: "week" | "month"): Promise<ProgressSummaryResponse> {
      const query = period ? `?period=${period}` : "";

      return httpClient.request<ProgressSummaryResponse>({
        method: "GET",
        path: `/progress/summary${query}`,
      });
    },
  };
}
