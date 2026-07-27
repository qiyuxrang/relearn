/* ============================================================
   图算法动画：表示 · BFS · DFS · 拓扑 · Dijkstra · Bellman-Ford
   · Kruskal · Prim · Tarjan SCC · 二分图 · 最大流
   ============================================================ */

import { Player, svgEl, el, drawGraph, buildTable, setStage } from './engine.js';

/* ---------- 公共辅助 ---------- */

/** 把 base 图 + 帧内状态映射渲染为 SVG（draw 专用，build 只产出纯数据） */
function gFrame(base, f) {
  return drawGraph({
    verts: base.verts.map((v) => ({
      ...v,
      state: (f.vs && f.vs[v.id]) || 'idle',
      sub: f.sub ? f.sub[v.id] : undefined,
      tag: f.tagv ? f.tagv[v.id] : undefined,
      pop: !!(f.pop && f.pop[v.id]),
    })),
    edges: base.edges.map((e, i) => ({
      ...e,
      state: (f.es && f.es[i]) || 'idle',
      w: f.ew && f.ew[i] !== undefined ? f.ew[i] : e.w,
    })),
    directed: base.directed,
    uid: base.uid,
  });
}

/** 右侧信息面板容器（图 + 面板左右分栏） */
function splitStage(stage, svg, ...panels) {
  const wrap = el('div', 'viz__split');
  const left = el('div');
  left.style.minWidth = '0';
  left.appendChild(svg);
  const right = el('div');
  right.style.cssText = 'min-width:0;display:flex;flex-direction:column;gap:12px';
  panels.forEach((p) => p && right.appendChild(p));
  wrap.append(left, right);
  setStage(stage, wrap);
}

/** 带标题的小面板 */
function panelBox(title, node) {
  const d = el('div');
  d.style.minWidth = '0';
  const h = el('div', '', title);
  h.style.cssText =
    'font-size:11px;font-weight:700;color:var(--fg-muted);letter-spacing:.06em;margin:2px 0 6px;font-family:var(--font-sans)';
  d.append(h, node);
  return d;
}

/** 一排芯片（队列/栈/序列可视化）items: [{t, on, dim, strike}] */
function chipRow(items, empty = '（空）') {
  const row = el('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center';
  if (!items.length) {
    const s = el('span', '', empty);
    s.style.cssText = 'font-size:12px;color:var(--fg-muted)';
    row.appendChild(s);
    return row;
  }
  items.forEach((c) => {
    const s = el('span', '', c.t);
    s.style.cssText =
      `font-family:var(--font-mono);font-size:12px;padding:3px 9px;border-radius:6px;` +
      `border:1px solid ${c.on ? 'var(--primary)' : 'var(--border)'};` +
      `background:${c.on ? 'var(--primary-soft)' : 'var(--muted)'};` +
      `color:${c.on ? 'var(--primary)' : c.dim ? 'var(--fg-muted)' : 'var(--fg-soft)'};` +
      `${c.strike ? 'text-decoration:line-through;opacity:.55;' : ''}` +
      `font-weight:${c.on ? 700 : 500}`;
    row.appendChild(s);
  });
  return row;
}

/** 给一组 id 统一赋状态 */
function mapAll(ids, st, into = {}) {
  ids.forEach((k) => (into[k] = st));
  return into;
}

/* ============================================================
   1. graph-repr — 图的两种表示：邻接矩阵 vs 邻接表
   ============================================================ */

const REPR = {
  uid: 'repr',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 90, y: 40 },
    { id: 'B', v: 'B', x: 330, y: 40 },
    { id: 'C', v: 'C', x: 440, y: 160 },
    { id: 'D', v: 'D', x: 250, y: 240 },
    { id: 'E', v: 'E', x: 60, y: 170 },
  ],
  edges: [
    { a: 'A', b: 'B' }, { a: 'A', b: 'E' }, { a: 'B', b: 'C' },
    { a: 'B', b: 'D' }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' },
  ],
};
const REPR_NAMES = ['A', 'B', 'C', 'D', 'E'];

function buildRepr() {
  const idx = (id) => REPR_NAMES.indexOf(id);
  const frames = [];
  const fill = [];   // 已写入的矩阵格 [行, 列]
  const esP = {};    // 已讲过的边 → visited

  frames.push({
    fill: [], hot: [], es: {}, line: 0,
    say: '同一张图（5 个点、6 条边），计算机里有两种主流存法：<b>邻接矩阵</b>和<b>邻接表</b>。逐条边看它们分别怎么记录。',
  });

  REPR.edges.forEach((e, i) => {
    const a = idx(e.a), b = idx(e.b);
    fill.push([a, b], [b, a]);
    const es = { ...esP, [i]: 'active' };
    frames.push({
      fill: fill.slice(), hot: [[a, b], [b, a]], es,
      vs: { [e.a]: 'active', [e.b]: 'active' },
      vars: { 边: `${e.a}-${e.b}`, 已录入: i + 1 },
      line: [2, 5, 6],
      say: `边 <code>${e.a}-${e.b}</code>：矩阵里 <code>g[${e.a}][${e.b}]</code> 和 <code>g[${e.b}][${e.a}]</code> <b>对称地</b>置 1（无向边没有方向）；邻接表里 ${e.a} 的名单加上 ${e.b}，${e.b} 的名单加上 ${e.a}。`,
    });
    esP[i] = 'visited';
  });

  frames.push({
    fill: fill.slice(), hot: [], es: mapAll(REPR.edges.map((_, i) => i), 'visited'),
    vars: { 矩阵格数: 25, 有效格: 12 }, line: 1,
    say: '看矩阵：25 个格子里只有 12 个是 1。矩阵空间固定 <b>O(V²)</b>——点一多、边一稀，绝大部分格子都在存 0，<b>白白浪费</b>。但它有个独门优势：判断任意两点是否相邻只要 <b>O(1)</b> 查一个格子。',
  });

  frames.push({
    fill: fill.slice(), hot: [], es: mapAll(REPR.edges.map((_, i) => i), 'visited'),
    hlList: true, vars: { 表项总数: 12 }, line: 4,
    say: '看邻接表：只存<b>真实存在</b>的边，每条无向边存两次，共 2E=12 项，空间 <b>O(V+E)</b>。遍历某点的邻居只需扫它自己的名单（O(度数)），不用扫整行 V 个格子。',
  });

  frames.push({
    fill: fill.slice(), hot: [], es: mapAll(REPR.edges.map((_, i) => i), 'done'),
    line: 4,
    say: '结论：<b>稀疏图（E 远小于 V²，现实中绝大多数）用邻接表</b>；只有点少且稠密、或需要频繁 O(1) 查"两点是否相邻"时才用矩阵。后面所有图算法默认都基于邻接表。',
  });

  return { frames, meta: {} };
}

function graphRepr(host) {
  return new Player({
    title: '一张图的两种存法：矩阵 vs 邻接表',
    badge: '图的表示',
    speed: 1500,
    vars: true,
    legend: [
      { c: '--viz-active', t: '当前边' },
      { c: '--viz-visited', t: '已录入' },
    ],
    pseudo: [
      '// 邻接矩阵：V×V 的二维数组，空间 O(V^2)',
      'int g[V][V] = {0};',
      'g[a][b] = g[b][a] = 1;   // 无向图对称写两格',
      '// 邻接表：每个点存自己的邻居名单，空间 O(V+E)',
      'vector<int> adj[V];',
      'adj[a].push_back(b);',
      'adj[b].push_back(a);     // 无向边记两次',
    ],
    build: buildRepr,
    draw(stage, f) {
      const svg = gFrame(REPR, f);
      // 邻接矩阵
      const rows = REPR_NAMES.map((rn, ri) => [
        { v: `<b>${rn}</b>`, cls: '' },
        ...REPR_NAMES.map((_, ci) => {
          const set = f.fill.some(([x, y]) => x === ri && y === ci);
          const hot = f.hot.some(([x, y]) => x === ri && y === ci);
          return { v: set ? '1' : '0', cls: hot ? 'is-hot' : set ? 'is-set' : '' };
        }),
      ]);
      const mat = buildTable({ head: ['', ...REPR_NAMES], rows });
      // 邻接表
      const list = el('div');
      list.style.cssText = 'font-family:var(--font-mono);font-size:12px;line-height:2';
      REPR_NAMES.forEach((n, ni) => {
        const nbrs = f.fill.filter(([x]) => x === ni).map(([, y]) => REPR_NAMES[y]);
        const hotSet = f.hot.filter(([x]) => x === ni).map(([, y]) => REPR_NAMES[y]);
        const line = el('div');
        line.innerHTML = `<span style="color:var(--fg-muted)">${n} →</span> [${
          nbrs.map((m) => (hotSet.includes(m)
            ? `<b style="color:var(--accent)">${m}</b>`
            : `<span style="color:${f.hlList ? 'var(--primary)' : 'var(--fg-soft)'}">${m}</span>`)).join(', ')
        }]`;
        list.appendChild(line);
      });
      splitStage(stage, svg, panelBox('邻接矩阵 g[V][V]', mat), panelBox('邻接表 adj[]', list));
    },
  }).mount(host);
}

/* ============================================================
   2. graph-bfs — 广度优先搜索：一圈圈向外扩
   ============================================================ */

