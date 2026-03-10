// app/notifications/page.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Frown,
  Inbox,
  Loader2,
  Megaphone,
  MessageSquare,
  Meh,
  RefreshCw,
  Send,
  Smile,
  SmilePlus,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  fetchInboxNotifications,
  markAllNotificationsRead,
  submitFeedback,
  type InboxNotification,
} from "@/app/action/reportaction";
import { getBrowserId, clearLocalUnreadCount } from "@/lib/browser";

// ─── helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InboxNotification["type"],
  {
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  report_resolved: {
    icon: <CheckCircle2 size={16} />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Report Resolved",
  },
  report_rejected: {
    icon: <XCircle size={16} />,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Report Reviewed",
  },
  announcement: {
    icon: <Megaphone size={16} />,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Announcement",
  },
  exam_update: {
    icon: <Bell size={16} />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "Exam Update",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ─── star rating ─────────────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={`transition-colors ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const FACE_ICONS = [
  { n: 1, Icon: Frown, label: "Very bad", color: "text-red-500" },
  { n: 2, Icon: Frown, label: "Bad", color: "text-orange-500" },
  { n: 3, Icon: Meh, label: "Okay", color: "text-amber-500" },
  { n: 4, Icon: Smile, label: "Good", color: "text-lime-600" },
  { n: 5, Icon: SmilePlus, label: "Excellent", color: "text-emerald-600" },
];

const FEEDBACK_CATEGORIES = [
  "Photo Tool",
  "Exam Information",
  "Website Speed",
  "Design & UI",
  "Bug Report",
  "Feature Request",
  "General",
];

// ─── notification card ───────────────────────────────────────────────────────
function NotifCard({
  notif,
  delay,
}: {
  notif: InboxNotification;
  delay: number;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.announcement;

  return (
    <div
      className={`relative group rounded-2xl border-2 p-4 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${notif.isRead ? "bg-white border-gray-100" : `${cfg.bg} ${cfg.border}`}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      )}

      <div className="flex gap-3">
        {/* Type icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color} border ${cfg.border}`}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Label + time */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[11px] font-bold uppercase tracking-wide ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className="text-[11px] text-gray-400">
              {timeAgo(notif.createdAt)}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-bold text-gray-900 leading-snug mb-1">
            {notif.title}
          </p>

          {/* Body */}
          <p className="text-sm text-gray-600 leading-relaxed">{notif.body}</p>

          {/* Exam chip */}
          {notif.examName && (
            <span className="inline-block mt-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              {notif.examName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────
function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Inbox size={36} className="text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">
        Your inbox is empty
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        When you submit a report and an admin responds, the reply will appear
        here — no login needed.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
      >
        Browse Exams <ChevronRight size={15} />
      </Link>
    </div>
  );
}

// ─── feedback form ────────────────────────────────────────────────────────────
function FeedbackForm({ browserId }: { browserId: string }) {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (rating === 0 || !message.trim()) return;
    start(async () => {
      const result = await submitFeedback({
        browserId,
        rating,
        category: category || "General",
        message: message.trim(),
      });
      if (result.success) {
        setDone(true);
        setError(false);
      } else setError(true);
    });
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-emerald-50 ring-4 ring-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          Thank you for your feedback!
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Your thoughts help us build a better experience for every aspirant.
        </p>
      </div>
    );
  }

  const face = FACE_ICONS.find((f) => f.n === rating);

  return (
    <div className="space-y-6">
      {/* Rating */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">
          How would you rate your experience?
        </p>
        <div className="flex flex-col items-center gap-3">
          <StarRating value={rating} onChange={setRating} />
          {face && (
            <div
              className={`flex items-center gap-1.5 text-sm font-bold ${face.color} transition-all`}
            >
              <face.Icon size={16} /> {face.label}
            </div>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                category === cat
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-slate-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">
          Tell us more <span className="text-red-500">*</span>
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What did you love? What could be better?"
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-slate-500 focus:outline-none transition-colors resize-none"
        />
        <p className="text-right text-xs text-gray-400 mt-1">
          {message.length} / 500
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span className="text-sm text-red-700">
            Failed to submit. Please try again.
          </span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || rating === 0 || !message.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3
          bg-slate-900 hover:bg-slate-700 text-white rounded-xl font-bold text-sm
          transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send size={16} /> Send Feedback
          </>
        )}
      </button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [tab, setTab] = useState<"inbox" | "feedback">("inbox");
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [browserId, setBrowserId] = useState("");
  const [markingRead, setMarkingRead] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const hasMarkedRead = useRef(false);

  // ── load browserId + notifications ────────────────────────────────────────
  useEffect(() => {
    const bid = getBrowserId();
    setBrowserId(bid);
    clearLocalUnreadCount();

    if (!bid) {
      setLoading(false);
      return;
    }

    fetchInboxNotifications(bid).then((data) => {
      if (data.success) {
        setNotifications(data.notifications);
        setUnread(data.unreadCount);
      }
      setLoading(false);
    });
  }, [lastRefresh]);

  // ── auto mark-all-read after 2s of viewing ────────────────────────────────
  useEffect(() => {
    if (!browserId || unread === 0 || hasMarkedRead.current) return;
    const timer = setTimeout(async () => {
      hasMarkedRead.current = true;
      setMarkingRead(true);
      await markAllNotificationsRead(browserId);
      setMarkingRead(false);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [browserId, unread]);

  const refresh = () => {
    setLoading(true);
    hasMarkedRead.current = false;
    setLastRefresh(Date.now());
  };

  const unreadNotifs = notifications.filter((n) => !n.isRead);
  const readNotifs = notifications.filter((n) => n.isRead);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ── Page header ── */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Your inbox · no login required
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
          {(
            [
              {
                key: "inbox",
                label: "Inbox",
                icon: <Inbox size={15} />,
                badge: unread,
              },
              {
                key: "feedback",
                label: "Feedback",
                icon: <MessageSquare size={15} />,
                badge: 0,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* ══ INBOX TAB ══ */}
        {tab === "inbox" && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={36} className="text-slate-400 animate-spin" />
                <p className="text-sm text-slate-500">Loading your inbox…</p>
              </div>
            ) : notifications.length === 0 ? (
              <EmptyInbox />
            ) : (
              <div className="space-y-6">
                {/* Mark all read progress */}
                {markingRead && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                    <Loader2 size={14} className="animate-spin" /> Marking all
                    as read…
                  </div>
                )}

                {/* Unread section */}
                {unreadNotifs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                        Unread
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
                        {unreadNotifs.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {unreadNotifs.map((n, i) => (
                        <NotifCard key={n._id} notif={n} delay={i * 60} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Read section */}
                {readNotifs.length > 0 && (
                  <div>
                    {unreadNotifs.length > 0 && (
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                        Earlier
                      </p>
                    )}
                    <div className="space-y-3">
                      {readNotifs.map((n, i) => (
                        <NotifCard key={n._id} notif={n} delay={i * 40} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer note */}
                <div className="flex items-start gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <BellOff
                    size={15}
                    className="text-slate-400 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    These notifications are tied to this browser. Clearing your
                    browser data or switching devices will create a new inbox.
                    Submit reports from this browser to keep everything in sync.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ FEEDBACK TAB ══ */}
        {tab === "feedback" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Share your feedback
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Help us improve SahiPhoto for everyone
                </p>
              </div>
            </div>
            <FeedbackForm browserId={browserId} />
          </div>
        )}
      </div>
    </div>
  );
}
