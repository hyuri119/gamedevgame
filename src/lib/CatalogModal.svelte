<script lang="ts">
  import {
    game,
    restock,
    canRestock,
    disposeCatalog,
    unitCost,
    shipCap,
    canMakeDlc,
    cancelDlc,
    man
  } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose, onDlcRequest }: { onclose: () => void; onDlcRequest: (i: number) => void } = $props();

  let restockQtys = $state<Record<number, number>>({});

  const dlcDevStudios = $derived(game.studios.filter((s) => s.dlc));
  const ranking = $derived([...game.catalog].sort((a, b) => b.soldTotal - a.soldTotal));
</script>

<Modal title="カタログ（継続販売）" onclose={onclose}>
  <h3>継続販売中の作品</h3>
  <p class="pnote">再出荷は月にどれか1本だけ{canRestock() ? '（今月はまだ出荷できます）' : '（今月は出荷済み）'}。出荷上限 {shipCap().toLocaleString()}本</p>
  <table>
    <thead>
      <tr><th>タイトル</th><th>DLC</th><th>在庫</th><th>累計販売</th><th>レビュー</th><th>1本生産費</th><th>操作</th></tr>
    </thead>
    <tbody>
      {#each game.catalog as g, i (g.name)}
        <tr>
          <td>{g.name}</td>
          <td>
            {#if dlcDevStudios.some((s) => s.dlc?.catalogIdx === i)}
              {@const st = dlcDevStudios.find((s) => s.dlc?.catalogIdx === i)!}
              {@const p = st.dlc!}
              制作中「{p.name}」{Math.min(100, Math.floor((p.progress / p.target) * 100))}%
              <button onclick={() => cancelDlc(st.id)}>中止</button>
            {:else}
              {(g.dlcs?.length ?? 0)}本
              {#if canMakeDlc(g)}
                <button onclick={() => onDlcRequest(i)}>DLC制作</button>
              {/if}
            {/if}
            {#each g.dlcs ?? [] as d (d.name)}
              <div class="desc">「{d.name}」{d.reviewScore}点 / 累計{d.soldTotal.toLocaleString()}本</div>
            {/each}
          </td>
          <td>{g.inventory.toLocaleString()}本</td>
          <td>{g.soldTotal.toLocaleString()}本</td>
          <td>{g.reviewScore}点</td>
          <td>{man(unitCost(g.hardwareId))}</td>
          <td>
            <input class="qty" type="number" bind:value={restockQtys[i]} min="0" step="1000" placeholder={String(Math.floor(Math.min(g.expectedSales * 0.2, shipCap()) / 1000) * 1000)} />
            <button onclick={() => (restockQtys[i] = Math.max(0, (restockQtys[i] || 0) - 1000))}>−1000</button>
            <button onclick={() => (restockQtys[i] = Math.min(shipCap(), (restockQtys[i] || 0) + 1000))}>+1000</button>
            <button onclick={() => restock(i, restockQtys[i] || 0)} disabled={!(restockQtys[i] > 0) || !canRestock()}>再出荷</button>
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
  .qty {
    width: 90px;
  }
  .desc {
    color: #888;
    font-size: 0.75rem;
  }
</style>