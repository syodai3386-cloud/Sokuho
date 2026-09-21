import type { NormalizedItem } from "@/lib/types";
import { WeatherCard } from "./WeatherCard";
import { Badge, Banner, StateBox, cx } from "./ui";
import ui from "./ui.module.css";

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
  warnings,
  emptyMessage,
}: {
  items: NormalizedItem[];
  loading: boolean;
  error?: string;
  isMock?: boolean;
  notice?: string;
  warnings?: string[];
  emptyMessage?: string;
}) {
  if (loading) {
    return <StateBox>取得中...</StateBox>;
  }

  const banners = (warnings ?? []).map((w) => <Banner key={w}>{w}</Banner>);

  if (error) {
    return (
      <>
        {banners}
        <StateBox>取得できませんでした: {error}</StateBox>
      </>
    );
  }

  return (
    <>
      {banners}
      {isMock && (
        <Banner>
          これはサンプルデータです。
          {notice ?? "実データを表示するには開発者登録が必要です（詳細はREADME参照）。"}
        </Banner>
      )}
      {items.length === 0 ? (
        <StateBox>{emptyMessage ?? "該当する情報はありません。"}</StateBox>
      ) : (
        <div className={ui.stack}>
          {items.map((item) =>
            item.weather ? (
              <WeatherCard key={item.id} item={item} />
            ) : (
              <article key={item.id} className={cx(ui.card, ui.item)}>
                <div className={ui.itemHead}>
                  <h2 className={ui.itemTitle}>{item.title}</h2>
                  {item.badge && <Badge tone={item.severity ?? "info"}>{item.badge}</Badge>}
                </div>
                <p className={ui.itemBody}>{item.body}</p>
                <div className={ui.itemMeta}>
                  <span>{item.sourceName}</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </>
  );
}
