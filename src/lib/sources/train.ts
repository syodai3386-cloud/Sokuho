import { withCache } from "../cache";
import type { GenreResult, NormalizedItem, Severity } from "../types";

type OdptTrainInformation = {
  "dc:date": string;
  "odpt:railway"?: string;
  "odpt:trainInformationText"?: { ja?: string };
  "odpt:trainInformationStatus"?: { ja?: string };
  "odpt:trainInformationCause"?: { ja?: string };
};

type OdptRailway = {
  "owl:sameAs": string;
  "odpt:railwayTitle"?: { ja?: string };
};

// standard: 通常のアクセストークン(ODPT_CONSUMER_KEY)で api.odpt.org から取得
// challenge: 「公共交通オープンデータチャレンジ」限定データ。チャレンジにエントリーして得た
//            トークン(ODPT_CHALLENGE_KEY)で api-challenge.odpt.org から取得
type Tier = "standard" | "challenge";

type Operator = {
  id: string;
  // 絞り込み用の表示名
  name: string;
  // 路線名の前に付ける名前(路線名がすでにこれで始まる場合は付けない)
  linePrefix: string;
  tier: Tier;
  // 認証なしで叩ける公開エンドポイントがある事業者のみ true
  hasPublicEndpoint: boolean;
  // 路線マスタ(odpt:Railway)が取れない事業者は自前の対応表で路線名を補う
  useBuiltInNames?: boolean;
};

// 表示順もこの並びに従う
const OPERATORS: Operator[] = [
  { id: "odpt.Operator:jre-is", name: "JR東日本", linePrefix: "JR", tier: "challenge", hasPublicEndpoint: false, useBuiltInNames: true },
  { id: "odpt.Operator:TokyoMetro", name: "東京メトロ", linePrefix: "東京メトロ", tier: "standard", hasPublicEndpoint: false },
  { id: "odpt.Operator:Toei", name: "都営地下鉄", linePrefix: "都営", tier: "standard", hasPublicEndpoint: true },
  { id: "odpt.Operator:Tokyu", name: "東急", linePrefix: "東急", tier: "challenge", hasPublicEndpoint: false },
  { id: "odpt.Operator:Keio", name: "京王", linePrefix: "京王", tier: "challenge", hasPublicEndpoint: false },
  { id: "odpt.Operator:Seibu", name: "西武", linePrefix: "西武", tier: "challenge", hasPublicEndpoint: false },
  { id: "odpt.Operator:Tobu", name: "東武", linePrefix: "東武", tier: "challenge", hasPublicEndpoint: false },
];

