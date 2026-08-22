import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearSessionMode,
  getSessionMode,
  setSessionMode,
} from './session-mode-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('session mode storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists and reads the demo marker without storing credentials', async () => {
    storage.getItem.mockResolvedValue('demo');
    await setSessionMode('demo');

    await expect(getSessionMode()).resolves.toBe('demo');
    expect(storage.setItem.mock.calls[0][1]).toBe('demo');
    expect(storage.setItem.mock.calls[0][1]).not.toMatch(
      /token|password|email/i,
    );
  });

  it('defaults unknown values to real and supports cleanup', async () => {
    storage.getItem.mockResolvedValue('unexpected');
    await expect(getSessionMode()).resolves.toBe('real');

    await clearSessionMode();
    expect(storage.removeItem).toHaveBeenCalled();
  });
});
