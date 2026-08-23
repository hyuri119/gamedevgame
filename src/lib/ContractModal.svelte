<script lang="ts">
  import { game, availableContracts, acceptContract, cancelContract } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title="受注開発（外注納品）" onclose={onclose}>
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
  .desc {
    color: #888;
    font-size: 0.75rem;
  }
</style>