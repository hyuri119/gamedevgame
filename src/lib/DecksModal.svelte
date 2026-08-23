<script lang="ts">
  import { game, exhibitStudio, exhibitCatalog, closeDecks, man } from './game.svelte';
  import Modal from './Modal.svelte';

  const deckPreRelease = $derived(
    game.studios.filter((s) => (s.dev && !s.dev.exhibited) || (s.completed && !s.completed.exhibited))
  );
  const deckCatalog = $derived(
    game.catalog.map((g, i) => ({ g, i })).filter((x) => !x.g.exhibited)
  );
</script>

<Modal title="ゲームデックス（9月）" onclose={closeDecks}>
  <p>出展する作品を選んでください（1作品につき出展費 {man(5000000)}・知名度アップ）。</p>
  <h3>発売前の作品</h3>
  {#each deckPreRelease as s (s.id)}
    <div class="prow">
      <span class="plabel">{s.name}: 「{s.dev?.name ?? s.completed?.name}」{s.dev ? '（開発中）' : `（完成・レビュー ${s.completed!.reviewScore}点）`}</span>
      <button onclick={() => exhibitStudio(s.id)}>出展</button>
    </div>
  {:else}
    <p class="pnote">出展できる発売前の作品はありません。</p>
  {/each}
  <h3>カタログ（発売済み）</h3>
  {#each deckCatalog as x (x.g.name)}
    <div class="prow">
      <span class="plabel">「{x.g.name}」（レビュー {x.g.reviewScore}点）</span>
      <button onclick={() => exhibitCatalog(x.i)}>出展</button>
    </div>
  {:else}
    <p class="pnote">出展できるカタログ作品はありません。</p>
  {/each}
  <button onclick={closeDecks}>閉じる</button>
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