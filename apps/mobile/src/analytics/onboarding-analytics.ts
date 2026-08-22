import {
  productAnalytics,
  type ProductAnalytics,
  type ProductAnalyticsEventMap,
  type ProductAnalyticsEventName,
} from './product-analytics';

export const ONBOARDING_ANALYTICS_SCHEMA_VERSION =
  'onboarding-activation.v1' as const;

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

export type OnboardingAnalyticsErrorCategory =
  | 'network'
  | 'authentication'
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'server'
  | 'unknown';

export type OnboardingAnalyticsContext = {
  flowSessionId: string;
  mode: OnboardingAnalyticsMode;
};

type OnboardingEventName = Extract<
  ProductAnalyticsEventName,
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'registration_started'
  | 'registration_completed'
  | 'profile_started'
  | 'profile_completed'
  | 'nutrition_started'
  | 'nutrition_completed'
  | 'plan_created'
  | 'onboarding_resumed'
  | 'onboarding_abandoned'
  | 'home_reached'
  | 'first_workout_started'
  | 'first_workout_completed'
  | 'onboarding_error'
  | 'session_expired_during_onboarding'
  | 'demo_started'
  | 'demo_completed'
  | 'demo_reset'
>;

type OnboardingEventProperties = {
  [EventName in OnboardingEventName]: ProductAnalyticsEventMap[EventName];
};

export type OnboardingAnalytics = {
  begin(mode: OnboardingAnalyticsMode): OnboardingAnalyticsContext;
  resume(context: OnboardingAnalyticsContext): OnboardingAnalyticsContext;
  reset(): void;
  getContext(): OnboardingAnalyticsContext | null;
  ensureContext(mode: OnboardingAnalyticsMode): OnboardingAnalyticsContext;
  hasEmitted(eventName: OnboardingEventName): boolean;
  track<EventName extends OnboardingEventName>(
    eventName: EventName,
    properties: OnboardingEventProperties[EventName],
  ): void;
};

export function trackOnboardingEvent<EventName extends OnboardingEventName>(
  eventName: EventName,
  properties: Omit<
    OnboardingEventProperties[EventName],
    keyof OnboardingAnalyticsContext | 'schemaVersion'
  >,
  mode: OnboardingAnalyticsMode = 'real',
  analytics: OnboardingAnalytics = onboardingAnalytics,
): void {
  const context = analytics.ensureContext(mode);
  analytics.track(eventName, {
    schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
    ...context,
    ...properties,
  } as OnboardingEventProperties[EventName]);
}

export function createOnboardingAnalytics(
  analytics: ProductAnalytics = productAnalytics,
): OnboardingAnalytics {
  let context: OnboardingAnalyticsContext | null = null;
  const emittedKeys = new Set<string>();

  return {
    begin(mode) {
      context = {
        flowSessionId: createFlowSessionId(),
        mode,
      };
      emittedKeys.clear();
      return context;
    },

    resume(nextContext) {
      context = nextContext;
      emittedKeys.clear();
      emittedKeys.add(
        `onboarding_started|${nextContext.flowSessionId}|${nextContext.mode}|`,
      );
      return nextContext;
    },

    reset() {
      context = null;
      emittedKeys.clear();
    },

    getContext() {
      return context;
    },

    ensureContext(mode) {
      return context ?? this.begin(mode);
    },

    hasEmitted(eventName) {
      return [...emittedKeys].some((key) => key.startsWith(`${eventName}|`));
    },

    track(eventName, properties) {
      if (!context) {
        return;
      }

      const dedupeKey = buildDedupeKey(eventName, properties, context);
      if (emittedKeys.has(dedupeKey)) {
        return;
      }

      emittedKeys.add(dedupeKey);
      analytics.track(
        eventName as ProductAnalyticsEventName,
        properties as never,
      );
    },
  };
}

export const onboardingAnalytics = createOnboardingAnalytics();

export function getOnboardingErrorCategory(
  error: unknown,
): OnboardingAnalyticsErrorCategory {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    const status = error.status;
    if (status === 0) return 'network';
    if (status === 401) return 'authentication';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conflict';
    if (status >= 500) return 'server';
    if (status >= 400) return 'validation';
  }

  return 'unknown';
}

function buildDedupeKey(
  eventName: OnboardingEventName,
  properties: OnboardingEventProperties[OnboardingEventName],
  context: OnboardingAnalyticsContext,
): string {
  const eventProperties = properties as Record<string, unknown>;
  const discriminator = [
    eventProperties.stage,
    eventProperties.errorCategory,
    eventProperties.resumeReason,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(':');

  return `${eventName}|${context.flowSessionId}|${context.mode}|${discriminator}`;
}

function createFlowSessionId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `onb-${Date.now().toString(36)}-${randomPart}`;
}
