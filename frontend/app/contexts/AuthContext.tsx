"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loginApi, signupApi } from "../utils/api";

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
const TOKEN_KEY = "medicograph_token";

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (stored && token) {
        const parsed = JSON.parse(stored) as User;
        if (parsed?.email) {
          setUser(parsed);
        }
      } else {
        // Clear if only one of them exists
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const result = await loginApi(email, password);
      
      const sessionUser: User = { email: result.user.email, name: result.user.name };
      localStorage.setItem(TOKEN_KEY, result.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      
      setUser(sessionUser);
      return { success: true };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || "Invalid email or password. Please try again." 
      };
    }
  }, []);

  // Signup handler
  const signup = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const result = await signupApi(email, password, name);
      
      const sessionUser: User = { email: result.user.email, name: result.user.name };
      localStorage.setItem(TOKEN_KEY, result.access_token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      
      setUser(sessionUser);
      return { success: true };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.message || "Failed to register clinician account." 
      };
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
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
