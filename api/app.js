import express from "express";
import cors from "cors";
import { BakalariError } from "./bakalari.js";

const GET_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

function handleRoute(handler, { cacheable = false } = {}) {
  return async (req, res) => {
    try {
      const payload = await handler(req);
      if (cacheable) {
        res.set("Cache-Control", GET_CACHE_CONTROL);
      }
      res.status(200).json(payload);
    } catch (error) {
      const status = error instanceof BakalariError ? error.statusCode : 500;
      if (status >= 500) {
        console.error(error);
      }
      res.status(status).json({ error: error.message || "Internal server error" });
    }
  };
}

function toLegacyTimetable(days, itemKey) {
  return {
    timetable: days.map((day) => ({ [day.label]: day[itemKey] })),
  };
}

export function createApp(bakalari) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // RESTful GET endpoints (for Android & modern clients)
  app.get(
    "/api/classes",
    handleRoute(() => bakalari.listOptions("class"), { cacheable: true })
  );
  app.get(
    "/api/teachers",
    handleRoute(() => bakalari.listOptions("teacher"), { cacheable: true })
  );
  app.get(
    "/api/timetable/class/:id",
    handleRoute(
      (req) =>
        bakalari.getTimetable("class", req.params.id, {
          term: req.query.term,
        }),
      { cacheable: true }
    )
  );
  app.get(
    "/api/timetable/teacher/:id",
    handleRoute(
      (req) =>
        bakalari.getTimetable("teacher", req.params.id, {
          term: req.query.term,
        }),
      { cacheable: true }
    )
  );
  app.get(
    "/api/teacher-events/:id",
    handleRoute(
      (req) =>
        bakalari.getTeacherEvents(req.params.id, {
          term: req.query.term,
        }),
      { cacheable: true }
    )
  );

  // Backward-compatible POST endpoints (for existing React demo)
  app.post(
    "/api/fetch-classes",
    handleRoute(() => bakalari.listOptions("class"))
  );
  app.post(
    "/api/fetch-teachers",
    handleRoute(() => bakalari.listOptions("teacher"))
  );
  app.post(
    "/api/fetch-timetable",
    handleRoute(async (req) => {
      const { days } = await bakalari.getTimetable("class", req.body?.class);
      return toLegacyTimetable(days, "lessons");
    })
  );
  app.post(
    "/api/fetch-timetable-teachers",
    handleRoute(async (req) => {
      const { days } = await bakalari.getTimetable(
        "teacher",
        req.body?.teacher ?? req.body?.class
      );
      return toLegacyTimetable(days, "lessons");
    })
  );
  app.post(
    "/api/fetch-teacher-events",
    handleRoute(async (req) => {
      const { days } = await bakalari.getTeacherEvents(
        req.body?.teacher ?? req.body?.class
      );
      return toLegacyTimetable(days, "guards");
    })
  );

  return app;
}
