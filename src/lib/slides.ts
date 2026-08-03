import type { LiveItem } from "../types";

export function splitSlides(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function itemSlideCount(item: LiveItem): number {
  if (item.slides.length > 0) return item.slides.length;
  return splitSlides(item.text).length;
}

export function kindLabel(kind: string | null | undefined): string {
  if (kind === "presentation") return "Presentasi";
  if (kind === "media") return "Media";
  return "Lagu";
}
