"use client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { userRef } from "@/lib/db";
import { auth } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean; // true until we know both the auth state and the profile
}

const Ctx = createContext<AuthState>({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setProfileReady(false);
        setAuthReady(true);
        if (!u) setProfile(null);
      }),
    [],
  );

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      userRef(user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setProfileReady(true);
      },
      () => setProfileReady(true),
    );
  }, [user]);

  const loading = !authReady || (!!user && !profileReady);
  return <Ctx.Provider value={{ user, profile, loading }}>{children}</Ctx.Provider>;
}
