"use client";
import { useState } from "react";
import { useAuth } from "../community/hooks/useAuth";
import StudyDashboard from "../community/components/StudyDashboard";
import LoginGate from "../community/components/loginGate";

export default function Myworkplace() {
  const { user, loading } = useAuth();
  const [showLoginGate, setShowLoginGate] = useState(false);

  if (loading) {
    return null; // or loading spinner
  }

  return user ? (
    <StudyDashboard />
  ) : (
    <LoginGate reason="Sign in to continue" onClose={() => setShowLoginGate(false)}/>
  );
}
