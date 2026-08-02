import { useCallback, useEffect, useRef, useState } from "react";
import { api, onLiveChange } from "./lib/api";
import type { LiveView, MonitorInfo, Urutan } from "./types";

type Mode = "edit" | "live";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

export default function App() {
  const [urutans, setUrutans] = useState<Urutan[]>([]);
  const [live, setLive] = useState<LiveView | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [projectionMonitor, setProjectionMonitorState] = useState<string>("");

  useEffect(() => {
    api.listUrutan().then(setUrutans);
    api.getLive().then(setLive);
    api.listMonitors().then(setMonitors);
    api.getProjectionMonitor().then((name) => setProjectionMonitorState(name ?? ""));
    let unlisten: (() => void) | undefined;
    onLiveChange(setLive).then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  async function handleSelectUrutan(id: number) {
    await api.loadUrutan(id);
    const list = await api.listUrutan();
    setUrutans(list);
    setSelectedItemId(null);
    setMode("edit");
  }

  async function handleCreateUrutan() {
    const name = newName.trim();
    if (!name) return;
    const created = await api.createUrutan(name);
    setNewName("");
    await handleSelectUrutan(created.id);
  }

  async function handleDeleteUrutan() {
    if (!live?.urutanId) return;
    if (!window.confirm("Hapus urutan ini beserta semua itemnya?")) return;
    await api.deleteUrutan(live.urutanId);
    setSelectedItemId(null);
    setUrutans(await api.listUrutan());
  }

  async function handleAddItem() {
    if (!live?.urutanId) return;
    const created = await api.addItem(live.urutanId, "Item baru", "");
    setSelectedItemId(created.id);
  }

  async function handleMoveItem(index: number, delta: number) {
    if (!live) return;
    const item = live.items[index];
    await api.moveItem(live.urutanId!, item.id, index + delta);
  }

  async function handleDeleteItem(itemId: number) {
    if (!window.confirm("Hapus item ini?")) return;
    await api.deleteItem(itemId);
    if (selectedItemId === itemId) setSelectedItemId(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">OpenPresenter</span>
        <select
          className="topbar__select"
          value={live?.urutanId ?? ""}
          onChange={(e) => handleSelectUrutan(Number(e.target.value))}
        >
          <option value="" disabled>
            {urutans.length ? "Pilih Urutan Ibadah…" : "Belum ada urutan"}
          </option>
          {urutans.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          className="topbar__input"
          placeholder="Nama urutan baru"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateUrutan()}
        />
        <button onClick={handleCreateUrutan}>Tambah</button>
        <button onClick={handleDeleteUrutan} disabled={!live?.urutanId}>
          Hapus
        </button>
        <div className="topbar__spacer" />
        <div className="seg">
          <button
            className={mode === "edit" ? "seg__active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            className={mode === "live" ? "seg__active" : ""}
            onClick={() => setMode("live")}
          >
            Live
          </button>
        </div>
        <select
          className="topbar__select"
          value={projectionMonitor}
          onChange={(e) => {
            const value = e.target.value;
            setProjectionMonitorState(value);
            api.setProjectionMonitor(value || null);
          }}
          disabled={monitors.length === 0}
          title="Monitor untuk Window Proyeksi"
        >
          <option value="">Proyeksi: Otomatis</option>
          {monitors.map((m) => (
            <option
              key={m.name ?? `${m.x},${m.y}`}
              value={m.name ?? ""}
            >
              {m.name ?? "Monitor"} {m.width}×{m.height}
              {m.isPrimary ? " (primary)" : ""}
            </option>
          ))}
        </select>
        <button onClick={() => api.openProjection(projectionMonitor || null)}>
          Buka Proyeksi
        </button>
      </header>

      {mode === "edit" ? (
        <EditView
          live={live}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onAdd={handleAddItem}
          onMove={handleMoveItem}
          onDelete={handleDeleteItem}
        />
      ) : (
        <LiveView live={live} />
      )}
    </div>
  );
}

function EditView(props: {
  live: LiveView | null;
  selectedItemId: number | null;
  setSelectedItemId: (id: number) => void;
  onAdd: () => void;
  onMove: (index: number, delta: number) => void;
  onDelete: (id: number) => void;
}) {
  const { live, selectedItemId } = props;
  const current = live?.items.find((i) => i.id === selectedItemId) ?? null;

  const [draft, setDraft] = useState({ title: "", text: "" });
  const saveTimer = useRef<number | null>(null);
  const savedRef = useRef({ title: "", text: "" });

  useEffect(() => {
    setDraft({ title: current?.title ?? "", text: current?.text ?? "" });
    savedRef.current = { title: current?.title ?? "", text: current?.text ?? "" };
  }, [selectedItemId, live?.items]);

  const save = useCallback(() => {
    if (!current) return;
    if (
      draft.title === savedRef.current.title &&
      draft.text === savedRef.current.text
    )
      return;
    savedRef.current = { title: draft.title, text: draft.text };
    api.saveItem(current.id, draft.title, draft.text);
  }, [current, draft]);

  function onDraftChange(patch: { title?: string; text?: string }) {
    setDraft((d) => ({ ...d, ...patch }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, 500);
  }

  return (
    <div className="edit">
      <aside className="edit__list">
        <div className="edit__list-head">
          <span>Item</span>
          <button onClick={props.onAdd} disabled={!live?.loaded}>
            + Item
          </button>
        </div>
        {live?.items.length === 0 && (
          <p className="muted">Belum ada item. Tambahkan lagu, ayat, atau pengumuman.</p>
        )}
        {live?.items.map((item, index) => (
          <div
            key={item.id}
            className={
              "edit__row" + (item.id === selectedItemId ? " edit__row--active" : "")
            }
            onClick={() => props.setSelectedItemId(item.id)}
          >
            <span className="edit__row-title">{item.title || "(tanpa judul)"}</span>
            <span className="edit__row-actions">
              <button
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onMove(index, -1);
                }}
              >
                ↑
              </button>
              <button
                disabled={index >= live.items.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onMove(index, 1);
                }}
              >
                ↓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete(item.id);
                }}
              >
                ×
              </button>
            </span>
          </div>
        ))}
      </aside>

      <main className="edit__main">
        {current ? (
          <>
            <input
              className="edit__title"
              placeholder="Judul item"
              value={draft.title}
              onChange={(e) => onDraftChange({ title: e.target.value })}
            />
            <textarea
              className="edit__text"
              placeholder={HINT}
              value={draft.text}
              onChange={(e) => onDraftChange({ text: e.target.value })}
            />
            <p className="muted">Tersimpan otomatis. Setiap baris kosong = slide baru.</p>
          </>
        ) : (
          <p className="muted">Pilih atau tambahkan sebuah item.</p>
        )}
      </main>
    </div>
  );
}

