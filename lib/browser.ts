// lib/browserId.ts
// Generates a stable anonymous browser ID stored in localStorage.
// Used to link notifications to a browser without any login.

const BROWSER_ID_KEY = "sahiphoto_bid";
const UNREAD_KEY = "sahiphoto_unread";

/** Returns the browser's unique ID — creates one on first call */
export function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

/** Returns the count of unread notifications stored locally */
export function getLocalUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(UNREAD_KEY) ?? "0", 10);
}

/** Sets the local unread count */
export function setLocalUnreadCount(n: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UNREAD_KEY, String(Math.max(0, n)));
}

/** Clears the local unread count (call when user visits /notifications) */
export function clearLocalUnreadCount(): void {
  setLocalUnreadCount(0);
}
