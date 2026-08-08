import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { splitSlides } from "../lib/slides";
import SlideStage from "../components/SlideStage";
import type { LiveView } from "../types";

interface SlideRow {
  itemIndex: number;
  slideIndex: number;
  itemTitle: string;
  snippet: string;
}

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 46 ? `${line.slice(0, 46)}…` : line;
}

export default function LiveScreen({ live }: { live: LiveView | null }) {
  const [query, setQuery] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  const rows: SlideRow[] = [];
  live?.items.forEach((item, itemIndex) => {
    if (item.isSection) return;
    const slides = item.slides.length
      ? item.slides.map((s) => s.text)
      : splitSlides(item.text);
    slides.forEach((text, slideIndex) => {
      rows.push({
        itemIndex,
        slideIndex,
        itemTitle: item.title || "(tanpa judul)",
        snippet: firstLine(text),
      });
    });
  });

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [live?.itemIndex, live?.slideIndex]);

  const item = live?.items[live?.itemIndex ?? 0];
  const curSlide = item?.slides[live?.slideIndex ?? 0];
  const curBg = live?.black ? null : (curSlide?.background ?? null);

  const matches = query.trim()
    ? live?.items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => !it.isSection && it.title.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-3 bg-surface-1">
          <div className="border-b border-surface-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Slide ({rows.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {rows.map((row) => {
              const active =
                live != null &&
                row.itemIndex === live.itemIndex &&
                row.slideIndex === live.slideIndex;
              return (
                <button
                  key={`${row.itemIndex}:${row.slideIndex}`}
                  ref={active ? activeRef : undefined}
                  type="button"
                  className={
                    "mb-0.5 flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-ink hover:bg-surface-2" +
                    (active
                      ? " bg-live/10 shadow-[inset_3px_0_0_var(--color-live)]"
                      : "")
                  }
                  onClick={() => api.jumpTo(row.itemIndex, row.slideIndex)}
                >
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-ink-muted">
                    {row.itemIndex + 1}.{row.slideIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    <span className="font-medium">{row.itemTitle}</span>
                    {row.snippet ? ` — ${row.snippet}` : ""}
                  </span>
                </button>
              );
            })}
            {rows.length === 0 && (
              <p className="m-0 px-1 text-ink-muted">
                Belum ada slide. Pilih Urutan dan isi Setlist dulu.
              </p>
            )}
          </div>
        </aside>

        <SlideStage
          key={`next:${live?.itemIndex}:${live?.slideIndex}`}
          text={live?.nextSlideText ?? ""}
          background={live?.nextBackground ?? null}
          black={false}
          label={live?.nextItemTitle ? `Next: ${live.nextItemTitle}` : "Next"}
          textClass="text-[clamp(1rem,3vw,2.2rem)]"
        />

        <SlideStage
          key={`prog:${live?.itemIndex}:${live?.slideIndex}`}
          text={live?.slideText ?? ""}
          background={curBg ?? null}
          black={live?.black ?? false}
          label={live?.black ? "Program (BLACK)" : "Program"}
          textClass="text-[clamp(1rem,3vw,2.2rem)]"
        />
      </div>

      <div className="relative z-10 flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-2 px-3 py-2 shadow-lg">
        <input
          className="flex-1"
          placeholder="Cari item & tayangkan cepat…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Pencarian cepat"
        />
        {matches && matches.length > 0 && (
          <div className="absolute inset-x-3 bottom-full mb-1 max-h-48 overflow-y-auto rounded-lg border border-surface-3 bg-surface-1 p-1 shadow-lg">
            {matches.map(({ it, i }) => (
              <button
                key={it.id}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-ink hover:bg-surface-2"
                onClick={() => {
                  api.jumpTo(i, 0);
                  setQuery("");
                }}
              >
                <span className="truncate">{it.title}</span>
                <span className="ml-2 shrink-0 rounded-full border border-surface-3 bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-muted">
                  ▶
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
