import fs from "node:fs";
import path from "node:path";

const FILE_PATH = path.resolve(process.cwd(), "announcements.json");

function printUsage() {
  console.log(`Usage:
  node scripts/announcement.mjs set "<title>" "<message>" [--severity info|warning|outage]
  node scripts/announcement.mjs clear
  node scripts/announcement.mjs status`);
}

const [, , command, ...rest] = process.argv;

if (command === "clear") {
  const current = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  const next = { ...current, active: false };
  fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log("Announcement cleared (active: false). Push announcements.json to GitHub to apply.");
  process.exit(0);
}

if (command === "status") {
  console.log(fs.readFileSync(FILE_PATH, "utf8").trim());
  process.exit(0);
}

if (command === "set") {
  const title = rest[0];
  const message = rest[1];
  if (!title || !message) {
    printUsage();
    process.exit(1);
  }
  const sevIdx = rest.indexOf("--severity");
  const severity =
    sevIdx !== -1 && ["info", "warning", "outage"].includes(rest[sevIdx + 1])
      ? rest[sevIdx + 1]
      : "warning";

  const payload = {
    id: `dev-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    active: true,
    severity,
    title,
    message,
  };
  fs.writeFileSync(FILE_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log("Updated announcements.json:\n" + JSON.stringify(payload, null, 2));
  console.log("\nCommit and push announcements.json to GitHub to broadcast to users.");
  process.exit(0);
}

printUsage();
process.exit(1);
