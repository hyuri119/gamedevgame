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
    evolve,
    canEvolve,
    foundStudio,
    acquireCompany,
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
    techLevel,
    techDesc,
    techCatalog,
    startHardware,
    canDevelopHardware,
    hwName,
    startArcade,
    finishArcade,
    portArcade,
    buyLicense,
    hasLicense,
    licenseCost,
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

  const licensedHardware = $derived(availableHardware.filter((h) => hasLicense(h.id)));
  const unlicensedHardware = $derived(availableHardware.filter((h) => !hasLicense(h.id)));

  const hiredIds = $derived(new Set(game.employees.map((e) => e.id)));
  const pool = $derived(employeePool.filter((e) => !hiredIds.has(e.id)));

  const idleStudios = $derived(game.studios.filter((s) => !s.dev && !s.completed && !s.onSale));
  const busyStudios = $derived(game.studios.filter((s) => s.dev || s.completed || s.onSale));

  // 新規開発フォーム
  let devName = $state('私のゲーム');
  let devGenre = $state('');
  let devContent = $state('');
  let devHardware = $state('');
  let devStudio = $state(0);

  $effect(() => {
    if (!genres.includes(devGenre)) devGenre = genres[0] ?? '';
    if (!contents.includes(devContent)) devContent = contents[0] ?? '';
    if (!idleStudios.some((s) => s.id === devStudio)) devStudio = idleStudios[0]?.id ?? 0;
  });

  const compat = $derived(compatMark(devGenre, devContent));

  // スタジオ発足フォーム
  let studioName = $state('');
  let studioLead = $state('');

  // 自社ハード開発フォーム
  let hwDevName = $state('');
  let hwType = $state('家庭用');
  let hwPower = $state(5);

  // アーケード開発フォーム
  const arcadeBoards = $derived(hardware.hardware.filter((h) => h.type === 'arcade'));
  let arcName = $state('');
  let arcGenre = $state('');
  let arcContent = $state('');
  let arcBoard = $state('');

  $effect(() => {
    if (!genres.includes(arcGenre)) arcGenre = genres[0] ?? '';
    if (!contents.includes(arcContent)) arcContent = contents[0] ?? '';
    if (!arcadeBoards.some((b) => b.id === arcBoard)) arcBoard = arcadeBoards[0]?.id ?? '';
  });

  // 自動進行（放置）
  let auto = $state(false);
  let autoSpeed = $state(1);

  $effect(() => {
    if (!auto || game.gameOver) return;
    const t = setInterval(() => advanceWeek(), 1000 / autoSpeed);
    return () => clearInterval(t);
  });

  // 出荷（スタジオごと）
  let shipQtys = $state<Record<number, number>>({});

  const hint = $derived(
    game.gameOver
      ? 'ゲームオーバー（ブラウザをリロードで再挑戦）'
      : game.employees.length === 0
        ? 'まず社員を雇用しよう'
        : licensedHardware.length === 0 && game.ownHardware.length === 0
          ? 'ハードのライセンスを取得しよう'
          : busyStudios.length > 0
            ? '「次の週へ」を押して開発・販売を進めよう'
            : '開発を始めよう'
  );

  function onStartDev() {
    if (!devStudio) return;
    const hwId = devHardware || licensedHardware[0]?.id || game.ownHardware[0]?.id;
    if (!hwId) return;
    startDev(devName, devGenre, devContent, hwId, devStudio);
  }

  const empName = (id: string | null) => (id ? game.employees.find((e) => e.id === id)?.name ?? '?' : '');
  const ranking = $derived([...game.releasedGames].sort((a, b) => b.sold - a.sold));

  const achievements = $derived([
    { label: '累計販売10万本', done: game.totalSales >= 100000 },
    { label: '累計販売100万本', done: game.totalSales >= 1000000 },
    { label: '累計販売1000万本', done: game.totalSales >= 10000000 },
    { label: '殿堂入り1本', done: game.hallOfFame.length >= 1 },
    { label: 'グランプリ受賞', done: game.grandPrix >= 1 },
    { label: '知名度50', done: game.fame >= 50 },
    { label: 'テナント3つ', done: game.tenants.length >= 3 },
    { label: 'スタジオ3つ', done: game.studios.length >= 3 }
  ]);
