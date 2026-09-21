export type Genre = "weather" | "quake" | "train" | "traffic";

export type Severity = "info" | "warning" | "critical";

export type WeatherDay = {
  date: string; // YYYY-MM-DD
  label: string; // 今日 / 明日 / 明後日
  code: string; // 気象庁の天気コード
  icon: string;
  text: string;
  tempMax?: number;
  tempMin?: number;
  // 0-6 / 6-12 / 12-18 / 18-24 時の降水確率(%)。取得できない時間帯は null
  popSlots: (number | null)[];
  // 6時間ごとの値がない日の、1日単位の降水確率(%)
  popDaily?: number;
  // 1日の降水量の予測(mm)。取得できなければ undefined
  rainMm?: number;
};

export type WeatherForecast = {
  tempPointName?: string;
  days: WeatherDay[];
};

export type NormalizedItem = {
  id: string;
  genre: Genre;
  title: string;
  body: string;
  timestamp: string; // ISO 8601
  severity?: Severity;
  // 絞り込み用の分類(電車なら事業者名)
  category?: string;
  // 絞り込み用の地域(電車なら 首都圏 / 北関東・甲信越 / 東北)
  area?: string;
  weather?: WeatherForecast;
  sourceName: string;
  sourceUrl: string;
};

export type GenreResult = {
  ok: boolean;
  items: NormalizedItem[];
  isMock?: boolean;
  // isMock のとき、なぜサンプル表示なのかを利用者に伝える文言
  notice?: string;
  // 一部の取得に失敗した・対象外にした等、結果と一緒に伝えたい注意書き
  warnings?: string[];
  error?: string;
};
