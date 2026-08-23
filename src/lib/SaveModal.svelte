<script lang="ts">
  import { game, saveGame, loadGame, saveSlots, currentSlot, peekSlot } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title="セーブ / ロード" onclose={onclose}>
  <p>現在のスロット: スロット{currentSlot() + 1}（自動セーブはこのスロットへ）</p>
  <table>
    <thead>
      <tr><th>スロット</th><th>内容</th><th></th><th></th></tr>
    </thead>
    <tbody>
      {#each Array(saveSlots()) as _, i}
        <tr>
          <td>スロット{i + 1}{i === currentSlot() ? '（現在）' : ''}</td>
          <td>{peekSlot(i)}</td>
          <td><button onclick={() => saveGame(i)}>セーブ</button></td>
          <td><button onclick={() => { loadGame(i); onclose(); }} disabled={peekSlot(i) === '空き'}>ロード</button></td>
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