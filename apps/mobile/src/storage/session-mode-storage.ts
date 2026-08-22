import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionMode = 'real' | 'demo';

const SESSION_MODE_KEY = 'elev9.session-mode.v1';

export async function getSessionMode(): Promise<SessionMode> {
  try {
    return (await AsyncStorage.getItem(SESSION_MODE_KEY)) === 'demo'
      ? 'demo'
      : 'real';
  } catch {
    return 'real';
  }
}

export async function setSessionMode(mode: SessionMode): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_MODE_KEY, mode);
  } catch {
    // Session mode is a safety hint; auth remains the source of truth.
  }
}

export async function clearSessionMode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_MODE_KEY);
  } catch {
    // Logout continues even when local cleanup is unavailable.
  }
}