// JR東日本(jre-is)は odpt:Railway が取れないため、運行情報の路線ID(odpt.Railway:JR-East.xxx の xxx)に対応する路線名
const JR_EAST_NAMES: Record<string, string> = {
  Hachinohe: "八戸線", Kashima: "鹿島線", Narita: "成田線", NaritaAbikoBranch: "成田線(我孫子支線)",
  NaritaAirportBranch: "成田線(空港支線)", Sobu: "総武本線", SobuRapid: "総武線快速", ChuoSobuLocal: "中央・総武線各駅停車",
  Sotobo: "外房線", Uchibo: "内房線", Keiyo: "京葉線", Ito: "伊東線", Musashino: "武蔵野線", Togane: "東金線",
  Suigun: "水郡線", SuigunBranch: "水郡線(支線)", Joban: "常磐線", JobanRapid: "常磐線快速", JobanLocal: "常磐線各駅停車",
  Yokosuka: "横須賀線", Koumi: "小海線", Gono: "五能線", Mito: "水戸線", Hachiko: "八高線", Agatsuma: "吾妻線",
  BanetsuWest: "磐越西線", BanetsuEast: "磐越東線", SensekiTohoku: "仙石東北ライン", Shinetsu: "信越本線",
  Joetsu: "上越線", Ryomo: "両毛線", Hakushin: "白新線", Kururi: "久留里線", Utsunomiya: "宇都宮線",
  Karasuyama: "烏山線", Ome: "青梅線", Yokohama: "横浜線", Yamanote: "山手線", Yahiko: "弥彦線", Nikko: "日光線",
  Nambu: "南武線", NambuBranch: "南武線(支線)", Tokaido: "東海道線", Tsurumi: "鶴見線",
  TsurumiUmiShibauraBranch: "鶴見線(海芝浦支線)", TsurumiOkawaBranch: "鶴見線(大川支線)", Shinonoi: "篠ノ井線",
  Chuo: "中央本線", ChuoRapid: "中央線快速", ChuoTatsunoBranch: "中央本線(辰野支線)", Takasaki: "高崎線",
  SotetsuDirect: "相鉄直通線", Iiyama: "飯山線", ShonanShinjuku: "湘南新宿ライン", Sagami: "相模線",
  SaikyoKawagoe: "埼京線・川越線", KeihinTohokuNegishi: "京浜東北線・根岸線", Kawagoe: "川越線",
  Itsukaichi: "五日市線", Yamada: "山田線", Kitakami: "北上線", Kamaishi: "釜石線", Ofunato: "大船渡線",
  Tohoku: "東北本線", Hanawa: "花輪線", Tsugaru: "津軽線", Uetsu: "羽越本線", Ou: "奥羽本線",
  OuYamagata: "奥羽本線(山形線)", Oga: "男鹿線", Tadami: "只見線", Yonesaka: "米坂線", Aterazawa: "左沢線",
  Kesennuma: "気仙沼線", Ishinomaki: "石巻線", RikuEast: "陸羽東線", RikuWest: "陸羽西線", Oito: "大糸線",
  Echigo: "越後線", Senseki: "仙石線", Senzan: "仙山線", Ominato: "大湊線", Tazawako: "田沢湖線",
  HokurikuShinkansen: "北陸新幹線", JoetsuShinkansen: "上越新幹線", TohokuShinkansen: "東北新幹線",
  YamagataShinkansen: "山形新幹線", AkitaShinkansen: "秋田新幹線",
};

// エリア名は genres.ts の train.areas と一致させる。
// 「首都圏」は一般的な狭義の意味の1都3県(東京都・神奈川県・埼玉県・千葉県)。法律上の首都圏(1都7県)は
// 茨城・栃木・群馬・山梨を含むが、ここでは含めない。路線は「主な区間が1都3県内にあるか」で分類する。
// 地下鉄・東急・京王・西武は全路線が1都3県内。JR東日本と東武は下の表で分ける。
const AREA_METRO = "首都圏";
const AREA_KITAKANTO_KOSHINETSU = "北関東・甲信越";
const AREA_TOHOKU = "東北";
const AREA_OTHER = "その他";

const JR_EAST_METRO_LINES = new Set([
  "Yamanote", "ChuoRapid", "ChuoSobuLocal", "Tokaido", "Yokosuka", "ShonanShinjuku", "Utsunomiya",
  "Takasaki", "Joban", "JobanRapid", "JobanLocal", "Sobu", "SobuRapid", "Keiyo", "Musashino", "Nambu",
  "NambuBranch", "Yokohama", "Tsurumi", "TsurumiUmiShibauraBranch", "TsurumiOkawaBranch", "Sagami", "Ome",
  "Itsukaichi", "Hachiko", "Kawagoe", "SaikyoKawagoe", "KeihinTohokuNegishi", "SotetsuDirect", "Sotobo",
  "Uchibo", "Narita", "NaritaAbikoBranch", "NaritaAirportBranch", "Togane", "Kururi",
]);

const JR_EAST_KITAKANTO_KOSHINETSU_LINES = new Set([
  "Kashima", "Chuo", "Mito", "Suigun", "SuigunBranch", "Ryomo", "Agatsuma", "Joetsu", "Nikko", "Karasuyama",
  "Koumi", "Shinonoi", "Iiyama", "Oito", "Shinetsu", "Echigo", "Hakushin", "Yahiko", "JoetsuShinkansen",
  "HokurikuShinkansen", "ChuoTatsunoBranch",
]);

// 静岡県内(伊東線)
const JR_EAST_OTHER_LINES = new Set(["Ito"]);

