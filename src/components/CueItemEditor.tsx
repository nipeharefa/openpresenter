import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { kindLabel } from "../lib/slides";
import type { LiveView } from "../types";
import { Badge, Hint } from "./common";

const HINT =
  "Pisahkan slide dengan satu baris kosong.\n\nContoh: bait pertama slide 1.\n\nBait kedua jadi slide 2.";

interface CueItemEditorProps {
  live: LiveView | null;
  itemId: number;
  onOpenLibrary: (libraryItemId: number) => void;
}

export default function CueItemEditor({
  live,
  itemId,
  onOpenLibrary,
}: CueItemEditorProps) {
  const item = live?.items.find((i) => i.id === itemId) ?? null;

  const [draft, setDraft] = useState({ title: "", text: "" });
  const saveTimer = useRef<number | null>(null);
  const savedRef = useRef({ title: "", text: "" });

  useEffect(() => {
    setDraft({ title: item?.title ?? "", text: item?.text ?? "" });
    savedRef.current = { title: item?.title ?? "", text: item?.text ?? "" };
  }, [itemId, item?.title, item?.text]);

  const save = useCallback(() => {
    if (!item) return;
    if (
      draft.title === savedRef.current.title &&
      draft.text === savedRef.current.text
    )
      return;
    savedRef.current = { title: draft.title, text: draft.text };
    api.saveItem(item.id, draft.title, draft.text);
  }, [item, draft]);

  function onDraftChange(patch: { title?: string; text?: string }) {
    setDraft((d) => ({ ...d, ...patch }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, 500);
  }

  if (!item) {
    return <p className="m-0 p-3 text-ink-muted">Pilih item dari Urutan.</p>;
  }

  if (item.libraryItemId != null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <Badge>{kindLabel(item.kind)}</Badge>
          <button onClick={() => onOpenLibrary(item.libraryItemId!)}>
            Kelola di Library
          </button>
        </div>
        <input
          className="w-full px-3 py-2 text-lg font-semibold"
          value={item.title}
          readOnly
        />
        <textarea
          className="min-h-0 flex-1 resize-none px-3 py-3 text-[15px] leading-relaxed"
          value={
            item.slides.length ? item.slides.map((s) => s.text).join("\n\n") : item.text
          }
          readOnly
        />
        <Hint>
          Konten ini dari Library — edit di sana agar semua Urutan ikut berubah.
        </Hint>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Judul
      </label>
      <input
        className="w-full px-3 py-2 text-lg font-semibold"
        placeholder="Judul item"
        value={draft.title}
        onChange={(e) => onDraftChange({ title: e.target.value })}
      />
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Teks
      </label>
      <textarea
        className="min-h-0 flex-1 resize-none px-3 py-3 text-[15px] leading-relaxed"
        placeholder={HINT}
        value={draft.text}
        onChange={(e) => onDraftChange({ text: e.target.value })}
      />
      <Hint>Tersimpan otomatis · setiap baris kosong = slide baru</Hint>
    </div>
  );
}
