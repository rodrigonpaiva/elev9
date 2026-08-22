import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  ONBOARDING_PROGRESS_KEY,
  saveOnboardingProgress,
} from './onboarding-progress-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('onboarding progress storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists only versioned, non-sensitive progress metadata', async () => {
    storage.getItem.mockResolvedValue(null);

    await saveOnboardingProgress({
      ownerKey: 'session-opaque',
      mode: 'real',
      stage: 'fitness_profile',
      flowSessionId: 'flow-1',
    });

    const serialized = storage.setItem.mock.calls[0][1];
    expect(serialized).toContain('"version":1');
    expect(serialized).toContain('"stage":"fitness_profile"');
    expect(serialized).not.toMatch(/password|token|email|name|weight|health/i);
  });

  it('loads only the matching owner and mode', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({
        version: 1,
        ownerKey: 'session-opaque',
        mode: 'real',
        stage: 'profile',
        flowSessionId: 'flow-1',
        updatedAt: '2026-08-22T00:00:00.000Z',
      }),
    );

    await expect(
      loadOnboardingProgress('session-opaque', 'real'),
    ).resolves.toMatchObject({
      stage: 'profile',
    });
    await expect(
      loadOnboardingProgress('other-session', 'real'),
    ).resolves.toBeNull();
    await expect(
      loadOnboardingProgress('session-opaque', 'demo'),
    ).resolves.toBeNull();
  });

  it('cleans up the versioned record after completion', async () => {
    await clearOnboardingProgress();
    expect(storage.removeItem).toHaveBeenCalledWith(ONBOARDING_PROGRESS_KEY);
  });
});
