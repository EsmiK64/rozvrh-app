const BASE_URL = "https://bakalari.spse.cz/bakaweb/Timetable/Public";
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CACHE_ENTRIES = 50;

const OPTION_SELECTORS = {
  class: "selectedClass",
  teacher: "selectedTeacher",
};

const TARGET_SEGMENTS = {
  class: "Class",
  teacher: "Teacher",
};

const TERMS = {
  actual: "Actual",
  next: "Next",
  permanent: "Permanent",
};

function decodeHtmlEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractSelectOptions(html, selectId) {
  const selectPattern = new RegExp(
    `<select[^>]*\\bid=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`,
    "i"
  );
  const selectMatch = html.match(selectPattern);
  if (!selectMatch) {
    throw new Error(`Select element #${selectId} not found in Bakalari HTML.`);
  }

  const options = [];
  const optionPattern = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
  for (const match of selectMatch[1].matchAll(optionPattern)) {
    const attrs = match[1];
    const valueMatch = attrs.match(/\bvalue=["']([^"']*)["']/i);
    const value = valueMatch ? decodeHtmlEntities(valueMatch[1].trim()) : "";
    const label = decodeHtmlEntities(match[2].replace(/\s+/g, " ").trim());
    if (value) {
      options.push({ value, label });
    }
  }
  return options;
}

function extractTimetableData(html) {
  const marker = "const timetableData = ";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error("Embedded timetableData not found in Bakalari HTML.");
  }

  const jsonStart = html.indexOf("{", startIdx + marker.length);
  const lineEnd = html.indexOf(";\r", jsonStart);
  const unixLineEnd = html.indexOf(";\n", jsonStart);
  const jsonEnd =
    lineEnd !== -1 && (unixLineEnd === -1 || lineEnd < unixLineEnd)
      ? lineEnd
      : unixLineEnd;

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new BakalariError("Malformed timetableData block in Bakalari HTML.", 502);
  }

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd));
  } catch {
    throw new BakalariError("Malformed timetableData JSON in Bakalari HTML.", 502);
  }
}

function normalizeTime(hhmmss) {
  if (!hhmmss) return undefined;
  const [h, m] = hhmmss.split(":");
  return `${Number(h)}:${m}`;
}

function buildLessonNumberLookup(hours = []) {
  const byRange = new Map();
  for (const h of hours) {
    if (h.BeginTime && h.EndTime) {
      byRange.set(`${h.BeginTime} - ${h.EndTime}`, h.Caption);
    }
  }
  return byRange;
}

function cleanGroupText(value) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/<br\s*\/?>/gi, ", ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function normalizeHourSlot(hour, lessonNumbers) {
  const lessonTime =
    hour.Begin && hour.End
      ? `${normalizeTime(hour.Begin)} - ${normalizeTime(hour.End)}`
      : undefined;
  const fallbackNumber = lessonTime ? lessonNumbers.get(lessonTime) : undefined;

  if (hour.Type === "atoms" && Array.isArray(hour.Atoms)) {
    return hour.Atoms.map((atom) => {
      const time = atom.Time || lessonTime;
      const lessonNumber =
        (time ? lessonNumbers.get(time) : undefined) ?? fallbackNumber;

      return {
        type: atom.Type || "atom",
        subject: atom.SubjectText ?? atom.SubjectName ?? null,
        subjectAbbrev: atom.SubjectAbbrev ?? null,
        day: atom.Day ?? null,
        lessonNumber: lessonNumber ?? null,
        lessonTime: time ?? null,
        teacher: atom.TeacherFullname || atom.Teacher || null,
        teacherAbbrev: atom.Teacher || null,
        room: atom.RoomFullName || atom.Room || null,
        roomAbbrev: atom.Room || null,
        group: cleanGroupText(atom.GroupsNames || atom.GroupsFullNames),
        groupFullName: cleanGroupText(atom.GroupsFullNames),
        theme: atom.Theme || "",
        notice: atom.Notice || "",
        changeinfo: atom.ChangeInfo || "",
        homeworks: atom.Homeworks ?? null,
        absencetext: atom.AtomAbsenceText || atom.AbsentInfo || null,
        hasAbsent: Boolean(atom.HasAbsent),
        hasChanged: Boolean(atom.HasChanged),
        absentInfoText: atom.AbsentInfo ?? null,
      };
    });
  }

  if (hour.Type === "absent" || hour.Type === "removed") {
    return [
      {
        type: hour.Type,
        day: null,
        lessonNumber: fallbackNumber ?? null,
        lessonTime: lessonTime ?? null,
        absencetext: hour.InfoAbsent ?? null,
        absentInfoText: hour.InfoAbsentName ?? null,
        removedInfo: hour.InfoRemoved ?? null,
      },
    ];
  }

  return [];
}

