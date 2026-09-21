import Link from "next/link";
import { GenreCard } from "@/components/GenreCard";
import { GENRES } from "@/lib/genres";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>速報ハブ</h1>
        <p className={styles.subtitle}>
          ジャンルを選んで、知りたい路線・地域まで絞り込んで確認できます。
        </p>
        <Link href="/favorites" className={styles.favoritesLink}>
          ★ お気に入り設定
        </Link>
      </div>
      <div className={styles.grid}>
        {GENRES.map((genre) => (
          <GenreCard key={genre.id} genre={genre} />
        ))}
      </div>
    </main>
  );
}
