import { Linking } from "react-native";

export const SUPPORT_EMAIL = "borovec.skola@gmail.com";
export const GITHUB_NEW_ISSUE_URL =
  "https://github.com/EsmiK64/rozvrh-app/issues/new";

export function buildMailtoUrl({ subject, body } = {}) {
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${SUPPORT_EMAIL}${params.length ? `?${params.join("&")}` : ""}`;
}

export function buildGithubIssueUrl({ title, body } = {}) {
  const params = [];
  if (title) params.push(`title=${encodeURIComponent(title)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `${GITHUB_NEW_ISSUE_URL}${params.length ? `?${params.join("&")}` : ""}`;
}

export function openErrorEmail(errorMessage) {
  const url = buildMailtoUrl({
    subject: "Rozvrh – hlášení chyby / výpadku",
    body: errorMessage
      ? `Dobrý den,\n\nv aplikaci Rozvrh došlo k chybě:\n\n${errorMessage}\n`
      : "Dobrý den,\n\nchci nahlásit problém v aplikaci Rozvrh:\n\n",
  });
  return Linking.openURL(url).catch((err) =>
    console.error("Failed to open email client:", err)
  );
}

export function openGithubIssue(errorMessage) {
  const url = buildGithubIssueUrl({
    title: errorMessage ? `Chyba: ${errorMessage.slice(0, 60)}` : undefined,
    body: errorMessage ? `Popis chyby:\n\n\`\`\`\n${errorMessage}\n\`\`\`` : undefined,
  });
  return Linking.openURL(url).catch((err) =>
    console.error("Failed to open GitHub issues URL:", err)
  );
}
