<script lang="ts">
  import {
    game,
    buyLicense,
    hasLicense,
    licenseCost,
    startHardware,
    canDevelopHardware,
    hardwarePower,
    effectiveInstallBase,
    currentYear
  } from './game.svelte';
  import { hardware } from './data';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const availableHardware = $derived(
    hardware.hardware.filter(
      (h) =>
        h.type !== 'arcade' &&
        h.installBase != null &&
        h.releaseYear <= currentYear() &&
        (h.endYear == null || h.endYear >= currentYear())
    )
  );

  let hwDevName = $state('');
  let hwType = $state('家庭用');
  let hwPower = $state(5);
</script>

<Modal title="ハード" onclose={onclose}>
  <h3>ライセンス（他社ハード）</h3>
  <table>
    <thead>
      <tr><th>ハード</th><th>発売</th><th>普及台数</th><th>性能</th><th>ライセンス料</th><th>状態</th></tr>
    </thead>
    <tbody>
      {#each availableHardware as h (h.id)}
        <tr>
          <td>{h.name}（{h.realName}）</td>
          <td>{h.releaseYear}</td>
          <td>{(effectiveInstallBase(h.id, currentYear()) / 10000).toLocaleString()}万台</td>
          <td>{hardwarePower(h.id)}</td>
          <td>{licenseCost(h.id) > 0 ? `${(licenseCost(h.id) / 10000).toLocaleString()}万` : '不要'}</td>
          <td>
            {#if hasLicense(h.id)}
              取得済み
            {:else}
              <button onclick={() => buyLicense(h.id)}>取得する</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

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
  .hw {
    font-size: 0.85rem;
  }
</style>