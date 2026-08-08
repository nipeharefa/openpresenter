import { useCallback, useEffect, useState } from "react";
import { api, onLiveChange, onProjectionChange } from "./lib/api";
import HeaderBar, { type Screen } from "./components/HeaderBar";
import TransportBar from "./components/TransportBar";
import LibraryScreen from "./screens/LibraryScreen";
import SetlistScreen from "./screens/SetlistScreen";
import LiveScreen from "./screens/LiveScreen";
import DisplayScreen from "./screens/DisplayScreen";
import type {
  LiveView,
  MonitorInfo,
  RestoredItem,
  Selection,
  Urutan,
} from "./types";

type UndoAction =
  | { kind: "delete"; item: RestoredItem }
  | { kind: "move"; itemId: number; from: number }
  | null;

export default function App() {
  const [urutans, setUrutans] = useState<Urutan[]>([]);
  const [live, setLive] = useState<LiveView | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [projectionMonitor, setProjectionMonitorState] = useState<string>("");
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("setlist");
  const [selection, setSelection] = useState<Selection>(null);
  const [libRefresh, setLibRefresh] = useState(0);
  const [undoAction, setUndoAction] = useState<UndoAction>(null);

  const bumpLib = useCallback(() => setLibRefresh((k) => k + 1), []);

  useEffect(() => {
    api.listUrutan().then(setUrutans);
    api.getLive().then(setLive);
    api.listMonitors().then(setMonitors);
    api.getProjectionMonitor().then((name) => setProjectionMonitorState(name ?? ""));
    api.getProjectionOpen().then(setProjectionOpen);
    let unlisten: (() => void) | undefined;
    let unlistenProj: (() => void) | undefined;
    onLiveChange(setLive).then((fn) => (unlisten = fn));
    onProjectionChange(setProjectionOpen).then((fn) => (unlistenProj = fn));
    return () => {
      unlisten?.();
      unlistenProj?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        api.nextSlide();
      } else if (
        e.code === "Backspace" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowUp"
      ) {
        e.preventDefault();
        api.prevSlide();
      } else if (e.key === "b" || e.key === "B") {
        api.toggleBlack();
      } else if (e.key === "Escape") {
        if (projectionOpen) api.stopLive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectionOpen]);

  useEffect(() => {
    if (!undoAction) return;
    const t = window.setTimeout(() => setUndoAction(null), 8000);
    return () => window.clearTimeout(t);
  }, [undoAction]);

  async function handleSelectUrutan(id: number) {
    await api.loadUrutan(id);
    setUrutans(await api.listUrutan());
    setSelection(null);
  }

  async function handleDeleteUrutan() {
    if (!live?.urutanId) return;
    if (!window.confirm("Hapus urutan ini beserta semua itemnya?")) return;
    await api.deleteUrutan(live.urutanId);
    setSelection(null);
    setUrutans(await api.listUrutan());
  }

  async function handleAddText() {
    if (!live?.urutanId) return;
    const created = await api.addItem(live.urutanId, "Item baru", "");
    setSelection({ type: "cue", id: created.id });
  }

  async function handleAddSection() {
    if (!live?.urutanId) return;
    await api.addSection(live.urutanId, "Bagian baru");
  }

  async function handleMove(index: number, delta: number) {
    if (!live) return;
    const item = live.items[index];
    if (!undoAction) setUndoAction({ kind: "move", itemId: item.id, from: index });
    await api.moveItem(live.urutanId!, item.id, index + delta);
  }

  async function handleDelete(id: number) {
    if (!live) return;
    const index = live.items.findIndex((i) => i.id === id);
    const item = live.items[index];
    if (index < 0 || !item) return;
    if (!window.confirm("Hapus item ini?")) return;
    setUndoAction({
      kind: "delete",
      item: {
        id: item.id,
        urutanId: live.urutanId ?? 0,
        position: index,
        title: item.title,
        text: item.text,
        libraryItemId: item.libraryItemId,
        isSection: item.isSection,
      },
    });
    await api.deleteItem(id);
    if (selection?.type === "cue" && selection.id === id) setSelection(null);
  }

  async function handleDuplicate(id: number) {
    await api.duplicateItem(id);
  }

  async function doUndo() {
    if (!undoAction) return;
    if (undoAction.kind === "delete") {
      await api.restoreItem(undoAction.item);
    } else if (live?.urutanId) {
      await api.moveItem(live.urutanId, undoAction.itemId, undoAction.from);
    }
    setUndoAction(null);
  }

  function openLibrary(id: number) {
    setSelection({ type: "library", id });
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderBar
        screen={screen}
        onScreen={setScreen}
        live={live}
        urutans={urutans}
        monitors={monitors}
        projectionMonitor={projectionMonitor}
        onProjectionMonitor={(name) => {
          setProjectionMonitorState(name);
          api.setProjectionMonitor(name || null);
        }}
        onSelectUrutan={handleSelectUrutan}
        onDeleteUrutan={handleDeleteUrutan}
        onChanged={() => api.listUrutan().then(setUrutans)}
      />

      {screen === "library" && (
        <LibraryScreen live={live} refreshKey={libRefresh} onChanged={bumpLib} />
      )}
      {screen === "setlist" && (
        <SetlistScreen
          live={live}
          selection={selection}
          refreshKey={libRefresh}
          onSelectCue={(id) => setSelection({ type: "cue", id })}
          onOpenLibrary={openLibrary}
          onAddText={handleAddText}
          onAddSection={handleAddSection}
          onMove={handleMove}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          canUndo={undoAction != null}
          onUndo={doUndo}
          onChanged={bumpLib}
          onClearSelection={() => setSelection(null)}
        />
      )}
      {screen === "live" && <LiveScreen live={live} />}
      {screen === "display" && (
        <DisplayScreen
          monitors={monitors}
          projectionMonitor={projectionMonitor}
          onProjectionMonitor={(name) => {
            setProjectionMonitorState(name);
            api.setProjectionMonitor(name || null);
          }}
        />
      )}

      <TransportBar live={live} projectionOpen={projectionOpen} />
    </div>
  );
}
