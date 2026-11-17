import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";

const PILL_SPRING = {
  stiffness: 520,
  damping: 34,
  mass: 0.65,
  useNativeDriver: true,
};

/**
 * Material 3 Expressive segmented control with a single sliding pill indicator
 * running 100% on the native UI thread via transform.translateX.
 */
export const SlidingTabs = React.memo(function SlidingTabs({
  options,
  selectedKey,
  onSelect,
  compact = false,
  scrollX = null,
  pageWidth = 0,
  pageCount = 0,
}) {
  const { settings, colors } = useSettings();
  const layoutsRef = useRef({});
  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const initializedRef = useRef(false);

  const canUseLiveScroll = Boolean(
    scrollX && pageWidth > 0 && pageCount > 1 && !settings.lowAnimations
  );

  const animateToKey = (key, immediate = false) => {
    const layout = layoutsRef.current[key];
    if (!layout) return;

    if (layout.width > 0 && layout.width !== indicatorWidth) {
      setIndicatorWidth(layout.width);
    }

    if (immediate || !initializedRef.current || settings.lowAnimations) {
      indicatorX.setValue(layout.x);
      initializedRef.current = true;
      return;
    }

    Animated.spring(indicatorX, {
      toValue: layout.x,
      ...PILL_SPRING,
    }).start();
  };

  useEffect(() => {
    animateToKey(selectedKey);
  }, [selectedKey, options, settings.lowAnimations]);

  const handleItemLayout = (key, event) => {
    const { x, width } = event.nativeEvent.layout;
    layoutsRef.current[key] = { x, width };
    if (key === selectedKey) {
      animateToKey(key, !initializedRef.current);
    }
  };

  let liveTranslateX = null;
  if (canUseLiveScroll && indicatorWidth > 0) {
    const pageLayouts = [];
    for (let i = 0; i < pageCount; i += 1) {
      const l = layoutsRef.current[String(i)];
      if (!l) break;
      pageLayouts.push(l);
    }
    if (pageLayouts.length === pageCount) {
      liveTranslateX = scrollX.interpolate({
        inputRange: pageLayouts.map((_, i) => i * pageWidth),
        outputRange: pageLayouts.map((l) => l.x),
        extrapolate: "clamp",
      });
    }
  }

  return (
    <View
      style={[
        styles.track,
        compact && styles.trackCompact,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      {indicatorWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            compact && styles.indicatorCompact,
            {
              backgroundColor: colors.primary,
              left: 0,
              width: indicatorWidth,
              transform: [{ translateX: liveTranslateX || indicatorX }],
            },
          ]}
        />
      ) : null}

      {options.map((option) => {
        const active = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            style={[styles.tab, compact && styles.tabCompact]}
            onLayout={(e) => handleItemLayout(option.key, e)}
            onPress={() => onSelect(option.key)}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                compact && styles.tabTextCompact,
                { color: active ? colors.white : colors.textSecondary },
                active && styles.tabTextActive,
              ]}
            >
              {option.label}
            </Text>
            {option.subLabel ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.subLabelText,
                  {
                    color: active ? colors.white : colors.textMuted,
                    opacity: active ? 0.9 : 1,
                  },
                ]}
              >
                {option.subLabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    position: "relative",
    borderRadius: RADII.pill,
    padding: 4,
    borderWidth: 1,
  },
  trackCompact: {
    padding: 3,
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: RADII.pill,
    zIndex: 0,
  },
  indicatorCompact: {
    top: 3,
    bottom: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    zIndex: 2,
  },
  tabCompact: {
    paddingVertical: SPACING.xs + 3,
    paddingHorizontal: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextCompact: {
    fontSize: 12,
  },
  tabTextActive: {
    fontWeight: "700",
  },
  subLabelText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
});
