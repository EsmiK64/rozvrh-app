import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { EXPRESSIVE_SPRING } from "../theme";

/**
 * Tactile Material 3 Expressive pressable with spring scale feedback,
 * automatically disabled when lowAnimations is enabled.
 */
export function ExpressivePressable({
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  disabled,
  onPress,
  ...rest
}) {
  const { settings } = useSettings();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    if (settings.lowAnimations) return;
    Animated.spring(scale, {
      toValue,
      ...EXPRESSIVE_SPRING,
    }).start();
  };

  return (
    <Pressable
      style={containerStyle}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
