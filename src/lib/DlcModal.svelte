<script lang="ts">
  import { game, startDlc, dlcCostOf, man } from './game.svelte';
  import Modal from './Modal.svelte';

  let { target, onclose }: { target: number; onclose: () => void } = $props();

  const targetGame = $derived(game.catalog[target]);
  const idleStudios = $derived(game.studios.filter((s) => !s.dev && !s.completed && !s.contractId && !s.dlc));

  const empName = (id: string | null) => (id ? game.employees.find((e) => e.id === id)?.name ?? '?' : '');
</script>

<Modal title={`DLC制作 - 「${targetGame.name}」`} onclose={onclose}>
  <p>制作するスタジオを選んでください（制作費 {man(dlcCostOf(targetGame.hardwareId))}・価格 {man(Math.max(100, Math.round(targetGame.price / 4)))}）。</p>
  {#each idleStudios as s (s.id)}
    <div class="prow">
      <span class="plabel">{s.name}{s.leadId ? `（責任者: ${empName(s.leadId)}）` : ''}</span>
      <button onclick={() => { startDlc(target, s.id); onclose(); }}>制作開始</button>
    </div>
  {:else}
    <p class="pnote">空いているスタジオがありません。本編開発や受注が終わるまでお待ちください。</p>
  {/each}
</Modal>

<style>
  .prow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0;
  }
  .plabel {
    min-width: 220px;
    font-size: 0.9rem;
  }
  .pnote {
    color: #888;
    font-size: 0.85rem;
  }
  button {
    cursor: pointer;
  }
</style>