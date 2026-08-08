import { api } from "../lib/api";
import type { MonitorInfo } from "../types";

interface DisplayScreenProps {
  monitors: MonitorInfo[];
  projectionMonitor: string;
  onProjectionMonitor: (name: string) => void;
}

export default function DisplayScreen({
  monitors,
  projectionMonitor,
  onProjectionMonitor,
}: DisplayScreenProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <h2 className="mb-1 text-lg font-semibold">Output Display</h2>
      <p className="m-0 mb-4 text-sm text-ink-muted">
        Klik monitor untuk menetapkannya sebagai <b>Program Output</b> (jemaat)
        dan membuka Window Proyeksi di sana. Stage display menyusul.
      </p>

      {monitors.length === 0 ? (
        <p className="text-ink-muted">Tidak ada monitor terdeteksi.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {monitors.map((m) => {
            const active = projectionMonitor === m.name;
            return (
              <button
                key={m.name ?? `${m.x},${m.y}`}
                className={
                  "flex flex-col gap-2 rounded-lg border bg-surface-1 p-3 text-left" +
                  (active ? " border-brand" : " border-surface-3")
                }
                onClick={() => {
                  onProjectionMonitor(m.name ?? "");
                  api.openProjection(m.name ?? null);
                }}
              >
                <div
                  className="flex aspect-video w-full items-center justify-center rounded-md bg-black"
                  style={{ boxShadow: active ? "0 0 0 2px var(--color-brand)" : "none" }}
                >
                  <span className="text-xs text-ink-muted">
                    {active ? "Program" : "Test"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="block font-medium">
                    {m.name ?? "Monitor"} {m.isPrimary ? "(primary)" : ""}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {m.width}×{m.height}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Tips: pada laptop ibadah, monitor laptop = kontrol, proyektor = Program.
        Kalau window proyeksi sudah terbuka, mengganti monitor akan memindahkannya
        langsung.
      </p>
    </div>
  );
}
