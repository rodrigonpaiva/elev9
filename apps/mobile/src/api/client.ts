import { Platform } from "react-native";

import { createApiClient } from "@elev9/api-client";

import { getAccessToken } from "../storage/token-storage";

const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const baseUrl =
  envBaseUrl || (Platform.OS === "web" ? "http://localhost:3000" : undefined);

console.log("[API] baseUrl:", baseUrl);

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
