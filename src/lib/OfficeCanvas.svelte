<script lang="ts">
  import { onMount } from 'svelte';
  import { game, man, devTarget, officeDesks } from './game.svelte';

  const W = 800;
  const H = 360;
  let canvas: HTMLCanvasElement;

  const DESK_W = 90;
  const DESK_H = 40;

  interface Agent {
    x: number;
    y: number;
    vx: number;
    vy: number;
    tx: number;
    ty: number;
    color: string;
    bob: number;
  }

  interface FloatText {
    x: number;
    y: number;
    vy: number;
    life: number;
    maxLife: number;
    text: string;
    color: string;
    size: number;
  }

  interface Confetti {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vrot: number;
    color: string;
    life: number;
  }

  interface Coin {
    x: number;
    y: number;
    vy: number;
    vx: number;
    life: number;
  }

  const agents = new Map<string, Agent>();
  const floats: FloatText[] = [];
  const confettis: Confetti[] = [];
  const coins: Coin[] = [];
  const steam: { x: number; y: number; t: number }[] = [];

  const COLORS = ['#e07a5f', '#3d84a8', '#81b29a', '#f2cc8f', '#8d6a9f', '#eac435', '#6b9ac4', '#db5a42', '#4a9e77', '#b56576'];
  const CONFETTI_COLORS = ['#e07a5f', '#3d84a8', '#eac435', '#81b29a', '#8d6a9f', '#f2cc8f'];

  function ensureAgent(id: string, color: string): Agent {
    let a = agents.get(id);
    if (!a) {
      a = {
        x: 60 + Math.random() * (W - 120),
        y: 60 + Math.random() * (H - 140),
        vx: 0,
        vy: 0,
        tx: W / 2,
        ty: H / 2,
        color,
        bob: Math.random() * 6
      };
      agents.set(id, a);
    }
    return a;
  }

  function removeMissing(ids: string[]) {
    for (const id of [...agents.keys()]) {
      if (!ids.includes(id)) agents.delete(id);
    }
  }

  function addFloat(text: string, color: string, size = 14) {
    const x = 80 + Math.random() * (W - 160);
    const y = 100 + Math.random() * 120;
    floats.push({ x, y, vy: -0.6, life: 0, maxLife: 120, text, color, size });
  }

  function burstConfetti(x: number, y: number) {
    for (let i = 0; i < 26; i++) {
      confettis.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        life: 0
      });
    }
  }

  function spawnCoins(x: number, count: number) {
    for (let i = 0; i < count; i++) {
      coins.push({ x: x + (Math.random() - 0.5) * 30, y: H - 40, vy: -1.5 - Math.random(), vx: (Math.random() - 0.5) * 1.2, life: 0 });
    }
  }

  // 前回フレームのスナップショット（イベント検出用）
  let prevMoney = 0;
  let prevEmpCount = 0;
  let prevCompleted = new Set<string>();
  let initialized = false;

  // 開発中のスタジオID → 机番号
  function workingStudios(): { id: number; progress: number; target: number }[] {
    const out: { id: number; progress: number; target: number }[] = [];
    for (const s of game.studios) {
      if (s.dev) {
        const t = devTarget(s.dev.hardwareId);
        out.push({ id: s.id, progress: s.dev.progress, target: t });
      } else if (s.dlc) {
        // DLC制作中も社員は机に着いて作業する
        out.push({ id: s.id, progress: s.dlc.progress, target: s.dlc.target });
      }
    }
    return out;
  }

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

    // 壁面の装飾（窓）
    ctx.fillStyle = '#dce8f5';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(24 + i * 160, 14, 70, 26);
    }
    ctx.strokeStyle = '#b9cfe8';
    ctx.strokeRect(24, 14, 70, 26);
    ctx.strokeRect(184, 14, 70, 26);
    ctx.strokeRect(344, 14, 70, 26);
    ctx.strokeRect(504, 14, 70, 26);
    ctx.strokeRect(664, 14, 70, 26);

    // サーバーラック
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(W - 56, 60, 44, 120);
    ctx.fillStyle = '#333';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(W - 50, 70 + s * 26, 32, 18);
    }
    // サーバーLED点滅
    const t = performance.now() / 600;
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = (Math.sin(t + s * 1.7) > 0.2) ? '#5eff8e' : '#2a6b3d';
      ctx.beginPath();
      ctx.arc(W - 44, 79 + s * 26, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#999';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SERVER', W - 34, 64);

    // 植物（ゆらゆら揺れる）
    const sway = Math.sin(performance.now() / 400) * 3;
    const potX = 46;
    const potY = H - 62;
    ctx.strokeStyle = '#3d7a3d';
    ctx.lineWidth = 3;
    for (let b = 0; b < 3; b++) {
      const bx = Math.sin(sway + b * 2.1) * 6;
      ctx.beginPath();
      ctx.moveTo(potX, potY - 8);
      ctx.quadraticCurveTo(potX + bx, potY - 26 - b * 8, potX + bx * 2, potY - 40 - b * 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#3d7a3d';
    for (let b = 0; b < 3; b++) {
      const bx = Math.sin(sway + b * 2.1) * 6;
      ctx.beginPath();
      ctx.arc(potX + bx * 2, potY - 42 - b * 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c9793a';
    ctx.fillRect(potX - 9, potY - 8, 18, 14);
    ctx.fillStyle = '#a85f2a';
    ctx.fillRect(potX - 9, potY + 2, 18, 6);

    // コーヒーマシン（蒸気が上がる）
    const cfX = 300;
    const cfY = H - 66;
    ctx.fillStyle = '#888a91';
    ctx.fillRect(cfX, cfY, 30, 26);
    ctx.fillRect(cfX + 8, cfY - 10, 14, 12);
    ctx.fillStyle = '#555';
    ctx.fillRect(cfX + 4, cfY + 2, 22, 3);
    for (let s = 0; s < 2; s++) {
      steam.push({ x: cfX + 10 + s * 8, y: cfY - 14 - s * 6, t: 0 });
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const st = steam[i];
      st.y -= 0.3;
      st.t += 1;
      if (st.t > 46) {
        steam.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.5 - st.t / 90)})`;
      ctx.beginPath();
      ctx.arc(st.x + Math.sin(st.t / 8) * 2, st.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 机（デスクモニタ付き）
    const work = workingStudios();
    const total = officeDesks();
    const rows = total > 6 ? 2 : 1;
    const perRow = Math.ceil(total / rows);
    const deskX = (i: number) => 80 + (i % perRow) * 115;
    const deskY = (row: number) => H - 70 - row * 80;
    for (let i = 0; i < total; i++) {
      const x = deskX(i);
      const y = deskY(Math.floor(i / perRow));
      const isUsed = i < work.length;
      ctx.fillStyle = isUsed ? '#b89a6f' : '#cbb896';
      ctx.fillRect(x, y, DESK_W, DESK_H);
      // デスクモニタ
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(x + 14, y - 16, 30, 18);
      ctx.fillStyle = isUsed ? '#6ee7ff' : '#1f3a4a';
      ctx.fillRect(x + 17, y - 13, 24, 12);
      if (isUsed) {
        ctx.fillStyle = '#0a1a22';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('░░', x + 20, y - 5);
        ctx.fillText('░░', x + 20, y - 1);
      }
      ctx.fillStyle = '#555';
      ctx.fillRect(x + 44, y + 8, 14, 4);
      ctx.fillRect(x + 50, y + 12, 8, 16);
      ctx.fillStyle = '#6b5a3f';
      ctx.fillRect(x + 8, y - 22, 16, 7);
    }

    // 社員イベント検出（money 増減・入社・完成）
    if (initialized) {
      const dMoney = game.money - prevMoney;
      if (dMoney > 0) {
        addFloat(`+${man(dMoney)}`, '#0a7a0a', 15);
        spawnCoins(100 + Math.random() * 600, Math.min(3, 1 + Math.floor(dMoney / 5000000)));
      } else if (dMoney < 0) {
        addFloat(`-${man(-dMoney)}`, '#c0392b', 13);
      }
      if (game.employees.length > prevEmpCount) {
        addFloat('♪ 入社！', '#8d6a9f', 15);
        burstConfetti(400, 180);
      }
      const nowCompleted = new Set(game.studios.map((s) => s.completed?.name ?? ''));
      for (const name of nowCompleted) {
        if (name && !prevCompleted.has(name)) {
          addFloat(`「${name}」完成！`, '#eac435', 17);
          burstConfetti(400, 160);
        }
      }
      prevCompleted = nowCompleted;
    }
    prevMoney = game.money;
    prevEmpCount = game.employees.length;
    initialized = true;

    // 社員の配置
    const empIds = game.employees.map((e) => e.id);
    removeMissing(empIds);

    // 開発中の机へ社員を割り当て（1机あたり最大3人、机数ぶんまで）
    const MAX_PER_DESK = 3;
    const assign = new Map<string, { deskIdx: number; seat: number }>();
    const deskCount = Math.max(work.length, 1);
    for (let i = 0; i < game.employees.length; i++) {
      const seat = Math.floor(i / deskCount);
      const deskIdx = i % deskCount;
      if (work.length > 0 && seat < MAX_PER_DESK) assign.set(empIds[i], { deskIdx, seat });
    }

    const deskSeatPos = (deskIdx: number, seat: number) => {
      const cx = deskX(deskIdx) + DESK_W / 2 - 6;
      const cy = deskY(Math.floor(deskIdx / perRow));
      if (seat === 0) return { x: cx, y: cy - 12 };
      if (seat === 1) return { x: cx - 26, y: cy + 12 };
      return { x: cx + 26, y: cy + 12 };
    };

    let ci = 0;
    for (const e of game.employees) {
      const a = ensureAgent(e.id, COLORS[ci % COLORS.length]);
      ci++;
      const as = assign.get(e.id);
      if (as) {
        // 開発中: 机に着いて作業
        const tgt = deskSeatPos(as.deskIdx, as.seat);
        a.tx = tgt.x;
        a.ty = tgt.y;
        a.vx = 0;
        a.vy = 0;
        const spd = 4;
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          a.x += (dx / dist) * spd;
          a.y += (dy / dist) * spd;
        } else {
          a.bob += 1;
        }
      } else {
        // 暇な社員: ふらふら歩き回る
        if (Math.hypot(a.tx - a.x, a.ty - a.y) < 4 || Math.random() < 0.005) {
          a.tx = 50 + Math.random() * (W - 100);
          a.ty = 90 + Math.random() * (H - 160);
        }
        const spd = 1.2;
        const dx = a.tx - a.x;
        const dy = a.ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          a.x += (dx / dist) * spd;
          a.y += (dy / dist) * spd;
        }
        a.bob += 1;
      }
    }

    // フローティングテキスト
    for (let f = floats.length - 1; f >= 0; f--) {
      const fl = floats[f];
      fl.y += fl.vy;
      fl.life += 1;
      if (fl.life > fl.maxLife) {
        floats.splice(f, 1);
        continue;
      }
      const alpha = 1 - fl.life / fl.maxLife;
      ctx.fillStyle = fl.color;
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fl.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.globalAlpha = 1;
    }

    // コイン粒子
    for (let c = coins.length - 1; c >= 0; c--) {
      const co = coins[c];
      co.y += co.vy;
      co.x += co.vx;
      co.vy += 0.04;
      co.life += 1;
      if (co.life > 60) {
        coins.splice(c, 1);
        continue;
      }
      ctx.fillStyle = '#ffd93b';
      ctx.beginPath();
      ctx.arc(co.x, co.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a200';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 紙吹雪
    for (let c = confettis.length - 1; c >= 0; c--) {
      const co = confettis[c];
      co.x += co.vx;
      co.y += co.vy;
      co.vy += 0.05;
      co.rot += co.vrot;
      co.life += 1;
      if (co.life > 90 || co.y > H + 20) {
        confettis.splice(c, 1);
        continue;
      }
      ctx.save();
      ctx.translate(co.x, co.y);
      ctx.rotate(co.rot);
      ctx.fillStyle = co.color;
      ctx.fillRect(-3, -2, 6, 4);
      ctx.restore();
    }

    for (const e of game.employees) {
      const a = agents.get(e.id)!;
      const as = assign.get(e.id);
      const isWork = !!as;
      const bobY = isWork ? Math.sin(a.bob / 5) * 2 : Math.sin(a.bob / 8) * 1;
      // 体
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y + bobY, 13, 0, Math.PI * 2);
      ctx.fill();
      // 顔
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(a.x, a.y + bobY - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(a.x - 2, a.y + bobY - 4, 1.3, 0, Math.PI * 2);
      ctx.arc(a.x + 2, a.y + bobY - 4, 1.3, 0, Math.PI * 2);
      ctx.fill();
      // 名前（頭の上）
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name.slice(0, 1), a.x, a.y + bobY + 20);

      if (isWork && as!.seat === 0) {
        // リーダーの頭上に進捗バーと作業アニメーション
        const wd = work[as!.deskIdx];
        const pct = Math.min(100, (wd.progress / wd.target) * 100);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(a.x - 22, a.y - 34, 44, 6);
        ctx.fillStyle = '#3d84a8';
        ctx.fillRect(a.x - 22, a.y - 34, 44 * (pct / 100), 6);
        // キータイプ風の「チャカチャカ」アニメ
        const kk = Math.floor(performance.now() / 180 + as!.deskIdx) % 3;
        ctx.fillStyle = '#555';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('.'.repeat(kk + 1), a.x, a.y + bobY - 44);
      }
    }

    // 開発中は机の横に「開発中」のラベル
    if (work.length > 0) {
      ctx.fillStyle = '#3d84a8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`開発中 ${work.length} 本`, 60, H - 6);
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
    border-radius: 6px;
    display: block;
  }
</style>
