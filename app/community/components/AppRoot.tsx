"use client";
/**
 * AppRoot — wraps the entire app with auth state.
 * Dashboard: requires login (study data is personal)
 * Community: always accessible, login only prompted when joining/posting
 */
import { useAuth } from "../hooks/useAuth";
import StudyDashboard from "./StudyDashboard";
import VoidCommunity from "./VoidCommunity";
import LoginPage from "./LoginPage";

interface Props {
  page: "dashboard" | "community";
}

const Spinner = ({ dark }: { dark?: boolean }) => (
  <div
    style={{
      minHeight: "100vh",
      background: dark ? "#080811" : "#f4f4f8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div>
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid #1e1e38",
          borderTopColor: dark ? "#a855f7" : "#673de6",
          borderRadius: "50%",
          margin: "0 auto 16px",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: "#3a3a5e", fontSize: 13, textAlign: "center" }}>
        Loading…
      </div>
    </div>
  </div>
);

export default function AppRoot({ page }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner dark={page === "dashboard"} />;

  // Community: public, no login gate
  if (page === "community") return <VoidCommunity />;

  // Dashboard: requires login to access personal study data
  if (!user) return <LoginPage onLoginSuccess={() => {}} />;

  return <StudyDashboard />;
}
