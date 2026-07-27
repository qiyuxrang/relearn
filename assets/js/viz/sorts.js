/* ============================================================
   排序算法动画：冒泡 · 选择 · 插入 · 归并 · 快排 · 堆排 · 对比
   ============================================================ */

import { Player, svgEl, el, drawArray, setStage, randArr, parseNums } from './engine.js';

const DEFAULT = [38, 27, 43, 3, 9, 82, 10];

const LEGEND = [
  { c: '--viz-compare', t: '正在比较' },
  { c: '--viz-active', t: '交换/写入' },
  { c: '--viz-done', t: '已就位' },
];

/** 通用排序播放器工厂 */
function makeSortViz({ title, badge, pseudo, gen, legend, speed = 620, barMode = true }) {
  return function (host, opts = {}) {
    let arr = opts.data || DEFAULT;

    return new Player({
      title,
      badge: badge || '排序',
      speed,
      legend: legend || LEGEND,
      vars: true,
      pseudo,
      controls(bar, rebuild) {
        const inp = el('input');
        inp.type = 'text';
        inp.value = arr.join(', ');
        inp.setAttribute('aria-label', '数组');

        const apply = () => {
          arr = parseNums(inp.value, arr).slice(0, 16);
          inp.value = arr.join(', ');
          rebuild();
        };
        const btn = el('button', 'vbtn', '应用');
        btn.onclick = apply;
        inp.onkeydown = (e) => e.key === 'Enter' && apply();

        const rnd = el('button', 'vbtn', '随机');
        rnd.onclick = () => {
          arr = randArr(opts.n || 8, 5, 95);
          inp.value = arr.join(', ');
          rebuild();
        };

        const rev = el('button', 'vbtn', '逆序');
        rev.onclick = () => {
          arr = [...arr].sort((a, b) => b - a);
          inp.value = arr.join(', ');
          rebuild();
        };

        const lab = document.createElement('label');
        lab.appendChild(document.createTextNode('数组'));
        lab.appendChild(inp);
        bar.append(lab, btn, rnd, rev);
      },
      build: () => gen([...arr]),
      draw(stage, f) {
        setStage(stage, drawArray({
          data: f.a, state: f.state, ptrs: f.ptrs, bars: barMode, barH: 130,
        }));
      },
    }).mount(host);
  };
}

