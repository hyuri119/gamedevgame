<script lang="ts">
  import {
    game,
    buyTenant,
    hasTenant,
    tenantCatalog,
    buyTech,
    techLevel,
    techDesc,
    techCatalog
  } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title="経営（施設・技術）" onclose={onclose}>
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
</style>