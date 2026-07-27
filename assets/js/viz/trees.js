/* ============================================================
   树结构动画：遍历 · BST · 堆 · Trie · 并查集 · 红黑树入门
   ============================================================ */

import {
  Player, el, drawArray, drawTree,
  layoutHeap, layoutBST, setStage,
} from './engine.js';

/* 舞台内的小节标题 */
function cap(txt) {
  const d = el('div', '', txt);
  d.style.cssText = 'text-align:center;font-size:11px;font-weight:600;color:var(--fg-muted);margin:12px 0 0;';
  return d;
}
function capDim(txt) {
  const d = el('div', '', txt);
  d.style.cssText = 'text-align:center;font-size:11px;color:var(--fg-muted);opacity:.6;margin:6px 0 0;';
  return d;
}

/* ------------------------------------------------------------
   1. tree-traversal 二叉树四种遍历
   固定完全二叉树：值 = 层序编号，便于对照
   ------------------------------------------------------------ */

const TR_VALS = [1, 2, 3, 4, 5, 6, 7];
const TR_POS = layoutHeap(TR_VALS, { hGap: 78, vGap: 58 });

function travRecFrames(mode) {
  const frames = [];
  const doneSet = new Set();
  const out = [];
  const stack = [];
  const NAME = { pre: '前序', in: '中序', post: '后序' };
  const LINES = { pre: [0, 1], in: [2, 3], post: [4, 5] };

  const mk = (cur, say) => frames.push({
    st: TR_VALS.map((_, i) =>
      (i === cur ? 'active' : doneSet.has(i) ? 'done' : stack.includes(i) ? 'visited' : 'idle')),
    es: TR_VALS.map((_, i) => (stack.includes(i) || i === cur ? 'path' : 'idle')),
    out: [...out],
    say,
    line: LINES[mode],
    vars: {
      模式: NAME[mode],
      输出: out.join(' ') || '—',
      递归栈: stack.map((i) => TR_VALS[i]).join('→') || '空',
    },
  });

  const intro = {
    pre: '前序遍历 = <b>根 → 左 → 右</b>：一碰到节点就先"办它的事"再深入。类比复制一棵树：必须先有根，才能往下挂孩子。',
    in: '中序遍历 = <b>左 → 根 → 右</b>：先把左子树全部走完才轮到自己。<b>对二叉搜索树，中序输出恰好是升序</b>。',
    post: '后序遍历 = <b>左 → 右 → 根</b>：自己永远排最后。适合"必须先处理完孩子"的任务：释放内存、统计子树大小。',
  };
  mk(null, intro[mode]);

  const go = (u) => {
    if (u > 6) return;
    const l = 2 * u + 1, r = 2 * u + 2;
    const hasKid = l <= 6;
    stack.push(u);
    if (mode === 'pre') {
      doneSet.add(u); out.push(TR_VALS[u]);
      mk(u, `进入节点 <b>${TR_VALS[u]}</b>：前序<b>先访问再深入</b>——立即输出，然后递归左、右子树。`);
      go(l); go(r);
      mk(null, hasKid
        ? `节点 ${TR_VALS[u]} 的左右子树都处理完毕 → <b>回溯</b>到上一层（递归函数返回）。`
        : `叶子 ${TR_VALS[u]} 没有孩子 → 递归立即<b>回溯</b>。`);
    } else if (mode === 'in') {
      mk(u, hasKid
        ? `进入节点 <b>${TR_VALS[u]}</b>：中序要求<b>先走完左子树</b>，自己先压在递归栈里等着。`
        : `进入叶子 <b>${TR_VALS[u]}</b>：没有左子树，无需等待。`);
      go(l);
      doneSet.add(u); out.push(TR_VALS[u]);
      mk(u, hasKid
        ? `左子树完成，<b>回溯</b>回到 <b>${TR_VALS[u]}</b> → 现在才输出它，接着转向右子树。`
        : `输出 <b>${TR_VALS[u]}</b>，随即回溯。`);
      go(r);
    } else {
      mk(u, `进入节点 <b>${TR_VALS[u]}</b>：后序把自己排到<b>最后</b>——先递归左，再递归右。`);
      go(l); go(r);
      doneSet.add(u); out.push(TR_VALS[u]);
      mk(u, hasKid
        ? `左右子树都完成，<b>回溯</b>到 <b>${TR_VALS[u]}</b> → 此刻才输出它（"归"的时刻）。`
        : `叶子 <b>${TR_VALS[u]}</b> 直接输出并回溯。`);
    }
    stack.pop();
  };
  go(0);

  const fin = {
    pre: `前序序列 <b>${out.join(' ')}</b>：根最先出现 → 适合<b>序列化 / 复制</b>整棵树。每个节点恰好访问一次，时间 O(n)。`,
    in: `中序序列 <b>${out.join(' ')}</b>。记住：<b>BST 的中序 = 升序</b>，这是验证一棵树是否为合法 BST 的标准手段。`,
    post: `后序序列 <b>${out.join(' ')}</b>：根最后出现 → <b>先子后父</b>，删除整棵树、求树高都靠它。`,
  };
  mk(null, fin[mode]);
  return frames;
}

function travLevelFrames() {
  const frames = [];
  const doneSet = new Set();
  const out = [];
  const q = [];

  const mk = (cur, say) => frames.push({
    st: TR_VALS.map((_, i) =>
      (i === cur ? 'active' : doneSet.has(i) ? 'done' : q.includes(i) ? 'compare' : 'idle')),
    es: TR_VALS.map((_, i) => (doneSet.has(i) || i === cur ? 'visited' : 'idle')),
    out: [...out],
    say,
    line: [6, 7],
    vars: {
      模式: '层序',
      输出: out.join(' ') || '—',
      队列: q.map((i) => TR_VALS[i]).join(' ') || '空',
    },
  });

  mk(null, '层序（BFS）不用递归，改用<b>队列</b>：根入队，然后循环「出队、访问、孩子入队」。<b>先进先出保证一层扫完才扫下一层</b>。');
  q.push(0);
  mk(null, '根节点 <b>1</b> 入队，队列 = [1]。队列里的节点是"已发现、待访问"。');

  let g = 0;
  while (q.length && g++ < 16) {
    const u = q.shift();
    doneSet.add(u); out.push(TR_VALS[u]);
    const kids = [2 * u + 1, 2 * u + 2].filter((x) => x <= 6);
    kids.forEach((k) => q.push(k));
    mk(u, `出队 <b>${TR_VALS[u]}</b> 并输出；它的孩子 ${kids.length ? kids.map((k) => `<b>${TR_VALS[k]}</b>`).join('、') : '（无）'} 入队排到末尾。`);
  }

  mk(null, `层序结果 <b>${out.join(' ')}</b> 恰好按"层"分组——求<b>树的宽度、最近的目标（最少层数）</b>都用它。`);
  return frames;
}

