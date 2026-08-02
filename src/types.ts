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