const BFS_G = {
  uid: 'bfs',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 40, y: 130 },
    { id: 'B', v: 'B', x: 170, y: 40 },
    { id: 'C', v: 'C', x: 170, y: 220 },
    { id: 'D', v: 'D', x: 310, y: 40 },
    { id: 'E', v: 'E', x: 310, y: 130 },
    { id: 'F', v: 'F', x: 310, y: 220 },
    { id: 'G', v: 'G', x: 450, y: 130 },
  ],
  edges: [
    { a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'D' },
    { a: 'B', b: 'E' }, { a: 'C', b: 'E' }, { a: 'C', b: 'F' },
    { a: 'D', b: 'G' }, { a: 'E', b: 'G' }, { a: 'F', b: 'G' },
  ],
};
const BFS_ADJ = {
  A: ['B', 'C'], B: ['A', 'D', 'E'], C: ['A', 'E', 'F'],
  D: ['B', 'G'], E: ['B', 'C', 'G'], F: ['C', 'G'], G: ['D', 'E', 'F'],
};
const LAYER_ST = ['active', 'visited', 'compare', 'pivot'];

function buildBfs() {
  const eIdx = {};
  BFS_G.edges.forEach((e, i) => { eIdx[`${e.a}-${e.b}`] = i; eIdx[`${e.b}-${e.a}`] = i; });

  const frames = [];
  const dist = { A: 0 };
  const vs = { A: LAYER_ST[0] };
  const es = {};
  const q = ['A'];
  const qChip = () => q.map((x, i) => ({ t: `${x}·${dist[x]}`, on: i === 0 }));

  frames.push({
    vs: { ...vs }, sub: { A: 0 }, es: {}, q: qChip(), line: 0,
    vars: { 起点: 'A', 队列: 'A' },
    say: 'BFS 的核心工具是<b>队列</b>：起点 A 标记 dist=0 入队。队列先进先出，保证<b>先发现的点先被处理</b>——这就是"一圈圈扩展"的机械原理。',
  });

  let guard = 0;
  while (q.length && guard++ < 40) {
    const u = q.shift();
    frames.push({
      vs: { ...vs }, sub: { ...dist }, es: { ...es },
      tagv: { [u]: '当前' }, pop: { [u]: true }, q: qChip(), line: 3,
      vars: { 当前: u, dist: dist[u], 队列长: q.length },
      say: `出队 <code>${u}</code>（dist=${dist[u]}）。队列里的 dist 永远<b>单调不减</b>，所以出队顺序就是"由近及远"的顺序。现在扫描它的邻居。`,
    });

    for (const v of BFS_ADJ[u]) {
      if (dist[v] !== undefined) continue;
      dist[v] = dist[u] + 1;
      vs[v] = LAYER_ST[Math.min(dist[v], 3)];
      es[eIdx[`${u}-${v}`]] = 'done';
      q.push(v);
      frames.push({
        vs: { ...vs }, sub: { ...dist },
        es: { ...es, [eIdx[`${u}-${v}`]]: 'active' },
        tagv: { [u]: '当前' }, pop: { [v]: true }, q: qChip(), line: [5, 6, 7],
        vars: { 当前: u, 发现: v, [`dist[${v}]`]: { v: dist[v], hot: true } },
        say: `${v} 还没被访问 → 记 <code>dist[${v}] = dist[${u}]+1 = ${dist[v]}</code>，入队。<b>第一次被发现时的距离就是最终答案</b>，之后再也不会更新。`,
      });
    }
  }

  frames.push({
    vs: { ...vs }, sub: { ...dist }, es: { ...es }, q: [], line: 8,
    vars: { 最远: 'G', 'dist[G]': 3 },
    say: '全部访问完毕，节点颜色即层号。<b>为什么 BFS 天然求出无权最短路？</b>因为队列保证按 dist 从小到大处理：某点第一次被发现时，不可能存在更短的路——更短的路早就在之前的层里把它发现了。',
  });

  return { frames, meta: {} };
}

function graphBfs(host) {
  return new Player({
    title: 'BFS：队列驱动，一圈一圈向外扩',
    badge: '广度优先',
    speed: 1300,
    vars: true,
    legend: [
      { c: '--viz-active', t: '第 0 层' },
      { c: '--viz-visited', t: '第 1 层' },
      { c: '--viz-compare', t: '第 2 层' },
      { c: '--viz-pivot', t: '第 3 层' },
      { c: '--viz-done', t: 'BFS 树边' },
    ],
    pseudo: [
      'queue<int> q;',
      'dist[s] = 0;  q.push(s);',
      'while (!q.empty()) {',
      '  int u = q.front(); q.pop();',
      '  for (int v : adj[u])',
      '    if (dist[v] == -1) {        // 未访问',
      '      dist[v] = dist[u] + 1;    // 首次即最短',
      '      q.push(v);',
      '    }',
      '}',
    ],
    build: buildBfs,
    draw(stage, f) {
      splitStage(stage, gFrame(BFS_G, f),
        panelBox('队列（队首在左，节点·dist）', chipRow(f.q || [])));
    },
  }).mount(host);
}

/* ============================================================
   3. graph-dfs — 深度优先搜索：递归深入 + 回溯
   ============================================================ */

const DFS_G = {
  uid: 'dfs',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 60, y: 40 },
    { id: 'B', v: 'B', x: 200, y: 40 },
    { id: 'C', v: 'C', x: 60, y: 180 },
    { id: 'D', v: 'D', x: 340, y: 40 },
    { id: 'E', v: 'E', x: 340, y: 180 },
    { id: 'F', v: 'F', x: 200, y: 250 },
    { id: 'G', v: 'G', x: 470, y: 110 },
  ],
  edges: [
    { a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'D' },
    { a: 'D', b: 'E' }, { a: 'D', b: 'G' }, { a: 'E', b: 'G' },
    { a: 'C', b: 'F' }, { a: 'E', b: 'F' },
  ],
};
const DFS_ADJ = {
  A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'F'], D: ['B', 'E', 'G'],
  E: ['D', 'F', 'G'], F: ['C', 'E'], G: ['D', 'E'],
};

function buildDfs() {
  const eIdx = {};
  DFS_G.edges.forEach((e, i) => { eIdx[`${e.a}-${e.b}`] = i; eIdx[`${e.b}-${e.a}`] = i; });

  const frames = [];
  const color = {};          // undefined=白 'grey' 'black'
  const disc = {}, fin = {}; // 发现/完成时刻
  const es = {};
  const stack = [];
  let clock = 0;
  let guard = 0;

  const vsNow = () => {
    const m = {};
    for (const k in color) m[k] = color[k] === 'grey' ? 'active' : 'done';
    return m;
  };
  const subNow = () => {
    const m = {};
    for (const k in disc) m[k] = fin[k] !== undefined ? `${disc[k]}/${fin[k]}` : `${disc[k]}/-`;
    return m;
  };
  const stChip = () => stack.map((x, i) => ({ t: x, on: i === stack.length - 1 }));

  frames.push({
    vs: {}, sub: {}, es: {}, st: [], line: 0,
    say: 'DFS 用<b>三色思想</b>理解最清晰：<b>白色</b>=没见过，<b>灰色</b>=已发现但它的子孙还没探完（正躺在递归栈里），<b>黑色</b>=连子孙都全部探完。从 A 出发。',
  });

  const dfs = (u, from) => {
    if (guard++ > 60) return;
    color[u] = 'grey';
    disc[u] = clock++;
    stack.push(u);
    if (from) es[eIdx[`${from}-${u}`]] = 'active';
    frames.push({
      vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(),
      tagv: { [u]: '发现' }, pop: { [u]: true }, line: 1,
      vars: { 当前: u, 发现时刻: disc[u], 栈深: stack.length },
      say: `发现 <code>${u}</code>，记发现时刻 <code>dfn=${disc[u]}</code>，压入递归栈，变<b>灰</b>。DFS 的策略是"<b>一条路走到黑</b>"：先深入，撞墙才回头。`,
    });

    for (const v of DFS_ADJ[u]) {
      if (color[v] === undefined) {
        dfs(v, u);
        if (guard > 60) return;
      }
    }

    fin[u] = clock++;
    color[u] = 'black';
    stack.pop();
    if (from) es[eIdx[`${from}-${u}`]] = 'done';
    frames.push({
      vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(),
      tagv: { [u]: '完成' }, line: 6,
      vars: { 完成: u, 完成时刻: fin[u], 栈深: stack.length },
      say: `<code>${u}</code> 的所有邻居都已探过 → 记完成时刻 <code>fin=${fin[u]}</code>，弹栈变<b>黑</b>，<b>回溯</b>到上一层。灰色区间 [dfn, fin] 就是它"在栈中"的时段。`,
    });
  };
  dfs('A', null);

  frames.push({
    vs: vsNow(), sub: subNow(), es: { ...es }, st: [], line: 7,
    vars: { 总时刻: clock },
    say: '结束。每个点标注 <code>dfn/fin</code>：若 u 的区间<b>包含</b> v 的区间，u 就是 v 的祖先——括号一样严格嵌套。这对时间戳是拓扑排序、Tarjan、求割点等一票算法的地基。时间 <code>O(V+E)</code>。',
  });

  return { frames, meta: {} };
}

function graphDfs(host) {
  return new Player({
    title: 'DFS：一条路走到黑，撞墙再回溯',
    badge: '深度优先',
    speed: 1250,
    vars: true,
    legend: [
      { c: '--viz-idle', t: '白：未发现' },
      { c: '--viz-active', t: '灰：在栈中' },
      { c: '--viz-done', t: '黑：已完成' },
    ],
    pseudo: [
      'void dfs(int u) {',
      '  color[u] = GREY;  dfn[u] = clock++;',
      '  for (int v : adj[u])',
      '    if (color[v] == WHITE)',
      '      dfs(v);           // 递归深入',
      '  // 所有邻居探完，才轮到自己"完成"',
      '  color[u] = BLACK; fin[u] = clock++;',
      '}',
    ],
    build: buildDfs,
    draw(stage, f) {
      splitStage(stage, gFrame(DFS_G, f),
        panelBox('递归栈（栈顶在右）', chipRow(f.st || [], '（空）')));
    },
  }).mount(host);
}

