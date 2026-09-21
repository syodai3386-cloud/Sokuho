import { withCache } from "../cache";
import { TRAIN_LINES } from "../genres";
import type { GenreResult, NormalizedItem, Severity } from "../types";

type OdptTrainInformation = {
  "dc:date": string;
  "odpt:railway"?: string;
  "odpt:trainInformationText"?: { ja?: string };
  "odpt:trainInformationStatus"?: { ja?: string };
  "odpt:trainInformationCause"?: { ja?: string };
};

// standard: 通常のアクセストークン(ODPT_CONSUMER_KEY)で api.odpt.org から取得
// challenge: 「公共交通オープンデータチャレンジ」限定データ。チャレンジにエントリーして得た
//            トークン(ODPT_CHALLENGE_KEY)で api-challenge.odpt.org から取得
type Tier = "standard" | "challenge";

type Operator = {
  id: string;
  name: string;
  tier: Tier;
  // 認証なしで叩ける公開エンドポイントがある事業者のみ true
  hasPublicEndpoint: boolean;
};

const TOKYO_METRO: Operator = { id: "odpt.Operator:TokyoMetro", name: "東京メトロ", tier: "standard", hasPublicEndpoint: false };
const TOEI: Operator = { id: "odpt.Operator:Toei", name: "都営地下鉄", tier: "standard", hasPublicEndpoint: true };
const JR_EAST: Operator = { id: "odpt.Operator:jre-is", name: "JR東日本", tier: "challenge", hasPublicEndpoint: false };
const TOKYU: Operator = { id: "odpt.Operator:Tokyu", name: "東急電鉄", tier: "challenge", hasPublicEndpoint: false };
const KEIO: Operator = { id: "odpt.Operator:Keio", name: "京王電鉄", tier: "challenge", hasPublicEndpoint: false };
const SEIBU: Operator = { id: "odpt.Operator:Seibu", name: "西武鉄道", tier: "challenge", hasPublicEndpoint: false };
const TOBU: Operator = { id: "odpt.Operator:Tobu", name: "東武鉄道", tier: "challenge", hasPublicEndpoint: false };

// キーは genres.ts の TRAIN_LINES の value。railwayIds は odpt:railway と照合する候補ID。
// ここに載せていない路線(小田急・京成)はODPTに運行情報の提供がないためサンプル表示。
// railwayIds は実レスポンスで検証済み。照合できない場合は「路線IDの設定要確認」エラーになる。
const ODPT_RAILWAYS: Record<string, { operator: Operator; railwayIds: string[] }> = {
  marunouchi: { operator: TOKYO_METRO, railwayIds: ["odpt.Railway:TokyoMetro.Marunouchi"] },
  ginza: { operator: TOKYO_METRO, railwayIds: ["odpt.Railway:TokyoMetro.Ginza"] },
  hibiya: { operator: TOKYO_METRO, railwayIds: ["odpt.Railway:TokyoMetro.Hibiya"] },
  tozai: { operator: TOKYO_METRO, railwayIds: ["odpt.Railway:TokyoMetro.Tozai"] },
  chiyoda: { operator: TOKYO_METRO, railwayIds: ["odpt.Railway:TokyoMetro.Chiyoda"] },
  "toei-asakusa": { operator: TOEI, railwayIds: ["odpt.Railway:Toei.Asakusa"] },
  "toei-oedo": { operator: TOEI, railwayIds: ["odpt.Railway:Toei.Oedo"] },

  yamanote: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.Yamanote"] },
  chuo: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.ChuoRapid", "odpt.Railway:JR-East.Chuo"] },
  keihintohoku: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.KeihinTohokuNegishi", "odpt.Railway:JR-East.KeihinTohoku"] },
  tokaido: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.Tokaido"] },
  sobu: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.SobuRapid", "odpt.Railway:JR-East.Sobu"] },
  saikyo: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.SaikyoKawagoe"] },
  joban: { operator: JR_EAST, railwayIds: ["odpt.Railway:JR-East.JobanRapid", "odpt.Railway:JR-East.Joban"] },

  denentoshi: { operator: TOKYU, railwayIds: ["odpt.Railway:Tokyu.DenEnToshi"] },
  keio: { operator: KEIO, railwayIds: ["odpt.Railway:Keio.Keio"] },
  "seibu-ikebukuro": { operator: SEIBU, railwayIds: ["odpt.Railway:Seibu.Ikebukuro"] },
  "tobu-tojo": { operator: TOBU, railwayIds: ["odpt.Railway:Tobu.Tojo"] },
};

const KEY_ENV: Record<Tier, string> = {
  standard: "ODPT_CONSUMER_KEY",
  challenge: "ODPT_CHALLENGE_KEY",
};

const TTL_MS = 60_000;
const SOURCE_URL = "https://developer.odpt.org/";

