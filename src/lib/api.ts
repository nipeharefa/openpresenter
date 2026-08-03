import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  LibraryItem,
  LibraryItemDetail,
  LibraryKind,
  LiveView,
  MonitorInfo,
  PresentationSlide,
  RestoredItem,
  Tag,
  Urutan,
} from "../types";

export const api = {
  listUrutan: () => invoke<Urutan[]>("list_urutan"),
  createUrutan: (name: string) => invoke<Urutan>("create_urutan", { name }),
  renameUrutan: (id: number, name: string) =>
    invoke<void>("rename_urutan", { id, name }),
  duplicateUrutan: (id: number, newName: string) =>
    invoke<Urutan>("duplicate_urutan", { id, newName }),
  deleteUrutan: (id: number) => invoke<void>("delete_urutan", { id }),
  loadUrutan: (id: number) => invoke<Urutan>("load_urutan", { id }),
  addItem: (urutanId: number, title: string, text: string) =>
    invoke<{ id: number }>("add_item", { urutanId, title, text }),
  addSection: (urutanId: number, title: string) =>
    invoke<void>("add_section", { urutanId, title }),
  saveItem: (id: number, title: string, text: string) =>
    invoke<void>("save_item", { id, title, text }),
  deleteItem: (id: number) => invoke<void>("delete_item", { id }),
  duplicateItem: (id: number) => invoke<void>("duplicate_item", { id }),
  restoreItem: (item: RestoredItem) => invoke<void>("restore_item", { item }),
  moveItem: (urutanId: number, itemId: number, newPosition: number) =>
    invoke<void>("move_item", { urutanId, itemId, newPosition }),
  nextSlide: () => invoke<void>("next_slide"),
  prevSlide: () => invoke<void>("prev_slide"),
  jumpItem: (index: number) => invoke<void>("jump_item", { index }),
  jumpSlide: (index: number) => invoke<void>("jump_slide", { index }),
  jumpTo: (itemIndex: number, slideIndex: number) =>
    invoke<void>("jump_to", { itemIndex, slideIndex }),
  toggleBlack: () => invoke<void>("toggle_black"),
  openProjection: (monitor: string | null) =>
    invoke<void>("open_projection", { monitor }),
  stopLive: () => invoke<void>("close_projection"),
  listMonitors: () => invoke<MonitorInfo[]>("list_monitors"),
  getProjectionMonitor: () => invoke<string | null>("get_projection_monitor"),
  setProjectionMonitor: (name: string | null) =>
    invoke<void>("set_projection_monitor", { name }),
  getProjectionOpen: () => invoke<boolean>("get_projection_open"),

  listLibrary: (kind: LibraryKind | null, title: string | null, tags: string[]) =>
    invoke<LibraryItem[]>("list_library", { kind, title, tags }),
  getLibraryItem: (id: number) => invoke<LibraryItemDetail | null>("get_library_item", { id }),
  createLibraryItem: (kind: LibraryKind, title: string) =>
    invoke<LibraryItem>("create_library_item", { kind, title }),
  renameLibraryItem: (id: number, title: string) =>
    invoke<void>("rename_library_item", { id, title }),
  deleteLibraryItem: (id: number) => invoke<void>("delete_library_item", { id }),
  saveSongText: (itemId: number, text: string) =>
    invoke<void>("save_song_text", { itemId, text }),
  saveSongMeta: (itemId: number, songKey: string, tempo: string) =>
    invoke<void>("save_song_meta", { itemId, songKey, tempo }),
  findLibraryItemByTitle: (title: string) =>
    invoke<LibraryItem | null>("find_library_item_by_title", { title }),
  addSlide: (itemId: number, title: string, body: string) =>
    invoke<PresentationSlide>("add_slide", { itemId, title, body }),
  saveSlide: (id: number, title: string, body: string) =>
    invoke<PresentationSlide>("save_slide", { id, title, body }),
  deleteSlide: (id: number) => invoke<void>("delete_slide", { id }),
  moveSlide: (itemId: number, slideId: number, newPosition: number) =>
    invoke<void>("move_slide", { itemId, slideId, newPosition }),
  listTags: () => invoke<Tag[]>("list_tags"),
  addItemTag: (itemId: number, name: string) =>
    invoke<Tag>("add_item_tag", { itemId, name }),
  removeItemTag: (itemId: number, tagId: number) =>
    invoke<void>("remove_item_tag", { itemId, tagId }),
  addLibraryItemToUrutan: (urutanId: number, libraryItemId: number) =>
    invoke<void>("add_library_item_to_urutan", { urutanId, libraryItemId }),

  importMedia: () => invoke<LibraryItem>("import_media"),
  setSlideBackground: (slideId: number, mediaItemId: number | null) =>
    invoke<void>("set_slide_background", { slideId, mediaItemId }),

  getLive: () => invoke<LiveView>("get_live"),
};

export function onProjectionChange(cb: (open: boolean) => void): Promise<UnlistenFn> {
  return listen<boolean>("projection:changed", (event) => cb(event.payload));
}

export function onLiveChange(cb: (view: LiveView) => void): Promise<UnlistenFn> {
  return listen<LiveView>("live:changed", (event) => cb(event.payload));
}
