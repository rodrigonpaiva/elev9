import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_PROGRESS_KEY = 'elev9.onboarding-progress.v1';
export const ONBOARDING_PROGRESS_VERSION = 1 as const;

export type OnboardingProgressMode = 'real' | 'demo';
export type OnboardingProgressStage =
  | 'profile'
  | 'fitness_profile'
  | 'training_plan'
  | 'nutrition';

export type OnboardingProgress = {
  version: typeof ONBOARDING_PROGRESS_VERSION;
  ownerKey: string;
  mode: OnboardingProgressMode;
  stage: OnboardingProgressStage;
  flowSessionId: string;
  updatedAt: string;
};

export async function loadOnboardingProgress(
  ownerKey: string,
  mode: OnboardingProgressMode,
): Promise<OnboardingProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (
      !isProgress(value) ||
      value.ownerKey !== ownerKey ||
      value.mode !== mode
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

export async function saveOnboardingProgress(
  progress: Omit<OnboardingProgress, 'version' | 'updatedAt'>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_PROGRESS_KEY,
      JSON.stringify({
        ...progress,
        version: ONBOARDING_PROGRESS_VERSION,
        updatedAt: new Date().toISOString(),
      } satisfies OnboardingProgress),
    );
  } catch {
    // Analytics/progress persistence is best effort and never blocks onboarding.
  }
}

export async function clearOnboardingProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch {
    // Best effort cleanup.
  }
}

function isProgress(value: unknown): value is OnboardingProgress {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === ONBOARDING_PROGRESS_VERSION &&
    typeof candidate.ownerKey === 'string' &&
    (candidate.mode === 'real' || candidate.mode === 'demo') &&
    typeof candidate.stage === 'string' &&
    ['profile', 'fitness_profile', 'training_plan', 'nutrition'].includes(
      candidate.stage,
    ) &&
    typeof candidate.flowSessionId === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}