// 東武のうち、主な区間が栃木・群馬にある路線
const TOBU_OUTSIDE_METRO_LINES = new Set([
  "Kinugawa", "Isesaki", "Kiryu", "Koizumi", "KoizumiBranch", "Nikko", "Sano", "Utsunomiya",
]);

// 路線IDの末尾(odpt.Railway:JR-East.Yamanote の Yamanote)からエリアを決める。
// JR東日本の表にない新しい路線は東北扱い(初期表示の首都圏を汚さないため)
function areaOf(operator: Operator, suffix: string): string {
  if (operator.useBuiltInNames) {
    if (JR_EAST_METRO_LINES.has(suffix)) return AREA_METRO;
    if (JR_EAST_KITAKANTO_KOSHINETSU_LINES.has(suffix)) return AREA_KITAKANTO_KOSHINETSU;
    if (JR_EAST_OTHER_LINES.has(suffix)) return AREA_OTHER;
    return AREA_TOHOKU;
  }
  if (operator.id === "odpt.Operator:Tobu" && TOBU_OUTSIDE_METRO_LINES.has(suffix)) {
    return AREA_KITAKANTO_KOSHINETSU;
  }
  return AREA_METRO;
}
const KEY_ENV: Record<Tier, string> = {
  standard: "ODPT_CONSUMER_KEY",
  challenge: "ODPT_CHALLENGE_KEY",
};

const INFO_TTL_MS = 60_000;
const RAILWAY_TTL_MS = 6 * 60 * 60_000;
const SOURCE_URL = "https://developer.odpt.org/";
const MERGE_THRESHOLD = 4;
const SEVERE = /見合わせ|運休|運転中止/;
// 遅れ・運休などの支障を表す語
const TROUBLE = /遅れ|遅延|乱れ|見合わせ|運休|運転中止/;
// 「〜する場合があります」のように、今後の可能性・予定・予報を述べているだけの文
const PRECAUTION = /場合があります|場合がございます|可能性|おそれ|恐れ|予定|見込み|予報/;
// 「15分以上の遅延はありません」のように、支障がないことを述べる文
const NEGATION = /ありません|ございません/;
// 運行情報の状態欄が、実際に支障が出ていることを示すもの(「お知らせ」「運行情報あり」は含めない)
const ACTUAL_STATUS = /遅延|見合わせ|運休|運転中止|ダイヤ乱れ/;

function getKey(tier: Tier): string | undefined {
  return process.env[KEY_ENV[tier]]?.trim() || undefined;
}

function buildUrl(operator: Operator, resource: string, key: string | undefined): string | null {
  const query = `odpt:operator=${encodeURIComponent(operator.id)}`;
  const host = operator.tier === "challenge" ? "api-challenge.odpt.org" : "api.odpt.org";
  if (key) {
    return `https://${host}/api/v4/${resource}?${query}&acl:consumerKey=${encodeURIComponent(key)}`;
  }
  if (operator.hasPublicEndpoint) {
    return `https://api-public.odpt.org/api/v4/${resource}?${query}`;
  }
  return null;
}

async function fetchOdpt<T>(url: string, tier: Tier): Promise<T[]> {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`アクセストークンが無効、またはこのデータの利用権限がありません(${KEY_ENV[tier]} を確認してください)`);
  }
  if (!res.ok) {
    throw new Error(`ODPT APIが ${res.status} を返しました`);
  }
  return (await res.json()) as T[];
}

