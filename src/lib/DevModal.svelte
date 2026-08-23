<script lang="ts">
  import {
    game,
    startDev,
    finishGame,
    ship,
    shipCap,
    unitCost,
    availableStores,
    compatMark,
    devTarget,
    hwName,
    hardwarePower,
    hasLicense,
    currentYear,
    man
  } from './game.svelte';
  import { hardware, kumiawase, availableGenres, availableContents } from './data';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

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

  const idleStudios = $derived(game.studios.filter((s) => !s.dev && !s.completed && !s.contractId && !s.dlc));

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

  let shipQtys = $state<Record<number, number>>({});
  let shipStores = $state<Record<number, string>>({});

  const empName = (id: string | null) => (id ? game.employees.find((e) => e.id === id)?.name ?? '?' : '');

  const bugCleared = (bug: number) => Math.max(0, Math.min(100, 100 - (bug / 30) * 100));

  function onStartDev() {
    if (!devStudio) return;
    const hwId = devHardware || licensedHardware[0]?.id || game.ownHardware[0]?.id;
    if (!hwId) return;
    startDev(devName, devGenre, devContent, hwId, devStudio);
  }
</script>

<Modal title="開発" onclose={onclose}>
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

<style>
  button {
    cursor: pointer;
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
</style>