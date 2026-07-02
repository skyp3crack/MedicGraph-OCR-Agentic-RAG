"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// --- Types ---
export interface User {
  email: string;
  name: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string) => Promise<AuthResult>;
  logout: () => void;
}

// --- Constants ---
const STORAGE_KEY = "medicograph_auth";
const USERS_STORAGE_KEY = "medicograph_users";

// Default testing user
const DEFAULT_TEST_USER = {
  email: "admin@medicograph.dev",
  password: "admin123",
  name: "Dr. Admin",
};

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helper: get registered users from localStorage ---
function getRegisteredUsers(): Array<{ email: string; password: string; name: string }> {
  if (typeof window === "undefined") return [DEFAULT_TEST_USER];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const users = JSON.parse(raw);
      // Ensure default test user always exists
      const hasDefault = users.some((u: { email: string }) => u.email === DEFAULT_TEST_USER.email);
      if (!hasDefault) users.push(DEFAULT_TEST_USER);
      return users;
    }
  } catch {
    // ignore parse errors
  }
  return [DEFAULT_TEST_USER];
}

function saveRegisteredUsers(users: Array<{ email: string; password: string; name: string }>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// --- Provider ---
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed?.email) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Simulate network delay for realism
    await new Promise((resolve) => setTimeout(resolve, 800));

    const users = getRegisteredUsers();
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!matchedUser) {
      return { success: false, error: "Invalid email or password. Please try again." };
    }

    const sessionUser: User = { email: matchedUser.email, name: matchedUser.name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return { success: true };
  }, []);

  // Signup handler
  const signup = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const users = getRegisteredUsers();

    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Register new user
    const newUser = { email, password, name };
    users.push(newUser);
    saveRegisteredUsers(users);

    // Auto-login
    const sessionUser: User = { email, name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return { success: true };
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.push("/signin");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook ---
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
