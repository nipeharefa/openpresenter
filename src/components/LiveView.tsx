import { useEffect } from "react";
import { api } from "../lib/api";
import type { LiveView } from "../types";
import { itemSlideCount } from "../lib/slides";

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
      <div className="live live--empty">
        <p className="muted">
          Belum ada urutan dimuat. Pilih urutan dari menu atas, lalu kembali ke
          Live.
        </p>
      </div>
    );
  }

  const item = live.items[live.itemIndex];

  return (
    <div className="live">
      <aside className="live__list layer-surface-1">
        {live.items.map((it, index) => (
          <button
            key={it.id}
            type="button"
            className={"live__row" + (index === live.itemIndex ? " live__row--active" : "")}
            onClick={() => api.jumpItem(index)}
          >
            <span className="live__row-title">{it.title || "(tanpa judul)"}</span>
            <span className="badge">{itemSlideCount(it)}</span>
          </button>
        ))}
      </aside>

      <main className="live__stage">
        <div className="live__strip">
          <span className={live.black ? "live__badge live__badge--dim" : "live__badge"}>
            {live.black ? "BLACK" : "LIVE"}
          </span>
          <span className="live__pos" role="status">
            Item {live.itemIndex + 1}/{live.items.length} · Slide{" "}
            {live.slideIndex + 1}/{Math.max(live.slideCount, 1)}
          </span>
          <span className="live__cur">{item.title || "(tanpa judul)"}</span>
        </div>

        <div className="live__screen layer-overlay">
          {live.black ? (
            <span className="live__black-label">Layar Hitam</span>
          ) : (
            <div
              key={`${live.itemIndex}:${live.slideIndex}`}
              className="live__preview"
            >
              {live.slideText}
            </div>
          )}
        </div>

        <div className="dock layer-elevated">
          <button className="ctrl" onClick={() => api.prevSlide()}>
            ← Prev
          </button>
          <button
            className={"ctrl ctrl--black" + (live.black ? " ctrl--on" : "")}
            onClick={() => api.toggleBlack()}
          >
            Black
          </button>
          <button className="ctrl ctrl--next" onClick={() => api.nextSlide()}>
            Next →
          </button>
          <button
            className="ctrl ctrl--stop"
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

        <p className="hint">
          Space/Enter = next · Backspace = prev · B = black · Esc = stop live
        </p>
      </main>
    </div>
  );
}
