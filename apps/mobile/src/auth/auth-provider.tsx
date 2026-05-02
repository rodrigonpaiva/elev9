import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiClient } from "../api/client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../storage/token-storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  accessToken: string | null;
  status: AuthStatus;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let nextToken: string | null = null;

      try {
        nextToken = await getAccessToken();
      } catch (error) {
        console.error("AuthProvider bootstrap error:", error);
      } finally {
        if (isMounted) {
          setAccessTokenState(nextToken);
          setStatus(nextToken ? "authenticated" : "unauthenticated");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      status,
      async signIn(input) {
        const response = await apiClient.auth.login(input);

        await setAccessToken(response.accessToken);
        setAccessTokenState(response.accessToken);
        setStatus("authenticated");
      },
      async signOut() {
        setStatus("loading");

        try {
          await clearAccessToken();
        } finally {
          setAccessTokenState(null);
          setStatus("unauthenticated");
        }
      },
    }),
    [accessToken, status],
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
