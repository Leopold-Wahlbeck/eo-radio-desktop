const whitespacePattern = /\s+/g;

export function normalizeTrackText(value: string): string {
  return value
    .normalize("NFC")
    .replace(whitespacePattern, " ")
    .trim()
    .toLocaleUpperCase("sv-SE");
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
