<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './game.svelte';

  const W = 800;
  const H = 320;
  let canvas: HTMLCanvasElement;

  // 社員の位置（ビジュアル用の一時データ。ゲーム状態には入れない）
  const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();

  function sync() {
    for (const e of game.employees) {
      if (!pos.has(e.id)) {
        pos.set(e.id, {
          x: 50 + Math.random() * (W - 100),
          y: 50 + Math.random() * (H - 100),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2
        });
      }
    }
    for (const id of [...pos.keys()]) {
      if (!game.employees.some((e) => e.id === id)) pos.delete(id);
    }
  }

  const COLORS = ['#e07a5f', '#3d84a8', '#81b29a', '#f2cc8f', '#8d6a9f', '#eac435', '#6b9ac4', '#db5a42'];

  function draw() {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f5ecd9';
    ctx.fillRect(0, 0, W, H);

    // 床のライン
    ctx.strokeStyle = '#e2d5bb';
    ctx.lineWidth = 1;
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 机
    ctx.fillStyle = '#cbb896';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(80 + i * 115, H - 80, 90, 40);
    }

    sync();
    let i = 0;
    for (const e of game.employees) {
      const p = pos.get(e.id)!;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 16 || p.x > W - 16) p.vx *= -1;
      if (p.y < 16 || p.y > H - 16) p.vy *= -1;
      if (Math.random() < 0.02) {
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = (Math.random() - 0.5) * 2;
      }
      ctx.fillStyle = COLORS[i++ % COLORS.length];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.name.slice(0, 1), p.x, p.y + 1);
    }

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`社員 ${game.employees.length}人`, 8, H - 4);
  }

  let raf = 0;
  onMount(() => {
    raf = requestAnimationFrame(function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} width={W} height={H} class="office"></canvas>

<style>
  .office {
    width: 100%;
    max-width: 800px;
    border-radius: 6px;
    display: block;
  }
</style>
