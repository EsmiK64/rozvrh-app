import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bakalariClient } from "../api/client";
import { ExpressivePressable } from "../components/ExpressivePressable";
import { LessonCard } from "../components/LessonCard";
import { SlidingTabs } from "../components/SlidingTabs";
import { EmptyView, ErrorView, LoadingView } from "../components/StateViews";
import { TimetableGrid } from "../components/TimetableGrid";
import { useSettings } from "../context/SettingsContext";
import { RADII, SPACING } from "../theme";
import { filterLessonsByGroups } from "../utils/groups";
import {
  insertFreeHours,
  mergeDayTimeline,
  shouldDefaultToNextWeek,
} from "../utils/lessons";
import { getSavedSelection } from "../utils/storage";

const TERMS = [
  { key: "actual", label: "Tento týden" },
  { key: "next", label: "Příští týden" },
  { key: "permanent", label: "Stálý" },
];

const WEEKDAY_ABBREVS = ["ne", "po", "út", "st", "čt", "pá", "so"];

function findDefaultDayIndex(days) {
  if (!days || days.length === 0) return 0;
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const unpadded = `${d}.${m}.`;
  const padded = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;

  const dateIdx = days.findIndex(
    (day) => day.date === unpadded || day.date === padded
  );
  if (dateIdx >= 0) return dateIdx;

  const weekday = WEEKDAY_ABBREVS[now.getDay()];
  const weekdayIdx = days.findIndex(
    (day) => day.dayAbbrev?.toLowerCase() === weekday
  );
  return weekdayIdx >= 0 ? weekdayIdx : 0;
}

