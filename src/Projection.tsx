import { useEffect, useState } from "react";
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

  return (
    <div className="flex h-full w-full select-none items-center justify-center bg-black text-[#f2f1ec]">
      {!black && (
        <div
          key={`${live?.itemIndex}:${live?.slideIndex}`}
          className="max-w-[100vw] animate-[proj-in_200ms_ease] whitespace-pre-line px-[8vw] py-[5vh] text-center text-[clamp(1.75rem,7vw,5.5rem)] leading-[1.35]"
        >
          {live?.slideText}
        </div>
      )}
    </div>
  );
}
