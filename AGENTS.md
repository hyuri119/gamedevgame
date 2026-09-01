# AGENTS.md

すべて日本語で記述を行うようにしてください。

## 実行方法

- `npm install` — 依存導入（初回のみ）
- `npm run dev` — 開発サーバ（http://localhost:5173）
- `npm run build` — 本番ビルド（`dist/` に出力）
- `npm run check` — 型チェック（svelte-check）。undefined アクセス等の見落としを検出するので、変更後は必ず実行
- `npm run test` — vitest によるバランスシミュレーションテスト（`tests/`）。「10年で黒字化」「40年破綻しない」等の健全性チェック
- `npm run test:watch` — テストの watch 実行
- `npm run lint` — biome による lint / フォーマットチェック（対象: `src/lib/*.ts`・`tests/`）。整形は `npm run format`（`biome format --write .`）

## コミット

- 変更後は `npm run check` を実行し、エラーなしを確認してから**必ずコミット**する
- コミットメッセージは日本語で、変更内容がひと目でわかるよう簡潔に（例: `放置ゲー要素: 売上グラフとオフィスアニメーションを追加`）
- 作業内容が変わったらこのファイルの「現在の進捗」も追記・更新する

## 構成

- `src/` — Svelte 5 + TypeScript。UI（メニュー・表・ダイアログ）は DOM、オフィス画面のみ Canvas 2D
  - `src/lib/game.svelte.ts` — バレル（再exportのみ）。既存の import パスはここ経由を維持する
  - `src/lib/state.svelte.ts` — ゲーム状態（`$state` 共有）・インターフェース・定数・土台ヘルパー
  - `src/lib/employees.svelte.ts` — 社員（雇用・教育・進化・転職）
  - `src/lib/studio.svelte.ts` — スタジオ・開発・受注・出展・コンテスト
  - `src/lib/sales.svelte.ts` — 出荷・カタログ・DLC・ストア
  - `src/lib/hardware.svelte.ts` — ハード・ライセンス・自社ハード・アーケード
  - `src/lib/week.svelte.ts` — `advanceWeek()`（週進行・イベント）
  - `src/lib/save.svelte.ts` — セーブ/ロード（`SAVE_VERSION` 付き）
  - `src/lib/*.svelte` — UI コンポーネント（`App.svelte` はヘッダと配置のみ。各タブは `*Modal.svelte`）
  - `src/lib/data.ts` — `data/*.json` と `data/kumiawase.csv` の読込・パース
- `data/` — データ駆動の JSON（ハード・競合ソフト・社員・解放年）と `kumiawase.csv`（内容×ジャンル相性表）
- `doc/siyou.md` — マスター仕様書（すべて日本語）

## ドキュメント

- `doc/siyou.md` — マスター仕様書。ゲーム会社経営シム（「ゲーム発展途上國2DX」のリメイク）。コアループ・社員・開発・ハード・テナント・イベント、新機能（スタジオ発足・買収・アーケード・運営型）
- `data/kumiawase.csv` — 内容×ジャンル相性（79内容×20ジャンル）。**UTF-8 with BOM**。マーク: `☆`傑作 / `◎`独創的 / `◯`まあ良い / `◇`なし / `△`微妙 / `✕`悪い。半角カナあり（例 `ﾌｧﾝﾀｼﾞｰ`）
- `data/hardware.json` — ハード時系列（1983〜現在、家庭用/携帯/VR/PC 41機種＋アーケード基板10種）。ゲーム内はパロディ名（`realName` が史実）。数値は国内概算
- `data/software.json` — 競合リリース（`games` 137本＋`arcadeGames` 15本）。`genre`/`content` は kumiawase.csv と**完全一致**（半角カナ含む）。`content: "なし"` は相性なし
- `doc/kaizen.md` — 改善タスクリスト（実行エージェント向け手順書）。リファクタ・バグ修正はここを上から順に実行する

## 注意点

- テックスタックは**確定**: Vite + TypeScript + Svelte 5（runes）。UI は DOM、オフィス画面のみ Canvas
- Svelte 5 の runes（`$state` 等）を使う。共有状態は `src/lib/*.svelte.ts` に置く
- `data/kumiawase.csv` は `?raw` で文字列 import し自前パース（`src/lib/data.ts`）。BOM は除去済み
- ミニゲーム（ポーカー等）は対象外。カジノ/ナゾプンテは再設計が必要
- バランス設計は `doc/siyou.md` §10（売上=普及台数×到達率）。数値は仮置き

## 現在の進捗