function toAscii(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function jstNow() {
  const d = new Date(Date.now() + 9 * 3_600_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

// 「10月13日から運休となります」「19時50分頃から運休します」のように、現在ではなく
// 別の日・これからの時刻の出来事を述べている文か(工事による運休予定、これから始まる運転見合わせなど)
function isNotNow(sentence: string): boolean {
  const s = toAscii(sentence);
  const now = jstNow();
  if (/明日|明後日|翌日|あす/.test(s)) return true;
  for (const m of s.matchAll(/(\d{4})年/g)) {
    if (Number(m[1]) !== now.year) return true;
  }
  for (const m of s.matchAll(/(\d{1,2})月(\d{1,2})日/g)) {
    if (Number(m[1]) !== now.month || Number(m[2]) !== now.day) return true;
  }
  // 月が付かない「22日」など
  for (const m of s.matchAll(/(?<![月\d])(\d{1,2})日/g)) {
    if (Number(m[1]) !== now.day) return true;
  }
  for (const m of s.matchAll(/(\d{1,2})時(?:(\d{1,2})分)?頃?(?:から|以降)/g)) {
    if (Number(m[1]) * 60 + Number(m[2] ?? 0) > now.minutes) return true;
  }
  return false;
}

// 現時点で実際に遅れ・運休などが発生しているかと、その重大度を返す。
// 台風接近時の「お知らせ」や「〜する場合があります」のような事前の注意喚起は対象外。
function assessTrouble(
  status: string | undefined,
  text: string,
): { actual: boolean; severity: Severity; label?: string } {
  const s = status ?? "";
  const sentences = text
    .split(/[。\n]/)
    .map((x) => x.trim())
    .filter((x) => x && TROUBLE.test(x) && !PRECAUTION.test(x) && !NEGATION.test(x) && !isNotNow(x));
  const actual = ACTUAL_STATUS.test(s) || sentences.length > 0;
  const critical = SEVERE.test(s) || sentences.some((x) => SEVERE.test(x));
  // 状態欄が「運行情報あり」のように中身を表さない場合は、文面の内容から表題を作る
  const joined = sentences.join("。");
  const label = ACTUAL_STATUS.test(s)
    ? s
    : /見合わせ/.test(joined)
      ? "運転見合わせ"
      : /運休|運転中止/.test(joined)
        ? "運休"
        : /遅れ|遅延/.test(joined)
          ? "遅れ"
          : /乱れ/.test(joined)
            ? "ダイヤ乱れ"
            : undefined;
  return { actual, severity: critical ? "critical" : "warning", label };
}
// 一部の路線は同じ文が2回連結されて届く(東武など)ので、1回分にする
function dedupeRepeatedText(text: string): string {
  const t = text.trim();
  return t.match(/^([\s\S]{20,}?)\s+\1$/)?.[1] ?? t;
}

function railwaySuffix(railwayId: string): string {
  return railwayId.split(".").pop() ?? railwayId;
}

function resolveLineName(
  operator: Operator,
  railwayId: string,
  masterNames: Record<string, string>,
  text: string,
): string {
  const name =
    masterNames[railwayId] ??
    (operator.useBuiltInNames ? JR_EAST_NAMES[railwaySuffix(railwayId)] : undefined) ??
    text.match(/^([^、。]{2,20}?)は、/)?.[1] ??
    railwaySuffix(railwayId);
  return name.startsWith(operator.linePrefix) ? name : `${operator.linePrefix}${name}`;
}

async function fetchOperator(operator: Operator, key: string | undefined, url: string): Promise<NormalizedItem[]> {
  const authMode = key ? "auth" : "public";

  const infos = await withCache(`train:info:${operator.id}:${authMode}`, INFO_TTL_MS, () =>
    fetchOdpt<OdptTrainInformation>(url, operator.tier),
  );

  let masterNames: Record<string, string> = {};
  if (!operator.useBuiltInNames) {
    const railwayUrl = buildUrl(operator, "odpt:Railway", key);
    if (railwayUrl) {
      try {
        const railways = await withCache(`train:railway:${operator.id}:${authMode}`, RAILWAY_TTL_MS, () =>
          fetchOdpt<OdptRailway>(railwayUrl, operator.tier),
        );
        masterNames = Object.fromEntries(
          railways.flatMap((r) => {
            const title = r["odpt:railwayTitle"]?.ja;
            return title ? [[r["owl:sameAs"], title]] : [];
          }),
        );
      } catch {
        // 路線名が取れなくても運行情報自体は表示できる(文面の先頭から路線名を推定する)
      }
    }
  }

  type Entry = {
    railwayId?: string;
    lineTitle: string;
    area: string;
    label?: string;
    severity: Severity;
    text: string;
    cause?: string;
    date: string;
  };
  const entries: Entry[] = [];
  for (const info of infos) {
    const status = info["odpt:trainInformationStatus"]?.ja?.trim() || undefined;
    const text = dedupeRepeatedText(info["odpt:trainInformationText"]?.ja ?? "詳細情報なし");
    const trouble = assessTrouble(status, text);
    if (!trouble.actual) continue;

    const railwayId = info["odpt:railway"];
    entries.push({
      railwayId,
      lineTitle: railwayId ? resolveLineName(operator, railwayId, masterNames, text) : `${operator.name}全線`,
      area: railwayId ? areaOf(operator, railwaySuffix(railwayId)) : AREA_METRO,
      label: trouble.label,
      severity: trouble.severity,
      text,
      cause: info["odpt:trainInformationCause"]?.ja,
      date: info["dc:date"],
    });
  }

  const base = {
    genre: "train" as const,
    category: operator.name,
    sourceName: `${operator.name}(公共交通オープンデータセンター)`,
    sourceUrl: SOURCE_URL,
  };
  const bodyOf = (e: Entry) => (e.cause ? `${e.text}(原因: ${e.cause})` : e.text);

  // 東武のように、多数の路線に全く同じ文面(全線向けの注意喚起)が出ている場合は1件にまとめる
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${e.area}|${e.label ?? ""}|${e.text}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const items: NormalizedItem[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    if (group.length >= MERGE_THRESHOLD) {
      items.push({
        ...base,
        id: `train:${operator.id}:${first.area}:${first.label ?? ""}:${first.text}`,
        area: first.area,
        title: `${operator.name} ${group.length}路線${first.label ? `: ${first.label}` : ""}`,
        body: `${bodyOf(first)}(対象: ${group
          .map((e) => (e.lineTitle.startsWith(operator.linePrefix) ? e.lineTitle.slice(operator.linePrefix.length) : e.lineTitle))
          .join("、")})`,
        timestamp: group.reduce((latest, e) => (e.date > latest ? e.date : latest), first.date),
        severity: first.severity,
      });
      continue;
    }
    for (const e of group) {
      items.push({
        ...base,
        id: `train:${e.railwayId ?? operator.id}`,
        area: e.area,
        title: e.label ? `${e.lineTitle}: ${e.label}` : e.lineTitle,
        body: bodyOf(e),
        timestamp: e.date,
        severity: e.severity,
      });
    }
  }
  return items;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export async function fetchTrain(): Promise<GenreResult> {
  const warnings: string[] = [];
  const skippedByEnv = new Map<string, string[]>();

  const targets: { operator: Operator; key: string | undefined; url: string }[] = [];
  for (const operator of OPERATORS) {
    const key = getKey(operator.tier);
    const url = buildUrl(operator, "odpt:TrainInformation", key);
    if (!url) {
      const env = KEY_ENV[operator.tier];
      skippedByEnv.set(env, [...(skippedByEnv.get(env) ?? []), operator.name]);
      continue;
    }
    targets.push({ operator, key, url });
  }
  for (const [env, names] of skippedByEnv) {
    warnings.push(`${names.join("・")}の運行情報は、環境変数 ${env} が未設定のため表示していません(詳細はREADME参照)。`);
  }

  if (targets.length === 0) {
    return { ok: false, items: [], warnings, error: "ODPTのアクセストークンが設定されていません" };
  }

  const settled = await Promise.allSettled(targets.map((t) => fetchOperator(t.operator, t.key, t.url)));

  const items: NormalizedItem[] = [];
  const failures: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : "取得に失敗しました";
      failures.push(`${targets[i].operator.name}の運行情報を取得できませんでした: ${reason}`);
    }
  });

  if (failures.length === targets.length) {
    return { ok: false, items: [], warnings, error: failures.join(" / ") };
  }
  warnings.push(...failures);

  const operatorIndex = (item: NormalizedItem) => OPERATORS.findIndex((o) => o.name === item.category);
  items.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity ?? "info"] - SEVERITY_ORDER[b.severity ?? "info"] ||
      operatorIndex(a) - operatorIndex(b),
  );

  return { ok: true, items, warnings };
}
