import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { EXPRESSIVE_SPRING, RADII, SPACING } from "../theme";
import { splitClassAndGroup } from "../utils/groups";

function getVariantStyle(colors, variant) {
  switch (variant) {
    case "changed":
      return {
        row: {
          backgroundColor: colors.removedBg,
          borderColor: colors.removedBorder,
        },
        badge: { backgroundColor: colors.removedBadgeBg },
        numberText: { color: colors.removedText },
        title: { color: colors.text },
      };
    case "removed":
      return {
        row: {
          backgroundColor: colors.removedBg,
          borderColor: colors.removedBorder,
        },
        badge: { backgroundColor: colors.removedBadgeBg },
        numberText: { color: colors.removedText },
        title: { color: colors.removedText, fontSize: 15 },
      };
    case "absent":
      return {
        row: {
          backgroundColor: colors.absentBg,
          borderColor: colors.absentBorder,
        },
        badge: { backgroundColor: colors.absentBadgeBg },
        numberText: { color: colors.absentText },
        title: { color: colors.absentText, fontSize: 15 },
      };
    case "pauseGuard":
      return {
        row: {
          backgroundColor: colors.pauseGuardBg,
          borderColor: colors.pauseGuardBorder,
        },
        badge: { backgroundColor: colors.pauseGuardBadgeBg },
        numberText: { color: colors.pauseGuardText, fontSize: 14 },
        title: { color: colors.pauseGuardText, fontSize: 15 },
      };
    case "hourGuard":
      return {
        row: {
          backgroundColor: colors.hourGuardBg,
          borderColor: colors.hourGuardBorder,
        },
        badge: { backgroundColor: colors.hourGuardBadgeBg },
        numberText: { color: colors.hourGuardText },
        title: { color: colors.hourGuardText, fontSize: 15 },
      };
    case "free":
      return {
        row: {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderStyle: "dashed",
        },
        badge: { backgroundColor: colors.surface },
        numberText: { color: colors.textMuted },
        title: { color: colors.textMuted, fontSize: 14 },
      };
    default:
      return {
        row: { backgroundColor: colors.surface, borderColor: colors.border },
        badge: { backgroundColor: colors.surfaceMuted },
        numberText: { color: colors.text },
        title: { color: colors.text },
      };
  }
}

function getStatusBadge(colors, variant) {
  switch (variant) {
    case "changed":
      return {
        label: "ZMĚNA",
        bg: colors.removedBadgeBg,
        text: colors.removedText,
      };
    case "removed":
      return {
        label: "ODPADÁ",
        bg: colors.removedBadgeBg,
        text: colors.removedText,
      };
    case "absent":
      return {
        label: "ABSENCE",
        bg: colors.absentBadgeBg,
        text: colors.absentText,
      };
    case "pauseGuard":
      return {
        label: "DOZOR",
        bg: colors.pauseGuardBadgeBg,
        text: colors.pauseGuardText,
      };
    case "hourGuard":
      return {
        label: "POHOTOVOST",
        bg: colors.hourGuardBadgeBg,
        text: colors.hourGuardText,
      };
    default:
      return null;
  }
}

function getLessonVariant(lesson) {
  if (lesson.type === "free") return "free";
  if (lesson.type === "pauseGuard") return "pauseGuard";
  if (lesson.type === "hourGuard") return "hourGuard";
  if (lesson.type === "removed") return "removed";
  if (lesson.type === "absent") return "absent";
  if (lesson.hasChanged || lesson.changeinfo) return "changed";
  return "normal";
}

function getLessonTitle(lesson, variant) {
  if (variant === "free") return "Volná hodina";
  if (variant === "pauseGuard") {
    return `Dozor: ${lesson.name || lesson.abbrev || ""}`.trim();
  }
  if (variant === "hourGuard") {
    return lesson.name || lesson.abbrev || "Suplovací pohotovost";
  }
  if (variant === "removed") {
    return (
      lesson.removedInfo ||
      lesson.changeinfo ||
      lesson.absentInfoText ||
      lesson.absencetext ||
      "Hodina odpadá"
    );
  }
  if (variant === "absent") {
    return (
      lesson.absentInfoText ||
      lesson.absencetext ||
      lesson.changeinfo ||
      "Absence"
    );
  }
  return lesson.subject || lesson.subjectAbbrev || "Neznámý předmět";
}

