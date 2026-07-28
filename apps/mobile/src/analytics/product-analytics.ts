import type {
  DailyCheckInMode,
  DailyCheckInStep,
} from '../features/daily-check-in/models/daily-check-in-analytics';

export type ProductAnalyticsEventMap = {
  recovery_dashboard_cta_selected: {
    entryPoint: 'dashboard';
  };
  recovery_screen_viewed: {
    entryPoint: 'dashboard' | 'daily_check_in' | 'navigation' | 'unknown';
  };
  recovery_refresh_requested: {
    trigger: 'pull_to_refresh';
  };
  recovery_retry_requested: {
    resource: 'current_and_history';
  };
  recovery_history_retry_requested: {
    resource: 'history';
  };
  recovery_check_in_cta_selected: {
    entryPoint: 'recovery';
  };
  daily_check_in_cta_viewed: {
    completionState: 'pending' | 'completed';
    entryPoint: 'dashboard';
  };
  daily_check_in_cta_selected: {
    completionState: 'pending' | 'completed';
    entryPoint: 'dashboard';
  };
  daily_check_in_started: {
    mode: DailyCheckInMode;
    entryPoint: 'dashboard' | 'other';
    flowSessionId: string;
  };
  daily_check_in_step_viewed: {
    mode: DailyCheckInMode;
    step: DailyCheckInStep;
    stepIndex: number;
    totalSteps: number;
    flowSessionId: string;
  };
  daily_check_in_step_completed: {
    mode: DailyCheckInMode;
    step: DailyCheckInStep;
    stepIndex: number;
    totalSteps: number;
    flowSessionId: string;
  };
  daily_check_in_submit_started: {
    mode: DailyCheckInMode;
    attemptNumber: number;
    flowSessionId: string;
  };
  daily_check_in_submit_succeeded: {
    mode: DailyCheckInMode;
    attemptNumber: number;
    durationMs: number;
    flowSessionId: string;
  };
  daily_check_in_submit_failed: {
    mode: DailyCheckInMode;
    attemptNumber: number;
    durationMs: number;
    errorCategory:
      | 'network'
      | 'authentication'
      | 'profile_unavailable'
      | 'validation'
      | 'recovery_processing'
      | 'server'
      | 'unknown';
    flowSessionId: string;
  };
  daily_check_in_retry_selected: {
    mode: DailyCheckInMode;
    previousErrorCategory: ProductAnalyticsEventMap['daily_check_in_submit_failed']['errorCategory'];
    attemptNumber: number;
    flowSessionId: string;
  };
  daily_check_in_success_viewed: {
    mode: DailyCheckInMode;
    flowSessionId: string;
  };
  daily_check_in_exited: {
    mode: DailyCheckInMode;
    lastStep: DailyCheckInStep;
    completed: boolean;
    hadUnsavedChanges: boolean;
    elapsedMs: number;
    flowSessionId: string;
  };
  daily_check_in_draft_restored: {
    source: 'draft' | 'pending';
  };
  daily_check_in_queued: {
    trigger: 'manual' | 'initial_load';
  };
  daily_check_in_sync_started: {
    trigger: 'manual' | 'foreground' | 'connectivity' | 'initial_load';
    attemptNumber: number;
  };
  daily_check_in_sync_succeeded: {
    trigger: 'manual' | 'foreground' | 'connectivity' | 'initial_load';
    attemptNumber: number;
  };
  daily_check_in_sync_failed: {
    trigger: 'manual' | 'foreground' | 'connectivity' | 'initial_load';
    attemptNumber: number;
    errorCategory: string;
  };
  daily_check_in_pending_discarded: {
    source: 'draft' | 'pending';
  };
};

export type ProductAnalyticsEventName = keyof ProductAnalyticsEventMap;

export interface ProductAnalytics {
  track<EventName extends ProductAnalyticsEventName>(
    eventName: EventName,
    properties: ProductAnalyticsEventMap[EventName],
  ): void;
}

export const PRODUCT_ANALYTICS_FORBIDDEN_PROPERTIES = [
  'energyLevel',
  'sleepQuality',
  'muscleSoreness',
  'motivationLevel',
  'notes',
  'recoveryScore',
  'readinessScore',
  'score',
  'category',
  'breakdown',
  'factor',
  'trend',
  'insight',
  'sourceContext',
  'requestBody',
  'responseBody',
  'payload',
  'userProfileId',
  'email',
  'name',
  'token',
  'prompt',
] as const;

