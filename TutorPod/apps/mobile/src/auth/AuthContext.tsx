import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api/client";
import type { User } from "../api/types";
import { kvDelete, kvGet, kvSet } from "./kvStore";

type Session = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, code: string) => Promise<User>;
  requestOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateStandard: (standardId: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const KEY = "tutorpod.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = (async () => {
      try {
        const raw = await kvGet(KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Session;
          setSession(parsed);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    const failSafe = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      void boot;
    };
  }, []);

  const persist = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s) await kvSet(KEY, JSON.stringify(s));
    else await kvDelete(KEY);
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    await api("/api/v1/auth/otp/request", { body: { email } });
  }, []);

  const signIn = useCallback(
    async (email: string, code: string) => {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>("/api/v1/auth/otp/verify", { body: { email, code } });
      await persist({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      return res.user;
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    try {
      if (session) {
        await api("/api/v1/auth/logout", {
          method: "POST",
          token: session.accessToken,
          body: { refreshToken: session.refreshToken },
        });
      }
    } catch {
      /* ignore */
    }
    await persist(null);
  }, [persist, session]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const user = await api<User>("/api/v1/me", { token: session.accessToken });
    await persist({ ...session, user });
  }, [persist, session]);

  const updateStandard = useCallback(
    async (standardId: string) => {
      if (!session) return;
      const user = await api<User>("/api/v1/me", {
        method: "PATCH",
        token: session.accessToken,
        body: { standardId },
      });
      await persist({ ...session, user: { ...session.user, ...user } });
    },
    [persist, session],
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!session) return;
      const user = await api<User>("/api/v1/me", {
        method: "PATCH",
        token: session.accessToken,
        body: { name },
      });
      await persist({ ...session, user: { ...session.user, ...user } });
    },
    [persist, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      isAuthenticated: !!session,
      signIn,
      requestOtp,
      signOut,
      refreshProfile,
      updateStandard,
      updateName,
    }),
    [
      ready,
      session,
      signIn,
      requestOtp,
      signOut,
      refreshProfile,
      updateStandard,
      updateName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