function parseStartMinutes(lessonTime) {
  if (!lessonTime || typeof lessonTime !== "string") return Number.POSITIVE_INFINITY;
  const match = lessonTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getLessonSortKey(lesson) {
  if (lesson.lessonNumber !== null && lesson.lessonNumber !== undefined && lesson.lessonNumber !== "") {
    const num = Number(lesson.lessonNumber);
    if (Number.isFinite(num)) return num;
  }
  return parseStartMinutes(lesson.lessonTime);
}

function sortLessons(lessons) {
  return [...lessons].sort((a, b) => {
    const keyDiff = getLessonSortKey(a) - getLessonSortKey(b);
    if (keyDiff !== 0) return keyDiff;
    return parseStartMinutes(a.lessonTime) - parseStartMinutes(b.lessonTime);
  });
}

function parseTooltipDay(tooltipDetails) {
  if (!tooltipDetails || typeof tooltipDetails !== "string") return null;
  try {
    const parsed = JSON.parse(tooltipDetails);
    return parsed?.day || null;
  } catch {
    return null;
  }
}

function normalizeGuard(guard, lessonNumbers) {
  const beginTime = normalizeTime(guard.Begin) ?? null;
  const endTime = normalizeTime(guard.End) ?? null;
  const lessonTime = beginTime && endTime ? `${beginTime} - ${endTime}` : null;
  const isPause = Boolean(guard.IsPause);

  return {
    type: isPause ? "pauseGuard" : "hourGuard",
    name: guard.Name || guard.Abbrev || "Dozor",
    abbrev: guard.Abbrev || null,
    info: guard.Info || "",
    beginTime,
    endTime,
    lessonTime,
    lessonNumber: lessonTime ? lessonNumbers.get(lessonTime) ?? null : null,
    isPause,
    day: parseTooltipDay(guard.TooltipDetails),
  };
}

function formatDayLabel(day) {
  return [day.DayAbbrev, day.Date].filter(Boolean).join(" ").trim() || "Day";
}

function normalizeTimetable(raw) {
  const lessonNumbers = buildLessonNumberLookup(raw.Hours);
  const rawDays = Array.isArray(raw.Days) ? raw.Days : [];

  const days = rawDays.map((day) => ({
    label: formatDayLabel(day),
    dayAbbrev: day.DayAbbrev ?? null,
    date: day.Date ?? null,
    dayOff: Boolean(day.DayOff),
    dayOffName: day.DayOffName || null,
    lessons: Array.isArray(day.Hours)
      ? sortLessons(
          day.Hours.flatMap((hour) => normalizeHourSlot(hour, lessonNumbers))
        )
      : [],
    guards: sortLessons(
      [
        ...(day.PauseGuards || []),
        ...(day.HourGuards || []),
        ...(day.GeneralGuards || []),
      ].map((guard) => normalizeGuard(guard, lessonNumbers))
    ),
  }));

  const hours = (raw.Hours || []).map((h) => ({
    caption: h.Caption,
    beginTime: h.BeginTime,
    endTime: h.EndTime,
  }));

  return { hours, days };
}

function normalizeTeacherEvents(raw) {
  const rawDays = Array.isArray(raw.Days) ? raw.Days : [];
  const days = rawDays.map((day) => ({
    label: formatDayLabel(day),
    dayAbbrev: day.DayAbbrev ?? null,
    date: day.Date ?? null,
    guards: [
      ...(day.PauseGuards || []),
      ...(day.HourGuards || []),
      ...(day.GeneralGuards || []),
    ],
  }));
  return { days };
}

export class BakalariError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "BakalariError";
    this.statusCode = statusCode;
  }
}

export function createBakalariClient({
  fetch = globalThis.fetch,
  now = () => new Date(),
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
} = {}) {
  const cache = new Map();
  const inflight = new Map();

  function setCacheEntry(url, html, timestamp) {
    if (cache.has(url)) {
      cache.delete(url);
    } else if (cache.size >= maxCacheEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    cache.set(url, { html, at: timestamp });
  }

  async function fetchWithTimeout(url) {
    if (typeof AbortController === "undefined" || !timeoutMs) {
      return fetch(url);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new BakalariError(
          `Request to Bakalari timed out after ${timeoutMs}ms`,
          504
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchHtml(url, { forceRefresh = false } = {}) {
    const cached = cache.get(url);
    const timestamp = now().getTime();
    if (!forceRefresh && cached && timestamp - cached.at < cacheTtlMs) {
      return cached.html;
    }

    if (!forceRefresh && inflight.has(url)) {
      return inflight.get(url);
    }

    const requestPromise = (async () => {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new BakalariError(
          `Bakalari responded with HTTP ${response.status} for ${url}`,
          response.status === 404 ? 404 : 502
        );
      }

      const html = await response.text();
      setCacheEntry(url, html, now().getTime());
      return html;
    })();

    inflight.set(url, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inflight.delete(url);
    }
  }

  function resolveTerm(term) {
    if (term !== undefined) {
      const normalized = TERMS[String(term).toLowerCase()];
      if (!normalized) {
        throw new BakalariError(
          `Unsupported term "${term}". Expected one of: actual, next, permanent.`,
          400
        );
      }
      return normalized;
    }
    const day = now().getDay();
    return day === 0 || day === 6 ? "Next" : "Actual";
  }

  async function fetchTimetableRaw(kind, id, { term, forceRefresh = false } = {}) {
    const segment = TARGET_SEGMENTS[kind];
    if (!segment) {
      throw new BakalariError(`Unsupported timetable kind: ${kind}`, 400);
    }
    if (!id || typeof id !== "string" || !id.trim()) {
      throw new BakalariError(`Missing ${kind} id`, 400);
    }

    const url = `${BASE_URL}/${resolveTerm(term)}/${segment}/${encodeURIComponent(id.trim())}`;
    const html = await fetchHtml(url, { forceRefresh });
    return extractTimetableData(html);
  }

  return {
    async listOptions(kind) {
      const selectId = OPTION_SELECTORS[kind];
      if (!selectId) {
        throw new BakalariError(`Unsupported option kind: ${kind}`, 400);
      }
      const html = await fetchHtml(`${BASE_URL}/`);
      return extractSelectOptions(html, selectId);
    },

    async getTimetable(kind, id, options) {
      const raw = await fetchTimetableRaw(kind, id, options);
      return normalizeTimetable(raw);
    },

    async getTeacherEvents(id, options) {
      const raw = await fetchTimetableRaw("teacher", id, options);
      return normalizeTeacherEvents(raw);
    },

    clearCache() {
      cache.clear();
    },
  };
}
