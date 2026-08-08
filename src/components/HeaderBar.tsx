import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { LiveView, MonitorInfo, Urutan } from "../types";

export type Screen = "library" | "setlist" | "live" | "display";

interface HeaderBarProps {
  screen: Screen;
  onScreen: (screen: Screen) => void;
  live: LiveView | null;
  urutans: Urutan[];
  monitors: MonitorInfo[];
  projectionMonitor: string;
  onProjectionMonitor: (name: string) => void;
  onSelectUrutan: (id: number) => void;
  onDeleteUrutan: () => void;
  onChanged: () => void;
}

const SCREENS: Screen[] = ["library", "setlist", "live", "display"];
const SCREEN_LABELS: Record<Screen, string> = {
  library: "Perpustakaan",
  setlist: "Setlist",
  live: "Live",
  display: "Display",
};

export default function HeaderBar(props: HeaderBarProps) {
  const {
    screen,
    onScreen,
    live,
    urutans,
    monitors,
    projectionMonitor,
    onProjectionMonitor,
    onSelectUrutan,
    onDeleteUrutan,
    onChanged,
  } = props;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding || renaming) inputRef.current?.focus();
  }, [adding, renaming]);

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
    setRenaming(false);
  }

  async function startRename() {
    setRenameDraft(live?.urutanName ?? "");
    setRenaming(true);
    setAdding(false);
  }

  async function handleRename() {
    const name = renameDraft.trim();
    if (!name || !live?.urutanId) return;
    await api.renameUrutan(live.urutanId, name);
    setRenaming(false);
    onChanged();
  }

  async function handleDuplicate() {
    if (!live?.urutanId) return;
    const suggested = `${live.urutanName ?? "Urutan"} (salinan)`;
    const name = window.prompt("Nama urutan baru:", suggested);
    if (!name) return;
    const created = await api.duplicateUrutan(live.urutanId, name.trim());
    onSelectUrutan(created.id);
    onChanged();
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
          className="max-w-[200px]"
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
        {adding || renaming ? (
          <>
            <input
              ref={inputRef}
              className="w-44"
              placeholder={renaming ? "Nama baru" : "Nama urutan baru"}
              value={renaming ? renameDraft : newName}
              onChange={(e) =>
                renaming ? setRenameDraft(e.target.value) : setNewName(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") renaming ? handleRename() : handleCreate();
                if (e.key === "Escape") cancel();
              }}
              aria-label={renaming ? "Nama baru urutan" : "Nama urutan baru"}
            />
            <button
              onClick={renaming ? handleRename : handleCreate}
              className="border-brand bg-brand text-white"
            >
              Simpan
            </button>
            <button onClick={cancel}>Batal</button>
          </>
        ) : (
          <>
            <button
              onClick={() => setAdding(true)}
              disabled={!live?.loaded}
              aria-label="Tambah urutan"
              title="Tambah urutan"
            >
              +
            </button>
            <button
              onClick={startRename}
              disabled={!live?.loaded}
              aria-label="Ubah nama urutan"
              title="Ubah nama urutan"
            >
              ✎
            </button>
            <button
              onClick={handleDuplicate}
              disabled={!live?.loaded}
              aria-label="Duplikat urutan"
              title="Duplikat urutan"
            >
              ⧉
            </button>
          </>
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
          className="max-w-[190px]"
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
        {SCREENS.map((s) => (
          <button
            key={s}
            className={
              "border-none bg-transparent px-3 py-1.5 text-xs text-ink-muted hover:border-none hover:text-ink" +
              (screen === s ? " bg-brand-weak text-brand" : "")
            }
            onClick={() => onScreen(s)}
          >
            {SCREEN_LABELS[s]}
          </button>
        ))}
      </div>
    </header>
  );
}
