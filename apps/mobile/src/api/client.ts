import { Platform } from "react-native";

import { createApiClient } from "@elev9/api-client";
import type { LogWorkoutRequest, LogWorkoutResponse } from "@elev9/types";

import { getAccessToken } from "../storage/token-storage";

const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const baseUrl =
  envBaseUrl || (Platform.OS === "web" ? "http://localhost:3000" : undefined);

if (__DEV__) {
  console.log("[API] baseUrl:", baseUrl);
}

if (!baseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is required on physical devices. Define it in apps/mobile/.env using your local network IP.",
  );
}

export const currentApiBaseUrl = baseUrl;

export const apiClient = createApiClient({
  baseUrl,
  getAccessToken,
});

export const mobileApiClient = {
  ...apiClient,
  progress: {
    ...apiClient.progress,
    async logWorkout(input: LogWorkoutRequest): Promise<LogWorkoutResponse> {
      const token = await getAccessToken();

      const response = await fetch(`${baseUrl}/progress/workout-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as unknown) : null;

      if (!response.ok) {
        const { ApiClientError } = await import("@elev9/api-client");
        const errorPayload =
          typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : {};

        throw new ApiClientError({
          code: typeof errorPayload.code === "string" ? errorPayload.code : "API_ERROR",
          message:
            typeof errorPayload.message === "string"
              ? errorPayload.message
              : "API request failed.",
          status: response.status,
          details:
            typeof errorPayload.details === "object" && errorPayload.details !== null
              ? (errorPayload.details as Record<string, unknown>)
              : undefined,
        });
      }

      return payload as LogWorkoutResponse;
    },
  },
};
