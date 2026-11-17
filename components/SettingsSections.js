import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { ACCENT_PRESETS, EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";
import { ExpressiveSwitch } from "./ExpressiveSwitch";
import { SlidingTabs } from "./SlidingTabs";

export const THEME_OPTIONS = [
  { key: "light", label: "Světlý" },
  { key: "dark", label: "Tmavý" },
  { key: "amoled", label: "AMOLED" },
  { key: "system", label: "Systém" },
];

export const LAYOUT_OPTIONS = [
  { key: "cards", label: "Karty" },
  { key: "grid", label: "Tabulka" },
];

export const DEFAULT_VIEW_OPTIONS = [
  { key: "day", label: "Dnešní den" },
  { key: "week", label: "Celý týden" },
];

export function SettingSwitchRow({
  title,
  description,
  value,
  onValueChange,
  colors,
}) {
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

export function ExpressiveColorSwatch({
  color,
  active,
  ringColor,
  lowAnimations,
  onPress,
}) {
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

export function AppearanceControls({
  themeMode,
  accentColor,
  layoutMode,
  compactMode,
  lowAnimations,
  onThemeChange,
  onAccentChange,
  onLayoutChange,
  onCompactChange,
  onLowAnimationsChange,
}) {
  const { isDark, colors } = useSettings();

  return (
    <>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        Barevný motiv
      </Text>
      <SlidingTabs
        options={THEME_OPTIONS}
        selectedKey={themeMode}
        onSelect={onThemeChange}
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
              active={accentColor === key}
              ringColor={colors.text}
              lowAnimations={lowAnimations}
              onPress={() => onAccentChange(key)}
            />
          );
        })}
      </View>

      <Text
        style={[
          styles.fieldLabel,
          { color: colors.textSecondary, marginTop: SPACING.md },
        ]}
      >
        Styl zobrazení
      </Text>
      <SlidingTabs
        options={LAYOUT_OPTIONS}
        selectedKey={layoutMode}
        onSelect={onLayoutChange}
      />

      <View style={styles.switchList}>
        <SettingSwitchRow
          title="Kompaktní karty"
          description="Menší mezery a jednořádkové číslo hodiny pro více hodin na obrazovce."
          value={compactMode}
          onValueChange={onCompactChange}
          colors={colors}
        />
        <SettingSwitchRow
          title="Méně animací"
          description="Vypne pružinové efekty a plynulé přechody pro rychlejší odezvu."
          value={lowAnimations}
          onValueChange={onLowAnimationsChange}
          colors={colors}
        />
      </View>
    </>
  );
}

export function NotificationControls({
  lessonReminders,
  devNotifications,
  onLessonRemindersChange,
  onDevNotificationsChange,
}) {
  const { colors } = useSettings();
  return (
    <View style={styles.switchListCompact}>
      <SettingSwitchRow
        title="Připomínka další hodiny"
        description="Upozorní na konci předchozí hodiny, co a v jaké učebně následuje."
        value={lessonReminders}
        onValueChange={onLessonRemindersChange}
        colors={colors}
      />
      <SettingSwitchRow
        title="Informace od vývojáře"
        description="Upozorní na výpadky Bakalářů nebo důležité zprávy k aplikaci."
        value={devNotifications}
        onValueChange={onDevNotificationsChange}
        colors={colors}
      />
    </View>
  );
}

export function BehaviorControls({
  defaultView,
  showFreeHours,
  swipeDays,
  autoNextWeek,
  onDefaultViewChange,
  onShowFreeHoursChange,
  onSwipeDaysChange,
  onAutoNextWeekChange,
}) {
  const { colors } = useSettings();
  return (
    <>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        Výchozí pohled po spuštění
      </Text>
      <SlidingTabs
        options={DEFAULT_VIEW_OPTIONS}
        selectedKey={defaultView}
        onSelect={onDefaultViewChange}
      />
      <View style={styles.switchList}>
        <SettingSwitchRow
          title="Zobrazit volné hodiny"
          description="Vloží prázdné bloky pro okna mezi hodinami v rozvrhu."
          value={showFreeHours}
          onValueChange={onShowFreeHoursChange}
          colors={colors}
        />
        <SettingSwitchRow
          title="Přejetím měnit den"
          description="Posunutím prstem doleva/doprava přepne mezi dny v týdnu."
          value={swipeDays}
          onValueChange={onSwipeDaysChange}
          colors={colors}
        />
        <SettingSwitchRow
          title="Příští týden od pátku 15:00"
          description="Po pátečním odpoledni automaticky zobrazí rozvrh na příští týden."
          value={autoNextWeek}
          onValueChange={onAutoNextWeekChange}
          colors={colors}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  switchListCompact: {
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
});