/* ------------------------------------------------------------ 冒泡 */
const bubbleGen = (a) => {
  const n = a.length;
  const frames = [];
  const st = () => a.map(() => 'idle');
  let swaps = 0, cmps = 0;

  frames.push({ a: [...a], state: st(), vars: { 比较: 0, 交换: 0 }, line: 0,
    say: '冒泡排序：反复扫描，把相邻的逆序对交换，<b>每一轮把最大值"冒"到末尾</b>。' });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      cmps++;
      const s = a.map((_, k) => (k >= n - i ? 'done' : 'idle'));
      s[j] = 'compare'; s[j + 1] = 'compare';
      frames.push({ a: [...a], state: s, ptrs: { j }, vars: { 比较: cmps, 交换: swaps, 轮次: i + 1 }, line: 2,
        say: `比较 <code>a[${j}]=${a[j]}</code> 与 <code>a[${j + 1}]=${a[j + 1]}</code>` });

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++; swapped = true;
        const s2 = a.map((_, k) => (k >= n - i ? 'done' : 'idle'));
        s2[j] = 'active'; s2[j + 1] = 'active';
        frames.push({ a: [...a], state: s2, ptrs: { j }, vars: { 比较: cmps, 交换: swaps, 轮次: i + 1 }, line: 3,
          say: `逆序 → <b>交换</b>，较大的 ${a[j + 1]} 往右移动一格。` });
      }
    }
    const s3 = a.map((_, k) => (k >= n - 1 - i ? 'done' : 'idle'));
    frames.push({ a: [...a], state: s3, vars: { 比较: cmps, 交换: swaps, 轮次: i + 1 }, line: 1,
      say: `第 ${i + 1} 轮结束，<b>${a[n - 1 - i]}</b> 已到达最终位置。` });

    if (!swapped) {
      frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 比较: cmps, 交换: swaps }, line: 5,
        say: '本轮<b>一次交换都没有</b> → 数组已有序，提前退出。这个优化让最好情况降到 <code>O(n)</code>。' });
      break;
    }
  }

  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 比较: cmps, 交换: swaps }, line: 6,
    say: `排序完成。共比较 <b>${cmps}</b> 次、交换 <b>${swaps}</b> 次。时间 <code>O(n²)</code>，空间 <code>O(1)</code>，<b>稳定</b>。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 选择 */
const selectionGen = (a) => {
  const n = a.length;
  const frames = [];
  let swaps = 0, cmps = 0;

  frames.push({ a: [...a], state: a.map(() => 'idle'), vars: { 比较: 0, 交换: 0 }, line: 0,
    say: '选择排序：每一轮从未排序区里<b>挑出最小值</b>，放到已排序区末尾。' });

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    frames.push({
      a: [...a], state: a.map((_, k) => (k < i ? 'done' : k === i ? 'pivot' : 'idle')),
      ptrs: { i, min: { at: min, color: '--viz-pivot' } },
      vars: { i, min, 比较: cmps, 交换: swaps }, line: 2,
      say: `第 ${i + 1} 轮开始，暂定最小值在下标 <code>${i}</code>（值 ${a[i]}）。`,
    });

    for (let j = i + 1; j < n; j++) {
      cmps++;
      const s = a.map((_, k) => (k < i ? 'done' : k === min ? 'pivot' : 'idle'));
      s[j] = 'compare';
      frames.push({
        a: [...a], state: s, ptrs: { j, min: { at: min, color: '--viz-pivot' } },
        vars: { i, min, j, 比较: cmps, 交换: swaps }, line: 3,
        say: `比较 <code>a[${j}]=${a[j]}</code> 与当前最小 <code>a[${min}]=${a[min]}</code>`,
      });
      if (a[j] < a[min]) {
        min = j;
        frames.push({
          a: [...a], state: a.map((_, k) => (k < i ? 'done' : k === min ? 'pivot' : 'idle')),
          ptrs: { min: { at: min, color: '--viz-pivot' } },
          vars: { i, min: { v: min, hot: true }, 比较: cmps, 交换: swaps }, line: 4,
          say: `更小！<b>最小值下标更新为 ${min}</b>。`,
        });
      }
    }

    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      swaps++;
    }
    frames.push({
      a: [...a], state: a.map((_, k) => (k <= i ? 'done' : 'idle')),
      vars: { i, 比较: cmps, 交换: swaps }, line: 5,
      say: min !== i
        ? `把最小值 <b>${a[i]}</b> 交换到位置 ${i}。<b>整轮只交换 1 次</b>。`
        : `最小值本来就在位置 ${i}，无需交换。`,
    });
  }

  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 比较: cmps, 交换: swaps }, line: 6,
    say: `完成。比较 <b>${cmps}</b> 次但只交换 <b>${swaps}</b> 次——<b>写操作极少</b>是选择排序唯一的优势。它<b>不稳定</b>。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 插入 */
