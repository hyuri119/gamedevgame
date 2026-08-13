<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="overlay" onclick={onclose}>
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="panel" onclick={(e) => e.stopPropagation()}>
    <div class="head">
      <h3>{title}</h3>
      <button class="x" onclick={onclose}>×</button>
    </div>
    <div class="body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .panel {
    background: #fff;
    border-radius: 8px;
    width: min(920px, 94vw);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #ddd;
  }
  .head h3 {
    margin: 0;
    font-size: 1.05rem;
  }
  .x {
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    border: none;
    background: none;
  }
  .body {
    padding: 14px;
    overflow-y: auto;
  }
</style>
