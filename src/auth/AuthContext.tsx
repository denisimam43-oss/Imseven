import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "../firebase";
import type { Role } from "../types";
import { hasLocalPassword, setLocalPassword, verifyLocalPassword } from "./localAuth";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

type Status = "loading" | "signedOut" | "noRole" | "ready";

interface AuthState {
  status: Status;
  user?: AuthUser;
  pendingEmail?: string; // akun sudah login tetapi belum diberi peran
  mode: "firebase" | "local";
  localHasPassword: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInLocal: (password: string) => Promise<void>;
  createLocalPassword: (password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const LOCAL_SESSION = "finance_admin_logged_in";
const LOCAL_USER: AuthUser = { uid: "local", email: "", name: "Admin (mode lokal)", role: "OWNER" };
const ROLES: Role[] = ["OWNER", "FINANCE", "AKUNTAN"];

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(
    firebaseEnabled ? "loading" : sessionStorage.getItem(LOCAL_SESSION) === "true" ? "ready" : "signedOut",
  );
  const [user, setUser] = useState<AuthUser | undefined>(
    !firebaseEnabled && sessionStorage.getItem(LOCAL_SESSION) === "true" ? LOCAL_USER : undefined,
  );
  const [pendingEmail, setPendingEmail] = useState<string | undefined>();
  const [localHasPassword, setLocalHasPassword] = useState(hasLocalPassword());

  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(undefined);
        setStatus("signedOut");
        return;
      }
      setStatus("loading");
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const data = snap.exists() ? (snap.data() as { role?: Role; name?: string }) : undefined;
        if (data?.role && ROLES.includes(data.role)) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || "",
            name: data.name || fbUser.email || "Pengguna",
            role: data.role,
          });
          setStatus("ready");
        } else {
          setPendingEmail(fbUser.email || "");
          setUser(undefined);
          setStatus("noRole");
        }
      } catch {
        setPendingEmail(fbUser.email || "");
        setUser(undefined);
        setStatus("noRole");
      }
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      pendingEmail,
      mode: firebaseEnabled ? "firebase" : "local",
      localHasPassword,
      signInEmail: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch {
          throw new Error("Email atau kata sandi salah.");
        }
      },
      signInLocal: async (password) => {
        if (!(await verifyLocalPassword(password))) throw new Error("Kata sandi salah.");
        sessionStorage.setItem(LOCAL_SESSION, "true");
        setUser(LOCAL_USER);
        setStatus("ready");
      },
      createLocalPassword: async (password) => {
        if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
        await setLocalPassword(password);
        setLocalHasPassword(true);
        sessionStorage.setItem(LOCAL_SESSION, "true");
        setUser(LOCAL_USER);
        setStatus("ready");
      },
      changePassword: async (password) => {
        if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
        if (firebaseEnabled) {
          if (!auth.currentUser) throw new Error("Belum login.");
          try {
            await updatePassword(auth.currentUser, password);
          } catch {
            throw new Error("Gagal mengubah sandi. Logout, login ulang, lalu coba lagi.");
          }
        } else {
          await setLocalPassword(password);
        }
      },
      signOut: async () => {
        if (firebaseEnabled) {
          await fbSignOut(auth);
        } else {
          sessionStorage.removeItem(LOCAL_SESSION);
          setUser(undefined);
          setStatus("signedOut");
        }
      },
    }),
    [status, user, pendingEmail, localHasPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
