import { pathToFileURL } from "node:url";
import { createBakalariClient } from "./bakalari.js";
import { createApp } from "./app.js";

const app = createApp(createBakalariClient());
export default app;

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
