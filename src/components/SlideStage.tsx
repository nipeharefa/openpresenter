import { convertFileSrc } from "@tauri-apps/api/core";
import type { SlideBackgroundContent } from "../types";

function StaticVideo({ path }: { path: string }) {
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

interface SlideStageProps {
  text: string;
  background: SlideBackgroundContent | null;
  black: boolean;
  textClass?: string;
  label?: string;
}

export default function SlideStage({
  text,
  background,
  black,
  textClass,
  label,
}: SlideStageProps) {
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-surface-3 bg-black">
      {!black &&
        background &&
        (background.mediaType === "video" ? (
          <StaticVideo path={background.path} />
        ) : (
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={convertFileSrc(background.path)}
            alt=""
          />
        ))}
      {black ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black text-xs uppercase tracking-[0.2em] text-ink-muted">
          Layar Hitam
        </span>
      ) : (
        <div
          className={
            "relative max-w-full animate-[proj-in_200ms_ease] whitespace-pre-line px-5 py-5 text-center leading-relaxed text-[#f2f1ec] " +
            (textClass ?? "")
          }
        >
          {text}
        </div>
      )}
      {label && (
        <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      )}
    </div>
  );
}