/* ============================================================
   4. graph-topo — 拓扑排序（Kahn）：反复摘入度 0 的点
   ============================================================ */

const TOPO_G = {
  uid: 'topo',
  directed: true,
  verts: [
    { id: 'A', v: 'A', x: 50, y: 50 },
    { id: 'B', v: 'B', x: 50, y: 210 },
    { id: 'C', v: 'C', x: 210, y: 50 },
    { id: 'D', v: 'D', x: 210, y: 210 },
    { id: 'E', v: 'E', x: 370, y: 130 },
    { id: 'F', v: 'F', x: 490, y: 130 },
  ],
  edges: [
    { a: 'A', b: 'C' }, { a: 'A', b: 'D' }, { a: 'B', b: 'D' },
    { a: 'C', b: 'E' }, { a: 'D', b: 'E' }, { a: 'E', b: 'F' },
    { a: 'C', b: 'D' },
  ],
};

function buildTopo() {
  const V = TOPO_G.verts.map((v) => v.id);
  const frames = [];
  const indeg = {};
  V.forEach((v) => (indeg[v] = 0));
  TOPO_G.edges.forEach((e) => indeg[e.b]++);

  const vs = {}, es = {};
  const out = [];
  const q = V.filter((v) => indeg[v] === 0);
  const outChip = () => out.map((x) => ({ t: x, on: false }));

  frames.push({
    vs: {}, sub: { ...indeg }, es: {}, out: [], line: [0, 1],
    vars: { 入度0: q.join(',') },
    say: '拓扑排序回答"<b>先修课顺序</b>"问题：箭头 u→v 表示 u 必须排在 v 前。每个点下方是<b>入度</b>（有几门先修课没上）。入度为 0 的点没有任何依赖，<b>可以立刻输出</b>。',
  });

  let guard = 0;
  while (q.length && guard++ < 20) {
    const u = q.shift();
    vs[u] = 'active';
    frames.push({
      vs: { ...vs }, sub: { ...indeg }, es: { ...es }, out: outChip(),
      tagv: { [u]: '摘除' }, pop: { [u]: true }, line: 3,
      vars: { 取出: u, 队列: q.join(',') || '空' },
      say: `取出入度 0 的 <code>${u}</code>，追加到输出序列。它已无依赖，排在这里<b>不会违反任何箭头</b>。`,
    });
    out.push(u);

    TOPO_G.edges.forEach((e, i) => {
      if (e.a !== u) return;
      indeg[e.b]--;
      es[i] = 'dim';
      if (indeg[e.b] === 0) q.push(e.b);
      frames.push({
        vs: { ...vs }, sub: { ...indeg }, es: { ...es, [i]: 'compare' }, out: outChip(),
        pop: indeg[e.b] === 0 ? { [e.b]: true } : {}, line: indeg[e.b] === 0 ? [5, 6] : 5,
        vars: { 删边: `${u}→${e.b}`, [`indeg[${e.b}]`]: { v: indeg[e.b], hot: true } },
        say: `删掉出边 <code>${u}→${e.b}</code>，${e.b} 的入度减为 <b>${indeg[e.b]}</b>${indeg[e.b] === 0 ? ' → <b>依赖清零，入队</b>' : '，还有依赖，继续等'}。`,
      });
    });
    vs[u] = 'done';
  }

  frames.push({
    vs: { ...vs }, sub: { ...indeg }, es: mapAll(TOPO_G.edges.map((_, i) => i), 'done'), out: outChip(),
    line: 7,
    vars: { 序列: out.join('→'), 输出数: out.length },
    say: `全部 ${out.length} 个点输出完毕：<code>${out.join(' → ')}</code>。注意拓扑序<b>不唯一</b>——同时入度为 0 的点谁先出都合法。`,
  });

  /* --- 有环演示 --- */
  const CYC = {
    uid: 'topocyc',
    directed: true,
    verts: [
      { id: 'X', v: 'X', x: 120, y: 60 },
      { id: 'Y', v: 'Y', x: 320, y: 60 },
      { id: 'Z', v: 'Z', x: 220, y: 210 },
      { id: 'W', v: 'W', x: 460, y: 210 },
    ],
    edges: [
      { a: 'X', b: 'Y' }, { a: 'Y', b: 'Z' }, { a: 'Z', b: 'X' }, { a: 'Y', b: 'W' },
    ],
  };
  frames.push({
    g2: true, vs: {}, sub: { X: 1, Y: 1, Z: 1, W: 1 }, es: {}, out: [], line: 1,
    say: '换一张<b>有环</b>的图：X→Y→Z→X（W 挂在 Y 后面）。算下入度：X=1，Y=1，Z=1，W=1——<b>没有一个入度为 0 的点</b>，队列一开始就是空的。',
  });
  frames.push({
    g2: true, vs: { X: 'compare', Y: 'compare', Z: 'compare' },
    sub: { X: 1, Y: 1, Z: 1, W: 1 }, es: { 0: 'compare', 1: 'compare', 2: 'compare' },
    out: [], line: 2,
    say: '原因在环上：<b>X 等 Z 先摘，Z 等 Y，Y 又等 X</b>——循环等待，谁的入度都减不到 0。连无辜的 W 也被连累（它等 Y）。',
  });
  frames.push({
    g2: true, vs: { X: 'path', Y: 'path', Z: 'path', W: 'dim' },
    sub: { X: 1, Y: 1, Z: 1, W: 1 },
    es: { 0: 'path', 1: 'path', 2: 'path', 3: 'dim' },
    out: [], line: 8,
    say: '算法<b>卡住</b>：队列空了却一个点都没输出（0 &lt; 4）。这正是 Kahn 的副产品——<b>输出数 &lt; V 当且仅当图有环</b>。课程互为先修、任务互相依赖成死锁，都靠它检测。',
  });

  return { frames, meta: { cyc: CYC } };
}

function graphTopo(host) {
  return new Player({
    title: '拓扑排序（Kahn）：反复摘掉入度 0 的点',
    badge: '拓扑排序',
    speed: 1300,
    vars: true,
    legend: [
      { c: '--viz-active', t: '正在摘除' },
      { c: '--viz-done', t: '已输出' },
      { c: '--viz-path', t: '环（卡住）' },
    ],
    pseudo: [
      '// 入度 = 指向自己的边数',
      'queue<int> q;  // 装所有入度 0 的点',
      'while (!q.empty()) {',
      '  int u = q.front(); q.pop(); order.push_back(u);',
      '  for (int v : adj[u])',
      '    if (--indeg[v] == 0)   // 删边',
      '      q.push(v);',
      '}',
      'if (order.size() < V)  // 有环！',
    ],
    build: buildTopo,
    draw(stage, f, meta) {
      const svg = f.g2 ? gFrame(meta.cyc, f) : gFrame(TOPO_G, f);
      splitStage(stage, svg, panelBox('输出序列', chipRow(f.out || [], '（尚无输出）')));
    },
  }).mount(host);
}

/* ============================================================
   5. graph-dijkstra — 最短路：贪心 + 松弛
   ============================================================ */

const DJ_G = {
  uid: 'dij',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 40, y: 130 },
    { id: 'B', v: 'B', x: 190, y: 40 },
    { id: 'C', v: 'C', x: 190, y: 220 },
    { id: 'D', v: 'D', x: 350, y: 40 },
    { id: 'E', v: 'E', x: 350, y: 220 },
    { id: 'F', v: 'F', x: 490, y: 130 },
  ],
  edges: [
    { a: 'A', b: 'B', w: 4 }, { a: 'A', b: 'C', w: 1 },
    { a: 'C', b: 'B', w: 2 }, { a: 'B', b: 'D', w: 5 },
    { a: 'C', b: 'E', w: 8 }, { a: 'B', b: 'E', w: 3 },
    { a: 'D', b: 'F', w: 2 }, { a: 'E', b: 'F', w: 3 },
    { a: 'D', b: 'E', w: 1 },
  ],
};
const INF = '∞';

