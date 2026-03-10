// components/ReportModal.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  Inbox,
  Loader,
  Mail,
  X,
} from "lucide-react";
import {
  submitReport,
  savePushSubscription,
  saveEmailForReport,
} from "@/app/action/reportaction";
import { getBrowserId } from "@/lib/browser";
import Link from "next/link";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  examName: string;
  conditionName: string;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  );
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
      return null;
    }
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
  } catch (e) {
    console.error("Push subscribe failed:", e);
    return null;
  }
}

function readPermission(): NotifState {
  if (typeof window === "undefined") return "unsupported";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "idle";
}

type NotifState = "idle" | "requesting" | "granted" | "denied" | "unsupported";
type EmailState = "idle" | "sending" | "sent" | "error";

export default function ReportModal({
  isOpen,
  onClose,
  examName,
  conditionName,
}: Props) {
  const [description, setDescription] = useState("");
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [isPending, startTransition] = useTransition();
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(
    null,
  );
  const [notifState, setNotifState] = useState<NotifState>("idle");
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<EmailState>("idle");
  const [emailError, setEmailError] = useState("");

  const showEmailFallback =
    notifState === "unsupported" || (notifState === "denied" && isIOS());

  useEffect(() => {
    if (!isOpen) return;
    setDescription("");
    setSubmitStatus("idle");
    setSubmittedReportId(null);
    setNotifState(readPermission());
    setEmail("");
    setEmailState("idle");
    setEmailError("");
    setTimeout(() => {
      if (typeof window !== "undefined" && (window as any).triggerPWAPrompt)
        (window as any).triggerPWAPrompt();
    }, 1000);
  }, [isOpen]);

  const handleSubmit = () => {
    if (!description.trim()) return;
    startTransition(async () => {
      const browserId = getBrowserId();
      const result = await submitReport({
        examName,
        conditionName,
        description: description.trim(),
        browserId,
      });

      if (result.success) {
        const reportId = result.reportId ?? null;
        setSubmittedReportId(reportId);
        setSubmitStatus("success");

        // Dispatch event so NavbarShell updates unread badge immediately
        window.dispatchEvent(new CustomEvent("sahiphoto:new-inbox-item"));

        const perm = readPermission();
        if (perm === "granted" && reportId) {
          setNotifState("requesting");
          const subscription = await subscribeUserToPush();
          if (subscription) {
            await savePushSubscription({
              subscription: subscription.toJSON(),
              reportId,
            });
            setNotifState("granted");
          } else {
            setNotifState(isPushSupported() ? "idle" : "unsupported");
          }
        } else {
          setNotifState(
            perm === "unsupported" || perm === "denied" ? perm : "idle",
          );
        }
      } else {
        setSubmitStatus("error");
      }
    });
  };

  const handleNotifyMe = async () => {
    if (!submittedReportId) return;
    setNotifState("requesting");
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifState("denied");
        return;
      }
    }
    const subscription = await subscribeUserToPush();
    if (!subscription) {
      setNotifState("granted");
      return;
    }
    await savePushSubscription({
      subscription: subscription.toJSON(),
      reportId: submittedReportId,
    });
    setNotifState("granted");
  };

  const handleEmailNotify = async () => {
    if (!submittedReportId || !email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setEmailState("sending");
    try {
      await saveEmailForReport(submittedReportId, email.trim());
      setEmailState("sent");
    } catch {
      setEmailState("error");
    }
  };

  if (!isOpen) return null;
  const isSuccess = submitStatus === "success";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold text-white pr-8">
            {isSuccess ? "Report Received!" : "Help Us Serve You Better"}
          </h2>
          <p className="text-white/90 text-xs mt-1">
            {isSuccess
              ? "Thank you for helping us improve"
              : "Report any incorrect information"}
          </p>
        </div>

        {/* ── SUCCESS SCREEN ── */}
        {isSuccess ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center py-2">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-3 ring-4 ring-emerald-100">
                <CheckCircle2 size={44} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Report Submitted!
              </h3>
              <p className="text-sm text-gray-500 text-center mt-1 max-w-xs">
                Our team will review it. The reply will appear in your{" "}
                <strong>Inbox</strong> — no login needed.
              </p>
            </div>

            {/* Inbox CTA — always shown */}
            <Link
              href="/notifications"
              onClick={onClose}
              className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <Inbox size={17} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  View your Inbox
                </p>
                <p className="text-xs text-slate-500">
                  We'll drop the admin reply there — works on any browser
                </p>
              </div>
            </Link>

            {/* A: Push notification block */}
            {!showEmailFallback && (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                    <Bell size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Also get a browser notification
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      We'll ping you the moment an admin reviews your report.
                    </p>
                  </div>
                </div>

                {notifState === "granted" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
                    <Bell size={15} /> You'll be notified when we reply ✓
                  </div>
                )}

                {notifState === "denied" && !isIOS() && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                      <BellOff size={15} className="shrink-0" /> Notifications
                      are blocked in your browser
                    </div>
                    <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-amber-800">
                        📱 Android Chrome / 🖥️ Desktop:
                      </p>
                      {[
                        <>
                          Tap/click the <strong>🔒 lock icon</strong> in the
                          address bar
                        </>,
                        <>
                          <strong>Notifications</strong> →{" "}
                          <strong>Allow</strong>
                        </>,
                        <>Refresh the page and try again</>,
                      ].map((step, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-amber-700"
                        >
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(notifState === "idle" || notifState === "requesting") && (
                  <button
                    onClick={handleNotifyMe}
                    disabled={notifState === "requesting"}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {notifState === "requesting" ? (
                      <>
                        <Loader size={15} className="animate-spin" /> Enabling…
                      </>
                    ) : (
                      <>
                        <Bell size={15} /> 🔔 Notify Me When Admin Replies
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* B: Email fallback (iOS / unsupported) */}
            {showEmailFallback && (
              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Get notified by email
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {isIOS()
                        ? "Push notifications need the PWA installed on iOS. Use email instead."
                        : "Your browser doesn't support push. We'll email you when we respond."}
                    </p>
                  </div>
                </div>

                {emailState === "sent" ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold">
                    <CheckCircle2 size={15} /> We'll email you when we reply ✓
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        placeholder="your@email.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleEmailNotify}
                        disabled={emailState === "sending" || !email.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {emailState === "sending" ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          "Notify Me"
                        )}
                      </button>
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-600">{emailError}</p>
                    )}
                    {emailState === "error" && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle
                          size={13}
                          className="text-red-600 shrink-0"
                        />
                        <span className="text-xs text-red-700">
                          Failed to save email. Please try again.
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      No spam — only about this report.
                    </p>
                  </>
                )}

                {isIOS() && emailState !== "sent" && (
                  <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <p className="text-xs font-bold text-amber-800">
                      💡 Want push? Install the app:
                    </p>
                    {[
                      <>
                        Tap <strong>Share</strong> (□↑) in Safari
                      </>,
                      <>
                        Tap <strong>"Add to Home Screen"</strong>
                      </>,
                      <>Open from home screen — done!</>,
                    ].map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-amber-700"
                      >
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                    <p className="text-xs text-amber-600">
                      Requires iOS 16.4+ and Safari.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── FORM SCREEN ── */
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Exam Name
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {examName}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Document Type
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {conditionName}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                What&apos;s incorrect? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none text-sm"
              />
            </div>

            {submitStatus === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-sm font-medium text-red-700">
                  Failed to submit. Please try again.
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={isPending || !description.trim()}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isPending ? (
                  <>
                    <Loader size={15} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
