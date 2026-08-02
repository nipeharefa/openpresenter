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
    <div className={black ? "proj proj--black" : "proj"}>
      {!black && <div className="proj__slide">{live?.slideText}</div>}
    </div>
  );
}
