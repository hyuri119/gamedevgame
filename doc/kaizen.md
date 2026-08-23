# 改善タスクリスト（kaizen.md）

> 実行エージェント向けの手順書。各タスクは**1コミット単位・独立実行可能**に書いてある。
> 必ず先に `AGENTS.md` を読むこと（コミットルール・技術スタック・注意点が書いてある）。

## 実行上の注意（全タスク共通）

- 技術スタック: Vite + TypeScript + Svelte 5（runes: `$state` / `$derived` / `$effect` / `$props`）。共有状態は `src/lib/*.svelte.ts` に置く
- **コードにコメントを追加しない**（既存コメントは維持）
- コミットメッセージは日本語で簡潔に（例: `続編名の連番化: 2→3→…と増えるよう修正`）
- 各タスク完了後は必ず次を全て通してからコミットする:
  ```
  npm install        # 初回のみ
  npm run check      # svelte-check（型チェック）
  npm test           # vitest
  npm run build      # 本番ビルド
  ```
- 1タスク = 1コミット。複数タスクをまとめてコミットしない
- バランス数値（仮置き）を変更した場合は、テストが落ちたら**テストの期待値ではなく数値側**を疑うこと（テストは「10年で黒字化」「40年破綻しない」等の健全性チェック）

## タスク実行順の依存関係

```
タスク1 → タスク11（導入系）→ タスク2〜8（小修正、順不同）→ タスク9 → タスク10
```

- **タスク2〜8 は必ず タスク9（ファイル分割）の前にやること**（行番号がズレるため）
- タスク9・10 は行数が多いリファクタ。1ステップごとに `npm run check && npm test` を回すこと

---

## タスク1: テストのコミット＋AGENTS.md更新【優先】

現状、テスト（`tests/simulation.test.ts`）と vitest 導入（`package.json` 変更）が**未コミット**で放置されている。まずこれを確定させる。

### やること
1. `git status` で `tests/`（未追跡）、`package.json`、`package-lock.json`、`AGENTS.md`（変更済み）を確認
2. `AGENTS.md` の「lint / test は未設定。必要になったら追加する」を「`npm run test` — vitest によるバランスシミュレーションテスト（`tests/`）」に書き換え、「実行方法」セクションにも `npm run test` を追記
3. `npm test` が通ることを確認
4. 上記4ファイルのみをステージしてコミット（他に変更が混ざっていないこと）

### 検証
- `npm test` で3テスト全てパス
- `git status` が綺麗になる（このタスク対象ファイルについて）

---

## タスク2: アーケード完成時の能力値を effStats に統一【バグ修正】

`completeArcade` だけ素の能力値 `e[key]` を使っており、職業ボーナスが反映されない（他は全て `effStats()` 使用）。

### 対象
- `src/lib/game.svelte.ts` の `completeArcade()` 内、約796〜798行目:
  ```ts
  const avg = (key: 'fun' | 'creativity' | 'graphics' | 'music') =>
    game.employees.reduce((s, e) => s + e[key], 0) / n;
  ```

### やること
- 同ファイルの `completeDev()`（約1220行）や `completeDlc()`（約1139行）と同じ書き方に揃える:
  ```ts
  const avg = (key: keyof RoleBonus) =>
    game.employees.reduce((s, e) => s + effStats(e)[key], 0) / n;
  ```

### コミット例
`アーケード完成時の能力計算をeffStatsに統一（職業ボーナス未反映のバグ修正）`

---

## タスク3: 続編名の連番化【バグ修正】

続編名が常に「元名+2」のため、続編の続編が全部「〜2」になる。

### 対象
- `src/lib/game.svelte.ts` の `startSequel()`、約925行目: `name: hof.name + '2'`

### やること
- 末尾が数字ならインクリメント、違えば「2」を付ける。例:
  ```ts
  const seqName = (base: string): string => {
    const m = base.match(/^(.*?)(\d+)$/);
    return m ? `${m[1]}${Number(m[2]) + 1}` : `${base}2`;
  };
  ```
  （`seqName` は `startSequel` の前かファイル内の適切な位置に置く）
