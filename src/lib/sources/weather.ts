import { withCache } from "../cache";
import type { GenreResult, NormalizedItem } from "../types";

type JmaTimeSeriesArea = {
  area: { name: string; code: string };
  weathers?: string[];
  pops?: string[];
};

type JmaTimeSeries = {
  timeDefines: string[];
  areas: JmaTimeSeriesArea[];
};

type JmaForecast = {
  publishingOffice: string;
  reportDatetime: string;
  timeSeries: JmaTimeSeries[];
};

const TTL_MS = 60_000;

export async function fetchWeather(areaCode: string): Promise<GenreResult> {
  try {
    const data = await withCache(`weather:${areaCode}`, TTL_MS, async () => {
      const res = await fetch(
        `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) {
        throw new Error(`JMA API returned ${res.status}`);
      }
      return (await res.json()) as JmaForecast[];
    });

    const shortTerm = data[0];
    const weatherSeries = shortTerm?.timeSeries?.[0];
    const popSeries = shortTerm?.timeSeries?.[1];

    if (!weatherSeries) {
      return { ok: false, items: [], error: "予報データの形式が想定と異なります" };
    }

    const items: NormalizedItem[] = weatherSeries.areas.map((area, idx) => {
      const todayWeather = area.weathers?.[0] ?? "情報なし";
      const tomorrowWeather = area.weathers?.[1];
      const pop = popSeries?.areas?.[idx]?.pops?.[0];

      const bodyParts = [`今日: ${todayWeather}`];
      if (tomorrowWeather) bodyParts.push(`明日: ${tomorrowWeather}`);
      if (pop && pop !== "") bodyParts.push(`降水確率: ${pop}%`);

      return {
        id: `weather:${areaCode}:${area.area.code}`,
        genre: "weather",
        title: area.area.name,
        body: bodyParts.join(" / "),
        timestamp: shortTerm.reportDatetime,
        sourceName: `気象庁(${shortTerm.publishingOffice})`,
        sourceUrl: "https://www.jma.go.jp/bosai/forecast/",
      };
    });

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error: err instanceof Error ? err.message : "天気情報の取得に失敗しました",
    };
  }
}
