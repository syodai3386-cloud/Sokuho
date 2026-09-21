import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";

export type Tone = "critical" | "warning" | "info" | "ok" | "muted";

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function PageShell({
  emoji,
  title,
  back,
  actions,
  subtitle,
  children,
}: {
  emoji?: string;
  title: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.shell}>
      {back && (
        <Link href={back.href} className={styles.back}>
          ← {back.label}
        </Link>
      )}
      <header className={styles.head}>
        {emoji && (
          <span className={styles.emoji} aria-hidden="true">
            {emoji}
          </span>
        )}
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {children}
    </main>
  );
}

// どのページのヘッダーにも同じ形で置く操作
export function FavoritesLink() {
  return (
    <Link href="/favorites" className={styles.btn}>
      ★ お気に入り設定
    </Link>
  );
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.btn} onClick={onClick} disabled={loading}>
      {loading ? "更新中..." : "↻ 更新"}
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx(styles.chip, active && styles.chipActive)}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// 絞り込みチップの1行(ラベル付き)
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.filterRow}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips} role="group" aria-label={`${label}で絞り込み`}>
        {children}
      </div>
    </div>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cx(styles.badge, styles[`badge_${tone}`])}>{children}</span>;
}

// バッジの色が何を意味するかの説明
export function Legend({ items }: { items: { tone: "critical" | "warning" | "info"; text: string }[] }) {
  return (
    <div className={styles.legend}>
      <span>色の見方:</span>
      {items.map((item) => (
        <Badge key={item.text} tone={item.tone}>
          {item.text}
        </Badge>
      ))}
    </div>
  );
}

export function StateBox({ children }: { children: ReactNode }) {
  return <div className={styles.state}>{children}</div>;
}

export function Banner({ children, error }: { children: ReactNode; error?: boolean }) {
  return <div className={cx(styles.banner, error && styles.bannerError)}>{children}</div>;
}