const DayLessonsList = React.memo(function DayLessonsList({
  day,
  term,
  colors,
  isTeacher,
  compact,
}) {
  if (day.dayOff) {
    return (
      <View
        style={[styles.dayOffBanner, { backgroundColor: colors.dayOffBg }]}
      >
        <Text style={[styles.dayOffText, { color: colors.dayOffText }]}>
          {day.dayOffName || "Volný den"}
        </Text>
      </View>
    );
  }
  if (day.lessons.length === 0) {
    return (
      <View
        style={[
          styles.emptyDayBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
          Žádné hodiny pro vybrané skupiny.
        </Text>
      </View>
    );
  }
  return day.lessons.map((lesson, idx) => (
    <LessonCard
      key={`${term}-${day.label}-${lesson.lessonNumber}-${lesson.type}-${lesson.subjectAbbrev || idx}-${idx}`}
      lesson={lesson}
      index={idx}
      isTeacher={isTeacher}
      animateEntrance={false}
      compact={compact}
    />
  ));
});

const DayPage = React.memo(function DayPage({
  day,
  term,
  width,
  colors,
  isTeacher,
  compact,
  refreshing,
  onRefresh,
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <DayLessonsList
        day={day}
        term={term}
        colors={colors}
        isTeacher={isTeacher}
        compact={compact}
      />
    </ScrollView>
  );
});

const TimetableScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const pagerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [term, setTerm] = useState(() =>
    shouldDefaultToNextWeek(new Date(), settings.autoNextWeek)
      ? "next"
      : "actual"
  );
  const [targetInfo, setTargetInfo] = useState({
    targetKind: "class",
    targetId: null,
    targetLabel: null,
  });
  const [timetablesByTerm, setTimetablesByTerm] = useState({});
  const timetablesByTermRef = useRef(timetablesByTerm);
  timetablesByTermRef.current = timetablesByTerm;
  const [selectedGroups, setSelectedGroups] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [showAllDays, setShowAllDays] = useState(
    settings.defaultView === "week"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const currentData = timetablesByTerm[term];
  const days = currentData?.days || [];
  const hours = currentData?.hours || [];

  const preloadOtherTerms = useCallback(
    (kind, targetId, activeTerm, forceRefresh = false) => {
      const otherTerms = TERMS.map((t) => t.key).filter(
        (key) => key !== activeTerm
      );
      Promise.allSettled(
        otherTerms.map(async (otherTerm) => {
          const data = await bakalariClient.getTimetable(kind, targetId, {
            term: otherTerm,
            forceRefresh,
          });
          setTimetablesByTerm((prev) => ({
            ...prev,
            [otherTerm]: { days: data.days || [], hours: data.hours || [] },
          }));
        })
      );
    },
    []
  );

  const loadTimetable = useCallback(
    async ({ forceRefresh = false } = {}) => {
      const cached = !forceRefresh ? timetablesByTermRef.current[term] : undefined;
      if (forceRefresh) {
        setRefreshing(true);
      } else if (!cached) {
        setLoading(true);
      }
      setError(null);

      try {
        const saved = await getSavedSelection();
        if (!saved.targetId) {
          navigation.replace("Select");
          return;
        }

        setTargetInfo({
          targetKind: saved.targetKind,
          targetId: saved.targetId,
          targetLabel: saved.targetLabel,
        });
        navigation.setOptions({
          title: saved.targetLabel
            ? `Rozvrh · ${saved.targetLabel}`
            : "Rozvrh",
        });

        setSelectedGroups(saved.groups);

        if (cached) {
          setSelectedDayIdx((prev) =>
            prev !== null && prev >= 0 && prev < cached.days.length
              ? prev
              : findDefaultDayIndex(cached.days)
          );
          setLoading(false);
          return;
        }

        const data = await bakalariClient.getTimetable(
          saved.targetKind,
          saved.targetId,
          { term, forceRefresh }
        );
        const loadedDays = data.days || [];
        const loadedHours = data.hours || [];
        setTimetablesByTerm((prev) => ({
          ...prev,
          [term]: { days: loadedDays, hours: loadedHours },
        }));
        setSelectedDayIdx((prev) =>
          prev !== null && prev >= 0 && prev < loadedDays.length
            ? prev
            : findDefaultDayIndex(loadedDays)
        );
        preloadOtherTerms(saved.targetKind, saved.targetId, term, forceRefresh);
        bakalariClient.listOptions("class").catch(() => {});
        bakalariClient.listOptions("teacher").catch(() => {});
      } catch (err) {
        setError(err.message || "Nepodařilo se načíst rozvrh.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation, preloadOtherTerms, term]
  );

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const filteredDays = useMemo(
    () =>
      days.map((day) => {
        const baseLessons =
          targetInfo.targetKind === "teacher"
            ? mergeDayTimeline(day.lessons, day.guards)
            : filterLessonsByGroups(day.lessons, selectedGroups);
        return {
          ...day,
          lessons:
            settings.showFreeHours && !day.dayOff
              ? insertFreeHours(baseLessons, hours)
              : baseLessons,
        };
      }),
    [
      days,
      hours,
      targetInfo.targetKind,
      selectedGroups,
      settings.showFreeHours,
    ]
  );

  const visibleDayTabs = useMemo(() => {
    const mapped = days.map((day, index) => ({ day, index }));
    if (mapped.length <= 6) return mapped;
    const activeIdx = selectedDayIdx ?? 0;
    const start = Math.max(0, Math.min(activeIdx - 1, mapped.length - 3));
    return mapped.slice(start, start + 3);
  }, [days, selectedDayIdx]);

  const isProgrammaticScrollRef = useRef(false);
  const selectedDayIdxRef = useRef(selectedDayIdx);
  selectedDayIdxRef.current = selectedDayIdx;

  const handleSelectDay = useCallback(
    (index) => {
      setShowAllDays(false);
      setSelectedDayIdx(index);
      if (settings.layoutMode === "cards" && pagerRef.current) {
        isProgrammaticScrollRef.current = true;
        try {
          pagerRef.current.scrollToIndex({
            index,
            animated: !settings.lowAnimations,
          });
        } catch {
          isProgrammaticScrollRef.current = false;
        }
      }
    },
    [settings.layoutMode, settings.lowAnimations]
  );

  const handlePagerScroll = useCallback(
    (event) => {
      if (!windowWidth || isProgrammaticScrollRef.current) return;
      const nextIdx = Math.round(
        event.nativeEvent.contentOffset.x / windowWidth
      );
      if (
        nextIdx >= 0 &&
        nextIdx < filteredDays.length &&
        nextIdx !== selectedDayIdxRef.current
      ) {
        setSelectedDayIdx(nextIdx);
      }
    },
    [filteredDays.length, windowWidth]
  );

  const handlePagerMomentumEnd = useCallback(
    (event) => {
      isProgrammaticScrollRef.current = false;
      if (!windowWidth) return;
      const nextIdx = Math.round(
        event.nativeEvent.contentOffset.x / windowWidth
      );
      if (
        nextIdx >= 0 &&
        nextIdx < filteredDays.length &&
        nextIdx !== selectedDayIdxRef.current
      ) {
        setSelectedDayIdx(nextIdx);
      }
    },
    [filteredDays.length, windowWidth]
  );

  const handleRefresh = useCallback(
    () => loadTimetable({ forceRefresh: true }),
    [loadTimetable]
  );

  const renderPagerItem = useCallback(
    ({ item }) => (
      <DayPage
        day={item}
        term={term}
        width={windowWidth}
        colors={colors}
        isTeacher={targetInfo.targetKind === "teacher"}
        compact={settings.compactMode}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    ),
    [
      term,
      windowWidth,
      colors,
      targetInfo.targetKind,
      settings.compactMode,
      refreshing,
      handleRefresh,
    ]
  );

  const dayTabOptions = useMemo(
    () => [
      ...visibleDayTabs.map(({ day, index }) => ({
        key: String(index),
        label: day.dayAbbrev
          ? day.dayAbbrev.charAt(0).toUpperCase() + day.dayAbbrev.slice(1)
          : day.label,
        subLabel: day.date || undefined,
      })),
      { key: "all", label: "Vše" },
    ],
    [visibleDayTabs]
  );

  const selectedDayTabKey = showAllDays ? "all" : String(selectedDayIdx ?? 0);

  const handleDayTabSelect = useCallback(
    (key) => {
      if (key === "all") {
        setShowAllDays(true);
        return;
      }
      handleSelectDay(Number(key));
    },
    [handleSelectDay]
  );

  if (loading) {
    return <LoadingView message="Načítám rozvrh..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => loadTimetable()} />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.termRow}>
          <View style={styles.termTabsWrapper}>
            <SlidingTabs
              compact
              options={TERMS}
              selectedKey={term}
              onSelect={setTerm}
            />
          </View>
          {targetInfo.targetKind === "class" ? (
            <ExpressivePressable
              style={[
                styles.groupsShortcut,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => navigation.navigate("GroupSelect")}
            >
              <Text style={[styles.groupsShortcutText, { color: colors.text }]}>
                {selectedGroups?.length
                  ? `Skupiny (${selectedGroups.length})`
                  : "Skupiny"}
              </Text>
            </ExpressivePressable>
          ) : null}
        </View>
      </View>

      <View style={styles.mainContent}>
        {filteredDays.length === 0 ? (
          <EmptyView
            title="Žádné dny k zobrazení"
            message="Pro tento týden nejsou v Bakalářích žádná data."
          />
        ) : settings.layoutMode === "grid" ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadTimetable({ forceRefresh: true })}
                colors={[colors.primary]}
              />
            }
          >
            <TimetableGrid
              days={filteredDays}
              hours={hours}
              isTeacher={targetInfo.targetKind === "teacher"}
            />
          </ScrollView>
        ) : showAllDays ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadTimetable({ forceRefresh: true })}
                colors={[colors.primary]}
              />
            }
          >
            {filteredDays.map((day) => (
              <View key={day.label} style={styles.daySection}>
                <Text style={[styles.daySectionTitle, { color: colors.text }]}>
                  {day.label}
                </Text>
                <DayLessonsList
                  day={day}
                  term={term}
                  colors={colors}
                  isTeacher={targetInfo.targetKind === "teacher"}
                  compact={settings.compactMode}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Animated.FlatList
            ref={pagerRef}
            data={filteredDays}
            horizontal
            pagingEnabled
            scrollEnabled={settings.swipeDays}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `${term}-${item.label}`}
            initialScrollIndex={
              selectedDayIdx !== null && selectedDayIdx < filteredDays.length
                ? selectedDayIdx
                : 0
            }
            getItemLayout={(_, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true, listener: handlePagerScroll }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handlePagerMomentumEnd}
            initialNumToRender={5}
            windowSize={5}
            renderItem={renderPagerItem}
          />
        )}
      </View>

      {settings.layoutMode === "cards" && dayTabOptions.length > 1 ? (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.dayTabsWrapper}>
            <SlidingTabs
              compact
              options={dayTabOptions}
              selectedKey={selectedDayTabKey}
              onSelect={handleDayTabSelect}
              scrollX={
                !showAllDays && visibleDayTabs.length === filteredDays.length
                  ? scrollX
                  : null
              }
              pageWidth={windowWidth}
              pageCount={filteredDays.length}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  topBar: {
    flexShrink: 0,
    borderBottomWidth: 1,
    paddingVertical: SPACING.sm,
  },
  bottomBar: {
    flexShrink: 0,
    borderTopWidth: 1,
    paddingVertical: SPACING.sm,
  },
  dayTabsWrapper: {
    paddingHorizontal: SPACING.md,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs + 2,
  },
  termTabsWrapper: {
    flex: 1,
  },
  groupsShortcut: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  groupsShortcutText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  daySection: {
    marginBottom: SPACING.lg,
  },
  daySectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  dayOffBanner: {
    borderRadius: RADII.md,
    padding: SPACING.lg,
    alignItems: "center",
  },
  dayOffText: {
    fontWeight: "700",
    fontSize: 15,
  },
  emptyDayBox: {
    borderRadius: RADII.md,
    padding: SPACING.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyDayText: {
    fontSize: 14,
  },
});

export default TimetableScreen;
