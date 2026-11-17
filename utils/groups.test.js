import test from "node:test";
import assert from "node:assert/strict";
import {
  splitGroupTokens,
  splitClassAndGroup,
  extractGroupOptions,
  filterLessonsByGroups,
} from "./groups.js";

test("splitGroupTokens splits comma-separated and <br>-separated group names", () => {
  assert.deepEqual(splitGroupTokens("A1, A2"), ["A1", "A2"]);
  assert.deepEqual(splitGroupTokens("PX1<br/>PX2"), ["PX1", "PX2"]);
  assert.deepEqual(splitGroupTokens("PX1<br>PX2"), ["PX1", "PX2"]);
  assert.deepEqual(splitGroupTokens("PX1"), ["PX1"]);
  assert.deepEqual(splitGroupTokens(null), []);
  assert.deepEqual(splitGroupTokens(""), []);
});

test("extractGroupOptions groups numbered variants into choices and singletons into toggles", () => {
  const days = [
    {
      lessons: [
        { group: "A1" },
        { group: "A2" },
        { group: "PX1<br/>PX2" },
        { group: "PX3" },
        { group: "CM" },
        { group: "DV" },
        { group: "A1, A2" },
        { group: null },
      ],
    },
  ];

  const result = extractGroupOptions(days);
  assert.deepEqual(result.choices, [
    { id: "A", kind: "choice", options: ["A1", "A2"] },
    { id: "PX", kind: "choice", options: ["PX1", "PX2", "PX3"] },
  ]);
  assert.deepEqual(result.toggles, [
    { id: "CM", kind: "toggle", options: ["CM"] },
    { id: "DV", kind: "toggle", options: ["DV"] },
  ]);
});

test("filterLessonsByGroups keeps ungrouped lessons and lessons matching any selected group", () => {
  const lessons = [
    { subject: "Math", group: null },
    { subject: "English 1", group: "A1" },
    { subject: "English 2", group: "A2" },
    { subject: "Both", group: "A1, A2" },
  ];

  assert.deepEqual(
    filterLessonsByGroups(lessons, ["A1"]).map((l) => l.subject),
    ["Math", "English 1", "Both"]
  );
  assert.equal(filterLessonsByGroups(lessons, null).length, 4);
});

test("splitClassAndGroup separates class name and group from teacher group strings", () => {
  assert.deepEqual(splitClassAndGroup("1.I S1"), {
    className: "1.I",
    groupName: "S1",
  });
  assert.deepEqual(splitClassAndGroup("2.A"), {
    className: "2.A",
    groupName: null,
  });
  assert.deepEqual(splitClassAndGroup("3.D PX1, 3.D PX2"), {
    className: "3.D",
    groupName: "PX1, PX2",
  });
  assert.deepEqual(splitClassAndGroup(null), {
    className: null,
    groupName: null,
  });
});