function formatHomeworks(homeworks) {
  if (!homeworks) return null;
  if (Array.isArray(homeworks)) {
    const items = homeworks
      .map((hw) => (typeof hw === "string" ? hw : hw?.Description || hw?.Content || ""))
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  }
  return typeof homeworks === "string" && homeworks.trim() ? homeworks.trim() : null;
}

/** Minimal geometric eye icon for break supervision ("Dozor") badges. */
function DozorIcon({ color = "#3730A3" }) {
  return (
    <View style={[styles.dozorEye, { borderColor: color }]}>
      <View style={[styles.dozorPupil, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * Renders a single timetable slot with Expressive 3 staggered spring entrance,
 * tactile press feedback, and animated expandable metadata.
 */
export const LessonCard = React.memo(function LessonCard({
  lesson,
  index = 0,
  isTeacher = false,
  animateEntrance = true,
  compact = false,
}) {
  const { settings, colors } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const shouldAnimate = animateEntrance && !settings.lowAnimations;
  const entrance = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldAnimate) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const delay = Math.min(index, 5) * 20;
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entrance, {
        toValue: 1,
        stiffness: 420,
        damping: 28,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [shouldAnimate, entrance, index]);

  const variant = getLessonVariant(lesson);
  const vStyle = getVariantStyle(colors, variant);
  const statusBadge = getStatusBadge(colors, variant);
  const isAtom = variant === "normal" || variant === "changed";
  const isGuard = variant === "pauseGuard" || variant === "hourGuard";
  const absenceNote = lesson.absentInfoText || lesson.absencetext;
  const homeworksText = formatHomeworks(lesson.homeworks);
  const fullRoom =
    lesson.room && lesson.room !== lesson.roomAbbrev ? lesson.room : null;
  const hasDetails = isAtom
    ? Boolean(
        lesson.theme ||
          lesson.notice ||
          lesson.changeinfo ||
          absenceNote ||
          homeworksText ||
          fullRoom
      )
    : isGuard
      ? Boolean(lesson.day || lesson.info || lesson.lessonTime)
      : Boolean(
          lesson.changeinfo || lesson.notice || lesson.theme || absenceNote
        );

  const toggleExpanded = () => {
    if (!hasDetails) return;
    const next = !expanded;
    setExpanded(next);
    if (settings.lowAnimations) {
      expandAnim.setValue(next ? 1 : 0);
      return;
    }
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: false,
    }).start();
  };

  const animatePress = (toValue) => {
    if (settings.lowAnimations) return;
    Animated.spring(pressScale, {
      toValue,
      ...EXPRESSIVE_SPRING,
    }).start();
  };

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const combinedScale = Animated.multiply(entranceScale, pressScale);
  const chevronRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const detailsHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const teacherInfo = isTeacher ? splitClassAndGroup(lesson.group) : null;
  const primaryMeta = isTeacher
    ? teacherInfo.className || lesson.teacher || "—"
    : lesson.teacher || lesson.teacherAbbrev || "—";
  const pillGroup = isTeacher ? teacherInfo.groupName : lesson.group;

  const startTime = lesson.lessonTime ? lesson.lessonTime.split(" - ")[0] : null;
  const Container = hasDetails ? Pressable : View;

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ translateY }, { scale: combinedScale }],
      }}
    >
      <Container
        onPress={hasDetails ? toggleExpanded : undefined}
        onPressIn={hasDetails ? () => animatePress(0.975) : undefined}
        onPressOut={hasDetails ? () => animatePress(1) : undefined}
        style={[styles.lessonRow, compact && styles.lessonRowCompact, vStyle.row]}
      >
        <View
          style={[
            styles.numberBadge,
            compact && styles.numberBadgeCompact,
            vStyle.badge,
          ]}
        >
          {variant === "pauseGuard" && !lesson.lessonNumber ? (
            <DozorIcon color={vStyle.numberText?.color} />
          ) : (
            <Text
              style={[
                styles.numberText,
                compact && styles.numberTextCompact,
                vStyle.numberText,
              ]}
            >
              {lesson.lessonNumber || "–"}
            </Text>
          )}
          {!compact && startTime ? (
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {startTime}
            </Text>
          ) : null}
        </View>

        <View style={styles.lessonBody}>
          <View style={styles.lessonHeader}>
            <Text style={[styles.subjectText, vStyle.title]} numberOfLines={3}>
              {getLessonTitle(lesson, variant)}
            </Text>
            {statusBadge ? (
              <View
                style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}
              >
                <Text
                  style={[styles.statusPillText, { color: statusBadge.text }]}
                >
                  {statusBadge.label}
                </Text>
              </View>
            ) : null}
            {isAtom && (lesson.roomAbbrev || lesson.room) ? (
              <View
                style={[
                  styles.roomPill,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[styles.roomText, { color: colors.textSecondary }]}
                >
                  {lesson.roomAbbrev || lesson.room}
                </Text>
              </View>
            ) : null}
          </View>

          {isAtom ? (
            <View style={styles.metaRow}>
              <Text
                style={[styles.metaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {primaryMeta}
              </Text>
              {pillGroup ? (
                <View
                  style={[
                    styles.groupBadge,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.groupBadgeText,
                      { color: colors.primaryText },
                    ]}
                  >
                    {pillGroup}
                  </Text>
                </View>
              ) : null}
              {hasDetails ? (
                <Animated.Text
                  style={[
                    styles.expandHint,
                    { color: colors.textMuted },
                    { transform: [{ rotate: chevronRotate }] },
                  ]}
                >
                  ▾
                </Animated.Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {lesson.lessonTime || ""}
              </Text>
              {hasDetails ? (
                <Animated.Text
                  style={[
                    styles.expandHint,
                    { color: colors.textMuted },
                    { transform: [{ rotate: chevronRotate }] },
                  ]}
                >
                  ▾
                </Animated.Text>
              ) : null}
            </View>
          )}

          {isAtom && lesson.changeinfo ? (
            <Text style={[styles.changeBanner, { color: colors.removedText }]}>
              {lesson.changeinfo}
            </Text>
          ) : null}
          {isAtom && absenceNote ? (
            <Text style={[styles.absenceBanner, { color: colors.absentText }]}>
              {absenceNote}
            </Text>
          ) : null}

          {hasDetails ? (
            <Animated.View
              style={[
                styles.detailsWrapper,
                {
                  height: detailsHeight,
                  opacity: expandAnim,
                },
              ]}
            >
              <View
                style={[
                  styles.detailsInner,
                  { borderTopColor: colors.border },
                ]}
                onLayout={(e) => {
                  const h = Math.ceil(e.nativeEvent.layout.height) + SPACING.sm;
                  if (h > 0 && h !== contentHeight) {
                    setContentHeight(h);
                  }
                }}
              >
                {lesson.day && isGuard ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Den: {lesson.day}
                  </Text>
                ) : null}
                {lesson.lessonTime ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Čas: {lesson.lessonTime}
                  </Text>
                ) : null}
                {fullRoom ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Učebna: {fullRoom}
                  </Text>
                ) : null}
                {lesson.info ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Info: {lesson.info}
                  </Text>
                ) : null}
                {lesson.changeinfo ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Změna: {lesson.changeinfo}
                  </Text>
                ) : null}
                {absenceNote ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Absence: {absenceNote}
                  </Text>
                ) : null}
                {lesson.theme ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Téma: {lesson.theme}
                  </Text>
                ) : null}
                {lesson.notice ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Poznámka: {lesson.notice}
                  </Text>
                ) : null}
                {homeworksText ? (
                  <Text
                    style={[styles.detailLine, { color: colors.textSecondary }]}
                  >
                    Úkoly: {homeworksText}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Container>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  lessonRow: {
    flexDirection: "row",
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    gap: SPACING.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lessonRowCompact: {
    padding: SPACING.sm,
    marginBottom: SPACING.xs + 2,
    borderRadius: RADII.md,
    gap: SPACING.sm,
  },
  numberBadge: {
    width: 52,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },
  numberBadgeCompact: {
    width: 40,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.sm,
  },
  numberText: {
    fontSize: 19,
    fontWeight: "800",
  },
  numberTextCompact: {
    fontSize: 16,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  dozorEye: {
    width: 22,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  dozorPupil: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  lessonBody: {
    flex: 1,
    justifyContent: "center",
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  subjectText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  roomPill: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  roomText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
  },
  groupBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  expandHint: {
    fontSize: 13,
    fontWeight: "700",
  },
  changeBanner: {
    marginTop: SPACING.xs + 2,
    fontSize: 12,
    fontWeight: "600",
  },
  absenceBanner: {
    marginTop: SPACING.xs + 2,
    fontSize: 12,
    fontWeight: "600",
  },
  detailsWrapper: {
    overflow: "hidden",
  },
  detailsInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    gap: 3,
  },
  detailLine: {
    fontSize: 12,
  },
});
