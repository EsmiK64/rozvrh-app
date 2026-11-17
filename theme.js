export const LIGHT_COLORS = {
  background: "#F5F7FC",
  surface: "#FFFFFF",
  surfaceMuted: "#EAEFF9",
  primary: "#2563EB",
  primarySoft: "#DCE7FE",
  primaryText: "#1D4ED8",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  border: "#E2E8F0",
  changedBg: "#FEF3C7",
  changedBorder: "#F59E0B",
  changedText: "#92400E",
  removedBg: "#FEE2E2",
  removedBadgeBg: "#FECACA",
  removedBorder: "#EF4444",
  removedText: "#991B1B",
  absentBg: "#DCFCE7",
  absentBadgeBg: "#BBF7D0",
  absentBorder: "#22C55E",
  absentText: "#166534",
  pauseGuardBg: "#EEF2FF",
  pauseGuardBadgeBg: "#C7D2FE",
  pauseGuardBorder: "#818CF8",
  pauseGuardText: "#3730A3",
  hourGuardBg: "#F3E8FF",
  hourGuardBadgeBg: "#E9D5FF",
  hourGuardBorder: "#A855F7",
  hourGuardText: "#6B21A8",
  dayOffBg: "#E0E7FF",
  dayOffText: "#3730A3",
  white: "#FFFFFF",
};

export const DARK_COLORS = {
  background: "#0B1120",
  surface: "#151E32",
  surfaceMuted: "#1E293B",
  primary: "#3B82F6",
  primarySoft: "#1E3A5F",
  primaryText: "#93C5FD",
  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  border: "#293548",
  changedBg: "#422006",
  changedBorder: "#F59E0B",
  changedText: "#FCD34D",
  removedBg: "#3B1219",
  removedBadgeBg: "#5C1B24",
  removedBorder: "#F87171",
  removedText: "#FCA5A5",
  absentBg: "#0D2E1D",
  absentBadgeBg: "#14532D",
  absentBorder: "#4ADE80",
  absentText: "#86EFAC",
  pauseGuardBg: "#1E1B4B",
  pauseGuardBadgeBg: "#312E81",
  pauseGuardBorder: "#818CF8",
  pauseGuardText: "#C7D2FE",
  hourGuardBg: "#2E1065",
  hourGuardBadgeBg: "#4C1D95",
  hourGuardBorder: "#C084FC",
  hourGuardText: "#E9D5FF",
  dayOffBg: "#1E1B4B",
  dayOffText: "#C7D2FE",
  white: "#FFFFFF",
};

export const AMOLED_COLORS = {
  ...DARK_COLORS,
  background: "#000000",
  surface: "#0A0E17",
  surfaceMuted: "#141B2D",
  border: "#1F293D",
};

export const ACCENT_PRESETS = {
  blue: {
    label: "Modrá",
    light: { primary: "#2563EB", primarySoft: "#DCE7FE", primaryText: "#1D4ED8" },
    dark: { primary: "#3B82F6", primarySoft: "#1E3A5F", primaryText: "#93C5FD" },
  },
  indigo: {
    label: "Indigo",
    light: { primary: "#4F46E5", primarySoft: "#E0E7FF", primaryText: "#3730A3" },
    dark: { primary: "#6366F1", primarySoft: "#252459", primaryText: "#A5B4FC" },
  },
  emerald: {
    label: "Zelená",
    light: { primary: "#059669", primarySoft: "#D1FAE5", primaryText: "#065F46" },
    dark: { primary: "#10B981", primarySoft: "#0D3B2E", primaryText: "#6EE7B7" },
  },
  violet: {
    label: "Fialová",
    light: { primary: "#7C3AED", primarySoft: "#EDE9FE", primaryText: "#5B21B6" },
    dark: { primary: "#8B5CF6", primarySoft: "#2E1E59", primaryText: "#C4B5FD" },
  },
  rose: {
    label: "Červená",
    light: { primary: "#E11D48", primarySoft: "#FFE4E6", primaryText: "#9F1239" },
    dark: { primary: "#F43F5E", primarySoft: "#4C1524", primaryText: "#FDA4AF" },
  },
  amber: {
    label: "Oranžová",
    light: { primary: "#D97706", primarySoft: "#FEF3C7", primaryText: "#92400E" },
    dark: { primary: "#F59E0B", primarySoft: "#45260A", primaryText: "#FCD34D" },
  },
};

export const COLORS = LIGHT_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const RADII = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

/** Material 3 Expressive spatial spring defaults for native-driver animations. */
export const EXPRESSIVE_SPRING = {
  stiffness: 380,
  damping: 24,
  mass: 0.85,
  useNativeDriver: true,
};