function buildDijkstra() {
  const V = DJ_G.verts.map((v) => v.id);
  const adj = {};
  V.forEach((v) => (adj[v] = []));
  DJ_G.edges.forEach((e, i) => {
    adj[e.a].push({ to: e.b, w: e.w, i });
    adj[e.b].push({ to: e.a, w: e.w, i });
  });

  const frames = [];
  const dist = {}; V.forEach((v) => (dist[v] = Infinity));
  dist.A = 0;
  const done = {};
  const es = {};
  const sub = () => { const m = {}; V.forEach((v) => (m[v] = dist[v] === Infinity ? INF : dist[v])); return m; };
  const vsNow = (extra = {}) => {
    const m = {};
    V.forEach((v) => { if (done[v]) m[v] = 'done'; });
    return { ...m, ...extra };
  };
  const pqChip = (cur) => V.filter((v) => !done[v] && dist[v] < Infinity)
    .sort((a, b) => dist[a] - dist[b])
    .map((v) => ({ t: `${v}·${dist[v]}`, on: v === cur }));

  frames.push({
    vs: { A: 'active' }, sub: sub(), es: {}, pq: pqChip('A'), line: 0,
    vars: { 起点: 'A' },
    say: '带权图上 BFS 失灵了——边不再"等长"。Dijkstra 的贪心：<code>dist[A]=0</code>，其余为 ∞，每轮从未确定的点里<b>取 dist 最小者</b>，宣布它"定案"。',
  });

  let guard = 0;
  while (guard++ < 10) {
    let u = null;
    for (const v of V) if (!done[v] && dist[v] < Infinity && (u === null || dist[v] < dist[u])) u = v;
    if (u === null) break;
    done[u] = true;
    frames.push({
      vs: vsNow(), sub: sub(), es: { ...es }, pq: pqChip(u),
      tagv: { [u]: '定案' }, pop: { [u]: true }, line: 3,
      vars: { 取出: u, [`dist[${u}]`]: dist[u] },
      say: `优先队列弹出最小的 <code>${u}</code>（dist=${dist[u]}），标记 done。<b>为什么敢定案？</b>其他任何路径想到 ${u}，都得先经过某个 dist 更大的点，只会更远——前提是<b>边权非负</b>。`,
    });

    for (const { to: v, w, i } of adj[u]) {
      if (done[v]) continue;
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        const old = dist[v] === Infinity ? INF : dist[v];
        dist[v] = nd;
        frames.push({
          vs: vsNow({ [v]: 'compare' }), sub: sub(), es: { ...es, [i]: 'active' },
          tagv: { [u]: '当前' }, pop: { [v]: true }, pq: pqChip(null), line: [5, 6],
          vars: { 松弛: `${u}→${v}`, 原值: old, 新值: { v: nd, hot: true } },
          say: `<b>松弛</b>边 <code>${u}-${v}</code>（权 ${w}）：经 ${u} 绕行的距离 ${dist[u] === nd - w ? `${nd - w}+${w}=${nd}` : nd} <b>&lt;</b> 原 dist[${v}]=${old} → 更新为 <b>${nd}</b>。`,
        });
      } else {
        frames.push({
          vs: vsNow(), sub: sub(), es: { ...es, [i]: 'path' },
          tagv: { [u]: '当前' }, pq: pqChip(null), line: 5,
          vars: { 检查: `${u}→${v}`, 结果: '不更新' },
          say: `检查边 <code>${u}-${v}</code>：${dist[u]}+${w}=${nd} ≥ dist[${v}]=${dist[v]}，绕路没有更近，<b>不动</b>。`,
        });
      }
    }
  }

  frames.push({
    vs: vsNow(), sub: sub(), es: { ...es }, pq: [], line: 8,
    vars: { 'dist[F]': dist.F },
    say: `全部定案：A 到 F 最短 <b>${dist.F}</b>（A→C→B→E→F 或同长路径）。复杂度 <code>O((V+E)log V)</code>。<b>负权边会毁掉一切</b>：贪心"定案"假设走得越远只会越贵，一条负边就能让已定案的点被更短路径推翻——那时要换 Bellman-Ford。`,
  });

  return { frames, meta: {} };
}

function graphDijkstra(host) {
  return new Player({
    title: 'Dijkstra：每轮定案一个最近的点',
    badge: '最短路',
    speed: 1350,
    vars: true,
    legend: [
      { c: '--viz-done', t: '已定案' },
      { c: '--viz-active', t: '松弛成功' },
      { c: '--viz-compare', t: 'dist 被更新' },
      { c: '--viz-path', t: '松弛失败' },
    ],
    pseudo: [
      'dist[s] = 0, 其余 = INF;',
      'priority_queue pq;  pq.push({0, s});',
      'while (!pq.empty()) {',
      '  u = pq 中 dist 最小者;  标记 done;',
      '  for (auto [v, w] : adj[u])',
      '    if (dist[u] + w < dist[v]) {   // 松弛',
      '      dist[v] = dist[u] + w;  pq.push({dist[v], v});',
      '    }',
      '}  // 要求：所有边权 >= 0',
    ],
    build: buildDijkstra,
    draw(stage, f) {
      splitStage(stage, gFrame(DJ_G, f),
        panelBox('优先队列（按 dist 升序）', chipRow(f.pq || [], '（空）')));
    },
  }).mount(host);
}

/* ============================================================
   6. graph-bellman — Bellman-Ford：逐轮松弛 + 负环检测
   ============================================================ */

const BM_G = {
  uid: 'bm',
  directed: true,
  verts: [
    { id: 'S', v: 'S', x: 40, y: 130 },
    { id: 'A', v: 'A', x: 200, y: 40 },
    { id: 'B', v: 'B', x: 200, y: 220 },
    { id: 'C', v: 'C', x: 380, y: 40 },
    { id: 'D', v: 'D', x: 380, y: 220 },
  ],
  edges: [
    // 故意把"下游"边排在前面：第一轮只能松弛出 S 的直接邻居，
    // 更远的点要等下一轮——直观展示"第 k 轮修好 k 步内的最短路"。
    { a: 'C', b: 'A', w: -2 },   // 0
    { a: 'D', b: 'C', w: 7 },    // 1
    { a: 'B', b: 'D', w: -3 },   // 2
    { a: 'A', b: 'B', w: 8 },    // 3
    { a: 'S', b: 'A', w: 6 },    // 4
    { a: 'S', b: 'B', w: 7 },    // 5
  ],
};
// 负环版：加一条 D→A 权 -6，与 A→B(8)、B→D(-3) 形成负环：A→B→D→A = 8-3-6 = -1
const BM_CYC_EDGE = { a: 'D', b: 'A', w: -6 };

function buildBellman() {
  const V = BM_G.verts.map((v) => v.id);
  const frames = [];
  const dist = {}; V.forEach((v) => (dist[v] = Infinity));
  dist.S = 0;
  const fmt = () => { const m = {}; V.forEach((v) => (m[v] = dist[v] === Infinity ? INF : dist[v])); return m; };

  frames.push({
    vs: { S: 'active' }, sub: fmt(), es: {}, line: 0,
    vars: { 轮次: 0, 边数: BM_G.edges.length },
    say: '图里有<b>负权边</b>（B→D 权 -3、C→A 权 -2），Dijkstra 用不了。Bellman-Ford 不贪心、不挑点：<b>每一轮把所有 6 条边挨个松弛一遍</b>，简单粗暴。',
  });

  let guard = 0;
  for (let round = 1; round <= V.length - 1 && guard < 60; round++) {
    let changed = false;
    frames.push({
      vs: { S: 'done' }, sub: fmt(), es: {}, line: 1,
      vars: { 轮次: round },
      say: round === 1
        ? '<b>第 1 轮</b>开始。关键不变量：<b>第 k 轮结束后，所有"最多走 k 条边"的最短路必然正确</b>。最短路至多 V-1=4 条边，所以至多 4 轮收敛。'
        : `<b>第 ${round} 轮</b>：再把 6 条边全部过一遍。上一轮修好了 ${round - 1} 步内的点，这一轮在它们基础上向外多推一步。`,
    });
    BM_G.edges.forEach((e, i) => {
      guard++;
      const nd = dist[e.a] === Infinity ? Infinity : dist[e.a] + e.w;
      if (nd < dist[e.b]) {
        const old = dist[e.b] === Infinity ? INF : dist[e.b];
        dist[e.b] = nd;
        changed = true;
        frames.push({
          vs: { S: 'done', [e.b]: 'compare' }, sub: fmt(),
          es: { [i]: 'active' }, pop: { [e.b]: true }, line: 3,
          vars: { 轮次: round, 松弛: `${e.a}→${e.b}`, 原: old, 新: { v: nd, hot: true } },
          say: `松弛 <code>${e.a}→${e.b}</code>（权 ${e.w}）：${dist[e.a]}${e.w >= 0 ? '+' : ''}${e.w} = <b>${nd}</b> &lt; ${old}，更新。${e.w < 0 ? '<b>负权边照样处理</b>——因为我们不做"定案"承诺。' : ''}`,
        });
      }
    });
    if (!changed) {
      frames.push({
        vs: mapAll(V, 'done'), sub: fmt(), es: {}, line: 4,
        vars: { 轮次: round, 变化: '无' },
        say: `第 ${round} 轮<b>一次松弛都没发生</b> → 已收敛，提前结束。注意负权边 B→D 让 dist[D]=4 比"表面直达"更短——Bellman-Ford 处理得毫无压力。`,
      });
      break;
    }
  }

  /* --- 负环阶段 --- */
  const edges2 = [...BM_G.edges, BM_CYC_EDGE];
  const d2 = { ...dist };
  frames.push({
    withCyc: true, vs: {}, sub: fmt(), es: { 6: 'path' }, line: 5,
    vars: { 新边: 'D→A (w=-6)' },
    say: '现在<b>加一条边 D→A（权 -6）</b>：于是 A→B→D→A 一圈总权 8 + (-3) + (-6) = <b>-1</b>，这是一个<b>负环</b>——每绕一圈路程还能变短。',
  });
  // 沿负环再模拟几次松弛（环边：A→B(i=3), B→D(i=2), D→A(i=6)）
  const CYC_IDX = { 3: 1, 2: 1, 6: 1 };
  const cycE = [
    { a: 'D', b: 'A', w: -6, i: 6 },
    { a: 'A', b: 'B', w: 8, i: 3 },
    { a: 'B', b: 'D', w: -3, i: 2 },
  ];
  let extra = 0;
  for (let k = 0; k < 2 && extra < 4; k++) {
    for (const e of cycE) {
      if (extra >= 4) break;
      const nd = d2[e.a] + e.w;
      if (nd < d2[e.b]) {
        const old = d2[e.b];
        d2[e.b] = nd;
        extra++;
        const m = {}; V.forEach((v) => (m[v] = d2[v] === Infinity ? INF : d2[v]));
        const cycEs = {}; Object.keys(CYC_IDX).forEach((i) => (cycEs[i] = 'path'));
        frames.push({
          withCyc: true, vs: { [e.b]: 'compare' }, sub: m,
          es: { ...cycEs, [e.i]: 'active' },
          pop: { [e.b]: true }, line: 5,
          vars: { 轮次: V.length, 松弛: `${e.a}→${e.b}`, 原: old, 新: { v: nd, hot: true } },
          say: `按理说 ${V.length - 1} 轮后应彻底稳定，可现在第 ${V.length} 轮 <code>${e.a}→${e.b}</code> <b>仍能松弛</b>（${old} → ${nd}）！dist 沿着环无限下降，"最短路"根本不存在。`,
        });
      }
    }
  }
  frames.push({
    withCyc: true,
    vs: { A: 'path', B: 'path', D: 'path' },
    sub: (() => { const m = {}; V.forEach((v) => (m[v] = d2[v] === Infinity ? INF : d2[v])); return m; })(),
    es: { 2: 'path', 3: 'path', 6: 'path' }, line: 6,
    vars: { 判定: '存在负环' },
    say: '判定法则：<b>第 V 轮（这里第 5 轮）还有边能松弛 ⇔ 图中存在从源点可达的负环</b>。此时应报告"无解"而不是输出数字。这正是 Bellman-Ford 比 Dijkstra 慢（O(VE)）却不可替代的原因。',
  });

  return { frames, meta: { edges2 } };
}

