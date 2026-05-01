import { createApiClient } from "@elev9/api-client";

import { getAccessToken } from "../storage/token-storage";

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is required. Define it in apps/mobile/.env.",
  );
}

export const apiClient = createApiClient({
  baseUrl,
  getAccessToken,
});
