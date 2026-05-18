export type GetAccessToken = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export type CreateHttpClientOptions = {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
    this.name = 'ApiClientError';
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export type HttpClient = {
  request<TResponse>(options: RequestOptions): Promise<TResponse>;
};

export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    async request<TResponse>(
      requestOptions: RequestOptions,
    ): Promise<TResponse> {
      try {
        const token = options.getAccessToken
          ? await options.getAccessToken()
          : null;

        const response = await fetch(
          `${normalizedBaseUrl}${requestOptions.path}`,
          {
            method: requestOptions.method ?? 'GET',
            headers: {
              ...(requestOptions.body
                ? { 'Content-Type': 'application/json' }
                : {}),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...requestOptions.headers,
            },
            body:
              requestOptions.body === undefined
                ? undefined
                : JSON.stringify(requestOptions.body),
          },
        );

        const payload = await parseJsonResponse(response);

        if (!response.ok) {
          throw createApiClientError(response.status, payload);
        }

        return payload as TResponse;
      } catch (error) {
        if (error instanceof ApiClientError) {
          throw error;
        }

        throw new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the Elev9 API.',
          status: 0,
        });
      }
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === 'object' && value !== null;
}

function createApiClientError(
  status: number,
  payload: unknown,
): ApiClientError {
  const errorPayload = isErrorPayload(payload) ? payload : {};

  return new ApiClientError({
    code: errorPayload.code ?? defaultErrorCode(status),
    message: errorPayload.message ?? defaultErrorMessage(status),
    status,
    details: errorPayload.details,
  });
}

function defaultErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'API_ERROR';
  }
}

function defaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request.';
    case 401:
      return 'Authentication required.';
    case 403:
      return 'You do not have access to this resource.';
    case 404:
      return 'Requested resource was not found.';
    case 409:
      return 'The request conflicts with current data.';
    default:
      return 'API request failed.';
  }
}
