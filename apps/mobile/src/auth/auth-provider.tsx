import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiClient, } from "../api/client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../storage/token-storage";

type AuthContextValue = {
  accessToken: string | null;
  isBootstrapping: boolean;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const token = await getAccessToken();

      if (isMounted) {
        setAccessTokenState(token);
        setIsBootstrapping(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isBootstrapping,
      async signIn(input) {
        const response = await apiClient.auth.login(input);

        await setAccessToken(response.accessToken);
        setAccessTokenState(response.accessToken);
      },
      async signOut() {
        await clearAccessToken();
        setAccessTokenState(null);
      },
    }),
    [accessToken, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
