# 速報ハブ

電車遅延・渋滞情報・地震/災害・天気をジャンルごとに選び、路線や地域まで絞り込んで一元的に確認できるアプリ。すべて無料のデータソースのみで構成しています。

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 を開く（`.claude/launch.json` 経由でBrowserプレビューを使う場合はポート3100）。

## データソース

| ジャンル | ソース | 登録 |
|---|---|---|
| 天気 | [気象庁 天気予報API](https://www.jma.go.jp/bosai/forecast/) | 不要 |
| 地震・災害 | [P2P地震情報API](https://www.p2pquake.net/) | 不要 |
| 電車遅延 | [ODPT(公共交通オープンデータセンター)](https://developer-dc.odpt.org/) | **要登録**(無料) |
| 渋滞情報 | [JARTICオープンデータ](https://www.jartic-open-traffic.org/) | **要登録**(無料) |

電車遅延・渋滞情報は現在サンプルデータを表示しています。実データに切り替えるには以下の手順が必要です。

### 電車遅延を実データにする

1. https://developer-dc.odpt.org/ で開発者登録し、アクセストークンを取得する
2. `src/lib/sources/train.ts` の TODO コメントを参照し、ODPTの `odpt:TrainInformation` API を呼び出す実装に差し替える

### 渋滞情報を実データにする

1. https://www.jartic-open-traffic.org/ で利用規約に同意し、APIキーを取得する
2. `src/lib/sources/traffic.ts` の TODO コメントを参照し、JARTICの交通量APIを呼び出す実装に差し替える（取得できるのは交通量であり、渋滞度への変換ロジックが別途必要）

## 構成

- `src/lib/types.ts`: ジャンル横断の正規化データ形式(`NormalizedItem`)
- `src/lib/genres.ts`: ジャンルごとの選択肢・メタ情報(単一の設定源)
- `src/lib/sources/*.ts`: ジャンルごとの外部APIアダプタ
- `src/lib/cache.ts`: 無料APIへの過剰アクセスを避けるための簡易インメモリキャッシュ
- `src/app/api/[genre]/route.ts`: フロントから叩くAPI Route
- `src/app/[genre]/page.tsx` + `src/components/GenreView.tsx`: ドリルダウン画面
