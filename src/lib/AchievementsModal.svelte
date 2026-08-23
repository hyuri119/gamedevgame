<script lang="ts">
  import { game } from './game.svelte';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const achievements = $derived([
    { label: '累計販売10万本', done: game.totalSales >= 100000 },
    { label: '累計販売100万本', done: game.totalSales >= 1000000 },
    { label: '累計販売1000万本', done: game.totalSales >= 10000000 },
    { label: '殿堂入り1本', done: game.hallOfFame.length >= 1 },
    { label: 'グランプリ受賞', done: game.grandPrix >= 1 },
    { label: '知名度50', done: game.fame >= 50 },
    { label: 'テナント3つ', done: game.tenants.length >= 3 },
    { label: 'スタジオ3つ', done: game.studios.length >= 3 }
  ]);
</script>

<Modal title="実績" onclose={onclose}>
  <ul class="ach">
    {#each achievements as a}
      <li class:done={a.done}>{a.done ? '達成' : '未達成'}: {a.label}</li>
    {/each}
  </ul>
</Modal>

<style>
  .ach {
    list-style: none;
    padding: 0;
    font-size: 0.9rem;
  }
  .ach li.done {
    color: #0a7a0a;
  }
  .ach li {
    color: #999;
  }
</style>