const PRODUCT_ANALYTICS_ALLOWED_PROPERTIES: {
  [EventName in ProductAnalyticsEventName]: readonly string[];
} = {
  recovery_dashboard_cta_selected: ['entryPoint'],
  recovery_screen_viewed: ['entryPoint'],
  recovery_refresh_requested: ['trigger'],
  recovery_retry_requested: ['resource'],
  recovery_history_retry_requested: ['resource'],
  recovery_check_in_cta_selected: ['entryPoint'],
  daily_check_in_cta_viewed: ['completionState', 'entryPoint'],
  daily_check_in_cta_selected: ['completionState', 'entryPoint'],
  daily_check_in_started: ['mode', 'entryPoint', 'flowSessionId'],
  daily_check_in_step_viewed: [
    'mode',
    'step',
    'stepIndex',
    'totalSteps',
    'flowSessionId',
  ],
  daily_check_in_step_completed: [
    'mode',
    'step',
    'stepIndex',
    'totalSteps',
    'flowSessionId',
  ],
  daily_check_in_submit_started: ['mode', 'attemptNumber', 'flowSessionId'],
  daily_check_in_submit_succeeded: [
    'mode',
    'attemptNumber',
    'durationMs',
    'flowSessionId',
  ],
  daily_check_in_submit_failed: [
    'mode',
    'attemptNumber',
    'durationMs',
    'errorCategory',
    'flowSessionId',
  ],
  daily_check_in_retry_selected: [
    'mode',
    'previousErrorCategory',
    'attemptNumber',
    'flowSessionId',
  ],
  daily_check_in_success_viewed: ['mode', 'flowSessionId'],
  daily_check_in_exited: [
    'mode',
    'lastStep',
    'completed',
    'hadUnsavedChanges',
    'elapsedMs',
    'flowSessionId',
  ],
  daily_check_in_draft_restored: ['source'],
  daily_check_in_queued: ['trigger'],
  daily_check_in_sync_started: ['trigger', 'attemptNumber'],
  daily_check_in_sync_succeeded: ['trigger', 'attemptNumber'],
  daily_check_in_sync_failed: ['trigger', 'attemptNumber', 'errorCategory'],
  daily_check_in_pending_discarded: ['source'],
};

type ProductAnalyticsProvider = ProductAnalytics & {
  track: ProductAnalytics['track'];
};

export class NoopProductAnalytics implements ProductAnalytics {
  track<EventName extends ProductAnalyticsEventName>(
    _eventName: EventName,
    _properties: ProductAnalyticsEventMap[EventName],
  ): void {}
}

class SafeProductAnalytics implements ProductAnalytics {
  constructor(
    private readonly provider: ProductAnalyticsProvider,
    private readonly enabled: boolean,
  ) {}

  track<EventName extends ProductAnalyticsEventName>(
    eventName: EventName,
    properties: ProductAnalyticsEventMap[EventName],
  ): void {
    if (
      !this.enabled ||
      containsForbiddenProperty(properties) ||
      !hasOnlyAllowedProperties(eventName, properties)
    ) {
      return;
    }

    try {
      this.provider.track(eventName, properties);
    } catch {
      // Product analytics must never affect the product flow.
    }
  }
}

const noopProductAnalytics = new NoopProductAnalytics();

export const productAnalytics: ProductAnalytics = new SafeProductAnalytics(
  noopProductAnalytics,
  false,
);

export function createProductAnalytics(
  provider: ProductAnalyticsProvider = noopProductAnalytics,
  enabled = false,
): ProductAnalytics {
  return new SafeProductAnalytics(provider, enabled);
}

export function containsForbiddenProperty(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    if (
      (PRODUCT_ANALYTICS_FORBIDDEN_PROPERTIES as readonly string[]).includes(
        key,
      )
    ) {
      return true;
    }

    return containsForbiddenProperty(nestedValue);
  });
}

function hasOnlyAllowedProperties<EventName extends ProductAnalyticsEventName>(
  eventName: EventName,
  properties: ProductAnalyticsEventMap[EventName],
): boolean {
  const allowed = PRODUCT_ANALYTICS_ALLOWED_PROPERTIES[eventName];

  return Object.keys(properties).every((key) => allowed.includes(key));
}
