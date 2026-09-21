"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import type { GenreConfig } from "@/lib/genres";
import type { GenreResult, LineStatus, NormalizedItem } from "@/lib/types";
import { FavoriteLines } from "./FavoriteLines";
import { ResultList } from "./ResultList";
import { Banner, Chip, FavoritesLink, FilterRow, Legend, PageShell, RefreshButton } from "./ui";
import ui from "./ui.module.css";

type FetchedState = {
  key: string;
  items: NormalizedItem[];
  lines: LineStatus[] | undefined;
  isMock: boolean;
  notice: string | undefined;
  warnings: string[] | undefined;
  error: string | undefined;
};

const ALL = "all";

export function GenreView({ genre }: { genre: GenreConfig }) {
  const { favorites, ready } = useFavorites();
  const [targetOverride, setTargetOverride] = useState<string | null>(null);
  const [areaOverride, setAreaOverride] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [filter, setFilter] = useState(ALL);
  const [fetched, setFetched] = useState<FetchedState | null>(null);

  // 選択肢の初期値は「画面で選んだ値 > お気に入りで設定した値 > ジャンルの標準」の順
  const favoriteDefault = favorites.defaults[genre.id];
  const target =
    targetOverride ??
    (favoriteDefault && genre.options.some((o) => o.value === favoriteDefault) ? favoriteDefault : undefined) ??
    genre.defaultValue ??
    genre.options[0]?.value ??
    "";
  const favoriteArea = genre.areas && favorites.trainArea;
  const area =
    areaOverride ??
    (favoriteArea && (favoriteArea === ALL || genre.areas?.includes(favoriteArea)) ? favoriteArea : undefined) ??
    genre.defaultArea ??
    ALL;

  const requestKey = `${genre.id}:${target}:${reloadCount}`;
  const loading = !ready || fetched?.key !== requestKey;

  useEffect(() => {
    if (!ready || !target) return;
    let cancelled = false;

    fetch(`/api/${genre.id}?target=${encodeURIComponent(target)}`)
      .then((res) => res.json() as Promise<GenreResult>)
      .then((data) => {
        if (cancelled) return;
        setFetched({
          key: requestKey,
          items: data.items,
          lines: data.lines,
          isMock: Boolean(data.isMock),
          notice: data.notice,
          warnings: data.warnings,
          error: data.ok ? undefined : (data.error ?? "取得に失敗しました"),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFetched({
          key: requestKey,
          items: [],
          lines: undefined,
          isMock: false,
          notice: undefined,
          warnings: undefined,
          error: err instanceof Error ? err.message : "取得に失敗しました",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, genre.id, target, requestKey]);

  const allItems = fetched?.items ?? [];
  const areaItems = area === ALL ? allItems : allItems.filter((i) => i.area === area);
  const categories = [...new Set(areaItems.map((i) => i.category).filter((c): c is string => Boolean(c)))];
  const activeFilter = categories.includes(filter) ? filter : ALL;
  const visibleItems = activeFilter === ALL ? areaItems : areaItems.filter((i) => i.category === activeFilter);
  const hiddenByArea = allItems.length - areaItems.length;
  const emptyMessage =
    hiddenByArea > 0 && genre.emptyMessage
      ? `${genre.emptyMessage}(他のエリアには${hiddenByArea}件あります)`
      : genre.emptyMessage;

  const showFavoriteLines =
    genre.id === "train" && !loading && !fetched?.error && favorites.trainLines.length > 0 && fetched?.lines;

  return (
    <PageShell
      emoji={genre.emoji}
      title={genre.label}
      back={{ href: "/", label: "ホームに戻る" }}
      subtitle={genre.description}
      actions={
        <>
          <FavoritesLink />
          <RefreshButton loading={loading} onClick={() => setReloadCount((c) => c + 1)} />
        </>
      }
    >
      {genre.needsRegistration && (
        <Banner>
          このジャンルの実データを表示するには{" "}
          <a href={genre.needsRegistration.url} target="_blank" rel="noreferrer">
            {genre.needsRegistration.serviceName}
          </a>{" "}
          の無料開発者登録が必要です。登録が済むまではサンプルデータを表示します。
        </Banner>
      )}

      {!genre.autoLoad && (
        <div className={ui.section}>
          <label className={ui.filterLabel} htmlFor="target-select">
            {genre.inputLabel}
          </label>
          <select
            id="target-select"
            className={ui.select}
            value={target}
            onChange={(e) => setTargetOverride(e.target.value)}
          >
            {genre.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showFavoriteLines && fetched?.lines && <FavoriteLines favorites={favorites.trainLines} lines={fetched.lines} />}

      {!loading && !fetched?.error && genre.autoLoad && (
        <p className={ui.summary}>{visibleItems.length}件の路線で遅れ・運休が出ています</p>
      )}

      {genre.areas && (
        <FilterRow label="エリア">
          {[ALL, ...genre.areas].map((a) => {
            const count = a === ALL ? allItems.length : allItems.filter((i) => i.area === a).length;
            return (
              <Chip key={a} active={a === area} onClick={() => setAreaOverride(a)}>
                {a === ALL ? "すべて" : a} {loading ? "" : count}
              </Chip>
            );
          })}
        </FilterRow>
      )}

      {categories.length > 1 && (
        <FilterRow label="事業者">
          {[ALL, ...categories].map((c) => {
            const count = c === ALL ? areaItems.length : areaItems.filter((i) => i.category === c).length;
            return (
              <Chip key={c} active={c === activeFilter} onClick={() => setFilter(c)}>
                {c === ALL ? "すべて" : c} {count}
              </Chip>
            );
          })}
        </FilterRow>
      )}

      {genre.legend && !loading && visibleItems.length > 0 && <Legend items={genre.legend} />}

      <ResultList
        items={visibleItems}
        loading={loading}
        error={fetched?.error}
        isMock={fetched?.isMock}
        notice={fetched?.notice}
        warnings={fetched?.warnings}
        emptyMessage={emptyMessage}
      />

      {genre.footnote && <p className={ui.footnote}>{genre.footnote}</p>}
    </PageShell>
  );
}
