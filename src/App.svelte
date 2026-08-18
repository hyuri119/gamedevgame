<script lang="ts">
  import {
    game,
    year,
    month,
    currentYear,
    advanceWeek,
    hire,
    fire,
    scout,
    train,
    evolve,
    canEvolve,
    foundStudio,
    acquireCompany,
    startDev,
    ship,
    finishGame,
    saveGame,
    loadGame,
    resetGame,
    saveSlots,
    currentSlot,
    peekSlot,
    buyTenant,
    hasTenant,
    shipCap,
    tenantCatalog,
    buyTech,
    techLevel,
    techDesc,
    techCatalog,
    buyLicense,
    hasLicense,
    licenseCost,
    startArcade,
    finishArcade,
    portArcade,
    startHardware,
    canDevelopHardware,
    hwName,
    devTarget,
    hardwarePower,
    man,
    restock,
    disposeCatalog,
    unitCost,
    availableStores,
    availableContracts,
    acceptContract,
    cancelContract,
    compatMark,
    exhibitStudio,
    exhibitCatalog,
    closeDecks,
    setAutoExhibit
  } from './lib/game.svelte';
  import { hardware, kumiawase, availableGenres, availableContents } from './lib/data';
  import OfficeCanvas from './lib/OfficeCanvas.svelte';
  import SalesChart from './lib/SalesChart.svelte';
  import Modal from './lib/Modal.svelte';

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

  const idleStudios = $derived(game.studios.filter((s) => !s.dev && !s.completed && !s.contractId));
  const busyStudios = $derived(game.studios.filter((s) => s.dev || s.completed || s.contractId));
  const arcadeBoards = $derived(hardware.hardware.filter((h) => h.type === 'arcade'));

  // モーダル状態
  let activeTab = $state('');

  $effect(() => {
    if (game.event) activeTab = '';
  });

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
  let arcName = $state('');
  let arcGenre = $state('');
  let arcContent = $state('');
  let arcBoard = $state('');

  $effect(() => {
    if (!genres.includes(arcGenre)) arcGenre = genres[0] ?? '';
    if (!contents.includes(arcContent)) arcContent = contents[0] ?? '';
    if (!arcadeBoards.some((b) => b.id === arcBoard)) arcBoard = arcadeBoards[0]?.id ?? '';
  });

  // 出荷・再出荷の本数入力
  let shipQtys = $state<Record<number, number>>({});
  let shipStores = $state<Record<number, string>>({});
  let restockQtys = $state<Record<number, number>>({});

  // 自動進行（放置）
  let auto = $state(false);
  let autoSpeed = $state(1);

  $effect(() => {
    if (!auto || game.gameOver) return;
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

  function onStartDev() {
    if (!devStudio) return;
    const hwId = devHardware || licensedHardware[0]?.id || game.ownHardware[0]?.id;
    if (!hwId) return;
    startDev(devName, devGenre, devContent, hwId, devStudio);
  }

  const empName = (id: string | null) => (id ? game.employees.find((e) => e.id === id)?.name ?? '?' : '');

  const ranking = $derived([...game.catalog].sort((a, b) => b.soldTotal - a.soldTotal));

  const decksEvent = $derived(game.event?.type === 'decks' ? game.event : null);

  const deckPreRelease = $derived(
    game.studios.filter((s) => (s.dev && !s.dev.exhibited) || (s.completed && !s.completed.exhibited))
  );
  const deckCatalog = $derived(
    game.catalog.map((g, i) => ({ g, i })).filter((x) => !x.g.exhibited)
  );

  const bugCleared = (bug: number) => Math.max(0, Math.min(100, 100 - (bug / 30) * 100));

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
      <span class="money">資金: {man(game.money)}</span>
      <span>{year()}年 {month()}月 {weekOfMonth}週目</span>
      <span>累計販売: {game.totalSales.toLocaleString()}本</span>
      <span>知名度: {game.fame}</span>
      <span>スタジオ: {game.studios.length}</span>
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

  <section>
    <h2>売上グラフ</h2>
    <SalesChart />
  </section>

  <section>
    <h2>オフィス</h2>
    <OfficeCanvas />
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
    <Modal title="開発" onclose={() => (activeTab = '')}>
      {#each game.studios as s (s.id)}
        <div class="studio">
          <h4>{s.name}{s.leadId ? `（責任者: ${empName(s.leadId)}）` : ''}</h4>
          {#if s.dev}
            {#if s.dev.stage === '開発'}
              <p>開発中: 「{s.dev.name}」({s.dev.genre} × {s.dev.content} / {hwName(s.dev.hardwareId)})</p>
              <progress value={Math.min(100, (s.dev.progress / devTarget(s.dev.hardwareId)) * 100)} max={100}></progress>
              <p>進捗 {Math.min(100, Math.floor((s.dev.progress / devTarget(s.dev.hardwareId)) * 100))}% / バグ {Math.floor(s.dev.bug)}</p>
            {:else}
              <p>バグ取り中: 「{s.dev.name}」 バグ {Math.floor(s.dev.bug)}</p>
              <progress value={bugCleared(s.dev.bug)} max={100}></progress>
              <button onclick={() => finishGame(s.id)}>完成する</button>
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
                <input type="number" bind:value={shipQtys[s.id]} min="0" placeholder={String(Math.min(s.completed!.expectedSales, shipCap()))} />
              </label>
              <label>
                販売先
                <select bind:value={shipStores[s.id]}>
                  <option value="">店頭（1本生産費 {man(unitCost(s.completed!.hardwareId))}）</option>
                  {#each availableStores(s.completed!.hardwareId) as st}
                    <option value={st.id}>{st.name}（DL・生産費0・手数料{Math.round(st.commission * 100)}%・売上×{st.reachMul}）</option>
                  {/each}
                </select>
              </label>
              {#if shipQtys[s.id] > 0}
                <span>生産費計 {man((shipStores[s.id] ? 0 : unitCost(s.completed!.hardwareId)) * shipQtys[s.id])}</span>
              {/if}
              <button onclick={() => ship(shipQtys[s.id] || s.completed!.expectedSales, s.id, shipStores[s.id] || undefined)}>出荷する</button>
              <button onclick={() => (shipQtys[s.id] = Math.min(s.completed!.expectedSales, shipCap()))}>期待売上分</button>
            </div>
          {:else if s.contractId}
            <p>受注案件を開発中</p>
          {:else}
            <p>空き（開発待ち）</p>
          {/if}
        </div>
      {/each}

      <h3>新規開発</h3>
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
              {#each licensedHardware as h}<option value={h.id}>{h.name}（{h.realName}・性能{hardwarePower(h.id)}）</option>{/each}
              {#each game.ownHardware as h}<option value={h.id}>{h.name}（自社・ライセンス0円・性能{h.params.power}）</option>{/each}
            </select>
          </label>
          <p>相性: {compat}（{devGenre} × {devContent}）</p>
          <button onclick={onStartDev}>開発を始める</button>
        </div>
      {/if}
    </Modal>
  {/if}

  {#if activeTab === 'staff'}
    <Modal title="社員" onclose={() => (activeTab = '')}>
      <h3>スカウト（雇用）</h3>
      <button onclick={scout}>スカウトする（候補を探す）</button>
      {#if game.scoutCandidates.length > 0}
        <table>
          <thead>
            <tr>
              <th>名前</th><th>役職</th><th>Lv</th>
              <th>おも</th><th>独創</th><th>画</th><th>音</th><th>速度</th>
              <th>契約金</th><th>年俸</th><th></th>
            </tr>
          </thead>
          <tbody>
            {#each game.scoutCandidates as e (e.id)}
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
      {:else}
        <p>「スカウトする」を押すと候補が表示されます。</p>
      {/if}

      <h3>雇用済み社員（{game.employees.length}人）</h3>
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
    </Modal>
  {/if}

  {#if activeTab === 'studio'}
    <Modal title="スタジオ" onclose={() => (activeTab = '')}>
      <ul>
        {#each game.studios as s (s.id)}
          <li>{s.name}{s.leadId ? `（責任者: ${empName(s.leadId)}）` : ''}</li>
        {/each}
      </ul>
      <div class="devform">
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
    </Modal>
  {/if}

  {#if activeTab === 'contract'}
    <Modal title="受注開発（外注納品）" onclose={() => (activeTab = '')}>
      {#if game.activeContract}
        <p>
          受注中: 「{game.activeContract.name}」（報酬 {(game.activeContract.reward / 10000).toLocaleString()}万円）
          進捗 {Math.min(100, Math.floor((game.activeContract.progress / game.activeContract.target) * 100))}%
          / 経過 {game.activeContract.elapsed}週（納期 {game.activeContract.deadline}週）
        </p>
        <progress value={Math.min(100, (game.activeContract.progress / game.activeContract.target) * 100)} max={100}></progress>
        <button onclick={cancelContract}>キャンセル</button>
      {:else}
        <table>
          <thead>
            <tr><th>案件</th><th>報酬</th><th>納期</th><th>必要知名度</th><th></th></tr>
          </thead>
          <tbody>
            {#each availableContracts() as c (c.id)}
              <tr>
                <td>{c.name}<div class="desc">{c.desc}</div></td>
                <td>{(c.reward / 10000).toLocaleString()}万</td>
                <td>{c.deadline}週</td>
                <td>{c.minFame}</td>
                <td><button onclick={() => acceptContract(c.id)}>受注</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </Modal>
  {/if}

  {#if activeTab === 'arcade'}
    <Modal title="アーケード" onclose={() => (activeTab = '')}>
      {#if game.arcadeProject}
        {#if game.arcadeProject.stage === '開発'}
          <p>開発中: 「{game.arcadeProject.name}」（{game.arcadeProject.genre} × {game.arcadeProject.content} / {hwName(game.arcadeProject.boardId)}）</p>
          <progress value={Math.min(100, game.arcadeProject.progress / 1.2)} max={100}></progress>
          <p>進捗 {Math.min(100, Math.floor(game.arcadeProject.progress / 1.2))}% / バグ {Math.floor(game.arcadeProject.bug)}</p>
        {:else}
          <p>バグ取り中: 「{game.arcadeProject.name}」 バグ {Math.floor(game.arcadeProject.bug)}</p>
          <progress value={bugCleared(game.arcadeProject.bug)} max={100}></progress>
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
    </Modal>
  {/if}

  {#if activeTab === 'hw'}
    <Modal title="ハード" onclose={() => (activeTab = '')}>
      <h3>ライセンス取得（他社ハード）</h3>
      {#if unlicensedHardware.length === 0}
        <p>取得可能なライセンスはありません。</p>
      {:else}
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
      {/if}

      <h3>自社ハード開発</h3>
      {#if canDevelopHardware()}
        {#if game.hwProject}
          <p>
            開発中: 「{game.hwProject.name}」（{game.hwProject.type} / 性能{game.hwProject.power}）
            進捗 {Math.min(100, Math.floor((game.hwProject.progress / game.hwProject.target) * 100))}%
          </p>
        {:else}
          <div class="devform">
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
    </Modal>
  {/if}

  {#if activeTab === 'manage'}
    <Modal title="経営（施設・技術）" onclose={() => (activeTab = '')}>
      <h3>テナント（{game.tenants.length}/3）</h3>
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

      <h3>テクノロジー</h3>
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
    </Modal>
  {/if}

  {#if activeTab === 'catalog'}
    <Modal title="カタログ（継続販売）" onclose={() => (activeTab = '')}>
      <h3>継続販売中の作品</h3>
      <table>
        <thead>
          <tr><th>タイトル</th><th>在庫</th><th>累計販売</th><th>レビュー</th><th>1本生産費</th><th>操作</th></tr>
        </thead>
        <tbody>
          {#each game.catalog as g, i (g.name)}
            <tr>
              <td>{g.name}</td>
              <td>{g.inventory.toLocaleString()}本</td>
              <td>{g.soldTotal.toLocaleString()}本</td>
              <td>{g.reviewScore}点</td>
              <td>{man(unitCost(g.hardwareId))}</td>
              <td>
                <input class="qty" type="number" bind:value={restockQtys[i]} min="0" placeholder={String(Math.floor(Math.min(g.expectedSales * 0.2, shipCap())))} />
                <button onclick={() => restock(i, restockQtys[i] || 0)} disabled={!(restockQtys[i] > 0)}>再出荷</button>
                {#if g.inventory > 0}
                  <button onclick={() => disposeCatalog(i)}>処分</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>売上ランキング</h3>
      {#if ranking.length > 0}
        <table>
          <thead>
            <tr><th>#</th><th>タイトル</th><th>累計販売本数</th><th>レビュー</th></tr>
          </thead>
          <tbody>
            {#each ranking as g, i (g.name)}
              <tr>
                <td>{i + 1}</td>
                <td>{g.name}</td>
                <td>{g.soldTotal.toLocaleString()}</td>
                <td>{g.reviewScore}点</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p>まだ発売した作品がありません。</p>
      {/if}
    </Modal>
  {/if}

  {#if activeTab === 'ach'}
    <Modal title="実績" onclose={() => (activeTab = '')}>
      <ul class="ach">
        {#each achievements as a}
          <li class:done={a.done}>{a.done ? '達成' : '未達成'}: {a.label}</li>
        {/each}
      </ul>
    </Modal>
  {/if}

  {#if activeTab === 'save'}
    <Modal title="セーブ / ロード" onclose={() => (activeTab = '')}>
      <p>現在のスロット: スロット{currentSlot() + 1}（自動セーブはこのスロットへ）</p>
      <table>
        <thead>
          <tr><th>スロット</th><th>内容</th><th></th><th></th></tr>
        </thead>
        <tbody>
          {#each Array(saveSlots()) as _, i}
            <tr>
              <td>スロット{i + 1}{i === currentSlot() ? '（現在）' : ''}</td>
              <td>{peekSlot(i)}</td>
              <td><button onclick={() => saveGame(i)}>セーブ</button></td>
              <td><button onclick={() => { loadGame(i); activeTab = ''; }} disabled={peekSlot(i) === '空き'}>ロード</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Modal>
  {/if}

  {#if decksEvent}
    <Modal title="ゲームデックス（9月）" onclose={closeDecks}>
      <p>出展する作品を選んでください（1作品につき出展費 {man(5000000)}・知名度アップ）。</p>
      <h3>発売前の作品</h3>
      {#each deckPreRelease as s (s.id)}
        <div class="prow">
          <span class="plabel">{s.name}: 「{s.dev?.name ?? s.completed?.name}」{s.dev ? '（開発中）' : `（完成・レビュー ${s.completed!.reviewScore}点）`}</span>
          <button onclick={() => exhibitStudio(s.id)}>出展</button>
        </div>
      {:else}
        <p class="pnote">出展できる発売前の作品はありません。</p>
      {/each}
      <h3>カタログ（発売済み）</h3>
      {#each deckCatalog as x (x.g.name)}
        <div class="prow">
          <span class="plabel">「{x.g.name}」（レビュー {x.g.reviewScore}点）</span>
          <button onclick={() => exhibitCatalog(x.i)}>出展</button>
        </div>
      {:else}
        <p class="pnote">出展できるカタログ作品はありません。</p>
      {/each}
      <button onclick={closeDecks}>閉じる</button>
    </Modal>
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
  .studio {
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
  }
  .studio h4 {
    margin: 0 0 6px;
    font-size: 1rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.85rem;
    margin: 8px 0;
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
    margin: 6px 0;
  }
  .qty {
    width: 90px;
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
  .desc {
    color: #888;
    font-size: 0.75rem;
  }
</style>
