import type { NormalizedItem, WeatherDay } from "@/lib/types";
import styles from "./WeatherCard.module.css";

// 各バーは「その時刻から6時間」の降水確率
const SLOT_LABELS = ["0時", "6時", "12時", "18時"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const HEAVY_RAIN_MM = 50;

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

function formatMm(mm: number): string {
  return Number.isInteger(mm) ? String(mm) : mm.toFixed(1);
}

function PopBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      className={styles.popCol}
      role="img"
      aria-label={
        value == null
          ? `${label}から6時間 降水確率 なし`
          : `${label}${label === "1日" ? "" : "から6時間"} 降水確率 ${value}%`
      }
    >
      <span className={styles.popValue}>{value == null ? "–" : `${value}%`}</span>
      <div className={styles.popTrack}>
        {value != null && <div className={styles.popFill} style={{ height: `${value}%` }} />}
      </div>
      <span className={styles.popLabel}>{label}</span>
    </div>
  );
}

function DayColumn({ day }: { day: WeatherDay }) {
  const hasSlots = day.popSlots.some((p) => p != null);
  const heavy = day.rainMm != null && day.rainMm >= HEAVY_RAIN_MM;

  return (
    <div className={styles.day}>
      <div className={styles.dayHead}>
        <span className={styles.dayLabel}>{day.label}</span>
        <span className={styles.dayDate}>{formatDate(day.date)}</span>
      </div>

      <div className={styles.icon} role="img" aria-label={day.text}>
        {day.icon}
      </div>
      <p className={styles.text}>{day.text}</p>

      <div className={styles.temps}>
        <span className={styles.tempMax}>{day.tempMax != null ? `${day.tempMax}°` : "–"}</span>
        <span className={styles.tempSep}>/</span>
        <span className={styles.tempMin}>{day.tempMin != null ? `${day.tempMin}°` : "–"}</span>
      </div>
      <div className={styles.tempCaption}>最高 / 最低</div>

      <div className={styles.sectionLabel}>降水確率</div>
      {hasSlots ? (
        <div className={styles.pops}>
          {day.popSlots.map((p, i) => (
            <PopBar key={SLOT_LABELS[i]} label={SLOT_LABELS[i]} value={p} />
          ))}
        </div>
      ) : (
        <div className={styles.pops}>
          <PopBar label="1日" value={day.popDaily ?? null} />
        </div>
      )}

      <div className={`${styles.rain} ${heavy ? styles.rainHeavy : ""}`}>
        <span aria-hidden="true">💧</span>
        <span>{day.rainMm != null ? `${formatMm(day.rainMm)}mm` : "–"}</span>
      </div>
      <div className={styles.rainCaption}>降水量(予測)</div>
    </div>
  );
}

export function WeatherCard({ item }: { item: NormalizedItem }) {
  const forecast = item.weather;
  if (!forecast) return null;

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{item.title}</h2>
      <div className={styles.days}>
        {forecast.days.map((day) => (
          <DayColumn key={day.date} day={day} />
        ))}
      </div>
      <p className={styles.note}>
        {forecast.tempPointName ? `気温は${forecast.tempPointName}の予報。` : ""}
        降水確率の各バーは、その時刻から6時間の値。降水量は県庁所在地付近の予測値(Open-Meteo)で、地域や時間帯によって実際の雨量は大きく異なることがあります。
      </p>
    </section>
  );
}
