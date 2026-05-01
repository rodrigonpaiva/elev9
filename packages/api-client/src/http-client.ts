export type GetAccessToken = () => string | null | undefined | Promise<string | null | undefined>;

export type CreateHttpClientOptions = {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type ErrorPayload = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export type HttpClient = {
  request<TResponse>(options: RequestOptions): Promise<TResponse>;
};

export function createHttpClient(
  options: CreateHttpClientOptions,
): HttpClient {
  const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    async request<TResponse>(requestOptions: RequestOptions): Promise<TResponse> {
      const token = options.getAccessToken
        ? await options.getAccessToken()
        : null;

      const response = await fetch(`${normalizedBaseUrl}${requestOptions.path}`, {
        method: requestOptions.method ?? "GET",
        headers: {
          ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...requestOptions.headers,
        },
        body:
          requestOptions.body === undefined
            ? undefined
            : JSON.stringify(requestOptions.body),
      });

      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        const errorPayload = isErrorPayload(payload) ? payload : {};

        throw new ApiClientError({
          code: errorPayload.code ?? "API_ERROR",
          message: errorPayload.message ?? "API request failed.",
          status: response.status,
          details: errorPayload.details,
        });
      }

      return payload as TResponse;
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === "object" && value !== null;
}
