"use client";

import { useEffect, useRef, useState } from "react";
import { type FavoritePlace, placeKey, useFavorites } from "@/lib/favorites";
import type { GenreConfig } from "@/lib/genres";
import type { GenreResult } from "@/lib/types";
import { PlacePicker } from "./PlacePicker";
import { WeatherCard } from "./WeatherCard";
import { FavoritesLink, PageShell, RefreshButton, StateBox, cx } from "./ui";
import ui from "./ui.module.css";

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
    <PageShell
      emoji={genre.emoji}
      title={genre.label}
      back={{ href: "/", label: "ホームに戻る" }}
      subtitle={
        favorites.weatherPlaces.length > 0
          ? `お気に入りの${favorites.weatherPlaces.length}地点を表示しています。`
          : "お気に入りが未設定のため、神奈川県を表示しています。"
      }
      actions={
        <>
          <FavoritesLink />
          <RefreshButton loading={reloading} onClick={() => setReloadCount((c) => c + 1)} />
        </>
      }
    >
      {places.map((place) => {
        const key = placeKey(place);
        const entry = fetched[key];
        const loading = !ready || !entry || entry.reload !== reloadCount;
        const isFavorite = favoriteKeys.has(key);
        const isExtra = !baseKeys.has(key);
        const error =
          entry?.error ?? (entry?.result && !entry.result.ok ? (entry.result.error ?? "取得に失敗しました") : undefined);
        const items = entry?.result?.items ?? [];

        return (
          <section key={key} className={ui.section}>
            <div className={ui.sectionHead}>
              <h2 className={ui.sectionTitle}>{place.label}</h2>
              <div className={ui.chips}>
                <button
                  type="button"
                  className={cx(ui.chip, isFavorite && ui.chipActive)}
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite(place)}
                >
                  {isFavorite ? "★ お気に入り" : "☆ お気に入りに追加"}
                </button>
                {isExtra && (
                  <button
                    type="button"
                    className={ui.chip}
                    aria-label={`${place.label}を閉じる`}
                    onClick={() => setExtras((prev) => prev.filter((e) => placeKey(e) !== key))}
                  >
                    閉じる
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <StateBox>取得中...</StateBox>
            ) : error ? (
              <StateBox>取得できませんでした: {error}</StateBox>
            ) : (
              <div className={ui.stack}>
                {items.map((item) => (
                  <WeatherCard key={item.id} item={item} showTitle={items.length > 1} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className={cx(ui.card, ui.section)}>
        <div className={ui.sectionHead}>
          <h2 className={ui.sectionTitle}>ほかの地点も表示する</h2>
        </div>
        <PlacePicker
          addLabel="表示に追加"
          onAdd={(place) =>
            setExtras((prev) => (prev.some((e) => placeKey(e) === placeKey(place)) ? prev : [...prev, place]))
          }
        />
      </section>
    </PageShell>
  );
}
