export interface Urutan {
  id: number;
  name: string;
}

export type Mode = "edit" | "library" | "live";

export interface SlideBackgroundContent {
  mediaType: string;
  storedName: string;
  path: string;
}

export interface SlideContent {
  text: string;
  background: SlideBackgroundContent | null;
}

export interface LiveItem {
  id: number;
  title: string;
  text: string;
  libraryItemId: number | null;
  kind: string | null;
  slides: SlideContent[];
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

export interface Tag {
  id: number;
  name: string;
}

export type LibraryKind = "song" | "presentation" | "media";

export interface LibraryItem {
  id: number;
  kind: LibraryKind;
  title: string;
  tags: Tag[];
}

export interface PresentationSlide {
  id: number;
  itemId: number;
  position: number;
  title: string;
  body: string;
  backgroundMediaId: number | null;
}

export interface MediaInfo {
  itemId: number;
  mediaType: string;
  fileName: string;
  storedName: string;
  width: number | null;
  height: number | null;
  path: string;
}

export interface LibraryItemDetail {
  id: number;
  kind: LibraryKind;
  title: string;
  tags: Tag[];
  text: string;
  slides: PresentationSlide[];
  media: MediaInfo | null;
}
