<script lang="ts">
  import {
    game,
    employeePool,
    year,
    month,
    currentYear,
    advanceWeek,
    hire,
    fire,
    train,
    startDev,
    startSequel,
    ship,
    finishGame,
    exhibitGame,
    saveGame,
    resetGame,
    buyTenant,
    hasTenant,
    shipCap,
    tenantCatalog,
    buyTech,
    hasTech,
    techCatalog,
    effectiveInstallBase,
    compatMark
  } from './lib/game.svelte';
  import { hardware, kumiawase, availableGenres, availableContents } from './lib/data';

  const weekOfMonth = $derived(((game.week - 1) % 4) + 1);

  const genres = $derived(availableGenres(currentYear()));
  const contents = $derived(availableContents(currentYear()));

  const availableHardware = $derived(
    hardware.hardware.filter(
      (h) =>
        h.type !== 'arcade' &&
        h.installBase != null &&
        h.releaseYear <= currentYear() &&
        (h.endYear == null || h.endYear >= currentYear())
    )
  );

  const hiredIds = $derived(new Set(game.employees.map((e) => e.id)));
  const pool = $derived(employeePool.filter((e) => !hiredIds.has(e.id)));

  // 新規開発フォーム
  let devName = $state('私のゲーム');
  let devGenre = $state('');
  let devContent = $state('');
  let devHardware = $state('');

  $effect(() => {
    if (!genres.includes(devGenre)) devGenre = genres[0] ?? '';
    if (!contents.includes(devContent)) devContent = contents[0] ?? '';
  });

  const compat = $derived(compatMark(devGenre, devContent));

  // 出荷
  let shipQty = $state(0);

  const hint = $derived(
    game.gameOver
      ? 'ゲームオーバー（ブラウザをリロードで再挑戦）'
      : game.employees.length === 0
        ? 'まず社員を雇用しよう'
        : game.dev?.stage === '開発'
          ? '「次の週へ」を押して開発を進めよう'
          : game.dev?.stage === 'バグ取り'
            ? '「次の週へ」でバグを減らし、「完成する」で仕上げよう'
            : game.completed
              ? '出荷本数を決めて出荷しよう'
              : game.onSale
                ? '「次の週へ」を押して販売を進めよう'
                : '開発を始めよう'
  );

  const ranking = $derived([...game.releasedGames].sort((a, b) => b.sold - a.sold));

  const achievements = $derived([
    { label: '累計販売10万本', done: game.totalSales >= 100000 },
    { label: '累計販売100万本', done: game.totalSales >= 1000000 },
    { label: '累計販売1000万本', done: game.totalSales >= 10000000 },
    { label: '殿堂入り1本', done: game.hallOfFame.length >= 1 },
    { label: 'グランプリ受賞', done: game.grandPrix >= 1 },
    { label: '知名度50', done: game.fame >= 50 },
    { label: 'テナント3つ', done: game.tenants.length >= 3 }
  ]);

  function onStartDev() {
    const hwId = devHardware || availableHardware[0]?.id;
    if (!hwId) return;
    startDev(devName, devGenre, devContent, hwId);
  }

  function onShip() {
    ship(shipQty || game.completed?.expectedSales || 0);
  }

  const hwName = (id: string) => hardware.hardware.find((h) => h.id === id)?.name ?? id;
</script>

