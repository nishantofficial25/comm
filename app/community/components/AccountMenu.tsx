"use client";
/**
 * AccountMenu — avatar-only trigger, opens a profile card modal.
 * Name is READ-ONLY (set once at signup). No edit in UI.
 */
import { useState, useRef, useEffect } from "react";
import { UserProfile } from "../hooks/useAuth";

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onUpdateName: (name: string) => Promise<void>; // kept for API compat, unused in UI
}

export default function AccountMenu({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          borderRadius: "50%",
          display: "block",
        }}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "2px solid #a855f744",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "white",
              fontWeight: 800,
            }}
          >
            {user.displayName[0]?.toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 260,
            background: "#0d0d1f",
            border: "1px solid #2a2a4e",
            borderRadius: 22,
            overflow: "hidden",
            zIndex: 500,
            boxShadow: "0 24px 64px #00000099",
            animation: "amDrop 0.18s ease",
          }}
        >
          {/* Profile banner */}
          <div
            style={{
              height: 60,
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            }}
          />

          <div
            style={{
              padding: "0 20px 20px",
              marginTop: -36,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "3px solid #0d0d1f",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "3px solid #0d0d1f",
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  color: "white",
                  fontWeight: 800,
                }}
              >
                {user.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div
              style={{
                marginTop: 10,
                fontSize: 16,
                fontWeight: 800,
                color: "#f0f0ff",
              }}
            >
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: "#3a3a5e", marginTop: 3 }}>
              {user.email}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: "#2a2a4e",
                background: "#12122a",
                border: "1px solid #1e1e38",
                borderRadius: 99,
                padding: "3px 12px",
              }}
            >
              name is set at signup
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1e1e38" }}>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: "100%",
                padding: "13px 20px",
                background: "none",
                border: "none",
                color: "#ef4444",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ef444412")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9 4.5L11.5 7L9 9.5M11.5 7H5M6 2H2.5V12H6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes amDrop { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>
    </div>
  );
}
