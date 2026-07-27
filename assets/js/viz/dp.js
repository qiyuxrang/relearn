/* ============================================================
   动态规划 · 贪心 · 回溯 动画模块
   dp-fib / dp-climb / dp-knapsack / dp-lcs / dp-lis /
   greedy-interval / backtrack-queens / backtrack-subset
   ============================================================ */

import {
  Player, svgEl, el, drawArray, drawTree, buildTable, setStage,
} from './engine.js';

/* ---------- 小工具 ---------- */
function mkLabel(text, inputEl) {
  const l = document.createElement('label');
  l.appendChild(document.createTextNode(text));
  l.appendChild(inputEl);
  return l;
}

/* ------------------------------------------------------------
   1. dp-fib：斐波那契三种算法对比
   ------------------------------------------------------------ */

/** 构造 fib(n) 的完整递归树（先序编号 = 调用顺序，中序定 x 坐标） */
function buildFibTree(n) {
  const nodes = [];
  const mk = (k, parent, depth) => {
    const nd = { id: nodes.length, k, parent, depth, l: null, r: null };
    nodes.push(nd);
    if (k >= 2) {
      nd.l = mk(k - 1, nd.id, depth + 1);
      nd.r = mk(k - 2, nd.id, depth + 1);
    }
    return nd;
  };
  mk(n, null, 0);
  let col = 0;
  const walk = (nd) => {
    if (nd.l) walk(nd.l);
    nd.x = col++ * 40;
    nd.y = nd.depth * 58;
    if (nd.r) walk(nd.r);
  };
  walk(nodes[0]);
  return nodes;
}

