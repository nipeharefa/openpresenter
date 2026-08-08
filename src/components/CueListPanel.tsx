import { useState } from "react";
import { api } from "../lib/api";
import { itemSlideCount, kindLabel } from "../lib/slides";
import type { LiveView } from "../types";
import { Badge } from "./common";

interface CueListPanelProps {
  live: LiveView | null;
  selectedItemId: number | null;
  onSelect: (itemId: number) => void;
  onAddText: () => void;
  onAddSection: () => void;
  onMove: (index: number, delta: number) => void;
  onDelete: (itemId: number) => void;
  onDuplicate: (itemId: number) => void;
  canUndo: boolean;
  onUndo: () => void;
}

export default function CueListPanel({
  live,
  selectedItemId,
  onSelect,
  onAddText,
  onAddSection,
  onMove,
  onDelete,
  onDuplicate,
  canUndo,
  onUndo,
}: CueListPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const nextIndex = (() => {
    if (!live) return null;
    for (let i = live.itemIndex + 1; i < live.items.length; i++) {
      if (!live.items[i].isSection) return i;
    }
    return null;
  })();

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-3 bg-surface-1">
      <div className="flex items-center gap-1 border-b border-surface-3 px-3 py-2">
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Urutan Ibadah
        </span>
        {canUndo && (
          <button onClick={onUndo} className="text-xs" title="Batalkan perubahan terakhir">
            Undo
          </button>
        )}
        <button onClick={onAddSection} disabled={!live?.loaded} className="text-xs" title="Tambah bagian">
          + Bagian
        </button>
        <button onClick={onAddText} disabled={!live?.loaded} className="text-xs">
          + Item
        </button>
      </div>

      {nextIndex != null && (
        <div className="border-b border-surface-3 bg-surface-2 px-3 py-1 text-[11px] text-ink-muted">
          Next: {live!.items[nextIndex].title || "(tanpa judul)"}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
        {live?.items.length === 0 && (
          <p className="m-0 px-1 text-ink-muted">
            Belum ada item. Tambahkan dari Library atau buat item teks.
          </p>
        )}
        {live?.items.map((item, index) => {
          const isCurrent = index === live.itemIndex;
          const isSelected = item.id === selectedItemId;

          if (item.isSection) {
            return (
              <div
                key={item.id}
                className={
                  "my-1 flex items-center gap-1 rounded-md px-2 py-1" +
                  (isSelected ? " bg-brand-weak" : "")
                }
              >
                <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {item.title || "(bagian)"}
                </span>
                <button
                  onClick={() => onSelect(item.id)}
                  className="rounded px-1 text-xs text-ink-muted hover:text-ink"
                  aria-label="Ubah nama bagian"
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded px-1 text-xs text-ink-muted hover:text-ink"
                  aria-label="Hapus bagian"
                >
                  ×
                </button>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex != null && dragIndex !== index) {
                  onMove(dragIndex, index - dragIndex);
                }
                setDragIndex(null);
              }}
              className={
                "flex items-center gap-1 rounded-md" +
                (isSelected
                  ? " bg-brand-weak shadow-[inset_3px_0_0_var(--color-brand)]"
                  : isCurrent
                    ? " bg-live/10 shadow-[inset_3px_0_0_var(--color-live)]"
                    : "")
              }
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 border-none bg-transparent px-2 py-1.5 text-left text-ink hover:border-none hover:bg-surface-2"
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => api.jumpItem(index)}
                title={
                  isCurrent
                    ? "Sedang tayang (klik 2x = tayangkan)"
                    : "Pilih untuk edit · klik 2x = tayangkan"
                }
              >
                <span className="flex-1 truncate">
                  {item.title || "(tanpa judul)"}
                </span>
                {item.libraryItemId != null && <Badge>{kindLabel(item.kind)}</Badge>}
                <Badge>{itemSlideCount(item)}</Badge>
              </button>
              <button
                onClick={() => api.jumpItem(index)}
                className="rounded px-1.5 py-0.5 text-xs text-live hover:border-live"
                aria-label="Tayangkan item ini"
                title="Tayangkan sekarang"
              >
                ▶
              </button>
              <button
                onClick={() => onDuplicate(item.id)}
                className="rounded px-1 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                aria-label="Duplikat item"
                title="Duplikat item"
              >
                ⧉
              </button>
              <span className="flex gap-0.5 pr-1">
                <button
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                  className="rounded px-1 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                  aria-label="Pindah ke atas"
                >
                  ↑
                </button>
                <button
                  disabled={index >= live.items.length - 1}
                  onClick={() => onMove(index, 1)}
                  className="rounded px-1 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                  aria-label="Pindah ke bawah"
                >
                  ↓
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded px-1 py-0.5 text-xs text-ink-muted hover:border-surface-3 hover:text-ink"
                  aria-label="Hapus item"
                >
                  ×
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
