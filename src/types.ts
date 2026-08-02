export interface Urutan {
  id: number;
  name: string;
}

export interface LiveItem {
  id: number;
  title: string;
  text: string;
}

export interface LiveView {
  loaded: boolean;
  urutanId: number | null;
  urutanName: string | null;
  itemIndex: number;
  slideIndex: number;
  slideCount: number;
  slideText: string;
  black: boolean;
  items: LiveItem[];
}

export interface MonitorInfo {
  name: string | null;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
  isPrimary: boolean;
}
