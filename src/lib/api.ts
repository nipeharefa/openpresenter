import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LiveView, MonitorInfo, Song, Tag, Urutan } from "../types";

export const api = {
  listUrutan: () => invoke<Urutan[]>("list_urutan"),
  createUrutan: (name: string) => invoke<Urutan>("create_urutan", { name }),
  deleteUrutan: (id: number) => invoke<void>("delete_urutan", { id }),
  loadUrutan: (id: number) => invoke<Urutan>("load_urutan", { id }),
  addItem: (urutanId: number, title: string, text: string) =>
    invoke<{ id: number }>("add_item", { urutanId, title, text }),
  saveItem: (id: number, title: string, text: string) =>
    invoke<void>("save_item", { id, title, text }),
  deleteItem: (id: number) => invoke<void>("delete_item", { id }),
  moveItem: (urutanId: number, itemId: number, newPosition: number) =>
    invoke<void>("move_item", { urutanId, itemId, newPosition }),
  nextSlide: () => invoke<void>("next_slide"),
  prevSlide: () => invoke<void>("prev_slide"),
  jumpItem: (index: number) => invoke<void>("jump_item", { index }),
  toggleBlack: () => invoke<void>("toggle_black"),
  openProjection: (monitor: string | null) =>
    invoke<void>("open_projection", { monitor }),
  stopLive: () => invoke<void>("close_projection"),
  listMonitors: () => invoke<MonitorInfo[]>("list_monitors"),
  getProjectionMonitor: () => invoke<string | null>("get_projection_monitor"),
  setProjectionMonitor: (name: string | null) =>
    invoke<void>("set_projection_monitor", { name }),
  getProjectionOpen: () => invoke<boolean>("get_projection_open"),
  listSongs: (title: string | null, tags: string[]) =>
    invoke<Song[]>("list_songs", { title, tags }),
  createSong: (title: string, text: string) =>
    invoke<Song>("create_song", { title, text }),
  saveSong: (id: number, title: string, text: string) =>
    invoke<Song>("save_song", { id, title, text }),
  deleteSong: (id: number) => invoke<void>("delete_song", { id }),
  listTags: () => invoke<Tag[]>("list_tags"),
  addSongTag: (songId: number, name: string) =>
    invoke<Tag>("add_song_tag", { songId, name }),
  removeSongTag: (songId: number, tagId: number) =>
    invoke<void>("remove_song_tag", { songId, tagId }),
  addSongToUrutan: (urutanId: number, songId: number) =>
    invoke<void>("add_song_to_urutan", { urutanId, songId }),
  getLive: () => invoke<LiveView>("get_live"),
};

export function onProjectionChange(cb: (open: boolean) => void): Promise<UnlistenFn> {
  return listen<boolean>("projection:changed", (event) => cb(event.payload));
}

export function onLiveChange(cb: (view: LiveView) => void): Promise<UnlistenFn> {
  return listen<LiveView>("live:changed", (event) => cb(event.payload));
}
