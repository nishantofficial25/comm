"use client";
/**
 * LoginPage — full-page login screen for the study dashboard.
 * Uses GoogleSignInButton for consistent auth flow.
 */
import { useState } from "react";
import GoogleSignInButton, { NewUserSetup } from "../GoogleLoginButton";

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
  const [step, setStep] = useState<"login" | "setup">("login");
  const [setupData, setSetupData] = useState<{
    token: string;
    name: string;
    pic: string;
  } | null>(null);
  const [error, setError] = useState("");

  function handleNewUser(
    setupToken: string,
    googleName: string,
    picture: string,
  ) {
    setSetupData({ token: setupToken, name: googleName, pic: picture });
    setStep("setup");
  }

  if (step === "setup" && setupData) {
    return (
      <div style={S.root}>
        <style>{CSS}</style>
        <div style={S.glow1} />
        <div style={S.glow2} />
        <div style={S.card} className="sv-slidein">
          <div style={S.logo}>✦</div>
          <div style={S.title}>Almost there</div>
          <p style={S.sub}>Choose how you'll appear on the leaderboard</p>
          {error && <div style={S.err}>{error}</div>}
          <NewUserSetup
            setupToken={setupData.token}
            googleName={setupData.name}
            picture={setupData.pic}
            onSuccess={onLoginSuccess}
            onError={setError}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.glow1} />
      <div style={S.glow2} />

      <div style={S.card} className="sv-slidein">
        <div style={S.logo}>✦</div>
        <div style={S.title}>StudyVoid</div>
        <p style={S.sub}>
          Track your study sessions, compete on the leaderboard,
          <br />
          and grow with the community.
        </p>

        {/* Feature grid */}
        <div style={S.features}>
          {[
            ["🎯", "Pomodoro Timer", "Focus sessions with custom durations"],
            ["✓", "Task Manager", "Fullscreen stopwatch per task"],
            ["◎", "Topic Tracker", "Live timers & weekly charts"],
            ["🏆", "Leaderboard", "Daily rankings with real study hours"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={S.feat}>
              <div style={S.featIcon}>{icon}</div>
              <div>
                <div style={S.featTitle}>{title}</div>
                <div style={S.featDesc}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.divider}>
          <div style={S.divLine} />
          <span
            style={{
              color: "#3a3a5e",
              fontSize: 11,
              padding: "0 12px",
              flexShrink: 0,
            }}
          >
            Sign in to continue
          </span>
          <div style={S.divLine} />
        </div>

        {error && <div style={S.err}>{error}</div>}

        <GoogleSignInButton
          onSuccess={onLoginSuccess}
          onNewUser={handleNewUser}
          onError={setError}
        />

        <p
          style={{
            color: "#2a2a4e",
            fontSize: 11,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Your data is tied to your Google account and synced across devices.
        </p>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#080811",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  glow1: {
    position: "absolute",
    top: "20%",
    left: "30%",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, #7c3aed18, transparent 70%)",
    pointerEvents: "none",
  },
  glow2: {
    position: "absolute",
    bottom: "10%",
    right: "20%",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "radial-gradient(circle, #a855f712, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#0d0d1f",
    border: "1px solid #1e1e38",
    borderRadius: 24,
    padding: "40px 36px",
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "linear-gradient(135deg,#7c3aed,#a855f7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    marginBottom: 20,
    boxShadow: "0 0 40px #7c3aed55",
    color: "white",
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: "#f0f0ff",
    letterSpacing: "-1px",
    marginBottom: 10,
  },
  sub: { color: "#4a4a6a", fontSize: 13, lineHeight: 1.7, marginBottom: 28 },
  features: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 28,
  },
  feat: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 12px",
    background: "#12122a",
    border: "1px solid #1e1e38",
    borderRadius: 12,
    textAlign: "left",
  },
  featIcon: { fontSize: 16, flexShrink: 0, marginTop: 1, color: "white" },
  featTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#d0d0f0",
    marginBottom: 2,
  },
  featDesc: { fontSize: 10, color: "#3a3a5e", lineHeight: 1.4 },
  divider: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  divLine: { flex: 1, height: 1, background: "#1e1e38" },
  err: {
    width: "100%",
    background: "#ef444415",
    border: "1px solid #ef444430",
    color: "#ef4444",
    fontSize: 12,
    padding: "8px 14px",
    borderRadius: 10,
    marginBottom: 14,
    textAlign: "left",
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=DM+Sans:wght@400;600&display=swap');
  @keyframes svSlideIn { from{opacity:0;transform:translateY(16px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  .sv-slidein { animation: svSlideIn 0.35s cubic-bezier(.16,1,.3,1); }
  * { box-sizing:border-box; }
  ::placeholder { color:#2a2a4e; }
`;