const insertionGen = (a) => {
  const n = a.length;
  const frames = [];
  let cmps = 0, moves = 0;

  frames.push({ a: [...a], state: a.map((_, k) => (k === 0 ? 'done' : 'idle')), vars: { 比较: 0, 移动: 0 }, line: 0,
    say: '插入排序：像<b>理扑克牌</b>。左边始终是有序区，每次把新牌插到正确位置。' });

  for (let i = 1; i < n; i++) {
    const key = a[i];
    frames.push({
      a: [...a], state: a.map((_, k) => (k < i ? 'done' : k === i ? 'compare' : 'idle')),
      ptrs: { i }, vars: { i, key, 比较: cmps, 移动: moves }, line: 1,
      say: `取出 <code>a[${i}] = ${key}</code> 作为待插入的"牌"。`,
    });

    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      cmps++;
      const s = a.map((_, k) => (k < i ? 'done' : 'idle'));
      s[j] = 'compare';
      frames.push({
        a: [...a], state: s, ptrs: { j }, vars: { i, key, j, 比较: cmps, 移动: moves }, line: 3,
        say: `<code>a[${j}]=${a[j]} &gt; ${key}</code> → 它得往右让一格。`,
      });
      a[j + 1] = a[j];
      moves++;
      j--;
      const s2 = a.map((_, k) => (k < i ? 'done' : 'idle'));
      s2[j + 2] = 'active';
      frames.push({
        a: [...a], state: s2, vars: { i, key, j, 比较: cmps, 移动: moves }, line: 4,
        say: `右移完成。继续和更左边的比较。`,
      });
    }
    if (j >= 0) cmps++;

    a[j + 1] = key;
    frames.push({
      a: [...a], state: a.map((_, k) => (k <= i ? 'done' : 'idle')),
      ptrs: { '插入': { at: j + 1, color: '--viz-done' } },
      vars: { i, key, 比较: cmps, 移动: moves }, line: 5,
      say: `找到位置，把 <b>${key}</b> 放进下标 <code>${j + 1}</code>。左边 ${i + 1} 个元素现在有序。`,
    });
  }

  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 比较: cmps, 移动: moves }, line: 6,
    say: `完成。<b>近乎有序的数据上插入排序极快（接近 O(n)）</b>，这也是它常被用作快排小区间优化的原因。它是<b>稳定</b>的。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 归并 */
const mergeGen = (a0) => {
  const a = [...a0];
  const n = a.length;
  const frames = [];
  let ops = 0;

  frames.push({ a: [...a], state: a.map(() => 'idle'), vars: { 操作: 0 }, line: 0,
    say: '归并排序：<b>分治</b>。先把数组一分为二各自排好，再把两个有序段"拉链式"合并。' });

  const sort = (lo, hi, depth) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;

    frames.push({
      a: [...a],
      state: a.map((_, k) => (k < lo || k > hi ? 'dim' : k <= mid ? 'active' : 'pivot')),
      vars: { 区间: `[${lo},${hi}]`, mid, 深度: depth }, line: 2,
      say: `拆分区间 <code>[${lo}, ${hi}]</code> → 左 <code>[${lo}, ${mid}]</code> ＋ 右 <code>[${mid + 1}, ${hi}]</code>`,
    });

    sort(lo, mid, depth + 1);
    sort(mid + 1, hi, depth + 1);

    // merge
    const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    frames.push({
      a: [...a],
      state: a.map((_, t) => (t < lo || t > hi ? 'dim' : t <= mid ? 'active' : 'pivot')),
      vars: { 合并: `[${lo},${hi}]`, 左: `[${L}]`, 右: `[${R}]` }, line: 4,
      say: `开始合并：左段 <code>[${L}]</code>、右段 <code>[${R}]</code>，两边都已有序。`,
    });

    while (i < L.length && j < R.length) {
      ops++;
      const take = L[i] <= R[j];
      a[k] = take ? L[i++] : R[j++];
      const s = a.map((t, idx) => (idx < lo || idx > hi ? 'dim' : idx < k ? 'done' : 'idle'));
      s[k] = 'active';
      frames.push({
        a: [...a], state: s, ptrs: { k }, vars: { 操作: ops, 写入: a[k] }, line: 5,
        say: `比较两段头部 → 取 <b>${take ? '左' : '右'}</b> 段的 <code>${a[k]}</code> 写入位置 ${k}。<b>相等时优先取左，这保证了稳定性。</b>`,
      });
      k++;
    }
    while (i < L.length) {
      a[k] = L[i++]; ops++;
      const s = a.map((t, idx) => (idx < lo || idx > hi ? 'dim' : idx <= k ? 'done' : 'idle'));
      s[k] = 'active';
      frames.push({ a: [...a], state: s, vars: { 操作: ops }, line: 6, say: `右段已空，把左段剩余的 <code>${a[k]}</code> 直接搬过来。` });
      k++;
    }
    while (j < R.length) {
      a[k] = R[j++]; ops++;
      const s = a.map((t, idx) => (idx < lo || idx > hi ? 'dim' : idx <= k ? 'done' : 'idle'));
      s[k] = 'active';
      frames.push({ a: [...a], state: s, vars: { 操作: ops }, line: 6, say: `左段已空，搬运右段剩余的 <code>${a[k]}</code>。` });
      k++;
    }

    frames.push({
      a: [...a],
      state: a.map((_, t) => (t >= lo && t <= hi ? 'done' : 'idle')),
      vars: { 已排好: `[${lo},${hi}]`, 操作: ops }, line: 7,
      say: `区间 <code>[${lo}, ${hi}]</code> 合并完毕，内部已有序。`,
    });
  };

  sort(0, n - 1, 0);
  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 总操作: ops }, line: 8,
    say: `完成。时间稳定 <code>O(n log n)</code>（无论输入什么样），代价是需要 <code>O(n)</code> 额外空间。<b>稳定排序</b>。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 快排 */
