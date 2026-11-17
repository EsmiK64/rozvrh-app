import { splitClassAndGroup } from "./groups.js";
import { parseTimeRangeMinutes } from "./lessons.js";

const MAX_SCHEDULED_REMINDERS = 40;

function parseDayDate(dateStr, referenceNow) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\./);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = referenceNow.getFullYear();
  const candidate = new Date(year, month, day, 0, 0, 0, 0);

  // Handle year rollover (e.g. late December viewing January)
  const diffDays = (candidate.getTime() - referenceNow.getTime()) / 86_400_000;
  if (diffDays < -180) {
    candidate.setFullYear(year + 1);
  }
  return candidate;
}

function isRemindableItem(lesson) {
  return (
    lesson.type === "atom" ||
    lesson.type === "pauseGuard" ||
    lesson.type === "hourGuard"
  );
}

function formatReminderContent(nextLesson, isTeacher) {
  const range = nextLesson.lessonTime?.split(" - ")[0] || "";
  if (nextLesson.type === "pauseGuard") {
    return {
      title: `Dozor: ${nextLesson.name || nextLesson.abbrev || "Dozor"}`,
      body: range ? `Začíná v ${range}` : "Přestávkový dozor",
    };
  }
  if (nextLesson.type === "hourGuard") {
    return {
      title: nextLesson.name || "Suplovací pohotovost",
      body: range ? `Začíná v ${range}` : "Pohotovost",
    };
  }

  const subject =
    nextLesson.subject || nextLesson.subjectAbbrev || "Další hodina";
  const room = nextLesson.roomAbbrev || nextLesson.room;
  const teacherMeta = isTeacher
    ? splitClassAndGroup(nextLesson.group).className
    : null;

  const details = [
    range ? `v ${range}` : null,
    teacherMeta,
    room ? `učebna ${room}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `Další: ${subject}`,
    body: details || "Brzy začíná",
  };
}

/**
 * Pure builder that computes upcoming local notification triggers fired at the
 * end of the previous lesson to remind about the next lesson or guard.
 */
export function buildNextLessonReminders(
  days = [],
  { isTeacher = false, now = new Date() } = {}
) {
  const reminders = [];
  const nowMs = now.getTime();

  for (const day of days) {
    if (day.dayOff || !Array.isArray(day.lessons)) continue;
    const baseDate = parseDayDate(day.date, now);
    if (!baseDate) continue;

    const activeItems = day.lessons.filter(isRemindableItem);
    for (let i = 0; i < activeItems.length - 1; i += 1) {
      const prev = activeItems[i];
      const next = activeItems[i + 1];
      const prevRange = parseTimeRangeMinutes(prev.lessonTime);
      const nextRange = parseTimeRangeMinutes(next.lessonTime);
      if (!prevRange || !nextRange) continue;

      const triggerDate = new Date(baseDate.getTime());
      triggerDate.setHours(
        Math.floor(prevRange.end / 60),
        prevRange.end % 60,
        0,
        0
      );

      if (triggerDate.getTime() <= nowMs) continue;

      const content = formatReminderContent(next, isTeacher);
      reminders.push({
        triggerDate,
        ...content,
      });

      if (reminders.length >= MAX_SCHEDULED_REMINDERS) {
        return reminders;
      }
    }
  }

  return reminders;
}
