import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_OWNER_KEY = 'elev9.session-owner.v1';

export async function getSessionOwnerKey(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_OWNER_KEY);
  } catch {
    return null;
  }
}

export async function ensureSessionOwnerKey(): Promise<string> {
  const existing = await getSessionOwnerKey();
  if (existing) {
    return existing;
  }

  const ownerKey = createOpaqueOwnerKey();
  try {
    await AsyncStorage.setItem(SESSION_OWNER_KEY, ownerKey);
  } catch {
    // The in-memory value still allows the current session to function.
  }
  return ownerKey;
}

export async function createSessionOwnerKey(): Promise<string> {
  const ownerKey = createOpaqueOwnerKey();
  try {
    await AsyncStorage.setItem(SESSION_OWNER_KEY, ownerKey);
  } catch {
    // Cache persistence is optional and must not block authentication.
  }
  return ownerKey;
}

export async function clearSessionOwnerKey(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_OWNER_KEY);
  } catch {
    // Logout must continue even when local storage is unavailable.
  }
}

function createOpaqueOwnerKey(): string {
  return `session-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}
