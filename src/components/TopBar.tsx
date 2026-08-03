import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { LiveView, Mode, MonitorInfo, Urutan } from "../types";

interface TopBarProps {
  mode: Mode;
  onMode: (mode: Mode) => void;
  live: LiveView | null;
  urutans: Urutan[];
  monitors: MonitorInfo[];
  projectionMonitor: string;
  onProjectionMonitor: (name: string) => void;
  onSelectUrutan: (id: number) => void;
  onDeleteUrutan: () => void;
}

const MODES: Mode[] = ["edit", "library", "live"];
const MODE_LABELS: Record<Mode, string> = {
  edit: "Edit",
  library: "Library",
  live: "Live",
};

export default function TopBar(props: TopBarProps) {
  const {
    mode,
    onMode,
    live,
    urutans,
    monitors,
    projectionMonitor,
    onProjectionMonitor,
    onSelectUrutan,
    onDeleteUrutan,
  } = props;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const created = await api.createUrutan(name);
    setNewName("");
    setAdding(false);
    onSelectUrutan(created.id);
  }

  function cancel() {
    setAdding(false);
    setNewName("");
  }

  return (
    <header className="z-10 flex shrink-0 items-center gap-2 border-b border-surface-3 bg-surface-1 px-3.5 py-2">
      <span className="mr-1.5 flex items-center gap-2 font-semibold">
        <span
          className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_var(--color-brand-weak)]"
          aria-hidden="true"
        />
        OpenPresenter
      </span>

      <div className="flex items-center gap-1.5">
        <select
          className="max-w-[220px]"
          value={live?.urutanId ?? ""}
          onChange={(e) => onSelectUrutan(Number(e.target.value))}
          aria-label="Urutan Ibadah"
        >
          <option value="" disabled>
            {urutans.length ? "Pilih Urutan…" : "Belum ada urutan"}
          </option>
          {urutans.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {adding ? (
          <>
            <input
              ref={inputRef}
              className="w-44"
              placeholder="Nama urutan baru"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") cancel();
              }}
              aria-label="Nama urutan baru"
            />
            <button onClick={handleCreate} className="border-brand bg-brand text-white">
              Simpan
            </button>
            <button onClick={cancel}>Batal</button>
          </>
        ) : (
          <button
            onClick={() => setAdding(true)}
            aria-label="Tambah urutan"
            title="Tambah urutan"
          >
            +
          </button>
        )}
        <button
          onClick={onDeleteUrutan}
          disabled={!live?.urutanId}
          aria-label="Hapus urutan"
          title="Hapus urutan"
        >
          ×
        </button>
      </div>

      <div className="flex-1" />

      <div className="ml-1.5 flex items-center gap-1.5 border-l border-surface-3 pl-3">
        <select
          className="max-w-[220px]"
          value={projectionMonitor}
          onChange={(e) => onProjectionMonitor(e.target.value)}
          disabled={monitors.length === 0}
          aria-label="Monitor proyeksi"
          title="Monitor untuk Window Proyeksi"
        >
          <option value="">Otomatis</option>
          {monitors.map((m) => (
            <option key={m.name ?? `${m.x},${m.y}`} value={m.name ?? ""}>
              {m.name ?? "Monitor"} {m.width}×{m.height}
              {m.isPrimary ? " (primary)" : ""}
            </option>
          ))}
        </select>
        <button onClick={() => api.openProjection(projectionMonitor || null)}>
          Proyeksi
        </button>
      </div>

      <div className="flex overflow-hidden rounded-md border border-surface-3 bg-surface-2">
        {MODES.map((m) => (
          <button
            key={m}
            className={
              "border-none bg-transparent px-4 py-1.5 text-ink-muted hover:border-none hover:text-ink" +
              (mode === m ? " bg-brand-weak text-brand" : "")
            }
            onClick={() => onMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </header>
  );
}
