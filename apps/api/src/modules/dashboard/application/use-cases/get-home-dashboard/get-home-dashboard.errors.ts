export const GET_HOME_DASHBOARD_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'DASHBOARD_INTERNAL_ERROR',
} as const;

export type GetHomeDashboardErrorCode =
  (typeof GET_HOME_DASHBOARD_ERROR_CODES)[keyof typeof GET_HOME_DASHBOARD_ERROR_CODES];

export class GetHomeDashboardError extends Error {
  readonly code: GetHomeDashboardErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetHomeDashboardErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetHomeDashboardError';
    this.code = code;
    this.details = details;
  }
}
