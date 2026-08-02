import { getCurrentWindow } from "@tauri-apps/api/window";

export function windowLabel(): string {
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
}
