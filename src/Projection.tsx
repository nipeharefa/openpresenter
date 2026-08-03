import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api, onLiveChange } from "./lib/api";
import type { LiveView } from "./types";

export default function Projection() {
  const [live, setLive] = useState<LiveView | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    api.getLive().then(setLive);
    onLiveChange(setLive).then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  const black = !live || !live.loaded || live.black;
  const curSlide = live?.items[live.itemIndex]?.slides[live.slideIndex];
  const bg = black ? null : (curSlide?.background ?? null);

  return (
    <div className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-black text-[#f2f1ec]">
      {bg &&
        (bg.mediaType === "video" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={convertFileSrc(bg.path)}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={convertFileSrc(bg.path)}
            alt=""
          />
        ))}
      {!black && (
        <div
          key={`${live?.itemIndex}:${live?.slideIndex}`}
          className="relative max-w-[100vw] animate-[proj-in_200ms_ease] whitespace-pre-line px-[8vw] py-[5vh] text-center text-[clamp(1.75rem,7vw,5.5rem)] leading-[1.35]"
        >
          {live?.slideText}
        </div>
      )}
    </div>
  );
}
