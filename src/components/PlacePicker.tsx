"use client";

import { useEffect, useState } from "react";
import type { FavoritePlace } from "@/lib/favorites";
import { WEATHER_AREAS } from "@/lib/genres";
import styles from "./PlacePicker.module.css";

type PlaceOption = { code: string; name: string };

// 都道府県ごとの市区町村一覧は変わらないので、一度取得したら使い回す
const placeCache = new Map<string, PlaceOption[]>();

const DEFAULT_AREA = "140000";

export function PlacePicker({
  onAdd,
  addLabel = "追加",
}: {
  onAdd: (place: FavoritePlace) => void;
  addLabel?: string;
}) {
  const [area, setArea] = useState(DEFAULT_AREA);
  const [city, setCity] = useState("");
  const [, setLoadedVersion] = useState(0);
  const [failedArea, setFailedArea] = useState<string | null>(null);

  const places = placeCache.get(area);

  useEffect(() => {
    if (placeCache.has(area)) return;
    let cancelled = false;

    fetch(`/api/places/${area}`)
      .then((res) => res.json() as Promise<{ ok: boolean; places: PlaceOption[] }>)
      .then((data) => {
        if (!data.ok) throw new Error("failed");
        placeCache.set(area, data.places);
        if (!cancelled) setLoadedVersion((v) => v + 1);
      })
      .catch(() => {
        if (!cancelled) setFailedArea(area);
      });

    return () => {
      cancelled = true;
    };
  }, [area]);

  const areaLabel = WEATHER_AREAS.find((a) => a.value === area)?.label ?? area;

  const handleAdd = () => {
    const cityName = places?.find((p) => p.code === city)?.name;
    onAdd({
      area,
      city: city || undefined,
      label: city && cityName ? `${areaLabel} ${cityName}` : `${areaLabel}(予報区)`,
    });
  };

  return (
    <div className={styles.picker}>
      <select
        className={styles.select}
        aria-label="都道府県"
        value={area}
        onChange={(e) => {
          setArea(e.target.value);
          setCity("");
        }}
      >
        {WEATHER_AREAS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        aria-label="市区町村"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={!places}
      >
        <option value="">
          {!places ? (failedArea === area ? "市区町村を取得できません" : "読み込み中...") : "気象庁の予報区(東部・西部など)"}
        </option>
        {places?.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="button" className={styles.button} onClick={handleAdd}>
        {addLabel}
      </button>
    </div>
  );
}
