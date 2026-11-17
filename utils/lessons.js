/** Parses start time in minutes from a "HH:MM - HH:MM" string. */
export function parseStartMinutes(lessonTime) {
  if (!lessonTime || typeof lessonTime !== "string") {
    return Number.POSITIVE_INFINITY;
  }
  const match = lessonTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Merges teacher lessons and guards chronologically by start time. */
export function mergeDayTimeline(lessons = [], guards = []) {
  return [...lessons, ...guards].sort(
    (a, b) => parseStartMinutes(a.lessonTime) - parseStartMinutes(b.lessonTime)
  );
}

/**
 * Returns true if the timetable should default to "next" week
 * (weekends, or Friday >= 15:00 when autoNextWeek is enabled).
 */
export function shouldDefaultToNextWeek(now = new Date(), autoNextWeek = false) {
  const day = now.getDay();
  if (day === 0 || day === 6) return true;
  if (autoNextWeek && day === 5 && now.getHours() >= 15) return true;
  return false;
}

/**
 * Inserts explicit "free" gap entries for missing lesson numbers between the
 * first and last scheduled lesson of a day.
 */
export function insertFreeHours(lessons = [], hours = []) {
  if (!Array.isArray(lessons) || lessons.length === 0 || !Array.isArray(hours) || hours.length === 0) {
    return lessons;
  }

  const numbered = lessons
    .filter(
      (l) =>
        l.lessonNumber !== null &&
        l.lessonNumber !== undefined &&
        l.lessonNumber !== ""
    )
    .map((l) => Number(l.lessonNumber))
    .filter((n) => Number.isFinite(n));
  if (numbered.length === 0) return lessons;

  const minNum = Math.min(...numbered);
  const maxNum = Math.max(...numbered);
  const present = new Set(
    lessons
      .filter((l) => l.lessonNumber !== null && l.lessonNumber !== undefined)
      .map((l) => String(l.lessonNumber))
  );

  const freeSlots = [];
  for (const h of hours) {
    const capNum = Number(h.caption);
    if (!Number.isFinite(capNum) || capNum < minNum || capNum > maxNum) {
      continue;
    }
    if (!present.has(String(h.caption))) {
      freeSlots.push({
        type: "free",
        lessonNumber: String(h.caption),
        lessonTime:
          h.beginTime && h.endTime ? `${h.beginTime} - ${h.endTime}` : null,
      });
    }
  }

  if (freeSlots.length === 0) return lessons;

  return [...lessons, ...freeSlots].sort((a, b) => {
    const ta = parseStartMinutes(a.lessonTime);
    const tb = parseStartMinutes(b.lessonTime);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
      return ta - tb;
    }

    const aValid =
      a.lessonNumber !== null &&
      a.lessonNumber !== undefined &&
      a.lessonNumber !== "";
    const bValid =
      b.lessonNumber !== null &&
      b.lessonNumber !== undefined &&
      b.lessonNumber !== "";
    if (aValid && bValid) {
      return Number(a.lessonNumber) - Number(b.lessonNumber);
    }
    return 0;
  });
}
