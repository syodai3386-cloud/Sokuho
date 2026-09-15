import { EXPRESSWAYS } from "../genres";
import type { GenreResult, NormalizedItem } from "../types";

// TODO: JARTICオープンデータ(https://www.jartic-open-traffic.org/)で利用申請・
// APIキー取得後、交通量APIを叩いて置き換える。取得できるのは「交通量(台数)」であり
// 「渋滞度」そのものではないため、しきい値を決めて簡易的な混雑度判定を行う想定。
export async function fetchTraffic(roadValue: string): Promise<GenreResult> {
  const road = EXPRESSWAYS.find((r) => r.value === roadValue);
  const roadLabel = road?.label ?? roadValue;

  const item: NormalizedItem = {
    id: `traffic:mock:${roadValue}`,
    genre: "traffic",
    title: `[サンプル] ${roadLabel} は順調です`,
    body: "JARTICオープンデータのAPIキーが未設定のため、サンプルデータを表示しています。",
    timestamp: new Date().toISOString(),
    sourceName: "サンプルデータ",
    sourceUrl: "https://www.jartic-open-traffic.org/",
  };

  return { ok: true, items: [item], isMock: true };
}
