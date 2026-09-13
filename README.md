# KIZUKU / キヅク

公開アプリ: https://kizuku.ry-thikc1019.workers.dev

プライベートリポジトリ: https://github.com/tera988/kizuku

体・心・つながりの生活記録をふりかえり、本人が選ぶ次の一歩を用意するWebアプリ。React + TypeScript、Cloudflare Workers、D1、Workers AIで構成しています。

## 使い方

- ユーザー名と12文字以上のパスワードでアカウントを作成。記録はアカウントごとにD1へ保存します。
- 「今日を記録」で、わかる項目だけ入力。空欄は0ではなく未記録です。
- 「つながる機器」でAI分析に同意し、「わたしの傾向」からWorkers AIを実行できます。AIが停止していても記録・グラフ・ルールから算出するプランは利用できます。
- プランは選択→日時確認→「お願い」で保存。カレンダーファイルは本人がカレンダーアプリに追加します。買い物リスト、予約希望、連絡文はアプリ内の準備であり、外部の予約・送信・家電操作は実施しません。
- iPhone Safariの共有→ホーム画面に追加で独立した画面として開けます。同期・AI・初回読み込みにはネット接続が必要です。
- 「未来の1日を体験」は架空の60日分のデータ。実データと混在せず、デモ内の変更は再読み込みでリセットします。

## 起動と公開

Node.js 22以上を推奨。依存関係はpackage-lock.jsonに固定しています。

```sh
npm ci
npx wrangler types
npm run build
npx wrangler d1 migrations apply kizuku-db --local
npx wrangler dev --port 8791
```

開発中のフロントエンドは別ターミナルで `npm run dev`。ViteのAPIプロキシは8791を利用します。

```sh
npx wrangler login
npx wrangler d1 migrations apply kizuku-db --remote
npm run deploy
```

wrangler.jsoncのDB IDはこのプロジェクト専用の本番DBを指します。別アカウントに移すときは新しいD1を作成し、そのIDとWorker名を更新してください。認証トークンや利用者データはGitに含めません。

## 自動連携 API v1

機器メーカーのOAuthやApple HealthKitとの直接接続は未実装。現時点で動作するのはトークン認証付き受信APIです。iPhoneショートカットの「ヘルスケアサンプルを検索」等で本人が許可した値を取得し、「URLの内容を取得」でPOSTする構成が可能です。ショートカット自身の設定・自動実行の可否・取得対象はiOSの権限に依存し、Webサイトだけではヘルスケアを読めません。

「つながる機器」からキーを発行し、次の形式で送信します。発行し直すと以前のキーは無効になります。キーはサーバーにSHA-256ハッシュのみを保存します。

```http
POST /api/ingest
Authorization: Bearer YOUR_INTEGRATION_TOKEN
Content-Type: application/json
```

```json
{
  "date": "2026-09-13",
  "time": "07:00",
  "source": "watch",
  "externalId": "sleep-2026-09-13",
  "title": "ヘルスケアから睡眠",
  "values": { "sleep": 7.5, "steps": 5200 },
  "note": "",
  "estimated": false
}
```

- `source`: watch / glasses / necklace / mirror / scale / ac / weather / calendar / booking
- `externalId`: 同じユーザー・source・externalIdの再送は更新。異なる観測には異なるIDを使用。
- 各数値の名称・単位・範囲は `src/data.ts` のmetrics、受信検証は `worker/index.ts`。
- 日付と時刻は日本時間。睡眠時間は時間、歩数は歩、会話は分。日次集計は同日の最後の観測値を使います。累積歩数を複数回送る場合も加算せず更新する仕様です。
- データソースをオフにすると新規受信を拒否（409）、既存データは表示・分析から除外。再度オンにすると復帰。
- キー無効化・アカウント削除で受信権限を即時失効。生の音声や写真を受け付けるAPIはありません。
- 今後は各プロバイダーの同意・認証・同期アダプターを追加し、この共通形式に変換します。

## データとAI

D1: users / sessions / records / settings / plans / integration_tokens / usage。セッションCookieはHttpOnly・Secure・SameSite=Strict、期限30日。パスワードはランダムsaltとPBKDF2-SHA256（100,000回）。すべての利用者データの読み書きはセッションのuser_idを条件にします。入力検証、サイズ制限、同一Origin確認、APIレート制限を実施。

Workers AI: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`。明示的な設定同意と分析ボタンの操作時だけ実行。直近30日・最大180件の数値、日付、sourceを送り、メモ・タイトル・ユーザー名は送りません。1ユーザーあたりUTC日単位10回、アプリ全体500回まで。AI Todayや条件別プランは説明可能なルールから作成し、生成AIの回答と区別しています。

スコアは睡眠8時間・歩数8,000歩を基準にした体、自己評価から算出する心、会話60分を基準にしたつながりの参考値。未記録を除外して平均します。健康診断・医療評価の代わりにはなりません。傾向分析は比較群ごとに3日以上の記録があるときのみ表示し、相関を原因と表現しません。

## 検証

```sh
npm run build
npm test
```

ローカルサーバー8791を起動した状態で実行。Playwrightはインストール済みGoogle Chromeを使用します。別の環境ではplaywright.config.tsのchannelを変更してください。`TEST_URL` で公開環境も検証できます。テストはランダム名の検証用アカウントを作成・削除します。

検証範囲: 375px/1440px表示、5画面、デモ編集・プラン確認・機器停止、認証、D1 CRUD、他人の記録へのアクセス拒否、不正入力、Origin拒否、連携再送・停止・キー失効、アカウント削除。

## 現時点の制限

- パスワード再発行、メール認証、パスキー、機器別OAuth、自動予約・家電操作には未対応です。
- 体験モードの変更はメモリ内のみ。通常モードの記録・設定・プランはD1へ保存します。
- 生成AIの日本語表現や回答品質にはばらつきがあり、診断として使用しません。
- データはCloudflare上で処理・保存されます。アプリのプライバシー設計は第三者への配布機能を持ちませんが、基盤運営者の技術的アクセスを否定するものではありません。

## 公開環境の検証記録

2026-09-13: 375px・1440pxの画面、主要操作、D1のユーザー分離とCRUD、API連携・失効、60秒デモ停止・再開・完走を確認。Workers AIの実応答も一時的な架空データで確認し、検証アカウントを削除しました。実機iPhoneでの検証ではなく、Chromeの375px表示による検証です。