- `name: seqName(hof.name)` に変更

### コミット例
`続編名を連番化（〜2 → 〜3 と増えるよう修正）`

---

## タスク4: スカウトのシャッフルを Fisher-Yates に修正【バグ修正】

`sort(() => Math.random() - 0.5)` は偏る。

### 対象
- `src/lib/game.svelte.ts` の `scout()`、約627行目:
  ```ts
  const shuffled = [...unhired].sort(() => Math.random() - 0.5);
  ```

### やること
- Fisher-Yates に置き換え:
  ```ts
  const shuffled = [...unhired];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  ```

### コミット例
`スカウトの抽選をFisher-Yatesシャッフルに修正（偏りの解消）`

---

## タスク5: 開発開始時の検証追加（ライセンス・販売終了ハード）【バグ修正】

`startDev` / `startSequel` に検証がなく、UIを経由しない呼び出しだと無ライセンス・販売終了ハードで開発できてしまう（UI側 `App.svelte` 約78〜86行のフィルタに依存している）。

### 対象
- `src/lib/game.svelte.ts` の `startDev()`（約892行）と `startSequel()`（約916行）

### やること
両関数の序盤（`studio.dev = ...` の前）に以下を追加:

1. ライセンス検証（自社ハード・PCは `hasLicense()` が true を返すのでそのまま使える）:
   ```ts
   if (!hasLicense(hardwareId)) {
     game.lastReport = `${hwName(hardwareId)} のライセンスが未取得です`;
     return;
   }
   ```
2. ハードの発売期間検証（アーケード基板・未発売・販売終了を除外）:
   ```ts
   const hw = findHardware(hardwareId);
   if (!hw || hw.type === 'arcade') return;
   const y = currentYear();
   if (hw.releaseYear > y || (hw.endYear != null && hw.endYear < y)) {
     game.lastReport = `${hw.name} は現在開発対象にできません`;
     return;
   }
   ```
   - `startSequel` は `hof.hardwareId` に対して同様に検証する
   - `findHardware` はファイル内にある非公開関数（約269行）。`startDev` は既に `findHardware` を呼んでいるので、既存の変数を再利用してよい

### コミット例
`開発開始時にライセンス・ハード発売期間の検証を追加`

---

## タスク6: 普及台数のピーク後減衰【バランス変更】

`effectiveInstallBase` がピーク（発売5年）以降も生涯普及台数のまま固定で、販売終了ハードでも上限が効き続ける。

### 対象
- `src/lib/game.svelte.ts` の `effectiveInstallBase()`、約336〜342行目

### やること
- ピーク後は毎年10%ずつ減衰（下限20%）。数値は仮置き:
  ```ts
  export function effectiveInstallBase(id: string, year: number): number {
    const hw = findHardware(id);
    if (!hw || hw.installBase == null) return 0;
    const age = year - hw.releaseYear;
    let factor = Math.min(1, (age + 1) / PEAK_YEARS);
    if (age >= PEAK_YEARS) {
      factor *= Math.max(0.2, Math.pow(0.9, age - PEAK_YEARS + 1));
    }
    return Math.round(hw.installBase * factor);
  }
  ```
- この関数は売上期待値と自社ハード収益（`advanceWeek` 内）の両方で使われる。減衰率・下限はバランス仮置きなので、テスト結果を見て微調整してよい（`AGENTS.md`「直近のバランス調整」欄に変更内容を追記すること）

### 検証の注意
- `npm test` の「10年で黒字化」「40年破綻しない」が通ること。落ちたら減衰を緩める方向で調整

### コミット例
`普及台数にピーク後減衰を導入（旧ハードの市場縮小を表現、数値は仮置き）`

---

## タスク7: セーブのバージョニング【リファクタ】

