import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingView } from "../components/StateViews";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { getSavedSelection } from "../utils/storage";

const HomeScreen = ({ navigation }) => {
  const { colors } = useSettings();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSavedData = async () => {
      try {
        const { targetKind, targetId, groups } = await getSavedSelection();
        if (
          active &&
          targetId &&
          (targetKind === "teacher" || groups !== null)
        ) {
          navigation.replace("Timetable");
          return;
        }
      } catch (error) {
        console.error("Error fetching saved data:", error);
      }
      if (active) {
        setChecking(false);
      }
    };

    checkSavedData();
    return () => {
      active = false;
    };
  }, [navigation]);

  if (checking) {
    return <LoadingView message="Načítám uložený rozvrh..." />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.badge, { backgroundColor: colors.primarySoft }]}
          >
            <Text style={[styles.badgeText, { color: colors.primaryText }]}>
              SPŠE Bakaláři
            </Text>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>
            Školní rozvrh
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Vyberte si třídu nebo učitele. Rozvrh včetně suplování a změn se
            načte přímo z Bakalářů.
          </Text>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Select")}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              Vybrat třídu
            </Text>
          </Pressable>
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
    justifyContent: "center",
    padding: SPACING.xl,
  },
  card: {
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    borderWidth: 1,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    marginBottom: SPACING.md,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    borderRadius: RADII.md,
    paddingVertical: SPACING.md + 2,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

export default HomeScreen;
