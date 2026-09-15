import { TRAIN_LINES } from "../genres";
import type { GenreResult, NormalizedItem } from "../types";

// TODO: ODPTの開発者登録(https://developer-dc.odpt.org/)でアクセストークンを取得したら、
// https://api.odpt.org/api/v4/odpt:TrainInformation?odpt:railway=...&acl:consumerKey=... を
// 叩いて置き換える。レスポンスの odpt:railwayTitle / odpt:text / dc:date を
// NormalizedItem に正規化する想定。
export async function fetchTrain(lineValue: string): Promise<GenreResult> {
  const line = TRAIN_LINES.find((l) => l.value === lineValue);
  const lineLabel = line?.label ?? lineValue;

  const item: NormalizedItem = {
    id: `train:mock:${lineValue}`,
    genre: "train",
    title: `[サンプル] ${lineLabel} は平常運転です`,
    body: "ODPT(公共交通オープンデータセンター)のアクセストークンが未設定のため、サンプルデータを表示しています。",
    timestamp: new Date().toISOString(),
    sourceName: "サンプルデータ",
    sourceUrl: "https://developer-dc.odpt.org/",
  };

  return { ok: true, items: [item], isMock: true };
}
