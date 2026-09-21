import type { Genre } from "./types";

export type GenreOption = {
  value: string;
  label: string;
};

export type GenreConfig = {
  id: Genre;
  label: string;
  emoji: string;
  description: string;
  inputLabel: string;
  options: GenreOption[];
  // 最初に選ばれている選択肢(未指定なら options の先頭)
  defaultValue?: string;
  // true なら選択欄を出さず、開いた時点で options[0] の内容を自動表示する
  autoLoad?: boolean;
  // 結果を地域で絞り込むチップ(NormalizedItem.area と一致させる)と、その初期値
  areas?: string[];
  defaultArea?: string;
  // 結果一覧の下に常に出す補足
  footnote?: string;
  // 結果が0件のときの文言
  emptyMessage?: string;
  needsRegistration?: {
    serviceName: string;
    url: string;
  };
};

// 気象庁 予報区(都道府県相当)コード一覧
export const WEATHER_AREAS: GenreOption[] = [
  { value: "016000", label: "北海道(石狩・空知・後志)" },
  { value: "020000", label: "青森県" },
  { value: "030000", label: "岩手県" },
  { value: "040000", label: "宮城県" },
  { value: "050000", label: "秋田県" },
  { value: "060000", label: "山形県" },
  { value: "070000", label: "福島県" },
  { value: "080000", label: "茨城県" },
  { value: "090000", label: "栃木県" },
  { value: "100000", label: "群馬県" },
  { value: "110000", label: "埼玉県" },
  { value: "120000", label: "千葉県" },
  { value: "130000", label: "東京都" },
  { value: "140000", label: "神奈川県" },
  { value: "150000", label: "新潟県" },
  { value: "160000", label: "富山県" },
  { value: "170000", label: "石川県" },
  { value: "180000", label: "福井県" },
  { value: "190000", label: "山梨県" },
  { value: "200000", label: "長野県" },
  { value: "210000", label: "岐阜県" },
  { value: "220000", label: "静岡県" },
  { value: "230000", label: "愛知県" },
  { value: "240000", label: "三重県" },
  { value: "250000", label: "滋賀県" },
  { value: "260000", label: "京都府" },
  { value: "270000", label: "大阪府" },
  { value: "280000", label: "兵庫県" },
  { value: "290000", label: "奈良県" },
  { value: "300000", label: "和歌山県" },
  { value: "310000", label: "鳥取県" },
  { value: "320000", label: "島根県" },
  { value: "330000", label: "岡山県" },
  { value: "340000", label: "広島県" },
  { value: "350000", label: "山口県" },
  { value: "360000", label: "徳島県" },
  { value: "370000", label: "香川県" },
  { value: "380000", label: "愛媛県" },
  { value: "390000", label: "高知県" },
  { value: "400000", label: "福岡県" },
  { value: "410000", label: "佐賀県" },
  { value: "420000", label: "長崎県" },
  { value: "430000", label: "熊本県" },
  { value: "440000", label: "大分県" },
  { value: "450000", label: "宮崎県" },
  { value: "460100", label: "鹿児島県" },
  { value: "471000", label: "沖縄県(本島)" },
];

// 地震情報の絞り込み用の地方ブロック。P2P地震情報APIの震源地名(文字列)に対する
// 部分一致キーワードとして使う。
export const QUAKE_REGIONS: { value: string; label: string; keywords: string[] }[] = [
  { value: "all", label: "全国", keywords: [] },
  {
    value: "hokkaido",
    label: "北海道",
    keywords: ["北海道", "石狩", "十勝", "釧路", "根室", "宗谷", "留萌", "空知", "後志", "胆振", "日高", "渡島", "檜山", "オホーツク"],
  },
  {
    value: "tohoku",
    label: "東北",
    keywords: ["青森", "岩手", "宮城", "秋田", "山形", "福島"],
  },
  {
    value: "kanto",
    label: "関東",
    keywords: ["茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川", "伊豆"],
  },
  {
    value: "chubu",
    label: "中部",
    keywords: ["新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知"],
  },
  {
    value: "kinki",
    label: "近畿",
    keywords: ["三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"],
  },
  {
    value: "chugoku",
    label: "中国",
    keywords: ["鳥取", "島根", "岡山", "広島", "山口"],
  },
  {
    value: "shikoku",
    label: "四国",
    keywords: ["徳島", "香川", "愛媛", "高知"],
  },
  {
    value: "kyushu",
    label: "九州・沖縄",
    keywords: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄", "奄美"],
  },
];

// JARTIC登録後に実データへ切り替える想定の主要路線(MVPはモック表示)
export const EXPRESSWAYS: GenreOption[] = [
  { value: "tomei", label: "東名高速道路" },
  { value: "shin-tomei", label: "新東名高速道路" },
  { value: "tohoku", label: "東北自動車道" },
  { value: "joban", label: "常磐自動車道" },
  { value: "higashikanto", label: "東関東自動車道" },
  { value: "chuo", label: "中央自動車道" },
  { value: "kanetsu", label: "関越自動車道" },
  { value: "meishin", label: "名神高速道路" },
  { value: "shin-meishin", label: "新名神高速道路" },
  { value: "shutoko", label: "首都高速道路" },
];

export const GENRES: GenreConfig[] = [
  {
    id: "weather",
    label: "天気",
    emoji: "☀️",
    description: "気象庁の発表する都道府県別の天気予報",
    inputLabel: "都道府県を選択",
    options: WEATHER_AREAS,
    defaultValue: "140000", // 神奈川県
  },
  {
    id: "quake",
    label: "地震・災害",
    emoji: "🌏",
    description: "P2P地震情報による地震観測情報",
    inputLabel: "地方を選択",
    options: QUAKE_REGIONS.map(({ value, label }) => ({ value, label })),
  },
  {
    id: "train",
    label: "電車遅延",
    emoji: "🚃",
    description: "遅延・運休などの情報が出ている路線",
    inputLabel: "",
    options: [{ value: "all", label: "全路線" }],
    autoLoad: true,
    areas: ["首都圏", "北関東・甲信越", "東北"],
    defaultArea: "首都圏",
    emptyMessage: "現在、運行情報が出ている路線はありません。",
    footnote:
      "ここに表示されていない路線は、現在運行情報が出ていません(平常運転)。対象はJR東日本・東京メトロ・都営地下鉄・東急・京王・西武・東武です。小田急線・京成線は、データ提供元(ODPT)に運行情報がないため対象外です。初期表示は首都圏に絞っています(エリアはJR東日本の路線の区分で、私鉄・地下鉄はすべて首都圏に含めています)。",
  },
  {
    id: "traffic",
    label: "渋滞情報",
    emoji: "🚗",
    description: "主要高速道路の交通量・混雑状況",
    inputLabel: "路線を選択",
    options: EXPRESSWAYS,
    needsRegistration: {
      serviceName: "JARTIC(日本道路交通情報センター)オープンデータ",
      url: "https://www.jartic-open-traffic.org/",
    },
  },
];

export function getGenreConfig(id: string): GenreConfig | undefined {
  return GENRES.find((g) => g.id === id);
}
