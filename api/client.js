import { createBakalariClient } from "./bakalari";

/** Shared Bakalari API client instance so screens reuse the in-memory cache. */
export const bakalariClient = createBakalariClient();
