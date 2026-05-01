import type { FitnessProfileResponse } from "@elev9/types";

import type { HttpClient } from "./http-client";

export function createFitnessApi(httpClient: HttpClient) {
  return {
    getMyProfile(): Promise<FitnessProfileResponse> {
      return httpClient.request<FitnessProfileResponse>({
        method: "GET",
        path: "/fitness/profile",
      });
    },
  };
}
