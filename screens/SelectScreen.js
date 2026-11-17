import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bakalariClient } from "../api/client";
import { ExpressivePressable } from "../components/ExpressivePressable";
import { SlidingTabs } from "../components/SlidingTabs";
import { EmptyView, ErrorView, LoadingView } from "../components/StateViews";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { getSavedSelection, saveSelectedTarget } from "../utils/storage";

const TARGET_KINDS = [
  { key: "class", label: "Třídy" },
  { key: "teacher", label: "Učitelé" },
];

const YEAR_FILTERS = [
  { key: "all", label: "Vše" },
  { key: "1.", label: "1." },
  { key: "2.", label: "2." },
  { key: "3.", label: "3." },
  { key: "4.", label: "4." },
];

const ROW_HEIGHT = 54;
const ROW_GAP = 8;
const ITEM_HEIGHT = ROW_HEIGHT + ROW_GAP;

const OptionRow = React.memo(function OptionRow({
  value,
  label,
  isSelected,
  onSelect,
  colors,
  lowAnimations,
}) {
  const fadeAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const prevSelectedRef = useRef(isSelected);

  useEffect(() => {
    if (prevSelectedRef.current === isSelected) return;
    prevSelectedRef.current = isSelected;
    if (lowAnimations) {
      fadeAnim.setValue(isSelected ? 1 : 0);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isSelected, fadeAnim, lowAnimations]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primarySoft],
  });
  const borderColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Pressable onPress={() => onSelect(value)}>
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor,
            borderColor,
          },
        ]}
      >
        <Text
          style={[
            styles.rowLabel,
            { color: isSelected ? colors.primaryText : colors.text },
            isSelected && { fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
        <Animated.View
          style={[
            styles.radio,
            {
              borderColor,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.radioDot,
              {
                backgroundColor: colors.primary,
                opacity: fadeAnim,
                transform: [{ scale: fadeAnim }],
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const SelectScreen = ({ navigation, route }) => {
  const isOnboarding = Boolean(route?.params?.onboarding);
  const { settings, colors } = useSettings();
  const listFade = useRef(new Animated.Value(1)).current;
  const [kind, setKind] = useState("class");
  const [optionsByKind, setOptionsByKind] = useState({ class: [], teacher: [] });
  const [selectedValue, setSelectedValue] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const loadAllOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classes, teachers, saved] = await Promise.all([
        bakalariClient.listOptions("class"),
        bakalariClient.listOptions("teacher"),
        getSavedSelection(),
      ]);
      setOptionsByKind({ class: classes, teacher: teachers });

      const initialKind = saved.targetKind || "class";
      setKind(initialKind);

      const list = initialKind === "teacher" ? teachers : classes;
      const hasSaved =
        saved.targetId && list.some((item) => item.value === saved.targetId);
      setSelectedValue(hasSaved ? saved.targetId : list[0]?.value ?? null);
    } catch (err) {
      setError(err.message || "Nepodařilo se načíst seznam tříd a učitelů.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllOptions();
  }, [loadAllOptions]);

  const handleKindChange = (nextKind) => {
    setKind(nextKind);
    setSearchQuery("");
    setYearFilter("all");
    const nextList = optionsByKind[nextKind] || [];
    setSelectedValue(nextList[0]?.value ?? null);
    if (!settings.lowAnimations) {
      listFade.setValue(0.35);
      Animated.timing(listFade, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  };

  const classOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return optionsByKind.class.filter((item) => {
      const matchesYear =
        yearFilter === "all" || item.label.startsWith(yearFilter);
      const matchesQuery =
        !query || item.label.toLowerCase().includes(query);
      return matchesYear && matchesQuery;
    });
  }, [optionsByKind.class, yearFilter, searchQuery]);

  const teacherOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return optionsByKind.teacher;
    return optionsByKind.teacher.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  }, [optionsByKind.teacher, searchQuery]);

  const currentOptions = optionsByKind[kind] || [];

  const selectedOption = useMemo(
    () => currentOptions.find((item) => item.value === selectedValue) ?? null,
    [currentOptions, selectedValue]
  );

  const handleContinue = async () => {
    if (!selectedOption) return;
    setSaveError(null);
    try {
      await saveSelectedTarget(kind, selectedOption.value, selectedOption.label);
      if (kind === "teacher") {
        if (isOnboarding) {
          navigation.navigate("OnboardingSetup");
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "Timetable" }],
          });
        }
      } else {
        navigation.navigate("GroupSelect", { onboarding: isOnboarding });
      }
    } catch (err) {
      setSaveError(err.message || "Nepodařilo se uložit výběr.");
    }
  };

  if (loading) {
    return <LoadingView message="Načítám seznam tříd a učitelů..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadAllOptions} />;
  }

  if (currentOptions.length === 0) {
    return (
      <EmptyView
        title="Žádné položky nenalezeny"
        message="Bakaláři nevrátili žádný seznam."
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.kindTabsWrapper}>
          <SlidingTabs
            options={TARGET_KINDS}
            selectedKey={kind}
            onSelect={handleKindChange}
          />
        </View>

        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={
              kind === "teacher"
                ? "Hledat učitele (např. Novák)..."
                : "Hledat třídu (např. 1.A)..."
            }
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={[styles.clearButtonText, { color: colors.textMuted }]}>
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>

        {kind === "class" ? (
          <View style={styles.yearTabsWrapper}>
            <SlidingTabs
              compact
              options={YEAR_FILTERS}
              selectedKey={yearFilter}
              onSelect={setYearFilter}
            />
          </View>
        ) : null}

        <Animated.View style={{ flex: 1, opacity: listFade }}>
          <FlatList
            data={kind === "class" ? classOptions : teacherOptions}
            extraData={selectedValue}
            keyExtractor={(item) => `${kind}-${item.value}`}
            contentContainerStyle={styles.listContent}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={3}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            renderItem={({ item }) => (
              <OptionRow
                value={item.value}
                label={item.label}
                isSelected={item.value === selectedValue}
                onSelect={setSelectedValue}
                colors={colors}
                lowAnimations={settings.lowAnimations}
              />
            )}
            ListEmptyComponent={
              <Text style={[styles.noMatch, { color: colors.textMuted }]}>
                Žádná položka neodpovídá vybranému filtru.
              </Text>
            }
          />
        </Animated.View>

        <View
          style={[
            styles.footer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          {saveError ? (
            <Text style={[styles.saveError, { color: colors.removedText }]}>
              {saveError}
            </Text>
          ) : null}
          <ExpressivePressable
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              !selectedOption && styles.continueButtonDisabled,
            ]}
            disabled={!selectedOption}
            onPress={handleContinue}
          >
            <Text style={[styles.continueText, { color: colors.white }]}>
              {selectedOption
                ? kind === "teacher"
                  ? `Zobrazit rozvrh (${selectedOption.label})`
                  : `Pokračovat (${selectedOption.label})`
                : "Vyberte položku"}
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
  container: {
    flex: 1,
  },
  kindTabsWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADII.md,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
  },
  clearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  yearTabsWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  listsContainer: {
    flex: 1,
  },
  listVisible: {
    flex: 1,
  },
  listHidden: {
    display: "none",
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: ROW_HEIGHT,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    marginTop: ROW_GAP,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: RADII.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADII.pill,
  },
  noMatch: {
    textAlign: "center",
    marginTop: SPACING.xl,
    fontSize: 15,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  saveError: {
    fontSize: 13,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  continueButton: {
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 2,
    alignItems: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

export default SelectScreen;