function graphBellman(host) {
  return new Player({
    title: 'Bellman-Ford：无脑全边松弛 V-1 轮',
    badge: '负权最短路',
    speed: 1250,
    vars: true,
    legend: [
      { c: '--viz-active', t: '松弛成功' },
      { c: '--viz-compare', t: 'dist 更新' },
      { c: '--viz-path', t: '负环' },
    ],
    pseudo: [
      'dist[s] = 0, 其余 = INF;',
      'for (int round = 1; round <= V - 1; ++round)',
      '  for (每条边 (a, b, w))',
      '    if (dist[a] + w < dist[b]) dist[b] = dist[a] + w;',
      '  // 若整轮无更新可提前退出',
      'for (每条边 (a, b, w))          // 第 V 轮',
      '  if (dist[a] + w < dist[b])  报告负环;',
    ],
    build: buildBellman,
    draw(stage, f, meta) {
      const base = f.withCyc ? { ...BM_G, uid: 'bmc', edges: meta.edges2 } : BM_G;
      setStage(stage, gFrame(base, f));
    },
  }).mount(host);
}

/* ============================================================
   7. graph-mst-kruskal — 最小生成树：按边权贪心 + 并查集判环
   ============================================================ */

const KR_G = {
  uid: 'kr',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 60, y: 60 },
    { id: 'B', v: 'B', x: 250, y: 40 },
    { id: 'C', v: 'C', x: 440, y: 70 },
    { id: 'D', v: 'D', x: 100, y: 220 },
    { id: 'E', v: 'E', x: 280, y: 230 },
    { id: 'F', v: 'F', x: 460, y: 210 },
  ],
  edges: [
    { a: 'A', b: 'B', w: 4 }, { a: 'B', b: 'C', w: 6 },
    { a: 'A', b: 'D', w: 2 }, { a: 'B', b: 'D', w: 5 },
    { a: 'B', b: 'E', w: 3 }, { a: 'C', b: 'F', w: 2 },
    { a: 'D', b: 'E', w: 1 }, { a: 'E', b: 'F', w: 7 },
    { a: 'C', b: 'E', w: 5 },
  ],
};

function buildKruskal() {
  const V = KR_G.verts.map((v) => v.id);
  const order = KR_G.edges
    .map((e, i) => ({ ...e, i }))
    .sort((x, y) => x.w - y.w || x.i - y.i);

  const parent = {};
  V.forEach((v) => (parent[v] = v));
  const find = (x) => { let g = 0; while (parent[x] !== x && g++ < 20) x = parent[x]; return x; };

  const frames = [];
  const es = {};
  const listSt = order.map(() => 'wait');   // wait|pick|drop|cur
  const groups = () => {
    const m = {};
    V.forEach((v) => { const r = find(v); (m[r] = m[r] || []).push(v); });
    return Object.values(m).map((g) => g.join('')).join(' | ');
  };

  frames.push({
    es: {}, list: listSt.slice(), total: 0, cnt: 0, line: [0, 1],
    vars: { 边数: order.length, 集合: groups() },
    say: 'Kruskal 的贪心：<b>把边按权从小到大排好</b>（右侧列表），逐条尝试。全局最便宜的边只要不成环就一定属于某棵最小生成树——这是 MST 的<b>切割性质</b>保证的。初始 6 个点各自为一个集合。',
  });

  let total = 0, cnt = 0;
  order.forEach((e, k) => {
    listSt[k] = 'cur';
    frames.push({
      es: { ...es, [e.i]: 'compare' }, list: listSt.slice(), total, cnt,
      vs: { [e.a]: 'compare', [e.b]: 'compare' }, line: [2, 3],
      vars: { 尝试: `${e.a}-${e.b}`, 权: e.w, 集合: groups() },
      say: `尝试第 ${k + 1} 便宜的边 <code>${e.a}-${e.b}</code>（权 ${e.w}）。用<b>并查集</b>查两端所属集合：find(${e.a}) 与 find(${e.b}) 是否相同？`,
    });

    const ra = find(e.a), rb = find(e.b);
    if (ra !== rb) {
      parent[ra] = rb;
      es[e.i] = 'done';
      total += e.w; cnt++;
      listSt[k] = 'pick';
      frames.push({
        es: { ...es }, list: listSt.slice(), total, cnt,
        vs: { [e.a]: 'done', [e.b]: 'done' }, pop: { [e.a]: true, [e.b]: true }, line: [4, 5],
        vars: { 选中: `${e.a}-${e.b}`, 总权: { v: total, hot: true }, 已选: `${cnt}/5`, 集合: groups() },
        say: `两端在<b>不同集合</b> → 不成环，<b>选中</b>并合并集合。当前总权重 <b>${total}</b>，已选 ${cnt}/5 条（V-1=5 条即完工）。`,
      });
    } else {
      es[e.i] = 'path';
      listSt[k] = 'drop';
      frames.push({
        es: { ...es }, list: listSt.slice(), total, cnt,
        vs: { [e.a]: 'path', [e.b]: 'path' }, line: 6,
        vars: { 弃用: `${e.a}-${e.b}`, 原因: '成环', 集合: groups() },
        say: `find(${e.a}) == find(${e.b})：两端<b>已经连通</b>，再加这条边必成环 → <b>打叉丢弃</b>。树上任何环都意味着有一条边是多余的。`,
      });
    }
  });

  frames.push({
    es: { ...es }, list: listSt.slice(), total, cnt,
    vs: mapAll(V, 'done'), line: 7,
    vars: { 最终总权: total, 选边: cnt },
    say: `完成：5 条边、总权 <b>${total}</b>，连通全部 6 个点且无环——这就是<b>最小生成树</b>。复杂度瓶颈在排序 <code>O(E log E)</code>；并查集近似 O(1)。适合<b>稀疏图</b>。`,
  });

  return { frames, meta: { order } };
}

function graphKruskal(host) {
  return new Player({
    title: 'Kruskal：最便宜的边优先，并查集拦住环',
    badge: '最小生成树',
    speed: 1300,
    vars: true,
    legend: [
      { c: '--viz-compare', t: '正在尝试' },
      { c: '--viz-done', t: '选入 MST' },
      { c: '--viz-path', t: '成环弃用' },
    ],
    pseudo: [
      'sort(edges);                 // 按权升序',
      'DSU dsu(V);                  // 并查集',
      'for (auto [w, a, b] : edges) {',
      '  if (dsu.find(a) != dsu.find(b)) {',
      '    dsu.unite(a, b);         // 不成环 → 选中',
      '    mst += w;',
      '  }  // 否则丢弃（会成环）',
      '}',
    ],
    build: buildKruskal,
    draw(stage, f, meta) {
      const items = meta.order.map((e, k) => {
        const st = f.list[k];
        return {
          t: `${e.a}${e.b}·${e.w}`,
          on: st === 'cur' || st === 'pick',
          dim: st === 'wait',
          strike: st === 'drop',
        };
      });
      const info = el('div', '', `已选 <b style="color:var(--primary)">${f.cnt}</b> / 5 条 · 总权 <b style="color:var(--primary)">${f.total}</b>`);
      info.style.cssText = 'font-size:12px;color:var(--fg-soft);font-family:var(--font-mono)';
      splitStage(stage, gFrame(KR_G, f),
        panelBox('候选边（按权升序）', chipRow(items)),
        panelBox('进度', info));
    },
  }).mount(host);
}

/* ============================================================
   8. graph-mst-prim — 最小生成树：从一点长出一棵树
   ============================================================ */

