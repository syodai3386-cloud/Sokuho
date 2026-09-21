import { useCallback, useMemo, useSyncExternalStore } from "react";

// お気に入りはこのブラウザ(localStorage)にだけ保存する。サーバーにはDBがなく、他の端末とは共有されない。
export type FavoritePlace = {
  area: string; // 予報区コード
  city?: string; // 市区町村コード(なければ気象庁の予報区単位)
  label: string;
};

export type FavoriteLine = {
  id: string; // 路線ID
  title: string;
};

export type Favorites = {
  weatherPlaces: FavoritePlace[];
  trainLines: FavoriteLine[];
  // 電車の初期表示エリア。"all" はすべて。未設定なら genres.ts の defaultArea
  trainArea?: string;
  // 天気・電車以外のジャンルの初期選択(ジャンルID → 選択肢の値)
  defaults: Record<string, string>;
};

const KEY = "sokuho:favorites:v1";
const CHANGED_EVENT = "sokuho:favorites-changed";

export const EMPTY_FAVORITES: Favorites = { weatherPlaces: [], trainLines: [], defaults: {} };

export function placeKey(p: { area: string; city?: string }): string {
  return p.city ? `${p.area}:${p.city}` : p.area;
}

function isPlace(v: unknown): v is FavoritePlace {
  const p = v as FavoritePlace;
  return typeof p?.area === "string" && typeof p?.label === "string" && (p.city === undefined || typeof p.city === "string");
}

function isLine(v: unknown): v is FavoriteLine {
  const l = v as FavoriteLine;
  return typeof l?.id === "string" && typeof l?.title === "string";
}

function parse(raw: string): Favorites {
  if (!raw) return EMPTY_FAVORITES;
  try {
    const data = JSON.parse(raw) as Partial<Favorites>;
    const defaults: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.defaults ?? {})) {
      if (typeof v === "string") defaults[k] = v;
    }
    return {
      weatherPlaces: Array.isArray(data.weatherPlaces) ? data.weatherPlaces.filter(isPlace) : [],
      trainLines: Array.isArray(data.trainLines) ? data.trainLines.filter(isLine) : [],
      trainArea: typeof data.trainArea === "string" ? data.trainArea : undefined,
      defaults,
    };
  } catch {
    return EMPTY_FAVORITES;
  }
}

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGED_EVENT, callback);
  };
}

const noopSubscribe = () => () => {};

export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  // サーバー描画中と、ブラウザで最初に描画する間は false。お気に入りを反映する前に
  // 初期値で取得してしまう無駄なリクエストを避けるために使う
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const favorites = useMemo(() => parse(raw), [raw]);

  // 保存に成功したら true(プライベートブラウズ等で保存できないときは false)
  const update = useCallback((change: (current: Favorites) => Favorites): boolean => {
    try {
      localStorage.setItem(KEY, JSON.stringify(change(parse(readRaw()))));
    } catch {
      return false;
    }
    window.dispatchEvent(new Event(CHANGED_EVENT));
    return true;
  }, []);

  return { favorites, ready, update };
}
