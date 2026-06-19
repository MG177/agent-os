/** Normalize assistant prose for chat UI (markdown + plain). */
export function normalizeAssistantDisplayText(text: string): string {
  let t = text.replace(/\r\n/g, "\n");
  t = t.replace(/\*\*\s+/g, "**").replace(/\s+\*\*/g, "**");

  const paragraphs = t.split(/\n\n+/);
  t = paragraphs
    .map((p) => p.replace(/\n/g, " ").replace(/ {2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

  return t.trim();
}