function fibViz(host) {
  const N = 5;
  const FIB = [0, 1, 1, 2, 3, 5];
  const tree = buildFibTree(N);

  const build = () => {
    const frames = [];

    /* —— 阶段① 朴素递归 —— */
    frames.push({
      mode: 'tree', show: 0, line: 1,
      vars: { 阶段: '① 朴素递归', 调用: 0 },
      say: `计算 <code>fib(${N})</code>。朴素递归把问题拆成 <code>fib(n-1)+fib(n-2)</code>，但它<b>不记任何结果</b>——下面逐次展开调用，看看代价。`,
    });

    const cnt = {};
    tree.forEach((nd, idx) => {
      cnt[nd.k] = (cnt[nd.k] || 0) + 1;
      const rep = cnt[nd.k] > 1;
      const red = rep ? tree.filter((t) => t.id <= nd.id && t.k === nd.k).map((t) => t.id) : [];
      frames.push({
        mode: 'tree', show: nd.id + 1, cur: nd.id, red, line: 1,
        vars: { 阶段: '① 朴素递归', 调用: { v: idx + 1, hot: rep }, 当前: `f(${nd.k})` },
        say: nd.k < 2
          ? `到达递归出口 <code>f(${nd.k}) = ${FIB[nd.k]}</code>，直接返回。${rep ? `注意：<b>这已经是第 ${cnt[nd.k]} 次计算 f(${nd.k})</b>（标红 = 重复劳动）。` : ''}`
          : rep
            ? `又调用了一次 <code>f(${nd.k})</code>——<b>第 ${cnt[nd.k]} 次从头算它</b>。递归不认得"以前算过"，只会傻傻重来。`
            : `调用 <code>f(${nd.k})</code>，往下拆成 <code>f(${nd.k - 1}) + f(${nd.k - 2})</code>。`,
      });
    });

    const dupAll = tree.filter((t) => cnt[t.k] > 1).map((t) => t.id);
    frames.push({
      mode: 'tree', show: tree.length, red: dupAll, line: 1,
      vars: { 阶段: '① 朴素递归', 总调用: { v: tree.length, hot: true } },
      say: `整棵树展开完毕：<b>共 ${tree.length} 次调用</b>——f(3) 算了 2 遍、f(2) 算了 3 遍、f(1) 算了 5 遍。调用数按 <code>O(2ⁿ)</code> 爆炸，<b>n=40 时约 3.3 亿次</b>。病根：相同子问题被反复重算。`,
    });

    /* —— 阶段② 记忆化 —— */
    frames.push({
      mode: 'tree', show: tree.length, memoMode: true, line: 3,
      vars: { 阶段: '② 记忆化', 调用: 0, memo: '[·,·,·,·,·,·]' },
      say: '同样的递归加一个 <code>memo</code> 数组：<b>算过的结果存起来，再被问到就直接查表</b>。整棵树先置灰，看哪些部分真的需要走。',
    });

    const memoSteps = [
      { id: 0, m: [], say: '调用 <code>f(5)</code>，memo 里还没有 → 老老实实往下递归。' },
      { id: 1, m: [], say: '调用 <code>f(4)</code>，未命中，继续拆。' },
      { id: 2, m: [], say: '调用 <code>f(3)</code>，未命中，继续拆。' },
      { id: 3, base: [4, 5], m: [2], say: '算 <code>f(2)</code>：两个孩子 f(1)=1、f(0)=0 都是出口。f(2)=1，<b>写入 memo[2]</b>。' },
      { id: 6, m: [2, 3], say: 'f(3) 的右孩子 f(1) 是出口，于是 f(3)=1+1=2，<b>写入 memo[3]</b>。' },
      { id: 7, hit: true, prune: [8, 9], m: [2, 3, 4], say: 'f(4) 轮到右孩子 <code>f(2)</code>——<b>memo 命中！</b>直接返回 1，它下面的子树（灰色）根本不用展开。f(4)=3 入表。' },
      { id: 10, hit: true, prune: [11, 12, 13, 14], m: [2, 3, 4, 5], say: 'f(5) 的右孩子 <code>f(3)</code> 又命中缓存，一整棵 5 节点的子树被剪掉。f(5)=3+2=<b>5</b>。' },
    ];

    const doneAcc = [], hitAcc = [], pruneAcc = [];
    let callCnt = 0, hitCnt = 0;
    memoSteps.forEach((s) => {
      callCnt += 1 + (s.base ? s.base.length : 0);
      if (s.hit) { hitCnt++; hitAcc.push(s.id); pruneAcc.push(...s.prune); }
      else doneAcc.push(s.id, ...(s.base || []));
      const memoStr = '[' + [0, 1, 2, 3, 4, 5].map((k) => (s.m.includes(k) ? FIB[k] : '·')).join(',') + ']';
      frames.push({
        mode: 'tree', show: tree.length, memoMode: true,
        cur: s.hit ? null : s.id,
        done: [...doneAcc], hit: [...hitAcc], prune: [...pruneAcc],
        line: s.hit ? 4 : 3,
        vars: { 阶段: '② 记忆化', 调用: callCnt, 命中: { v: hitCnt, hot: !!s.hit }, memo: memoStr },
        say: s.say,
      });
    });

    frames.push({
      mode: 'tree', show: tree.length, memoMode: true,
      done: [...doneAcc], hit: [...hitAcc], prune: [...pruneAcc], line: 4,
      vars: { 阶段: '② 记忆化', 总调用: 9, 对比: '9 vs 15' },
      say: '记忆化把调用从 <b>15 次降到 9 次</b>：每个子问题只真正算一次，复杂度降为 <code>O(n)</code>。n=40 时是 <b>约 3.3 亿次 → 79 次</b>的差距。<b>重叠子问题 + 缓存 = 记忆化搜索</b>。',
    });

    /* —— 阶段③ 自底向上 —— */
    const arr0 = FIB.map((v, i) => (i < 2 ? String(v) : ''));
    frames.push({
      mode: 'arr', a: arr0,
      stArr: FIB.map((_, i) => (i < 2 ? 'done' : 'idle')), line: 6,
      vars: { 阶段: '③ 自底向上', 'dp[0]': 0, 'dp[1]': 1 },
      say: '换个方向：<b>自底向上填表</b>。既然 f(i) 只依赖前两项，那就从小到大推，彻底不用递归。先放好出口 <code>dp[0]=0</code>、<code>dp[1]=1</code>。',
    });
    for (let i = 2; i <= N; i++) {
      frames.push({
        mode: 'arr',
        a: FIB.map((v, k) => (k <= i ? String(v) : '')),
        stArr: FIB.map((_, k) => (k === i ? 'active' : k === i - 1 || k === i - 2 ? 'compare' : k < i ? 'done' : 'idle')),
        ptrs: { i }, line: 7,
        vars: { 阶段: '③ 自底向上', i, [`dp[${i - 1}]`]: FIB[i - 1], [`dp[${i - 2}]`]: FIB[i - 2], [`dp[${i}]`]: { v: FIB[i], hot: true } },
        say: `<code>dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${FIB[i - 1]} + ${FIB[i - 2]} = <b>${FIB[i]}</b></code>。来源两格早已算好，<b>查表代替递归调用</b>。`,
      });
    }
    frames.push({
      mode: 'arr', a: FIB.map(String), stArr: FIB.map(() => 'done'), line: 7,
      vars: { 朴素递归: 'O(2ⁿ)', 记忆化: 'O(n)', 填表: 'O(n)' },
      say: `填表只做了 <b>${N - 1} 次加法</b>。三种解法对比：朴素递归 <code>O(2ⁿ)</code>（15 次调用）→ 记忆化 <code>O(n)</code>（9 次）→ 填表 <code>O(n)</code>（4 次加法、无递归栈开销，还能只留两个变量做到 <code>O(1)</code> 空间）。<b>DP 的本质：不重复计算重叠子问题。</b>`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '斐波那契：同一道题的三种算法',
    badge: '动态规划',
    speed: 1150,
    legend: [
      { c: '--viz-active', t: '当前调用' },
      { c: '--viz-path', t: '重复子问题' },
      { c: '--viz-pivot', t: '缓存命中' },
      { c: '--viz-dim', t: '被剪掉' },
      { c: '--viz-done', t: '已计算' },
    ],
    vars: true,
    pseudo: [
      '// ① 朴素递归：O(2^n)，重复计算灾难',
      'int fib(n) { return n < 2 ? n : fib(n-1) + fib(n-2); }',
      '// ② 记忆化：查表优先，O(n)',
      'int fib(n) { if (n < 2) return n;',
      '  if (memo[n] < 0) memo[n] = fib(n-1) + fib(n-2);  return memo[n]; }',
      '// ③ 自底向上填表：O(n)，无递归开销',
      'dp[0] = 0; dp[1] = 1;',
      'for (int i = 2; i <= n; ++i) dp[i] = dp[i-1] + dp[i-2];',
    ],
    build,
    draw(stage, f) {
      if (f.mode === 'arr') {
        setStage(stage, drawArray({ data: f.a, state: f.stArr, ptrs: f.ptrs }));
        return;
      }
      const red = f.red || [], done = f.done || [], hit = f.hit || [], prune = f.prune || [];
      const nodes = [];
      tree.forEach((nd) => {
        if (nd.id >= f.show) return;
        let state = 'visited', edgeState = 'idle';
        if (f.memoMode) {
          state = 'dim'; edgeState = 'dim';
          if (done.includes(nd.id)) { state = 'done'; edgeState = 'done'; }
          if (hit.includes(nd.id)) { state = 'pivot'; edgeState = 'pivot'; }
          if (prune.includes(nd.id)) { state = 'dim'; edgeState = 'dim'; }
          if (f.cur === nd.id) state = 'active';
        } else {
          if (red.includes(nd.id)) state = 'path';
          else if (f.cur === nd.id) state = 'active';
        }
        nodes.push({ id: nd.id, v: 'f' + nd.k, x: nd.x, y: nd.y, parent: nd.parent, state, edgeState });
      });
      setStage(stage, drawTree({ nodes }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   2. dp-climb：爬楼梯（dp[i]=dp[i-1]+dp[i-2] + 滚动变量）
   ------------------------------------------------------------ */
function climbViz(host, opts = {}) {
  let n = Math.max(3, Math.min(15, opts.n || 6));

  const build = () => {
    const dp = [1, 1];
    for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    const frames = [];
    const disp = (upto) => dp.map((v, k) => (k <= upto ? String(v) : '')).slice(0, n + 1);

    frames.push({
      a: disp(-1).map((_, k) => (k <= 1 ? String(dp[k]) : '')),
      st: dp.slice(0, n + 1).map((_, k) => (k <= 1 ? 'done' : 'idle')), line: 0,
      vars: { n, 'dp[0]': 1, 'dp[1]': 1 },
      say: `爬 ${n} 阶楼梯，每步走 1 或 2 阶，问有几种走法。<b>到第 i 阶的最后一步只有两种可能：从 i-1 跨 1 步，或从 i-2 跨 2 步</b>——两类走法互不重叠，所以直接相加。先放好起点：<code>dp[0]=1, dp[1]=1</code>。`,
    });

    let guard = 0;
    for (let i = 2; i <= n && guard++ < 20; i++) {
      frames.push({
        a: disp(i - 1),
        st: dp.slice(0, n + 1).map((_, k) => (k === i - 1 || k === i - 2 ? 'compare' : k < i ? 'done' : k === i ? 'active' : 'idle')),
        ptrs: { i }, line: 2,
        vars: { i, [`dp[${i - 1}]`]: dp[i - 1], [`dp[${i - 2}]`]: dp[i - 2] },
        say: `算 <code>dp[${i}]</code>：来源只有橙色两格——从第 ${i - 1} 阶迈 1 步（${dp[i - 1]} 种），或从第 ${i - 2} 阶迈 2 步（${dp[i - 2]} 种）。`,
      });
      frames.push({
        a: disp(i),
        st: dp.slice(0, n + 1).map((_, k) => (k === i ? 'active' : k < i ? 'done' : 'idle')),
        ptrs: { i }, line: 2,
        vars: { i, [`dp[${i}]`]: { v: dp[i], hot: true } },
        say: `写入 <code>dp[${i}] = ${dp[i - 1]} + ${dp[i - 2]} = <b>${dp[i]}</b></code>。`,
      });
    }

    frames.push({
      a: disp(n), st: dp.slice(0, n + 1).map(() => 'done'), line: 3,
      vars: { 答案: { v: dp[n], hot: true } },
      say: `答案：<code>dp[${n}] = <b>${dp[n]}</b></code> 种走法（就是斐波那契数列）。时间 <code>O(n)</code>、空间 <code>O(n)</code>。但注意——<b>每一步其实只用到了前两格</b>，整个数组大可不必。`,
    });

    /* 滚动变量阶段 */
    let a = 1, b = 1;
    frames.push({
      mode: 'roll', p: 1, q: 1, i: 1, line: 5,
      vars: { prev: 1, cur: 1 },
      say: '<b>滚动变量优化</b>：只留两个变量 <code>prev</code>（dp[i-2]）和 <code>cur</code>（dp[i-1]），空间从 O(n) 降到 <code>O(1)</code>。',
    });
    const rollShow = Math.min(n, 5);
    for (let i = 2; i <= n; i++) {
      const t = a + b;
      if (i <= rollShow) {
        frames.push({
          mode: 'roll', p: a, q: b, t, i, line: 6,
          vars: { i, prev: a, cur: b, next: { v: t, hot: true } },
          say: `第 ${i} 步：<code>next = prev + cur = ${a} + ${b} = ${t}</code>，然后两个变量<b>整体右移一格</b>：prev←cur、cur←next。旧的 dp[${i - 2}] 从此再也用不到，扔掉毫不可惜。`,
        });
      }
      a = b; b = t;
    }
    frames.push({
      mode: 'roll', p: a, q: b, i: n, fin: true, line: 7,
      vars: { 空间: 'O(1)', 时间: 'O(n)', 答案: { v: b, hot: true } },
      say: `${n > rollShow ? `后面每一步都同理，直接快进：` : ''}滚动到 i=${n}，<code>cur = <b>${b}</b></code> 就是答案。<b>只要状态转移只依赖固定几个旧状态，数组就能压成几个变量</b>——这是 DP 最常用的空间优化。`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '爬楼梯：最后一步只有两种可能',
    badge: '动态规划',
    speed: 1100,
    legend: [
      { c: '--viz-compare', t: '来源格' },
      { c: '--viz-active', t: '正在写入' },
      { c: '--viz-done', t: '已算好' },
    ],
    vars: true,
    pseudo: [
      'dp[0] = 1; dp[1] = 1;',
      'for (int i = 2; i <= n; ++i)',
      '  dp[i] = dp[i-1] + dp[i-2];',
      'return dp[n];',
      '// 滚动变量：O(n) 空间 → O(1)',
      'int prev = 1, cur = 1;',
      'for (i = 2..n) { next = prev + cur; prev = cur; cur = next; }',
      'return cur;',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'number';
      inp.min = 3; inp.max = 15; inp.value = n;
      inp.setAttribute('aria-label', '台阶数');
      const apply = () => {
        n = Math.max(3, Math.min(15, Number(inp.value) || n));
        inp.value = n;
        rebuild();
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      bar.append(mkLabel('台阶数 n (3~15)', inp), btn);
    },
    build,
    draw(stage, f) {
      if (f.mode === 'roll') {
        const W = 480, H = 150;
        const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 560), style: 'max-width:100%;height:auto' });
        const bw = 96, bh = 52, y = 46;
        const boxes = [
          { n: 'prev', v: f.p, x: 70, s: f.fin ? 'done' : 'compare' },
          { n: 'cur', v: f.q, x: 200, s: f.fin ? 'done' : 'compare' },
        ];
        if (f.t !== undefined) boxes.push({ n: 'next', v: f.t, x: 330, s: 'active' });
        boxes.forEach((b) => {
          svg.appendChild(svgEl('rect', { class: `v-cell s-${b.s}`, x: b.x, y, width: bw, height: bh, rx: 9 }));
          svg.appendChild(svgEl('text', { x: b.x + bw / 2, y: y + bh / 2, 'font-size': 17, 'font-weight': 700 }, String(b.v)));
          svg.appendChild(svgEl('text', { x: b.x + bw / 2, y: y - 13, 'font-size': 11.5, class: 'lbl-b' }, b.n));
        });
        if (f.t !== undefined) {
          svg.appendChild(svgEl('text', { x: 183, y: y + bh / 2, 'font-size': 15, class: 'lbl-b' }, '+'));
          svg.appendChild(svgEl('path', { class: 'v-arrow', d: `M168 ${y - 26} C 230 ${y - 46}, 300 ${y - 46}, 372 ${y - 24}`, stroke: 'var(--viz-active)', 'stroke-width': 2, fill: 'none' }));
          svg.appendChild(svgEl('path', { d: `M372 ${y - 24} l-9 -3 l3 9 z`, fill: 'var(--viz-active)' }));
          svg.appendChild(svgEl('text', { x: 270, y: y + bh + 24, 'font-size': 10.5, class: 'lbl' }, '算完后窗口右移：prev←cur，cur←next'));
        } else {
          svg.appendChild(svgEl('text', { x: 240, y: y + bh + 24, 'font-size': 10.5, class: 'lbl' }, f.fin ? '始终只占两个变量的内存' : '两个变量代替整个数组'));
        }
        setStage(stage, svg);
        return;
      }
      setStage(stage, drawArray({ data: f.a, state: f.st, ptrs: f.ptrs }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   3. dp-knapsack：0/1 背包（二维表 + 回溯选中物品）
   ------------------------------------------------------------ */
function knapsackViz(host) {
  const ITEMS = [
    { name: 'A', w: 1, v: 15 },
    { name: 'B', w: 3, v: 20 },
    { name: 'C', w: 4, v: 30 },
  ];
  const CAP = 4;
  const N = ITEMS.length;

  const build = () => {
    /* 先算完整 dp 表：dp[i][j] = 前 i 件物品、容量 j 的最大价值 */
    const dp = Array.from({ length: N + 1 }, () => Array(CAP + 1).fill(0));
    for (let i = 1; i <= N; i++) {
      for (let j = 0; j <= CAP; j++) {
        dp[i][j] = dp[i - 1][j];
        if (j >= ITEMS[i - 1].w) dp[i][j] = Math.max(dp[i][j], dp[i - 1][j - ITEMS[i - 1].w] + ITEMS[i - 1].v);
      }
    }

    const frames = [];
    const snap = (fi, fj) => {
      const t = [];
      for (let i = 0; i <= N; i++) {
        t.push([]);
        for (let j = 0; j <= CAP; j++) {
          const filled = i < fi || (i === fi && j <= fj);
          t[i].push(filled ? dp[i][j] : '');
        }
      }
      return t;
    };

    frames.push({
      tbl: snap(0, CAP), line: 0,
      vars: { 容量: CAP, 物品数: N },
      say: `背包容量 <b>${CAP}</b>，3 件物品（重量/价值见左侧）。<code>dp[i][j]</code> 定义为：<b>只考虑前 i 件物品、容量为 j 时能拿到的最大价值</b>。第 0 行是"一件都不考虑"，全为 0——这就是边界。`,
    });

    let guard = 0;
    for (let i = 1; i <= N; i++) {
      const it = ITEMS[i - 1];
      frames.push({
        tbl: snap(i - 1, CAP), item: i - 1, line: 1,
        vars: { i, 物品: it.name, 重量: it.w, 价值: it.v },
        say: `第 ${i} 行：轮到物品 <b>${it.name}</b>（重 ${it.w}，值 ${it.v}）。对每个容量 j 只问一个问题：<b>这件装还是不装？</b>`,
      });
      for (let j = 0; j <= CAP && guard++ < 60; j++) {
        const skip = dp[i - 1][j];
        if (j < it.w) {
          frames.push({
            tbl: snap(i, j), cur: [i, j], from: [[i - 1, j]], item: i - 1, line: 3,
            vars: { i, j, 装不下: `${j} < ${it.w}` },
            say: `<code>j=${j}</code>：${it.name} 重 ${it.w}，容量 ${j} <b>装不下</b>，只能继承"不装"的结果——抄上方格子 <code>dp[${i - 1}][${j}] = ${skip}</code>。`,
          });
        } else {
          const take = dp[i - 1][j - it.w] + it.v;
          const chose = take > skip;
          frames.push({
            tbl: snap(i, j), cur: [i, j], from: [[i - 1, j]], from2: [[i - 1, j - it.w]], item: i - 1, line: chose ? 5 : 4,
            vars: { i, j, 不装: skip, 装: `${dp[i - 1][j - it.w]}+${it.v}=${take}` },
            say: `<code>j=${j}</code>：<b>不装</b>=上方 ${skip}；<b>装</b>=先留出 ${it.w} 容量（左上方 <code>dp[${i - 1}][${j - it.w}]=${dp[i - 1][j - it.w]}</code>）再加价值 ${it.v} = ${take}。<code>max(${skip}, ${take}) = <b>${dp[i][j]}</b></code>，${chose ? `装 ${it.name} 更划算` : '不装更划算（或持平）'}。`,
          });
        }
      }
    }

    /* 回溯 */
    const picked = [];
    const pathCells = [];
    let bi = N, bj = CAP;
    frames.push({
      tbl: snap(N, CAP), cur: [N, CAP], line: 6,
      vars: { 最大价值: { v: dp[N][CAP], hot: true } },
      say: `表填满了，答案在右下角：<code>dp[${N}][${CAP}] = <b>${dp[N][CAP]}</b></code>。但它只说"最多值多少"，<b>到底装了哪几件？从右下角反向回溯</b>：看每一格的值是从哪来的。`,
    });
    let guard2 = 0;
    while (bi > 0 && guard2++ < 10) {
      const it = ITEMS[bi - 1];
      pathCells.push([bi, bj]);
      if (dp[bi][bj] === dp[bi - 1][bj]) {
        frames.push({
          tbl: snap(N, CAP), path: [...pathCells], cur: [bi - 1, bj], item: bi - 1, line: 7,
          vars: { 检查: it.name, 结论: '没装' },
          say: `<code>dp[${bi}][${bj}] = dp[${bi - 1}][${bj}] = ${dp[bi][bj]}</code>，值与上方相同 → 物品 <b>${it.name} 没被装入</b>，直接上移一行。`,
        });
      } else {
        picked.unshift(it.name);
        frames.push({
          tbl: snap(N, CAP), path: [...pathCells], cur: [bi - 1, bj - it.w], item: bi - 1, pickedIdx: ITEMS.map((x, k) => (picked.includes(x.name) ? k : -1)).filter((k) => k >= 0), line: 7,
          vars: { 检查: it.name, 结论: { v: '装了！', hot: true }, 已选: picked.join('+') },
          say: `<code>dp[${bi}][${bj}] = ${dp[bi][bj]} ≠ 上方的 ${dp[bi - 1][bj]}</code> → 这个值只能来自"装"的分支，<b>物品 ${it.name} 在最优解里</b>。跳到左上方 <code>dp[${bi - 1}][${bj - it.w}]</code> 继续。`,
        });
        bj -= it.w;
      }
      bi--;
    }
    frames.push({
      tbl: snap(N, CAP), path: pathCells, pickedIdx: ITEMS.map((x, k) => (picked.includes(x.name) ? k : -1)).filter((k) => k >= 0), line: 7,
      vars: { 方案: picked.join(' + '), 总重: picked.reduce((s, nm) => s + ITEMS.find((x) => x.name === nm).w, 0), 总价值: dp[N][CAP] },
      say: `回溯完成：最优方案是 <b>${picked.join(' + ')}</b>，总重 ${picked.reduce((s, nm) => s + ITEMS.find((x) => x.name === nm).w, 0)} ≤ ${CAP}，总价值 <b>${dp[N][CAP]}</b>。时间 <code>O(n·W)</code>——注意 W 是数值不是规模，所以这叫<b>伪多项式</b>复杂度。`,
    });

    return { frames, meta: {} };
  };

  const drawItems = (f) => {
    const W = 240, rowH = 44;
    const H = N * (rowH + 8) + 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, style: 'max-width:100%;height:auto' });
    svg.appendChild(svgEl('text', { x: W / 2, y: 12, 'font-size': 11, class: 'lbl-b' }, '物品清单'));
    ITEMS.forEach((it, k) => {
      const y = 26 + k * (rowH + 8);
      const picked = (f.pickedIdx || []).includes(k);
      const cur = f.item === k;
      svg.appendChild(svgEl('rect', {
        class: `v-cell s-${picked ? 'done' : cur ? 'active' : 'idle'}`,
        x: 16, y, width: W - 32, height: rowH, rx: 8,
      }));
      svg.appendChild(svgEl('text', { x: 44, y: y + rowH / 2, 'font-size': 14, 'font-weight': 700 }, it.name));
      svg.appendChild(svgEl('text', {
        x: 140, y: y + rowH / 2, 'font-size': 11,
        fill: picked || cur ? '#06131F' : 'var(--fg-muted)', 'font-family': 'var(--font-sans)',
      }, `重 ${it.w} · 值 ${it.v}${picked ? ' ✓' : ''}`));
    });
    return svg;
  };

  return new Player({
    title: '0/1 背包：装还是不装，max 说了算',
    badge: '动态规划',
    speed: 1250,
    legend: [
      { c: '--accent', t: '当前格' },
      { c: '--primary', t: '来源·不装（正上方）' },
      { c: '--ok', t: '来源·装（左上方）/ 回溯路径' },
    ],
    vars: true,
    pseudo: [
      'for (int i = 1; i <= n; ++i)      // 逐件物品',
      '  for (int j = 0; j <= W; ++j) {  // 逐个容量',
      '    dp[i][j] = dp[i-1][j];             // 不装',
      '    if (j >= w[i])                     // 装得下才可选',
      '      dp[i][j] = max(dp[i][j],',
      '                     dp[i-1][j-w[i]] + v[i]);  // 装',
      '  }',
      '// 答案 dp[n][W]；从右下角回溯找方案',
    ],
    build,
    draw(stage, f) {
      const head = ['i \\ j', ...Array.from({ length: CAP + 1 }, (_, j) => String(j))];
      const rows = f.tbl.map((row, i) => {
        const label = i === 0 ? '∅' : `${ITEMS[i - 1].name}(w${ITEMS[i - 1].w})`;
        return [{ v: label, cls: '' }, ...row.map((c, j) => {
          let cls = '';
          if (f.path && f.path.some(([pi, pj]) => pi === i && pj === j)) cls = 'is-fin';
          if (f.from && f.from.some(([pi, pj]) => pi === i && pj === j)) cls = 'is-set';
          if (f.from2 && f.from2.some(([pi, pj]) => pi === i && pj === j)) cls = 'is-fin';
          if (f.cur && f.cur[0] === i && f.cur[1] === j) cls = 'is-hot';
          return { v: c === '' ? '·' : String(c), cls };
        })];
      });
      const wrap = el('div', 'viz__split');
      wrap.appendChild(drawItems(f));
      const tblBox = el('div');
      tblBox.appendChild(buildTable({ head, rows }));
      wrap.appendChild(tblBox);
      setStage(stage, wrap);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   4. dp-lcs：最长公共子序列（二维表 + 回溯输出 LCS）
   ------------------------------------------------------------ */
function lcsViz(host) {
  const S = 'ABCBDAB';
  const T = 'BDCABA';
  const m = S.length, n = T.length;

  const build = () => {
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = S[i - 1] === T[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const frames = [];
    const snap = (fi, fj) => {
      const t = [];
      for (let i = 0; i <= m; i++) {
        t.push([]);
        for (let j = 0; j <= n; j++) t[i].push(i < fi || (i === fi && j <= fj) || i === 0 || j === 0 ? dp[i][j] : '');
      }
      return t;
    };

    frames.push({
      tbl: snap(0, n), line: 0,
      vars: { s1: S, s2: T },
      say: `求 <code>"${S}"</code> 与 <code>"${T}"</code> 的<b>最长公共子序列</b>（可以不连续，但顺序不能变）。<code>dp[i][j]</code> = s1 前 i 个字符与 s2 前 j 个字符的 LCS 长度。第 0 行/列表示空串，LCS 自然是 0。`,
    });

    let guard = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n && guard++ < 80; j++) {
        const eq = S[i - 1] === T[j - 1];
        if (eq) {
          frames.push({
            tbl: snap(i, j), cur: [i, j], diag: [i - 1, j - 1], hi: i - 1, hj: j - 1, line: 3,
            vars: { i, j, 字符: `'${S[i - 1]}' = '${T[j - 1]}'`, [`dp[${i}][${j}]`]: { v: dp[i][j], hot: true } },
            say: `<code>s1[${i - 1}]='${S[i - 1]}'</code> 与 <code>s2[${j - 1}]='${T[j - 1]}'</code> <b>相等</b>！这个公共字符必然可以接在"双方都去掉它"的 LCS 末尾：<code>dp[${i}][${j}] = 对角 ${dp[i - 1][j - 1]} + 1 = <b>${dp[i][j]}</b></code>。`,
          });
        } else {
          const up = dp[i - 1][j], lf = dp[i][j - 1];
          frames.push({
            tbl: snap(i, j), cur: [i, j], from: [[i - 1, j], [i, j - 1]], hi: i - 1, hj: j - 1, line: 4,
            vars: { i, j, 字符: `'${S[i - 1]}' ≠ '${T[j - 1]}'`, 上: up, 左: lf },
            say: `<code>'${S[i - 1]}' ≠ '${T[j - 1]}'</code>，两个字符不可能同时留在 LCS 里 → 至少丢一个：丢 s1 的（上方 ${up}）或丢 s2 的（左方 ${lf}），取大者 <code>max(${up}, ${lf}) = <b>${dp[i][j]}</b></code>。`,
          });
        }
      }
    }

    /* 回溯 */
    frames.push({
      tbl: snap(m, n), cur: [m, n], line: 6,
      vars: { LCS长度: { v: dp[m][n], hot: true } },
      say: `右下角 <code>dp[${m}][${n}] = <b>${dp[m][n]}</b></code> 就是 LCS 长度。要还原具体是哪几个字符，<b>从右下角沿"值的来路"往回走</b>：对角来的就收下字符，否则往值更大的方向退。`,
    });

    let bi = m, bj = n;
    const lcs = [];
    const pathCells = [[m, n]];
    let guard2 = 0;
    while (bi > 0 && bj > 0 && guard2++ < 20) {
      if (S[bi - 1] === T[bj - 1]) {
        lcs.unshift(S[bi - 1]);
        bi--; bj--;
        pathCells.push([bi, bj]);
        frames.push({
          tbl: snap(m, n), path: [...pathCells], cur: [bi, bj], hi: bi, hj: bj, line: 7,
          vars: { 收下: `'${lcs[0]}'`, 已还原: lcs.join('') },
          say: `这一格由<b>对角 +1</b> 而来 → 字符 <code>'${lcs[0]}'</code> 属于 LCS，收下并沿对角线退一步。当前还原出：<code>"${lcs.join('')}"</code>。`,
        });
      } else if (dp[bi - 1][bj] >= dp[bi][bj - 1]) {
        const up = dp[bi - 1][bj], lf = dp[bi][bj - 1];
        bi--;
        pathCells.push([bi, bj]);
        frames.push({
          tbl: snap(m, n), path: [...pathCells], cur: [bi, bj], line: 7,
          vars: { 移动: '↑', 已还原: lcs.join('') || '-' },
          say: `字符不等，且上方 ${up} ≥ 左方 ${lf}——值继承自上方，<b>向上退</b>（相当于当初丢掉了 s1 的字符）。`,
        });
      } else {
        bj--;
        pathCells.push([bi, bj]);
        frames.push({
          tbl: snap(m, n), path: [...pathCells], cur: [bi, bj], line: 7,
          vars: { 移动: '←', 已还原: lcs.join('') || '-' },
          say: `字符不等，左方更大——值来自左边，<b>向左退</b>。`,
        });
      }
    }

    frames.push({
      tbl: snap(m, n), path: pathCells, lcsDone: lcs.join(''), line: 7,
      vars: { LCS: { v: `"${lcs.join('')}"`, hot: true }, 长度: dp[m][n], 复杂度: 'O(mn)' },
      say: `回溯到边界，LCS = <code>"<b>${lcs.join('')}</b>"</code>。填表 <code>O(m·n)</code>。这套"表存长度、回溯还原方案"的两段式，是 diff 工具、git 合并背后的核心算法。`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '最长公共子序列：相等走对角，不等取 max',
    badge: '动态规划',
    speed: 1200,
    legend: [
      { c: '--accent', t: '当前格' },
      { c: '--primary', t: '来源(上/左)' },
      { c: '--ok', t: '对角来源 / 回溯路径' },
    ],
    vars: true,
    pseudo: [
      'for (int i = 1; i <= m; ++i)',
      '  for (int j = 1; j <= n; ++j)',
      '    if (s1[i-1] == s2[j-1])',
      '      dp[i][j] = dp[i-1][j-1] + 1;      // 对角 +1',
      '    else',
      '      dp[i][j] = max(dp[i-1][j], dp[i][j-1]);',
      '// dp[m][n] 即 LCS 长度',
      '// 回溯：对角来→收字符；否则走值大的方向',
    ],
    build,
    draw(stage, f) {
      /* 字符串对照 SVG */
      const cw = 28;
      const W = 50 + Math.max(m, n) * (cw + 4) + 12, H = 128;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 320), style: 'max-width:100%;height:auto' });
      const drawStr = (str, y, hiIdx, label) => {
        svg.appendChild(svgEl('text', { x: 18, y: y + 15, 'font-size': 10.5, class: 'lbl-b', 'text-anchor': 'start' }, label));
        for (let k = 0; k < str.length; k++) {
          const x = 50 + k * (cw + 4);
          svg.appendChild(svgEl('rect', {
            class: `v-cell s-${k === hiIdx ? 'compare' : 'idle'}`,
            x, y, width: cw, height: cw, rx: 6,
          }));
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + cw / 2, 'font-size': 13 }, str[k]));
        }
      };
      drawStr(S, 16, f.hi != null ? f.hi : -1, 's1');
      drawStr(T, 64, f.hj != null ? f.hj : -1, 's2');
      if (f.lcsDone) {
        svg.appendChild(svgEl('text', { x: W / 2, y: 114, 'font-size': 11.5, fill: 'var(--ok)', 'font-weight': 700 }, `LCS = "${f.lcsDone}"`));
      }

      const head = ['', '∅', ...T.split('')];
      const rows = f.tbl.map((row, i) => {
        const label = i === 0 ? '∅' : S[i - 1];
        return [{ v: `<b>${label}</b>`, cls: '' }, ...row.map((c, j) => {
          let cls = '';
          if (f.path && f.path.some(([pi, pj]) => pi === i && pj === j)) cls = 'is-fin';
          if (f.from && f.from.some(([pi, pj]) => pi === i && pj === j)) cls = 'is-set';
          if (f.diag && f.diag[0] === i && f.diag[1] === j) cls = 'is-fin';
          if (f.cur && f.cur[0] === i && f.cur[1] === j) cls = 'is-hot';
          return { v: c === '' ? '·' : String(c), cls };
        })];
      });

      const wrap = el('div', 'viz__split');
      wrap.appendChild(svg);
      const tblBox = el('div');
      tblBox.appendChild(buildTable({ head, rows }));
      wrap.appendChild(tblBox);
      setStage(stage, wrap);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   5. dp-lis：最长上升子序列（O(n²) DP → 贪心+二分 tails）
   ------------------------------------------------------------ */
function lisViz(host) {
  const A = [3, 1, 5, 2, 6, 4];
  const n = A.length;

  const build = () => {
    const frames = [];

    /* —— 阶段① O(n²) DP —— */
    const dp = Array(n).fill(1);
    frames.push({
      mode: 'dp', dp: [...dp], st: A.map(() => 'idle'), line: 0,
      vars: { 阶段: '① O(n²) DP', 定义: 'dp[i]=以 a[i] 结尾的 LIS 长' },
      say: `求 <code>[${A.join(', ')}]</code> 的<b>最长上升子序列</b>。定义 <code>dp[i]</code> = <b>以 a[i] 结尾</b>的 LIS 长度（柱子上方的数字）。初始都是 1——每个元素自己就是长度 1 的序列。`,
    });

    let guard = 0;
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i && guard++ < 40; j++) {
        const ok = A[j] < A[i];
        const st = A.map((_, k) => (k === i ? 'active' : k === j ? 'compare' : k < i ? 'visited' : 'idle'));
        const improve = ok && dp[j] + 1 > dp[i];
        if (improve) dp[i] = dp[j] + 1;
        frames.push({
          mode: 'dp', dp: [...dp], st, ptrs: { i, j }, line: ok ? 3 : 2,
          vars: { i, j, [`a[${j}]<a[${i}]`]: ok ? '是' : '否', [`dp[${i}]`]: improve ? { v: dp[i], hot: true } : dp[i] },
          say: ok
            ? (improve
              ? `<code>a[${j}]=${A[j]} &lt; a[${i}]=${A[i]}</code>，a[${i}] 可以接在它后面 → <code>dp[${i}] = dp[${j}]+1 = <b>${dp[i]}</b></code>，变长了！`
              : `<code>a[${j}]=${A[j]} &lt; a[${i}]=${A[i]}</code> 可接，但 <code>dp[${j}]+1=${dp[j] + 1}</code> 不比现在的 ${dp[i]} 好，不更新。`)
            : `<code>a[${j}]=${A[j]} ≥ a[${i}]=${A[i]}</code>，接上去就不"上升"了，跳过。`,
        });
      }
    }
    const best = Math.max(...dp);
    frames.push({
      mode: 'dp', dp: [...dp], st: A.map((_, k) => (dp[k] === best ? 'done' : 'visited')), line: 4,
      vars: { 答案: { v: best, hot: true }, 复杂度: 'O(n²)' },
      say: `扫完，答案 = <code>max(dp) = <b>${best}</b></code>（如 1→2→4 或 1→5→6）。每个 i 都要回头扫所有 j，<b>O(n²)</b>。瓶颈在哪？我们只想知道"前面有没有更小的结尾"——这个查询可以更快。`,
    });

    /* —— 阶段② 贪心 + 二分（tails） —— */
    const tails = [];
    frames.push({
      mode: 'tails', tails: [], st: A.map(() => 'idle'), line: 5,
      vars: { 阶段: '② 贪心+二分', 'tails 定义': 'tails[k]=长 k+1 的 LIS 的最小结尾' },
      say: '换思路：维护 <code>tails</code> 数组，<code>tails[k]</code> = <b>所有长度为 k+1 的上升子序列中，结尾最小的那个</b>。为什么盯着"最小结尾"？——<b>结尾越小，后面越容易接新元素</b>，它是同长度里"最有前途"的代表。',
    });

    let guard2 = 0;
    for (let i = 0; i < n && guard2++ < 12; i++) {
      const x = A[i];
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
      const pos = lo;
      const append = pos === tails.length;
      const old = tails[pos];
      tails[pos] = x;
      frames.push({
        mode: 'tails', tails: [...tails], hot: pos, cur: i,
        st: A.map((_, k) => (k === i ? 'active' : k < i ? 'visited' : 'idle')),
        line: append ? 8 : 9,
        vars: { i, 元素: x, 二分位置: pos, tails: `[${tails.join(',')}]` },
        say: append
          ? `取 <code>${x}</code>，二分发现它比所有结尾都大 → <b>追加</b>到 tails 末尾。LIS 长度增加到 <b>${tails.length}</b>。`
          : `取 <code>${x}</code>，二分找到第一个 ≥ 它的位置 ${pos}（原值 ${old}），<b>替换</b>：${old} → ${x}。长度不变，但"长 ${pos + 1} 的最小结尾"变小了——<b>不是白干，是给未来铺路</b>：结尾更小，后面能接的元素更多。`,
      });
    }

    frames.push({
      mode: 'tails', tails: [...tails], st: A.map(() => 'done'), fin: true, line: 10,
      vars: { LIS长度: { v: tails.length, hot: true }, 复杂度: 'O(n log n)' },
      say: `结束：<code>tails</code> 长度 = LIS 长度 = <b>${tails.length}</b>。关键不变量：<b>tails 始终严格递增</b>（若 tails[k]≥tails[k+1]，那长 k+2 的序列去掉尾巴就得到更小的长 k+1 结尾，矛盾），所以才能二分。每个元素一次二分，总共 <code>O(n log n)</code>。注意 tails 本身<b>不是</b>一条合法 LIS，它只记录"各长度的最小结尾"。`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '最长上升子序列：从 O(n²) 到 O(n log n)',
    badge: '动态规划',
    speed: 1150,
    legend: [
      { c: '--viz-active', t: '当前元素 i' },
      { c: '--viz-compare', t: '回扫 j' },
      { c: '--viz-visited', t: '已处理' },
      { c: '--viz-pivot', t: 'tails 被改' },
    ],
    vars: true,
    pseudo: [
      '// ① O(n²)：dp[i] = 以 a[i] 结尾的 LIS 长度',
      'for (int i = 0; i < n; ++i)',
      '  for (int j = 0; j < i; ++j)',
      '    if (a[j] < a[i]) dp[i] = max(dp[i], dp[j]+1);',
      '// 答案 = max(dp)',
      '// ② O(n log n)：tails[k] = 长 k+1 的最小结尾',
      'for (int x : a) {',
      '  auto it = lower_bound(tails.begin(), tails.end(), x);',
      '  if (it == tails.end()) tails.push_back(x);  // 变长',
      '  else *it = x;                               // 换更小结尾',
      '}  // 答案 = tails.size()',
    ],
    build,
    draw(stage, f) {
      const maxV = Math.max(...A);
      const cw = 44, gap = 14, barH = 110, top = 40;
      const W = 24 + n * (cw + gap);
      const tailsH = f.mode === 'tails' ? 92 : 0;
      const H = top + barH + 26 + tailsH;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 520), style: 'max-width:100%;height:auto' });

      A.forEach((v, k) => {
        const x = 12 + k * (cw + gap);
        const h = Math.max(8, (v / maxV) * barH);
        const y = top + (barH - h);
        const st = (f.st && f.st[k]) || 'idle';
        svg.appendChild(svgEl('rect', { class: `v-cell s-${st}`, x, y, width: cw, height: h, rx: 6 }));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + h / 2, 'font-size': 13 }, String(v)));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: top + barH + 13, 'font-size': 9.5, class: 'lbl' }, String(k)));
        /* dp 值标在柱子上方 */
        if (f.mode === 'dp' && f.dp) {
          svg.appendChild(svgEl('text', {
            x: x + cw / 2, y: y - 11, 'font-size': 11.5,
            fill: 'var(--accent)', 'font-weight': 700, 'font-family': 'var(--font-mono)',
          }, `dp=${f.dp[k]}`));
        }
        if (f.mode === 'tails' && f.cur === k) {
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: y - 11, 'font-size': 11, fill: 'var(--viz-active)', 'font-weight': 700 }, '当前'));
        }
      });

      /* 指针三角 */
      if (f.ptrs) {
        for (const name in f.ptrs) {
          const at = f.ptrs[name];
          if (at == null || at < 0 || at >= n) continue;
          const x = 12 + at * (cw + gap) + cw / 2;
          svg.appendChild(svgEl('text', { x, y: 12, 'font-size': 11, fill: 'var(--viz-active)', 'font-weight': 700 }, name));
        }
      }

      /* tails 数组 */
      if (f.mode === 'tails') {
        const ty = top + barH + 34;
        svg.appendChild(svgEl('text', { x: 12, y: ty + 8, 'font-size': 11, class: 'lbl-b', 'text-anchor': 'start' }, 'tails（各长度的最小结尾，始终递增）'));
        const tw = 40;
        (f.tails || []).forEach((v, k) => {
          const x = 12 + k * (tw + 8), y = ty + 16;
          const st = f.fin ? 'done' : f.hot === k ? 'pivot' : 'idle';
          svg.appendChild(svgEl('rect', { class: `v-cell s-${st}`, x, y, width: tw, height: 34, rx: 6 }));
          svg.appendChild(svgEl('text', { x: x + tw / 2, y: y + 17, 'font-size': 13 }, String(v)));
          svg.appendChild(svgEl('text', { x: x + tw / 2, y: y + 44, 'font-size': 9, class: 'lbl' }, `长${k + 1}`));
        });
        if (!(f.tails || []).length) {
          svg.appendChild(svgEl('text', { x: 60, y: ty + 34, 'font-size': 10.5, class: 'lbl', 'text-anchor': 'start' }, '（空）'));
        }
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   6. greedy-interval：区间调度贪心（按右端点排序）
   ------------------------------------------------------------ */
function intervalViz(host) {
  const RAW = [
    { id: 0, s: 1, e: 4, name: 'A' },
    { id: 1, s: 3, e: 5, name: 'B' },
    { id: 2, s: 0, e: 6, name: 'C' },
    { id: 3, s: 5, e: 7, name: 'D' },
    { id: 4, s: 3, e: 9, name: 'E' },
    { id: 5, s: 6, e: 10, name: 'F' },
    { id: 6, s: 8, e: 11, name: 'G' },
  ];
  const MAXT = 12;

  const build = () => {
    const frames = [];
    const sorted = [...RAW].sort((a, b) => a.e - b.e);

    frames.push({
      order: RAW.map((r) => r.id), states: {}, line: 0,
      vars: { 区间数: RAW.length, 目标: '选最多互不重叠的区间' },
      say: '7 个活动抢同一间会议室，<b>最多能安排几场</b>（时间不能重叠）？直觉可能是"选最短的"或"选最早开始的"——都不对。正确贪心：<b>按右端点（结束时间）排序</b>。',
    });

    frames.push({
      order: sorted.map((r) => r.id), states: {}, sorted: true, line: 1,
      vars: { 排序依据: '右端点升序', 顺序: sorted.map((r) => r.name).join(' ') },
      say: '排好了（自上而下按结束时间）。<b>为什么按右端点？交换论证</b>：设最优解的第一个区间是 x，而结束最早的是 a（a.end ≤ x.end）。把 x 换成 a，后面所有区间原本能接在 x 后，就更能接在结束更早的 a 后——<b>换了不会更差</b>。所以"先选结束最早的"必然通向某个最优解。',
    });

    const states = {};
    let lastEnd = -1, cnt = 0;
    let guard = 0;
    for (const it of sorted) {
      if (guard++ > 20) break;
      states[it.id] = 'active';
      frames.push({
        order: sorted.map((r) => r.id), states: { ...states }, lastEnd, line: 3,
        vars: { 当前: it.name, 区间: `[${it.s}, ${it.e}]`, 上次结束: lastEnd < 0 ? '-' : lastEnd, 已选: cnt },
        say: `轮到 <b>${it.name}</b> [${it.s}, ${it.e}]：它的开始时间 ${it.s} ${lastEnd < 0 ? '' : `与上一个选中区间的结束时间 ${lastEnd} 比较`}……`,
      });
      if (it.s >= lastEnd) {
        const prevEnd = lastEnd;
        lastEnd = it.e;
        cnt++;
        states[it.id] = 'done';
        frames.push({
          order: sorted.map((r) => r.id), states: { ...states }, lastEnd, line: 4,
          vars: { 当前: it.name, 已选: { v: cnt, hot: true }, 截止线: lastEnd },
          say: prevEnd < 0
            ? `第一个区间没有任何冲突 → <b>选中 ${it.name}</b>！截止线设为 ${it.e}。它是全场结束最早的——留给后面的时间最多。`
            : `<code>${it.s} ≥ ${prevEnd}</code>，不冲突 → <b>选中 ${it.name}</b>！截止线推进到 ${it.e}。在所有不冲突的候选里它结束最早，<b>给后续留的空间最大</b>。`,
        });
      } else {
        states[it.id] = 'path';
        frames.push({
          order: sorted.map((r) => r.id), states: { ...states }, lastEnd, line: 5,
          vars: { 当前: it.name, 冲突: `${it.s} < ${lastEnd}`, 已选: cnt },
          say: `<code>${it.s} &lt; ${lastEnd}</code>，${it.name} 与已选区间<b>重叠 → 划掉</b>。丢它不亏：它结束得比已选的晚，留着只会挡住更多后来者。`,
        });
      }
    }

    frames.push({
      order: sorted.map((r) => r.id), states: { ...states }, lastEnd, fin: true, line: 6,
      vars: { 最多场次: { v: cnt, hot: true }, 复杂度: 'O(n log n)' },
      say: `完成：最多安排 <b>${cnt}</b> 场（${sorted.filter((r) => states[r.id] === 'done').map((r) => r.name).join('、')}）。排序 <code>O(n log n)</code> + 一遍线性扫描。<b>贪心可行的关键：每一步的局部最优（选结束最早的）经交换论证可证不排斥全局最优。</b>`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '区间调度：为什么按"结束时间"排序',
    badge: '贪心',
    speed: 1250,
    legend: [
      { c: '--viz-active', t: '正在考察' },
      { c: '--viz-done', t: '选中' },
      { c: '--viz-path', t: '冲突，划掉' },
    ],
    vars: true,
    pseudo: [
      'sort(v.begin(), v.end(),        // 按右端点升序',
      '     [](auto&a, auto&b){ return a.end < b.end; });',
      'int lastEnd = -INF, cnt = 0;',
      'for (auto& it : v)',
      '  if (it.start >= lastEnd) { ++cnt; lastEnd = it.end; }  // 不冲突：选',
      '  else ;                                                  // 冲突：跳过',
      '// cnt 即最多可选区间数',
    ],
    build,
    draw(stage, f) {
      const rowH = 30, gap = 8, padL = 40, padT = 30;
      const scale = (620 - padL - 20) / MAXT;
      const H = padT + RAW.length * (rowH + gap) + 30;
      const svg = svgEl('svg', { viewBox: `0 0 620 ${H}`, width: 620, style: 'max-width:100%;height:auto' });

      /* 时间轴刻度 */
      for (let t = 0; t <= MAXT; t += 2) {
        const x = padL + t * scale;
        svg.appendChild(svgEl('line', { x1: x, y1: padT - 6, x2: x, y2: H - 24, stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
        svg.appendChild(svgEl('text', { x, y: padT - 14, 'font-size': 9.5, class: 'lbl' }, String(t)));
      }

      const byId = {};
      RAW.forEach((r) => (byId[r.id] = r));

      f.order.forEach((id, row) => {
        const it = byId[id];
        const y = padT + row * (rowH + gap);
        const st = f.states[id] || 'idle';
        const x = padL + it.s * scale, w = (it.e - it.s) * scale;
        svg.appendChild(svgEl('rect', {
          class: `v-cell s-${st}`, x, y, width: w, height: rowH, rx: 7,
          opacity: st === 'path' ? 0.55 : 1,
        }));
        svg.appendChild(svgEl('text', { x: x + w / 2, y: y + rowH / 2, 'font-size': 11.5 }, `${it.name} [${it.s},${it.e}]`));
        /* 划掉线 */
        if (st === 'path') {
          svg.appendChild(svgEl('line', {
            class: 'v-edge k-path',
            x1: x - 4, y1: y + rowH / 2, x2: x + w + 4, y2: y + rowH / 2, 'stroke-width': 2.4,
          }));
        }
      });

      /* 截止线 */
      if (f.lastEnd != null && f.lastEnd >= 0) {
        const x = padL + f.lastEnd * scale;
        svg.appendChild(svgEl('line', {
          class: 'v-edge', x1: x, y1: padT - 8, x2: x, y2: H - 24,
          stroke: 'var(--viz-done)', 'stroke-width': 2.2, 'stroke-dasharray': '6 4',
        }));
        svg.appendChild(svgEl('text', { x, y: H - 12, 'font-size': 9.5, fill: 'var(--viz-done)', 'font-weight': 700 }, `截止线 ${f.lastEnd}`));
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   7. backtrack-queens：N 皇后回溯（N=4）
   ------------------------------------------------------------ */
function queensViz(host) {
  const N = 4;

  const build = () => {
    const frames = [];
    const queens = [];   // queens[r] = c
    let solved = false;
    let guard = 0;

    frames.push({
      q: [], line: 0,
      vars: { N, 深度: 0 },
      say: `${N}×${N} 棋盘放 ${N} 个皇后，要求<b>任意两个不同行、不同列、不同对角线</b>。策略：<b>逐行放置</b>（天然保证不同行），每行从左到右试每一列，撞墙就<b>回溯</b>——拿走皇后换下一列。`,
    });

    const conflict = (r, c) => {
      for (let i = 0; i < r; i++) {
        if (queens[i] === c) return { r: i, c: queens[i], type: '同列' };
        if (Math.abs(queens[i] - c) === Math.abs(i - r)) return { r: i, c: queens[i], type: '同对角线' };
      }
      return null;
    };

    const dfs = (r) => {
      if (solved || guard > 300) return;
      if (r === N) { solved = true; return; }
      for (let c = 0; c < N && !solved; c++) {
        guard++;
        const bad = conflict(r, c);
        if (bad) {
          frames.push({
            q: [...queens], tryCell: [r, c], confQ: [bad.r, bad.c], confType: bad.type, line: 3,
            vars: { 深度: { v: r, hot: true }, 尝试: `第${r}行 第${c}列`, 冲突: bad.type },
            say: `第 ${r} 行试第 ${c} 列：与第 ${bad.r} 行的皇后<b>${bad.type}</b>（红线）→ 此格不合法，换下一列。`,
          });
        } else {
          queens.push(c);
          frames.push({
            q: [...queens], placed: [r, c], line: 4,
            vars: { 深度: { v: r + 1, hot: true }, 放置: `(${r}, ${c})`, 已放: queens.length },
            say: `第 ${r} 行第 ${c} 列<b>安全，放下皇后</b>，递归进入第 ${r + 1} 行（深度 +1）。`,
          });
          dfs(r + 1);
          if (solved) return;
          const popped = queens.pop();
          frames.push({
            q: [...queens], removed: [r, popped], line: 6,
            vars: { 深度: { v: r, hot: true }, 回溯: `拿走 (${r}, ${popped})` },
            say: `第 ${r + 1} 行所有列都试完了，全部失败 → <b>回溯</b>：拿走第 ${r} 行的皇后，退回深度 ${r}，继续试它右边的列。<b>失败不是终点，是排除了一整棵子树。</b>`,
          });
        }
      }
    };

    dfs(0);

    frames.push({
      q: [...queens], win: true, line: 7,
      vars: { 解: `[${queens.join(', ')}]`, 尝试次数: guard },
      say: `第 ${N} 行放完，<b>找到解</b>：每行皇后的列号为 <code>[${queens.join(', ')}]</code>。回溯共尝试 ${guard} 个格子——远少于暴力枚举 <code>4⁴ = 256</code> 种摆法，因为<b>每次冲突都提前剪掉了整棵子树</b>。`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: 'N 皇后：逐行试探，撞墙回溯',
    badge: '回溯',
    speed: 1150,
    legend: [
      { c: '--viz-active', t: '正在尝试' },
      { c: '--viz-path', t: '冲突' },
      { c: '--viz-visited', t: '已放皇后' },
      { c: '--viz-done', t: '找到解' },
    ],
    vars: true,
    pseudo: [
      'bool dfs(int r) {              // r = 当前行（递归深度）',
      '  if (r == N) return true;     // 每行都放好 → 解',
      '  for (int c = 0; c < N; ++c) {',
      '    if (conflict(r, c)) continue;   // 列/对角线冲突',
      '    place(r, c);                    // 放皇后',
      '    if (dfs(r + 1)) return true;    // 深入下一行',
      '    remove(r, c);                   // 回溯：拿走重试',
      '  }  return false;             // 本行无解，返回上层',
    ],
    build,
    draw(stage, f) {
      const cell = 52, pad = 26, depthW = 120;
      const bs = N * cell;
      const W = pad * 2 + bs + depthW, H = pad * 2 + bs;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 460), style: 'max-width:100%;height:auto' });

      /* 棋盘 */
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const x = pad + c * cell, y = pad + r * cell;
          const dark = (r + c) % 2 === 1;
          let cls = 'v-cell s-idle';
          if (f.win) cls = 'v-cell s-done';
          else if (f.tryCell && f.tryCell[0] === r && f.tryCell[1] === c) cls = 'v-cell s-path';
          else if (f.placed && f.placed[0] === r && f.placed[1] === c) cls = 'v-cell s-active';
          else if (f.removed && f.removed[0] === r && f.removed[1] === c) cls = 'v-cell s-compare';
          svg.appendChild(svgEl('rect', {
            class: cls, x, y, width: cell, height: cell,
            opacity: cls === 'v-cell s-idle' ? (dark ? 0.55 : 0.22) : 1,
            stroke: 'var(--border)', 'stroke-width': 0.6,
          }));
        }
      }
      /* 行列号 */
      for (let i = 0; i < N; i++) {
        svg.appendChild(svgEl('text', { x: pad - 11, y: pad + i * cell + cell / 2, 'font-size': 10, class: 'lbl' }, String(i)));
        svg.appendChild(svgEl('text', { x: pad + i * cell + cell / 2, y: pad - 11, 'font-size': 10, class: 'lbl' }, String(i)));
      }

      const center = (r, c) => [pad + c * cell + cell / 2, pad + r * cell + cell / 2];

      /* 冲突线 */
      if (f.tryCell && f.confQ) {
        const [x1, y1] = center(f.confQ[0], f.confQ[1]);
        const [x2, y2] = center(f.tryCell[0], f.tryCell[1]);
        svg.appendChild(svgEl('line', {
          class: 'v-edge k-path', x1, y1, x2, y2, 'stroke-width': 3, 'stroke-dasharray': '7 5',
        }));
      }

      /* 皇后 */
      f.q.forEach((c, r) => {
        const [x, y] = center(r, c);
        const isConf = f.confQ && f.confQ[0] === r && f.confQ[1] === c;
        svg.appendChild(svgEl('circle', {
          class: `v-node s-${f.win ? 'done' : isConf ? 'path' : 'visited'}`,
          cx: x, cy: y, r: 17, stroke: 'var(--bg-elev)', 'stroke-width': 2,
        }));
        svg.appendChild(svgEl('text', { x, y, 'font-size': 13, 'font-weight': 700 }, 'Q'));
      });
      /* 正在尝试的格子标记 */
      if (f.tryCell) {
        const [x, y] = center(f.tryCell[0], f.tryCell[1]);
        svg.appendChild(svgEl('text', { x, y, 'font-size': 14, 'font-weight': 700, fill: 'var(--viz-path)' }, '×'));
      }

      /* 递归深度条 */
      const dx = pad + bs + 30;
      svg.appendChild(svgEl('text', { x: dx + 30, y: pad - 8, 'font-size': 10.5, class: 'lbl-b' }, '递归深度'));
      const depth = f.win ? N : f.q.length;
      for (let d = 0; d < N; d++) {
        const y = pad + d * cell + 8;
        const on = d < depth;
        svg.appendChild(svgEl('rect', {
          class: `v-cell s-${f.win ? 'done' : on ? 'active' : 'idle'}`,
          x: dx, y, width: 60, height: cell - 16, rx: 6,
          opacity: on || f.win ? 1 : 0.3,
        }));
        svg.appendChild(svgEl('text', { x: dx + 30, y: y + (cell - 16) / 2, 'font-size': 10.5 }, `dfs(${d})`));
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   8. backtrack-subset：子集枚举决策树（[1,2,3]，2^3 = 8）
   ------------------------------------------------------------ */
function subsetViz(host) {
  const ELEMS = [1, 2, 3];

  /* 静态满二叉决策树：depth d 决定 ELEMS[d] 选/不选 */
  const tnodes = [];
  const mkNode = (depth, parent, chosen, branch) => {
    const id = tnodes.length;
    tnodes.push({ id, depth, parent, chosen: [...chosen], branch });
    if (depth < ELEMS.length) {
      mkNode(depth + 1, id, [...chosen, ELEMS[depth]], '选');
      mkNode(depth + 1, id, chosen, '不选');
    }
    return id;
  };
  mkNode(0, null, [], null);
  /* 布局：叶子从左到右均匀铺开，内部节点取子节点中点 */
  {
    let leafCol = 0;
    const place = (id) => {
      const nd = tnodes[id];
      const kids = tnodes.filter((t) => t.parent === id);
      if (!kids.length) { nd.x = leafCol++ * 72; }
      else { kids.forEach((k) => place(k.id)); nd.x = (kids[0].x + kids[1].x) / 2; }
      nd.y = nd.depth * 64;
    };
    place(0);
  }
  const setStr = (arr) => (arr.length ? `{${arr.join(',')}}` : '∅');

  const build = () => {
    const frames = [];
    const out = [];

    frames.push({
      pathIds: [0], visited: [], out: [], line: 0,
      vars: { 元素: `[${ELEMS.join(',')}]`, 子集数: '2³ = 8' },
      say: '枚举 <code>[1,2,3]</code> 的所有子集。决策视角：<b>对每个元素只问一个问题——选，还是不选</b>。3 个元素、每个 2 种选择，就是一棵深 3 的满二叉树，<b>8 个叶子 = 2³ 个子集</b>。左枝=选，右枝=不选。',
    });

    /* DFS 先序遍历（左=选 优先） */
    const visited = [];
    let guard = 0;
    const dfs = (id, pathIds) => {
      if (guard++ > 40) return;
      const nd = tnodes[id];
      visited.push(id);
      const kids = tnodes.filter((t) => t.parent === id);
      if (!kids.length) {
        out.push(setStr(nd.chosen));
        frames.push({
          pathIds: [...pathIds], visited: [...visited], out: [...out], leaf: id, line: 2,
          vars: { 路径: nd.chosen.length ? nd.chosen.map((x) => `选${x}`).join('→') : '全不选', 输出: { v: setStr(nd.chosen), hot: true }, 已得: out.length },
          say: `走到叶子（3 个决定都做完了）→ <b>输出子集 <code>${setStr(nd.chosen)}</code></b>（第 ${out.length}/8 个）。当前高亮路径就是这串决策本身。`,
        });
        return;
      }
      if (id !== 0) {
        frames.push({
          pathIds: [...pathIds], visited: [...visited], out: [...out], line: nd.branch === '选' ? 4 : 5,
          vars: { 深度: nd.depth, 决定: `${nd.branch} ${ELEMS[nd.depth - 1]}`, 当前集合: setStr(nd.chosen) },
          say: nd.branch === '选'
            ? `决定<b>选 ${ELEMS[nd.depth - 1]}</b>：把它放进集合（现为 <code>${setStr(nd.chosen)}</code>），继续处理下一个元素。`
            : `<b>回溯</b>后走另一条枝：<b>不选 ${ELEMS[nd.depth - 1]}</b>，集合保持 <code>${setStr(nd.chosen)}</code>。两条枝都必须走完，一个不漏。`,
        });
      }
      dfs(kids[0].id, [...pathIds, kids[0].id]);
      dfs(kids[1].id, [...pathIds, kids[1].id]);
    };
    dfs(0, [0]);

    frames.push({
      pathIds: [], visited: [...visited], out: [...out], fin: true, line: 6,
      vars: { 子集总数: { v: 8, hot: true }, 复杂度: 'O(2ⁿ)' },
      say: 'DFS 走完整棵树，8 个子集一个不漏、一个不重。<b>每个元素两种选择 → 总数 2ⁿ</b>；回溯的作用就是"做完一种选择、撤销、再试另一种"，把指数级的选择空间系统地走一遍。n 稍大（如 n=30，10 亿）就不可行——这也是为什么能剪枝就要剪枝。',
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: '子集枚举：每个元素，选或不选',
    badge: '回溯',
    speed: 1150,
    legend: [
      { c: '--viz-active', t: '当前路径' },
      { c: '--viz-done', t: '输出子集' },
      { c: '--viz-visited', t: '已走过' },
    ],
    vars: true,
    pseudo: [
      'void dfs(int i) {              // i = 当前考虑第几个元素',
      '  if (i == n) {',
      '    output(cur);  return;      // 叶子：得到一个子集',
      '  }',
      '  cur.push_back(a[i]); dfs(i+1);  cur.pop_back();  // 选',
      '  dfs(i + 1);                                      // 不选',
      '}  // 每个元素 2 种选择 → 2^n 个子集',
    ],
    build,
    draw(stage, f) {
      const nodes = tnodes.map((nd) => {
        let state = 'idle', edgeState = 'idle';
        if ((f.visited || []).includes(nd.id)) { state = 'visited'; edgeState = 'visited'; }
        if ((f.pathIds || []).includes(nd.id)) { state = 'active'; edgeState = 'active'; }
        if (f.leaf === nd.id) { state = 'done'; edgeState = 'done'; }
        if (f.fin) { state = nd.parent === null || tnodes.some((t) => t.parent === nd.id) ? 'visited' : 'done'; edgeState = 'visited'; }
        return {
          id: nd.id, v: nd.chosen.length ? nd.chosen.join('') : '∅',
          x: nd.x, y: nd.y, parent: nd.parent,
          state, edgeState,
          tag: nd.branch === '选' ? `+${ELEMS[nd.depth - 1]}` : nd.branch === '不选' ? `×${ELEMS[nd.depth - 1]}` : '',
        };
      });
      const svg = drawTree({ nodes, r: 17 });

      /* 已输出子集列表 */
      const list = el('div');
      list.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px;font-family:var(--font-mono);font-size:12px;';
      (f.out || []).forEach((s, k) => {
        const chip = el('span', '', s);
        const isNew = k === (f.out.length - 1) && f.leaf != null;
        chip.style.cssText = `padding:3px 9px;border-radius:6px;border:1px solid ${isNew ? 'var(--ok)' : 'var(--border)'};background:${isNew ? 'var(--ok-soft)' : 'var(--muted)'};color:${isNew ? 'var(--ok)' : 'var(--fg-soft)'};font-weight:${isNew ? 700 : 400};`;
        list.appendChild(chip);
      });
      if ((f.out || []).length) {
        const lab = el('div', '', `已输出 ${f.out.length} / 8`);
        lab.style.cssText = 'text-align:center;font-size:10.5px;color:var(--fg-muted);margin-top:6px;font-family:var(--font-sans);';
        setStage(stage, svg, list, lab);
      } else {
        setStage(stage, svg, list);
      }
    },
  }).mount(host);
}

export const VIZ = {
  'dp-fib': fibViz,
  'dp-climb': climbViz,
  'dp-knapsack': knapsackViz,
  'dp-lcs': lcsViz,
  'dp-lis': lisViz,
  'greedy-interval': intervalViz,
  'backtrack-queens': queensViz,
  'backtrack-subset': subsetViz,
};
