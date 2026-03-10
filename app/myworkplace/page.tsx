"use client";
import { useState } from "react";
import { useAuth } from "../community/hooks/useAuth";
import StudyDashboard from "../community/components/StudyDashboard";
import LoginGate from "../community/components/loginGate";
export default function Myworkplace() {
    const { user, logout } = useAuth();
    const [showLoginGate, setShowLoginGate] = useState(false);
  return (!user ? (
      <LoginGate
        reason="Sign in to continue"
        onClose={() => setShowLoginGate(false)}
      />
    ) : (
      <StudyDashboard />
    ))
}