<main>
  <header>
    <h1>ゲーム会社経営シミュレーション</h1>
    <div class="bar">
      <span class="money">資金: ¥{game.money.toLocaleString()}</span>
      <span>{year()}年 {month()}月 {weekOfMonth}週目</span>
      <span>累計販売: {game.totalSales.toLocaleString()}本</span>
      <span>知名度: {game.fame}</span>
    </div>
    <p class="hint">▶ 次にやること: {hint}</p>
    {#if game.gameOver}
      <p class="gameover">破産しました（ゲームオーバー）</p>
    {/if}
    <button onclick={advanceWeek} disabled={game.gameOver}>次の週へ ▶</button>
    <button onclick={saveGame}>セーブ</button>
    <button onclick={resetGame}>リセット</button>
    <p class="report">{game.lastReport}</p>
  </header>

  <section>
    <h2>社員（{game.employees.length}人）</h2>
    {#if game.employees.length === 0}
      <p>まだ誰もいません。下の候補から雇用してください。</p>
    {/if}
    <table>
      <thead>
        <tr>
          <th>名前</th><th>役職</th><th>Lv</th>
          <th>おも</th><th>独創</th><th>画</th><th>音</th><th>速度</th><th>年俸</th><th></th>
        </tr>
      </thead>
      <tbody>
        {#each game.employees as e (e.id)}
          <tr>
            <td>{e.name}</td><td>{e.role}</td><td>{e.level}</td>
            <td>{e.fun}</td><td>{e.creativity}</td><td>{e.graphics}</td><td>{e.music}</td>
            <td>{e.speed}</td><td>{(e.salary / 10000).toLocaleString()}万</td>
            <td>
              <button onclick={() => train(e.id)} disabled={e.level >= 10}>教育</button>
              <button onclick={() => fire(e.id)}>解雇</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <h3>雇用候補</h3>
    <table>
      <thead>
        <tr>
          <th>名前</th><th>役職</th><th>Lv</th>
          <th>おも</th><th>独創</th><th>画</th><th>音</th><th>速度</th>
          <th>契約金</th><th>年俸</th><th></th>
        </tr>
      </thead>
      <tbody>
        {#each pool as e (e.id)}
          <tr>
            <td>{e.name}</td><td>{e.role}</td><td>{e.level}</td>
            <td>{e.fun}</td><td>{e.creativity}</td><td>{e.graphics}</td><td>{e.music}</td>
            <td>{e.speed}</td>
            <td>{(e.contract / 10000).toLocaleString()}万</td>
            <td>{(e.salary / 10000).toLocaleString()}万</td>
            <td><button onclick={() => hire(e.id)}>雇用</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h2>開発</h2>
    {#if game.dev}
      {#if game.dev.stage === '開発'}
        <p>開発中: 「{game.dev.name}」({game.dev.genre} × {game.dev.content} / {hwName(game.dev.hardwareId)})</p>
        <progress value={Math.min(100, (game.dev.progress / 2))} max={100}></progress>
        <p>進捗 {Math.min(100, Math.floor(game.dev.progress / 2))}% / バグ {Math.floor(game.dev.bug)}</p>
        <button onclick={exhibitGame} disabled={game.dev.exhibited}>
          {game.dev.exhibited ? '出展済み' : 'ゲームデックスに出展（知名度UP）'}
        </button>
      {:else}
        <p>バグ取り中: 「{game.dev.name}」 バグ {Math.floor(game.dev.bug)}</p>
        <p>「次の週へ」でバグが減ります。減らし終えたら完成させましょう。</p>
        <button onclick={finishGame}>完成する</button>
        <button onclick={exhibitGame} disabled={game.dev.exhibited}>
          {game.dev.exhibited ? '出展済み' : 'ゲームデックスに出展（知名度UP）'}
        </button>
      {/if}
    {:else if game.completed}
      <p>完成: 「{game.completed.name}」 レビュー {game.completed.reviewScore}点
        {#if game.completed.hallOfFame}<strong>（殿堂入り！）</strong>{/if}
      </p>
      <ul>
        <li>おもしろさ {game.completed.fun} / 独創性 {game.completed.creativity}</li>
        <li>グラフィック {game.completed.graphics} / 音楽 {game.completed.music} / バグ {game.completed.bug}</li>
        <li>期待売上 約 {game.completed.expectedSales.toLocaleString()}本</li>
      </ul>
      <div class="ship">
        <label>
          出荷本数（上限 {shipCap().toLocaleString()}本）:
          <input type="number" bind:value={shipQty} min="0" placeholder={String(Math.min(game.completed.expectedSales, shipCap()))} />
        </label>
        <button onclick={onShip}>出荷する</button>
        <button onclick={() => (shipQty = Math.min(game.completed!.expectedSales, shipCap()))}>期待売上分</button>
      </div>
    {:else if game.onSale}
      <p>販売中: 「{game.onSale.name}」在庫 {game.inventory.toLocaleString()}本（{game.onSale.weeksOnSale}週目）</p>
    {:else}
      <div class="devform">
        <label>タイトル <input type="text" bind:value={devName} /></label>
        <label>
          ジャンル（{genres.length}/{kumiawase.genres.length} 解放）
          <select bind:value={devGenre}>
            {#each genres as g}<option value={g}>{g}</option>{/each}
          </select>
        </label>
        <label>
          内容（{contents.length}/{kumiawase.contents.length} 解放）
          <select bind:value={devContent}>
            {#each contents as c}<option value={c}>{c}</option>{/each}
          </select>
        </label>
        <label>
          ハード
          <select bind:value={devHardware}>
            <option value="">（自動: 最初の1番目）</option>
            {#each availableHardware as h}<option value={h.id}>{h.name}（{h.realName}）</option>{/each}
          </select>
        </label>
        <p>相性: {compat}（{devGenre} × {devContent}）</p>
        <button onclick={onStartDev}>開発を始める</button>
      </div>
    {/if}
  </section>

  {#if game.hallOfFame.length > 0}
    <section>
      <h2>殿堂入り（{game.hallOfFame.length}本）</h2>
      <table>
        <thead>
          <tr><th>タイトル</th><th>レビュー</th><th>ハード</th><th></th></tr>
        </thead>
        <tbody>
          {#each game.hallOfFame as h (h.name + h.reviewScore)}
            <tr>
              <td>{h.name}</td><td>{h.reviewScore}点</td><td>{hwName(h.hardwareId)}</td>
              <td><button onclick={() => startSequel(h)}>続編を開発</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <section>
    <h2>テナント（{game.tenants.length}/3）</h2>
    <table>
      <thead>
        <tr><th>施設</th><th>効果</th><th>費用</th><th></th></tr>
      </thead>
      <tbody>
        {#each tenantCatalog as t (t.id)}
          <tr>
            <td>{t.name}</td>
            <td>{t.effect}</td>
            <td>{(t.cost / 10000).toLocaleString()}万</td>
            <td>
              {#if hasTenant(t.id)}
                導入済み
              {:else}
                <button onclick={() => buyTenant(t.id)} disabled={game.tenants.length >= 3}>導入</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h2>テクノロジー</h2>
    <table>
      <thead>
        <tr><th>技術</th><th>効果</th><th>費用</th><th></th></tr>
      </thead>
      <tbody>
        {#each techCatalog as t (t.id)}
          <tr>
            <td>{t.name}</td>
            <td>{t.effect}</td>
            <td>{(t.cost / 10000).toLocaleString()}万</td>
            <td>
              {#if hasTech(t.id)}
                取得済み
              {:else}
                <button onclick={() => buyTech(t.id)}>研究</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  {#if ranking.length > 0}
    <section>
      <h2>売上ランキング</h2>
      <table>
        <thead>
          <tr><th>#</th><th>タイトル</th><th>販売本数</th><th>レビュー</th><th>年</th></tr>
        </thead>
        <tbody>
          {#each ranking as g, i (g.name + g.year)}
            <tr>
              <td>{i + 1}</td>
              <td>{g.name}</td>
              <td>{g.sold.toLocaleString()}</td>
              <td>{g.reviewScore}点</td>
              <td>{g.year}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <section>
    <h2>実績</h2>
    <ul class="ach">
      {#each achievements as a}
        <li class:done={a.done}>{a.done ? '達成' : '未達成'}: {a.label}</li>
      {/each}
    </ul>
  </section>

  <section>
    <h2>参入可能ハード（{currentYear()}年）</h2>
    <ul class="hw">
      {#each availableHardware as h}
        <li>
          {h.name}（{h.realName} / 現在の普及 {Math.round(effectiveInstallBase(h.id, currentYear()) / 10000)}万台 /
          最終 {Math.round((h.installBase ?? 0) / 10000)}万台 / 性能 {h.params?.power ?? '?'}）
        </li>
      {/each}
    </ul>
  </section>
</main>

<style>
  :global(body) {
    font-family: sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 16px;
    color: #222;
  }
  h1 {
    font-size: 1.3rem;
  }
  header {
    border-bottom: 2px solid #ccc;
    padding-bottom: 12px;
    margin-bottom: 16px;
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
  .gameover {
    color: #c00;
    font-weight: bold;
  }
  .report {
    color: #555;
    font-size: 0.9rem;
  }
  section {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.85rem;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  button {
    cursor: pointer;
  }
  .devform {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 480px;
  }
  .devform label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .ship {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hw {
    font-size: 0.85rem;
  }
  .ach {
    list-style: none;
    padding: 0;
    font-size: 0.9rem;
  }
  .ach li.done {
    color: #0a7a0a;
  }
  .ach li {
    color: #999;
  }
</style>
