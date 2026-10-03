import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

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
    sessionRef.current = s;
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
    const current = sessionRef.current;
    try {
      if (current) {
        await api("/api/v1/auth/logout", {
          method: "POST",
          token: current.accessToken,
          body: { refreshToken: current.refreshToken },
        });
      }
    } catch {
      /* ignore */
    }
    await persist(null);
  }, [persist]);

  // Keep callbacks stable (session via ref) so Settings useEffect([token, refreshProfile])
  // does not re-fire on every persist and hammer /api/v1/me.
  const refreshProfile = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const user = await api<User>("/api/v1/me", {
      token: current.accessToken,
    });
    await persist({ ...current, user });
  }, [persist]);

  const updateStandard = useCallback(
    async (standardId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const user = await api<User>("/api/v1/me", {
        method: "PATCH",
        token: current.accessToken,
        body: { standardId },
      });
      await persist({ ...current, user: { ...current.user, ...user } });
    },
    [persist],
  );

  const updateName = useCallback(
    async (name: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const user = await api<User>("/api/v1/me", {
        method: "PATCH",
        token: current.accessToken,
        body: { name },
      });
      await persist({ ...current, user: { ...current.user, ...user } });
    },
    [persist],
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
