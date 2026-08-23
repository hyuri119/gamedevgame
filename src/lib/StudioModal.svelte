<script lang="ts">
  import { game, foundStudio, acquireCompany } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let studioName = $state('');
  let studioLead = $state('');

  const empName = (id: string | null) => (id ? game.employees.find((e) => e.id === id)?.name ?? '?' : '');
</script>

<Modal title="スタジオ" onclose={onclose}>
  <ul>
    {#each game.studios as s (s.id)}
      <li>
        {s.name}{s.leadId ? `（責任者: ${empName(s.leadId)}）` : ''} -
        {#if s.dev}
          開発中「{s.dev.name}」
        {:else if s.completed}
          完成品「{s.completed.name}」（出荷待ち）
        {:else if s.contractId}
          受注開発中
        {:else if s.dlc}
          DLC制作中「{s.dlc.name}」
        {:else}
          待機中
        {/if}
      </li>
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

<style>
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