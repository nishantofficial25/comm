"use client";

// components/PWAInstallPrompt.tsx
// - Android Chrome: intercepts beforeinstallprompt → shows native install popup
// - iOS Safari: shows a small banner with manual instructions
// - Already installed: shows nothing
// Add <PWAInstallPrompt /> to your layout.tsx inside <body>

import { useEffect, useState } from "react";
import { X, Share, Plus, Download, Smartphone } from "lucide-react";

type Platform = "android" | "ios" | null;

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  if (/android/i.test(navigator.userAgent)) return "android";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isStandalone()) return;

    // Don't show if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 24 * 60 * 60 * 1000)
      return;

    const p = getPlatform();
    setPlatform(p);

    if (p === "android") {
      // Android: capture the prompt event, but DO NOT show UI yet
      // UI is triggered externally via window.triggerPWAPrompt()
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Store trigger function on window so ReportModal can call it
        (window as any).triggerPWAPrompt = () => {
          setShow(true);
          setTimeout(() => setAnimateIn(true), 50);
        };
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (p === "ios") {
      // iOS: expose trigger function, do NOT auto-show
      (window as any).triggerPWAPrompt = () => {
        setShow(true);
        setTimeout(() => setAnimateIn(true), 50);
      };
    }
  }, []);

  const handleDismiss = () => {
    setAnimateIn(false);
    localStorage.setItem("pwa-prompt-dismissed", String(Date.now()));
    setTimeout(() => setShow(false), 300);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === "accepted") {
      // Wait for app to be installed, then open in standalone PWA
      window.addEventListener(
        "appinstalled",
        () => {
          // Small delay to let the OS register the app
          setTimeout(() => {
            // Replace current tab with the PWA — Chrome will open it in standalone
            window.location.href = window.location.href;
          }, 1000);
        },
        { once: true },
      );

      // Fallback: if appinstalled never fires within 4s, just dismiss
      setTimeout(() => {
        setInstalling(false);
        handleDismiss();
      }, 4000);
    } else {
      setInstalling(false);
    }
  };

  if (!show) return null;

  // ── Android bottom sheet ──────────────────────────────────
  if (platform === "android") {
    return (
      <>
        <div
          onClick={handleDismiss}
          className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${animateIn ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${animateIn ? "translate-y-0" : "translate-y-full"}`}
        >
          <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pt-3 pb-8 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* App icon */}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src="/icon.svg"
                      alt="SahiPhoto"
                      className="w-10 h-10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Add SahiPhoto to Home
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Install for faster access & notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "⚡", label: "Instant access" },
                  { icon: "🔔", label: "Notifications" },
                  { icon: "📴", label: "Latest Exam Updates" },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-2xl py-3 px-2"
                  >
                    <span className="text-xl">{b.icon}</span>
                    <span className="text-xs text-gray-600 font-medium text-center leading-tight">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-emerald-200 disabled:opacity-60"
                >
                  {installing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{" "}
                      Opening app…
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Add to Home Screen
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl font-semibold text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── iOS top banner ────────────────────────────────────────
  if (platform === "ios") {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${animateIn ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="bg-white border-b border-gray-200 shadow-lg px-4 py-3">
          <div className="flex items-start gap-3 max-w-lg mx-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="SahiPhoto"
                className="w-7 h-7"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Add SahiPhoto to Home Screen
              </p>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-500">Tap</span>
                <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                  <Share size={11} /> Share
                </span>
                <span className="text-xs text-gray-500">then</span>
                <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                  <Plus size={11} /> Add to Home Screen
                </span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* iOS arrow pointing to share button */}
        <div className="flex justify-center -mt-1">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid #e5e7eb",
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}