function buildPrim() {
  const V = KR_G.verts.map((v) => v.id);
  const frames = [];
  const inT = { A: true };
  const es = {};
  let total = 0;

  const cutEdges = () =>
    KR_G.edges.map((e, i) => ({ ...e, i })).filter((e) => inT[e.a] !== inT[e.b]);
  const vsNow = () => { const m = {}; V.forEach((v) => { if (inT[v]) m[v] = 'done'; }); return m; };
  const cutChip = (best) =>
    cutEdges().sort((x, y) => x.w - y.w)
      .map((e) => ({ t: `${e.a}${e.b}·${e.w}`, on: best !== undefined && e.i === best }));

  frames.push({
    vs: { A: 'done' }, es: {}, cut: cutChip(), total: 0, line: 0,
    vars: { 树: 'A', 总权: 0 },
    say: 'Prim 与 Kruskal 贪心方向不同：<b>维护一棵树</b>，从 A 开始一次长一个点。任何时刻，"树内 ↔ 树外"之间的边叫<b>横切边</b>（右侧列表）——下一步只从它们里挑。',
  });

  let guard = 0;
  while (Object.keys(inT).length < V.length && guard++ < 10) {
    const cut = cutEdges();
    let best = cut[0];
    for (const e of cut) if (e.w < best.w) best = e;

    const cutEs = {};
    cut.forEach((e) => (cutEs[e.i] = 'compare'));
    frames.push({
      vs: vsNow(), es: { ...es, ...cutEs, [best.i]: 'active' }, cut: cutChip(best.i), total, line: [2, 3],
      vars: { 横切边数: cut.length, 最小: `${best.a}-${best.b}(${best.w})` },
      say: `当前 ${cut.length} 条横切边（高亮）。取权最小的 <code>${best.a}-${best.b}</code>（权 ${best.w}）。<b>切割性质</b>：任何一个"树内/树外"划分，横切边中的最小者必属于某棵 MST——贪心因此安全。`,
    });

    const nv = inT[best.a] ? best.b : best.a;
    inT[nv] = true;
    es[best.i] = 'done';
    total += best.w;
    frames.push({
      vs: vsNow(), es: { ...es }, cut: cutChip(), total,
      pop: { [nv]: true }, tagv: { [nv]: '并入' }, line: 4,
      vars: { 并入: nv, 总权: { v: total, hot: true }, 树: V.filter((x) => inT[x]).join('') },
      say: `把 <b>${nv}</b> 拉进树里，这条边定案。树长大后<b>横切边集合随之刷新</b>：${nv} 的对外边加入候选，两端都在树内的边被移除。`,
    });
  }

  frames.push({
    vs: vsNow(), es: { ...es }, cut: [], total, line: 6,
    vars: { 最终总权: total },
    say: `6 个点全部并入，总权 <b>${total}</b>——与 Kruskal 殊途同归（MST 权值唯一，树形可能不同）。用堆维护横切边为 <code>O(E log V)</code>，<b>稠密图</b>上表现更好；Kruskal 则胜在稀疏图。`,
  });

  return { frames, meta: {} };
}

function graphPrim(host) {
  return new Player({
    title: 'Prim：一棵树贪吃横切边，逐点长大',
    badge: '最小生成树',
    speed: 1400,
    vars: true,
    legend: [
      { c: '--viz-done', t: '树内 / 树边' },
      { c: '--viz-compare', t: '横切边' },
      { c: '--viz-active', t: '本轮最小' },
    ],
    pseudo: [
      '把起点 A 放入树;',
      'while (树没长满 V 个点) {',
      '  在所有横切边(树内-树外)中',
      '  取权最小的 (u, v);        // u 在树内',
      '  把 v 并入树, 该边计入 MST;',
      '}',
      '// 用优先队列维护横切边: O(E log V)',
    ],
    build: buildPrim,
    draw(stage, f) {
      splitStage(stage, gFrame(KR_G, f),
        panelBox('横切边（树内↔树外）', chipRow(f.cut || [], '（无）')));
    },
  }).mount(host);
}

/* ============================================================
   9. graph-scc — Tarjan 强连通分量：dfn/low + 栈
   ============================================================ */

