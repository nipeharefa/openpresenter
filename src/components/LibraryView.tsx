import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api } from "../lib/api";
import { kindLabel } from "../lib/slides";
import type {
  LibraryItem,
  LibraryItemDetail,
  LibraryKind,
  LiveView,
  MediaInfo,
  PresentationSlide,
  Tag,
} from "../types";
import { Badge, Chip, Hint } from "./common";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

interface LibraryViewProps {
  live: LiveView | null;
  focusId: number | null;
  onFocusConsumed: () => void;
}

type KindFilter = LibraryKind | "all";

export default function LibraryView({ live, focusId, onFocusConsumed }: LibraryViewProps) {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [detail, setDetail] = useState<LibraryItemDetail | null>(null);

  const refresh = useCallback((kind: KindFilter, q: string, tags: string[]) => {
    api
      .listLibrary(kind === "all" ? null : kind, q.trim() || null, tags)
      .then(setItems);
  }, []);

  useEffect(() => {
    api.listTags().then(setAllTags);
    refresh("all", "", []);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => refresh(kindFilter, search, selectedTags),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [kindFilter, search, selectedTags, refresh]);

  useEffect(() => {
    if (focusId == null) return;
    api.listLibrary(null, null, []).then((list) => {
      const found = list.find((it) => it.id === focusId) ?? null;
      setSelected(found);
      setItems(list);
    });
    setKindFilter("all");
    setSearch("");
    setSelectedTags([]);
    onFocusConsumed();
  }, [focusId, onFocusConsumed]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api.getLibraryItem(selected.id).then(setDetail);
  }, [selected]);

  function toggleTag(name: string) {
    setSelectedTags((tags) =>
      tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name],
    );
  }

  async function handleCreateItem(kind: LibraryKind) {
    const created = await api.createLibraryItem(
      kind,
      kind === "presentation" ? "Presentasi baru" : "Lagu baru",
    );
    setSelected(created);
    setKindFilter("all");
    setSearch("");
    setSelectedTags([]);
    refresh("all", "", []);
  }

  async function handleImportMedia() {
    try {
      const created = await api.importMedia();
      setSelected(created);
      setKindFilter("all");
      setSearch("");
      setSelectedTags([]);
      refresh("all", "", []);
    } catch {
      // user canceled the file dialog
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-surface-3 bg-surface-1 p-2.5">
        <div className="mb-2 flex gap-1.5">
          <input
            className="min-w-0 flex-1"
            placeholder="Cari judul…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari judul"
          />
          <button onClick={() => handleCreateItem("song")}>+ Lagu</button>
          <button onClick={() => handleCreateItem("presentation")}>
            + Presentasi
          </button>
          <button onClick={handleImportMedia}>+ Media</button>
        </div>

        <div className="flex flex-wrap gap-1 pb-2.5 pt-0.5" aria-label="Filter jenis">
          <Chip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
            Semua
          </Chip>
          <Chip active={kindFilter === "song"} onClick={() => setKindFilter("song")}>
            Lagu
          </Chip>
          <Chip
            active={kindFilter === "presentation"}
            onClick={() => setKindFilter("presentation")}
          >
            Presentasi
          </Chip>
          <Chip active={kindFilter === "media"} onClick={() => setKindFilter("media")}>
            Media
          </Chip>
        </div>

        <div className="flex flex-wrap gap-1 pb-2.5 pt-0.5" aria-label="Filter tag">
          <Chip
            active={selectedTags.length === 0}
            onClick={() => setSelectedTags([])}
          >
            Semua tag
          </Chip>
          {allTags.map((t) => (
            <Chip
              key={t.id}
              active={selectedTags.includes(t.name)}
              onClick={() => toggleTag(t.name)}
            >
              {t.name}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={
                "flex items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-2 text-left text-ink hover:bg-surface-2" +
                (selected?.id === it.id
                  ? " bg-brand-weak text-white shadow-[inset_3px_0_0_var(--color-brand)]"
                  : "")
              }
              onClick={() => setSelected(it)}
            >
              <span className="flex-1 truncate">{it.title}</span>
              <Badge>{kindLabel(it.kind)}</Badge>
            </button>
          ))}
          {items.length === 0 && (
            <p className="m-0 text-ink-muted">
              Tidak ada konten yang cocok. Ubah filter atau buat baru.
            </p>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-2 px-5 py-4">
        {selected && detail ? (
          <LibraryDetail
            detail={detail}
            live={live}
            onChanged={() => refresh(kindFilter, search, selectedTags)}
            onDetail={(d) => setDetail(d)}
            onDeleted={() => {
              setSelected(null);
              setDetail(null);
              refresh(kindFilter, search, selectedTags);
            }}
          />
        ) : (
          <p className="m-0 text-ink-muted">
            Pilih konten dari daftar, atau buat lagu / presentasi baru.
          </p>
        )}
      </main>
    </div>
  );
}

/* ---------- Detail panel (atomic) ---------- */

function LibraryDetail(props: {
  detail: LibraryItemDetail;
  live: LiveView | null;
  onChanged: () => void;
  onDetail: (d: LibraryItemDetail) => void;
  onDeleted: () => void;
}) {
  const { detail, live } = props;
  const [newTag, setNewTag] = useState("");
  const [mediaOptions, setMediaOptions] = useState<LibraryItem[]>([]);

  useEffect(() => {
    setNewTag("");
  }, [detail.id]);

  useEffect(() => {
    if (detail.kind === "presentation") {
      api.listLibrary("media", null, []).then(setMediaOptions);
    }
  }, [detail.kind, detail.id]);

  async function handleBackground(slideId: number, mediaItemId: number | null) {
    await api.setSlideBackground(slideId, mediaItemId);
    const d = await api.getLibraryItem(detail.id);
    if (d) props.onDetail(d);
  }

  async function handleAddTag() {
    const name = newTag.trim();
    if (!name) return;
    const tag = await api.addItemTag(detail.id, name);
    setNewTag("");
    props.onDetail({
      ...detail,
      tags: [...detail.tags.filter((t) => t.id !== tag.id), tag],
    });
    props.onChanged();
  }

  async function handleRemoveTag(tagId: number) {
    await api.removeItemTag(detail.id, tagId);
    props.onDetail({
      ...detail,
      tags: detail.tags.filter((t) => t.id !== tagId),
    });
    props.onChanged();
  }

  async function handleAddToUrutan() {
    if (!live?.urutanId) return;
    await api.addLibraryItemToUrutan(live.urutanId, detail.id);
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus "${detail.title}"?`)) return;
    await api.deleteLibraryItem(detail.id);
    props.onDeleted();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge>{kindLabel(detail.kind)}</Badge>
      </div>

      <LibraryTitle id={detail.id} title={detail.title} onChanged={props.onChanged} />

      {detail.kind === "presentation" ? (
        <PresentationSlides
          itemId={detail.id}
          slides={detail.slides}
          mediaOptions={mediaOptions}
          onSlides={(slides) => props.onDetail({ ...detail, slides })}
          onBackground={handleBackground}
        />
      ) : detail.kind === "media" && detail.media ? (
        <MediaPreview media={detail.media} />
      ) : (
        <LibrarySongText itemId={detail.id} text={detail.text} />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Tag
        </span>
        {detail.tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-weak px-2 py-0.5 text-xs text-brand"
          >
            {t.name}
            <button
              onClick={() => handleRemoveTag(t.id)}
              className="border-none bg-transparent p-0 text-[13px] leading-none text-inherit"
              aria-label={`Hapus tag ${t.name}`}
              title={`Hapus tag ${t.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="w-28 px-2 py-0.5 text-[13px]"
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

      <Hint>Tersimpan otomatis.</Hint>

      <div className="flex items-center gap-2">
        <button
          className="border-brand bg-brand text-white"
          onClick={handleAddToUrutan}
          disabled={!live?.loaded}
          title={live?.loaded ? "" : "Pilih Urutan dulu"}
        >
          Tambah ke Urutan
          {live?.loaded ? ` “${live.urutanName}”` : ""}
        </button>
        <button onClick={handleDelete}>Hapus</button>
      </div>
    </>
  );
}

function LibraryTitle(props: {
  id: number;
  title: string;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(props.title);
  const savedRef = useRef(props.title);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(props.title);
    savedRef.current = props.title;
  }, [props.id, props.title]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onChange(value: string) {
    setDraft(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (value === savedRef.current) return;
      savedRef.current = value;
      api.renameLibraryItem(props.id, value);
      props.onChanged();
    }, 500);
  }

  return (
    <>
      <label
        htmlFor="lib-title"
        className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
      >
        Judul
      </label>
      <input
        id="lib-title"
        className="w-full px-3 py-2 text-lg font-semibold"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function MediaPreview({ media }: { media: MediaInfo }) {
  const url = convertFileSrc(media.path);
  return (
    <div className="flex flex-col gap-2">
      {media.mediaType === "video" ? (
        <video
          className="max-h-72 w-full rounded-md border border-surface-3 bg-black object-contain"
          src={url}
          controls
          muted
          loop
          playsInline
        />
      ) : (
        <img
          className="max-h-72 w-full rounded-md border border-surface-3 bg-black object-contain"
          src={url}
          alt={media.fileName}
        />
      )}
      <p className="m-0 text-xs text-ink-muted">
        {media.fileName} · {media.mediaType}
      </p>
    </div>
  );
}

function LibrarySongText(props: { itemId: number; text: string }) {
  const [draft, setDraft] = useState(props.text);
  const savedRef = useRef(props.text);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(props.text);
    savedRef.current = props.text;
  }, [props.itemId, props.text]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onChange(value: string) {
    setDraft(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (value === savedRef.current) return;
      savedRef.current = value;
      api.saveSongText(props.itemId, value);
    }, 500);
  }

  return (
    <>
      <label
        htmlFor="lib-text"
        className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
      >
        Lirik
      </label>
      <textarea
        id="lib-text"
        className="min-h-0 flex-1 resize-none px-3 py-3 text-[15px] leading-relaxed"
        placeholder={HINT}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function PresentationSlides(props: {
  itemId: number;
  slides: PresentationSlide[];
  mediaOptions: LibraryItem[];
  onSlides: (slides: PresentationSlide[]) => void;
  onBackground: (slideId: number, mediaItemId: number | null) => void;
}) {
  const { slides, mediaOptions, onSlides } = props;
  const timers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  function onChange(slideId: number, patch: { title?: string; body?: string }) {
    onSlides(slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)));
    const existing = timers.current.get(slideId);
    if (existing) window.clearTimeout(existing);
    timers.current.set(
      slideId,
      window.setTimeout(() => {
        const slide = slides.find((s) => s.id === slideId);
        if (slide) api.saveSlide(slideId, slide.title, slide.body);
      }, 500),
    );
  }

  async function reload() {
    const d = await api.getLibraryItem(props.itemId);
    if (d) onSlides(d.slides);
  }

  async function add() {
    await api.addSlide(props.itemId, "Slide baru", "");
    await reload();
  }

  async function move(index: number, delta: number) {
    const slide = slides[index];
    await api.moveSlide(props.itemId, slide.id, index + delta);
    await reload();
  }

  async function remove(slideId: number) {
    await api.deleteSlide(slideId);
    await reload();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">{slides.length} slide</span>
        <button onClick={add}>+ Slide</button>
      </div>
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="flex flex-col gap-1.5 rounded-md border border-surface-3 bg-surface-1 p-2.5"
        >
          <div className="flex items-center gap-1">
            <span className="mr-1 min-w-[18px] text-xs font-semibold text-ink-muted">
              {i + 1}
            </span>
            <button
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="rounded px-2 py-0.5 text-xs"
              aria-label="Pindah slide ke atas"
            >
              ↑
            </button>
            <button
              disabled={i >= slides.length - 1}
              onClick={() => move(i, 1)}
              className="rounded px-2 py-0.5 text-xs"
              aria-label="Pindah slide ke bawah"
            >
              ↓
            </button>
            <button
              onClick={() => remove(s.id)}
              className="rounded px-2 py-0.5 text-xs"
              aria-label="Hapus slide"
            >
              ×
            </button>
          </div>
          <input
            placeholder="Judul slide (label operator)"
            value={s.title}
            onChange={(e) => onChange(s.id, { title: e.target.value })}
          />
          <textarea
            className="min-h-[90px] resize-y leading-relaxed"
            placeholder="Isi slide (yang ditayangkan)"
            value={s.body}
            onChange={(e) => onChange(s.id, { body: e.target.value })}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-muted">Background:</span>
            <select
              className="max-w-[200px] px-2 py-1 text-xs"
              value={s.backgroundMediaId ?? ""}
              onChange={(e) =>
                props.onBackground(
                  s.id,
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              aria-label={`Background slide ${i + 1}`}
            >
              <option value="">Tanpa</option>
              {mediaOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      {slides.length === 0 && (
        <p className="m-0 text-ink-muted">
          Belum ada slide. Tambahkan slide pertama dengan tombol + Slide.
        </p>
      )}
    </div>
  );
}
