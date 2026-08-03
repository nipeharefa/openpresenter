import { useEffect } from "react";
import { api } from "../lib/api";
import { itemSlideCount } from "../lib/slides";
import type { LiveView } from "../types";

interface LiveViewProps {
  live: LiveView | null;
  projectionOpen: boolean;
  onStop: () => void;
}

export default function LiveView({ live, projectionOpen, onStop }: LiveViewProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        api.nextSlide();
      } else if (
        e.code === "Backspace" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowUp"
      ) {
        e.preventDefault();
        api.prevSlide();
      } else if (e.key === "b" || e.key === "B") {
        api.toggleBlack();
      } else if (e.key === "Escape") {
        if (!projectionOpen) return;
        api.stopLive();
        onStop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStop, projectionOpen]);

  if (!live?.loaded) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="m-0 text-ink-muted">
          Belum ada urutan dimuat. Pilih urutan dari menu atas, lalu kembali ke
          Live.
        </p>
      </div>
    );
  }

  const item = live.items[live.itemIndex];

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-surface-3 bg-surface-1 p-2">
        {live.items.map((it, index) => (
          <button
            key={it.id}
            type="button"
            className={
              "flex items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-2 text-left text-ink hover:bg-surface-2" +
              (index === live.itemIndex
                ? " bg-brand-weak text-white shadow-[inset_3px_0_0_var(--color-brand)]"
                : "")
            }
            onClick={() => api.jumpItem(index)}
          >
            <span className="flex-1 truncate">{it.title || "(tanpa judul)"}</span>
            <span className="shrink-0 rounded-full border border-surface-3 bg-surface-2 px-1.5 py-0.5 text-xs text-ink-muted">
              {itemSlideCount(it)}
            </span>
          </button>
        ))}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-2.5 px-3.5 py-3.5">
        <div className="flex items-center gap-3.5">
          <span
            className={
              "flex items-center gap-1.5 text-xs font-semibold tracking-wider before:block before:h-2 before:w-2 before:rounded-full" +
              (live.black
                ? " text-ink-muted before:bg-ink-muted"
                : " text-live before:bg-live")
            }
          >
            {live.black ? "BLACK" : "LIVE"}
          </span>
          <span className="text-[13px] tabular-nums text-ink-muted" role="status">
            Item {live.itemIndex + 1}/{live.items.length} · Slide{" "}
            {live.slideIndex + 1}/{Math.max(live.slideCount, 1)}
          </span>
          <span className="truncate font-medium text-ink">
            {item.title || "(tanpa judul)"}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-surface-3 bg-black">
          {live.black ? (
            <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
              Layar Hitam
            </span>
          ) : (
            <div
              key={`${live.itemIndex}:${live.slideIndex}`}
              className="max-w-full animate-[proj-in_200ms_ease] whitespace-pre-line px-6 py-6 text-center text-[clamp(1rem,3vw,2rem)] leading-relaxed text-[#f2f1ec]"
            >
              {live.slideText}
            </div>
          )}
        </div>

        <div className="z-10 flex items-center justify-center gap-2.5 rounded-md bg-surface-2 px-4 py-3 shadow-lg">
          <button className="min-w-[118px] rounded-md px-6 py-3 text-[15px]" onClick={() => api.prevSlide()}>
            ← Prev
          </button>
          <button
            className={
              "min-w-[118px] rounded-md px-6 py-3 text-[15px]" +
              (live.black ? " border-alert bg-alert-weak text-alert" : "")
            }
            onClick={() => api.toggleBlack()}
          >
            Black
          </button>
          <button
            className="min-w-[118px] rounded-md border-brand bg-brand px-6 py-3 text-[15px] font-semibold text-white"
            onClick={() => api.nextSlide()}
          >
            Next →
          </button>
          <button
            className="min-w-[118px] rounded-md border-alert px-6 py-3 text-[15px] text-alert hover:bg-alert hover:text-white"
            disabled={!projectionOpen}
            title={projectionOpen ? "" : "Buka Proyeksi dulu"}
            onClick={() => {
              api.stopLive();
              onStop();
            }}
          >
            Stop Live
          </button>
        </div>

        <p className="m-0 text-center text-xs text-ink-muted">
          Space/Enter = next · Backspace = prev · B = black · Esc = stop live
        </p>
      </main>
    </div>
  );
}
