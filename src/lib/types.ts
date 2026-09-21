export type Genre = "weather" | "quake" | "train" | "traffic";

export type Severity = "info" | "warning" | "critical";

export type WeatherDay = {
  date: string; // YYYY-MM-DD
  label: string; // 今日 / 明日 / 明後日
  code: string; // 天気コード(気象庁のコード、または Open-Meteo の WMO コード)
  icon: string;
  text: string;
  tempMax?: number;
  tempMin?: number;
  // 0-6 / 6-12 / 12-18 / 18-24 時の降水確率(%)。取得できない時間帯は null
  popSlots: (number | null)[];
  // 6時間ごとの値がない日の、1日単位の降水確率(%)
  popDaily?: number;
  // 0-6 / 6-12 / 12-18 / 18-24 時の降水量の予測(mm)。取得できない時間帯は null
  rainSlots: (number | null)[];
};

export type WeatherForecast = {
  // jma: 気象庁の予報区(東部・西部など) / open-meteo: 市町村など特定の地点のモデル予測
  source: "jma" | "open-meteo";
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
  // 一覧の各項目の右上に出す状態の表示(電車なら「運転見合わせ」、地震なら「震度3」)。色は severity に従う
  badge?: string;
  // 並び順の重み(小さいほど上)。電車では首都圏の中心に近い路線ほど小さい
  rank?: number;
  weather?: WeatherForecast;
  sourceName: string;
  sourceUrl: string;
};

// 電車の1路線の現在の状態(平常運転の路線も含む。お気に入り路線の表示・選択に使う)
export type LineState = "normal" | "warning" | "critical" | "unknown";

export type LineStatus = {
  id: string; // 路線ID(odpt.Railway:...)
  title: string;
  operator: string;
  area: string;
  rank: number;
  state: LineState;
  label?: string;
  body?: string;
  timestamp?: string;
};

export type GenreResult = {
  ok: boolean;
  items: NormalizedItem[];
  // 電車のみ: 全路線の状態
  lines?: LineStatus[];
  isMock?: boolean;
  // isMock のとき、なぜサンプル表示なのかを利用者に伝える文言
  notice?: string;
  // 一部の取得に失敗した・対象外にした等、結果と一緒に伝えたい注意書き
  warnings?: string[];
  error?: string;
};
