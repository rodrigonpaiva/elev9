import { Platform } from "react-native";

import { createApiClient } from "@elev9/api-client";
import { ApiClientError } from "@elev9/api-client";
import type {
  LogWorkoutRequest,
  LogWorkoutResponse,
  WorkoutHistoryResponse,
} from "@elev9/types";

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

async function requestJson<T>(input: {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
}): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${baseUrl}${input.path}`, {
    method: input.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
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

  return payload as T;
}

export const mobileApiClient = {
  ...apiClient,
  progress: {
    ...apiClient.progress,
    async logWorkout(input: LogWorkoutRequest): Promise<LogWorkoutResponse> {
      return requestJson<LogWorkoutResponse>({
        path: "/progress/workout-logs",
        method: "POST",
        body: input,
      });
    },
    async getWorkoutHistory(limit = 20): Promise<WorkoutHistoryResponse> {
      return requestJson<WorkoutHistoryResponse>({
        path: `/progress/workout-logs?limit=${limit}`,
        method: "GET",
      });
    },
  },
};