function LiveView(props: { live: LiveView | null }) {
  const { live } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        api.nextSlide();
      } else if (
        e.code === "Backspace" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowUp"
      ) {
        e.preventDefault();
        api.prevSlide();
      } else if (e.key === "b" || e.key === "B") {
        api.toggleBlack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!live?.loaded) {
    return (
      <div className="live live--empty">
        <p>Belum ada urutan dimuat. Pilih urutan dari menu atas, lalu kembali ke Live.</p>
      </div>
    );
  }

  const item = live.items[live.itemIndex];

  return (
    <div className="live">
      <aside className="live__list">
        {live.items.map((it, index) => (
          <button
            key={it.id}
            className={"live__row" + (index === live.itemIndex ? " live__row--active" : "")}
            onClick={() => api.jumpItem(index)}
          >
            {it.title || "(tanpa judul)"}
          </button>
        ))}
      </aside>

      <main className="live__stage">
        <div className="live__preview">
          <div className="live__preview-slide">
            {live.black ? "" : live.slideText}
          </div>
        </div>
        <div className="live__info">
          <span>
            {item.title || "(tanpa judul)"}
            {live.black ? " · Layar Hitam" : ""}
          </span>
          <span>
            Slide {live.slideIndex + 1}/{Math.max(live.slideCount, 1)} · Item{" "}
            {live.itemIndex + 1}/{live.items.length}
          </span>
        </div>
        <div className="live__controls">
          <button className="ctrl" onClick={() => api.prevSlide()}>
            ← Prev
          </button>
          <button className={"ctrl ctrl--black" + (live.black ? " ctrl--on" : "")} onClick={() => api.toggleBlack()}>
            {live.black ? "Layar" : "Black"}
          </button>
          <button className="ctrl ctrl--next" onClick={() => api.nextSlide()}>
            Next →
          </button>
        </div>
        <p className="muted">
          Space/Enter = next · Backspace = prev · B = black
        </p>
      </main>
    </div>
  );
}
