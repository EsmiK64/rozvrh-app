import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bakalariClient } from "../api/client";
import { ExpressivePressable } from "../components/ExpressivePressable";
import { ExpressiveSwitch } from "../components/ExpressiveSwitch";
import { SlidingTabs } from "../components/SlidingTabs";
import { useSettings } from "../context/SettingsContext";
import { ACCENT_PRESETS, EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";

const THEME_OPTIONS = [
  { key: "light", label: "Světlý" },
  { key: "dark", label: "Tmavý" },
  { key: "amoled", label: "AMOLED" },
  { key: "system", label: "Systém" },
];

const LAYOUT_OPTIONS = [
  { key: "cards", label: "Karty" },
  { key: "grid", label: "Tabulka" },
];

const DEFAULT_VIEW_OPTIONS = [
  { key: "day", label: "Dnešní den" },
  { key: "week", label: "Celý týden" },
];

const GITHUB_ISSUES_URL = "https://github.com/EsmiK64/rozvrh-app/issues/new";

function ExpressiveColorSwatch({ color, active, ringColor, lowAnimations, onPress }) {
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (lowAnimations) {
      activeAnim.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(activeAnim, {
      toValue: active ? 1 : 0,
      ...EXPRESSIVE_SPRING,
      useNativeDriver: true,
    }).start();
  }, [active, activeAnim, lowAnimations]);

  const animatePress = (toValue) => {
    if (lowAnimations) return;
    Animated.spring(pressScale, {
      toValue,
      ...EXPRESSIVE_SPRING,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animatePress(0.88)}
      onPressOut={() => animatePress(1)}
      style={[
        styles.accentOuter,
        { borderColor: active ? ringColor : "transparent" },
      ]}
    >
      <Animated.View
        style={[
          styles.accentSwatch,
          { backgroundColor: color, transform: [{ scale: pressScale }] },
        ]}
      >
        <Animated.Text
          style={[
            styles.accentCheck,
            {
              opacity: activeAnim,
              transform: [{ scale: activeAnim }],
            },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function SettingSwitchRow({ title, description, value, onValueChange, colors }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTextWrap}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <ExpressiveSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const SettingsScreen = ({ navigation }) => {
  const { settings, isDark, colors, updateSetting } = useSettings();
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
    setLocal(value);
    requestAnimationFrame(() => {
      updateSetting(key, value);
    });
  };

  const handleClearCache = () => {
    bakalariClient.clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
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
            Vzhled
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Vyberte barevný motiv aplikace.
          </Text>
          <SlidingTabs
            options={THEME_OPTIONS}
            selectedKey={localTheme}
            onSelect={(mode) => scheduleUpdate("themeMode", mode, setLocalTheme)}
          />

          <Text
            style={[
              styles.fieldLabel,
              { color: colors.textSecondary, marginTop: SPACING.md },
            ]}
          >
            Barva akcentu
          </Text>
          <View style={styles.accentRow}>
            {Object.entries(ACCENT_PRESETS).map(([key, preset]) => {
              const swatchColor = isDark
                ? preset.dark.primary
                : preset.light.primary;
              return (
                <ExpressiveColorSwatch
                  key={key}
                  color={swatchColor}
                  active={localAccent === key}
                  ringColor={colors.text}
                  lowAnimations={settings.lowAnimations}
                  onPress={() =>
                    scheduleUpdate("accentColor", key, setLocalAccent)
                  }
                />
              );
            })}
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rozvrh a zobrazení
          </Text>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Styl zobrazení
          </Text>
          <SlidingTabs
            options={LAYOUT_OPTIONS}
            selectedKey={localLayout}
            onSelect={(mode) =>
              scheduleUpdate("layoutMode", mode, setLocalLayout)
            }
          />

          <Text
            style={[
              styles.fieldLabel,
              { color: colors.textSecondary, marginTop: SPACING.md },
            ]}
          >
            Výchozí pohled po spuštění
          </Text>
          <SlidingTabs
            options={DEFAULT_VIEW_OPTIONS}
            selectedKey={localDefaultView}
            onSelect={(view) =>
              scheduleUpdate("defaultView", view, setLocalDefaultView)
            }
          />

          <View style={styles.switchList}>
            <SettingSwitchRow
              title="Kompaktní karty"
              description="Menší mezery a jednořádkové číslo hodiny pro více hodin na obrazovce."
              value={settings.compactMode}
              onValueChange={(val) => updateSetting("compactMode", val)}
              colors={colors}
            />
            <SettingSwitchRow
              title="Méně animací"
              description="Vypne pružinové efekty a plynulé přechody pro rychlejší odezvu."
              value={settings.lowAnimations}
              onValueChange={(val) => updateSetting("lowAnimations", val)}
              colors={colors}
            />
            <SettingSwitchRow
              title="Zobrazit volné hodiny"
              description="Vloží prázdné bloky pro okna mezi hodinami v rozvrhu."
              value={settings.showFreeHours}
              onValueChange={(val) => updateSetting("showFreeHours", val)}
              colors={colors}
            />
            <SettingSwitchRow
              title="Přejetím měnit den"
              description="Posunutím prstem doleva/doprava přepne mezi dny v týdnu."
              value={settings.swipeDays}
              onValueChange={(val) => updateSetting("swipeDays", val)}
              colors={colors}
            />
            <SettingSwitchRow
              title="Příští týden od pátku 15:00"
              description="Po pátečním odpoledni automaticky zobrazí rozvrh na příští týden."
              value={settings.autoNextWeek}
              onValueChange={(val) => updateSetting("autoNextWeek", val)}
              colors={colors}
            />
          </View>
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
    marginBottom: SPACING.xs,
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: SPACING.xs + 2,
  },
  accentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  accentOuter: {
    width: 40,
    height: 40,
    borderRadius: RADII.pill,
    borderWidth: 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  accentSwatch: {
    width: "100%",
    height: "100%",
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  accentCheck: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  switchList: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  switchTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  actionStack: {
    marginTop: SPACING.sm,
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
