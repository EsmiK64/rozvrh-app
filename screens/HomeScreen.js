import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExpressivePressable } from "../components/ExpressivePressable";
import { LoadingView } from "../components/StateViews";
import { useSettings } from "../context/SettingsContext";
import { EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";
import {
  getOnboardingCompleted,
  getSavedSelection,
} from "../utils/storage";

const HomeScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const [checking, setChecking] = useState(true);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (checking) return;
    if (settings.lowAnimations) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      ...EXPRESSIVE_SPRING,
    }).start();
  }, [checking, entrance, settings.lowAnimations]);

  useEffect(() => {
    let active = true;

    const checkSavedData = async () => {
      try {
        const [{ targetKind, targetId, groups }, completed] = await Promise.all([
          getSavedSelection(),
          getOnboardingCompleted(),
        ]);
        if (
          active &&
          completed &&
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

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const scale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: entrance,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View
            style={[styles.badge, { backgroundColor: colors.primarySoft }]}
          >
            <Text style={[styles.badgeText, { color: colors.primaryText }]}>
              SPŠE Bakaláři · Krok 1 z 5
            </Text>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>
            Vítejte v Rozvrhu
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rychlý mobilní rozvrh pro SPŠE přímo z Bakalářů — včetně suplování,
            změn učeben, dozorů a upozornění na další hodinu. Otevřený zdrojový
            kód na GitHubu.
          </Text>
          <ExpressivePressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              navigation.navigate("Select", { onboarding: true })
            }
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              Začít nastavení
            </Text>
          </ExpressivePressable>
        </Animated.View>
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
