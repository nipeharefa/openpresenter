import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api } from "../lib/api";
import { kindLabel } from "../lib/slides";
import type {
  LibraryItem,
  LibraryItemDetail,
  LiveView,
  MediaInfo,
  PresentationSlide,
} from "../types";
import { Badge, Hint } from "./common";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

interface LibraryEditorProps {
  itemId: number;
  live: LiveView | null;
  onChanged: () => void;
  onDeleted: () => void;
}

export default function LibraryEditor({
  itemId,
  live,
  onChanged,
  onDeleted,
}: LibraryEditorProps) {
  const [detail, setDetail] = useState<LibraryItemDetail | null>(null);
  const [mediaOptions, setMediaOptions] = useState<LibraryItem[]>([]);

  useEffect(() => {
    api.getLibraryItem(itemId).then(setDetail);
  }, [itemId]);

  useEffect(() => {
    if (detail?.kind === "presentation") {
      api.listLibrary("media", null, []).then(setMediaOptions);
    }
  }, [detail?.kind, detail?.id]);

  if (!detail) {
    return <p className="m-0 text-ink-muted">Memuat…</p>;
  }

  const current = detail;

  async function handleBackground(slideId: number, mediaItemId: number | null) {
    await api.setSlideBackground(slideId, mediaItemId);
    api.getLibraryItem(current.id).then(setDetail);
  }

  async function handleAddTag(name: string) {
    const tag = await api.addItemTag(current.id, name);
    setDetail((cur) =>
      cur
        ? { ...cur, tags: [...cur.tags.filter((t) => t.id !== tag.id), tag] }
        : cur,
    );
    onChanged();
  }

  async function handleRemoveTag(tagId: number) {
    await api.removeItemTag(current.id, tagId);
    setDetail((cur) =>
      cur ? { ...cur, tags: cur.tags.filter((t) => t.id !== tagId) } : cur,
    );
    onChanged();
  }

  async function handleAddToUrutan() {
    if (!live?.urutanId) return;
    await api.addLibraryItemToUrutan(live.urutanId, current.id);
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus "${current.title}"?`)) return;
    await api.deleteLibraryItem(current.id);
    onDeleted();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <Badge>{kindLabel(detail.kind)}</Badge>
      </div>

      <AutoTitle
        id={detail.id}
        title={detail.title}
        onSaved={onChanged}
      />

      {detail.kind === "presentation" ? (
        <PresentationEditor
          itemId={detail.id}
          slides={detail.slides}
          mediaOptions={mediaOptions}
          onSlides={(slides) => setDetail((cur) => (cur ? { ...cur, slides } : cur))}
          onBackground={handleBackground}
        />
      ) : detail.kind === "media" && detail.media ? (
        <MediaPreview media={detail.media} />
      ) : (
        <AutoSongText itemId={detail.id} text={detail.text} />
      )}

      <TagEditor
        tags={detail.tags}
        onAdd={handleAddTag}
        onRemove={handleRemoveTag}
      />

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
    </div>
  );
}

/* ---------- Atomic sub-editors ---------- */

function AutoTitle(props: { id: number; title: string; onSaved: () => void }) {
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
      props.onSaved();
    }, 500);
  }

  return (
    <>
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Judul
      </label>
      <input
        className="w-full px-3 py-2 text-lg font-semibold"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function AutoSongText(props: { itemId: number; text: string }) {
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
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Lirik
      </label>
      <textarea
        className="min-h-[220px] resize-none px-3 py-3 text-[15px] leading-relaxed"
        placeholder={HINT}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function PresentationEditor(props: {
  itemId: number;
  slides: PresentationSlide[];
  mediaOptions: LibraryItem[];
  onSlides: (slides: PresentationSlide[]) => void;
  onBackground: (slideId: number, mediaItemId: number | null) => void;
}) {
  const { slides, mediaOptions } = props;
  const timers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  function onChange(slideId: number, patch: { title?: string; body?: string }) {
    props.onSlides(
      slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
    );
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
    if (d) props.onSlides(d.slides);
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">{slides.length} slide</span>
        <button onClick={add}>+ Slide</button>
      </div>
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="flex flex-col gap-1.5 rounded-md border border-surface-3 bg-surface-1 p-2"
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
            className="min-h-[80px] resize-y leading-relaxed"
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
          Belum ada slide. Tambahkan dengan tombol + Slide.
        </p>
      )}
    </div>
  );
}

function MediaPreview({ media }: { media: MediaInfo }) {
  const url = convertFileSrc(media.path);
  return (
    <div className="flex flex-col gap-2">
      {media.mediaType === "video" ? (
        <video
          className="max-h-64 w-full rounded-md border border-surface-3 bg-black object-contain"
          src={url}
          controls
          muted
          loop
          playsInline
        />
      ) : (
        <img
          className="max-h-64 w-full rounded-md border border-surface-3 bg-black object-contain"
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

function TagEditor(props: {
  tags: LibraryItemDetail["tags"];
  onAdd: (name: string) => void;
  onRemove: (tagId: number) => void;
}) {
  const [newTag, setNewTag] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Tag
      </span>
      {props.tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-weak px-2 py-0.5 text-xs text-brand"
        >
          {t.name}
          <button
            onClick={() => props.onRemove(t.id)}
            className="border-none bg-transparent p-0 text-[13px] leading-none text-inherit"
            aria-label={`Hapus tag ${t.name}`}
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
          if (e.key === "Enter") {
            props.onAdd(newTag.trim());
            setNewTag("");
          }
          if (e.key === "Escape") setNewTag("");
        }}
        aria-label="Tambah tag"
      />
    </div>
  );
}
