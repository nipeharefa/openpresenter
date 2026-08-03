import { useCallback, useEffect, useState } from "react";
import { api, onLiveChange, onProjectionChange } from "./lib/api";
import TopBar from "./components/TopBar";
import EditView from "./components/EditView";
import LibraryView from "./components/LibraryView";
import LiveView from "./components/LiveView";
import type { LiveView as LiveViewState, Mode, MonitorInfo, Urutan } from "./types";

export default function App() {
  const [urutans, setUrutans] = useState<Urutan[]>([]);
  const [live, setLive] = useState<LiveViewState | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [projectionMonitor, setProjectionMonitorState] = useState<string>("");
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [libraryFocusId, setLibraryFocusId] = useState<number | null>(null);

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

  async function handleSelectUrutan(id: number) {
    await api.loadUrutan(id);
    setUrutans(await api.listUrutan());
    setSelectedItemId(null);
    setMode("edit");
  }

  async function handleDeleteUrutan() {
    if (!live?.urutanId) return;
    if (!window.confirm("Hapus urutan ini beserta semua itemnya?")) return;
    await api.deleteUrutan(live.urutanId);
    setSelectedItemId(null);
    setUrutans(await api.listUrutan());
  }

  async function handleAddItem() {
    if (!live?.urutanId) return;
    const created = await api.addItem(live.urutanId, "Item baru", "");
    setSelectedItemId(created.id);
  }

  async function handleMoveItem(index: number, delta: number) {
    if (!live) return;
    const item = live.items[index];
    await api.moveItem(live.urutanId!, item.id, index + delta);
  }

  async function handleDeleteItem(itemId: number) {
    if (!window.confirm("Hapus item ini?")) return;
    await api.deleteItem(itemId);
    if (selectedItemId === itemId) setSelectedItemId(null);
  }

  const consumeFocus = useCallback(() => setLibraryFocusId(null), []);

  function openLibraryAt(itemId: number) {
    setLibraryFocusId(itemId);
    setMode("library");
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        mode={mode}
        onMode={setMode}
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

      {mode === "edit" ? (
        <EditView
          live={live}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onAdd={handleAddItem}
          onMove={handleMoveItem}
          onDelete={handleDeleteItem}
          onOpenLibrary={openLibraryAt}
        />
      ) : mode === "library" ? (
        <LibraryView
          live={live}
          focusId={libraryFocusId}
          onFocusConsumed={consumeFocus}
        />
      ) : (
        <LiveView
          live={live}
          projectionOpen={projectionOpen}
          onStop={() => setMode("edit")}
        />
      )}
    </div>
  );
}
