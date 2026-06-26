/** Shared title derivation for Capture UI and WhatsApp webhook. */
export function titleFromCapture(title?: string, content?: string): string {
  if (title?.trim()) return title.trim();
  const line = content?.trim().split("\n")[0]?.trim();
  if (line) return line.length > 80 ? `${line.slice(0, 77)}…` : line;
  const now = new Date();
  return `Capture ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Body for WhatsApp captures with triage footer. */
export function bodyFromWhatsApp(text: string, from: string): string {
  const trimmed = text.trim();
  const footer = `_Captured via WhatsApp · ${from}_`;
  return trimmed ? `${trimmed}\n\n${footer}` : footer;
}
