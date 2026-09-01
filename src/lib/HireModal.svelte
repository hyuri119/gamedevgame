<script lang="ts">
  import {
    game,
    hire,
    fire,
    scout,
    train,
    evolve,
    canEvolve,
    evolveOptions,
    jobLevel,
    effStats,
    canSwitchJob,
    switchJob,
    maxEmployees
  } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let evoChoices = $state<Record<string, string>>({});
  let switchChoices = $state<Record<string, string>>({});
</script>

<Modal title="社員" onclose={onclose}>
  <h3>スカウト（雇用）</h3>
  <p class="pnote">小規模オフィスは最大4人まで。オフィスを移転すると雇用人数を増やせます。</p>
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
            <td><button onclick={() => hire(e.id)} disabled={game.employees.length >= maxEmployees() || (e.role === 'スーパーハッカー' && game.officeLevel < 2)}>雇用</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>「スカウトする」を押すと候補が表示されます。</p>
  {/if}

  <h3>雇用済み社員（{game.employees.length}/{maxEmployees()}人）</h3>
  <table>
    <thead>
      <tr>
        <th>名前</th><th>役職</th><th>Lv</th>
        <th>おも</th><th>独創</th><th>画</th><th>音</th><th>速度</th><th>年俸</th><th>操作</th>
      </tr>
    </thead>
    <tbody>
      {#each game.employees as e (e.id)}
        {@const es = effStats(e)}
        <tr>
          <td>{e.name}</td>
          <td>{e.role}（職業Lv{jobLevel(e)}）</td>
          <td>{e.level}</td>
          <td>{es.fun}</td><td>{es.creativity}</td><td>{es.graphics}</td><td>{es.music}</td>
          <td>{es.speed}</td><td>{(e.salary / 10000).toLocaleString()}万</td>
          <td>
            <button onclick={() => train(e.id)} disabled={e.level >= 10}>教育</button>
            {#if canEvolve(e)}
              <select bind:value={evoChoices[e.id]}>
                {#each evolveOptions(e) as t}<option value={t}>{t}</option>{/each}
              </select>
              <button onclick={() => evolve(e.id, evoChoices[e.id])}>進化</button>
            {/if}
            {#if canSwitchJob(e)}
              <select bind:value={switchChoices[e.id]}>
                {#each Object.keys(e.jobLevels ?? { [e.role]: 1 }) as t}
                  {#if t !== e.role}<option value={t}>{t}（Lv{jobLevel(e, t)}）</option>{/if}
                {/each}
              </select>
              <button onclick={() => switchJob(e.id, switchChoices[e.id])}>転職</button>
            {/if}
            <button onclick={() => fire(e.id)}>解雇</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="pnote">能力値は職業ボーナス込みの実効値です。教育・進化で基礎能力と職業レベルが上がります。</p>
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
  .pnote {
    color: #888;
    font-size: 0.85rem;
  }
</style>