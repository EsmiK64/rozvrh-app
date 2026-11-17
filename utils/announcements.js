const ANNOUNCEMENTS_URL =
  "https://raw.githubusercontent.com/EsmiK64/rozvrh-app/main/announcements.json";
const FETCH_TIMEOUT_MS = 3500;

/**
 * Fetches the active developer announcement from GitHub raw JSON.
 * Returns null if offline, inactive, or malformed.
 */
export async function fetchActiveAnnouncement({
  fetch = globalThis.fetch,
  url = ANNOUNCEMENTS_URL,
} = {}) {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    : null;

  try {
    const res = await fetch(
      url,
      controller ? { signal: controller.signal } : undefined
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.active !== true || !data.id || !data.message) {
      return null;
    }
    return {
      id: String(data.id),
      severity: ["info", "warning", "outage"].includes(data.severity)
        ? data.severity
        : "info",
      title: String(data.title || "Zpráva od vývojáře"),
      message: String(data.message),
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
