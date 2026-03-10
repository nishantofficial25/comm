// app/action/reportaction.ts
"use server";

const API_BASE = process.env.API_BASE;

// ── Submit a new report ───────────────────────────────────────────────────────
export async function submitReport(payload: {
  examName: string;
  conditionName: string;
  description: string;
  browserId?: string;
}): Promise<{ success: boolean; message: string; reportId?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/reportwrong`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        reportedAt: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: "Report submitted. Thank you!",
        reportId: String(data.requestId),
      };
    }
    return { success: false, message: "Failed to submit. Please try again." };
  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}

// ── Save push subscription linked to a report ────────────────────────────────
export async function savePushSubscription(payload: {
  subscription: object;
  reportId: string;
}): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Save email subscription linked to a report (iOS / push-unsupported) ──────
export async function saveEmailForReport(
  reportId: string,
  email: string,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/report/email-subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, email }),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Fetch inbox notifications for a browserId ─────────────────────────────────
export async function fetchInboxNotifications(browserId: string): Promise<{
  success: boolean;
  notifications: InboxNotification[];
  unreadCount: number;
}> {
  try {
    const res = await fetch(
      `${API_BASE}/api/inbox/${encodeURIComponent(browserId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { success: false, notifications: [], unreadCount: 0 };
    const data = await res.json();
    return {
      success: true,
      notifications: data.notifications ?? [],
      unreadCount: data.unreadCount ?? 0,
    };
  } catch {
    return { success: false, notifications: [], unreadCount: 0 };
  }
}

// ── Mark all notifications as read for a browserId ───────────────────────────
export async function markAllNotificationsRead(
  browserId: string,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/inbox/${encodeURIComponent(browserId)}/read-all`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      },
    );
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Submit feedback ───────────────────────────────────────────────────────────
export async function submitFeedback(payload: {
  browserId: string;
  rating: number;
  category: string;
  message: string;
}): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        submittedAt: new Date().toISOString(),
      }),
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InboxNotification {
  _id: string;
  type: "report_resolved" | "report_rejected" | "announcement" | "exam_update";
  title: string;
  body: string;
  reportId?: string;
  examName?: string;
  isRead: boolean;
  createdAt: string;
}
