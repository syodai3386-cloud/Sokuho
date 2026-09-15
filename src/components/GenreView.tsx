"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/[genre]/page.module.css";
import type { GenreConfig } from "@/lib/genres";
import type { GenreResult, NormalizedItem } from "@/lib/types";
import { ResultList } from "./ResultList";

export function GenreView({ genre }: { genre: GenreConfig }) {
  const [target, setTarget] = useState(genre.options[0]?.value ?? "");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NormalizedItem[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    fetch(`/api/${genre.id}?target=${encodeURIComponent(target)}`)
      .then((res) => res.json() as Promise<GenreResult>)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setIsMock(Boolean(data.isMock));
        if (!data.ok) setError(data.error ?? "取得に失敗しました");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [genre.id, target]);

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

      <ResultList items={items} loading={loading} error={error} isMock={isMock} />
    </main>
  );
}
