import React, { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bakalariClient } from "../api/client";
import { ExpressivePressable } from "../components/ExpressivePressable";
import {
  AppearanceControls,
  BehaviorControls,
  NotificationControls,
} from "../components/SettingsSections";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { setOnboardingCompleted } from "../utils/storage";

const GITHUB_ISSUES_URL = "https://github.com/EsmiK64/rozvrh-app/issues/new";

const SettingsScreen = ({ navigation }) => {
  const { settings, colors, updateSetting } = useSettings();
  const [localTheme, setLocalTheme] = useState(settings.themeMode);
  const [localAccent, setLocalAccent] = useState(settings.accentColor);
  const [localLayout, setLocalLayout] = useState(settings.layoutMode);
  const [localDefaultView, setLocalDefaultView] = useState(
    settings.defaultView
  );
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setLocalTheme(settings.themeMode);
  }, [settings.themeMode]);

  useEffect(() => {
    setLocalAccent(settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    setLocalLayout(settings.layoutMode);
  }, [settings.layoutMode]);

  useEffect(() => {
    setLocalDefaultView(settings.defaultView);
  }, [settings.defaultView]);

  const scheduleUpdate = (key, value, setLocal) => {
    if (setLocal) setLocal(value);
    requestAnimationFrame(() => {
      updateSetting(key, value);
    });
  };

  const handleClearCache = () => {
    bakalariClient.clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleRerunOnboarding = async () => {
    await setOnboardingCompleted(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const handleReportIssue = () => {
    Linking.openURL(GITHUB_ISSUES_URL).catch((err) =>
      console.error("Failed to open GitHub issues URL:", err)
    );
  };

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Vzhled a zobrazení
          </Text>
          <AppearanceControls
            themeMode={localTheme}
            accentColor={localAccent}
            layoutMode={localLayout}
            compactMode={settings.compactMode}
            lowAnimations={settings.lowAnimations}
            onThemeChange={(val) =>
              scheduleUpdate("themeMode", val, setLocalTheme)
            }
            onAccentChange={(val) =>
              scheduleUpdate("accentColor", val, setLocalAccent)
            }
            onLayoutChange={(val) =>
              scheduleUpdate("layoutMode", val, setLocalLayout)
            }
            onCompactChange={(val) => updateSetting("compactMode", val)}
            onLowAnimationsChange={(val) =>
              updateSetting("lowAnimations", val)
            }
          />
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Chování rozvrhu
          </Text>
          <BehaviorControls
            defaultView={localDefaultView}
            showFreeHours={settings.showFreeHours}
            swipeDays={settings.swipeDays}
            autoNextWeek={settings.autoNextWeek}
            onDefaultViewChange={(val) =>
              scheduleUpdate("defaultView", val, setLocalDefaultView)
            }
            onShowFreeHoursChange={(val) =>
              updateSetting("showFreeHours", val)
            }
            onSwipeDaysChange={(val) => updateSetting("swipeDays", val)}
            onAutoNextWeekChange={(val) => updateSetting("autoNextWeek", val)}
          />
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Oznámení
          </Text>
          <NotificationControls
            lessonReminders={settings.lessonReminders}
            devNotifications={settings.devNotifications}
            onLessonRemindersChange={(val) =>
              updateSetting("lessonReminders", val)
            }
            onDevNotificationsChange={(val) =>
              updateSetting("devNotifications", val)
            }
          />
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rozvrh a data
          </Text>
          <View style={styles.actionStack}>
            <ExpressivePressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => navigation.navigate("Select")}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Změnit třídu nebo učitele
              </Text>
            </ExpressivePressable>

            <ExpressivePressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleClearCache}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                {cacheCleared
                  ? "✓ Mezipaměť vymazána"
                  : "Vymazat mezipaměť rozvrhu"}
              </Text>
            </ExpressivePressable>

            <ExpressivePressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleRerunOnboarding}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Spustit úvodního průvodce znovu
              </Text>
            </ExpressivePressable>
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Zpětná vazba
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Narazili jste na chybu nebo máte nápad na vylepšení?
          </Text>
          <ExpressivePressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleReportIssue}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              Nahlásit chybu na GitHubu
            </Text>
          </ExpressivePressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  actionStack: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    borderWidth: 1,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    paddingVertical: SPACING.md + 2,
    borderRadius: RADII.md,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default SettingsScreen;