- 実装済みの主な機能: コアループ / 社員スカウト制雇用 / 開発→バグ取り→（バグ0で自動完成）→出荷→カタログ / ライセンス / テナント / テクノロジー / スタジオ発足・買収 / 受注開発 / アーケード / 自社ハード / ゲームデックス（年1回9月の出展選択）/ コンテスト / セーブスロット3つ / 自動進行 / 実績 / DL販売ストア（ベクター1996・スチーム2003）/ **職業進化（複数進化先から選択・転職）** / **DLC制作・販売** / **オフィス規模・移転（社員上限・固定費の家賃）** / **ストレスと休憩室アップグレード（過労で休養・回復率アップ）**
- 職業システム: 基礎能力値（共通）＋ 職業ボーナス（`roles.json` の `bonus` × 職業Lv）。教育で職業Lvも+1、進化で進化先の職業Lv+1。経験済み職業にはいつでも転職でき、その職業のボーナスが適用される（`effStats()` が実効能力を返し、開発・売上ロジックはこれを使う）
- 放置ゲー要素（眺めて楽しい演出）:
  - 売上グラフ（`src/lib/SalesChart.svelte`）: 週次売上（棒）＋累計売上（ライン）。`game.salesHistory` に週次売上・販売本数を記録（400週ぶん保持）
  - オフィス画面（`src/lib/OfficeCanvas.svelte`）: 開発中は社員が机に着いて作業（1机最大3人・進捗バー付き）、売上で+金額とコイン粒子、完成で紙吹雪、サーバーLED/植物/コーヒーマシン等の小物アニメ。社員は色付き円の仮グラフィック（AI生成スプライトに差し替え可能）
  - 自動進行はデックス等のイベント発生中は自動停止
  - 自動進行速度: 0.5x=10秒/週 〜 5x=1秒/週（基準1x=5秒/週）。UIは右上に売上グラフ・オフィスを横並び配置
- 直近のバランス調整（すべて仮置き、要プレイ調整）:
  - `devTarget` = ハード性能(power)×120。PCは `pcPower` で年次成長（1983=1、10年ごと+2）
  - 受注は `speed/10`・初期案件target 40〜60（約1か月）
  - `marketGrowth`（`src/lib/game.svelte.ts`）: 1983=0.1 → 毎年+0.05 → 2001年頃1.0（序盤は売上1/10）
  - `effectiveInstallBase`（`src/lib/game.svelte.ts`）: ピーク（発売5年）後は毎年10%ずつ減衰（下限20%）。旧ハードの市場縮小を表現
  - 販売は `game.sales`（スタジオから分離）で進行。出荷後すぐ次の開発が可能
  - 金額表示は `man()` で万円/億円の短縮表記
- DLC（カタログ作品への追加コンテンツ）: DL対応ハード＋DLストア解禁年以降に「DLC制作」ボタンが出る。スタジオ1つを占有（バグ取りなし・target=power×30・制作費=power×10万円）。本数上限なしでn本目の売上期待値は `expectedSales×10%×0.6^(n-1)` で逓減、価格は本体1/4。完成時レビュー（本編スコア70%+チーム能力+乱数、40点満点）が良いほどDLC売上係数UP(0.7〜1.3)・知名度+2（32点以上）・**本編再燃**（ロングテール上限最大+30%／発売後8週は週次需要ブースト。ブースト中は在庫切れ分もDL販売で売上単価7割）。仕様詳細は `doc/siyou.md` §4.4
- ライセンスUI: ハードモーダルで取得済みを含む全ハード一覧（発売年・現在普及台数・性能・ライセンス料・状態）を表示。スタジオモーダルは各スタジオの状況（開発中/完成品/受注中/DLC制作中/待機）を表示
- リファクタ済み（`doc/kaizen.md` タスク1〜11完了）: `game.svelte.ts` を7モジュールに分割（バレル経由でimport互換維持）/ `App.svelte` を12コンポーネントに分割（1077行→383行）/ セーブの `SAVE_VERSION` 化と旧形式互換 / `loadGame` 副作用を `main.ts` に分離 / 続編名連番化・スカウトFisher-Yates化・開発開始時の検証追加 / biome 導入（lint: `src/lib/*.ts`・`tests/`）
- 未実装・アイデア（`doc/siyou.md` §4 参照）: アップデート配信、運営型ゲーム（§4.6）、カジノ/ナゾプンテ再設計
- オフィス: 規模は小（4人）/中（8人）/大（14人）の3段階。家賃は月1回（第1週）に月額=rent×4を支払い、移転は段階的（中は4年目以降、大は4年目12月以降＋デザイン賞・音楽賞各1回）。`office.svelte.ts` に `officeCatalog/currentOffice/maxEmployees/officeRent/officeDesks/moveOfficeReason/moveOffice` と休憩室（`loungeCatalog/currentLounge/loungeRecovery/loungeRelief/loungeUpgradeCost/upgradeLounge/updateStress`）を集約。休憩室は Lv1〜5（改修費 2000万〜2億円、回復 5〜13/週、ストレス上昇軽減 0〜40%）。`updateStress()` が週次でストレスを更新し、100 で休養（開発から外れ、`activeEmployees()` が対象を返す）。ストレス補正は最大15%低下（`effStats()`）
- テスト（`tests/simulation.test.ts`・全9テスト）: 40年プレイに移転・雇用・休憩室を組み込み、DLC開始の空きスタジオ探索バグを修正（40年でDLC 38本を検証）。オフィス移転条件・社員上限・家賃・ストレス・休憩室改修の単体検証を追加
- 次回候補: バランス数値の本調整 / オフィス設計の追加演出（§3.8・§4.4）
