"use client";
import { useEffect, useRef, useState } from "react";
import { API } from "../community/lib/utils";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface Props {
  onSuccess: () => void; // called after token is saved
  onNewUser: (setupToken: string, googleName: string, picture: string) => void; // new user needs name setup
  onError?: (msg: string) => void;
}

export default function GoogleSignInButton({
  onSuccess,
  onNewUser,
  onError,
}: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function handleCredential(resp: { credential: string }) {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/void/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: resp.credential }),
        });
        const d = await r.json();
        if (!r.ok) {
          onError?.(d.error || "Login failed");
          return;
        }

        if (d.isNew) {
          onNewUser(d.setupToken, d.googleName, d.picture);
        } else {
          localStorage.setItem("sv_token", d.token);
          window.dispatchEvent(new Event("sv_auth_change"));
          onSuccess();
        }
      } catch {
        onError?.("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    function initGSI() {
      if (cancelled || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "pill",
          text: "signin_with",
          width: btnRef.current.offsetWidth || 300,
        });
      }
      setReady(true);
    }

    // If GSI script already loaded
    if ((window as any).google?.accounts?.id) {
      initGSI();
      return;
    }

    // Check if script tag already exists (avoid duplicates)
    const existing = document.querySelector(
      'script[src*="accounts.google.com/gsi"]',
    );
    if (existing) {
      // Script loading, poll for it
      const poll = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(poll);
          initGSI();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(poll);
      };
    }

    // Load fresh
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!cancelled) initGSI();
    };
    script.onerror = () => {
      onError?.("Failed to load Google Sign-In");
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []); // run once on mount

  if (!CLIENT_ID) {
    return (
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "#fff3cd",
          border: "1px solid #ffc107",
          color: "#856404",
          fontSize: 12,
        }}
      >
        ⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Check your .env.local file.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", position: "relative", minHeight: 44 }}>
      {/* Official Google button renders here */}
      <div
        ref={btnRef}
        style={{ display: "flex", justifyContent: "center", minHeight: 44 }}
      />

      {/* Fallback custom button (shown while GSI loads, or as backup) */}
      {!ready && (
        <button
          onClick={() => {
            // Try to trigger GSI prompt as fallback
            (window as any).google?.accounts?.id?.prompt();
          }}
          disabled={loading}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            padding: "13px 20px",
            borderRadius: 14,
            border: "1.5px solid #e2e2ef",
            background: "white",
            cursor: loading ? "wait" : "pointer",
            fontSize: 14,
            fontWeight: 700,
            color: "#1a1a2e",
            boxShadow: "0 2px 8px #00000010",
          }}
        >
          <GoogleLogo />
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      )}
    </div>
  );
}

// ── Setup screen for new users ────────────────────────────────────────────────
interface SetupProps {
  setupToken: string;
  googleName: string;
  picture: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export function NewUserSetup({
  setupToken,
  googleName,
  picture,
  onSuccess,
  onError,
}: SetupProps) {
  const [displayName, setDisplayName] = useState(
    googleName.split(" ")[0] || "",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!displayName.trim()) {
      onError?.("Name required");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/void/auth/complete-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, displayName: displayName.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        onError?.(d.error || "Setup failed");
        setSaving(false);
        return;
      }
      localStorage.setItem("sv_token", d.token);
      window.dispatchEvent(new Event("sv_auth_change"));
      onSuccess();
    } catch {
      onError?.("Network error");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: "100%",
      }}
    >
      {picture && (
        <img
          src={picture}
          alt=""
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "2px solid #673de644",
            objectFit: "cover",
          }}
        />
      )}
      <div style={{ fontSize: 13, color: "#6b6b8a" }}>
        Signed in as <strong style={{ color: "#1a1a2e" }}>{googleName}</strong>
      </div>
      <div style={{ fontSize: 12, color: "#a0a0bc", marginBottom: 4 }}>
        Choose your display name for the leaderboard
      </div>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
        maxLength={24}
        placeholder="Display name…"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "11px 16px",
          border: "1.5px solid #e2e2ef",
          fontSize: 14,
          outline: "none",
          color: "#1a1a2e",
          background: "white",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#673de6")}
        onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
      />
      <button
        onClick={submit}
        disabled={saving}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          border: "none",
          background: saving
            ? "#c4c4d8"
            : "linear-gradient(135deg,#673de6,#4f46e5)",
          color: "white",
          fontWeight: 800,
          fontSize: 14,
          cursor: saving ? "not-allowed" : "pointer",
          boxShadow: saving ? "none" : "0 4px 20px #673de633",
        }}
      >
        {saving ? "Creating account…" : "Let's go →"}
      </button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
