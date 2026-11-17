import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bakalariClient } from "../api/client";
import { ExpressiveChip } from "../components/ExpressiveChip";
import { ExpressivePressable } from "../components/ExpressivePressable";
import { SlidingTabs } from "../components/SlidingTabs";
import { ErrorView, LoadingView } from "../components/StateViews";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { extractGroupOptions } from "../utils/groups";
import { getSavedSelection, saveSelectedGroups } from "../utils/storage";

const GroupSelectScreen = ({ navigation }) => {
  const { colors } = useSettings();
  const [classLabel, setClassLabel] = useState(null);
  const [choices, setChoices] = useState([]);
  const [toggles, setToggles] = useState([]);
  const [selectedChoices, setSelectedChoices] = useState({});
  const [selectedToggles, setSelectedToggles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await getSavedSelection();
      if (!saved.classId) {
        navigation.replace("Select");
        return;
      }

      setClassLabel(saved.classLabel || saved.classId);
      const timetable = await bakalariClient.getTimetable("class", saved.classId, {
        term: "permanent",
      });
      const extracted = extractGroupOptions(timetable.days);
      setChoices(extracted.choices);
      setToggles(extracted.toggles);

      const savedSet = new Set(saved.groups || []);
      const initialChoices = {};
      for (const group of extracted.choices) {
        const match = group.options.find((opt) => savedSet.has(opt));
        initialChoices[group.id] = match || group.options[0];
      }
      setSelectedChoices(initialChoices);

      const initialToggles = {};
      for (const group of extracted.toggles) {
        initialToggles[group.id] = savedSet.has(group.id);
      }
      setSelectedToggles(initialToggles);
    } catch (err) {
      setError(err.message || "Nepodařilo se načíst skupiny třídy.");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleSave = async () => {
    const finalGroups = [
      ...Object.values(selectedChoices).filter(Boolean),
      ...Object.entries(selectedToggles)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id),
    ];

    setSaveError(null);
    try {
      await saveSelectedGroups(finalGroups);
      navigation.reset({
        index: 0,
        routes: [{ name: "Timetable" }],
      });
    } catch (err) {
      setSaveError(err.message || "Nepodařilo se uložit vybrané skupiny.");
    }
  };

  if (loading) {
    return <LoadingView message="Zjišťuji skupiny v rozvrhu..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadGroups} />;
  }

  const hasAnyGroups = choices.length > 0 || toggles.length > 0;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Skupiny pro {classLabel || "vybranou třídu"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {hasAnyGroups
            ? "Vyberte své dělení třídy, aby se zobrazovaly jen vaše hodiny."
            : "V rozvrhu této třídy nejsou žádné dělené skupiny."}
        </Text>

        {choices.map((group) => (
          <View
            key={group.id}
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Skupina {group.id}
            </Text>
            <SlidingTabs
              options={group.options.map((opt) => ({ key: opt, label: opt }))}
              selectedKey={selectedChoices[group.id]}
              onSelect={(option) =>
                setSelectedChoices((prev) => ({
                  ...prev,
                  [group.id]: option,
                }))
              }
            />
          </View>
        ))}

        {toggles.length > 0 ? (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Volitelné / další skupiny
            </Text>
            <View style={styles.pillRow}>
              {toggles.map((group) => (
                <ExpressiveChip
                  key={group.id}
                  label={group.id}
                  showCheck
                  active={Boolean(selectedToggles[group.id])}
                  onPress={() =>
                    setSelectedToggles((prev) => ({
                      ...prev,
                      [group.id]: !prev[group.id],
                    }))
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

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
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveText, { color: colors.white }]}>
            Zobrazit rozvrh
          </Text>
        </ExpressivePressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: RADII.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 2,
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveError: {
    fontSize: 13,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
});

export default GroupSelectScreen;
