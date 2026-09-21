import type { NormalizedItem, WeatherDay } from "@/lib/types";
import { cx } from "./ui";
import ui from "./ui.module.css";
import styles from "./WeatherCard.module.css";

// 各列は「その時刻から6時間」。降水確率と降水量を同じ区切りで並べる
const SLOT_HEADS = ["0–6時", "6–12時", "12–18時", "18–24時"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
// 6時間の降水量がこれ以上なら強調する(mm)
const HEAVY_RAIN_MM = 20;
// 降水確率がこれ以上なら強調する(%)
const HIGH_POP = 50;

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

function formatMm(mm: number): string {
  return `${Number.isInteger(mm) ? mm : mm.toFixed(1)}mm`;
}

function DayRow({ day }: { day: WeatherDay }) {
  const hasSlots = day.popSlots.some((p) => p != null);

  return (
    <div className={styles.day}>
      <div className={styles.summary}>
        <div className={styles.when}>
          <span className={styles.dayLabel}>{day.label}</span>
          <span className={styles.dayDate}>{formatDate(day.date)}</span>
        </div>
        <span className={styles.icon} role="img" aria-label={day.text}>
          {day.icon}
        </span>
        <span className={styles.text}>{day.text}</span>
        {(day.tempMax != null || day.tempMin != null) && (
          <span className={styles.temps}>
            <span className={styles.tempMax}>{day.tempMax != null ? `${day.tempMax}°` : "–"}</span>
            <span className={styles.tempSep}>/</span>
            <span className={styles.tempMin}>{day.tempMin != null ? `${day.tempMin}°` : "–"}</span>
          </span>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className={ui.srOnly}>項目</span>
            </th>
            {SLOT_HEADS.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">降水確率</th>
            {hasSlots ? (
              day.popSlots.map((p, i) => (
                <td key={SLOT_HEADS[i]} className={cx(p != null && p >= HIGH_POP && styles.strong)}>
                  {p == null ? "–" : `${p}%`}
                </td>
              ))
            ) : (
              <td colSpan={4} className={cx(day.popDaily != null && day.popDaily >= HIGH_POP && styles.strong)}>
                {day.popDaily != null ? `${day.popDaily}%(1日の値)` : "–"}
              </td>
            )}
          </tr>
          <tr>
            <th scope="row">降水量</th>
            {day.rainSlots.map((mm, i) => (
              <td
                key={SLOT_HEADS[i]}
                className={cx(mm != null && mm >= HEAVY_RAIN_MM ? styles.heavy : mm != null && mm > 0 && styles.wet)}
              >
                {mm == null ? "–" : formatMm(mm)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function WeatherCard({ item, showTitle = true }: { item: NormalizedItem; showTitle?: boolean }) {
  const forecast = item.weather;
  if (!forecast) return null;

  return (
    <section className={ui.card}>
      {showTitle && <h3 className={styles.areaName}>{item.title}</h3>}
      <div className={styles.days}>
        {forecast.days.map((day) => (
          <DayRow key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}
