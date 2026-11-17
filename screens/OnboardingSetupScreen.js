import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExpressivePressable } from "../components/ExpressivePressable";
import {
  AppearanceControls,
  BehaviorControls,
  NotificationControls,
} from "../components/SettingsSections";
import { useSettings } from "../context/SettingsContext";
import { requestNotificationPermissions } from "../services/notificationService";
import { EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";
import {
  getSavedSelection,
  setOnboardingCompleted,
} from "../utils/storage";

const TOTAL_STEPS = 5;

function StepProgress({ step, colors }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, idx) => {
        const current = idx + 1;
        const active = current === step;
        const done = current < step;
        return (
          <View
            key={current}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  active || done ? colors.primary : colors.surfaceMuted,
                flex: active ? 2 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const OnboardingSetupScreen = ({ navigation }) => {
  const { settings, colors, updateSetting } = useSettings();
  const [step, setStep] = useState(3);
  const [targetLabel, setTargetLabel] = useState(null);
  const [targetKind, setTargetKind] = useState("class");
  const [permissionStatus, setPermissionStatus] = useState(null);

  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepSlideX = useRef(new Animated.Value(0)).current;
  const directionRef = useRef(1);

  useEffect(() => {
    if (settings.lowAnimations) {
      stepOpacity.setValue(1);
      stepSlideX.setValue(0);
      return;
    }
    stepOpacity.setValue(0);
    stepSlideX.setValue(directionRef.current * 24);
    Animated.parallel([
      Animated.spring(stepOpacity, {
        toValue: 1,
        ...EXPRESSIVE_SPRING,
      }),
      Animated.spring(stepSlideX, {
        toValue: 0,
        ...EXPRESSIVE_SPRING,
      }),
    ]).start();
  }, [step, stepOpacity, stepSlideX, settings.lowAnimations]);

  useEffect(() => {
    getSavedSelection().then((saved) => {
      setTargetLabel(saved.targetLabel || saved.targetId);
      setTargetKind(saved.targetKind);
    });
  }, []);

  const handleEnableLessonReminders = async (val) => {
    updateSetting("lessonReminders", val);
    if (val) {
      const granted = await requestNotificationPermissions();
      setPermissionStatus(granted ? "granted" : "denied");
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionStatus(granted ? "granted" : "denied");
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
    navigation.reset({
      index: 0,
      routes: [{ name: "Timetable" }],
    });
  };

  const handleBack = () => {
    if (step > 3) {
      directionRef.current = -1;
      setStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (step < 5) {
      directionRef.current = 1;
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View
        style={[
          styles.progressHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.stepCaption, { color: colors.textMuted }]}>
          Krok {step} z {TOTAL_STEPS}
        </Text>
        <StepProgress step={step} colors={colors} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={{
            opacity: stepOpacity,
            transform: [{ translateX: stepSlideX }],
          }}
        >
          {step === 3 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Přizpůsobte si vzhled
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Vyberte motiv, barvu akcentu a rozložení rozvrhu. Vše lze kdykoli
              změnit v nastavení.
            </Text>
            <AppearanceControls
              themeMode={settings.themeMode}
              accentColor={settings.accentColor}
              layoutMode={settings.layoutMode}
              compactMode={settings.compactMode}
              lowAnimations={settings.lowAnimations}
              onThemeChange={(val) => updateSetting("themeMode", val)}
              onAccentChange={(val) => updateSetting("accentColor", val)}
              onLayoutChange={(val) => updateSetting("layoutMode", val)}
              onCompactChange={(val) => updateSetting("compactMode", val)}
              onLowAnimationsChange={(val) =>
                updateSetting("lowAnimations", val)
              }
            />
          </View>
        ) : step === 4 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Oznámení a připomínky
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Můžete dostávat upozornění na další hodinu na konci předchozí a
              důležité zprávy o výpadcích Bakalářů.
            </Text>
            <NotificationControls
              lessonReminders={settings.lessonReminders}
              onLessonRemindersChange={handleEnableLessonReminders}
            />
            <ExpressivePressable
              style={[
                styles.permissionButton,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleRequestPermission}
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  { color: colors.primaryText },
                ]}
              >
                {permissionStatus === "granted"
                  ? "✓ Přístup k oznámením povolen"
                  : permissionStatus === "denied"
                    ? "Oznámení nebyla povolena v systému"
                    : "Povolit přístup k oznámením"}
              </Text>
            </ExpressivePressable>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Poslední detaily
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {targetLabel
                ? `Rozvrh je připraven pro ${targetKind === "teacher" ? "učitele" : "třídu"} ${targetLabel}.`
                : "Nastavte si chování rozvrhu po otevření."}
            </Text>
            <BehaviorControls
              defaultView={settings.defaultView}
              showFreeHours={settings.showFreeHours}
              swipeDays={settings.swipeDays}
              autoNextWeek={settings.autoNextWeek}
              onDefaultViewChange={(val) => updateSetting("defaultView", val)}
              onShowFreeHoursChange={(val) =>
                updateSetting("showFreeHours", val)
              }
              onSwipeDaysChange={(val) => updateSetting("swipeDays", val)}
              onAutoNextWeekChange={(val) => updateSetting("autoNextWeek", val)}
            />
          </View>
        )}
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.footerRow}>
          <ExpressivePressable
            containerStyle={styles.secondaryBtnWrap}
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
            onPress={handleBack}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              Zpět
            </Text>
          </ExpressivePressable>

          <ExpressivePressable
            containerStyle={styles.primaryBtnWrap}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={[styles.primaryBtnText, { color: colors.white }]}>
              {step < 5 ? "Pokračovat" : "Otevřít rozvrh"}
            </Text>
          </ExpressivePressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  progressHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  stepCaption: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressRow: {
    flexDirection: "row",
    gap: SPACING.xs + 2,
  },
  progressDot: {
    height: 6,
    borderRadius: RADII.pill,
  },
  content: {
    padding: SPACING.lg,
  },
  card: {
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  permissionButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  secondaryBtnWrap: {
    flex: 1,
  },
  primaryBtnWrap: {
    flex: 2,
  },
  secondaryBtn: {
    paddingVertical: SPACING.md + 2,
    borderRadius: RADII.md,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBtn: {
    paddingVertical: SPACING.md + 2,
    borderRadius: RADII.md,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default OnboardingSetupScreen;
