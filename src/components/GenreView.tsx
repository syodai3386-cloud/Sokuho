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
  error: string | undefined;
};

export function GenreView({ genre }: { genre: GenreConfig }) {
  const [target, setTarget] = useState(genre.options[0]?.value ?? "");
  const [fetched, setFetched] = useState<FetchedState | null>(null);

  const requestKey = `${genre.id}:${target}`;
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
          error: err instanceof Error ? err.message : "取得に失敗しました",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [genre.id, target, requestKey]);

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.back}>
        ← ジャンル選択に戻る
      </Link>
      <div className={styles.header}>
        <span className={styles.emoji}>{genre.emoji}</span>
        <h1 className={styles.title}>{genre.label}</h1>
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

      <ResultList
        items={fetched?.items ?? []}
        loading={loading}
        error={fetched?.error}
        isMock={fetched?.isMock}
        notice={fetched?.notice}
      />
    </main>
  );
}
