import { GenreCard } from "@/components/GenreCard";
import { FavoritesLink, PageShell } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { GENRES } from "@/lib/genres";
import styles from "./page.module.css";

export default function Home() {
  return (
    <PageShell
      title="速報ハブ"
      subtitle="ジャンルを選んで、知りたい路線・地域まで絞り込んで確認できます。"
      actions={<FavoritesLink />}
    >
      <div className={ui.section}>
        <div className={styles.grid}>
          {GENRES.map((genre) => (
            <GenreCard key={genre.id} genre={genre} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
