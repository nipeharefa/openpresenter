import { api } from "../lib/api";
import type { LiveView } from "../types";

interface TransportBarProps {
  live: LiveView | null;
  projectionOpen: boolean;
}

export default function TransportBar({ live, projectionOpen }: TransportBarProps) {
  const inCue = live?.loaded && live.items.length > 0;
  return (
    <div className="z-10 flex shrink-0 items-center justify-center gap-2 border-t border-surface-3 bg-surface-2 px-4 py-2.5 shadow-lg">
      <button
        className="min-w-[110px] rounded-md px-6 py-2.5 text-[15px]"
        onClick={() => api.prevSlide()}
        disabled={!inCue}
      >
        ← Prev
      </button>
      <button
        className={
          "min-w-[110px] rounded-md px-6 py-2.5 text-[15px]" +
          (live?.black ? " border-alert bg-alert-weak text-alert" : "")
        }
        onClick={() => api.toggleBlack()}
      >
        Black
      </button>
      <button
        className="min-w-[110px] rounded-md border-brand bg-brand px-6 py-2.5 text-[15px] font-semibold text-white"
        onClick={() => api.nextSlide()}
        disabled={!inCue}
      >
        Next →
      </button>
      <button
        className="min-w-[110px] rounded-md border-alert px-6 py-2.5 text-[15px] text-alert hover:bg-alert hover:text-white"
        disabled={!projectionOpen}
        title={projectionOpen ? "" : "Buka Proyeksi dulu"}
        onClick={() => api.stopLive()}
      >
        Stop Live
      </button>

      <span className="ml-4 text-[13px] tabular-nums text-ink-muted" role="status">
        {inCue
          ? `Item ${live!.itemIndex + 1}/${live!.items.length} · Slide ${
              live!.slideIndex + 1
            }/${Math.max(live!.slideCount, 1)}`
          : "Belum ada urutan"}
      </span>
    </div>
  );
}
