import Link from "next/link";
import type { FavoriteLine } from "@/lib/favorites";
import type { LineState, LineStatus } from "@/lib/types";
import styles from "./FavoriteLines.module.css";

const STATE_TEXT: Record<LineState, string> = {
  normal: "平常運転",
  warning: "遅れ・乱れ",
  critical: "運休・見合わせ",
  unknown: "情報なし",
};

const STATE_CLASS: Record<LineState, string> = {
  normal: styles.normal,
  warning: styles.warning,
  critical: styles.critical,
  unknown: styles.unknown,
};

export function FavoriteLines({ favorites, lines }: { favorites: FavoriteLine[]; lines: LineStatus[] }) {
  const byId = new Map(lines.map((l) => [l.id, l]));

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>お気に入り路線</h2>
        <Link href="/favorites" className={styles.edit}>
          編集
        </Link>
      </div>
      <ul className={styles.list}>
        {favorites.map((fav) => {
          const line = byId.get(fav.id);
          const state: LineState = line?.state ?? "unknown";
          return (
            <li key={fav.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.name}>{line?.title ?? fav.title}</span>
                <span className={`${styles.badge} ${STATE_CLASS[state]}`}>
                  {state === "normal" || state === "unknown" ? STATE_TEXT[state] : (line?.label ?? STATE_TEXT[state])}
                </span>
              </div>
              {line?.body && <p className={styles.body}>{line.body}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