</script>

<main>
  <header>
    <h1>ゲーム会社経営シミュレーション</h1>
    <div class="bar">
      <span class="money">資金: ¥{game.money.toLocaleString()}</span>
      <span>{year()}年 {month()}月 {weekOfMonth}週目</span>
      <span>累計販売: {game.totalSales.toLocaleString()}本</span>
      <span>知名度: {game.fame}</span>
      <span>スタジオ: {game.studios.length}</span>
    </div>
    <p class="hint">▶ 次にやること: {hint}</p>
    {#if game.gameOver}
      <p class="gameover">破産しました（ゲームオーバー）</p>
    {/if}
    <button onclick={advanceWeek} disabled={game.gameOver}>次の週へ ▶</button>
    <button onclick={() => (auto = !auto)} disabled={game.gameOver}>{auto ? '⏸ 停止' : '▶ 自動進行'}</button>
    {#if auto}
      <select bind:value={autoSpeed}>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={5}>5x</option>
      </select>
    {/if}
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
              {#if canEvolve(e)}
                <button onclick={() => evolve(e.id)}>進化</button>
              {/if}
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
    <h2>スタジオ（{game.studios.length}/5）</h2>

    {#each game.studios as s (s.id)}
      <div class="studio">
        <h3>{s.name}{s.leadId ? `（責任者: ${empName(s.leadId)}）` : ''}</h3>
        {#if s.dev}
          {#if s.dev.stage === '開発'}
            <p>開発中: 「{s.dev.name}」({s.dev.genre} × {s.dev.content} / {hwName(s.dev.hardwareId)})</p>
            <progress value={Math.min(100, s.dev.progress / 2)} max={100}></progress>
            <p>進捗 {Math.min(100, Math.floor(s.dev.progress / 2))}% / バグ {Math.floor(s.dev.bug)}</p>
            <button onclick={() => exhibitGame(s.id)} disabled={s.dev.exhibited}>
              {s.dev.exhibited ? '出展済み' : 'ゲームデックスに出展'}
            </button>
          {:else}
            <p>バグ取り中: 「{s.dev.name}」 バグ {Math.floor(s.dev.bug)}</p>
            <button onclick={() => finishGame(s.id)}>完成する</button>
            <button onclick={() => exhibitGame(s.id)} disabled={s.dev.exhibited}>
              {s.dev.exhibited ? '出展済み' : 'ゲームデックスに出展'}
            </button>
          {/if}
        {:else if s.completed}
          <p>完成: 「{s.completed.name}」 レビュー {s.completed.reviewScore}点
            {#if s.completed.hallOfFame}<strong>（殿堂入り！）</strong>{/if}
          </p>
          <ul>
            <li>おもしろさ {s.completed.fun} / 独創性 {s.completed.creativity}</li>
            <li>グラフィック {s.completed.graphics} / 音楽 {s.completed.music} / バグ {s.completed.bug}</li>
            <li>期待売上 約 {s.completed.expectedSales.toLocaleString()}本</li>
          </ul>
          <div class="ship">
            <label>
              出荷本数（上限 {shipCap().toLocaleString()}本）:
              <input type="number" bind:value={shipQtys[s.id]} min="0" placeholder={String(Math.min(s.completed.expectedSales, shipCap()))} />
            </label>
            <button onclick={() => ship(shipQtys[s.id] || s.completed!.expectedSales, s.id)}>出荷する</button>
            <button onclick={() => (shipQtys[s.id] = Math.min(s.completed!.expectedSales, shipCap()))}>期待売上分</button>
          </div>
          <button onclick={() => exhibitGame(s.id)} disabled={s.completed.exhibited}>
            {s.completed.exhibited ? '出展済み' : 'ゲームデックスに出展'}
          </button>
        {:else if s.onSale}
          <p>販売中: 「{s.onSale.name}」在庫 {s.inventory.toLocaleString()}本（{s.onSale.weeksOnSale}週目）</p>
        {:else}
          <p>空き（開発待ち）</p>
        {/if}
      </div>
    {/each}

    <div class="studio-form">
      <h3>新スタジオ発足（3億円・責任者Lv5以上）</h3>
      <label>スタジオ名 <input type="text" bind:value={studioName} placeholder="スタジオ名" /></label>
      <label>
        責任者
        <select bind:value={studioLead}>
          <option value="">選択してください</option>
          {#each game.employees.filter((e) => e.level >= 5) as e (e.id)}
            <option value={e.id}>{e.name}（Lv{e.level}）</option>
          {/each}
        </select>
      </label>
      <button onclick={() => foundStudio(studioName || '新スタジオ', studioLead)}>発足する</button>
      <button onclick={acquireCompany}>他社を買収（8億円）</button>
    </div>
  </section>

  <section>
    <h2>新規開発</h2>
    {#if idleStudios.length === 0}
      <p>空いているスタジオがありません。</p>
    {:else}
      <div class="devform">
        <label>
          スタジオ
          <select bind:value={devStudio}>
            {#each idleStudios as s}<option value={s.id}>{s.name}</option>{/each}
          </select>
        </label>
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
            {#each licensedHardware as h}<option value={h.id}>{h.name}（{h.realName}）</option>{/each}
            {#each game.ownHardware as h}<option value={h.id}>{h.name}（自社・ライセンス0円）</option>{/each}
          </select>
        </label>
        <p>相性: {compat}（{devGenre} × {devContent}）</p>
        <button onclick={onStartDev}>開発を始める</button>
      </div>
    {/if}
  </section>

  <section>
    <h2>自社ハード</h2>
    {#if canDevelopHardware()}
      {#if game.hwProject}
        <p>
          開発中: 「{game.hwProject.name}」（{game.hwProject.type} / 性能{game.hwProject.power}）
          進捗 {Math.min(100, Math.floor((game.hwProject.progress / game.hwProject.target) * 100))}%
        </p>
      {:else}
        <div class="studio-form">
          <label>機種名 <input type="text" bind:value={hwDevName} placeholder="機種名" /></label>
          <label>
            種類
            <select bind:value={hwType}>
              <option value="家庭用">家庭用</option>
              <option value="携帯型">携帯型</option>
            </select>
          </label>
          <label>
            性能（開発費＝性能×2億円）
            <select bind:value={hwPower}>
              {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as p}<option value={p}>{p}</option>{/each}
            </select>
          </label>
          <button onclick={() => startHardware(hwDevName || '自社機', hwType, hwPower)}>開発する</button>
        </div>
      {/if}
    {:else}
      <p>ハードエンジニア（またはスーパーハッカー）を雇用すると自社ハードを開発できます。</p>
    {/if}
    {#if game.ownHardware.length > 0}
      <ul class="hw">
        {#each game.ownHardware as h}
          <li>【自社】{h.name}（{h.type} / 性能 {h.params.power} / 普及見込み {Math.round(h.installBase / 10000)}万台）</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2>アーケード</h2>
    {#if game.arcadeProject}
      {#if game.arcadeProject.stage === '開発'}
        <p>開発中: 「{game.arcadeProject.name}」（{game.arcadeProject.genre} × {game.arcadeProject.content} / {hwName(game.arcadeProject.boardId)}）</p>
        <progress value={Math.min(100, game.arcadeProject.progress / 1.2)} max={100}></progress>
        <p>進捗 {Math.min(100, Math.floor(game.arcadeProject.progress / 1.2))}% / バグ {Math.floor(game.arcadeProject.bug)}</p>
      {:else}
        <p>バグ取り中: 「{game.arcadeProject.name}」 バグ {Math.floor(game.arcadeProject.bug)}</p>
        <button onclick={finishArcade}>完成する</button>
      {/if}
    {:else}
      <div class="devform">
        <label>タイトル <input type="text" bind:value={arcName} /></label>
        <label>
          ジャンル
          <select bind:value={arcGenre}>
            {#each genres as g}<option value={g}>{g}</option>{/each}
          </select>
        </label>
        <label>
          内容
          <select bind:value={arcContent}>
            {#each contents as c}<option value={c}>{c}</option>{/each}
          </select>
        </label>
        <label>
          基板
          <select bind:value={arcBoard}>
            {#each arcadeBoards as b}<option value={b.id}>{b.name}</option>{/each}
          </select>
        </label>
        <button onclick={() => startArcade(arcName || 'アーケード作品', arcGenre, arcContent, arcBoard)}>開発を始める</button>
      </div>
    {/if}

    {#if game.arcadeGames.length > 0}
      <table>
        <thead>
          <tr><th>タイトル</th><th>稼働率</th><th>残り週</th><th></th></tr>
        </thead>
        <tbody>
          {#each game.arcadeGames as ag, i (ag.name + i)}
            <tr>
              <td>{ag.name}</td>
              <td>{ag.opeRate}</td>
              <td>{ag.weeksLeft > 0 ? `${ag.weeksLeft}週` : '稼働終了'}</td>
              <td>
                {#if !ag.ported && ag.opeRate >= 60}
                  <button onclick={() => portArcade(i)}>家庭用に移植</button>
                {:else if ag.ported}
                  移植済み
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
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
              <td>
                {#if idleStudios.length > 0}
                  <button onclick={() => startSequel(h, idleStudios[0].id)}>続編を開発</button>
                {/if}
              </td>
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
            <td>{techDesc(t.id)}</td>
            <td>
              {#if techLevel(t.id) >= t.maxLevel}
                MAX
              {:else}
                {(t.costs[techLevel(t.id)] / 10000).toLocaleString()}万
              {/if}
            </td>
            <td>
              {#if techLevel(t.id) >= t.maxLevel}
                取得済み
              {:else}
                <button onclick={() => buyTech(t.id)}>研究（Lv{techLevel(t.id) + 1}）</button>
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

  {#if unlicensedHardware.length > 0}
    <section>
      <h2>ライセンス取得</h2>
      <p>ハード向けに開発するにはライセンスが必要です。</p>
      <table>
        <thead>
          <tr><th>ハード</th><th>ライセンス料</th><th></th></tr>
        </thead>
        <tbody>
          {#each unlicensedHardware as h}
            <tr>
              <td>{h.name}（{h.realName}）</td>
              <td>{(licenseCost(h.id) / 10000).toLocaleString()}万</td>
              <td><button onclick={() => buyLicense(h.id)}>取得する</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <section>
    <h2>参入可能ハード（{currentYear()}年）</h2>
    <ul class="hw">
      {#each availableHardware as h}
        <li>
          {h.name}（{h.realName} / 現在の普及 {Math.round(effectiveInstallBase(h.id, currentYear()) / 10000)}万台 /
          最終 {Math.round((h.installBase ?? 0) / 10000)}万台 / 性能 {h.params?.power ?? '?'}）
          {hasLicense(h.id) ? '［取得済み］' : '［要ライセンス］'}
        </li>
      {/each}
      {#each game.ownHardware as h}
        <li>
          【自社】{h.name}（性能 {h.params.power} / 現在の普及 {Math.round(effectiveInstallBase(h.id, currentYear()) / 10000)}万台 /
          最終 {Math.round(h.installBase / 10000)}万台 / ライセンス0円）
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
  .studio {
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
  }
  .studio h3 {
    margin: 0 0 6px;
    font-size: 1rem;
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
  .devform,
  .studio-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 480px;
  }
  .devform label,
  .studio-form label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .ship {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin: 6px 0;
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
