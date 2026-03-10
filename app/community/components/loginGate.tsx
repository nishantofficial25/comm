"use client";
/**
 * LoginGate — modal overlay that prompts Google sign-in.
 * Shown when user tries to: join a community, create a post, open My Posts.
 * Handles both existing users (direct login) and new users (name setup step).
 */
import { useState } from "react";
import GoogleSignInButton, { NewUserSetup } from "../GoogleLoginButton";

interface Props {
  reason?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginGate({
  reason = "Sign in to continue",
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"signin" | "setup">("signin");
  const [setupData, setSetupData] = useState<{
    token: string;
    name: string;
    pic: string;
  } | null>(null);
  const [error, setError] = useState("");

  function handleSuccess() {
    onSuccess?.();
    onClose();
  }

  function handleNewUser(
    setupToken: string,
    googleName: string,
    picture: string,
  ) {
    setSetupData({ token: setupToken, name: googleName, pic: picture });
    setStep("setup");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 24,
          padding: "32px 28px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 80px #00000040",
          animation: "lgSlideUp 0.22s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <style>{`@keyframes lgSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg,#673de6,#4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 22,
            boxShadow: "0 8px 24px #673de633",
          }}
        >
          {step === "setup" ? "✦" : "🔑"}
        </div>

        {step === "signin" ? (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#1a1a2e",
                marginBottom: 6,
              }}
            >
              {reason}
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#6b6b8a",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Free account · synced across devices · join communities & compete
              on the leaderboard
            </p>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: 12,
                  padding: "8px 14px",
                  borderRadius: 10,
                  marginBottom: 14,
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            <GoogleSignInButton
              onSuccess={handleSuccess}
              onNewUser={handleNewUser}
              onError={setError}
            />
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#1a1a2e",
                marginBottom: 6,
              }}
            >
              Almost there!
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#6b6b8a",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Choose how you'll appear on the leaderboard
            </p>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: 12,
                  padding: "8px 14px",
                  borderRadius: 10,
                  marginBottom: 14,
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            {setupData && (
              <NewUserSetup
                setupToken={setupData.token}
                googleName={setupData.name}
                picture={setupData.pic}
                onSuccess={handleSuccess}
                onError={setError}
              />
            )}
          </>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 0",
            borderRadius: 12,
            border: "none",
            background: "none",
            color: "#a0a0bc",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
