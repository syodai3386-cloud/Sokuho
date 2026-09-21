import Link from "next/link";
import type { FavoriteLine } from "@/lib/favorites";
import type { LineState, LineStatus } from "@/lib/types";
import { Badge, type Tone, cx } from "./ui";
import ui from "./ui.module.css";
import styles from "./FavoriteLines.module.css";

const STATE_TONE: Record<LineState, Tone> = {
  normal: "ok",
  warning: "warning",
  critical: "critical",
  unknown: "muted",
};

const STATE_TEXT: Record<LineState, string> = {
  normal: "平常運転",
  warning: "遅れ・乱れ",
  critical: "運休・見合わせ",
  unknown: "情報なし",
};

export function FavoriteLines({ favorites, lines }: { favorites: FavoriteLine[]; lines: LineStatus[] }) {
  const byId = new Map(lines.map((l) => [l.id, l]));

  return (
    <section className={cx(ui.card, ui.section)}>
      <div className={ui.sectionHead}>
        <h2 className={ui.sectionTitle}>お気に入り路線</h2>
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
                <Badge tone={STATE_TONE[state]}>
                  {state === "normal" || state === "unknown" ? STATE_TEXT[state] : (line?.label ?? STATE_TEXT[state])}
                </Badge>
              </div>
              {line?.body && <p className={ui.itemBody}>{line.body}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