const quickGen = (a0) => {
  const a = [...a0];
  const frames = [];
  let cmps = 0, swaps = 0;

  frames.push({ a: [...a], state: a.map(() => 'idle'), vars: { 比较: 0, 交换: 0 }, line: 0,
    say: '快速排序：选一个<b>基准 pivot</b>，把小的放左边、大的放右边，然后对两边递归。' });

  const sort = (lo, hi) => {
    if (lo >= hi) {
      if (lo === hi) {
        frames.push({
          a: [...a], state: a.map((_, k) => (k === lo ? 'done' : k < lo || k > hi ? 'idle' : 'dim')),
          vars: { 比较: cmps, 交换: swaps }, line: 1,
          say: `区间只剩 1 个元素 <code>a[${lo}]=${a[lo]}</code>，天然有序。`,
        });
      }
      return;
    }

    const pivot = a[hi];
    frames.push({
      a: [...a],
      state: a.map((_, k) => (k < lo || k > hi ? 'idle' : k === hi ? 'pivot' : 'compare')),
      ptrs: { pivot: { at: hi, color: '--viz-pivot' } },
      vars: { 区间: `[${lo},${hi}]`, pivot, 比较: cmps, 交换: swaps }, line: 2,
      say: `处理区间 <code>[${lo}, ${hi}]</code>，选末尾的 <b>${pivot}</b> 作为基准。`,
    });

    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      cmps++;
      const s = a.map((_, k) => (k < lo || k > hi ? 'idle' : k === hi ? 'pivot' : k <= i ? 'active' : 'dim'));
      s[j] = 'compare';
      frames.push({
        a: [...a], state: s, ptrs: { j, i: { at: Math.max(i, lo), color: '--viz-active' } },
        vars: { i, j, pivot, 比较: cmps, 交换: swaps }, line: 4,
        say: `<code>a[${j}]=${a[j]}</code> 与基准 ${pivot} 比较…`,
      });

      if (a[j] < pivot) {
        i++;
        if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; swaps++; }
        const s2 = a.map((_, k) => (k < lo || k > hi ? 'idle' : k === hi ? 'pivot' : k <= i ? 'active' : 'dim'));
        frames.push({
          a: [...a], state: s2, ptrs: { i },
          vars: { i, j, pivot, 比较: cmps, 交换: swaps }, line: 5,
          say: `比基准小 → 换到左区。<b>左区（浅色）里的所有元素都 &lt; ${pivot}</b>。`,
        });
      }
    }

    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    swaps++;
    const p = i + 1;
    frames.push({
      a: [...a],
      state: a.map((_, k) => (k < lo || k > hi ? 'idle' : k === p ? 'done' : 'dim')),
      ptrs: { 基准位: { at: p, color: '--viz-done' } },
      vars: { 基准最终位置: p, 比较: cmps, 交换: swaps }, line: 6,
      say: `把基准换到分界点 <code>${p}</code>。<b>此时 ${pivot} 已经在最终位置上，永不再动。</b>`,
    });

    sort(lo, p - 1);
    sort(p + 1, hi);
  };

  sort(0, a.length - 1);
  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 比较: cmps, 交换: swaps }, line: 8,
    say: `完成。平均 <code>O(n log n)</code> 且常数小，是实践中最快的通用排序。最坏（已排序 + 选末位为基准）会退化到 <code>O(n²)</code>——所以工程实现都会<b>随机化或三数取中</b>。<b>不稳定</b>。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 堆排 */
const heapSortGen = (a0) => {
  const a = [...a0];
  const n = a.length;
  const frames = [];
  let ops = 0;

  frames.push({ a: [...a], state: a.map(() => 'idle'), vars: { 操作: 0 }, line: 0,
    say: '堆排序两步走：① 把数组<b>原地</b>建成大顶堆；② 反复把堆顶（最大值）换到末尾并缩小堆。' });

  const sift = (i, size, phase) => {
    while (true) {
      let big = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      const s = a.map((_, k) => (k >= size ? 'done' : 'idle'));
      s[i] = 'pivot';
      if (l < size) s[l] = 'compare';
      if (r < size) s[r] = 'compare';
      frames.push({
        a: [...a], state: s, ptrs: { 父: { at: i, color: '--viz-pivot' } },
        vars: { 阶段: phase, i, 左: l < size ? a[l] : '-', 右: r < size ? a[r] : '-', 操作: ops }, line: phase === '建堆' ? 2 : 6,
        say: `下沉检查：父 <code>a[${i}]=${a[i]}</code>，子节点 ${l < size ? `<code>${a[l]}</code>` : '无'}${r < size ? ` / <code>${a[r]}</code>` : ''}`,
      });

      if (l < size && a[l] > a[big]) big = l;
      if (r < size && a[r] > a[big]) big = r;
      if (big === i) {
        frames.push({
          a: [...a], state: a.map((_, k) => (k >= size ? 'done' : k === i ? 'active' : 'idle')),
          vars: { 阶段: phase, 操作: ops }, line: phase === '建堆' ? 2 : 6,
          say: '父节点已经不小于任何子节点，<b>下沉结束</b>。',
        });
        break;
      }
      [a[i], a[big]] = [a[big], a[i]];
      ops++;
      frames.push({
        a: [...a], state: a.map((_, k) => (k >= size ? 'done' : k === i || k === big ? 'active' : 'idle')),
        vars: { 阶段: phase, 操作: ops }, line: phase === '建堆' ? 3 : 7,
        say: `子节点更大 → <b>交换</b>，继续往下检查位置 ${big}。`,
      });
      i = big;
    }
  };

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(i, n, '建堆');

  frames.push({ a: [...a], state: a.map(() => 'active'), vars: { 阶段: '建堆完成' }, line: 4,
    say: `大顶堆建好了：<b>每个父节点都 ≥ 它的子节点</b>，所以堆顶 <code>a[0]=${a[0]}</code> 是全局最大值。建堆是 <code>O(n)</code>。` });

  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    ops++;
    frames.push({
      a: [...a], state: a.map((_, k) => (k >= end ? 'done' : k === 0 ? 'active' : 'idle')),
      vars: { 已排好: n - end, 操作: ops }, line: 5,
      say: `把堆顶最大值 <b>${a[end]}</b> 换到末尾位置 ${end}，它<b>已就位</b>。堆大小减到 ${end}。`,
    });
    sift(0, end, '调整');
  }

  frames.push({ a: [...a], state: a.map(() => 'done'), vars: { 总操作: ops }, line: 8,
    say: `完成。时间 <code>O(n log n)</code> 且<b>最坏也是</b>，空间 <code>O(1)</code> 原地排序。缺点：缓存局部性差，实测常慢于快排。<b>不稳定</b>。` });

  return { frames, meta: {} };
};

/* ------------------------------------------------------------ 导出 */

const bubble = makeSortViz({
  title: '冒泡排序：相邻交换，大数上浮',
  gen: bubbleGen,
  pseudo: [
    'for (int i = 0; i < n - 1; ++i) {',
    '  bool swapped = false;',
    '  for (int j = 0; j < n - 1 - i; ++j)',
    '    if (a[j] > a[j+1]) {',
    '      swap(a[j], a[j+1]); swapped = true;',
    '    }',
    '  if (!swapped) break;   // 提前退出',
    '}',
  ],
});

const selection = makeSortViz({
  title: '选择排序：每轮挑一个最小值',
  gen: selectionGen,
  legend: [
    { c: '--viz-pivot', t: '当前最小' },
    { c: '--viz-compare', t: '正在比较' },
    { c: '--viz-done', t: '已就位' },
  ],
  pseudo: [
    'for (int i = 0; i < n - 1; ++i) {',
    '  int mn = i;',
    '  for (int j = i + 1; j < n; ++j)',
    '    if (a[j] < a[mn]) mn = j;',
    '  if (mn != i) swap(a[i], a[mn]);',
    '}',
  ],
});

const insertion = makeSortViz({
  title: '插入排序：像理扑克牌',
  gen: insertionGen,
  pseudo: [
    'for (int i = 1; i < n; ++i) {',
    '  int key = a[i], j = i - 1;',
    '  while (j >= 0 && a[j] > key) {',
    '    a[j + 1] = a[j];   // 右移',
    '    --j;',
    '  }',
    '  a[j + 1] = key;      // 插入',
    '}',
  ],
});

const mergeSort = makeSortViz({
  title: '归并排序：分而治之，拉链合并',
  gen: mergeGen,
  speed: 520,
  legend: [
    { c: '--viz-active', t: '左半段' },
    { c: '--viz-pivot', t: '右半段' },
    { c: '--viz-done', t: '已合并' },
    { c: '--viz-dim', t: '不在当前区间' },
  ],
  pseudo: [
    'void msort(int lo, int hi) {',
    '  if (lo >= hi) return;',
    '  int mid = (lo + hi) / 2;',
    '  msort(lo, mid); msort(mid+1, hi);',
    '  // 合并两个有序段',
    '  while (i < L.size() && j < R.size())',
    '    a[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];',
    '  // 搬运剩余',
    '}',
  ],
});

const quickSort = makeSortViz({
  title: '快速排序：基准划分 + 递归',
  gen: quickGen,
  speed: 560,
  legend: [
    { c: '--viz-pivot', t: '基准 pivot' },
    { c: '--viz-compare', t: '正在比较' },
    { c: '--viz-active', t: '小于基准区' },
    { c: '--viz-done', t: '已就位' },
  ],
  pseudo: [
    'void qsort(int lo, int hi) {',
    '  if (lo >= hi) return;',
    '  int pivot = a[hi], i = lo - 1;',
    '  for (int j = lo; j < hi; ++j)',
    '    if (a[j] < pivot)',
    '      swap(a[++i], a[j]);',
    '  swap(a[i+1], a[hi]);   // 基准归位',
    '  qsort(lo, i); qsort(i+2, hi);',
    '}',
  ],
});

const heapSort = makeSortViz({
  title: '堆排序：建堆 + 反复取最大',
  gen: heapSortGen,
  speed: 560,
  legend: [
    { c: '--viz-pivot', t: '当前父节点' },
    { c: '--viz-compare', t: '子节点' },
    { c: '--viz-active', t: '堆内 / 交换' },
    { c: '--viz-done', t: '已就位' },
  ],
  pseudo: [
    '// ① 建堆：从最后一个非叶节点往前下沉',
    'for (int i = n/2 - 1; i >= 0; --i)',
    '  sift_down(i, n);',
    '',
    '// ② 反复取堆顶',
    'for (int end = n - 1; end > 0; --end) {',
    '  swap(a[0], a[end]);',
    '  sift_down(0, end);',
    '}',
  ],
});

/* ------------------------------------------------------------
   排序算法竞速对比
   ------------------------------------------------------------ */
function sortRace(host) {
  const ALGOS = [
    { n: '冒泡', gen: bubbleGen, c: '--viz-path' },
    { n: '选择', gen: selectionGen, c: '--viz-compare' },
    { n: '插入', gen: insertionGen, c: '--viz-pivot' },
    { n: '归并', gen: mergeGen, c: '--viz-visited' },
    { n: '快排', gen: quickGen, c: '--viz-active' },
    { n: '堆排', gen: heapSortGen, c: '--viz-done' },
  ];

  let base = randArr(10, 5, 95);

  const build = () => {
    const runs = ALGOS.map((al) => {
      const r = al.gen([...base]);
      return { ...al, frames: r.frames };
    });
    const maxLen = Math.max(...runs.map((r) => r.frames.length));
    const frames = [];
    for (let t = 0; t < maxLen; t++) {
      frames.push({
        t,
        runs: runs.map((r) => ({
          n: r.n, c: r.c,
          f: r.frames[Math.min(t, r.frames.length - 1)],
          fin: t >= r.frames.length - 1,
          total: r.frames.length,
        })),
        say: t === 0
          ? '同一份数据，六种排序<b>同时开跑</b>。每一"帧"代表一次可观察的操作步骤。'
          : t === maxLen - 1
          ? `全部完成。步数：${runs.map((r) => `${r.n} <b>${r.frames.length}</b>`).join(' · ')}。步数差距直观反映了量级差异。`
          : `第 ${t + 1} 步。已完成的算法会停在原地：${runs.filter((r) => t >= r.frames.length - 1).map((r) => r.n).join('、') || '暂无'}`,
      });
    }
    return { frames, meta: {} };
  };

  return new Player({
    title: '六种排序同时开跑',
    badge: '竞速对比',
    speed: 200,
    controls(bar, rebuild) {
      const rnd = el('button', 'vbtn', '换一组随机数据');
      rnd.onclick = () => { base = randArr(10, 5, 95); rebuild(); };
      const rev = el('button', 'vbtn', '逆序数据（最坏情况）');
      rev.onclick = () => { base = randArr(10, 5, 95).sort((a, b) => b - a); rebuild(); };
      const srt = el('button', 'vbtn', '近乎有序数据');
      srt.onclick = () => {
        base = randArr(10, 5, 95).sort((a, b) => a - b);
        const i = Math.floor(Math.random() * 8);
        [base[i], base[i + 1]] = [base[i + 1], base[i]];
        rebuild();
      };
      bar.append(rnd, rev, srt);
    },
    build,
    draw(stage, f) {
      const cols = 3;
      const cellW = 190, cellH = 108;
      const rows = Math.ceil(f.runs.length / cols);
      const W = cols * cellW, H = rows * cellH;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 640), style: 'max-width:100%;height:auto' });

      f.runs.forEach((r, idx) => {
        const cx = (idx % cols) * cellW, cy = Math.floor(idx / cols) * cellH;
        const data = r.f.a || [];
        const maxV = Math.max(...data, 1);
        const bw = Math.floor((cellW - 24) / data.length);
        const bh = 62;

        svg.appendChild(svgEl('text', {
          x: cx + 12, y: cy + 12, 'font-size': 11, 'text-anchor': 'start',
          fill: r.fin ? 'var(--viz-done)' : `var(${r.c})`, 'font-weight': 700,
          'font-family': 'var(--font-sans)',
        }, `${r.n}${r.fin ? ' ✓' : ''}`));
        svg.appendChild(svgEl('text', {
          x: cx + cellW - 12, y: cy + 12, 'font-size': 9.5, 'text-anchor': 'end', class: 'lbl',
        }, `${Math.min(f.t + 1, r.total)}/${r.total} 步`));

        data.forEach((v, k) => {
          const h = Math.max(3, (v / maxV) * bh);
          const st = (r.f.state && r.f.state[k]) || 'idle';
          svg.appendChild(svgEl('rect', {
            class: `v-bar s-${r.fin ? 'done' : st}`,
            x: cx + 12 + k * bw, y: cy + 22 + (bh - h),
            width: Math.max(2, bw - 2), height: h, rx: 2,
          }));
        });
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

export const VIZ = {
  'sort-bubble': bubble,
  'sort-selection': selection,
  'sort-insertion': insertion,
  'sort-merge': mergeSort,
  'sort-quick': quickSort,
  'sort-heap': heapSort,
  'sort-race': sortRace,
};
