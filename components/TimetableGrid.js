import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { splitClassAndGroup } from "../utils/groups";

/**
 * Classic Bakaláři-style horizontal weekly matrix grid (hours as columns, days as rows)
 * with tap-to-inspect cell details.
 */
export function TimetableGrid({ days = [], hours = [], isTeacher = false }) {
  const { colors } = useSettings();
  const [selectedCell, setSelectedCell] = useState(null);

  const visibleHours = hours.filter((h) => h.caption !== undefined);

  const getCellColors = (lesson) => {
    if (!lesson) return { bg: colors.surface, border: colors.border, text: colors.text };
    if (lesson.type === "removed" || lesson.hasChanged || lesson.changeinfo) {
      return { bg: colors.removedBg, border: colors.removedBorder, text: colors.removedText };
    }
    if (lesson.type === "absent") {
      return { bg: colors.absentBg, border: colors.absentBorder, text: colors.absentText };
    }
    if (lesson.type === "pauseGuard") {
      return { bg: colors.pauseGuardBg, border: colors.pauseGuardBorder, text: colors.pauseGuardText };
    }
    if (lesson.type === "hourGuard") {
      return { bg: colors.hourGuardBg, border: colors.hourGuardBorder, text: colors.hourGuardText };
    }
    return { bg: colors.surface, border: colors.border, text: colors.text };
  };

  const getCellLabel = (lesson) => {
    if (lesson.type === "pauseGuard") return `Dozor`;
    if (lesson.type === "hourGuard") return lesson.abbrev || "Poh";
    if (lesson.type === "removed") return "Odpadá";
    if (lesson.type === "absent") return "Absence";
    return lesson.subjectAbbrev || lesson.subject || "—";
  };

  const getCellSub = (lesson) => {
    if (isTeacher && lesson.group) {
      const { className } = splitClassAndGroup(lesson.group);
      return className || lesson.roomAbbrev || "";
    }
    return lesson.roomAbbrev || lesson.room || "";
  };

  return (
    <View style={styles.wrapper}>
      {selectedCell ? (
        <Pressable
          onPress={() => setSelectedCell(null)}
          style={[
            styles.inspector,
            { backgroundColor: colors.surface, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.inspectorTitle, { color: colors.text }]}>
            {selectedCell.subject || selectedCell.name || selectedCell.removedInfo || "Detail"}
          </Text>
          <Text style={[styles.inspectorMeta, { color: colors.textSecondary }]}>
            {[
              selectedCell.lessonTime,
              selectedCell.room,
              selectedCell.teacher,
              selectedCell.group,
              selectedCell.changeinfo,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.dayHeaderCell,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.headerText, { color: colors.text }]}>Den</Text>
            </View>
            {visibleHours.map((h) => (
              <View
                key={h.caption}
                style={[
                  styles.hourHeaderCell,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.headerText, { color: colors.text }]}>
                  {h.caption}.
                </Text>
                <Text style={[styles.hourTimeText, { color: colors.textMuted }]}>
                  {h.beginTime}
                </Text>
              </View>
            ))}
          </View>

          {days.map((day) => {
            const byHour = new Map();
            for (const lesson of day.lessons || []) {
              const key = String(lesson.lessonNumber);
              if (!byHour.has(key)) {
                byHour.set(key, lesson);
              }
            }
            return (
              <View key={day.label} style={styles.dayRow}>
                <View
                  style={[
                    styles.dayLabelCell,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.dayAbbrev, { color: colors.text }]}>
                    {day.dayAbbrev || day.label}
                  </Text>
                  <Text style={[styles.dayDate, { color: colors.textMuted }]}>
                    {day.date || ""}
                  </Text>
                </View>

                {day.dayOff ? (
                  <View
                    style={[
                      styles.dayOffCell,
                      { backgroundColor: colors.dayOffBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.dayOffText, { color: colors.dayOffText }]}>
                      {day.dayOffName || "Volno"}
                    </Text>
                  </View>
                ) : (
                  visibleHours.map((h) => {
                    const primary = byHour.get(String(h.caption));
                    const cellTheme = getCellColors(primary);
                    return (
                      <Pressable
                        key={`${day.label}-${h.caption}`}
                        onPress={() => primary && setSelectedCell(primary)}
                        style={[
                          styles.slotCell,
                          {
                            backgroundColor: cellTheme.bg,
                            borderColor: cellTheme.border,
                          },
                        ]}
                      >
                        {primary ? (
                          <>
                            <Text
                              numberOfLines={1}
                              style={[styles.cellSubject, { color: cellTheme.text }]}
                            >
                              {getCellLabel(primary)}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.cellSub, { color: colors.textSecondary }]}
                            >
                              {getCellSub(primary)}
                            </Text>
                          </>
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  inspector: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  inspectorTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  inspectorMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
  },
  dayHeaderCell: {
    width: 64,
    padding: SPACING.xs + 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hourHeaderCell: {
    width: 74,
    padding: SPACING.xs + 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  hourTimeText: {
    fontSize: 10,
  },
  dayRow: {
    flexDirection: "row",
  },
  dayLabelCell: {
    width: 64,
    height: 62,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  dayAbbrev: {
    fontSize: 13,
    fontWeight: "700",
  },
  dayDate: {
    fontSize: 10,
  },
  dayOffCell: {
    flex: 1,
    minWidth: 260,
    height: 62,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOffText: {
    fontSize: 13,
    fontWeight: "700",
  },
  slotCell: {
    width: 74,
    height: 62,
    borderWidth: 1,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSubject: {
    fontSize: 13,
    fontWeight: "700",
  },
  cellSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
