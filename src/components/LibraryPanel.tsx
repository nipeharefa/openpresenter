import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { kindLabel } from "../lib/slides";
import type { LibraryItem, LibraryKind, Tag } from "../types";
import { Badge, Chip } from "./common";

interface LibraryPanelProps {
  selectedId: number | null;
  onSelect: (item: LibraryItem) => void;
  refreshKey: number;
}

type KindFilter = LibraryKind | "all";

export default function LibraryPanel({
  selectedId,
  onSelect,
  refreshKey,
}: LibraryPanelProps) {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importTitle, setImportTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [importNote, setImportNote] = useState("");

  const refresh = useCallback((kind: KindFilter, q: string, tags: string[]) => {
    api
      .listLibrary(kind === "all" ? null : kind, q.trim() || null, tags)
      .then(setItems);
  }, []);

  useEffect(() => {
    api.listTags().then(setAllTags);
    refresh("all", "", []);
  }, [refresh, refreshKey]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => refresh(kindFilter, search, selectedTags),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [kindFilter, search, selectedTags, refresh]);

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
    setKindFilter("all");
    setSearch("");
    setSelectedTags([]);
    refresh("all", "", []);
    onSelect(created);
  }

  async function handleImportMedia() {
    try {
      const created = await api.importMedia();
      setKindFilter("all");
      setSearch("");
      setSelectedTags([]);
      refresh("all", "", []);
      onSelect(created);
    } catch {
      // user canceled the file dialog
    }
  }

  async function handleImportText() {
    const title = importTitle.trim();
    const text = importText.trim();
    if (!title || !text) return;
    const existing = await api.findLibraryItemByTitle(title);
    if (existing) {
      if (
        !window.confirm(
          `Sudah ada "${existing.title}" (${existing.kind}). Buka yang sudah ada?`,
        )
      ) {
        return;
      }
      setImporting(false);
      setImportTitle("");
      setImportText("");
      setImportNote("");
      onSelect(existing);
      return;
    }
    const created = await api.createLibraryItem("song", title);
    await api.saveSongText(created.id, text);
    setImporting(false);
    setImportTitle("");
    setImportText("");
    setImportNote("Impor berhasil.");
    setKindFilter("all");
    refresh("all", "", []);
    onSelect(created);
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-3 bg-surface-1">
      <div className="p-2.5">
        <div className="flex gap-1.5">
          <input
            className="min-w-0 flex-1"
            placeholder="Cari judul…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari judul"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Filter jenis">
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
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Filter tag">
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={
              "flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-ink hover:bg-surface-2" +
              (selectedId === it.id
                ? " bg-brand-weak text-white shadow-[inset_3px_0_0_var(--color-brand)]"
                : "")
            }
            onClick={() => onSelect(it)}
          >
            <span className="flex-1 truncate">{it.title}</span>
            <Badge>{kindLabel(it.kind)}</Badge>
          </button>
        ))}
        {items.length === 0 && (
          <p className="m-0 px-1 text-ink-muted">
            Tidak ada konten yang cocok.
          </p>
        )}
      </div>

      <div className="flex gap-1.5 border-t border-surface-3 p-2">
        <button
          onClick={() => handleCreateItem("song")}
          className="flex-1 text-xs"
        >
          + Lagu
        </button>
        <button
          onClick={() => handleCreateItem("presentation")}
          className="flex-1 text-xs"
        >
          + Presentasi
        </button>
        <button onClick={handleImportMedia} className="flex-1 text-xs">
          + Media
        </button>
        <button onClick={() => setImporting((v) => !v)} className="flex-1 text-xs">
          Import
        </button>
      </div>
      {importing && (
        <div className="flex flex-col gap-1.5 border-t border-surface-3 p-2">
          <input
            placeholder="Judul lagu"
            value={importTitle}
            onChange={(e) => setImportTitle(e.target.value)}
            aria-label="Judul lagu untuk import"
          />
          <textarea
            className="min-h-[120px] resize-y text-sm leading-relaxed"
            placeholder="Tempel lirik di sini… (baris kosong = slide)"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Lirik untuk import"
          />
          <button onClick={handleImportText} className="border-brand bg-brand text-white">
            Import
          </button>
          {importNote && <p className="m-0 text-xs text-live">{importNote}</p>}
        </div>
      )}
    </aside>
  );
}
