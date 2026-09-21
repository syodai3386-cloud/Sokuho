"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type FavoriteLine, type FavoritePlace, placeKey, useFavorites } from "@/lib/favorites";
import { GENRES, getGenreConfig } from "@/lib/genres";
import type { GenreResult, LineStatus } from "@/lib/types";
import { PlacePicker } from "./PlacePicker";
import styles from "./FavoritesView.module.css";

const ALL = "all";
// 電車の路線候補は、選んだエリアで絞る。初期値は電車画面の初期エリアと同じ
const TRAIN_AREAS = getGenreConfig("train")?.areas ?? [];
const TRAIN_DEFAULT_AREA = getGenreConfig("train")?.defaultArea ?? ALL;

// 天気・電車以外で、初期選択を設定できるジャンル
const SELECT_GENRES = GENRES.filter((g) => !g.autoLoad && g.id !== "weather");

export function FavoritesView() {
  const { favorites, ready, update } = useFavorites();
  const [saveFailed, setSaveFailed] = useState(false);

  const [catalog, setCatalog] = useState<LineStatus[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [candidateArea, setCandidateArea] = useState(TRAIN_DEFAULT_AREA);
  const [search, setSearch] = useState("");

  const save = (change: Parameters<typeof update>[0]) => setSaveFailed(!update(change));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/train?target=all")
      .then((res) => res.json() as Promise<GenreResult>)
      .then((data) => {
        if (cancelled) return;
        if (data.lines) setCatalog(data.lines);
        else setCatalogError(data.error ?? "路線の一覧を取得できませんでした");
      })
      .catch(() => {
        if (!cancelled) setCatalogError("路線の一覧を取得できませんでした");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addPlace = (place: FavoritePlace) =>
    save((c) =>
      c.weatherPlaces.some((p) => placeKey(p) === placeKey(place))
        ? c
        : { ...c, weatherPlaces: [...c.weatherPlaces, place] },
    );

  const removePlace = (key: string) =>
    save((c) => ({ ...c, weatherPlaces: c.weatherPlaces.filter((p) => placeKey(p) !== key) }));

  const toggleLine = (line: FavoriteLine) =>
    save((c) =>
      c.trainLines.some((l) => l.id === line.id)
        ? { ...c, trainLines: c.trainLines.filter((l) => l.id !== line.id) }
        : { ...c, trainLines: [...c.trainLines, line] },
    );

  const setDefault = (genreId: string, value: string) =>
    save((c) => {
      const defaults = { ...c.defaults };
      if (value) defaults[genreId] = value;
      else delete defaults[genreId];
      return { ...c, defaults };
    });

  const reset = () => {
    if (window.confirm("お気に入りの設定をすべて消して、初期状態に戻しますか？")) {
      save(() => ({ weatherPlaces: [], trainLines: [], defaults: {} }));
    }
  };

  const keyword = search.trim();
  const candidates = (catalog ?? []).filter(
    (l) => (candidateArea === ALL || l.area === candidateArea) && (!keyword || l.title.includes(keyword)),
  );
  const operators = [...new Set(candidates.map((l) => l.operator))];
  const favoriteLineIds = new Set(favorites.trainLines.map((l) => l.id));
  const trainArea = favorites.trainArea ?? TRAIN_DEFAULT_AREA;

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.back}>
        ← ホームに戻る
      </Link>
      <h1 className={styles.title}>お気に入り設定</h1>
      <p className={styles.lead}>
        よく見る地点や路線を設定すると、各ページを開いたときに最初に表示されます。設定はこのブラウザに保存され、変更するとすぐに反映されます(ほかの端末やブラウザとは共有されません)。
      </p>
      {saveFailed && (
        <div className={styles.error}>
          設定を保存できませんでした。ブラウザのサイトデータの保存が無効になっている可能性があります。
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>☀️ 天気</h2>
        <p className={styles.help}>
          お気に入りの地点は、天気ページを開くとまとめて表示されます。何も設定しないときは神奈川県を表示します。
        </p>
        {ready && favorites.weatherPlaces.length === 0 ? (
          <p className={styles.empty}>まだ設定されていません。</p>
        ) : (
          <ul className={styles.chipList}>
            {favorites.weatherPlaces.map((p) => (
              <li key={placeKey(p)} className={styles.chip}>
                <span>{p.label}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${p.label}を削除`}
                  onClick={() => removePlace(placeKey(p))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <PlacePicker onAdd={addPlace} addLabel="お気に入りに追加" />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🚃 電車</h2>

        <label className={styles.fieldLabel} htmlFor="train-area">
          最初に表示するエリア
        </label>
        <select
          id="train-area"
          className={styles.select}
          value={trainArea}
          onChange={(e) => save((c) => ({ ...c, trainArea: e.target.value }))}
        >
          {[...TRAIN_AREAS, ALL].map((a) => (
            <option key={a} value={a}>
              {a === ALL ? "すべて" : a}
            </option>
          ))}
        </select>

        <div className={styles.fieldLabel}>お気に入り路線</div>
        <p className={styles.help}>
          電車ページの一番上に、選んだ路線の現在の状態(平常運転・遅れ・運休など)を常に表示します。
        </p>
        {ready && favorites.trainLines.length === 0 ? (
          <p className={styles.empty}>まだ設定されていません。</p>
        ) : (
          <ul className={styles.chipList}>
            {favorites.trainLines.map((l) => (
              <li key={l.id} className={styles.chip}>
                <span>{l.title}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${l.title}を削除`}
                  onClick={() => toggleLine(l)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.filters}>
          <select
            className={styles.select}
            aria-label="路線を探すエリア"
            value={candidateArea}
            onChange={(e) => setCandidateArea(e.target.value)}
          >
            {[...TRAIN_AREAS, ALL].map((a) => (
              <option key={a} value={a}>
                {a === ALL ? "すべてのエリアから探す" : `${a}から探す`}
              </option>
            ))}
          </select>
          <input
            type="search"
            className={styles.input}
            placeholder="路線名で検索"
            aria-label="路線名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {catalogError ? (
          <div className={styles.error}>{catalogError}</div>
        ) : !catalog ? (
          <p className={styles.empty}>路線の一覧を読み込み中...</p>
        ) : candidates.length === 0 ? (
          <p className={styles.empty}>該当する路線がありません。</p>
        ) : (
          <div className={styles.lineGroups}>
            {operators.map((op) => (
              <fieldset key={op} className={styles.group}>
                <legend className={styles.legend}>{op}</legend>
                {candidates
                  .filter((l) => l.operator === op)
                  .map((l) => (
                    <label key={l.id} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={favoriteLineIds.has(l.id)}
                        onChange={() => toggleLine({ id: l.id, title: l.title })}
                      />
                      <span>{l.title}</span>
                    </label>
                  ))}
              </fieldset>
            ))}
          </div>
        )}
      </section>

      {SELECT_GENRES.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>そのほか</h2>
          {SELECT_GENRES.map((g) => (
            <div key={g.id} className={styles.field}>
              <label className={styles.fieldLabel} htmlFor={`default-${g.id}`}>
                {g.emoji} {g.label}: 最初に選んでおく{g.inputLabel.replace(/を選択$/, "")}
              </label>
              <select
                id={`default-${g.id}`}
                className={styles.select}
                value={favorites.defaults[g.id] ?? ""}
                onChange={(e) => setDefault(g.id, e.target.value)}
              >
                <option value="">指定しない(標準: {g.options.find((o) => o.value === (g.defaultValue ?? g.options[0]?.value))?.label})</option>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}

      <button type="button" className={styles.reset} onClick={reset}>
        設定をすべて消して初期状態に戻す
      </button>
    </main>
  );
}
