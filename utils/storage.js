import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TARGET_KIND: "selectedTargetKind",
  CLASS_ID: "selectedClass",
  CLASS_LABEL: "selectedClassLabel",
  GROUPS: "groupsData",
  SETTINGS: "appSettings",
};

export const DEFAULT_SETTINGS = {
  themeMode: "system",
  accentColor: "blue",
  lowAnimations: false,
  compactMode: false,
  layoutMode: "cards",
  defaultView: "day",
  autoNextWeek: false,
  showFreeHours: false,
  swipeDays: true,
};

/** Loads saved target (class or teacher) and group selections safely. */
export async function getSavedSelection() {
  const [rawKind, targetId, targetLabel, groupsRaw] = await Promise.all([
    AsyncStorage.getItem(KEYS.TARGET_KIND),
    AsyncStorage.getItem(KEYS.CLASS_ID),
    AsyncStorage.getItem(KEYS.CLASS_LABEL),
    AsyncStorage.getItem(KEYS.GROUPS),
  ]);

  let groups = null;
  if (groupsRaw !== null) {
    try {
      const parsed = JSON.parse(groupsRaw);
      if (Array.isArray(parsed)) {
        groups = parsed;
      }
    } catch {
      groups = null;
    }
  }

  const targetKind = rawKind === "teacher" ? "teacher" : "class";
  const cleanId = targetId && targetId.trim() ? targetId.trim() : null;
  const cleanLabel =
    targetLabel && targetLabel.trim() ? targetLabel.trim() : null;

  return {
    targetKind,
    targetId: cleanId,
    targetLabel: cleanLabel,
    classId: cleanId,
    classLabel: cleanLabel,
    groups,
  };
}

/** Persists the selected target kind ("class" | "teacher"), ID, and label. */
export async function saveSelectedTarget(kind, targetId, targetLabel) {
  const normalizedKind = kind === "teacher" ? "teacher" : "class";
  const ops = [
    AsyncStorage.setItem(KEYS.TARGET_KIND, normalizedKind),
    AsyncStorage.setItem(KEYS.CLASS_ID, targetId),
    targetLabel
      ? AsyncStorage.setItem(KEYS.CLASS_LABEL, targetLabel)
      : AsyncStorage.removeItem(KEYS.CLASS_LABEL),
  ];
  if (normalizedKind === "teacher") {
    ops.push(AsyncStorage.removeItem(KEYS.GROUPS));
  }
  await Promise.all(ops);
}

/** Persists the selected class ID and human-readable label. */
export function saveSelectedClass(classId, classLabel) {
  return saveSelectedTarget("class", classId, classLabel);
}

/** Persists the selected group list as JSON. */
export async function saveSelectedGroups(groups) {
  await AsyncStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
}

/** Loads persisted user preferences with safe defaults. */
export async function getAppSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      themeMode: ["light", "dark", "amoled", "system"].includes(
        parsed?.themeMode
      )
        ? parsed.themeMode
        : DEFAULT_SETTINGS.themeMode,
      accentColor: ["blue", "indigo", "emerald", "violet", "rose", "amber"].includes(
        parsed?.accentColor
      )
        ? parsed.accentColor
        : DEFAULT_SETTINGS.accentColor,
      lowAnimations: Boolean(parsed?.lowAnimations),
      compactMode: Boolean(parsed?.compactMode),
      layoutMode: ["cards", "grid"].includes(parsed?.layoutMode)
        ? parsed.layoutMode
        : DEFAULT_SETTINGS.layoutMode,
      defaultView: ["day", "week"].includes(parsed?.defaultView)
        ? parsed.defaultView
        : DEFAULT_SETTINGS.defaultView,
      autoNextWeek: Boolean(parsed?.autoNextWeek),
      showFreeHours: Boolean(parsed?.showFreeHours),
      swipeDays:
        parsed?.swipeDays === undefined
          ? DEFAULT_SETTINGS.swipeDays
          : Boolean(parsed.swipeDays),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persists user preferences as JSON. */
export async function saveAppSettings(settings) {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}
