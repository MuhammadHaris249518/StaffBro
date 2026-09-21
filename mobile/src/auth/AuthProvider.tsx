import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { api, type User } from "../api/client";
import { setAccessToken } from "../api/session";

const TOKEN_KEY = "staffbro.access";

type AuthState = {
  ready: boolean;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setAccessToken(stored);
          const me = await api.me();
          setUser(me);
        }
      } catch {
        setAccessToken(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function signIn(token: string, next: User) {
    setAccessToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser(next);
  }

  async function refreshUser() {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      await signOut();
    }
  }

  async function signOut() {
    setAccessToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }

  return <AuthContext.Provider value={{ ready, user, signIn, signOut, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function useRequireRole(role: "WORKER" | "BUSINESS") {
  const { ready, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "BUSINESS" ? "/(business)/(tabs)/jobs" : "/(worker)/(tabs)/jobs");
    }
  }, [ready, user, role, router]);
  return { ready, user };
}
