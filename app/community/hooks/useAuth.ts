"use client";
import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  uid: string; // Google sub
  email: string;
  googleName: string; // from Google
  displayName: string; // editable by user
  picture: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const API = "https://api.hindanbazar.cloud";

// Store token in localStorage
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sv_token");
}
export function setToken(t: string) {
  localStorage.setItem("sv_token", t);
}
export function clearToken() {
  localStorage.removeItem("sv_token");
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const r = await fetch(`${API}/api/void/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        clearToken();
        setState({ user: null, loading: false, error: null });
        return;
      }
      const d = await r.json();
      setState({ user: d.user, loading: false, error: null });
    } catch {
      setState({ user: null, loading: false, error: "Network error" });
    }
  }, []);

  useEffect(() => {
    fetchMe();
    // Listen for login/logout events
    const handler = () => fetchMe();
    window.addEventListener("sv_auth_change", handler);
    return () => window.removeEventListener("sv_auth_change", handler);
  }, [fetchMe]);

  const logout = () => {
    clearToken();
    setState({ user: null, loading: false, error: null });
    window.dispatchEvent(new Event("sv_auth_change"));
  };

  const updateProfile = async (displayName: string) => {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${API}/api/void/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ displayName }),
    });
    if (r.ok) {
      const d = await r.json();
      setState((s) => ({ ...s, user: d.user }));
    }
  };

  return { ...state, logout, updateProfile, refetch: fetchMe };
}
