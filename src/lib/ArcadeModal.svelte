<script lang="ts">
  import { game, startArcade, finishArcade, portArcade, hwName, currentYear } from './game.svelte';
  import { hardware, availableGenres, availableContents } from './data';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const genres = $derived(availableGenres(currentYear()));
  const contents = $derived(availableContents(currentYear()));
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

  const bugCleared = (bug: number) => Math.max(0, Math.min(100, 100 - (bug / 30) * 100));
</script>

<Modal title="アーケード" onclose={onclose}>
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

<style>
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
</style>