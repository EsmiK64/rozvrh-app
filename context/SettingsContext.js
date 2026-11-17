import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import {
  ACCENT_PRESETS,
  AMOLED_COLORS,
  DARK_COLORS,
  LIGHT_COLORS,
} from "../theme";
import {
  DEFAULT_SETTINGS,
  getAppSettings,
  saveAppSettings,
} from "../utils/storage";

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  isDark: false,
  colors: LIGHT_COLORS,
  updateSetting: async () => {},
});

/** Provides persisted theme, layout, and animation preferences. */
export function SettingsProvider({ children }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    getAppSettings().then((loadedSettings) => {
      if (active) setSettings(loadedSettings);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveAppSettings(next).catch((err) =>
        console.error("Failed to persist settings:", err)
      );
      return next;
    });
  }, []);

  const isDark =
    settings.themeMode === "dark" ||
    settings.themeMode === "amoled" ||
    (settings.themeMode === "system" && systemScheme === "dark");

  const baseColors =
    settings.themeMode === "amoled"
      ? AMOLED_COLORS
      : isDark
        ? DARK_COLORS
        : LIGHT_COLORS;

  const accent = ACCENT_PRESETS[settings.accentColor] || ACCENT_PRESETS.blue;
  const accentTokens = isDark ? accent.dark : accent.light;
  const colors = useMemo(
    () => ({ ...baseColors, ...accentTokens }),
    [baseColors, accentTokens]
  );

  const value = useMemo(
    () => ({ settings, isDark, colors, updateSetting }),
    [settings, isDark, colors, updateSetting]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
