import CueItemEditor from "../components/CueItemEditor";
import CueListPanel from "../components/CueListPanel";
import LibraryEditor from "../components/LibraryEditor";
import type { LiveView, Selection } from "../types";

interface SetlistScreenProps {
  live: LiveView | null;
  selection: Selection;
  refreshKey: number;
  onSelectCue: (id: number) => void;
  onOpenLibrary: (id: number) => void;
  onAddText: () => void;
  onAddSection: () => void;
  onMove: (index: number, delta: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  onChanged: () => void;
  onClearSelection: () => void;
}

export default function SetlistScreen({
  live,
  selection,
  onSelectCue,
  onAddText,
  onAddSection,
  onMove,
  onDelete,
  onDuplicate,
  canUndo,
  onUndo,
  onChanged,
  onOpenLibrary,
  onClearSelection,
}: SetlistScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 gap-2 p-2">
      <div className="w-80 shrink-0">
        <CueListPanel
          live={live}
          selectedItemId={selection?.type === "cue" ? selection.id : null}
          onSelect={onSelectCue}
          onAddText={onAddText}
          onAddSection={onAddSection}
          onMove={onMove}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          canUndo={canUndo}
          onUndo={onUndo}
        />
      </div>
      <div className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-1">
        {selection?.type === "library" ? (
          <LibraryEditor
            key={`lib-${selection.id}`}
            itemId={selection.id}
            live={live}
            onChanged={onChanged}
            onDeleted={onClearSelection}
          />
        ) : selection?.type === "cue" ? (
          <CueItemEditor
            key={`cue-${selection.id}`}
            live={live}
            itemId={selection.id}
            onOpenLibrary={onOpenLibrary}
          />
        ) : (
          <p className="m-0 p-3 text-ink-muted">
            Pilih item di kiri untuk mengedit, atau tambah dari Library.
          </p>
        )}
      </div>
    </div>
  );
}
