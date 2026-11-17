import test from "node:test";
import assert from "node:assert/strict";
import { createBakalariClient, BakalariError } from "./bakalari.js";

const SAMPLE_INDEX_HTML = `
<html><body>
  <select id="selectedClass">
    <option></option>
    <option value="4E">1.A</option>
    <option value="4F">1.B</option>
  </select>
  <select id="selectedTeacher">
    <option></option>
    <option value="UVORT">Ad&#225;mek Libor</option>
    <option value="UZOSM">Andrle &amp; Co</option>
  </select>
</body></html>
`;

function buildTimetableHtml(timetableData) {
  return `
    <html><body>
      <script type="text/javascript">
        var TimetableContent = function () {
          const timetableData = ${JSON.stringify(timetableData)};
        };
      </script>
    </body></html>
  `;
}

const SAMPLE_TIMETABLE_DATA = {
  Hours: [
    { Caption: "1", BeginTime: "8:00", EndTime: "8:45" },
    { Caption: "2", BeginTime: "8:55", EndTime: "9:40" },
  ],
  Days: [
    {
      DayAbbrev: "po",
      Date: "16.11.",
      DayOff: true,
      DayOffName: "ředitelské volno",
      Hours: null,
      PauseGuards: [
        { Name: "přízemí", Abbrev: "A", Begin: "10:30:00", End: "10:50:00" },
      ],
      HourGuards: [],
      GeneralGuards: [],
    },
    {
      DayAbbrev: "st",
      Date: "18.11.",
      DayOff: false,
      Hours: [
        {
          Type: "atoms",
          Begin: "08:00:00",
          End: "08:45:00",
          Atoms: [
            {
              Type: "atom",
              SubjectText: "Praxe",
              SubjectAbbrev: "PX",
              Day: "18.11.2026 (středa)",
              Time: "8:00 - 8:45",
              Teacher: "REH",
              TeacherFullname: "Luboš Řehounek",
              Room: "B007",
              RoomFullName: "B007 - dílna",
              GroupsNames: "PX1",
              GroupsFullNames: "PX1 - Praxe 1",
              Theme: "Úvod",
              Notice: "",
              ChangeInfo: "",
              Homeworks: null,
              AtomAbsenceText: "",
              AbsentInfo: null,
              HasAbsent: false,
              HasChanged: false,
            },
          ],
        },
        {
          Type: "removed",
          Begin: "08:55:00",
          End: "09:40:00",
          InfoAbsent: null,
          InfoAbsentName: null,
          InfoRemoved: "Odpadá",
        },
      ],
      PauseGuards: [],
      HourGuards: [{ Name: "Suplovací pohotovost", Abbrev: "Poh" }],
      GeneralGuards: [],
    },
  ],
};

function makeFakeFetch(routes) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const entry = routes[url];
    if (!entry) {
      return { ok: false, status: 404, text: async () => "Not Found" };
    }
    return {
      ok: entry.status ? entry.status < 400 : true,
      status: entry.status ?? 200,
      text: async () => entry.body,
    };
  };
  return { fetch, calls };
}

test("listOptions parses class and teacher selects with entity decoding", async () => {
  const { fetch } = makeFakeFetch({
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/": {
      body: SAMPLE_INDEX_HTML,
    },
  });
  const client = createBakalariClient({ fetch });

  const classes = await client.listOptions("class");
  assert.deepEqual(classes, [
    { value: "4E", label: "1.A" },
    { value: "4F", label: "1.B" },
  ]);

  const teachers = await client.listOptions("teacher");
  assert.deepEqual(teachers, [
    { value: "UVORT", label: "Adámek Libor" },
    { value: "UZOSM", label: "Andrle & Co" },
  ]);
});

test("getTimetable uses Actual on weekdays and Next on weekends, normalizing days and hours", async () => {
  const weekdayUrl =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Actual/Class/4E";
  const weekendUrl =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Next/Class/4E";
  const permanentUrl =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Permanent/Class/4E";

  let currentTime = new Date("2026-11-17T10:00:00Z"); // Tuesday
  const { fetch, calls } = makeFakeFetch({
    [weekdayUrl]: { body: buildTimetableHtml(SAMPLE_TIMETABLE_DATA) },
    [weekendUrl]: { body: buildTimetableHtml(SAMPLE_TIMETABLE_DATA) },
    [permanentUrl]: { body: buildTimetableHtml(SAMPLE_TIMETABLE_DATA) },
  });

  const client = createBakalariClient({
    fetch,
    now: () => currentTime,
    cacheTtlMs: 60_000,
  });

  const result = await client.getTimetable("class", "4E");
  assert.equal(calls[0], weekdayUrl);
  assert.equal(result.hours.length, 2);
  assert.equal(result.days[0].label, "po 16.11.");
  assert.equal(result.days[0].dayOff, true);
  assert.equal(result.days[0].dayOffName, "ředitelské volno");
  assert.deepEqual(result.days[0].lessons, []);

  const wednesdayLessons = result.days[1].lessons;
  assert.equal(wednesdayLessons.length, 2);
  assert.equal(wednesdayLessons[0].subject, "Praxe");
  assert.equal(wednesdayLessons[0].lessonNumber, "1");
  assert.equal(wednesdayLessons[0].group, "PX1");
  assert.equal(wednesdayLessons[1].type, "removed");
  assert.equal(wednesdayLessons[1].lessonNumber, "2");
  assert.equal(wednesdayLessons[1].removedInfo, "Odpadá");

  // Cache hit within TTL
  await client.getTimetable("class", "4E");
  assert.equal(calls.length, 1);

  // Force refresh bypasses cache
  await client.getTimetable("class", "4E", { forceRefresh: true });
  assert.equal(calls.length, 2);

  // Explicit term override
  await client.getTimetable("class", "4E", { term: "permanent" });
  assert.equal(calls[2], permanentUrl);

  // Weekend switches to Next
  currentTime = new Date("2026-11-21T10:00:00Z"); // Saturday
  await client.getTimetable("class", "4E");
  assert.equal(calls[3], weekendUrl);
});

