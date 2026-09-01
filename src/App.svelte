<script lang="ts">
  import {
    game,
    year,
    month,
    currentYear,
    advanceWeek,
    ship,
    resetGame,
    shipCap,
    hasLicense,
    man,
    devTarget,
    setAutoExhibit,
    maxEmployees,
    currentOffice,
    weekOfMonth
  } from './lib/game.svelte';
  import { hardware } from './lib/data';
  import OfficeCanvas from './lib/OfficeCanvas.svelte';
  import SalesChart from './lib/SalesChart.svelte';
  import HireModal from './lib/HireModal.svelte';
  import DevModal from './lib/DevModal.svelte';
  import StudioModal from './lib/StudioModal.svelte';
  import ContractModal from './lib/ContractModal.svelte';
  import ArcadeModal from './lib/ArcadeModal.svelte';
  import HardwareModal from './lib/HardwareModal.svelte';
  import ManageModal from './lib/ManageModal.svelte';
  import CatalogModal from './lib/CatalogModal.svelte';
  import DlcModal from './lib/DlcModal.svelte';
  import AchievementsModal from './lib/AchievementsModal.svelte';
  import SaveModal from './lib/SaveModal.svelte';
  import DecksModal from './lib/DecksModal.svelte';

  const availableHardware = $derived(
    hardware.hardware.filter(
      (h) =>
        h.type !== 'arcade' &&
        h.installBase != null &&
        h.releaseYear <= currentYear() &&
        (h.endYear == null || h.endYear >= currentYear())
    )
  );

  const licensedHardware = $derived(availableHardware.filter((h) => hasLicense(h.id)));

  const busyStudios = $derived(game.studios.filter((s) => s.dev || s.completed || s.contractId || s.dlc));

  // モーダル状態
  let activeTab = $state('');

  $effect(() => {
    if (game.event) activeTab = '';
  });

  // DLC制作（スタジオ選択ダイアログ）
  let dlcTarget = $state<number | null>(null);
  const dlcTargetGame = $derived(dlcTarget != null ? game.catalog[dlcTarget] : undefined);

  // 自動進行（放置）
  let auto = $state(false);
  let autoSpeed = $state(1);

  $effect(() => {
    if (!auto || game.gameOver || game.event) return;
    const t = setInterval(() => advanceWeek(), 5000 / autoSpeed);
    return () => clearInterval(t);
  });

  const hint = $derived(
    game.gameOver
      ? 'ゲームオーバー（ブラウザをリロードで再挑戦）'
      : game.employees.length === 0
        ? 'まず社員をスカウトしよう'
        : licensedHardware.length === 0 && game.ownHardware.length === 0
          ? 'ハードのライセンスを取得しよう'
          : busyStudios.length > 0
            ? '「次の週へ」を押して開発・販売を進めよう'
            : '開発を始めよう'
  );

  const bugCleared = (bug: number) => Math.max(0, Math.min(100, 100 - (bug / 30) * 100));
</script>

