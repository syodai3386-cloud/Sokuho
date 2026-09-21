import { withCache } from "../cache";
import type { GenreResult, NormalizedItem, WeatherDay } from "../types";

type JmaTimeSeriesArea = {
  area: { name: string; code: string };
  weatherCodes?: string[];
  weathers?: string[];
  pops?: string[];
  temps?: string[];
  tempsMin?: string[];
  tempsMax?: string[];
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
const RAIN_TTL_MS = 30 * 60_000;
const POP_SLOT_HOURS = 6;

// 降水量(予測)の取得地点。予報区(都道府県相当)ごとの代表として県庁所在地付近を使う
const AREA_COORDS: Record<string, [number, number]> = {
  "016000": [43.0642, 141.3469], "020000": [40.8244, 140.74], "030000": [39.7036, 141.1527],
  "040000": [38.2688, 140.8721], "050000": [39.7186, 140.1024], "060000": [38.2404, 140.3634],
  "070000": [37.75, 140.4678], "080000": [36.3418, 140.4468], "090000": [36.5657, 139.8836],
  "100000": [36.3895, 139.0634], "110000": [35.8569, 139.6489], "120000": [35.6047, 140.1233],
  "130000": [35.6895, 139.6917], "140000": [35.4478, 139.6425], "150000": [37.9026, 139.0236],
  "160000": [36.6953, 137.2113], "170000": [36.5613, 136.6562], "180000": [36.0652, 136.2216],
  "190000": [35.6642, 138.5684], "200000": [36.6513, 138.181], "210000": [35.4233, 136.7607],
  "220000": [34.9756, 138.3828], "230000": [35.1815, 136.9066], "240000": [34.7303, 136.5086],
  "250000": [35.0045, 135.8686], "260000": [35.0116, 135.7681], "270000": [34.6937, 135.5023],
  "280000": [34.6901, 135.1956], "290000": [34.6851, 135.805], "300000": [34.226, 135.1675],
  "310000": [35.5011, 134.2351], "320000": [35.4723, 133.0505], "330000": [34.6618, 133.9344],
  "340000": [34.3853, 132.4553], "350000": [34.1861, 131.4705], "360000": [34.0658, 134.5593],
  "370000": [34.3401, 134.0434], "380000": [33.8416, 132.7657], "390000": [33.5597, 133.5311],
  "400000": [33.5904, 130.4017], "410000": [33.2494, 130.2988], "420000": [32.7503, 129.8777],
  "430000": [32.7898, 130.7417], "440000": [33.2382, 131.6126], "450000": [31.9111, 131.4239],
  "460100": [31.5966, 130.5571], "471000": [26.2124, 127.6809],
};

// 気象庁の天気コード(3桁)を絵文字にする。1xx=晴れ系 / 2xx=くもり系 / 3xx=雨系 / 4xx=雪系
function weatherIcon(code: string, text: string): string {
  if (/雷/.test(text)) return "⛈️";
  const n = Number(code);
  if (!Number.isFinite(n)) return "❔";
  const family = Math.floor(n / 100);
  const rainy = /雨/.test(text);
  const snowy = /雪|あられ|ひょう/.test(text);

  if (family === 4 || (snowy && !rainy)) return "❄️";
  if (rainy && snowy) return "🌨️";
  if (family === 3) {
    // 雨が主体か、雨のち/時々晴れ・くもりか
    return /^雨/.test(text) && !/後　.*(晴|くもり)|時々　(晴|くもり)/.test(text) ? "🌧️" : "🌦️";
  }
  if (family === 1) return rainy ? "🌦️" : n === 100 ? "☀️" : "🌤️";
  if (family === 2) {
    if (rainy) return "🌦️";
    if (/霧/.test(text)) return "🌫️";
    return n === 200 ? "☁️" : "⛅";
  }
  return "❔";
}

// 気象庁の文面は単語の区切りに全角スペースが入っているので詰める
function cleanText(text: string | undefined): string {
  return (text ?? "情報なし").replace(/　/g, "");
}

function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

function hourOf(iso: string): number {
  return Number(iso.slice(11, 13));
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function dayDiff(date: string, today: string): number {
  const [y1, m1, d1] = date.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86_400_000);
}

function dayLabel(diff: number, date: string): string {
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff === 2) return "明後日";
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

async function fetchRainByDate(areaCode: string): Promise<Record<string, number>> {
  const coords = AREA_COORDS[areaCode];
  if (!coords) return {};
  try {
    return await withCache(`weather:rain:${areaCode}`, RAIN_TTL_MS, async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=precipitation_sum&timezone=Asia%2FTokyo&forecast_days=4`,
        { next: { revalidate: 1800 } },
      );
      if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
      const json = (await res.json()) as {
        daily?: { time?: string[]; precipitation_sum?: (number | null)[] };
      };
      const times = json.daily?.time ?? [];
      const sums = json.daily?.precipitation_sum ?? [];
      const byDate: Record<string, number> = {};
      times.forEach((t, i) => {
        const v = sums[i];
        if (typeof v === "number") byDate[t] = v;
      });
      return byDate;
    });
  } catch {
    // 降水量は補助情報。取れなくても天気自体は表示する
    return {};
  }
}

export async function fetchWeather(areaCode: string): Promise<GenreResult> {
  try {
    const [data, rainByDate] = await Promise.all([
      withCache(`weather:${areaCode}`, TTL_MS, async () => {
        const res = await fetch(
          `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`,
          { next: { revalidate: 60 } },
        );
        if (!res.ok) {
          throw new Error(`JMA API returned ${res.status}`);
        }
        return (await res.json()) as JmaForecast[];
      }),
      fetchRainByDate(areaCode),
    ]);

    const shortTerm = data[0];
    const weatherSeries = shortTerm?.timeSeries?.[0];
    const popSeries = shortTerm?.timeSeries?.[1];
    const tempSeries = shortTerm?.timeSeries?.[2];

    if (!weatherSeries) {
      return { ok: false, items: [], error: "予報データの形式が想定と異なります" };
    }

    // 週間予報(3日目以降の気温・降水確率の補完用)
    const weekly = data[1];
    const weeklyPop = weekly?.timeSeries?.[0];
    const weeklyTemp = weekly?.timeSeries?.[1];
    const weeklyPopByDate: Record<string, number> = {};
    weeklyPop?.timeDefines.forEach((t, i) => {
      const v = toNumber(weeklyPop.areas[0]?.pops?.[i]);
      if (v != null) weeklyPopByDate[dateOf(t)] = v;
    });
    const weeklyTempByDate: Record<string, { min?: number; max?: number }> = {};
    weeklyTemp?.timeDefines.forEach((t, i) => {
      const a = weeklyTemp.areas[0];
      weeklyTempByDate[dateOf(t)] = { min: toNumber(a?.tempsMin?.[i]), max: toNumber(a?.tempsMax?.[i]) };
    });

    const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
    const sameCount = tempSeries != null && tempSeries.areas.length === weatherSeries.areas.length;

    const items: NormalizedItem[] = weatherSeries.areas.map((area, areaIdx) => {
      const popArea =
        popSeries?.areas.find((a) => a.area.code === area.area.code) ?? popSeries?.areas[areaIdx];
      const tempArea = tempSeries ? (sameCount ? tempSeries.areas[areaIdx] : tempSeries.areas[0]) : undefined;
      const tempPointName = tempArea?.area.name;

      const days: WeatherDay[] = [];
      weatherSeries.timeDefines.forEach((td, di) => {
        const date = dateOf(td);
        const diff = dayDiff(date, today);
        if (diff < 0) return;

        const text = cleanText(area.weathers?.[di]);
        const code = area.weatherCodes?.[di] ?? "";

        const popSlots: (number | null)[] = [null, null, null, null];
        popSeries?.timeDefines.forEach((pt, pi) => {
          if (dateOf(pt) !== date) return;
          const slot = Math.floor(hourOf(pt) / POP_SLOT_HOURS);
          popSlots[slot] = toNumber(popArea?.pops?.[pi]) ?? null;
        });

        let tempMin: number | undefined;
        let tempMax: number | undefined;
        tempSeries?.timeDefines.forEach((tt, ti) => {
          if (dateOf(tt) !== date) return;
          const v = toNumber(tempArea?.temps?.[ti]);
          if (v == null) return;
          // 気象庁の慣例: 0時=最低気温、9時=最高気温
          if (hourOf(tt) === 0) tempMin = v;
          else if (hourOf(tt) === 9) tempMax = v;
        });
        tempMin ??= weeklyTempByDate[date]?.min;
        tempMax ??= weeklyTempByDate[date]?.max;

        days.push({
          date,
          label: dayLabel(diff, date),
          code,
          icon: weatherIcon(code, area.weathers?.[di] ?? ""),
          text,
          tempMax,
          tempMin,
          popSlots,
          popDaily: popSlots.every((p) => p == null) ? weeklyPopByDate[date] : undefined,
          rainMm: rainByDate[date],
        });
      });

      return {
        id: `weather:${areaCode}:${area.area.code}`,
        genre: "weather",
        title: area.area.name,
        body: days.map((d) => `${d.label}: ${d.text}`).join(" / "),
        timestamp: shortTerm.reportDatetime,
        weather: { tempPointName, days },
        sourceName: `気象庁(${shortTerm.publishingOffice}) / 降水量: Open-Meteo`,
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
