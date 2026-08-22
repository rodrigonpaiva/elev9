import type {
  DailyCheckInMode,
  DailyCheckInStep,
} from '../features/daily-check-in/models/daily-check-in-analytics';

export type ProductAnalyticsEventMap = {
  onboarding_started: OnboardingAnalyticsEventBase;
  onboarding_completed: OnboardingAnalyticsEventBase;
  registration_started: OnboardingAnalyticsEventBase;
  registration_completed: OnboardingAnalyticsEventBase;
  profile_started: OnboardingAnalyticsEventBase;
  profile_completed: OnboardingAnalyticsEventBase;
  nutrition_started: OnboardingAnalyticsEventBase;
  nutrition_completed: OnboardingAnalyticsEventBase;
  plan_created: OnboardingAnalyticsEventBase;
  onboarding_resumed: OnboardingAnalyticsEventBase & {
    resumeReason: 'partial_state' | 'app_reopened';
  };
  onboarding_abandoned: OnboardingAnalyticsEventBase & {
    stage: OnboardingAnalyticsStage;
  };
  home_reached: OnboardingAnalyticsEventBase;
  first_workout_started: OnboardingAnalyticsEventBase;
  first_workout_completed: OnboardingAnalyticsEventBase;
  onboarding_error: OnboardingAnalyticsEventBase & {
    stage: OnboardingAnalyticsStage;
    errorCategory:
      | 'network'
      | 'authentication'
      | 'validation'
      | 'conflict'
      | 'not_found'
      | 'server'
      | 'unknown';
  };
  session_expired_during_onboarding: OnboardingAnalyticsEventBase & {
    stage: OnboardingAnalyticsStage;
  };
  demo_started: OnboardingAnalyticsEventBase;
  demo_completed: OnboardingAnalyticsEventBase;
  demo_reset: OnboardingAnalyticsEventBase;
  nutrition_dashboard_card_viewed: {
    screen: 'dashboard';
    component: 'nutrition_card';
    availability:
      | 'available'
      | 'insufficient_data'
      | 'not_configured'
      | 'not_available'
      | 'processing_failed';
    freshness: 'current' | 'stale' | 'legacy' | 'unknown';
    source: 'canonical_read_model';
  };
  nutrition_dashboard_load_result: {
    outcome: 'success' | 'failure';
    availability:
      | 'available'
      | 'insufficient_data'
      | 'not_configured'
      | 'not_available'
      | 'processing_failed';
    freshness: 'current' | 'stale' | 'legacy' | 'unknown';
    source: 'canonical_read_model';
    safeErrorCode?: 'NUTRITION_LOAD_FAILED' | 'NUTRITION_CONTRACT_INVALID';
  };
  nutrition_dashboard_refresh_result: {
    refreshType: 'dashboard_refresh' | 'manual_refresh' | 'retry';
    outcome: 'success' | 'failure';
    availability?:
      | 'available'
      | 'insufficient_data'
      | 'not_configured'
      | 'not_available'
      | 'processing_failed';
    freshness?: 'current' | 'stale' | 'legacy' | 'unknown';
    safeErrorCode?: 'NUTRITION_LOAD_FAILED' | 'NUTRITION_CONTRACT_INVALID';
  };
  nutrition_dashboard_retry_selected: {
    source: 'dashboard_nutrition_card';
    previousOutcome: 'failure' | 'not_available' | 'processing_failed';
  };
  nutrition_dashboard_action_selected: {
    actionType:
      | 'open_profile'
      | 'create_plan'
      | 'open_today_meals'
      | 'log_meal'
      | 'open_hydration'
      | 'none'
      | 'unknown';
    navigationDestination:
      | 'nutrition_profile'
      | 'nutrition_plan'
      | 'today_meals'
      | 'log_meal'
      | 'hydration'
      | 'none'
      | 'unavailable';
    outcome: 'accepted' | 'unavailable';
  };
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
  daily_workout_error: {
    mode: 'real' | 'demo';
    stage: 'home' | 'workout' | 'timer' | 'completion';
    errorCategory:
      | 'network'
      | 'authentication'
      | 'validation'
      | 'server'
      | 'unknown';
  };
  daily_workout_retry_selected: {
    mode: 'real' | 'demo';
    stage: 'home' | 'workout' | 'timer' | 'completion';
    retryTarget: 'load' | 'sync' | 'save' | 'recovery';
  };
  daily_workout_session_expired: {
    mode: 'real' | 'demo';
    stage: 'workout' | 'timer' | 'completion';
  };
  daily_workout_recovery_pending: {
    mode: 'real' | 'demo';
    stage: 'completion';
  };
  daily_workout_completion_confirmed: {
    mode: 'real' | 'demo';
  };
};

export type OnboardingAnalyticsMode = 'real' | 'demo';
export type OnboardingAnalyticsStage =
  | 'login'
  | 'registration'
  | 'profile'
  | 'fitness_profile'
  | 'training_plan'
  | 'nutrition'
  | 'home'
  | 'workout';

type OnboardingAnalyticsEventBase = {
  schemaVersion: 'onboarding-activation.v1';
  flowSessionId: string;
  mode: OnboardingAnalyticsMode;
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
  onboarding_started: ['schemaVersion', 'flowSessionId', 'mode'],
  onboarding_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  registration_started: ['schemaVersion', 'flowSessionId', 'mode'],
  registration_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  profile_started: ['schemaVersion', 'flowSessionId', 'mode'],
  profile_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  nutrition_started: ['schemaVersion', 'flowSessionId', 'mode'],
  nutrition_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  plan_created: ['schemaVersion', 'flowSessionId', 'mode'],
  onboarding_resumed: [
    'schemaVersion',
    'flowSessionId',
    'mode',
    'resumeReason',
  ],
  onboarding_abandoned: ['schemaVersion', 'flowSessionId', 'mode', 'stage'],
  home_reached: ['schemaVersion', 'flowSessionId', 'mode'],
  first_workout_started: ['schemaVersion', 'flowSessionId', 'mode'],
  first_workout_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  onboarding_error: [
    'schemaVersion',
    'flowSessionId',
    'mode',
    'stage',
    'errorCategory',
  ],
  session_expired_during_onboarding: [
    'schemaVersion',
    'flowSessionId',
    'mode',
    'stage',
  ],
  demo_started: ['schemaVersion', 'flowSessionId', 'mode'],
  demo_completed: ['schemaVersion', 'flowSessionId', 'mode'],
  demo_reset: ['schemaVersion', 'flowSessionId', 'mode'],
  nutrition_dashboard_card_viewed: [
    'screen',
    'component',
    'availability',
    'freshness',
    'source',
  ],
  nutrition_dashboard_load_result: [
    'outcome',
    'availability',
    'freshness',
    'source',
    'safeErrorCode',
  ],
  nutrition_dashboard_refresh_result: [
    'refreshType',
    'outcome',
    'availability',
    'freshness',
    'safeErrorCode',
  ],
  nutrition_dashboard_retry_selected: ['source', 'previousOutcome'],
  nutrition_dashboard_action_selected: [
    'actionType',
    'navigationDestination',
    'outcome',
  ],
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
  daily_workout_error: ['mode', 'stage', 'errorCategory'],
  daily_workout_retry_selected: ['mode', 'stage', 'retryTarget'],
  daily_workout_session_expired: ['mode', 'stage'],
  daily_workout_recovery_pending: ['mode', 'stage'],
  daily_workout_completion_confirmed: ['mode'],
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
