<script lang="ts">
  import {
    game,
    buyTenant,
    hasTenant,
    tenantCatalog,
    buyTech,
    techLevel,
    techDesc,
    techCatalog,
    currentOffice,
    maxEmployees,
    officeRent,
    officeDesks,
    officeCatalog,
    moveOfficeReason,
    moveOffice,
    desks,
    maxDesks,
    deskCost,
    buyDesk,
    crowding,
    layoutSpeedMul,
    layoutCatalog,
    setLayout,
    loungeRecovery,
    loungeRelief,
    loungeUpgradeCost,
    upgradeLounge,
    man
  } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title="経営（施設・技術）" onclose={onclose}>
  <h3>オフィス</h3>
  <p class="pnote">
    現在: {currentOffice().name} / 社員上限 {maxEmployees()}人 / 月額家賃 {man(officeRent() * 4)} / 机数 {officeDesks()}
  </p>
  <table>
    <thead>
      <tr><th>オフィス</th><th>社員上限</th><th>月額家賃</th><th>移転費</th><th></th></tr>
    </thead>
    <tbody>
      {#each officeCatalog as o (o.id)}
        <tr>
          <td>{o.name}</td>
          <td>{o.capacity}人</td>
          <td>{man(o.rent * 4)}</td>
          <td>{o.moveCost === 0 ? '—' : man(o.moveCost)}</td>
          <td>
            {#if game.officeLevel === officeCatalog.indexOf(o)}
              現在
            {:else if moveOfficeReason(officeCatalog.indexOf(o)) === null}
              <button onclick={() => moveOffice(officeCatalog.indexOf(o))}>移転</button>
            {:else}
              <span class="pnote">{moveOfficeReason(officeCatalog.indexOf(o))}</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h3>机・レイアウト（開発速度 ×{layoutSpeedMul().toFixed(2)}）</h3>
  <p class="pnote">
    机数 {desks()} / 上限 {maxDesks()}机 / 混雑度 {crowding().toFixed(1)}人/机
    {game.employees.length === 0 ? '' : crowding() < 1 ? '（快適：速度+5%）' : crowding() <= 1.5 ? '（普通）' : '（混雑：速度-10%・ストレス増）'}
  </p>
  <button onclick={buyDesk} disabled={desks() >= maxDesks() || game.money < deskCost()}>机を増設（{man(deskCost())}）</button>
  <table>
    <thead>
      <tr><th>レイアウト</th><th>効果</th><th></th></tr>
    </thead>
    <tbody>
      {#each layoutCatalog as l (l.id)}
        <tr>
          <td>{l.name}</td>
          <td>{l.desc}</td>
          <td>
            {#if game.layout === l.id}
              適用中
            {:else}
              <button onclick={() => setLayout(l.id)}>変更</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h3>休憩室（Lv{game.loungeLevel}）</h3>
  <p class="pnote">
    休息時の回復 {loungeRecovery()}/週 / ストレス上昇軽減 {Math.round(loungeRelief() * 100)}% / 次のグレード改修費用 {loungeUpgradeCost() === null ? '最高グレード' : man(loungeUpgradeCost()!)}
  </p>
  <button onclick={upgradeLounge} disabled={loungeUpgradeCost() === null || game.money < (loungeUpgradeCost() ?? Infinity)}>休憩室を改修（Lv{game.loungeLevel + 1}）</button>

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
  .pnote {
    color: #888;
    font-size: 0.85rem;
  }
</style>