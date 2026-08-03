import { useCallback, useEffect, useRef, useState } from "react";
import { api, onLiveChange, onProjectionChange } from "./lib/api";
import { splitSlides } from "./lib/slides";
import type { LiveView, MonitorInfo, Song, Tag, Urutan } from "./types";

type Mode = "edit" | "lagu" | "live";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

export default function App() {
  const [urutans, setUrutans] = useState<Urutan[]>([]);
  const [live, setLive] = useState<LiveView | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [addingUrutan, setAddingUrutan] = useState(false);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [projectionMonitor, setProjectionMonitorState] = useState<string>("");
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [libraryFocusId, setLibraryFocusId] = useState<number | null>(null);

  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listUrutan().then(setUrutans);
    api.getLive().then(setLive);
    api.listMonitors().then(setMonitors);
    api.getProjectionMonitor().then((name) => setProjectionMonitorState(name ?? ""));
    api.getProjectionOpen().then(setProjectionOpen);
    let unlisten: (() => void) | undefined;
    let unlistenProj: (() => void) | undefined;
    onLiveChange(setLive).then((fn) => (unlisten = fn));
    onProjectionChange(setProjectionOpen).then((fn) => (unlistenProj = fn));
    return () => {
      unlisten?.();
      unlistenProj?.();
    };
  }, []);

  useEffect(() => {
    if (addingUrutan) newNameRef.current?.focus();
  }, [addingUrutan]);

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
    setAddingUrutan(false);
    await handleSelectUrutan(created.id);
  }

  function cancelAddingUrutan() {
    setAddingUrutan(false);
    setNewName("");
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

  const consumeFocus = useCallback(() => setLibraryFocusId(null), []);

  function openLibraryAt(songId: number) {
    setLibraryFocusId(songId);
    setMode("lagu");
  }

  return (
    <div className="app">
      <header className="topbar layer-surface-1">
        <span className="brand">
          <span className="brand__dot" aria-hidden="true" />
          OpenPresenter
        </span>

        <div className="topbar__group">
          <select
            className="select"
            value={live?.urutanId ?? ""}
            onChange={(e) => handleSelectUrutan(Number(e.target.value))}
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
          {addingUrutan ? (
            <>
              <input
                ref={newNameRef}
                className="topbar__input"
                placeholder="Nama urutan baru"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateUrutan();
                  if (e.key === "Escape") cancelAddingUrutan();
                }}
                aria-label="Nama urutan baru"
              />
              <button onClick={handleCreateUrutan} className="btn--primary">
                Simpan
              </button>
              <button onClick={cancelAddingUrutan}>Batal</button>
            </>
          ) : (
            <button
              onClick={() => setAddingUrutan(true)}
              aria-label="Tambah urutan"
              title="Tambah urutan"
            >
              +
            </button>
          )}
          <button
            onClick={handleDeleteUrutan}
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
            onChange={(e) => {
              const value = e.target.value;
              setProjectionMonitorState(value);
              api.setProjectionMonitor(value || null);
            }}
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
          <button
            className={mode === "edit" ? "seg__active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            className={mode === "lagu" ? "seg__active" : ""}
            onClick={() => setMode("lagu")}
          >
            Lagu
          </button>
          <button
            className={mode === "live" ? "seg__active" : ""}
            onClick={() => setMode("live")}
          >
            Live
          </button>
        </div>
      </header>

      {mode === "edit" ? (
        <EditView
          live={live}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onAdd={handleAddItem}
          onMove={handleMoveItem}
          onDelete={handleDeleteItem}
          onOpenLibrary={openLibraryAt}
        />
      ) : mode === "lagu" ? (
        <LibraryView
          live={live}
          focusId={libraryFocusId}
          onFocusConsumed={consumeFocus}
        />
      ) : (
        <LiveView live={live} projectionOpen={projectionOpen} onStop={() => setMode("edit")} />
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
  onOpenLibrary: (songId: number) => void;
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
      <aside className="edit__list layer-surface-1">
        <div className="edit__list-head">
          <span>Item</span>
          <button onClick={props.onAdd} disabled={!live?.loaded}>
            + Item
          </button>
        </div>
        {live?.items.length === 0 && (
          <p className="muted">
            Belum ada item. Tambahkan lagu, ayat, atau pengumuman.
          </p>
        )}
        {live?.items.map((item, index) => (
          <div
            key={item.id}
            className={
              "edit__row" + (item.id === selectedItemId ? " edit__row--active" : "")
            }
          >
            <button
              type="button"
              className="edit__row-select"
              onClick={() => props.setSelectedItemId(item.id)}
            >
              <span className="edit__row-title">
                {item.title || "(tanpa judul)"}
              </span>
              {item.songId != null && <span className="badge">Lagu</span>}
              <span className="badge">{splitSlides(item.text).length}</span>
            </button>
            <span className="edit__row-actions">
              <button
                disabled={index === 0}
                onClick={() => props.onMove(index, -1)}
                aria-label="Pindah ke atas"
                title="Pindah ke atas"
              >
                ↑
              </button>
              <button
                disabled={index >= live.items.length - 1}
                onClick={() => props.onMove(index, 1)}
                aria-label="Pindah ke bawah"
                title="Pindah ke bawah"
              >
                ↓
              </button>
              <button
                onClick={() => props.onDelete(item.id)}
                aria-label="Hapus item"
                title="Hapus item"
              >
                ×
              </button>
            </span>
          </div>
        ))}
      </aside>

      <main className="edit__main">
        {current ? (
          current.songId != null ? (
            <>
              <div className="edit__readonly-head">
                <span className="badge">Lagu</span>
                <button onClick={() => props.onOpenLibrary(current.songId!)}>
                  Kelola di Library
                </button>
              </div>
              <input
                id="item-title"
                className="edit__title"
                value={current.title}
                readOnly
              />
              <textarea
                id="item-text"
                className="edit__text"
                value={current.text}
                readOnly
              />
              <p className="hint">
                Teks ini berasal dari Perpustakaan Lagu — edit di sana agar
                semua Urutan ikut berubah.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="item-title">Judul</label>
              <input
                id="item-title"
                className="edit__title"
                placeholder="Judul item"
                value={draft.title}
                onChange={(e) => onDraftChange({ title: e.target.value })}
              />
              <label htmlFor="item-text">Teks</label>
              <textarea
                id="item-text"
                className="edit__text"
                placeholder={HINT}
                value={draft.text}
                onChange={(e) => onDraftChange({ text: e.target.value })}
              />
              <p className="hint">
                Tersimpan otomatis · setiap baris kosong = slide baru
              </p>
            </>
          )
        ) : (
          <p className="muted">Pilih atau tambahkan sebuah item.</p>
        )}
      </main>
    </div>
  );
}

function LibraryView(props: {
  live: LiveView | null;
  focusId: number | null;
  onFocusConsumed: () => void;
}) {
  const { live, focusId, onFocusConsumed } = props;

  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const [draft, setDraft] = useState({ title: "", text: "" });
  const saveTimer = useRef<number | null>(null);
  const savedRef = useRef({ title: "", text: "" });
  const [newTag, setNewTag] = useState("");

  const refresh = useCallback(
    (q: string, tags: string[]) => {
      api.listSongs(q.trim() || null, tags).then(setSongs);
    },
    [],
  );

  useEffect(() => {
    api.listTags().then(setAllTags);
    refresh("", []);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(search, selectedTags), 250);
    return () => window.clearTimeout(timer);
  }, [search, selectedTags, refresh]);

  useEffect(() => {
    if (focusId == null) return;
    api.listSongs(null, []).then((list) => {
      const found = list.find((s) => s.id === focusId) ?? null;
      setSelectedSong(found);
      setSongs(list);
    });
    setSearch("");
    setSelectedTags([]);
    onFocusConsumed();
  }, [focusId, onFocusConsumed]);

  useEffect(() => {
    if (!selectedSong) {
      setDraft({ title: "", text: "" });
      savedRef.current = { title: "", text: "" };
      return;
    }
    setDraft({ title: selectedSong.title, text: selectedSong.text });
    savedRef.current = { title: selectedSong.title, text: selectedSong.text };
  }, [selectedSong]);

  const save = useCallback(() => {
    if (!selectedSong) return;
    if (
      draft.title === savedRef.current.title &&
      draft.text === savedRef.current.text
    )
      return;
    savedRef.current = { title: draft.title, text: draft.text };
    api.saveSong(selectedSong.id, draft.title, draft.text).then((updated) => {
      setSelectedSong((cur) => (cur && cur.id === updated.id ? updated : cur));
      refresh(search, selectedTags);
    });
  }, [selectedSong, draft, refresh, search, selectedTags]);

  function onDraftChange(patch: { title?: string; text?: string }) {
    setDraft((d) => ({ ...d, ...patch }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, 500);
  }

  function toggleTag(name: string) {
    setSelectedTags((tags) =>
      tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name],
    );
  }

  async function handleAddTag() {
    const name = newTag.trim();
    if (!name || !selectedSong) return;
    const tag = await api.addSongTag(selectedSong.id, name);
    setNewTag("");
    setSelectedSong((cur) =>
      cur
        ? { ...cur, tags: [...cur.tags.filter((t) => t.id !== tag.id), tag] }
        : cur,
    );
    setAllTags(await api.listTags());
    refresh(search, selectedTags);
  }

  async function handleRemoveTag(tagId: number) {
    if (!selectedSong) return;
    await api.removeSongTag(selectedSong.id, tagId);
    setSelectedSong((cur) =>
      cur ? { ...cur, tags: cur.tags.filter((t) => t.id !== tagId) } : cur,
    );
    refresh(search, selectedTags);
  }

  async function handleCreateSong() {
    const created = await api.createSong("Lagu baru", "");
    setSelectedSong(created);
    refresh("", []);
    setSearch("");
    setSelectedTags([]);
  }

  async function handleDeleteSong() {
    if (!selectedSong) return;
    if (!window.confirm(`Hapus lagu "${selectedSong.title}"?`)) return;
    await api.deleteSong(selectedSong.id);
    setSelectedSong(null);
    refresh(search, selectedTags);
  }

  async function handleAddToUrutan() {
    if (!live?.urutanId || !selectedSong) return;
    await api.addSongToUrutan(live.urutanId, selectedSong.id);
  }

  return (
    <div className="lib">
      <aside className="lib__list layer-surface-1">
        <div className="lib__toolbar">
          <input
            placeholder="Cari judul…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari judul lagu"
          />
          <button onClick={handleCreateSong}>+ Lagu</button>
        </div>
        <div className="lib__tags" aria-label="Filter tag">
          <button
            className={"chip" + (selectedTags.length === 0 ? " chip--on" : "")}
            onClick={() => setSelectedTags([])}
          >
            Semua
          </button>
          {allTags.map((t) => (
            <button
              key={t.id}
              className={
                "chip" + (selectedTags.includes(t.name) ? " chip--on" : "")
              }
              onClick={() => toggleTag(t.name)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="lib__songs">
          {songs.map((s) => (
            <button
              key={s.id}
              type="button"
              className={
                "lib__song" +
                (selectedSong?.id === s.id ? " lib__song--active" : "")
              }
              onClick={() => setSelectedSong(s)}
            >
              <span className="lib__song-title">{s.title}</span>
              <span className="badge">{splitSlides(s.text).length}</span>
            </button>
          ))}
          {songs.length === 0 && (
            <p className="muted">
              Tidak ada lagu yang cocok. Ubah filter tag atau tambah lagu baru.
            </p>
          )}
        </div>
      </aside>

      <main className="lib__detail">
        {selectedSong ? (
          <>
            <label htmlFor="song-title">Judul</label>
            <input
              id="song-title"
              className="edit__title"
              value={draft.title}
              onChange={(e) => onDraftChange({ title: e.target.value })}
            />
            <label htmlFor="song-text">Lirik</label>
            <textarea
              id="song-text"
              className="edit__text"
              placeholder={HINT}
              value={draft.text}
              onChange={(e) => onDraftChange({ text: e.target.value })}
            />
            <div className="lib__tags-editor">
              <span className="lib__tags-label">Tag</span>
              {selectedSong.tags.map((t) => (
                <span key={t.id} className="tag-chip">
                  {t.name}
                  <button
                    onClick={() => handleRemoveTag(t.id)}
                    aria-label={`Hapus tag ${t.name}`}
                    title={`Hapus tag ${t.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                placeholder="+ tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag();
                  if (e.key === "Escape") setNewTag("");
                }}
                aria-label="Tambah tag"
              />
            </div>
            <p className="hint">
              Tersimpan otomatis · setiap baris kosong = slide baru
            </p>
            <div className="lib__actions">
              <button
                className="btn--primary"
                onClick={handleAddToUrutan}
                disabled={!live?.loaded}
                title={live?.loaded ? "" : "Pilih Urutan dulu"}
              >
                Tambah ke Urutan
                {live?.loaded ? ` “${live.urutanName}”` : ""}
              </button>
              <button onClick={handleDeleteSong}>Hapus Lagu</button>
            </div>
          </>
        ) : (
          <p className="muted">
            Pilih lagu dari daftar, atau buat lagu baru dengan tombol + Lagu.
          </p>
        )}
      </main>
    </div>
  );
}

function LiveView(props: {
  live: LiveView | null;
  projectionOpen: boolean;
  onStop: () => void;
}) {
  const { live, projectionOpen, onStop } = props;

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
      } else if (e.key === "Escape") {
        if (!projectionOpen) return;
        api.stopLive();
        onStop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStop, projectionOpen]);

  if (!live?.loaded) {
    return (
      <div className="live live--empty">
        <p className="muted">
          Belum ada urutan dimuat. Pilih urutan dari menu atas, lalu kembali ke
          Live.
        </p>
      </div>
    );
  }

  const item = live.items[live.itemIndex];

  return (
    <div className="live">
      <aside className="live__list layer-surface-1">
        {live.items.map((it, index) => (
          <button
            key={it.id}
            type="button"
            className={"live__row" + (index === live.itemIndex ? " live__row--active" : "")}
            onClick={() => api.jumpItem(index)}
          >
            <span className="live__row-title">{it.title || "(tanpa judul)"}</span>
            <span className="badge">{splitSlides(it.text).length}</span>
          </button>
        ))}
      </aside>

      <main className="live__stage">
        <div className="live__strip">
          <span className={live.black ? "live__badge live__badge--dim" : "live__badge"}>
            {live.black ? "BLACK" : "LIVE"}
          </span>
          <span className="live__pos" role="status">
            Item {live.itemIndex + 1}/{live.items.length} · Slide{" "}
            {live.slideIndex + 1}/{Math.max(live.slideCount, 1)}
          </span>
          <span className="live__cur">
            {item.title || "(tanpa judul)"}
          </span>
        </div>

        <div className="live__screen layer-overlay">
          {live.black ? (
            <span className="live__black-label">Layar Hitam</span>
          ) : (
            <div
              key={`${live.itemIndex}:${live.slideIndex}`}
              className="live__preview"
            >
              {live.slideText}
            </div>
          )}
        </div>

        <div className="dock layer-elevated">
          <button className="ctrl" onClick={() => api.prevSlide()}>
            ← Prev
          </button>
          <button
            className={"ctrl ctrl--black" + (live.black ? " ctrl--on" : "")}
            onClick={() => api.toggleBlack()}
          >
            Black
          </button>
          <button className="ctrl ctrl--next" onClick={() => api.nextSlide()}>
            Next →
          </button>
          <button
            className="ctrl ctrl--stop"
            disabled={!projectionOpen}
            title={projectionOpen ? "" : "Buka Proyeksi dulu"}
            onClick={() => {
              api.stopLive();
              onStop();
            }}
          >
            Stop Live
          </button>
        </div>

        <p className="hint">
          Space/Enter = next · Backspace = prev · B = black · Esc = stop live
        </p>
      </main>
    </div>
  );
}
