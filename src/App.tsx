import { useCallback, useEffect, useState } from "react";
import { api, onLiveChange, onProjectionChange } from "./lib/api";
import HeaderBar from "./components/HeaderBar";
import LibraryPanel from "./components/LibraryPanel";
import CueListPanel from "./components/CueListPanel";
import InspectorPanel, { type Selection } from "./components/InspectorPanel";
import TransportBar from "./components/TransportBar";
import type { LiveView as LiveViewState, MonitorInfo, Urutan } from "./types";

export default function App() {
  const [urutans, setUrutans] = useState<Urutan[]>([]);
  const [live, setLive] = useState<LiveViewState | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [projectionMonitor, setProjectionMonitorState] = useState<string>("");
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [libRefresh, setLibRefresh] = useState(0);

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

  async function handleAddTextItem() {
    if (!live?.urutanId) return;
    const created = await api.addItem(live.urutanId, "Item baru", "");
    setSelection({ type: "cue", id: created.id });
  }

  async function handleMoveItem(index: number, delta: number) {
    if (!live) return;
    const item = live.items[index];
    await api.moveItem(live.urutanId!, item.id, index + delta);
  }

  async function handleDeleteItem(itemId: number) {
    if (!window.confirm("Hapus item ini?")) return;
    await api.deleteItem(itemId);
    if (selection?.type === "cue" && selection.id === itemId) setSelection(null);
  }

  function openLibrary(libraryItemId: number) {
    setSelection({ type: "library", id: libraryItemId });
  }

  return (
    <div className="flex h-full flex-col">
      <HeaderBar
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
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <LibraryPanel
          selectedId={selection?.type === "library" ? selection.id : null}
          onSelect={(item) => setSelection({ type: "library", id: item.id })}
          refreshKey={libRefresh}
        />
        <CueListPanel
          live={live}
          selectedItemId={selection?.type === "cue" ? selection.id : null}
          onSelect={(itemId) => setSelection({ type: "cue", id: itemId })}
          onAddText={handleAddTextItem}
          onMove={handleMoveItem}
          onDelete={handleDeleteItem}
        />
        <InspectorPanel
          selection={selection}
          live={live}
          onOpenLibrary={openLibrary}
          onClearSelection={() => setSelection(null)}
          onChanged={bumpLib}
        />
      </div>

      <TransportBar live={live} projectionOpen={projectionOpen} />
    </div>
  );
}
