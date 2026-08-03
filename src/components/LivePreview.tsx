import { convertFileSrc } from "@tauri-apps/api/core";
import type { LiveView } from "../types";

function VideoPoster({ path }: { path: string }) {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={convertFileSrc(path)}
      preload="metadata"
      muted
      playsInline
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = 0.05;
      }}
    />
  );
}

export default function LivePreview({ live }: { live: LiveView | null }) {
  if (!live?.loaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="m-0 text-ink-muted">
          Pilih Urutan dari menu atas untuk mulai.
        </p>
      </div>
    );
  }

  const item = live.items[live.itemIndex];
  const curSlide = item.slides[live.slideIndex];
  const bg = live.black ? null : (curSlide?.background ?? null);

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-surface-3 bg-black">
      {bg &&
        (bg.mediaType === "video" ? (
          <VideoPoster path={bg.path} />
        ) : (
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={convertFileSrc(bg.path)}
            alt=""
          />
        ))}
      {live.black ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black text-xs uppercase tracking-[0.2em] text-ink-muted">
          Layar Hitam
        </span>
      ) : (
        <div
          key={`${live.itemIndex}:${live.slideIndex}`}
          className="relative max-w-full animate-[proj-in_200ms_ease] whitespace-pre-line px-5 py-5 text-center text-[clamp(0.9rem,2vw,1.4rem)] leading-relaxed text-[#f2f1ec]"
        >
          {live.slideText}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-2">
        <span
          className={
            "flex items-center gap-1.5 text-[11px] font-semibold tracking-wider before:block before:h-2 before:w-2 before:rounded-full" +
            (live.black ? " text-ink-muted before:bg-ink-muted" : " text-live before:bg-live")
          }
        >
          {live.black ? "BLACK" : "LIVE"}
        </span>
        <span className="text-[11px] tabular-nums text-ink-muted" role="status">
          {item.title || "(tanpa judul)"} · Slide {live.slideIndex + 1}/
          {Math.max(live.slideCount, 1)}
        </span>
      </div>
    </div>
  );
}
