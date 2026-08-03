import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { itemSlideCount, kindLabel } from "../lib/slides";
import type { LiveView } from "../types";
import { Badge, Hint } from "./common";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

interface EditViewProps {
  live: LiveView | null;
  selectedItemId: number | null;
  setSelectedItemId: (id: number) => void;
  onAdd: () => void;
  onMove: (index: number, delta: number) => void;
  onDelete: (id: number) => void;
  onOpenLibrary: (libraryItemId: number) => void;
}

export default function EditView(props: EditViewProps) {
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
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-surface-3 bg-surface-1 p-2.5">
        <div className="flex items-center justify-between px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <span>Item</span>
          <button onClick={props.onAdd} disabled={!live?.loaded}>
            + Item
          </button>
        </div>
        {live?.items.length === 0 && (
          <p className="m-0 text-ink-muted">
            Belum ada item. Tambahkan lagu, ayat, atau pengumuman.
          </p>
        )}
        {live?.items.map((item, index) => (
          <div
            key={item.id}
            className={
              "flex items-center gap-1.5 rounded-md" +
              (item.id === selectedItemId
                ? " bg-brand-weak shadow-[inset_3px_0_0_var(--color-brand)]"
                : "")
            }
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 border-none bg-transparent px-2.5 py-2 text-left text-ink hover:border-none hover:bg-surface-2"
              onClick={() => props.setSelectedItemId(item.id)}
            >
              <span className="flex-1 truncate">
                {item.title || "(tanpa judul)"}
              </span>
              {item.libraryItemId != null && <Badge>{kindLabel(item.kind)}</Badge>}
              <Badge>{itemSlideCount(item)}</Badge>
            </button>
            <span className="flex gap-0.5 pr-1.5">
              <button
                disabled={index === 0}
                onClick={() => props.onMove(index, -1)}
                className="rounded px-1.5 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                aria-label="Pindah ke atas"
                title="Pindah ke atas"
              >
                ↑
              </button>
              <button
                disabled={index >= live.items.length - 1}
                onClick={() => props.onMove(index, 1)}
                className="rounded px-1.5 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                aria-label="Pindah ke bawah"
                title="Pindah ke bawah"
              >
                ↓
              </button>
              <button
                onClick={() => props.onDelete(item.id)}
                className="rounded px-1.5 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                aria-label="Hapus item"
                title="Hapus item"
              >
                ×
              </button>
            </span>
          </div>
        ))}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-2 px-5 py-4">
        {current ? (
          current.libraryItemId != null ? (
            <>
              <div className="flex items-center gap-2">
                <Badge>{kindLabel(current.kind)}</Badge>
                <button onClick={() => props.onOpenLibrary(current.libraryItemId!)}>
                  Kelola di Library
                </button>
              </div>
              <input
                id="item-title"
                className="w-full px-3 py-2 text-lg font-semibold"
                value={current.title}
                readOnly
              />
              <textarea
                id="item-text"
                className="min-h-0 flex-1 resize-none px-3 py-3 text-[15px] leading-relaxed"
                value={current.slides.length ? current.slides.join("\n\n") : current.text}
                readOnly
              />
              <Hint>
                Konten ini berasal dari Library — edit di sana agar semua Urutan
                ikut berubah.
              </Hint>
            </>
          ) : (
            <>
              <label
                htmlFor="item-title"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
              >
                Judul
              </label>
              <input
                id="item-title"
                className="w-full px-3 py-2 text-lg font-semibold"
                placeholder="Judul item"
                value={draft.title}
                onChange={(e) => onDraftChange({ title: e.target.value })}
              />
              <label
                htmlFor="item-text"
                className="text-xs font-semibold uppercase tracking-wider text-ink-muted"
              >
                Teks
              </label>
              <textarea
                id="item-text"
                className="min-h-0 flex-1 resize-none px-3 py-3 text-[15px] leading-relaxed"
                placeholder={HINT}
                value={draft.text}
                onChange={(e) => onDraftChange({ text: e.target.value })}
              />
              <Hint>
                Tersimpan otomatis · setiap baris kosong = slide baru
              </Hint>
            </>
          )
        ) : (
          <p className="m-0 text-ink-muted">Pilih atau tambahkan sebuah item.</p>
        )}
      </main>
    </div>
  );
}
