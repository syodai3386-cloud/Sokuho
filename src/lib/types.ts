export type Genre = "weather" | "quake" | "train" | "traffic";

export type Severity = "info" | "warning" | "critical";

export type NormalizedItem = {
  id: string;
  genre: Genre;
  title: string;
  body: string;
  timestamp: string; // ISO 8601
  severity?: Severity;
  sourceName: string;
  sourceUrl: string;
};

export type GenreResult = {
  ok: boolean;
  items: NormalizedItem[];
  isMock?: boolean;
  // isMock のとき、なぜサンプル表示なのかを利用者に伝える文言
  notice?: string;
  error?: string;
};
