"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import pageStyles from "@/app/[genre]/page.module.css";
import { type FavoritePlace, placeKey, useFavorites } from "@/lib/favorites";
import type { GenreConfig } from "@/lib/genres";
import type { GenreResult } from "@/lib/types";
import { PlacePicker } from "./PlacePicker";
import { WeatherCard } from "./WeatherCard";
import styles from "./WeatherView.module.css";

type Fetched = { reload: number; result: GenreResult | null; error?: string };

// お気に入りが1件もないときに表示する地点
const DEFAULT_PLACE: FavoritePlace = { area: "140000", label: "神奈川県(予報区)" };

export function WeatherView({ genre }: { genre: GenreConfig }) {
  const { favorites, ready, update } = useFavorites();
  const [extras, setExtras] = useState<FavoritePlace[]>([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [fetched, setFetched] = useState<Record<string, Fetched>>({});
  const inflight = useRef(new Set<string>());

  const basePlaces = favorites.weatherPlaces.length > 0 ? favorites.weatherPlaces : [DEFAULT_PLACE];
  const baseKeys = new Set(basePlaces.map(placeKey));
  const places = [...basePlaces, ...extras.filter((e) => !baseKeys.has(placeKey(e)))];
  const favoriteKeys = new Set(favorites.weatherPlaces.map(placeKey));
  const placesSignature = places.map(placeKey).join("|");

  useEffect(() => {
    if (!ready) return;

    for (const key of placesSignature.split("|").filter(Boolean)) {
      const flight = `${key}#${reloadCount}`;
      if (inflight.current.has(flight)) continue;
      inflight.current.add(flight);

      fetch(`/api/weather?target=${encodeURIComponent(key)}`)
        .then((res) => res.json() as Promise<GenreResult>)
        .then((result) => setFetched((prev) => ({ ...prev, [key]: { reload: reloadCount, result } })))
        .catch((err) =>
          setFetched((prev) => ({
            ...prev,
            [key]: {
              reload: reloadCount,
              result: null,
              error: err instanceof Error ? err.message : "取得に失敗しました",
            },
          })),
        );
    }
  }, [ready, placesSignature, reloadCount]);

  const toggleFavorite = (place: FavoritePlace) => {
    update((current) => {
      const key = placeKey(place);
      const exists = current.weatherPlaces.some((p) => placeKey(p) === key);
      return {
        ...current,
        weatherPlaces: exists
          ? current.weatherPlaces.filter((p) => placeKey(p) !== key)
          : [...current.weatherPlaces, place],
      };
    });
  };

  const reloading = !ready || places.some((p) => fetched[placeKey(p)]?.reload !== reloadCount);

  return (
    <main className={pageStyles.main}>
      <Link href="/" className={pageStyles.back}>
        ← ジャンル選択に戻る
      </Link>
      <div className={pageStyles.header}>
        <span className={pageStyles.emoji}>{genre.emoji}</span>
        <h1 className={pageStyles.title}>{genre.label}</h1>
        <button
          type="button"
          className={pageStyles.reload}
          onClick={() => setReloadCount((c) => c + 1)}
          disabled={reloading}
        >
          {reloading ? "更新中..." : "更新"}
        </button>
      </div>

      <p className={styles.lead}>
        {favorites.weatherPlaces.length > 0
          ? "お気に入りの地点を表示しています。"
          : "お気に入りが未設定のため、神奈川県を表示しています。"}
        <Link href="/favorites" className={styles.link}>
          お気に入りを設定
        </Link>
      </p>

      {places.map((place) => {
        const key = placeKey(place);
        const entry = fetched[key];
        const loading = !ready || !entry || entry.reload !== reloadCount;
        const isFavorite = favoriteKeys.has(key);
        const isExtra = !baseKeys.has(key);
        const error = entry?.error ?? (entry?.result && !entry.result.ok ? (entry.result.error ?? "取得に失敗しました") : undefined);

        return (
          <section key={key} className={styles.place}>
            <div className={styles.placeHead}>
              <h2 className={styles.placeTitle}>{place.label}</h2>
              <div className={styles.placeActions}>
                <button
                  type="button"
                  className={`${styles.chipButton} ${isFavorite ? styles.chipButtonOn : ""}`}
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite(place)}
                >
                  {isFavorite ? "★ お気に入り" : "☆ お気に入りに追加"}
                </button>
                {isExtra && (
                  <button
                    type="button"
                    className={styles.chipButton}
                    onClick={() => setExtras((prev) => prev.filter((e) => placeKey(e) !== key))}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <div className={styles.state}>取得中...</div>
            ) : error ? (
              <div className={styles.state}>取得できませんでした: {error}</div>
            ) : (
              <div className={styles.cards}>
                {entry.result?.items.map((item) => (
                  <WeatherCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className={styles.adder}>
        <h2 className={styles.adderTitle}>ほかの地点も表示する</h2>
        <PlacePicker
          addLabel="表示に追加"
          onAdd={(place) => setExtras((prev) => (prev.some((e) => placeKey(e) === placeKey(place)) ? prev : [...prev, place]))}
        />
        <p className={styles.hint}>
          市区町村を選ぶと、その地点の予報を表示します(Open-Meteoのモデル予測)。気象庁の予報区は東部・西部のように広い区域単位です。
        </p>
      </section>
    </main>
  );
}
