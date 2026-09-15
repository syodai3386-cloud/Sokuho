import { withCache } from "../cache";
import { QUAKE_REGIONS } from "../genres";
import type { GenreResult, NormalizedItem, Severity } from "../types";

type P2pQuakeItem = {
  id: string;
  code: number;
  earthquake?: {
    time: string;
    hypocenter?: {
      name: string;
      depth: number;
      magnitude: number;
    };
    maxScale: number;
    domesticTsunami?: string;
  };
};

const TTL_MS = 30_000;

const SCALE_LABELS: Record<number, string> = {
  [-1]: "不明",
  0: "0",
  10: "1",
  20: "2",
  30: "3",
  40: "4",
  45: "5弱",
  50: "5強",
  55: "6弱",
  60: "6強",
  70: "7",
};

function toIsoTimestamp(jmaTime: string): string {
  // "2026/09/15 08:59:00" -> ISO (JST)
  const match = jmaTime.match(
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

function severityFromScale(scale: number): Severity {
  if (scale >= 50) return "critical";
  if (scale >= 30) return "warning";
  return "info";
}

export async function fetchQuake(regionValue: string): Promise<GenreResult> {
  try {
    const data = await withCache("quake:all", TTL_MS, async () => {
      const res = await fetch(
        "https://api.p2pquake.net/v2/history?codes=551&limit=30",
        { next: { revalidate: 30 } }
      );
      if (!res.ok) {
        throw new Error(`P2P地震情報API returned ${res.status}`);
      }
      return (await res.json()) as P2pQuakeItem[];
    });

    const region = QUAKE_REGIONS.find((r) => r.value === regionValue);
    const keywords = region?.keywords ?? [];

    const filtered = data.filter((item) => {
      if (!item.earthquake?.hypocenter?.name) return false;
      if (keywords.length === 0) return true;
      return keywords.some((kw) => item.earthquake!.hypocenter!.name.includes(kw));
    });

    const items: NormalizedItem[] = filtered.map((item) => {
      const eq = item.earthquake!;
      const scale = eq.maxScale;
      const scaleLabel = SCALE_LABELS[scale] ?? "不明";
      const magnitude = eq.hypocenter?.magnitude;
      const depth = eq.hypocenter?.depth;

      const bodyParts = [
        magnitude != null && magnitude >= 0 ? `M${magnitude}` : null,
        depth != null && depth >= 0 ? `深さ${depth}km` : depth === 0 ? "ごく浅い" : null,
        eq.domesticTsunami && eq.domesticTsunami !== "None"
          ? `津波: ${eq.domesticTsunami}`
          : null,
      ].filter(Boolean);

      return {
        id: `quake:${item.id}`,
        genre: "quake",
        title: `最大震度${scaleLabel} ${eq.hypocenter?.name ?? "震源不明"}`,
        body: bodyParts.join(" / ") || "詳細情報なし",
        timestamp: toIsoTimestamp(eq.time),
        severity: severityFromScale(scale),
        sourceName: "P2P地震情報",
        sourceUrl: "https://www.p2pquake.net/",
      };
    });

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: err instanceof Error ? err.message : "地震情報の取得に失敗しました",
    };
  }
}
