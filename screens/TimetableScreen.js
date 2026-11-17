import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
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
import {
  sendDevAnnouncementNotification,
  syncLessonReminders,
} from "../services/notificationService";
import { RADII, SPACING } from "../theme";
import { fetchActiveAnnouncement } from "../utils/announcements";
import { filterLessonsByGroups } from "../utils/groups";
import {
  getCurrentTimeInsertIndex,
  insertFreeHours,
  isDayToday,
  mergeDayTimeline,
  shouldDefaultToNextWeek,
} from "../utils/lessons";
import {
  dismissAnnouncement,
  getAnnouncementState,
  getSavedSelection,
  markAnnouncementSeen,
} from "../utils/storage";

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

function formatClockTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function CurrentTimeLine({ timeLabel }) {
  return (
    <View style={styles.timeLineRow}>
      <View style={styles.timeLineBadge}>
        <Text style={styles.timeLineBadgeText}>{timeLabel}</Text>
      </View>
      <View style={styles.timeLineDot} />
      <View style={styles.timeLineBar} />
    </View>
  );
}

const DayLessonsList = React.memo(function DayLessonsList({
  day,
  term,
  colors,
  isTeacher,
  compact,
  timeMarker,
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

  const markerIndex =
    timeMarker && isDayToday(day, timeMarker.now)
      ? getCurrentTimeInsertIndex(day.lessons, timeMarker.now)
      : -1;

  const items = [];
  day.lessons.forEach((lesson, idx) => {
    if (markerIndex === idx) {
      items.push(
        <CurrentTimeLine
          key={`now-line-${day.label}`}
          timeLabel={timeMarker.label}
        />
      );
    }
    items.push(
      <LessonCard
        key={`${term}-${day.label}-${lesson.lessonNumber}-${lesson.type}-${lesson.subjectAbbrev || idx}-${idx}`}
        lesson={lesson}
        index={idx}
        isTeacher={isTeacher}
        animateEntrance={false}
        compact={compact}
      />
    );
  });

  if (markerIndex === day.lessons.length) {
    items.push(
      <CurrentTimeLine
        key={`now-line-${day.label}`}
        timeLabel={timeMarker.label}
      />
    );
  }

  return items;
});

const DayPage = React.memo(function DayPage({
  day,
  term,
  width,
  colors,
  isTeacher,
  compact,
  timeMarker,
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
        timeMarker={timeMarker}
      />
    </ScrollView>
  );
});

const TimetableScreen = ({ navigation }) => {
  const { settings, colors } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const pagerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const initialTerm = shouldDefaultToNextWeek(new Date(), settings.autoNextWeek)
    ? "next"
    : "actual";
  const [term, setTerm] = useState(initialTerm);
  const [localTerm, setLocalTerm] = useState(initialTerm);
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
  const [localShowAllDays, setLocalShowAllDays] = useState(
    settings.defaultView === "week"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [remote, state] = await Promise.all([
        fetchActiveAnnouncement(),
        getAnnouncementState(),
      ]);
      if (!active || !remote) return;
      if (state.dismissedId !== remote.id) {
        setAnnouncement(remote);
      }
      if (settings.devNotifications && state.seenId !== remote.id) {
        await markAnnouncementSeen(remote.id);
        await sendDevAnnouncementNotification(remote);
      }
    })();
    return () => {
      active = false;
    };
  }, [settings.devNotifications]);

  const timeMarker = useMemo(
    () =>
      term === "actual"
        ? { now, label: formatClockTime(now) }
        : null,
    [now, term]
  );

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

  const targetInfoRef = useRef(targetInfo);
  targetInfoRef.current = targetInfo;

  const loadTimetable = useCallback(
    async ({ forceRefresh = false } = {}) => {
      const cached = !forceRefresh ? timetablesByTermRef.current[term] : undefined;
      if (cached && targetInfoRef.current.targetId) {
        setSelectedDayIdx((prev) =>
          prev !== null && prev >= 0 && prev < cached.days.length
            ? prev
            : findDefaultDayIndex(cached.days)
        );
        setLoading(false);
        return;
      }

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

  useEffect(() => {
    const actualDays = timetablesByTerm.actual?.days;
    if (!actualDays || !targetInfo.targetId) return;

    const preparedDays = actualDays.map((day) => ({
      ...day,
      lessons:
        targetInfo.targetKind === "teacher"
          ? mergeDayTimeline(day.lessons, day.guards)
          : filterLessonsByGroups(day.lessons, selectedGroups),
    }));

    syncLessonReminders(preparedDays, {
      enabled: settings.lessonReminders,
      isTeacher: targetInfo.targetKind === "teacher",
    });
  }, [
    timetablesByTerm.actual,
    targetInfo.targetId,
    targetInfo.targetKind,
    selectedGroups,
    settings.lessonReminders,
  ]);

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

  const handleSelectTerm = useCallback((nextTerm) => {
    setLocalTerm(nextTerm);
    requestAnimationFrame(() => {
      setTerm(nextTerm);
    });
  }, []);

  const handleSelectDay = useCallback(
    (index) => {
      setLocalShowAllDays(false);
      setSelectedDayIdx(index);
      if (showAllDays) {
        requestAnimationFrame(() => {
          setShowAllDays(false);
        });
        return;
      }
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
    [settings.layoutMode, settings.lowAnimations, showAllDays]
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
        timeMarker={timeMarker}
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
      timeMarker,
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

  const selectedDayTabKey = localShowAllDays
    ? "all"
    : String(selectedDayIdx ?? 0);

  const handleDayTabSelect = useCallback(
    (key) => {
      if (key === "all") {
        setLocalShowAllDays(true);
        requestAnimationFrame(() => {
          setShowAllDays(true);
        });
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
              selectedKey={localTerm}
              onSelect={handleSelectTerm}
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

      {announcement ? (
        <View
          style={[
            styles.announcementBanner,
            {
              backgroundColor:
                announcement.severity === "outage"
                  ? colors.removedBg
                  : colors.changedBg,
              borderBottomColor:
                announcement.severity === "outage"
                  ? colors.removedBorder
                  : colors.changedBorder,
            },
          ]}
        >
          <View style={styles.announcementTextWrap}>
            <Text
              style={[
                styles.announcementTitle,
                {
                  color:
                    announcement.severity === "outage"
                      ? colors.removedText
                      : colors.changedText,
                },
              ]}
            >
              {announcement.title}
            </Text>
            <Text
              style={[
                styles.announcementMessage,
                { color: colors.textSecondary },
              ]}
            >
              {announcement.message}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              dismissAnnouncement(announcement.id).catch(() => {});
              setAnnouncement(null);
            }}
            style={styles.announcementDismiss}
          >
            <Text style={[styles.announcementDismissText, { color: colors.textMuted }]}>
              ✕
            </Text>
          </Pressable>
        </View>
      ) : null}

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
                  timeMarker={timeMarker}
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
            keyExtractor={(_, index) => String(index)}
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
  timeLineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.xs + 2,
  },
  timeLineBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  timeLineBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  timeLineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    marginLeft: -2,
  },
  timeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: "#EF4444",
    borderRadius: 999,
  },
  announcementBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  announcementTextWrap: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  announcementMessage: {
    fontSize: 12,
    marginTop: 1,
  },
  announcementDismiss: {
    padding: SPACING.xs + 2,
  },
  announcementDismissText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default TimetableScreen;