<main>
  <header>
    <h1>ゲーム会社経営シミュレーション</h1>
    <div class="bar">
      <span class="money">資金: {man(game.money)}</span>
      <span>{year()}年 {month()}月 {weekOfMonth()}週目</span>
      <span>累計販売: {game.totalSales.toLocaleString()}本</span>
      <span>知名度: {game.fame}</span>
      <span>スタジオ: {game.studios.length}</span>
      <span>オフィス: {currentOffice().name}（社員 {game.employees.length}/{maxEmployees()}）</span>
    </div>
    <p class="hint">▶ 次にやること: {hint}</p>
    <div class="controls">
      <button onclick={advanceWeek} disabled={game.gameOver}>次の週へ ▶</button>
      <button onclick={() => (auto = !auto)} disabled={game.gameOver}>{auto ? '⏸ 停止' : '▶ 自動進行'}</button>
      {#if auto}
        <select bind:value={autoSpeed}>
          <option value={0.5}>0.5x（10秒/週）</option>
          <option value={1}>1x（5秒/週）</option>
          <option value={2}>2x（2.5秒/週）</option>
          <option value={5}>5x（1秒/週）</option>
        </select>
      {/if}
      <button onclick={() => (activeTab = 'save')}>セーブ/ロード</button>
      <button onclick={resetGame}>リセット</button>
      <label class="toggle">
        <input type="checkbox" checked={game.autoExhibit} onchange={(e) => setAutoExhibit(e.currentTarget.checked)} />
        デックス自動出展
      </label>
    </div>
    <p class="report">{game.lastReport}</p>
    {#if game.gameOver}
      <p class="gameover">破産しました（ゲームオーバー）</p>
    {/if}
  </header>

  <section class="top">
    <div class="chart-box">
      <h2>売上グラフ</h2>
      <SalesChart />
    </div>
    <div class="office-box">
      <h2>オフィス</h2>
      <OfficeCanvas />
    </div>
  </section>

  <section class="progress">
    <h2>進捗</h2>
    {#each game.studios.filter((s) => s.dev) as s (s.id)}
      <div class="prow">
        <span class="plabel">{s.name}: 「{s.dev!.name}」{s.dev!.stage}</span>
        {#if s.dev!.stage === '開発'}
          <progress value={Math.min(100, (s.dev!.progress / devTarget(s.dev!.hardwareId)) * 100)} max={100}></progress>
          <span class="pct">{Math.floor(Math.min(100, (s.dev!.progress / devTarget(s.dev!.hardwareId)) * 100))}%</span>
        {:else}
          <progress value={bugCleared(s.dev!.bug)} max={100}></progress>
          <span class="pnote">バグ {Math.floor(s.dev!.bug)}</span>
        {/if}
      </div>
    {/each}
    {#if game.activeContract}
      <div class="prow">
        <span class="plabel">受注: 「{game.activeContract.name}」</span>
        <progress value={Math.min(100, (game.activeContract.progress / game.activeContract.target) * 100)} max={100}></progress>
        <span class="pct">{Math.floor(Math.min(100, (game.activeContract.progress / game.activeContract.target) * 100))}%</span>
      </div>
    {/if}
    {#if game.hwProject}
      <div class="prow">
        <span class="plabel">自社ハード: 「{game.hwProject.name}」</span>
        <progress value={Math.min(100, (game.hwProject.progress / game.hwProject.target) * 100)} max={100}></progress>
        <span class="pct">{Math.floor(Math.min(100, (game.hwProject.progress / game.hwProject.target) * 100))}%</span>
      </div>
    {/if}
    {#if game.arcadeProject}
      <div class="prow">
        <span class="plabel">アーケード: 「{game.arcadeProject.name}」{game.arcadeProject.stage}</span>
        {#if game.arcadeProject.stage === '開発'}
          <progress value={Math.min(100, game.arcadeProject.progress / 1.2)} max={100}></progress>
          <span class="pct">{Math.floor(Math.min(100, game.arcadeProject.progress / 1.2))}%</span>
        {:else}
          <progress value={bugCleared(game.arcadeProject.bug)} max={100}></progress>
          <span class="pnote">バグ {Math.floor(game.arcadeProject.bug)}</span>
        {/if}
      </div>
    {/if}
    {#each game.studios.filter((s) => s.completed) as s (s.id)}
      <div class="prow">
        <span class="plabel">{s.name}: 「{s.completed!.name}」完成（レビュー {s.completed!.reviewScore}点）</span>
        <button onclick={() => ship(Math.min(s.completed!.expectedSales, shipCap()), s.id)}>
          出荷（{Math.min(s.completed!.expectedSales, shipCap()).toLocaleString()}本）
        </button>
        <button onclick={() => (activeTab = 'dev')}>詳細</button>
      </div>
    {/each}
    {#each game.sales as sale, i (sale.game.name + i)}
      <div class="prow">
        <span class="plabel">販売中: 「{sale.game.name}」</span>
        <span class="pnote">在庫 {sale.inventory.toLocaleString()}本（{sale.game.weeksOnSale}週目）</span>
      </div>
    {/each}
    {#if game.studios.filter((s) => s.dev).length === 0 && game.studios.filter((s) => s.completed).length === 0 && game.sales.length === 0 && !game.activeContract && !game.hwProject && !game.arcadeProject}
      <p class="pnote">進行中の開発・出荷待ちの作品はありません</p>
    {/if}
  </section>

  <nav class="ribbon">
    <button onclick={() => (activeTab = 'dev')}>開発</button>
    <button onclick={() => (activeTab = 'staff')}>社員（{game.employees.length}）</button>
    <button onclick={() => (activeTab = 'studio')}>スタジオ（{game.studios.length}）</button>
    <button onclick={() => (activeTab = 'contract')}>受注</button>
    <button onclick={() => (activeTab = 'arcade')}>アーケード</button>
    <button onclick={() => (activeTab = 'hw')}>ハード</button>
    <button onclick={() => (activeTab = 'manage')}>経営</button>
    <button onclick={() => (activeTab = 'catalog')}>カタログ（{game.catalog.length}）</button>
    <button onclick={() => (activeTab = 'ach')}>実績</button>
  </nav>

  {#if activeTab === 'dev'}
    <DevModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'staff'}
    <HireModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'studio'}
    <StudioModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'contract'}
    <ContractModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'arcade'}
    <ArcadeModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'hw'}
    <HardwareModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'manage'}
    <ManageModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'catalog'}
    <CatalogModal onDlcRequest={(i) => (dlcTarget = i)} onclose={() => (activeTab = '')} />
  {/if}

  {#if dlcTarget != null && dlcTargetGame}
    <DlcModal target={dlcTarget} onclose={() => (dlcTarget = null)} />
  {/if}

  {#if activeTab === 'ach'}
    <AchievementsModal onclose={() => (activeTab = '')} />
  {/if}

  {#if activeTab === 'save'}
    <SaveModal onclose={() => (activeTab = '')} />
  {/if}

  {#if game.event?.type === 'decks'}
    <DecksModal />
  {/if}
</main>

<style>
  :global(body) {
    font-family: sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 16px;
    color: #222;
  }
  main {
    padding-bottom: 96px;
  }
  h1 {
    font-size: 1.3rem;
  }
  header {
    border-bottom: 2px solid #ccc;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
  .bar {
    display: flex;
    gap: 16px;
    font-weight: bold;
    margin: 8px 0;
    flex-wrap: wrap;
  }
  .money {
    color: #0a7a0a;
  }
  .hint {
    background: #eef;
    border: 1px solid #99c;
    border-radius: 4px;
    padding: 6px 10px;
    font-weight: bold;
  }
  .controls {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 8px 0;
    flex-wrap: wrap;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
  }
  .gameover {
    color: #c00;
    font-weight: bold;
  }
  .report {
    color: #555;
    font-size: 0.9rem;
  }
  .ribbon {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
    background: #2b2b2b;
    padding: 8px;
    z-index: 5;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.35);
  }
  .ribbon button {
    background: #fff;
    border: 1px solid #999;
    border-radius: 4px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .ribbon button:hover {
    background: #e8f0ff;
  }
  section {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .top {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .chart-box {
    flex: 1;
    min-width: 320px;
  }
  .office-box {
    flex: 0 0 340px;
  }
  .office-box h2,
  .chart-box h2 {
    margin-top: 0;
  }
  .progress .prow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0;
  }
  .plabel {
    min-width: 220px;
    font-size: 0.9rem;
  }
  .prow progress {
    flex: 1;
  }
  .pct {
    font-size: 0.85rem;
    color: #555;
    min-width: 40px;
    text-align: right;
  }
  .pnote {
    color: #888;
    font-size: 0.85rem;
  }
  button {
    cursor: pointer;
  }
</style>
