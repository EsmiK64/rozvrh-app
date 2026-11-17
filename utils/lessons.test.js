import test from "node:test";
import assert from "node:assert/strict";
import {
  insertFreeHours,
  mergeDayTimeline,
  shouldDefaultToNextWeek,
} from "./lessons.js";

test("shouldDefaultToNextWeek handles weekends and Friday >= 15:00", () => {
  assert.equal(shouldDefaultToNextWeek(new Date("2026-11-21T10:00:00"), false), true); // Saturday
  assert.equal(shouldDefaultToNextWeek(new Date("2026-11-20T16:00:00"), false), false); // Friday 16:00 off
  assert.equal(shouldDefaultToNextWeek(new Date("2026-11-20T16:00:00"), true), true); // Friday 16:00 on
  assert.equal(shouldDefaultToNextWeek(new Date("2026-11-20T14:00:00"), true), false); // Friday 14:00 on
});

test("insertFreeHours inserts missing hour slots between first and last lesson", () => {
  const hours = [
    { caption: "1", beginTime: "8:00", endTime: "8:45" },
    { caption: "2", beginTime: "8:55", endTime: "9:40" },
    { caption: "3", beginTime: "9:55", endTime: "10:40" },
    { caption: "4", beginTime: "10:50", endTime: "11:35" },
  ];
  const lessons = [
    { type: "atom", lessonNumber: "2", subject: "Math" },
    { type: "atom", lessonNumber: "4", subject: "CS" },
  ];

  const result = insertFreeHours(lessons, hours);
  assert.deepEqual(
    result.map((l) => ({ num: l.lessonNumber, type: l.type })),
    [
      { num: "2", type: "atom" },
      { num: "3", type: "free" },
      { num: "4", type: "atom" },
    ]
  );
  assert.equal(result[1].lessonTime, "9:55 - 10:40");
});

test("mergeDayTimeline sorts lessons and guards chronologically by start time", () => {
  const merged = mergeDayTimeline(
    [
      { type: "atom", lessonTime: "8:00 - 8:45" },
      { type: "atom", lessonTime: "12:40 - 13:25" },
    ],
    [{ type: "pauseGuard", lessonTime: "12:30 - 12:40" }]
  );
  assert.deepEqual(
    merged.map((item) => item.type),
    ["atom", "pauseGuard", "atom"]
  );
});

test("insertFreeHours keeps pauseGuard in chronological position instead of moving it to index 0", () => {
  const hours = [
    { caption: "4", beginTime: "10:50", endTime: "11:35" },
    { caption: "5", beginTime: "11:45", endTime: "12:30" },
    { caption: "6", beginTime: "12:40", endTime: "13:25" },
  ];
  const timeline = [
    { type: "atom", lessonNumber: "4", lessonTime: "10:50 - 11:35" },
    { type: "pauseGuard", lessonNumber: null, lessonTime: "12:30 - 12:40" },
    { type: "atom", lessonNumber: "6", lessonTime: "12:40 - 13:25" },
  ];
  const result = insertFreeHours(timeline, hours);
  assert.deepEqual(
    result.map((item) => item.type),
    ["atom", "free", "pauseGuard", "atom"]
  );
});
