import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  TransitionPresets,
  createStackNavigator,
} from "@react-navigation/stack";
import { useSettings } from "../context/SettingsContext";
import HomeScreen from "../screens/HomeScreen";
import SelectScreen from "../screens/SelectScreen";
import TimetableScreen from "../screens/TimetableScreen";
import GroupSelectScreen from "../screens/GroupSelectScreen";
import OnboardingSetupScreen from "../screens/OnboardingSetupScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { RADII, SPACING } from "../theme";

const Stack = createStackNavigator();

const TimetableNavigator = () => {
  const { settings, colors } = useSettings();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        ...TransitionPresets.SlideFromRightIOS,
        animationEnabled: !settings.lowAnimations,
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: colors.text,
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Select"
        component={SelectScreen}
        options={{ title: "Výběr rozvrhu" }}
      />
      <Stack.Screen
        name="GroupSelect"
        component={GroupSelectScreen}
        options={{ title: "Výběr skupin" }}
      />
      <Stack.Screen
        name="OnboardingSetup"
        component={OnboardingSetupScreen}
        options={{ title: "Nastavení aplikace" }}
      />
      <Stack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={({ navigation }) => ({
          title: "Rozvrh",
          headerLeft: () => null,
          headerRight: () => (
            <Pressable
              style={[
                styles.headerButton,
                {
                  marginRight: SPACING.md,
                  backgroundColor: colors.surfaceMuted,
                },
              ]}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={[styles.headerButtonText, { color: colors.text }]}>
                Nastavení
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Nastavení" }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.md,
    gap: SPACING.xs + 2,
  },
  headerButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.pill,
  },
  headerButtonText: {
    fontWeight: "600",
    fontSize: 13,
  },
});

export default TimetableNavigator;