セーブデータにバージョン番号がなく、`loadGame` 内のアドホックな移行コードが肥大化している。

### 対象
- `src/lib/game.svelte.ts` の `saveGame()`（約1620行）/ `loadGame()`（約1627行）/ `peekSlot()`（約1675行）

### やること
1. 定数 `const SAVE_VERSION = 1;` を追加
2. `saveGame` は `{ version: SAVE_VERSION, state: $state.snapshot(game) }` を JSON 化
3. `loadGame` は:
   - パース結果に `version` がなければ旧形式（生データ）として扱い `state = raw`、あれば `state = raw.state`
   - 既存の旧セーブ移行コード（`studio.onSale` 移行・`jobLevels` 初期化・`storeFee` 補完等、約1640〜1668行）はそのまま**移行処理として残す**（将来はバージョン番号で分岐できるよう構造化するだけでよい）
4. `peekSlot` も新形式（`d.state.week` / `d.state.money`）と旧形式の両方を読めるようにする

### 検証の注意
- ブラウザで既存セーブが読めること（`npm run dev` で手動確認できれば望ましい。できなければ既存形式のJSONを `loadGame` に通す単体テストを1本追加）

### コミット例
`セーブデータにバージョン番号を導入し読込処理を構造化`

---

## タスク8: モジュール読込時の loadGame 副作用を分離【リファクタ】

`game.svelte.ts` の末尾（約1695行）で `loadGame(0)` が import 時に実行される。テストで localStorage スタブが必要になる原因。

### 対象
- `src/lib/game.svelte.ts` 末尾（約1695行）の `loadGame(0);`
- `src/main.ts`

### やること
1. `game.svelte.ts` 末尾の `loadGame(0);` を削除
2. `src/main.ts` で `import { loadGame } from './lib/game.svelte'` し、`mount()` より前に `loadGame(0);` を呼ぶ
3. テスト側の localStorage スタブ（`tests/simulation.test.ts` 約4〜8行）はそのまま残してよい（`saveGame` は `advanceWeek` 内で呼ばれるため）

### 検証の注意
- `npm run dev` でブラウザを開き、前回のセーブが自動読込されることを確認（セーブ→リロードで再現できる）

### コミット例
`セーブの自動読込をmain.tsに移動（モジュール副作用の分離）`

---

## タスク9: game.svelte.ts のドメイン別分割【大規模リファクタ】

1700行弱の単一ファイルを分割する。**タスク2〜8 を全て終えてから着手すること。**

### 方針
- `$state` を使うファイルは必ず `.svelte.ts` 拡張子にする
- 共有状態 `game` は1箇所に定義し、他モジュールは import して参照する（`$state` オブジェクトのプロパティ変更はどこからでもリアクティブに効く）
- `game.svelte.ts` は**バレル（再exportのみ）にして残す**。`App.svelte` とテストの import パスは全て `./lib/game.svelte` / `../src/lib/game.svelte` なので、これを維持すれば他ファイルの変更不要

### 分割案（例。細かい命名は既存コードの語彙に合わせること）
| ファイル | 内容 |
|---|---|
| `src/lib/state.svelte.ts` | インターフェース群・定数・`initialState`・`game`・`year()/month()/currentYear()`・`resetGame()` |
| `src/lib/employees.svelte.ts` | `hire/fire/scout/train/evolve/switchJob/effStats/jobLevel` 等 |
| `src/lib/development.svelte.ts` | `startDev/startSequel/finishGame/completeDev`・スタジオ発足・買収・受注 |
| `src/lib/sales.svelte.ts` | `ship/restock/disposeCatalog`・カタログ/ロングテール・DLC・ストア |
| `src/lib/hardware.svelte.ts` | 自社ハード・アーケード・移植 |
| `src/lib/events.svelte.ts` | デックス・コンテスト・ランダムイベント |
| `src/lib/save.svelte.ts` | `saveGame/loadGame/peekSlot` 系（タスク7後なら整理済みのはず） |

