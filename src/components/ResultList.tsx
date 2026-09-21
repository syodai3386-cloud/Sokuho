import type { NormalizedItem } from "@/lib/types";
import styles from "./ResultList.module.css";

function severityClass(severity: NormalizedItem["severity"]) {
  if (severity === "critical") return styles.itemCritical;
  if (severity === "warning") return styles.itemWarning;
  return styles.itemInfo;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ResultList({
  items,
  loading,
  error,
  isMock,
  notice,
}: {
  items: NormalizedItem[];
  loading: boolean;
  error?: string;
  isMock?: boolean;
  notice?: string;
}) {
  if (loading) {
    return <div className={styles.state}>取得中...</div>;
  }

  if (error) {
    return <div className={styles.state}>取得できませんでした: {error}</div>;
  }

  return (
    <>
      {isMock && (
        <div className={styles.mockBanner}>
          これはサンプルデータです。
          {notice ?? "実データを表示するには開発者登録が必要です（詳細はREADME参照）。"}
        </div>
      )}
      {items.length === 0 ? (
        <div className={styles.state}>該当する情報はありません。</div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={`${styles.item} ${severityClass(item.severity)}`}>
              <div className={styles.itemTitle}>{item.title}</div>
              <div className={styles.itemBody}>{item.body}</div>
              <div className={styles.itemMeta}>
                <span>{item.sourceName}</span>
                <span>{formatTime(item.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
