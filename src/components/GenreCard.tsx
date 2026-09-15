import Link from "next/link";
import type { GenreConfig } from "@/lib/genres";
import styles from "./GenreCard.module.css";

export function GenreCard({ genre }: { genre: GenreConfig }) {
  return (
    <Link href={`/${genre.id}`} className={styles.card}>
      <span className={styles.emoji}>{genre.emoji}</span>
      <span className={styles.label}>{genre.label}</span>
      <span className={styles.description}>{genre.description}</span>
    </Link>
  );
}
