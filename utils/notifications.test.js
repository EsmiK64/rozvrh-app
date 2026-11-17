import test from "node:test";
import assert from "node:assert/strict";
import { buildNextLessonReminders } from "./notifications.js";

test("buildNextLessonReminders schedules reminder at end of previous lesson", () => {
  const now = new Date("2026-11-17T08:10:00");
  const days = [
    {
      date: "17.11.",
      dayOff: false,
      lessons: [
        {
          type: "atom",
          subject: "Matematika",
          lessonTime: "8:00 - 8:45",
        },
        {
          type: "atom",
          subject: "Fyzika",
          roomAbbrev: "B332",
          lessonTime: "8:55 - 9:40",
        },
        {
          type: "removed",
          lessonTime: "9:55 - 10:40",
        },
        {
          type: "pauseGuard",
          name: "přízemí staré budovy",
          lessonTime: "10:40 - 10:50",
        },
      ],
    },
  ];

  const reminders = buildNextLessonReminders(days, { now });
  assert.equal(reminders.length, 2);
  assert.equal(reminders[0].title, "Další: Fyzika");
  assert.equal(reminders[0].body, "v 8:55 · učebna B332");
  assert.equal(reminders[0].triggerDate.getHours(), 8);
  assert.equal(reminders[0].triggerDate.getMinutes(), 45);

  assert.equal(reminders[1].title, "Dozor: přízemí staré budovy");
  assert.equal(reminders[1].triggerDate.getHours(), 9);
  assert.equal(reminders[1].triggerDate.getMinutes(), 40);
});

test("buildNextLessonReminders skips past times and dayOff", () => {
  const now = new Date("2026-11-17T15:00:00");
  const days = [
    {
      date: "17.11.",
      dayOff: false,
      lessons: [
        { type: "atom", subject: "A", lessonTime: "8:00 - 8:45" },
        { type: "atom", subject: "B", lessonTime: "8:55 - 9:40" },
      ],
    },
    {
      date: "18.11.",
      dayOff: true,
      lessons: [
        { type: "atom", subject: "C", lessonTime: "8:00 - 8:45" },
        { type: "atom", subject: "D", lessonTime: "8:55 - 9:40" },
      ],
    },
  ];

  assert.equal(buildNextLessonReminders(days, { now }).length, 0);
});
