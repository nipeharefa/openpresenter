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
    <header className="topbar layer-surface-1">
      <span className="brand">
        <span className="brand__dot" aria-hidden="true" />
        OpenPresenter
      </span>

      <div className="topbar__group">
        <select
          className="select"
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
              className="topbar__input"
              placeholder="Nama urutan baru"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") cancel();
              }}
              aria-label="Nama urutan baru"
            />
            <button onClick={handleCreate} className="btn--primary">
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

      <div className="topbar__spacer" />

      <div className="topbar__group topbar__group--bordered">
        <select
          className="select"
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

      <div className="seg">
        {MODES.map((m) => (
          <button
            key={m}
            className={mode === m ? "seg__active" : ""}
            onClick={() => onMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </header>
  );
}
