import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSettings } from "../context/SettingsContext";

const SWITCH_SPRING = {
  stiffness: 460,
  damping: 28,
  mass: 0.75,
  useNativeDriver: true,
};

/**
 * Material 3 Expressive animated toggle switch running 100% on the native UI thread
 * (opacity-faded active track, spring thumb travel, and press feedback).
 */
export const ExpressiveSwitch = React.memo(function ExpressiveSwitch({
  value,
  onValueChange,
}) {
  const { settings, colors } = useSettings();
  const [localValue, setLocalValue] = useState(value);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const runToggleAnim = (nextValue) => {
    if (settings.lowAnimations) {
      anim.setValue(nextValue ? 1 : 0);
      return;
    }
    Animated.spring(anim, {
      toValue: nextValue ? 1 : 0,
      ...SWITCH_SPRING,
    }).start();
  };

  useEffect(() => {
    setLocalValue(value);
    runToggleAnim(value);
  }, [value, settings.lowAnimations]);

  const animatePress = (toValue) => {
    if (settings.lowAnimations) return;
    Animated.spring(pressScale, {
      toValue,
      ...SWITCH_SPRING,
    }).start();
  };

  const handlePress = () => {
    const next = !localValue;
    setLocalValue(next);
    runToggleAnim(next);
    requestAnimationFrame(() => {
      onValueChange(next);
    });
  };

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });

  const thumbScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.82, 1.08, 1],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: localValue }}
      onPress={handlePress}
      onPressIn={() => animatePress(0.92)}
      onPressOut={() => animatePress(1)}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <View
          style={[
            styles.track,
            {
              backgroundColor: localValue
                ? colors.primary
                : colors.surfaceMuted,
              borderColor: localValue ? colors.primary : colors.border,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: localValue ? colors.white : colors.textMuted,
                transform: [
                  { translateX: thumbTranslateX },
                  { scale: thumbScale },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },
});