### 進め方（重要）
1. **1モジュールずつ移動**し、移動のたびに `npm run check && npm test` を実行
2. 循環 import が出たら `state.svelte.ts` に集約して解消
3. 全移動後に `game.svelte.ts` をバレル化し、最後に `npm run build`
4. コミットは「分割完了」の1回でよい（途中経過はコミットしない）

### コミット例
`game.svelte.tsを状態/社員/開発/販売/ハード/イベント/セーブの7モジュールに分割`

---

## タスク10: App.svelte のコンポーネント分割【大規模リファクタ】

1000行超の `App.svelte` を、タブ・モーダルごとに分離する。**タスク9 の後に着手。**

### 方針
- 既存の `src/lib/Modal.svelte` の書き方に倣う。新コンポーネントも `src/lib/` に配置
- Svelte 5 の `$props()` で props 受け渡し
- 候補（`App.svelte` 内の `activeTab` に対応するタブ・モーダルを目視で確認して切ること）:
  - `HireModal.svelte`（スカウト・雇用）
  - `DevModal.svelte`（新規開発・続編）
  - `StudioModal.svelte`（スタジオ一覧・発足・買収）
  - `LicenseModal.svelte`（ハード・ライセンス）
  - `CatalogModal.svelte`（カタログ・出荷・DLC）
  - `ContractModal.svelte`（受注開発）
  - 年俸・資金系のヘッダは本体に残してよい
- 状態（`game`）は子コンポーネントが直接 `import` してよい（既存の `OfficeCanvas.svelte` 等と同じパターン）

### 進め方
1. **1コンポーネントずつ**切り出し、そのたびに `npm run check && npm run build`
2. 全切り出し後、見た目と操作が変わっていないことを `npm run dev` で手動確認

### コミット例
`App.svelteをモーダル単位でコンポーネント分割`

---

## タスク11: lint / formatter 導入（biome）

### やること
1. `npm i -D @biomejs/biome`
2. `biome.json` を作成（formatter: インデントは既存コードに合わせて**スペース2**。lint は既定の推奨ルールから開始し、既存コードと衝突して修正コストが大きいルールは無効化してよい）
3. `package.json` に `"lint": "biome check ."` と `"format": "biome format --write ."` を追加
4. `npx biome check --write src tests` で一括整形（ロジック変更禁止。整形のみ）
5. `npm run check && npm test && npm run build` で動作確認
6. `AGENTS.md` の「実行方法」に lint コマンドを追記

### 注意
- 整形による大量差分は**このタスク単独のコミット**にする（他タスクと混ぜない）

### コミット例
`biomeによるlint・フォーマット導入と一括整形`

---

## 要人間レビュー（機能追加系・ここでは着手しない）

以下は仕様の判断が絡むため、実行エージェントは勝手に実装しない。`doc/siyou.md` の該当節を人間と確認してから別タスク化する。

| 項目 | 仕様 | 概要 |
|---|---|---|
| 借金システム | §2 | 資金不足時に銀行借入（返済期限1年・年利30%）。現在は資金<0で即破産 |
| ストレス・雇用上限 | §3.1 / §3.8 | ストレス0〜100・休憩室、オフィス規模による社員数上限 |
| 競合データの活用 | §3.10 | `data/software.json`（137本）が未使用。売上ランキング・発売日被り・市場競争 |
| ランキング・周回 | §3.7 / §3.9 | 到達時間ランキング・ソフト売上ランキング・2周目引き継ぎ |
| イベント拡充 | §3.6 | 雑誌取材の詳細化・引き抜き交渉・高度なプログラム挑戦 |
| オフィス移転・設計 | §3.8 / §4.4 | 小→中→大規模移転、机配置で効率変化 |
| 運営型・スマホ | §4.6 | ライブサービス収益モデル、スマホハード追加 |
| バランス本調整 | §10 | `tests/simulation.test.ts` のシミュレーションで到達率・係数をキャリブレーション |
