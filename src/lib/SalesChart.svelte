<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './game.svelte';
  import { man } from './game.svelte';

  const W = 800;
  const H = 160;
  let canvas: HTMLCanvasElement;

  function draw() {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const hist = game.salesHistory;
    if (hist.length < 2) {
      ctx.fillStyle = '#999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('まだ売上データがありません（次の週を進めるとグラフが伸びます）', W / 2, H / 2);
      return;
    }

    const padL = 44;
    const padR = 10;
    const padT = 12;
    const padB = 20;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    // 累計売上
    let cum = 0;
    const cumPoints = hist.map((p) => (cum += p.revenue));
    const maxCum = Math.max(...cumPoints, 1);

    // グリッド
    ctx.strokeStyle = '#e8e2d5';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (ih * g) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const v = maxCum - (maxCum * g) / 4;
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(man(v), padL - 4, y + 3);
    }

    const x = (i: number) => padL + (i / (hist.length - 1)) * iw;
    const y = (v: number) => padT + ih - (v / maxCum) * ih;

    // 週売上（棒グラフ）
    const barW = Math.max(1, (iw / hist.length) * 0.6);
    ctx.fillStyle = 'rgba(212, 228, 255, 0.8)';
    for (let i = 0; i < hist.length; i++) {
      const hgt = (hist[i].revenue / maxCum) * ih;
      ctx.fillRect(x(i) - barW / 2, padT + ih - hgt, barW, hgt);
    }

    // 累計売上ライン
    ctx.strokeStyle = '#2a7a2a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < hist.length; i++) {
      const px = x(i);
      const py = y(cumPoints[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // ラベル
    const last = hist[hist.length - 1];
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`累計売上 ${man(cumPoints[cumPoints.length - 1])}`, padL, padT);
    ctx.fillStyle = '#2a7a2a';
    ctx.fillText(`今週売上 ${man(last.revenue)}`, W - padR - 150, padT);

    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('週', padL + iw / 2, H - 6);
    ctx.fillStyle = '#888';
    ctx.fillText(`累計販売 ${game.totalSales.toLocaleString()}本`, padL, H - 6);
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

<canvas bind:this={canvas} width={W} height={H} class="chart"></canvas>

<style>
  .chart {
    width: 100%;
    max-width: 800px;
    display: block;
    background: #fbf7ec;
    border: 1px solid #e5dcc5;
    border-radius: 6px;
  }
</style>
