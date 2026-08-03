import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { itemSlideCount, kindLabel } from "../lib/slides";
import type { LiveView } from "../types";
import { Badge } from "./common";

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
              {item.libraryItemId != null && (
                <Badge>{kindLabel(item.kind)}</Badge>
              )}
              <Badge>{itemSlideCount(item)}</Badge>
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
          current.libraryItemId != null ? (
            <>
              <div className="edit__readonly-head">
                <Badge>{kindLabel(current.kind)}</Badge>
                <button onClick={() => props.onOpenLibrary(current.libraryItemId!)}>
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
                value={current.slides.length ? current.slides.join("\n\n") : current.text}
                readOnly
              />
              <p className="hint">
                Konten ini berasal dari Library — edit di sana agar semua Urutan
                ikut berubah.
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
