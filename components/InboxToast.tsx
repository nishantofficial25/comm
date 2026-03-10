// components/InboxToast.tsx
// Drop this anywhere in your root layout — it auto-shows when there are unread notifications.
// <InboxToast /> — no props needed.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, X } from "lucide-react";
import {
  getBrowserId,
  getLocalUnreadCount,
  setLocalUnreadCount,
} from "@/lib/browser";
import { usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const SNOOZE_KEY = "sahiphoto_toast_snoozed_until";
const SNOOZE_MINS = 30; // don't show again within 30 mins of dismissal

export default function InboxToast() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [animate, setAnimate] = useState(false);

  const isNotifPage = pathname?.includes("/notifications");

  useEffect(() => {
    // Don't show on the notifications page itself
    if (isNotifPage) return;

    // Check snooze
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) return;

    const bid = getBrowserId();
    if (!bid) return;

    // First check local count for instant render
    const local = getLocalUnreadCount();
    if (local > 0) {
      setCount(local);
      setShow(true);
      setTimeout(() => setAnimate(true), 100);
      return;
    }

    // Then verify from server (delay 1.5s so page loads first)
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/inbox/${encodeURIComponent(bid)}/unread-count`)
        .then((r) => r.json())
        .then((d) => {
          const n = d.unreadCount ?? 0;
          if (n > 0) {
            setCount(n);
            setLocalUnreadCount(n);
            setShow(true);
            setTimeout(() => setAnimate(true), 100);
          }
        })
        .catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [isNotifPage]);

  const dismiss = () => {
    setAnimate(false);
    setTimeout(() => setShow(false), 300);
    // Snooze for 30 mins
    localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + SNOOZE_MINS * 60 * 1000),
    );
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop — very subtle on mobile */}
      <div
        className={`fixed inset-0 z-[90] pointer-events-none transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Toast */}
      <div
        className={`fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm
          transition-all duration-300 ease-out
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
        style={{
          transform: animate ? "translate(-50%, 0)" : "translate(-50%, 1rem)",
        }}
      >
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {/* Pulsing bell */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Bell size={18} className="text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                {count > 9 ? "9+" : count}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">
                {count === 1
                  ? "You have a new message"
                  : `You have ${count} new messages`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                An admin replied to your report
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} className="text-slate-400" />
            </button>
          </div>

          {/* View button */}
          <Link
            href="/notifications"
            onClick={dismiss}
            className="flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/10
              border-t border-white/10 transition-colors text-sm font-semibold text-white"
          >
            <span>View Inbox</span>
            <ChevronRight size={15} className="text-slate-400" />
          </Link>
        </div>
      </div>
    </>
  );
}
