import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";

/**
 * Material 3 Expressive selectable chip with spring press feedback,
 * smooth color/border interpolation, and an animated selection checkmark.
 */
export const ExpressiveChip = React.memo(function ExpressiveChip({
  label,
  active,
  showCheck = false,
  onPress,
}) {
  const { settings, colors } = useSettings();
  const selection = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (settings.lowAnimations) {
      selection.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(selection, {
      toValue: active ? 1 : 0,
      stiffness: 320,
      damping: 26,
      mass: 0.85,
      useNativeDriver: false,
    }).start();
  }, [active, selection, settings.lowAnimations]);

  const animatePress = (toValue) => {
    if (settings.lowAnimations) return;
    Animated.spring(pressScale, {
      toValue,
      ...EXPRESSIVE_SPRING,
    }).start();
  };

  const backgroundColor = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceMuted, colors.primary],
  });

  const borderColor = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const textColor = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.text, colors.white],
  });

  const checkWidth = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animatePress(0.93)}
      onPressOut={() => animatePress(1)}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor,
              borderColor,
            },
          ]}
        >
          {showCheck ? (
            <Animated.View
              style={[
                styles.checkWrapper,
                {
                  width: checkWidth,
                  opacity: selection,
                },
              ]}
            >
              <Animated.Text style={[styles.checkText, { color: textColor }]}>
                ✓
              </Animated.Text>
            </Animated.View>
          ) : null}
          <Animated.Text style={[styles.label, { color: textColor }]}>
            {label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  checkWrapper: {
    overflow: "hidden",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 14,
    fontWeight: "800",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