function treeTraversal(host) {
  let mode = 'pre';
  return new Player({
    title: '二叉树遍历：前序 · 中序 · 后序 · 层序',
    badge: '遍历',
    speed: 950,
    legend: [
      { c: '--viz-active', t: '正在访问' },
      { c: '--viz-visited', t: '递归栈中' },
      { c: '--viz-compare', t: '队列中（层序）' },
      { c: '--viz-done', t: '已输出' },
    ],
    vars: true,
    pseudo: [
      '// 前序：根 → 左 → 右',
      'void pre(u){ visit(u); pre(u->l); pre(u->r); }',
      '// 中序：左 → 根 → 右',
      'void ino(u){ ino(u->l); visit(u); ino(u->r); }',
      '// 后序：左 → 右 → 根',
      'void post(u){ post(u->l); post(u->r); visit(u); }',
      '// 层序：队列先进先出，逐层展开',
      'while(队列非空){ u=出队; visit(u); 左右孩子入队; }',
    ],
    controls(bar, rebuild) {
      const defs = [['pre', '前序'], ['in', '中序'], ['post', '后序'], ['level', '层序']];
      const btns = defs.map(([key, label]) => {
        const b = el('button', 'vbtn', label);
        b.dataset.mode = key;
        b.onclick = () => { mode = key; paint(); rebuild(); };
        return b;
      });
      const paint = () => btns.forEach((b) => {
        const on = b.dataset.mode === mode;
        b.style.background = on ? 'var(--primary)' : '';
        b.style.color = on ? 'var(--on-primary)' : '';
        b.style.borderColor = on ? 'transparent' : '';
      });
      paint();
      bar.append(...btns);
    },
    build: () => ({ frames: mode === 'level' ? travLevelFrames() : travRecFrames(mode), meta: {} }),
    draw(stage, f) {
      const nodes = TR_POS.map((n) => ({
        id: n.id, v: n.v, x: n.x, y: n.y, parent: n.parent,
        state: f.st[n.id], edgeState: f.es[n.id],
      }));
      const parts = [drawTree({ nodes, r: 18 }), cap('输出序列')];
      if (f.out.length) {
        const hot = f.st.indexOf('active') !== -1;
        parts.push(drawArray({
          data: f.out, index: false, cell: 34,
          state: f.out.map((_, i) => (hot && i === f.out.length - 1 ? 'active' : 'done')),
        }));
      } else {
        parts.push(capDim('（暂无输出）'));
      }
      setStage(stage, ...parts);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   2. bst-ops 二叉搜索树：插入 / 查找 / 删除 / 退化
   ------------------------------------------------------------ */

function bstFrames() {
  const frames = [];
  let root = null;
  const GEO = { hGap: 44, vGap: 56 };

  const ins = (t, k) => {
    if (!t) return { key: k, l: null, r: null };
    if (k < t.key) t.l = ins(t.l, k); else t.r = ins(t.r, k);
    return t;
  };
  const del = (t, k) => {
    if (!t) return null;
    if (k < t.key) { t.l = del(t.l, k); return t; }
    if (k > t.key) { t.r = del(t.r, k); return t; }
    if (!t.l) return t.r;
    if (!t.r) return t.l;
    let s = t.r; let g = 0;
    while (s.l && g++ < 40) s = s.l;
    t.key = s.key;
    t.r = del(t.r, s.key);
    return t;
  };

  const F = (say, line, o = {}) => frames.push({
    say, line, vars: o.vars,
    nodes: layoutBST(root, GEO).map((n) => ({
      id: n.id, v: n.v, x: n.x, y: n.y, parent: n.parent,
      state: (o.st || {})[n.id] || 'idle',
      edgeState: (o.eg || {})[n.id] || 'idle',
      tag: (o.tag || {})[n.id],
      pop: n.id === o.popKey,
    })),
  });

  const insertViz = (k, verbose, phase) => {
    const path = [];
    const dirs = [];
    let cur = root; let g = 0;
    while (cur && g++ < 40) {
      path.push(cur.key);
      dirs.push(k < cur.key ? '左' : '右');
      cur = k < cur.key ? cur.l : cur.r;
    }
    if (verbose) {
      path.forEach((p, i) => {
        const st = {}; const eg = {};
        for (let j = 0; j <= i; j++) {
          st[path[j]] = j === i ? 'compare' : 'visited';
          if (j > 0) eg[path[j]] = 'path';
        }
        F(k < p
          ? `插入 <b>${k}</b>：与 <b>${p}</b> 比较，${k} 更小 → 走<b>左</b>子树（约定：小左大右）。`
          : `插入 <b>${k}</b>：与 <b>${p}</b> 比较，${k} 更大 → 走<b>右</b>子树。`,
        k < p ? 2 : 3,
        { st, eg, vars: { 阶段: phase, 插入: k, 正在比较: p } });
      });
    }
    root = ins(root, k);
    const st = { [k]: 'active' }; const eg = { [k]: 'path' };
    path.forEach((p) => { st[p] = st[p] || 'visited'; eg[p] = eg[p] || 'path'; });
    F(path.length
      ? (verbose
        ? `走到空位 → 新节点 <b>${k}</b> 挂到 ${path[path.length - 1]} 的<b>${dirs[dirs.length - 1]}</b>侧。落点由一路的比较唯一决定。`
        : `插入 <b>${k}</b>：沿 ${path.join(' → ')} 依次比较（${dirs.join('、')}），落到空位。`)
      : `树为空，<b>${k}</b> 直接成为根节点。`,
    1, { st, eg, popKey: k, vars: { 阶段: phase, 插入: k } });
  };

  F('二叉搜索树的全部秘密就一句话：<b>左子树 &lt; 根 &lt; 右子树</b>。理想情况下每次比较砍掉一半候选。先依次插入 50, 30, 70, 20, 40, 60, 80。', 0,
    { vars: { 阶段: '插入' } });
  insertViz(50, true, '插入');
  insertViz(30, true, '插入');
  insertViz(70, true, '插入');
  insertViz(20, true, '插入');
  insertViz(40, false, '插入');
  insertViz(60, false, '插入');
  insertViz(80, false, '插入');

  /* 查找 40 */
  let cur = root; const seen = []; let g = 0;
  while (cur && g++ < 20) {
    seen.push(cur.key);
    const st = {}; const eg = {};
    seen.forEach((q, j) => { st[q] = 'visited'; if (j > 0) eg[q] = 'path'; });
    if (cur.key === 40) {
      st[40] = 'done';
      F('40 == 40，<b>命中</b>！路径 50→30→40 只有 3 步——<b>树有多高，查找最多走多少步</b>，平衡时是 O(log n)。', 5,
        { st, eg, vars: { 阶段: '查找', 目标: 40 } });
      break;
    }
    st[cur.key] = 'compare';
    F(`查找 <b>40</b>：与 ${cur.key} 比较 → ${40 < cur.key ? '40 更小，往左' : '40 更大，往右'}。<b>另一半子树连看都不用看</b>。`, 5,
      { st, eg, vars: { 阶段: '查找', 目标: 40, 当前: cur.key } });
    cur = 40 < cur.key ? cur.l : cur.r;
  }

  /* 删除三连：叶子 / 单子 / 双子 */
  F('删除比插入难，分三种情况。先删叶子 <b>20</b>：它没有任何孩子。', 7,
    { st: { 20: 'path' }, vars: { 阶段: '删除', 目标: 20 } });
  root = del(root, 20);
  F('20 是<b>叶子</b> → 直接摘掉：父节点 30 的左指针置空，其余节点毫发无损。', 7,
    { vars: { 阶段: '删除', 目标: 20 } });

  F('再删 <b>30</b>：它现在只剩<b>一个孩子 40</b>。直接摘掉会让 40 断线——所以让孩子顶上来。', 8,
    { st: { 30: 'path', 40: 'compare' }, eg: { 40: 'path' }, vars: { 阶段: '删除', 目标: 30 } });
  root = del(root, 30);
  F('40 被<b>直接接到 50 的左侧</b>（爷爷收养孙子）。有序性不受影响：40 依旧小于 50。', 8,
    { st: { 40: 'active' }, popKey: 40, vars: { 阶段: '删除', 目标: 30 } });

  F('最难的一种：删根 <b>50</b>，它有<b>两个孩子</b>——直接摘掉，两棵子树就没了接头。', 9,
    { st: { 50: 'path' }, vars: { 阶段: '删除', 目标: 50 } });
  F('办法：找 50 的<b>中序后继</b>＝右子树的最左端：70 → <b>60</b>。它是"刚好比 50 大"的值，用它补位不破坏左小右大。', 9,
    { st: { 50: 'path', 70: 'visited', 60: 'compare' }, eg: { 70: 'path', 60: 'path' },
      tag: { 60: '后继' }, vars: { 阶段: '删除', 目标: 50 } });
  root = del(root, 50);
  F('用 <b>60 的值覆盖根</b>，再去右子树删掉原来的 60——后继最多只有右孩子，<b>必然退化成前两种简单情形</b>。中序依旧有序。', 10,
    { st: { 60: 'active' }, tag: { 60: '后继' }, popKey: 60, vars: { 阶段: '删除', 目标: 50 } });

  /* 退化实验 */
  root = null;
  F('最后做个实验：把<b>有序序列</b> 10, 20, 30, 40, 50 插入一棵空树，看看形状如何。', 3,
    { vars: { 阶段: '退化实验' } });
  [10, 20, 30, 40, 50].forEach((k) => {
    const path = [];
    let c = root; let gg = 0;
    while (c && gg++ < 20) { path.push(c.key); c = k < c.key ? c.l : c.r; }
    root = ins(root, k);
    const st = { [k]: 'active' }; const eg = { [k]: 'path' };
    path.forEach((p) => { st[p] = 'visited'; eg[p] = eg[p] || 'path'; });
    F(path.length
      ? `插入 ${k}：比 ${path.join('、')} 都大 → <b>每次都走右边</b>，比较了 ${path.length} 次。`
      : `插入 ${k} 作为根。`,
    3, { st, eg, popKey: k, vars: { 阶段: '退化实验', 树高: path.length + 1 } });
  });
  F('树<b>退化成了链表</b>：高度 = n，查找/插入都成了 O(n)，BST 的优势荡然无存。<b>这正是 AVL / 红黑树存在的理由：靠旋转把高度压回 O(log n)</b>。', 3,
    { st: { 10: 'visited', 20: 'visited', 30: 'visited', 40: 'visited', 50: 'visited' },
      vars: { 阶段: '结论' } });

  return { frames, meta: {} };
}

function bstOps(host) {
  return new Player({
    title: '二叉搜索树：插入 · 查找 · 删除 · 退化',
    badge: 'BST',
    speed: 1050,
    legend: [
      { c: '--viz-compare', t: '正在比较' },
      { c: '--viz-visited', t: '走过的路径' },
      { c: '--viz-active', t: '新建 / 改动' },
      { c: '--viz-path', t: '待删除' },
      { c: '--viz-done', t: '命中' },
    ],
    vars: true,
    pseudo: [
      '// BST 不变量：左 < 根 < 右',
      'insert(t,x): if(!t) 在空位落地新节点',
      '  if (x < t->key) 往左子树递归',
      '  else            往右子树递归',
      '',
      'find(x): 同样的走法下行，相等即命中',
      '// 删除 x 的三种情况：',
      '  叶子     → 直接摘除',
      '  单孩子   → 孩子顶替自己',
      '  双孩子   → 找中序后继(右子树最左)',
      '             覆盖值，再删后继',
    ],
    build: bstFrames,
    draw(stage, f) {
      if (!f.nodes.length) {
        setStage(stage, capDim('（空树）'));
        return;
      }
      setStage(stage, drawTree({ nodes: f.nodes, r: 18 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   3. heap-ops 大顶堆：push 上浮 / pop 下沉，树 + 数组同屏
   ------------------------------------------------------------ */

function heapFrames() {
  const frames = [];
  const a = [90, 70, 80, 30, 60];

  const F = (say, line, o = {}) => {
    const st = a.map((_, i) => (o.st || {})[i] || (i >= (o.size ?? a.length) ? 'dim' : 'idle'));
    frames.push({
      say, line, a: [...a], st,
      size: o.size ?? a.length,
      vars: o.vars,
    });
  };

  F('大顶堆＝<b>用数组存的完全二叉树</b>，规则只有一条：父 ≥ 子。下标换算：父 <code>i</code> 的孩子是 <code>2i+1</code>、<code>2i+2</code>——树和数组是同一份数据的两种视角。', 0,
    { vars: { 堆: '[90,70,80,30,60]' } });
  F('看对应关系：下标 1 的 <b>70</b>，孩子在 3(=2·1+1) 和 4(=2·1+2)，即 30 和 60。<b>不需要指针，算术即导航</b>——这是堆能塞进数组的原因。', 0,
    { st: { 1: 'pivot', 3: 'compare', 4: 'compare' }, vars: { i: 1, '2i+1': 3, '2i+2': 4 } });

  /* push 85 */
  a.push(85);
  F('<b>push(85)</b>：先把 85 追加到数组末尾（下标 5）——完全二叉树只能在这儿长，否则会出洞。但 85 > 父亲 80，<b>堆序被破坏</b>。', 1,
    { st: { 5: 'active' }, vars: { 操作: 'push 85', 位置: 5 } });
  let i = 5;
  let g = 0;
  while (i > 0 && g++ < 12) {
    const p = (i - 1) >> 1;
    F(`<b>上浮</b>：与父比较——<code>a[${i}]=${a[i]}</code> vs 父 <code>a[${p}]=${a[p]}</code>。`, 2,
      { st: { [i]: 'active', [p]: 'compare' }, vars: { 操作: 'push 85', i, 父: p } });
    if (a[i] <= a[p]) {
      F(`${a[i]} ≤ ${a[p]}，父亲更大 → 堆序恢复，<b>上浮停止</b>。`, 3,
        { st: { [i]: 'done', [p]: 'done' }, vars: { 操作: 'push 85' } });
      break;
    }
    [a[i], a[p]] = [a[p], a[i]];
    F(`${a[p]} > ${a[i]} → <b>交换</b>。孩子比父亲大就往上顶一层，问题规模缩小为"新位置是否还大过新父亲"。`, 3,
      { st: { [i]: 'compare', [p]: 'active' }, vars: { 操作: 'push 85', 换到: p } });
    i = p;
    if (i === 0) {
      F('已到根，无父可比，上浮结束。<b>上浮最多走树高层 = O(log n)</b>。', 3,
        { st: { 0: 'done' }, vars: { 操作: 'push 85' } });
    }
  }
  F('push 完成：85 停在下标 2。<b>堆只承诺"父 ≥ 子"，不承诺全局有序</b>——够用了，因为我们只关心最大值。', 1,
    { st: { 0: 'pivot' }, vars: { 堆顶: a[0] } });

  /* pop */
  F('<b>pop()</b>：要取走的是堆顶 <b>90</b>（最大值）。但直接删掉根会把树劈成两半——所以玩个调包。', 4,
    { st: { 0: 'path' }, vars: { 操作: 'pop', 返回: 90 } });
  const last = a.length - 1;
  [a[0], a[last]] = [a[last], a[0]];
  F(`把<b>末尾元素 ${a[0]}</b> 换到堆顶，原堆顶 90 挪到末尾并移出堆（变灰）。树形完整了，代价是根变成了小个子——接下来<b>下沉</b>修复。`, 5,
    { st: { 0: 'active', [last]: 'path' }, size: last, vars: { 操作: 'pop', 堆大小: last } });
  a.pop();

  i = 0; g = 0;
  const size = a.length;
  while (g++ < 12) {
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l >= size) {
      F('没有孩子了，下沉结束。', 8, { st: { [i]: 'done' }, vars: { 操作: 'pop' } });
      break;
    }
    const stC = { [i]: 'active' };
    if (l < size) stC[l] = 'compare';
    if (r < size) stC[r] = 'compare';
    F(`<b>下沉</b>：${a[i]} 与两个孩子 ${a[l]}${r < size ? '、' + a[r] : ''} 比较，找三者最大。`, 6,
      { st: stC, vars: { 操作: 'pop', i, 左: a[l], 右: r < size ? a[r] : '—' } });
    let big = i;
    if (l < size && a[l] > a[big]) big = l;
    if (r < size && a[r] > a[big]) big = r;
    if (big === i) {
      F(`${a[i]} 已不小于任何孩子 → 堆序恢复，<b>下沉停止</b>。`, 8,
        { st: { [i]: 'done' }, vars: { 操作: 'pop' } });
      break;
    }
    [a[i], a[big]] = [a[big], a[i]];
    F(`<b>与较大的孩子交换</b>（换较大者才能保证新父亲 ≥ 另一个孩子）。${a[i]} 顶上来，继续检查下标 ${big}。`, 7,
      { st: { [i]: 'active', [big]: 'compare' }, vars: { 操作: 'pop', 换到: big } });
    i = big;
  }

  F(`pop 完成，新堆顶 <b>${a[0]}</b> 是剩余元素的最大值。push/pop 都只沿一条树高路径走 → <b>O(log n)</b>；这就是优先队列 <code>priority_queue</code> 的全部内幕。`, 4,
    { st: { 0: 'pivot' }, vars: { 堆顶: a[0] } });

  return { frames, meta: {} };
}

function heapOps(host) {
  return new Player({
    title: '大顶堆：上浮 push · 下沉 pop（树 ↔ 数组）',
    badge: '堆',
    speed: 1050,
    legend: [
      { c: '--viz-active', t: '当前元素' },
      { c: '--viz-compare', t: '比较对象' },
      { c: '--viz-pivot', t: '堆顶' },
      { c: '--viz-path', t: '移出堆' },
      { c: '--viz-done', t: '就位' },
    ],
    vars: true,
    pseudo: [
      '// 数组即树：父 i → 子 2i+1, 2i+2',
      'push(x): 追加到末尾, 然后上浮',
      '  while (x > 父) 与父交换',
      '  否则停止  // 最多 O(log n) 层',
      'pop(): 取走 a[0]',
      '  末尾元素移到堆顶, 堆大小减 1',
      '  下沉: 与两个孩子比较',
      '    与较大的孩子交换, 继续向下',
      '  直到父 ≥ 两个孩子',
    ],
    build: heapFrames,
    draw(stage, f) {
      const nodes = layoutHeap(f.a, { hGap: 64, vGap: 54 }).map((n) => ({
        ...n, state: f.st[n.id],
        edgeState: n.parent != null && (f.st[n.id] !== 'idle' && f.st[n.id] !== 'dim') ? 'path' : 'idle',
      }));
      setStage(stage,
        drawTree({ nodes, r: 17 }),
        cap('底层数组（同一份数据）'),
        drawArray({ data: f.a, state: f.st, cell: 40 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   4. trie-ops 字典树：插入共享前缀 + startsWith 查询
   ------------------------------------------------------------ */

function trieFrames() {
  const frames = [];
  /* 静态构建最终 Trie，动画帧只控制可见性/状态 */
  const nodes = [{ id: 0, ch: '∅', parent: null, end: false }];
  let nid = 0;
  const addWord = (w) => {
    let cur = 0;
    const path = [0];
    for (const ch of w) {
      let nxt = nodes.find((n) => n.parent === cur && n.ch === ch);
      if (!nxt) { nxt = { id: ++nid, ch, parent: cur, end: false }; nodes.push(nxt); }
      cur = nxt.id;
      path.push(cur);
    }
    nodes.find((n) => n.id === cur).end = true;
    return path;
  };
  const WORDS = ['cat', 'car', 'card', 'dog'];
  const paths = {};
  WORDS.forEach((w) => { paths[w] = addWord(w); });

  /* 递归布局：叶子均分 x，内部节点取孩子中点 */
  const kids = (u) => nodes.filter((n) => n.parent === u).sort((p, q) => p.ch < q.ch ? -1 : 1);
  let leafX = 0;
  const HG = 62, VG = 56;
  const place = (u, depth) => {
    const n = nodes.find((x) => x.id === u);
    const ks = kids(u);
    n.y = depth * VG;
    if (!ks.length) { n.x = leafX++ * HG; return; }
    ks.forEach((k) => place(k.id, depth + 1));
    n.x = (ks[0].x + ks[ks.length - 1].x) / 2;
  };
  place(0, 0);

  const F = (say, line, o = {}) => frames.push({
    say, line, vars: o.vars,
    vis: [...(o.vis || [])],
    st: { ...(o.st || {}) },
    ends: [...(o.ends || [])],
  });

  const vis = new Set([0]);
  const ends = new Set();

  F('字典树（Trie）：<b>边代表字符，从根到节点的路径拼出前缀</b>。查一个词的开销只和词长有关，与词库大小无关——这是它碾压哈希表做前缀查询的本钱。', 0,
    { vis, vars: { 词库: '（空）' } });

  const inserted = [];
  WORDS.forEach((w) => {
    inserted.push(w);
    const path = paths[w];
    const reused = path.filter((id) => vis.has(id)).length - 1;
    const created = [];
    path.forEach((id) => { if (!vis.has(id)) { vis.add(id); created.push(id); } });
    const st = {};
    path.forEach((id, j) => { st[id] = created.includes(id) ? 'active' : j ? 'visited' : 'idle'; });
    let msg;
    if (reused > 0 && created.length) {
      msg = `插入 <b>${w}</b>：前 ${reused} 个字符 <code>${w.slice(0, reused)}</code> 的节点<b>已存在，直接复用</b>，只为 <code>${w.slice(reused)}</code> 新建 ${created.length} 个节点。共享前缀 = 省空间的来源。`;
    } else if (created.length === path.length - 1) {
      msg = `插入 <b>${w}</b>：与已有单词没有公共前缀，从根开始逐字符新建 ${created.length} 个节点。`;
    } else {
      msg = `插入 <b>${w}</b>：整条路径都已存在（<code>${w}</code> 是已有路径的前缀），一个节点都不用建。`;
    }
    F(msg, 1, { vis, st, ends, vars: { 插入: w, 复用: reused, 新建: created.length } });

    ends.add(path[path.length - 1]);
    const st2 = {};
    path.forEach((id, j) => { if (j) st2[id] = 'visited'; });
    st2[path[path.length - 1]] = 'done';
    F(`在结尾节点打上<b>词尾标记</b>（绿色）。没有它，就分不清 <code>car</code> 是完整单词还是只是 <code>card</code> 的路过前缀。`, 2,
      { vis, st: st2, ends, vars: { 词库: inserted.join(' / ') } });
  });

  /* startsWith("ca") */
  const q = 'ca';
  F(`词库建好了。现在查 <b>startsWith("${q}")</b>：从根出发，照着查询串一个字符一个字符往下走。`, 3,
    { vis, ends, vars: { 查询: q } });
  let cur = 0;
  const walked = [0];
  for (const ch of q) {
    const nxt = kids(cur).find((n) => n.ch === ch);
    cur = nxt.id;
    walked.push(cur);
    const st = {};
    walked.forEach((id, j) => { if (j) st[id] = id === cur ? 'active' : 'path'; });
    F(`找当前节点的孩子里有没有边 <code>${ch}</code> → <b>有</b>，走过去。已匹配 <code>${q.slice(0, walked.length - 1)}</code>。`, 4,
      { vis, st, ends, vars: { 查询: q, 已匹配: q.slice(0, walked.length - 1) } });
  }
  const st = {};
  walked.forEach((id, j) => { if (j) st[id] = 'path'; });
  const below = new Set();
  const dfs = (u) => { below.add(u); kids(u).forEach((k) => dfs(k.id)); };
  dfs(cur);
  nodes.forEach((n) => { if (below.has(n.id) && !walked.includes(n.id)) st[n.id] = 'compare'; });
  F(`"${q}" 走完且没断路 → <b>startsWith 为真</b>。更妙的是：<b>这棵子树下的所有词尾就是全部以 "${q}" 开头的单词</b>（cat、car、card）——输入法联想、搜索补全就是这么来的。若中途无边可走（如查 "cb"），立即返回假。`, 5,
    { vis, st, ends, vars: { 查询: q, 结果: 'true' } });

  return {
    frames,
    meta: { nodes, edgesOf: nodes.filter((n) => n.parent != null) },
  };
}

function trieOps(host) {
  return new Player({
    title: '字典树 Trie：共享前缀 · 词尾标记 · 前缀查询',
    badge: 'Trie',
    speed: 1200,
    legend: [
      { c: '--viz-active', t: '新建 / 当前' },
      { c: '--viz-visited', t: '复用的前缀' },
      { c: '--viz-done', t: '词尾标记' },
      { c: '--viz-path', t: '查询路径' },
      { c: '--viz-compare', t: '前缀覆盖的子树' },
    ],
    vars: true,
    pseudo: [
      '// 每个节点: children[26] + isEnd',
      'insert(w): 从根走, 无该字符的边则新建',
      '  末尾节点 isEnd = true  // 词尾标记',
      'startsWith(p): 从根按 p 逐字符下行',
      '  有边就走, 无边 → false',
      '  p 走完 → true  // O(len), 与词库大小无关',
    ],
    build: trieFrames,
    draw(stage, f, meta) {
      const shown = meta.nodes
        .filter((n) => f.vis.includes(n.id))
        .map((n) => ({
          id: n.id, v: n.ch, x: n.x, y: n.y,
          parent: n.parent != null && f.vis.includes(n.parent) ? n.parent : null,
          state: f.st[n.id] || (f.ends.includes(n.id) ? 'done' : 'idle'),
          edgeState: (f.st[n.id] && f.st[n.id] !== 'compare') ? 'path' : 'idle',
          tag: f.ends.includes(n.id) ? '词尾' : undefined,
        }));
      setStage(stage, drawTree({ nodes: shown, r: 16 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   5. dsu-ops 并查集：按秩合并 + 路径压缩
   ------------------------------------------------------------ */

function dsuFrames() {
  const frames = [];
  const N = 9;
  const par = Array.from({ length: N }, (_, i) => i);
  const rank = Array(N).fill(0);

  /* 由 parent[] 生成整片森林的坐标（叶子均分，父取子中点） */
  const snap = (o = {}) => {
    const ch = {};
    const roots = [];
    for (let v = 0; v < N; v++) {
      if (par[v] === v) roots.push(v);
      else (ch[par[v]] = ch[par[v]] || []).push(v);
    }
    const nodes = [];
    let leafX = 0;
    const HG = 50, VG = 52;
    const walk = (u, d) => {
      const node = {
        id: u, v: u, y: d * VG,
        parent: par[u] === u ? null : par[u],
        state: (o.st || {})[u] || 'idle',
        edgeState: (o.eg || {})[u] || 'idle',
        tag: (o.tag || {})[u],
        sub: par[u] === u ? `rank ${rank[u]}` : undefined,
        pop: u === o.popKey,
      };
      nodes.push(node);
      const ks = ch[u] || [];
      if (!ks.length) { node.x = leafX++ * HG; return node.x; }
      const xs = ks.map((k) => walk(k, d + 1));
      node.x = (Math.min(...xs) + Math.max(...xs)) / 2;
      return node.x;
    };
    roots.forEach((r) => { walk(r, 0); leafX += 0.4; });
    return nodes;
  };

  const F = (say, line, o = {}) => frames.push({ say, line, vars: o.vars, nodes: snap(o) });

  const findRoot = (x) => { let g = 0; while (par[x] !== x && g++ < 20) x = par[x]; return x; };

  F('并查集只回答一个问题：<b>两个元素在不在同一集合？</b>每个集合是一棵树，<b>根就是集合的代表</b>。初始 9 个元素各自为营，rank（树高上界）全为 0。', 0,
    { vars: { 集合数: 9 } });

  const unionViz = (a, b, brief) => {
    const ra = findRoot(a), rb = findRoot(b);
    if (!brief) {
      F(`<b>union(${a}, ${b})</b>：先各自找根 → ${a} 的根是 <b>${ra}</b>，${b} 的根是 <b>${rb}</b>。合并集合＝<b>把一棵树的根挂到另一棵的根上</b>，只动一个指针。`, 2,
        { st: { [a]: 'compare', [b]: 'compare', [ra]: 'pivot', [rb]: 'pivot' },
          vars: { 操作: `union(${a},${b})`, 根: `${ra} / ${rb}` } });
    }
    let child, parent_, msg;
    if (rank[ra] === rank[rb]) {
      child = rb; parent_ = ra; rank[ra]++;
      msg = `两树同高（rank ${rank[rb]} = ${rank[rb]}）→ 谁挂谁都行，约定 ${rb} 挂到 ${ra} 下，<b>被垫高的一方 rank+1</b>（变为 ${rank[ra]}）。`;
    } else if (rank[ra] > rank[rb]) {
      child = rb; parent_ = ra;
      msg = `<b>按秩合并</b>：${rb} 的树矮（rank ${rank[rb]} &lt; ${rank[ra]}）→ <b>矮树挂到高树下，整体高度不变</b>。这条规则保证树高不超过 O(log n)。`;
    } else {
      child = ra; parent_ = rb;
      msg = `<b>按秩合并</b>：${ra} 的树矮（rank ${rank[ra]} &lt; ${rank[rb]}）→ 矮树挂到高树下，高度不变。`;
    }
    par[child] = parent_;
    F(brief ? `<b>union(${a}, ${b})</b>：${msg}` : msg, 3,
      { st: { [child]: 'active', [parent_]: 'pivot' }, eg: { [child]: 'active' }, popKey: child,
        vars: { 操作: `union(${a},${b})`, [`rank[${parent_}]`]: rank[parent_] } });
  };

  unionViz(0, 1, false);
  unionViz(2, 3, true);
  unionViz(0, 2, false);
  unionViz(8, 0, true);
  unionViz(4, 5, true);
  unionViz(6, 7, true);
  unionViz(4, 6, true);
  unionViz(0, 4, false);

  /* find(7) with path compression */
  const target = 7;
  const chain = [];
  let x = target; let g = 0;
  while (par[x] !== x && g++ < 20) { chain.push(x); x = par[x]; }
  const root = x;

  F(`现在 <b>find(${target})</b>：沿父指针上行。路径 ${[...chain, root].join(' → ')} 有 ${chain.length} 步——树越深，find 越慢，所以要顺手做<b>路径压缩</b>。`, 5,
    { st: Object.fromEntries([...chain.map((c) => [c, 'compare']), [root, 'pivot']]),
      eg: Object.fromEntries(chain.map((c) => [c, 'path'])),
      vars: { 操作: `find(${target})`, 根: root, 深度: chain.length } });

  for (const c of chain) {
    if (par[c] === root) continue;
    par[c] = root;
    F(`<b>路径压缩</b>：${c} 的父指针从原来的中转站<b>直接改指根 ${root}</b>。反正我们只关心根是谁，中间层白走——下次 find(${c}) 就是一步到位。`, 6,
      { st: { [c]: 'active', [root]: 'pivot' }, eg: { [c]: 'active' }, popKey: c,
        vars: { 操作: '路径压缩', 改指针: `par[${c}] = ${root}` } });
  }

  F(`树被<b>压扁</b>了：几乎人人直连根。按秩合并压制树高、路径压缩事后扁平化，两招齐用后单次操作均摊 <b>O(α(n))</b>——反阿克曼函数，宇宙尺度内 ≤ 5，<b>近似 O(1)</b>。`, 7,
    { st: { [root]: 'pivot' }, vars: { 集合数: new Set(Array.from({ length: N }, (_, i) => findRoot(i))).size } });

  return { frames, meta: {} };
}

function dsuOps(host) {
  return new Player({
    title: '并查集：按秩合并 + 路径压缩',
    badge: '并查集',
    speed: 1150,
    legend: [
      { c: '--viz-pivot', t: '根（集合代表）' },
      { c: '--viz-compare', t: '查找路径' },
      { c: '--viz-active', t: '指针改动' },
    ],
    vars: true,
    pseudo: [
      'par[i] = i; rank[i] = 0;  // 各自为根',
      'union(a, b):',
      '  ra = find(a); rb = find(b);',
      '  按秩: 矮树的根挂到高树的根下',
      '  同高时任选, 新根 rank+1',
      'find(x): 沿父指针走到根',
      '  路径压缩: 沿途节点直接改挂根',
      '// 两招齐用: 均摊 O(α(n)) ≈ O(1)',
    ],
    build: dsuFrames,
    draw(stage, f) {
      setStage(stage, drawTree({ nodes: f.nodes, r: 16 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   6. rbtree-intro 红黑树入门：变色 / 左旋 / 右旋
   红 = s-path，黑 = s-idle
   ------------------------------------------------------------ */

function rbFrames() {
  const frames = [];
  /* n: [id, 值, x, y, parent, 颜色 r|b, tag?] */
  const F = (say, line, ns, o = {}) => frames.push({
    say, line, vars: o.vars,
    nodes: ns.map(([id, v, x, y, parent, c, tag]) => ({
      id, v, x, y, parent,
      state: c === 'r' ? 'path' : 'idle',
      edgeState: (o.eg || {})[id] || 'idle',
      tag,
      pop: id === o.popKey,
    })),
  });

  F('BST 会退化，红黑树的解法：给节点上色，用<b>局部规则</b>逼出全局平衡——①根是黑；②<b>红节点的孩子必须是黑</b>（不许红红相连）；③<b>任一节点到叶的每条路径黑节点数相同</b>（黑高相等）。', 0,
    [['g', 20, 160, 0, null, 'b'], ['p', 10, 90, 60, 'g', 'b'], ['u', 30, 230, 60, 'g', 'b']],
    { vars: { 规则: '不红红 + 黑高相等' } });
  F('这两条规则合起来意味着：最长路径（红黑相间）最多是最短路径（全黑）的 <b>2 倍</b> → 高度被钉死在 <b>O(log n)</b>。插入新节点一律<b>染红</b>——红节点不计黑高，规则③自动保住，只可能违反"不红红"。', 1,
    [['g', 20, 160, 0, null, 'b'], ['p', 10, 90, 60, 'g', 'r'], ['u', 30, 230, 60, 'g', 'r']],
    { vars: { 新节点: '恒为红' } });

  /* -------- 场景一：叔叔为红 → 变色上推 -------- */
  const S1 = (zc, pc, uc, gc, o) => F(o.say, o.line,
    [['g', 20, 160, 0, null, gc, o.gt], ['p', 10, 90, 60, 'g', pc, o.pt],
     ['u', 30, 230, 60, 'g', uc, o.ut], ['z', 5, 40, 120, 'p', zc, o.zt]], o);

  S1('r', 'r', 'r', 'b', {
    say: '<b>场景一</b>：插入红节点 <b>5</b>，父亲 10 是红的 → <b>红红冲突</b>。抬头看<b>叔叔 30：也是红的</b>。',
    line: 3, zt: '新', pt: '父·红', ut: '叔·红',
    eg: { z: 'compare' }, popKey: 'z', vars: { 冲突: '5-10 红红', 叔叔: '红' },
  });
  S1('r', 'b', 'b', 'r', {
    say: '<b>变色</b>：父、叔染黑，祖父染红。妙处：经过 10 和经过 30 的路径<b>各多了一个黑、又少了一个黑（20 变红）</b>——黑高一分没变，红红冲突就地消失。',
    line: 4, pt: '染黑', ut: '染黑', gt: '染红',
    vars: { 操作: '变色', 黑高: '不变' },
  });
  S1('r', 'b', 'b', 'b', {
    say: '祖父 20 变红后<b>把问题上推</b>：若它的父亲也是红，同样办法继续；若 20 是根，<b>直接染黑</b>（根加黑给所有路径公平 +1）。变色是 O(1) 的局部操作，最多沿树高传 O(log n) 次。',
    line: 5, vars: { 结果: '合法' },
  });

  /* -------- 场景二：叔叔为黑（LL）→ 右旋 -------- */
  const S2 = (ns, o) => F(o.say, o.line, ns, o);
  S2([['g', 20, 200, 0, null, 'b', '祖父'], ['p', 10, 110, 60, 'g', 'r', '父·红'],
      ['z', 5, 50, 120, 'p', 'r', '新'], ['t', 15, 170, 120, 'p', 'b']], {
    say: '<b>场景二</b>：同样插入红 5、父 10 红，但这次<b>叔叔是黑</b>（这里是空叶，视为黑）。变色行不通：把 10 染黑会让左侧凭空多一个黑节点，<b>黑高失衡</b>。只能动结构——<b>旋转</b>。',
    line: 6, eg: { z: 'compare' }, popKey: 'z', vars: { 冲突: '5-10 红红', 叔叔: '黑' },
  });
  S2([['g', 20, 200, 0, null, 'b'], ['p', 10, 110, 60, 'g', 'r'],
      ['z', 5, 50, 120, 'p', 'r'], ['t', 15, 170, 120, 'p', 'b', '将改挂']], {
    say: '5-10-20 连成<b>左左（LL）直线</b>，对 20 做<b>右旋</b>。盯住三个指针：① 10 的右孩子 15 即将让位；② 20 降级成 10 的右孩子；③ 15 改认 20 当父亲（15 在 10~20 之间，挂 20 左侧不破坏有序）。',
    line: 7, eg: { p: 'compare', t: 'compare' }, vars: { 操作: '右旋(20)' },
  });
  S2([['p', 10, 160, 0, null, 'r', '升'], ['z', 5, 80, 60, 'p', 'r'],
      ['g', 20, 240, 60, 'p', 'b', '降'], ['t', 15, 180, 120, 'g', 'b']], {
    say: '<b>右旋完成</b>：10 上位当根，20 降为右孩子，15 平移到 20 左下。中序遍历前后都是 <code>5,10,15,20</code>——<b>旋转只改形状，不改顺序</b>，这是它敢随便用的前提。',
    line: 7, eg: { g: 'active', t: 'active' }, popKey: 'p', vars: { 中序: '5 10 15 20（不变）' },
  });
  S2([['p', 10, 160, 0, null, 'b', '染黑'], ['z', 5, 80, 60, 'p', 'r'],
      ['g', 20, 240, 60, 'p', 'r', '染红'], ['t', 15, 180, 120, 'g', 'b']], {
    say: '再<b>换色</b>：新根 10 染黑、20 染红。左路径 5→10 与右路径 20→10 各含 1 个黑节点，<b>黑高恢复相等，红红消失</b>。为什么旋转能救平衡？<b>它把过高的左侧压低一层、把矮的右侧抬高一层</b>，正好抵消插入造成的倾斜。',
    line: 8, vars: { 结果: '合法', 高度差: '已抹平' },
  });

  /* -------- 场景三：RR 镜像 → 左旋 -------- */
  S2([['g', 10, 120, 0, null, 'b'], ['p', 20, 200, 60, 'g', 'r', '父·红'],
      ['z', 30, 280, 120, 'p', 'r', '新']], {
    say: '<b>场景三（镜像）</b>：往右侧连插，10-20-30 连成<b>右右（RR）直线</b>且叔叔为黑 → 对 10 做<b>左旋</b>：20 上位，10 降为它的左孩子。',
    line: 7, eg: { z: 'compare' }, popKey: 'z', vars: { 操作: '左旋(10)' },
  });
  S2([['p', 20, 200, 0, null, 'b', '染黑'], ['g', 10, 120, 60, 'p', 'r', '染红'],
      ['z', 30, 280, 60, 'p', 'r']], {
    say: '左旋 + 换色后重新平衡。若插入路径是<b>折线（LR/RL）</b>，就先对父亲旋一次把它捋直成 LL/RR，再按本场景处理——<b>所有插入修复不过是"变色 / 单旋 / 双旋"三板斧</b>，每次 O(1)，总代价 O(log n)。',
    line: 9, popKey: 'p', vars: { 'LR/RL': '先旋直再处理' },
  });

  F('总结：<b>变色</b>解决"叔叔红"（黑高不动，冲突上推）；<b>旋转</b>解决"叔叔黑"（高抬矮压、中序不变）。std::map / TreeMap 的底层就是它——<b>不追求完美平衡，只把高度控制在 2 倍以内</b>，换来插入删除只需常数次旋转。',
    10,
    [['p', 10, 160, 0, null, 'b'], ['z', 5, 80, 60, 'p', 'r'],
     ['g', 20, 240, 60, 'p', 'r'], ['t', 15, 180, 120, 'g', 'b']],
    { vars: { 高度: 'O(log n)' } });

  return { frames, meta: {} };
}

function rbtreeIntro(host) {
  return new Player({
    title: '红黑树入门：红红冲突 → 变色与旋转',
    badge: '红黑树',
    speed: 2400,
    legend: [
      { c: '--viz-path', t: '红节点' },
      { c: '--viz-idle', t: '黑节点' },
      { c: '--viz-compare', t: '冲突 / 将改动' },
    ],
    vars: true,
    pseudo: [
      '// 规则: 根黑; 不红红; 各路径黑高相等',
      '插入的新节点一律染红  // 不动黑高',
      '若父是黑: 什么都不用做',
      '若父红、叔红:          // 场景一',
      '  父叔染黑, 祖父染红   // 黑高不变',
      '  把祖父当新插入点, 冲突上推',
      '若父红、叔黑:          // 场景二',
      '  同侧(LL/RR): 对祖父单旋',
      '  旋后: 新根染黑, 原祖父染红',
      '  异侧(LR/RL): 先旋父捋直, 再单旋',
      '根最后强制染黑',
    ],
    build: rbFrames,
    draw(stage, f) {
      setStage(stage, drawTree({ nodes: f.nodes, r: 18 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------ 导出 */

export const VIZ = {
  'tree-traversal': treeTraversal,
  'bst-ops': bstOps,
  'heap-ops': heapOps,
  'trie-ops': trieOps,
  'dsu-ops': dsuOps,
  'rbtree-intro': rbtreeIntro,
};