function getKey(tier: Tier): string | undefined {
  return process.env[KEY_ENV[tier]]?.trim() || undefined;
}

function buildUrl(operator: Operator, key: string | undefined): string | null {
  const query = `odpt:operator=${encodeURIComponent(operator.id)}`;
  const host = operator.tier === "challenge" ? "api-challenge.odpt.org" : "api.odpt.org";
  if (key) {
    return `https://${host}/api/v4/odpt:TrainInformation?${query}&acl:consumerKey=${encodeURIComponent(key)}`;
  }
  if (operator.hasPublicEndpoint) {
    return `https://api-public.odpt.org/api/v4/odpt:TrainInformation?${query}`;
  }
  return null;
}

const SEVERE = /見合わせ|運休|運転中止/;

function severityOf(status: string | undefined, text: string): Severity {
  const s = status ?? "";
  if (SEVERE.test(s)) return "critical";
  // 「お知らせ」は台風などの事前注意喚起が多く、実際の運休とは限らない
  if (s === "お知らせ") return /遅れ|遅延|運休|見合わせ/.test(text) ? "warning" : "info";
  const confirmedSevere = SEVERE.test(text) && !/場合があります|可能性/.test(text);
  if (confirmedSevere) return "critical";
  return s ? "warning" : "info";
}

function mockResult(lineValue: string, lineLabel: string, notice: string): GenreResult {
  const item: NormalizedItem = {
    id: `train:mock:${lineValue}`,
    genre: "train",
    title: `[サンプル] ${lineLabel} は平常運転です`,
    body: "この路線の運行情報は取得していないため、サンプルデータを表示しています。",
    timestamp: new Date().toISOString(),
    sourceName: "サンプルデータ",
    sourceUrl: SOURCE_URL,
  };
  return { ok: true, items: [item], isMock: true, notice };
}

export async function fetchTrain(lineValue: string): Promise<GenreResult> {
  const line = TRAIN_LINES.find((l) => l.value === lineValue);
  const lineLabel = line?.label ?? lineValue;

  const target = ODPT_RAILWAYS[lineValue];
  if (!target) {
    return mockResult(
      lineValue,
      lineLabel,
      "この路線の運行情報はODPT(公共交通オープンデータセンター)で提供されていないため、サンプルデータを表示しています。",
    );
  }

  const { operator } = target;
  const key = getKey(operator.tier);
  const url = buildUrl(operator, key);
  if (!url) {
    return mockResult(
      lineValue,
      lineLabel,
      operator.tier === "challenge"
        ? `${operator.name}の運行情報は「公共交通オープンデータチャレンジ」限定データです。チャレンジにエントリーして得たトークンを環境変数 ${KEY_ENV.challenge} に設定すると表示されます(詳細はREADME参照)。`
        : `ODPTのアクセストークン(環境変数 ${KEY_ENV.standard})が未設定のため、サンプルデータを表示しています。`,
    );
  }

  try {
    const data = await withCache(`train:${operator.id}:${key ? "auth" : "public"}`, TTL_MS, async () => {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (res.status === 401 || res.status === 403) {
        throw new Error(`ODPTのアクセストークンが無効、またはこのデータの利用権限がありません。${KEY_ENV[operator.tier]} を確認してください`);
      }
      if (!res.ok) {
        throw new Error(`ODPT APIが ${res.status} を返しました`);
      }
      return (await res.json()) as OdptTrainInformation[];
    });

    let matched = data.filter((info) => {
      const railway = info["odpt:railway"];
      return railway != null && target.railwayIds.includes(railway);
    });

    // 西武のように路線別ではなく事業者全体の1件だけを返す事業者は、その全線情報で代用する
    const operatorWide = matched.length === 0 && data.every((info) => info["odpt:railway"] == null);
    if (operatorWide) matched = data;

    if (matched.length === 0) {
      throw new Error(
        `ODPTの応答に${lineLabel}の情報が見つかりませんでした(路線IDの設定を確認してください: ${target.railwayIds.join(", ")})`,
      );
    }

    const items: NormalizedItem[] = matched.map((info) => {
      const status = info["odpt:trainInformationStatus"]?.ja;
      const cause = info["odpt:trainInformationCause"]?.ja;
      const text = info["odpt:trainInformationText"]?.ja ?? "詳細情報なし";
      return {
        id: `train:${info["odpt:railway"]}`,
        genre: "train",
        title: status ? `${lineLabel}: ${status}` : lineLabel,
        body: `${operatorWide ? `${operator.name}全線の情報: ` : ""}${cause ? `${text}(原因: ${cause})` : text}`,
        timestamp: info["dc:date"],
        severity: severityOf(status, text),
        sourceName: `${operator.name}(公共交通オープンデータセンター)`,
        sourceUrl: SOURCE_URL,
      };
    });

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: err instanceof Error ? err.message : "運行情報の取得に失敗しました",
    };
  }
}
