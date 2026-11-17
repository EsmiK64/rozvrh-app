/**
 * Splits a Bakalari group string (e.g. "A1, A2" or "PX1<br/>PX2") into trimmed tokens.
 */
export function splitGroupTokens(groupValue) {
  if (!groupValue || typeof groupValue !== "string") return [];
  return groupValue
    .split(/<br\s*\/?>|[,;]/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Extracts structured group selection controls from normalized timetable days.
 * Numbered variants sharing an alphabetic prefix (e.g. A1, A2) become a
 * mutually-exclusive "choice" group; standalone groups become "toggle" options.
 */
export function extractGroupOptions(days = []) {
  const uniqueTokens = new Set();

  for (const day of days) {
    for (const lesson of day.lessons || []) {
      for (const token of splitGroupTokens(lesson.group)) {
        uniqueTokens.add(token);
      }
    }
  }

  const byPrefix = new Map();
  for (const token of uniqueTokens) {
    const prefixMatch = token.match(/^([A-Za-z]+)/);
    const key = prefixMatch ? prefixMatch[1] : token;
    if (!byPrefix.has(key)) {
      byPrefix.set(key, []);
    }
    byPrefix.get(key).push(token);
  }

  const choices = [];
  const toggles = [];

  for (const [prefix, tokens] of byPrefix.entries()) {
    const sorted = [...tokens].sort((a, b) =>
      a.localeCompare(b, "cs", { numeric: true })
    );
    if (sorted.length > 1) {
      choices.push({ id: prefix, kind: "choice", options: sorted });
    } else {
      toggles.push({ id: sorted[0], kind: "toggle", options: sorted });
    }
  }

  choices.sort((a, b) => a.id.localeCompare(b.id, "cs"));
  toggles.sort((a, b) => a.id.localeCompare(b.id, "cs"));

  return { choices, toggles };
}

/**
 * Extracts class name and optional subgroup from a teacher-timetable group string
 * such as "1.I S1" -> { className: "1.I", groupName: "S1" } or "2.A" -> { className: "2.A", groupName: null }.
 */
export function splitClassAndGroup(groupValue) {
  const tokens = splitGroupTokens(groupValue);
  if (tokens.length === 0) return { className: null, groupName: null };

  const classes = [];
  const groups = [];

  for (const token of tokens) {
    const match = token.match(/^(\d+\.[A-Za-z]+)\s+(.+)$/);
    if (match) {
      classes.push(match[1]);
      groups.push(match[2].trim());
    } else if (/^\d+\.[A-Za-z]+$/.test(token)) {
      classes.push(token);
    } else {
      groups.push(token);
    }
  }

  const uniqueClasses = [...new Set(classes)];
  const uniqueGroups = [...new Set(groups)];

  return {
    className: uniqueClasses.length > 0 ? uniqueClasses.join(", ") : null,
    groupName: uniqueGroups.length > 0 ? uniqueGroups.join(", ") : null,
  };
}

/**
 * Filters a day's lessons to those matching the user's selected groups.
 * Lessons without a group are always kept; if selectedGroups is null/undefined,
 * all lessons are returned.
 */
export function filterLessonsByGroups(lessons = [], selectedGroups) {
  if (!Array.isArray(selectedGroups)) {
    return lessons;
  }

  const selectedSet = new Set(selectedGroups);
  return lessons.filter((lesson) => {
    const tokens = splitGroupTokens(lesson.group);
    if (tokens.length === 0) return true;
    return tokens.some((token) => selectedSet.has(token));
  });
}
