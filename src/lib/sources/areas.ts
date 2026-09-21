import { withCache } from "../cache";

type AreaNode = { name: string; children?: string[] };

type AreaIndex = {
  offices: Record<string, AreaNode>;
  class10s: Record<string, AreaNode>;
  class15s: Record<string, AreaNode>;
  class20s: Record<string, AreaNode>;
};

export type Place = { code: string; name: string };

const DAY_MS = 24 * 60 * 60_000;
const FOREVER_MS = 365 * DAY_MS;

// 予報区コードの先頭2桁(都道府県コード)→ 都道府県名。位置検索で同名の市区町村を区別するために使う
const PREFECTURES: Record<string, string> = {
  "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県", "06": "山形県", "07": "福島県",
  "08": "茨城県", "09": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県",
  "15": "新潟県", "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県", "21": "岐阜県",
  "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県",
  "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
  "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県", "41": "佐賀県", "42": "長崎県",
  "43": "熊本県", "44": "大分県", "45": "宮崎県", "46": "鹿児島県", "47": "沖縄県",
};

export function prefectureName(areaCode: string): string | undefined {
  return PREFECTURES[areaCode.slice(0, 2)];
}

async function getAreaIndex(): Promise<AreaIndex> {
  return withCache("jma:area.json", DAY_MS, async () => {
    const res = await fetch("https://www.jma.go.jp/bosai/common/const/area.json", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`JMA area.json returned ${res.status}`);
    return (await res.json()) as AreaIndex;
  });
}

// 気象庁は「横浜市北部」「横浜市南部」のように1つの市を分けて載せていることがあるので、市としてまとめる
function baseCityName(name: string): string {
  return name.replace(/(市)(北部|南部|東部|西部|中部)$/, "$1");
}

// 予報区(都道府県相当)に含まれる市区町村の一覧
export async function listPlaces(areaCode: string): Promise<Place[]> {
  const idx = await getAreaIndex();
  const office = idx.offices[areaCode];
  if (!office) return [];

  const places: Place[] = [];
  const seen = new Set<string>();
  for (const c10 of office.children ?? []) {
    for (const c15 of idx.class10s[c10]?.children ?? []) {
      for (const c20 of idx.class15s[c15]?.children ?? []) {
        const node = idx.class20s[c20];
        if (!node) continue;
        const name = baseCityName(node.name);
        if (seen.has(name)) continue;
        seen.add(name);
        places.push({ code: c20, name });
      }
    }
  }
  return places;
}

export async function findPlace(areaCode: string, placeCode: string): Promise<Place | undefined> {
  return (await listPlaces(areaCode)).find((p) => p.code === placeCode);
}

type GsiFeature = {
  geometry: { coordinates: [number, number] };
  properties: { title: string };
};

// 国土地理院の住所検索で、市区町村の代表地点(緯度・経度)を取得する
export async function geocode(prefecture: string, cityName: string): Promise<{ lat: number; lon: number }> {
  const query = `${prefecture}${cityName}`;
  return withCache(`gsi:${query}`, FOREVER_MS, async () => {
    const res = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 86_400 } },
    );
    if (!res.ok) throw new Error(`位置検索が ${res.status} を返しました`);
    const features = (await res.json()) as GsiFeature[];
    const hit = features.find((f) => f.properties.title === query) ?? features[0];
    if (!hit) throw new Error(`${query}の位置を取得できませんでした`);
    const [lon, lat] = hit.geometry.coordinates;
    return { lat, lon };
  });
}