test("getTeacherEvents collects PauseGuards, HourGuards, and GeneralGuards", async () => {
  const url =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Actual/Teacher/UVORT";
  const { fetch } = makeFakeFetch({
    [url]: { body: buildTimetableHtml(SAMPLE_TIMETABLE_DATA) },
  });
  const client = createBakalariClient({
    fetch,
    now: () => new Date("2026-11-17T10:00:00Z"),
  });

  const events = await client.getTeacherEvents("UVORT");
  assert.equal(events.days[0].label, "po 16.11.");
  assert.equal(events.days[0].guards.length, 1);
  assert.equal(events.days[1].guards[0].Abbrev, "Poh");
});

test("getTimetable includes normalized guards for teacher schedules", async () => {
  const url =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Actual/Teacher/UVORT";
  const teacherData = {
    Hours: [{ Caption: "4", BeginTime: "10:50", EndTime: "11:35" }],
    Days: [
      {
        DayAbbrev: "st",
        Date: "18.11.",
        DayOff: false,
        Hours: [],
        PauseGuards: [
          {
            Name: "přízemí staré budovy",
            Abbrev: "A",
            Begin: "12:30:00",
            End: "12:40:00",
            IsPause: true,
            TooltipDetails: JSON.stringify({ day: "18.11.2026 (středa)" }),
          },
        ],
        HourGuards: [
          {
            Name: "Suplovací pohotovost",
            Abbrev: "Poh",
            Begin: "10:50:00",
            End: "11:35:00",
            IsPause: false,
          },
        ],
        GeneralGuards: [],
      },
    ],
  };

  const { fetch } = makeFakeFetch({
    [url]: { body: buildTimetableHtml(teacherData) },
  });
  const client = createBakalariClient({
    fetch,
    now: () => new Date("2026-11-17T10:00:00Z"),
  });

  const tt = await client.getTimetable("teacher", "UVORT");
  assert.equal(tt.days[0].guards.length, 2);
  assert.equal(tt.days[0].guards[0].type, "hourGuard");
  assert.equal(tt.days[0].guards[0].lessonNumber, "4");
  assert.equal(tt.days[0].guards[1].type, "pauseGuard");
  assert.equal(tt.days[0].guards[1].lessonTime, "12:30 - 12:40");
  assert.equal(tt.days[0].guards[1].day, "18.11.2026 (středa)");
});

test("getTimetable validates input, term, and surfaces upstream HTTP errors", async () => {
  const { fetch } = makeFakeFetch({
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Actual/Class/BAD": {
      status: 500,
      body: "Server Error",
    },
  });
  const client = createBakalariClient({
    fetch,
    now: () => new Date("2026-11-17T10:00:00Z"),
  });

  await assert.rejects(
    () => client.getTimetable("class", ""),
    (err) => err instanceof BakalariError && err.statusCode === 400
  );

  await assert.rejects(
    () => client.getTimetable("class", "4E", { term: "invalid" }),
    (err) => err instanceof BakalariError && err.statusCode === 400
  );

  await assert.rejects(
    () => client.getTimetable("class", "BAD"),
    (err) => err instanceof BakalariError && err.statusCode === 502
  );
});

test("getTimetable sorts lessons by lessonNumber and lessonTime", async () => {
  const url =
    "https://bakalari.spse.cz/bakaweb/Timetable/Public/Actual/Class/4E";
  const unsortedData = {
    Hours: [
      { Caption: "1", BeginTime: "8:00", EndTime: "8:45" },
      { Caption: "2", BeginTime: "8:55", EndTime: "9:40" },
      { Caption: "10", BeginTime: "16:15", EndTime: "17:00" },
    ],
    Days: [
      {
        DayAbbrev: "po",
        Date: "16.11.",
        DayOff: false,
        Hours: [
          {
            Type: "atoms",
            Begin: "16:15:00",
            End: "17:00:00",
            Atoms: [{ Type: "atom", SubjectText: "Late", Time: "16:15 - 17:00" }],
          },
          {
            Type: "removed",
            Begin: "08:55:00",
            End: "09:40:00",
            InfoRemoved: "Odpadá",
          },
          {
            Type: "atoms",
            Begin: "08:00:00",
            End: "08:45:00",
            Atoms: [{ Type: "atom", SubjectText: "First", Time: "8:00 - 8:45" }],
          },
        ],
      },
    ],
  };

  const { fetch } = makeFakeFetch({
    [url]: { body: buildTimetableHtml(unsortedData) },
  });
  const client = createBakalariClient({
    fetch,
    now: () => new Date("2026-11-17T10:00:00Z"),
  });

  const result = await client.getTimetable("class", "4E");
  assert.deepEqual(
    result.days[0].lessons.map((l) => l.lessonNumber),
    ["1", "2", "10"]
  );
});
