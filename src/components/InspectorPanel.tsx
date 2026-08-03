import { useState } from "react";
import type { LiveView } from "../types";
import CueItemEditor from "./CueItemEditor";
import LibraryEditor from "./LibraryEditor";
import LivePreview from "./LivePreview";

export type Selection =
  | { type: "library"; id: number }
  | { type: "cue"; id: number }
  | null;

interface InspectorPanelProps {
  selection: Selection;
  live: LiveView | null;
  onOpenLibrary: (libraryItemId: number) => void;
  onClearSelection: () => void;
  onChanged: () => void;
}

type View = "preview" | "editor";

export default function InspectorPanel({
  selection,
  live,
  onOpenLibrary,
  onClearSelection,
  onChanged,
}: InspectorPanelProps) {
  const [view, setView] = useState<View>("preview");

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-surface-3 bg-surface-1">
      <div className="flex items-center gap-1 border-b border-surface-3 px-2 py-1.5">
        <button
          className={
            "border-none bg-transparent px-2 py-1 text-xs text-ink-muted hover:border-none hover:text-ink" +
            (view === "preview" ? " bg-brand-weak text-brand" : "")
          }
          onClick={() => setView("preview")}
        >
          Preview
        </button>
        <button
          className={
            "border-none bg-transparent px-2 py-1 text-xs text-ink-muted hover:border-none hover:text-ink" +
            (view === "editor" ? " bg-brand-weak text-brand" : "")
          }
          onClick={() => setView("editor")}
        >
          Properti
        </button>
        <span className="flex-1" />
        {selection && (
          <button
            className="border-none bg-transparent px-1.5 text-xs text-ink-muted hover:border-none hover:text-ink"
            onClick={onClearSelection}
            aria-label="Tutup properti"
          >
            ×
          </button>
        )}
      </div>

      {view === "preview" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
          <LivePreview live={live} />
          <p className="m-0 text-center text-[11px] text-ink-muted">
            Space/Enter next · Backspace prev · B black · Esc stop live
          </p>
        </div>
      ) : selection?.type === "library" ? (
        <LibraryEditor
          itemId={selection.id}
          live={live}
          onChanged={onChanged}
          onDeleted={onClearSelection}
        />
      ) : selection?.type === "cue" ? (
        <CueItemEditor
          live={live}
          itemId={selection.id}
          onOpenLibrary={onOpenLibrary}
        />
      ) : (
        <p className="m-0 p-3 text-ink-muted">
          Pilih konten di Library atau item di Urutan untuk mengedit propertinya.
        </p>
      )}
    </section>
  );
}
