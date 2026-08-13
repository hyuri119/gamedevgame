# AGENTS.md

すべて日本語で記述を行うようにしてください。

## 実行方法

- `npm install` — 依存導入（初回のみ）
- `npm run dev` — 開発サーバ（http://localhost:5173）
- `npm run build` — 本番ビルド（`dist/` に出力）
- `npm run check` — 型チェック（svelte-check）。undefined アクセス等の見落としを検出するので、変更後は必ず実行
- lint / test は未設定。必要になったら追加する

## 構成

- `src/` — Svelte 5 + TypeScript。UI（メニュー・表・ダイアログ）は DOM、オフィス画面のみ Canvas 2D
  - `src/lib/game.svelte.ts` — ゲーム状態（Svelte 5 の runes `$state` で共有）とゲームロジック
  - `src/lib/data.ts` — `data/*.json` と `data/kumiawase.csv` の読込・パース
- `data/` — データ駆動の JSON（ハード・競合ソフト・社員・解放年）と `kumiawase.csv`（内容×ジャンル相性表）
- `doc/siyou.md` — マスター仕様書（すべて日本語）

## ドキュメント

- `doc/siyou.md` — マスター仕様書。ゲーム会社経営シム（「ゲーム発展途上國2DX」のリメイク）。コアループ・社員・開発・ハード・テナント・イベント、新機能（スタジオ発足・買収・アーケード・運営型）
- `data/kumiawase.csv` — 内容×ジャンル相性（79内容×20ジャンル）。**UTF-8 with BOM**。マーク: `☆`傑作 / `◎`独創的 / `◯`まあ良い / `◇`なし / `△`微妙 / `✕`悪い。半角カナあり（例 `ﾌｧﾝﾀｼﾞｰ`）
- `data/hardware.json` — ハード時系列（1983〜現在、家庭用/携帯/VR/PC 41機種＋アーケード基板10種）。ゲーム内はパロディ名（`realName` が史実）。数値は国内概算
- `data/software.json` — 競合リリース（`games` 137本＋`arcadeGames` 15本）。`genre`/`content` は kumiawase.csv と**完全一致**（半角カナ含む）。`content: "なし"` は相性なし

## 注意点

- テックスタックは**確定**: Vite + TypeScript + Svelte 5（runes）。UI は DOM、オフィス画面のみ Canvas
- Svelte 5 の runes（`$state` 等）を使う。共有状態は `src/lib/*.svelte.ts` に置く
- `data/kumiawase.csv` は `?raw` で文字列 import し自前パース（`src/lib/data.ts`）。BOM は除去済み
- ミニゲーム（ポーカー等）は対象外。カジノ/ナゾプンテは再設計が必要
- バランス設計は `doc/siyou.md` §10（売上=普及台数×到達率）。数値は仮置き
