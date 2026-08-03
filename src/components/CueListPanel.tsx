import { api } from "../lib/api";
import { itemSlideCount, kindLabel } from "../lib/slides";
import type { LiveView } from "../types";
import { Badge } from "./common";

interface CueListPanelProps {
  live: LiveView | null;
  selectedItemId: number | null;
  onSelect: (itemId: number) => void;
  onAddText: () => void;
  onMove: (index: number, delta: number) => void;
  onDelete: (itemId: number) => void;
}

export default function CueListPanel({
  live,
  selectedItemId,
  onSelect,
  onAddText,
  onMove,
  onDelete,
}: CueListPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-3 bg-surface-1">
      <div className="flex items-center justify-between border-b border-surface-3 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Urutan Ibadah
        </span>
        <button onClick={onAddText} disabled={!live?.loaded}>
          + Item
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
        {live?.items.length === 0 && (
          <p className="m-0 px-1 text-ink-muted">
            Belum ada item. Cari di Library lalu "Tambah ke Urutan", atau buat
            item teks.
          </p>
        )}
        {live?.items.map((item, index) => {
          const isCurrent = index === live.itemIndex;
          const isSelected = item.id === selectedItemId;
          return (
            <div
              key={item.id}
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
                title={isCurrent ? "Sedang tayang" : "Pilih untuk edit"}
              >
                <span className="flex-1 truncate">
                  {item.title || "(tanpa judul)"}
                </span>
                {item.libraryItemId != null && (
                  <Badge>{kindLabel(item.kind)}</Badge>
                )}
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
