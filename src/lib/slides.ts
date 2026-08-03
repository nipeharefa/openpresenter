export function splitSlides(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
