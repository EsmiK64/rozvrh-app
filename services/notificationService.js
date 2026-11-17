import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { buildNextLessonReminders } from "../utils/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelsConfigured = false;

async function ensureChannelsAndPermission() {
  if (Platform.OS === "android" && !channelsConfigured) {
    await Promise.all([
      Notifications.setNotificationChannelAsync("lesson-reminders", {
        name: "Připomínky hodin",
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync("dev-alerts", {
        name: "Oznámení vývojáře",
        importance: Notifications.AndroidImportance.HIGH,
      }),
    ]);
    channelsConfigured = true;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function requestNotificationPermissions() {
  try {
    return await ensureChannelsAndPermission();
  } catch {
    return false;
  }
}

/**
 * Replaces all scheduled lesson reminders with reminders for the given days,
 * or cancels them when disabled.
 */
export async function syncLessonReminders(
  days,
  { enabled = false, isTeacher = false } = {}
) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled || !Array.isArray(days) || days.length === 0) return;

    const granted = await ensureChannelsAndPermission();
    if (!granted) return;

    const reminders = buildNextLessonReminders(days, { isTeacher });
    await Promise.all(
      reminders.map((item) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.body,
            ...(Platform.OS === "android"
              ? { channelId: "lesson-reminders" }
              : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.triggerDate,
          },
        })
      )
    );
  } catch (err) {
    console.warn("Failed to sync lesson reminders:", err);
  }
}

/** Fires an immediate local notification for a developer announcement if OS permission is already granted. */
export async function sendDevAnnouncementNotification(announcement) {
  if (!announcement) return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status !== "granted") return;

    await ensureChannelsAndPermission();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: announcement.title,
        body: announcement.message,
        ...(Platform.OS === "android" ? { channelId: "dev-alerts" } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("Failed to send dev announcement notification:", err);
  }
}