const SCC_G = {
  uid: 'scc',
  directed: true,
  verts: [
    { id: 'A', v: 'A', x: 50, y: 120 },
    { id: 'B', v: 'B', x: 180, y: 40 },
    { id: 'C', v: 'C', x: 180, y: 200 },
    { id: 'D', v: 'D', x: 330, y: 40 },
    { id: 'E', v: 'E', x: 330, y: 200 },
    { id: 'F', v: 'F', x: 470, y: 110 },
    { id: 'G', v: 'G', x: 480, y: 250 },
  ],
  edges: [
    { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' },
    { a: 'B', b: 'D' }, { a: 'D', b: 'E' }, { a: 'E', b: 'F' },
    { a: 'F', b: 'D' }, { a: 'E', b: 'G' },
  ],
};
const SCC_ADJ = { A: ['B'], B: ['C', 'D'], C: ['A'], D: ['E'], E: ['F', 'G'], F: ['D'], G: [] };
const SCC_COLOR = ['pivot', 'visited', 'done'];   // 依次分配给弹出的 SCC

function buildScc() {
  const eIdx = {};
  SCC_G.edges.forEach((e, i) => (eIdx[`${e.a}-${e.b}`] = i));

  const frames = [];
  const dfn = {}, low = {}, onStk = {}, sccOf = {};
  const stack = [];
  const sccs = [];
  let clock = 1, guard = 0;

  const subNow = () => {
    const m = {};
    for (const k in dfn) m[k] = `${dfn[k]}/${low[k]}`;
    return m;
  };
  const vsNow = (extra = {}) => {
    const m = {};
    for (const k in dfn) {
      if (sccOf[k] !== undefined) m[k] = SCC_COLOR[sccOf[k] % 3];
      else if (onStk[k]) m[k] = 'active';
    }
    return { ...m, ...extra };
  };
  const stChip = (cur) => stack.map((x) => ({ t: x, on: x === cur }));
  const es = {};

  frames.push({
    vs: {}, sub: {}, es: {}, st: [], line: 0,
    say: '<b>强连通分量（SCC）</b>：有向图里互相可达的最大点集。肉眼看：A⇄B⇄C 一团、D⇄E⇄F 一团、G 自己一个。Tarjan 用一次 DFS + 两个时间戳把它们全找出来：<code>dfn</code>=发现序号，<code>low</code>=从自己出发（经栈内点）能<b>回跳到的最早祖先</b>。',
  });

  const dfs = (u, fromEdge) => {
    if (guard++ > 40) return;
    dfn[u] = low[u] = clock++;
    stack.push(u);
    onStk[u] = true;
    if (fromEdge !== undefined) es[fromEdge] = 'active';
    frames.push({
      vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(u),
      tagv: { [u]: '发现' }, pop: { [u]: true }, line: 1,
      vars: { 当前: u, dfn: dfn[u], low: low[u] },
      say: `发现 <code>${u}</code>：<code>dfn=${dfn[u]}</code>，<code>low</code> 先设为自己 ${low[u]}，入栈。栈里存的是"<b>SCC 归属还没定案</b>"的点。`,
    });

    for (const v of SCC_ADJ[u]) {
      const ei = eIdx[`${u}-${v}`];
      if (dfn[v] === undefined) {
        dfs(v, ei);
        if (guard > 40) return;
        if (low[v] < low[u]) {
          low[u] = low[v];
          frames.push({
            vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(u),
            tagv: { [u]: '当前' }, line: 4,
            vars: { 当前: u, 回传: `low[${v}]=${low[v]}`, [`low[${u}]`]: { v: low[u], hot: true } },
            say: `孩子 ${v} 递归返回，把它的 low=${low[v]} 回传：<code>low[${u}] = min(low[${u}], low[${v}]) = ${low[u]}</code>。<b>孩子能回跳到的祖先，父亲也算能到</b>。`,
          });
        }
      } else if (onStk[v]) {
        es[ei] = 'compare';
        const old = low[u];
        low[u] = Math.min(low[u], dfn[v]);
        frames.push({
          vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(u),
          tagv: { [u]: '当前' }, line: 5,
          vars: { 当前: u, 回边: `${u}→${v}`, [`low[${u}]`]: { v: low[u], hot: old !== low[u] } },
          say: `<code>${u}→${v}</code> 指向一个<b>还在栈里</b>的点——这是条回边，说明 ${u} 能绕回早年的 ${v}：<code>low[${u}] = min(${old}, dfn[${v}]=${dfn[v]}) = ${low[u]}</code>。`,
        });
      } else {
        es[ei] = 'dim';
        frames.push({
          vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(u),
          tagv: { [u]: '当前' }, line: 5,
          vars: { 当前: u, 检查: `${u}→${v}`, 结果: '不更新' },
          say: `<code>${u}→${v}</code>：${v} 已出栈、归属已定案（属于别的 SCC），走过去<b>回不来</b>，不能用它更新 low。`,
        });
      }
    }

    if (low[u] === dfn[u]) {
      const grp = [];
      let x, g2 = 0;
      do { x = stack.pop(); onStk[x] = false; sccOf[x] = sccs.length; grp.push(x); }
      while (x !== u && g2++ < 10);
      sccs.push(grp);
      frames.push({
        vs: vsNow(), sub: subNow(), es: { ...es }, st: stChip(),
        pop: mapAll(grp, true), line: [6, 7],
        vars: { 定案: u, SCC: `{${grp.join(',')}}`, 已找到: sccs.length },
        say: `<code>${u}</code> 探索完且 <b>low==dfn（${dfn[u]}）</b>：它无法回跳到任何更早的祖先，说明<b>它就是所在 SCC 的"根"</b>。把栈顶到 ${u} 一起弹出 → 强连通分量 <b>{${grp.join(', ')}}</b>，统一染色。`,
      });
    }
  };
  dfs('A');

  frames.push({
    vs: vsNow(), sub: subNow(), es: { ...es }, st: [], line: 7,
    vars: { SCC数: sccs.length },
    say: `一次 DFS 结束，找到 ${sccs.length} 个强连通分量：${sccs.map((g) => `{${g.join(',')}}`).join('、')}。每个点各进出栈一次，复杂度 <code>O(V+E)</code>。把每个 SCC 缩成一个点，原图就变成 <b>DAG</b>——很多难题因此化简。`,
  });

  return { frames, meta: {} };
}

function graphScc(host) {
  return new Player({
    title: 'Tarjan：dfn/low 一遍 DFS 找强连通分量',
    badge: 'SCC',
    speed: 1400,
    vars: true,
    legend: [
      { c: '--viz-active', t: '在栈中（未定案）' },
      { c: '--viz-pivot', t: 'SCC ①' },
      { c: '--viz-visited', t: 'SCC ②' },
      { c: '--viz-done', t: 'SCC ③' },
      { c: '--viz-compare', t: '回边' },
    ],
    pseudo: [
      'void tarjan(int u) {',
      '  dfn[u] = low[u] = ++clock;  栈.push(u);',
      '  for (int v : adj[u])',
      '    if (未访问 v) {',
      '      tarjan(v);  low[u] = min(low[u], low[v]);',
      '    } else if (v 在栈中) low[u] = min(low[u], dfn[v]);',
      '  if (low[u] == dfn[u])       // u 是 SCC 的根',
      '    不断弹栈直到弹出 u → 得到一个 SCC;',
      '}',
    ],
    build: buildScc,
    draw(stage, f) {
      splitStage(stage, gFrame(SCC_G, f),
        panelBox('Tarjan 栈（栈顶在右）', chipRow(f.st || [], '（空）')));
    },
  }).mount(host);
}

/* ============================================================
   10. graph-bipartite — 二分图：染色判定 + 匈牙利算法
   ============================================================ */

// 阶段一：含奇环的图（三角形 B-C-E）
const BP_BAD = {
  uid: 'bpbad',
  directed: false,
  verts: [
    { id: 'A', v: 'A', x: 60, y: 60 },
    { id: 'B', v: 'B', x: 230, y: 40 },
    { id: 'C', v: 'C', x: 400, y: 60 },
    { id: 'D', v: 'D', x: 90, y: 210 },
    { id: 'E', v: 'E', x: 300, y: 210 },
  ],
  edges: [
    { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'A', b: 'D' },
    { a: 'B', b: 'E' }, { a: 'C', b: 'E' }, { a: 'D', b: 'E' },
  ],
};
// 阶段二：可二分图（左 L1..L3，右 R1..R3），演示匈牙利
const BP_OK = {
  uid: 'bpok',
  directed: false,
  verts: [
    { id: 'L1', v: 'L1', x: 100, y: 40 },
    { id: 'L2', v: 'L2', x: 100, y: 140 },
    { id: 'L3', v: 'L3', x: 100, y: 240 },
    { id: 'R1', v: 'R1', x: 400, y: 40 },
    { id: 'R2', v: 'R2', x: 400, y: 140 },
    { id: 'R3', v: 'R3', x: 400, y: 240 },
  ],
  edges: [
    { a: 'L1', b: 'R1' }, { a: 'L1', b: 'R2' },
    { a: 'L2', b: 'R1' },
    { a: 'L3', b: 'R2' }, { a: 'L3', b: 'R3' },
  ],
};

function buildBipartite() {
  const frames = [];

  /* ---- 阶段一：BFS 交替染色，撞上奇环 ---- */
  const adj = {};
  BP_BAD.verts.forEach((v) => (adj[v.id] = []));
  const eIdx = {};
  BP_BAD.edges.forEach((e, i) => {
    adj[e.a].push({ to: e.b, i });
    adj[e.b].push({ to: e.a, i });
    eIdx[`${e.a}-${e.b}`] = eIdx[`${e.b}-${e.a}`] = i;
  });

  const color = {};   // 0 / 1
  const es = {};
  const C2ST = ['active', 'pivot'];   // 两种颜色
  const vsNow = (extra = {}) => {
    const m = {};
    for (const k in color) m[k] = C2ST[color[k]];
    return { ...m, ...extra };
  };

  frames.push({
    g: 'bad', vs: {}, es: {}, line: 0,
    say: '<b>二分图</b>：能否把点分成两组，使每条边都"跨组"？判定方法就是 BFS <b>交替染色</b>：我染蓝，邻居必须染黄，邻居的邻居又染蓝……先试这张图。',
  });

  color.A = 0;
  frames.push({
    g: 'bad', vs: vsNow(), es: {}, tagv: { A: '起点' }, pop: { A: true }, line: 1,
    vars: { 队列: 'A' },
    say: '起点 A 染<b>蓝色</b>（第 0 组），入队。',
  });

  const q = ['A'];
  let clash = null;
  let guard = 0;
  while (q.length && !clash && guard++ < 20) {
    const u = q.shift();
    for (const { to: v, i } of adj[u]) {
      if (color[v] === undefined) {
        color[v] = 1 - color[u];
        es[i] = 'done';
        q.push(v);
        frames.push({
          g: 'bad', vs: vsNow(), es: { ...es, [i]: 'compare' },
          tagv: { [u]: '当前' }, pop: { [v]: true }, line: [4, 5],
          vars: { 当前: u, 染色: v, 颜色: color[v] === 0 ? '蓝' : '黄' },
          say: `${u} 的邻居 <code>${v}</code> 未染色 → 染<b>相反色</b>（${color[v] === 0 ? '蓝' : '黄'}）并入队。约束沿边传播，没有讨价还价的余地。`,
        });
      } else if (color[v] === color[u]) {
        clash = { u, v, i };
        break;
      }
    }
  }

  if (clash) {
    frames.push({
      g: 'bad',
      vs: vsNow({ [clash.u]: 'path', [clash.v]: 'path' }),
      es: { ...es, [clash.i]: 'path' },
      pop: { [clash.u]: true, [clash.v]: true }, line: 6,
      vars: { 冲突边: `${clash.u}-${clash.v}` },
      say: `撞车了：边 <code>${clash.u}-${clash.v}</code> 两端<b>同色</b>！根源是三角形 B-C-E 是<b>奇环</b>——沿奇数条边绕一圈回到起点，颜色恰好翻转奇数次，自相矛盾。<b>二分图 ⇔ 无奇环</b>。`,
    });
  }

  /* ---- 阶段二：匈牙利算法 ---- */
  const oEdge = {};
  BP_OK.edges.forEach((e, i) => (oEdge[`${e.a}-${e.b}`] = i));
  const match = {};   // R -> L
  const mEs = () => {
    const m = {};
    BP_OK.edges.forEach((e, i) => { if (match[e.b] === e.a) m[i] = 'done'; });
    return m;
  };
  const mvs = () => {
    const m = {};
    BP_OK.verts.forEach((v) => {
      const id = v.id;
      const matched = id.startsWith('R') ? !!match[id] : Object.values(match).includes(id);
      m[id] = matched ? 'done' : id.startsWith('L') ? 'active' : 'pivot';
    });
    return m;
  };

  frames.push({
    g: 'ok', vs: mvs(), es: {}, line: 7,
    say: '换一张<b>可二分</b>的图（左边 3 人、右边 3 个岗位），进入第二阶段：<b>匈牙利算法</b>求最大匹配——每人至多占一岗，问最多能配几对？策略：逐个给左边的人找位置，<b>找不到就"商量"</b>。',
  });

  // L1: R1 空闲
  match.R1 = 'L1';
  frames.push({
    g: 'ok', vs: mvs(), es: { ...mEs(), [oEdge['L1-R1']]: 'done' },
    pop: { L1: true, R1: true }, line: 8,
    vars: { 处理: 'L1', 匹配: 'L1-R1', 对数: 1 },
    say: '<b>L1</b> 尝试 R1：空闲 → 直接配对 <code>L1-R1</code>（匹配边<b>加粗变绿</b>）。',
  });

  // L2: R1 被占 → 让 L1 换到 R2（增广路 L2-R1-L1-R2）
  frames.push({
    g: 'ok', vs: mvs(), es: { ...mEs(), [oEdge['L2-R1']]: 'compare' },
    tagv: { L2: '当前' }, line: 8,
    vars: { 处理: 'L2', 尝试: 'R1', 状态: '被 L1 占用' },
    say: '<b>L2</b> 只认识 R1，但 R1 已被 L1 占。别急着放弃：问 L1 "<b>你能不能挪个窝？</b>"——递归地给 L1 找别的岗位。',
  });
  frames.push({
    g: 'ok', vs: mvs(),
    es: { ...mEs(), [oEdge['L2-R1']]: 'compare', [oEdge['L1-R2']]: 'compare' },
    tagv: { L1: '让位?' }, line: 9,
    vars: { 增广路: 'L2→R1→L1→R2' },
    say: '找到一条<b>增广路</b>：L2—R1<b>（未匹配边）</b>—L1<b>（匹配边）</b>—R2（未匹配边，且 R2 空闲）。未匹配边与匹配边<b>交替</b>出现，两端都空闲。',
  });
  match.R1 = 'L2'; match.R2 = 'L1';
  frames.push({
    g: 'ok', vs: mvs(), es: mEs(),
    pop: { L2: true, R1: true, R2: true }, line: 10,
    vars: { 翻转后: 'L2-R1, L1-R2', 对数: { v: 2, hot: true } },
    say: '沿增广路<b>整体翻转</b>：未匹配边变匹配、匹配边变未匹配。匹配数从 1 变 2——<b>翻转永远净赚 1 对</b>（路两端各多出一条匹配边）。这就是"增广"的含义。',
  });

  // L3: R2 被占，L1 无法再挪（R1 被 L2 占且 L2 无处去）→ 试 R3 成功
  frames.push({
    g: 'ok', vs: mvs(), es: { ...mEs(), [oEdge['L3-R2']]: 'compare' },
    tagv: { L3: '当前' }, line: 8,
    vars: { 处理: 'L3', 尝试: 'R2', 状态: '被 L1 占用' },
    say: '<b>L3</b> 先试 R2：被 L1 占。递归问 L1 → L1 的另一个选项 R1 又被 L2 占，L2 无路可退——这条增广路<b>走不通</b>。',
  });
  match.R3 = 'L3';
  frames.push({
    g: 'ok', vs: mvs(), es: mEs(),
    pop: { L3: true, R3: true }, line: 10,
    vars: { 匹配: 'L3-R3', 对数: { v: 3, hot: true } },
    say: 'L3 退而尝试 <b>R3：空闲</b>，直接配对。最终匹配 3 对：<code>L1-R2、L2-R1、L3-R3</code>——<b>完美匹配</b>。找不到增广路时匹配已最大（König 定理的核心）。复杂度 <code>O(V·E)</code>。',
  });

  return { frames, meta: {} };
}

function graphBipartite(host) {
  return new Player({
    title: '二分图：染色判定 → 匈牙利找增广路',
    badge: '二分图',
    speed: 1600,
    vars: true,
    legend: [
      { c: '--viz-active', t: '蓝组 / 左部' },
      { c: '--viz-pivot', t: '黄组 / 右部' },
      { c: '--viz-path', t: '奇环冲突' },
      { c: '--viz-done', t: '匹配边' },
      { c: '--viz-compare', t: '增广路' },
    ],
    pseudo: [
      '// 阶段一：BFS 交替染色判定',
      'color[s] = 0;  q.push(s);',
      'while (!q.empty()) {',
      '  u = q.front(); q.pop();',
      '  for (v : adj[u])',
      '    if (v 未染色) { color[v] = !color[u]; q.push(v); }',
      '    else if (color[v] == color[u]) return 不是二分图;',
      '}',
      '// 阶段二：匈牙利，为每个左点找增广路',
      'bool aug(u): 依次试 u 的邻居 v →',
      '  v 空闲 或 aug(match[v]) 成功 ⇒ match[v] = u;',
    ],
    build: buildBipartite,
    draw(stage, f) {
      setStage(stage, gFrame(f.g === 'ok' ? BP_OK : BP_BAD, f));
    },
  }).mount(host);
}

/* ============================================================
   11. graph-flow — 最大流（Edmonds-Karp 概念版）
   ============================================================ */

const FLOW_G = {
  uid: 'flow',
  directed: true,
  verts: [
    { id: 'S', v: 'S', x: 40, y: 130 },
    { id: 'A', v: 'A', x: 190, y: 40 },
    { id: 'C', v: 'C', x: 190, y: 220 },
    { id: 'D', v: 'D', x: 350, y: 220 },
    { id: 'B', v: 'B', x: 350, y: 40 },
    { id: 'T', v: 'T', x: 500, y: 130 },
  ],
  edges: [
    { a: 'S', b: 'A', w: 3 },   // 0
    { a: 'S', b: 'C', w: 2 },   // 1
    { a: 'A', b: 'D', w: 2 },   // 2
    { a: 'A', b: 'B', w: 2 },   // 3
    { a: 'C', b: 'D', w: 1 },   // 4
    { a: 'D', b: 'T', w: 2 },   // 5
    { a: 'B', b: 'T', w: 2 },   // 6
  ],
};

function buildFlow() {
  const E = FLOW_G.edges;
  const cap = E.map((e) => e.w);
  const flow = E.map(() => 0);
  const frames = [];
  let total = 0;

  const ew = () => E.map((_, i) => `${flow[i]}/${cap[i]}`);
  const satEs = () => {
    const m = {};
    E.forEach((_, i) => {
      if (flow[i] >= cap[i]) m[i] = 'visited';
      else if (flow[i] > 0) m[i] = 'done';
    });
    return m;
  };

  frames.push({
    ew: ew(), es: {}, vs: { S: 'active', T: 'pivot' }, line: 0,
    vars: { 总流量: 0 },
    say: '<b>最大流</b>：每条管道标 <code>流量/容量</code>，问从源点 S 到汇点 T 每秒最多能灌多少水。EK 算法 = <b>反复用 BFS 找一条还有余量的路（增广路），沿路灌满，直到找不到为止</b>。',
  });

  /* BFS 找增广路（残量网络：正向余量 cap-flow，反向余量 flow） */
  const findPath = () => {
    const prev = { S: null };
    const q = ['S'];
    let g = 0;
    while (q.length && g++ < 30) {
      const u = q.shift();
      E.forEach((e, i) => {
        if (e.a === u && cap[i] - flow[i] > 0 && prev[e.b] === undefined) {
          prev[e.b] = { i, back: false }; q.push(e.b);
        }
        if (e.b === u && flow[i] > 0 && prev[e.a] === undefined) {
          prev[e.a] = { i, back: true }; q.push(e.a);
        }
      });
    }
    if (prev.T === undefined) return { path: null, reach: Object.keys(prev) };
    const path = [];
    let x = 'T';
    let g2 = 0;
    while (x !== 'S' && g2++ < 10) {
      const p = prev[x];
      path.unshift(p);
      x = p.back ? E[p.i].b : E[p.i].a;
    }
    return { path, reach: Object.keys(prev) };
  };

  let round = 0, guard = 0;
  while (guard++ < 8) {
    const { path, reach } = findPath();
    if (!path) {
      /* 无增广路 → 结束 + 最小割 */
      const cutEs = {};
      const cutList = [];
      E.forEach((e, i) => {
        if (reach.includes(e.a) && !reach.includes(e.b)) { cutEs[i] = 'path'; cutList.push(`${e.a}→${e.b}`); }
      });
      const vs = {};
      FLOW_G.verts.forEach((v) => (vs[v.id] = reach.includes(v.id) ? 'active' : 'dim'));
      frames.push({
        ew: ew(), es: { ...satEs(), ...cutEs }, vs, line: 6,
        vars: { 最大流: total, S侧: reach.join(','), 割边: cutList.join(' ') },
        say: `BFS 从 S 只能到达 {${reach.join(', ')}}——通往其余点的边<b>全部满载</b>，再无增广路，算法结束。这条"满载边界" <code>${cutList.join('、')}</code> 就是<b>最小割</b>，容量 ${cutList.map((s) => { const [a, b] = s.split('→'); const e = E.findIndex((x) => x.a === a && x.b === b); return cap[e]; }).join('+')} = <b>${total}</b>。<b>最大流 = 最小割</b>：瓶颈决定吞吐。`,
      });
      break;
    }

    round++;
    const names = ['S', ...path.map((p) => (p.back ? E[p.i].a : E[p.i].b))];
    const pathEs = {};
    path.forEach((p) => (pathEs[p.i] = p.back ? 'path' : 'active'));
    const hasBack = path.some((p) => p.back);
    const bott = Math.min(...path.map((p) => (p.back ? flow[p.i] : cap[p.i] - flow[p.i])));

    frames.push({
      ew: ew(), es: { ...satEs(), ...pathEs },
      vs: { ...mapAll(names, 'compare'), S: 'active', T: 'pivot' }, line: [1, 2],
      vars: { 第几条: round, 路径: names.join('→') },
      say: `第 ${round} 次 BFS 找到增广路 <b>${names.join(' → ')}</b>${hasBack
        ? '。注意 <code>D → A</code> 一段是<b>逆着原边 A→D 走的反向边</b>：意思是"把之前灌进 A→D 的水退掉一部分"，给全局腾出更优的分配——<b>反向边就是算法的后悔药</b>'
        : '（BFS 保证这是边数最少的一条）'}。`,
    });

    frames.push({
      ew: ew(), es: { ...satEs(), ...pathEs },
      vs: { ...mapAll(names, 'compare'), S: 'active', T: 'pivot' }, line: 3,
      vars: { 路径: names.join('→'), 瓶颈: { v: bott, hot: true } },
      say: `这条路能灌多少？看<b>最细的一节管道</b>：各段余量 ${path.map((p) => (p.back ? `${E[p.i].b}→${E[p.i].a}(退${flow[p.i]})` : `${E[p.i].a}→${E[p.i].b}(${cap[p.i] - flow[p.i]})`)).join('、')} → 瓶颈 = <b>${bott}</b>。`,
    });

    path.forEach((p) => { flow[p.i] += p.back ? -bott : bott; });
    total += bott;
    frames.push({
      ew: ew(), es: satEs(),
      vs: { S: 'active', T: 'pivot' }, pop: { T: true }, line: [4, 5],
      vars: { 本次增广: bott, 总流量: { v: total, hot: true } },
      say: `沿路更新：正向边流量 +${bott}${hasBack ? `，反向段把 A→D 的流量<b>减</b> ${bott}` : ''}，同时相应的反向余量增加（留好后悔的余地）。累计流量 <b>${total}</b>。满载的边变暗——它们暂时堵死了。`,
    });
  }

  return { frames, meta: {} };
}

function graphFlow(host) {
  return new Player({
    title: '最大流（EK）：BFS 增广，反向边留后路',
    badge: '网络流',
    speed: 1900,
    vars: true,
    legend: [
      { c: '--viz-active', t: '增广路' },
      { c: '--viz-path', t: '反向边 / 割边' },
      { c: '--viz-done', t: '有流量' },
      { c: '--viz-visited', t: '已满载' },
    ],
    pseudo: [
      'int maxflow = 0;',
      'while (true) {',
      '  BFS 在残量网络中找 S→T 的路;  找不到则 break;',
      '  b = 路上最小残量;             // 瓶颈',
      '  沿路: 正向边 flow += b, 反向边 flow -= b;',
      '  maxflow += b;',
      '}  // 无增广路时: BFS 可达集的出边 = 最小割',
    ],
    build: buildFlow,
    draw(stage, f) {
      setStage(stage, gFrame(FLOW_G, f));
    },
  }).mount(host);
}

/* ============================================================
   导出
   ============================================================ */

export const VIZ = {
  'graph-repr': graphRepr,
  'graph-bfs': graphBfs,
  'graph-dfs': graphDfs,
  'graph-topo': graphTopo,
  'graph-dijkstra': graphDijkstra,
  'graph-bellman': graphBellman,
  'graph-mst-kruskal': graphKruskal,
  'graph-mst-prim': graphPrim,
  'graph-scc': graphScc,
  'graph-bipartite': graphBipartite,
  'graph-flow': graphFlow,
};
