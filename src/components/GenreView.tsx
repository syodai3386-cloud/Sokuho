"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/[genre]/page.module.css";
import type { GenreConfig } from "@/lib/genres";
import type { GenreResult, NormalizedItem } from "@/lib/types";
import { ResultList } from "./ResultList";

type FetchedState = {
  key: string;
  items: NormalizedItem[];
  isMock: boolean;
  notice: string | undefined;
  warnings: string[] | undefined;
  error: string | undefined;
};

const ALL = "all";

export function GenreView({ genre }: { genre: GenreConfig }) {
  const [target, setTarget] = useState(genre.defaultValue ?? genre.options[0]?.value ?? "");
  const [reloadCount, setReloadCount] = useState(0);
  const [filter, setFilter] = useState(ALL);
  const [fetched, setFetched] = useState<FetchedState | null>(null);

  const requestKey = `${genre.id}:${target}:${reloadCount}`;
  const loading = fetched?.key !== requestKey;

  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    fetch(`/api/${genre.id}?target=${encodeURIComponent(target)}`)
      .then((res) => res.json() as Promise<GenreResult>)
      .then((data) => {
        if (cancelled) return;
        setFetched({
          key: requestKey,
          items: data.items,
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
          isMock: false,
          notice: undefined,
          warnings: undefined,
          error: err instanceof Error ? err.message : "取得に失敗しました",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [genre.id, target, requestKey]);

  const allItems = fetched?.items ?? [];
  const categories = [...new Set(allItems.map((i) => i.category).filter((c): c is string => Boolean(c)))];
  const activeFilter = categories.includes(filter) ? filter : ALL;
  const visibleItems = activeFilter === ALL ? allItems : allItems.filter((i) => i.category === activeFilter);

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.back}>
        ← ジャンル選択に戻る
      </Link>
      <div className={styles.header}>
        <span className={styles.emoji}>{genre.emoji}</span>
        <h1 className={styles.title}>{genre.label}</h1>
        {genre.autoLoad && (
          <button
            type="button"
            className={styles.reload}
            onClick={() => setReloadCount((c) => c + 1)}
            disabled={loading}
          >
            {loading ? "更新中..." : "更新"}
          </button>
        )}
      </div>

      {genre.needsRegistration && (
        <div className={styles.registrationNotice}>
          このジャンルの実データを表示するには{" "}
          <a href={genre.needsRegistration.url} target="_blank" rel="noreferrer">
            {genre.needsRegistration.serviceName}
          </a>{" "}
          の無料開発者登録が必要です。登録が済むまではサンプルデータを表示します。
        </div>
      )}

      {!genre.autoLoad && (
        <>
          <label htmlFor="target-select">{genre.inputLabel}</label>
          <select
            id="target-select"
            className={styles.select}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {genre.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      {!loading && !fetched?.error && genre.autoLoad && (
        <p className={styles.summary}>情報が出ている路線: {allItems.length}件</p>
      )}

      {categories.length > 1 && (
        <div className={styles.chips} role="group" aria-label="事業者で絞り込み">
          {[ALL, ...categories].map((c) => {
            const count = c === ALL ? allItems.length : allItems.filter((i) => i.category === c).length;
            return (
              <button
                key={c}
                type="button"
                className={`${styles.chip} ${c === activeFilter ? styles.chipActive : ""}`}
                aria-pressed={c === activeFilter}
                onClick={() => setFilter(c)}
              >
                {c === ALL ? "すべて" : c} {count}
              </button>
            );
          })}
        </div>
      )}

      <ResultList
        items={visibleItems}
        loading={loading}
        error={fetched?.error}
        isMock={fetched?.isMock}
        notice={fetched?.notice}
        warnings={fetched?.warnings}
        emptyMessage={genre.emptyMessage}
      />

      {genre.footnote && <p className={styles.footnote}>{genre.footnote}</p>}
    </main>
  );
}
