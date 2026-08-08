import { useState } from "react";
import LibraryEditor from "../components/LibraryEditor";
import LibraryPanel from "../components/LibraryPanel";
import type { LibraryItem, LiveView } from "../types";

interface LibraryScreenProps {
  live: LiveView | null;
  refreshKey: number;
  onChanged: () => void;
}

export default function LibraryScreen({
  live,
  refreshKey,
  onChanged,
}: LibraryScreenProps) {
  const [selected, setSelected] = useState<LibraryItem | null>(null);

  return (
    <div className="flex min-h-0 flex-1 gap-2 p-2">
      <div className="w-72 shrink-0">
        <LibraryPanel
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          refreshKey={refreshKey}
        />
      </div>
      <div className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-1">
        {selected ? (
          <LibraryEditor
            itemId={selected.id}
            live={live}
            onChanged={onChanged}
            onDeleted={() => setSelected(null)}
          />
        ) : (
          <p className="m-0 p-3 text-ink-muted">
            Pilih konten di kiri untuk melihat & mengedit.
          </p>
        )}
      </div>
    </div>
  );
}
