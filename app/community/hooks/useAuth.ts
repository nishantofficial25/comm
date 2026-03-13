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
  // Broadcast to all other tabs: a new login happened → they should log out
  try {
    localStorage.setItem("sv_login_event", Date.now().toString());
  } catch {}
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

    // Listen for login/logout events dispatched within the same tab
    const handler = () => fetchMe();
    window.addEventListener("sv_auth_change", handler);

    // Listen for login events from OTHER tabs via localStorage
    // When another tab logs in, sv_login_event changes → force logout here
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sv_login_event") {
        // Another tab just logged in — log out this tab immediately
        clearToken();
        // Also stop any running timer to prevent phantom time
        localStorage.removeItem("sv_running_timer");
        setState({ user: null, loading: false, error: null });
        window.dispatchEvent(new Event("sv_auth_change"));
        window.dispatchEvent(new Event("sv_timer_stopped"));
        window.dispatchEvent(new Event("sv_force_logout"));
      }
      if (e.key === "sv_token" && !e.newValue) {
        // Token was cleared in another tab (logout)
        setState({ user: null, loading: false, error: null });
        localStorage.removeItem("sv_running_timer");
        window.dispatchEvent(new Event("sv_timer_stopped"));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("sv_auth_change", handler);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchMe]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("sv_running_timer");
    setState({ user: null, loading: false, error: null });
    window.dispatchEvent(new Event("sv_auth_change"));
    window.dispatchEvent(new Event("sv_timer_stopped"));
  }, []);

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
