/* ============================================================
   基础类动画：内存模型、指针、调用栈、复杂度、二分、双指针、滑窗
   ============================================================ */

import {
  Player, svgEl, el, drawArray, setStage, randArr, parseNums,
} from './engine.js';

/* ------------------------------------------------------------
   1. 内存布局：栈 / 堆 / 全局区
   ------------------------------------------------------------ */
function memoryLayout(host) {
  const SEGS = [
    { n: '栈 Stack', d: '局部变量、函数参数、返回地址', c: '--viz-active', dir: '向下增长', ex: 'int x = 42;' },
    { n: '堆 Heap', d: 'new / malloc 动态分配', c: '--viz-visited', dir: '向上增长', ex: 'new int(7)' },
    { n: '全局/静态区', d: '全局变量、static 变量', c: '--viz-compare', dir: '固定', ex: 'static int g;' },
    { n: '常量区', d: '字符串字面量、const 数据', c: '--viz-pivot', dir: '只读', ex: '"hello"' },
    { n: '代码区 Text', d: '编译后的机器指令', c: '--viz-done', dir: '只读', ex: 'main() 的指令' },
  ];

  const frames = [
    { hl: -1, say: 'C++ 程序运行时，内存被划分成几个区域。点<b>下一步</b>逐个了解。' },
    ...SEGS.map((s, i) => ({
      hl: i,
      say: `<b>${s.n}</b>：${s.d}。增长方向：${s.dir}。例：<code>${s.ex}</code>`,
    })),
    { hl: -1, say: '关键区别：<b>栈</b>由编译器自动管理、速度快但空间小（通常 1–8MB）；<b>堆</b>手动管理、灵活但需自己释放，忘了就是内存泄漏。' },
  ];

  return new Player({
    title: '程序运行时的内存分区',
    badge: '内存模型',
    speed: 1400,
    build: () => ({ frames, meta: {} }),
    draw(stage, f) {
      const W = 480, rowH = 46, gap = 8;
      const H = SEGS.length * (rowH + gap) + 24;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 560), style: 'max-width:100%;height:auto' });

      SEGS.forEach((s, i) => {
        const y = 12 + i * (rowH + gap);
        const on = f.hl === i;
        svg.appendChild(svgEl('rect', {
          class: 'v-cell', x: 90, y, width: 300, height: rowH, rx: 9,
          fill: on ? `var(${s.c})` : 'var(--viz-idle)',
          opacity: f.hl >= 0 && !on ? 0.35 : 1,
        }));
        svg.appendChild(svgEl('text', {
          x: 240, y: y + rowH / 2 - 7, 'font-size': 12.5, 'font-weight': 700,
          fill: on ? '#06131F' : 'var(--viz-idle-fg)',
        }, s.n));
        svg.appendChild(svgEl('text', {
          x: 240, y: y + rowH / 2 + 10, 'font-size': 10,
          fill: on ? '#06131F' : 'var(--fg-muted)', 'font-family': 'var(--font-sans)',
        }, s.d));

        // 地址标注
        svg.appendChild(svgEl('text', {
          x: 82, y: y + rowH / 2, 'font-size': 9.5, class: 'lbl', 'text-anchor': 'end',
        }, i === 0 ? '高地址 ↑' : i === SEGS.length - 1 ? '低地址 ↓' : ''));

        if (on) {
          svg.appendChild(svgEl('text', {
            x: 400, y: y + rowH / 2, 'font-size': 10, class: 'lbl', 'text-anchor': 'start',
          }, s.dir));
        }
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   2. 指针与引用：地址、解引用、指针运算
   ------------------------------------------------------------ */
function pointerBasics(host) {
  const frames = [
    { boxes: [{ n: 'x', v: 10, a: '0x1000', s: 'active' }], say: '声明 <code>int x = 10;</code> — 在栈上分配 4 字节，地址假设为 <code>0x1000</code>。' },
    { boxes: [{ n: 'x', v: 10, a: '0x1000', s: 'idle' }, { n: 'p', v: '0x1000', a: '0x1008', s: 'active', ptr: 0 }],
      say: '<code>int* p = &x;</code> — <code>p</code> 本身也是变量，它存的<b>值</b>是 x 的地址。' },
    { boxes: [{ n: 'x', v: 10, a: '0x1000', s: 'compare' }, { n: 'p', v: '0x1000', a: '0x1008', s: 'active', ptr: 0 }],
      say: '<code>*p</code> 表示「顺着 p 存的地址找过去」，读到的就是 <b>x</b> 的值 <code>10</code>。' },
    { boxes: [{ n: 'x', v: 99, a: '0x1000', s: 'done' }, { n: 'p', v: '0x1000', a: '0x1008', s: 'active', ptr: 0 }],
      say: '<code>*p = 99;</code> — 通过指针写入，<b>x 真的变成了 99</b>。这就是指针能"远程修改"的原因。' },
    { boxes: [{ n: 'x', v: 99, a: '0x1000', s: 'done', ref: 'r' }, { n: 'p', v: '0x1000', a: '0x1008', s: 'idle', ptr: 0 }],
      say: '<code>int& r = x;</code> — 引用不是新变量，它<b>就是 x 的别名</b>，编译后通常没有独立存储。' },
    { boxes: [{ n: 'x', v: 99, a: '0x1000', s: 'idle', ref: 'r' }, { n: 'p', v: 'nullptr', a: '0x1008', s: 'compare', ptr: -1 }],
      say: '<code>p = nullptr;</code> — 指针<b>可以</b>重新指向别处或置空；引用一旦绑定<b>永远不能改</b>。' },
  ];

  return new Player({
    title: '指针存的是地址，引用是别名',
    badge: '指针',
    speed: 1600,
    legend: [
      { c: '--viz-active', t: '当前操作' },
      { c: '--viz-compare', t: '被读取' },
      { c: '--viz-done', t: '被修改' },
    ],
    pseudo: [
      'int  x = 10;      // 普通变量',
      'int* p = &x;      // p 保存 x 的地址',
      'int  v = *p;      // 解引用：读到 10',
      '*p = 99;          // 通过指针写入',
      'int& r = x;       // 引用：x 的别名',
      'p = nullptr;      // 指针可改指向',
    ],
    build: () => ({ frames: frames.map((f, i) => ({ ...f, line: i })), meta: {} }),
    draw(stage, f) {
      const W = 520, H = 190;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 620), style: 'max-width:100%;height:auto' });
      const bw = 130, bh = 54;

      f.boxes.forEach((b, i) => {
        const x = 60 + i * 220, y = 60;
        svg.appendChild(svgEl('rect', { class: `v-cell s-${b.s}`, x, y, width: bw, height: bh, rx: 9 }));
        svg.appendChild(svgEl('text', { x: x + bw / 2, y: y + bh / 2, 'font-size': 15, 'font-weight': 700 }, String(b.v)));
        // 变量名
        svg.appendChild(svgEl('text', {
          x: x + bw / 2, y: y - 14, 'font-size': 12.5, fill: 'var(--fg)', 'font-weight': 700,
        }, b.n + (b.ref ? ` / ${b.ref}` : '')));
        // 地址
        svg.appendChild(svgEl('text', {
          x: x + bw / 2, y: y + bh + 15, 'font-size': 10, class: 'lbl',
        }, `地址 ${b.a}`));

        if (b.ref) {
          svg.appendChild(svgEl('text', {
            x: x + bw / 2, y: y + bh + 30, 'font-size': 9.5, fill: 'var(--violet)',
          }, `${b.ref} 是同一块内存的别名`));
        }
      });

      // 指针箭头
      const pb = f.boxes.find((b) => b.ptr !== undefined);
      if (pb && pb.ptr >= 0) {
        const from = 60 + 1 * 220, to = 60 + bw;
        svg.appendChild(svgEl('path', {
          class: 'v-arrow',
          d: `M${from} 40 C ${from - 40} 6, ${to - 40} 6, ${to} 40`,
          stroke: 'var(--viz-active)', 'stroke-width': 2.2, fill: 'none',
          'marker-end': 'none',
        }));
        svg.appendChild(svgEl('path', {
          d: `M${to} 40 l7 -7 l1 9 z`, fill: 'var(--viz-active)',
        }));
        svg.appendChild(svgEl('text', {
          x: (from + to) / 2, y: 14, 'font-size': 10, fill: 'var(--viz-active)', 'font-weight': 700,
        }, '指向'));
      } else if (pb) {
        svg.appendChild(svgEl('text', {
          x: 60 + 220 + bw / 2, y: 30, 'font-size': 10, fill: 'var(--viz-compare)', 'font-weight': 700,
        }, '不指向任何对象'));
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   3. 函数调用栈
   ------------------------------------------------------------ */
function callStack(host) {
  const frames = [
    { st: [{ n: 'main()', v: 'n=3' }], say: '程序从 <code>main</code> 开始，为它创建一个<b>栈帧</b>。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3', s: 'active' }], say: '调用 <code>fact(3)</code> — 新栈帧压入栈顶，参数 <code>n=3</code> 保存在其中。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3' }, { n: 'fact(2)', v: 'n=2', s: 'active' }], say: '<code>fact(3)</code> 需要 <code>fact(2)</code> 的结果，继续压栈。<b>每层都有自己独立的 n</b>。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3' }, { n: 'fact(2)', v: 'n=2' }, { n: 'fact(1)', v: 'n=1', s: 'active' }], say: '再压一层。栈深度 = 递归深度，太深会 <b>栈溢出（stack overflow）</b>。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3' }, { n: 'fact(2)', v: 'n=2' }, { n: 'fact(1)', v: 'n=1', s: 'done', r: '返回 1' }], say: '<code>n==1</code> 触碰<b>递归出口</b>，返回 <code>1</code>，这一帧即将销毁。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3' }, { n: 'fact(2)', v: 'n=2', s: 'done', r: '2×1 = 2' }], say: '栈帧弹出，控制权回到 <code>fact(2)</code>：<code>2 × 1 = 2</code>。' },
    { st: [{ n: 'main()', v: 'n=3' }, { n: 'fact(3)', v: 'n=3', s: 'done', r: '3×2 = 6' }], say: '继续回溯：<code>3 × 2 = 6</code>。' },
    { st: [{ n: 'main()', v: 'n=3', s: 'done', r: '得到 6' }], say: '所有递归帧已弹出，<code>main</code> 拿到最终结果 <b>6</b>。这就是递归的"回来的路"。' },
  ];

  return new Player({
    title: '递归 fact(3) 的调用栈变化',
    badge: '调用栈',
    speed: 1300,
    pseudo: [
      'int fact(int n) {',
      '  if (n <= 1) return 1;   // 出口',
      '  return n * fact(n - 1); // 递推',
      '}',
    ],
    build: () => ({
      frames: frames.map((f, i) => ({ ...f, line: i <= 3 ? 2 : i === 4 ? 1 : 2 })),
      meta: {},
    }),
    draw(stage, f) {
      const W = 400, fh = 40, gap = 6;
      const H = 5 * (fh + gap) + 40;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 480), style: 'max-width:100%;height:auto' });

      svg.appendChild(svgEl('text', { x: 200, y: 12, 'font-size': 10, class: 'lbl' }, '栈顶（后进先出）↑'));

      f.st.forEach((fr, i) => {
        const y = H - 24 - (i + 1) * (fh + gap);
        const s = fr.s || 'idle';
        svg.appendChild(svgEl('rect', { class: `v-cell s-${s}`, x: 70, y, width: 260, height: fh, rx: 8 }));
        svg.appendChild(svgEl('text', {
          x: 130, y: y + fh / 2, 'font-size': 12.5, 'font-weight': 700, 'text-anchor': 'middle',
        }, fr.n));
        svg.appendChild(svgEl('text', {
          x: 270, y: y + fh / 2, 'font-size': 11, 'text-anchor': 'middle',
          fill: s === 'idle' ? 'var(--fg-muted)' : '#06131F',
        }, fr.r || fr.v));
      });

      svg.appendChild(svgEl('line', {
        x1: 60, y1: H - 20, x2: 340, y2: H - 20, stroke: 'var(--border-strong)', 'stroke-width': 2,
      }));
      svg.appendChild(svgEl('text', { x: 200, y: H - 8, 'font-size': 10, class: 'lbl' }, '栈底'));

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   4. 复杂度增长曲线对比
   ------------------------------------------------------------ */
function complexityCurve(host) {
  const FNS = [
    { k: 'O(1)',        f: () => 1,                         c: '--viz-done' },
    { k: 'O(log n)',    f: (n) => Math.log2(n + 1),         c: '--viz-active' },
    { k: 'O(n)',        f: (n) => n,                        c: '--viz-pivot' },
    { k: 'O(n log n)',  f: (n) => n * Math.log2(n + 1),     c: '--viz-compare' },
    { k: 'O(n²)',       f: (n) => n * n,                    c: '--viz-path' },
    { k: 'O(2ⁿ)',       f: (n) => Math.pow(2, Math.min(n, 40)), c: '--viz-visited' },
  ];

  const frames = [];
  for (let show = 1; show <= FNS.length; show++) {
    frames.push({
      show,
      say: show === 1
        ? '<b>O(1)</b>：常数时间，输入再大也不变。数组按下标取值、哈希表查询都属于这一类。'
        : show === 2
        ? '<b>O(log n)</b>：每次砍掉一半。n = 十亿时也只要约 30 步——二分查找的威力。'
        : show === 3
        ? '<b>O(n)</b>：线性扫描一遍。绝大多数「遍历」都是这个量级。'
        : show === 4
        ? '<b>O(n log n)</b>：排序的理论下界（基于比较）。比 O(n) 慢，但依然可用于百万级数据。'
        : show === 5
        ? '<b>O(n²)</b>：嵌套双层循环。n = 10⁴ 时约 10⁸ 次操作，已经开始吃力。'
        : '<b>O(2ⁿ)</b>：指数爆炸。n = 40 就超过一万亿次——除了小规模枚举，实际不可用。',
    });
  }
  frames.push({
    show: FNS.length,
    say: '结论：算法选择的核心不是"少写几行"，而是<b>让曲线尽可能平</b>。数据规模一大，常数优化敌不过量级差异。',
  });

  return new Player({
    title: '常见复杂度的增长速度',
    badge: '复杂度',
    speed: 1700,
    build: () => ({ frames, meta: {} }),
    draw(stage, f) {
      const W = 560, H = 300, pad = 42;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 640), style: 'max-width:100%;height:auto' });

      const N = 32;
      const maxY = 320;
      const px = (n) => pad + (n / N) * (W - pad * 2 - 70);
      const py = (v) => H - pad - Math.min(v / maxY, 1) * (H - pad * 2);

      // 网格
      for (let i = 0; i <= 4; i++) {
        const y = pad + ((H - pad * 2) / 4) * i;
        svg.appendChild(svgEl('line', {
          x1: pad, y1: y, x2: W - pad - 70, y2: y,
          stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '3 4',
        }));
      }
      // 轴
      svg.appendChild(svgEl('line', { x1: pad, y1: H - pad, x2: W - pad - 70, y2: H - pad, stroke: 'var(--border-strong)', 'stroke-width': 1.5 }));
      svg.appendChild(svgEl('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: 'var(--border-strong)', 'stroke-width': 1.5 }));
      svg.appendChild(svgEl('text', { x: (W - 70) / 2, y: H - 14, 'font-size': 10.5, class: 'lbl' }, '输入规模 n →'));
      svg.appendChild(svgEl('text', { x: 14, y: pad + 4, 'font-size': 10.5, class: 'lbl', transform: `rotate(-90 14 ${H / 2})` }, '操作次数'));

      FNS.slice(0, f.show).forEach((fn, i) => {
        let d = '';
        for (let n = 1; n <= N; n++) {
          const v = fn.f(n);
          d += `${n === 1 ? 'M' : 'L'}${px(n).toFixed(1)} ${py(v).toFixed(1)} `;
        }
        const isLast = i === f.show - 1;
        svg.appendChild(svgEl('path', {
          d, fill: 'none', stroke: `var(${fn.c})`,
          'stroke-width': isLast ? 3 : 1.8,
          opacity: isLast ? 1 : 0.5,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          class: 'v-edge',
        }));

        // 图例
        const ly = pad + i * 21;
        svg.appendChild(svgEl('rect', {
          x: W - 76, y: ly - 5, width: 11, height: 3, rx: 1.5, fill: `var(${fn.c})`,
          opacity: isLast ? 1 : 0.5,
        }));
        svg.appendChild(svgEl('text', {
          x: W - 60, y: ly - 3, 'font-size': 10.5, 'text-anchor': 'start',
          fill: isLast ? `var(${fn.c})` : 'var(--fg-muted)',
          'font-weight': isLast ? 700 : 400,
        }, fn.k));
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   5. 二分查找
   ------------------------------------------------------------ */
function binarySearch(host, opts = {}) {
  let arr = opts.data || [3, 8, 12, 17, 23, 29, 34, 41, 47, 55, 62, 70];
  let target = opts.target ?? 41;

  const build = () => {
    const a = [...arr].sort((x, y) => x - y);
    const frames = [];
    let lo = 0, hi = a.length - 1, found = -1;

    frames.push({
      state: a.map(() => 'idle'),
      ptrs: { L: 0, R: a.length - 1 },
      vars: { lo: 0, hi: a.length - 1, mid: '-' },
      line: 0,
      say: `在有序数组中查找 <b>${target}</b>。初始区间 <code>[0, ${a.length - 1}]</code>。`,
    });

    let guard = 0;
    while (lo <= hi && guard++ < 40) {
      const mid = lo + ((hi - lo) >> 1);
      const st = a.map((_, i) => (i < lo || i > hi ? 'dim' : 'idle'));
      st[mid] = 'pivot';

      frames.push({
        state: st, ptrs: { L: lo, R: hi, mid: { at: mid, color: '--viz-pivot' } },
        vars: { lo, hi, mid: { v: mid, hot: true } }, line: 2,
        say: `取中点 <code>mid = ${mid}</code>，值为 <b>${a[mid]}</b>。区间长度 ${hi - lo + 1}。`,
      });

      if (a[mid] === target) {
        const st2 = a.map((_, i) => (i === mid ? 'done' : 'dim'));
        frames.push({
          state: st2, ptrs: { mid: { at: mid, color: '--viz-done' } },
          vars: { lo, hi, mid }, line: 3,
          say: `<b>${a[mid]} == ${target}</b>，命中！返回下标 <code>${mid}</code>。`,
        });
        found = mid;
        break;
      }

      if (a[mid] < target) {
        frames.push({
          state: a.map((_, i) => (i <= mid || i > hi ? 'dim' : 'idle')),
          ptrs: { L: mid + 1, R: hi }, vars: { lo: mid + 1, hi, mid }, line: 4,
          say: `<code>${a[mid]} &lt; ${target}</code> → 目标在<b>右半边</b>，令 <code>lo = mid + 1 = ${mid + 1}</code>。左半 ${mid - lo + 1} 个元素被一次排除。`,
        });
        lo = mid + 1;
      } else {
        frames.push({
          state: a.map((_, i) => (i >= mid || i < lo ? 'dim' : 'idle')),
          ptrs: { L: lo, R: mid - 1 }, vars: { lo, hi: mid - 1, mid }, line: 5,
          say: `<code>${a[mid]} &gt; ${target}</code> → 目标在<b>左半边</b>，令 <code>hi = mid - 1 = ${mid - 1}</code>。`,
        });
        hi = mid - 1;
      }
    }

    if (found < 0) {
      frames.push({
        state: a.map(() => 'dim'), vars: { lo, hi, mid: '-' }, line: 6,
        say: `区间已空（<code>lo=${lo} &gt; hi=${hi}</code>），数组中<b>不存在</b> ${target}，返回 -1。`,
      });
    } else {
      frames.push({
        state: a.map((_, i) => (i === found ? 'done' : 'dim')),
        ptrs: { ans: { at: found, color: '--viz-done' } },
        vars: { 结果: found, 比较次数: frames.filter((f) => f.line === 2).length }, line: 3,
        say: `完成。共比较 <b>${frames.filter((f) => f.line === 2).length}</b> 次；线性查找平均需要 ${Math.round(a.length / 2)} 次。`,
      });
    }

    return { frames, meta: { a } };
  };

  return new Player({
    title: '二分查找：每一步砍掉一半',
    badge: '二分',
    speed: 1200,
    legend: [
      { c: '--viz-pivot', t: '中点 mid' },
      { c: '--viz-done', t: '命中' },
      { c: '--viz-dim', t: '已排除' },
    ],
    vars: true,
    pseudo: [
      'int lo = 0, hi = n - 1;',
      'while (lo <= hi) {',
      '  int mid = lo + (hi - lo) / 2;',
      '  if (a[mid] == target) return mid;',
      '  else if (a[mid] < target) lo = mid + 1;',
      '  else                      hi = mid - 1;',
      '}  return -1;',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'text';
      inp.value = arr.join(', ');
      inp.setAttribute('aria-label', '数组');
      const tg = el('input');
      tg.type = 'number';
      tg.value = target;
      tg.setAttribute('aria-label', '目标值');

      const apply = () => {
        arr = parseNums(inp.value, arr).sort((a, b) => a - b);
        inp.value = arr.join(', ');
        target = Number(tg.value) || target;
        rebuild();
      };

      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      tg.onkeydown = (e) => e.key === 'Enter' && apply();

      const rnd = el('button', 'vbtn', '随机');
      rnd.onclick = () => {
        arr = [...new Set(randArr(12, 1, 90))].sort((a, b) => a - b);
        inp.value = arr.join(', ');
        target = arr[Math.floor(Math.random() * arr.length)];
        tg.value = target;
        rebuild();
      };

      bar.append(mkLabel('有序数组', inp), mkLabel('查找', tg), btn, rnd);
    },
    build,
    draw(stage, f, meta) {
      setStage(stage, drawArray({ data: meta.a, state: f.state, ptrs: f.ptrs }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   6. 双指针（对撞：两数之和）
   ------------------------------------------------------------ */
function twoPointers(host, opts = {}) {
  let arr = opts.data || [2, 5, 9, 13, 18, 24, 31, 40];
  let target = opts.target ?? 37;

  const build = () => {
    const a = [...arr].sort((x, y) => x - y);
    const frames = [];
    let i = 0, j = a.length - 1;

    frames.push({
      state: a.map(() => 'idle'), ptrs: { i: 0, j: a.length - 1 },
      vars: { i: 0, j: a.length - 1, sum: '-', target }, line: 0,
      say: `在<b>有序</b>数组中找两个数使其和为 <b>${target}</b>。左右各放一个指针。`,
    });

    let guard = 0;
    let ok = false;
    while (i < j && guard++ < 40) {
      const s = a[i] + a[j];
      const st = a.map((_, k) => (k === i || k === j ? 'compare' : k < i || k > j ? 'dim' : 'idle'));
      frames.push({
        state: st, ptrs: { i, j },
        vars: { i, j, sum: { v: s, hot: true }, target }, line: 2,
        say: `<code>a[${i}] + a[${j}] = ${a[i]} + ${a[j]} = ${s}</code>`,
      });

      if (s === target) {
        frames.push({
          state: a.map((_, k) => (k === i || k === j ? 'done' : 'dim')),
          ptrs: { i, j }, vars: { i, j, sum: s, target }, line: 3,
          say: `<b>找到了</b>：下标 (${i}, ${j})，值 (${a[i]}, ${a[j]})。总共只扫描了 ${guard} 次。`,
        });
        ok = true;
        break;
      }
      if (s < target) {
        frames.push({
          state: st, ptrs: { i: i + 1, j },
          vars: { i: i + 1, j, sum: s, target }, line: 4,
          say: `和 <b>偏小</b>（${s} &lt; ${target}）。数组升序，所以只能让左指针右移变大：<code>i++</code>。`,
        });
        i++;
      } else {
        frames.push({
          state: st, ptrs: { i, j: j - 1 },
          vars: { i, j: j - 1, sum: s, target }, line: 5,
          say: `和 <b>偏大</b>（${s} &gt; ${target}）。让右指针左移变小：<code>j--</code>。`,
        });
        j--;
      }
    }

    if (!ok) {
      frames.push({
        state: a.map(() => 'dim'), vars: { i, j, target }, line: 6,
        say: `两指针相遇，<b>不存在</b>和为 ${target} 的组合。整个过程是 <code>O(n)</code>，比双层循环的 O(n²) 快得多。`,
      });
    }

    return { frames, meta: { a } };
  };

  return new Player({
    title: '对撞双指针：有序数组的两数之和',
    badge: '双指针',
    speed: 1150,
    legend: [
      { c: '--viz-compare', t: '当前一对' },
      { c: '--viz-done', t: '答案' },
      { c: '--viz-dim', t: '已排除' },
    ],
    vars: true,
    pseudo: [
      'int i = 0, j = n - 1;',
      'while (i < j) {',
      '  int s = a[i] + a[j];',
      '  if (s == target) return {i, j};',
      '  else if (s < target) ++i;   // 需要更大',
      '  else                 --j;   // 需要更小',
      '}  return {-1, -1};',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'text';
      inp.value = arr.join(', ');
      const tg = el('input');
      tg.type = 'number';
      tg.value = target;
      const apply = () => {
        arr = parseNums(inp.value, arr).sort((a, b) => a - b);
        inp.value = arr.join(', ');
        target = Number(tg.value) || target;
        rebuild();
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      tg.onkeydown = (e) => e.key === 'Enter' && apply();
      bar.append(mkLabel('有序数组', inp), mkLabel('目标和', tg), btn);
    },
    build,
    draw(stage, f, meta) {
      setStage(stage, drawArray({ data: meta.a, state: f.state, ptrs: f.ptrs }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   7. 滑动窗口（最长无重复子串）
   ------------------------------------------------------------ */
function slidingWindow(host, opts = {}) {
  let str = opts.str || 'abcabcbb';

  const build = () => {
    const s = str.split('');
    const frames = [];
    const seen = new Map();
    let left = 0, best = 0, bestL = 0, bestR = -1;

    frames.push({
      state: s.map(() => 'idle'), ptrs: {},
      vars: { left: 0, right: '-', 窗口长: 0, 最长: 0 }, line: 0,
      say: `求 <code>"${str}"</code> 的<b>最长无重复字符子串</b>。窗口 <code>[left, right]</code> 始终保持无重复。`,
    });

    for (let right = 0; right < s.length; right++) {
      const ch = s[right];
      const st = s.map((_, k) => (k >= left && k <= right ? 'active' : 'idle'));
      st[right] = 'compare';

      frames.push({
        state: st, ptrs: { L: left, R: right },
        vars: { left, right, 字符: ch, 最长: best }, line: 1,
        say: `右指针扩到 <code>${right}</code>，纳入字符 <b>'${ch}'</b>。`,
      });

      if (seen.has(ch) && seen.get(ch) >= left) {
        const dup = seen.get(ch);
        const st2 = s.map((_, k) => (k >= left && k <= right ? 'active' : 'idle'));
        st2[dup] = 'path';
        st2[right] = 'path';
        frames.push({
          state: st2, ptrs: { L: left, R: right },
          vars: { left, right, 重复于: dup, 最长: best }, line: 2,
          say: `<b>'${ch}' 在窗口内重复了</b>（位置 ${dup}）。必须收缩左边界。`,
        });
        left = dup + 1;
        frames.push({
          state: s.map((_, k) => (k >= left && k <= right ? 'active' : 'idle')),
          ptrs: { L: left, R: right },
          vars: { left: { v: left, hot: true }, right, 最长: best }, line: 3,
          say: `左指针直接跳到 <code>${left}</code>（重复位置 + 1），而不是一格格挪——这是滑窗的效率关键。`,
        });
      }

      seen.set(ch, right);
      const len = right - left + 1;
      if (len > best) {
        best = len; bestL = left; bestR = right;
        frames.push({
          state: s.map((_, k) => (k >= left && k <= right ? 'done' : 'idle')),
          ptrs: { L: left, R: right },
          vars: { left, right, 窗口长: { v: len, hot: true }, 最长: len }, line: 5,
          say: `当前窗口 <code>"${str.slice(left, right + 1)}"</code> 长度 <b>${len}</b>，刷新最长记录。`,
        });
      }
    }

    frames.push({
      state: s.map((_, k) => (k >= bestL && k <= bestR ? 'done' : 'dim')),
      ptrs: {},
      vars: { 答案: best, 子串: str.slice(bestL, bestR + 1) }, line: 6,
      say: `结束。最长无重复子串是 <code>"${str.slice(bestL, bestR + 1)}"</code>，长度 <b>${best}</b>。每个字符最多进出窗口一次，总复杂度 <code>O(n)</code>。`,
    });

    return { frames, meta: { s } };
  };

  return new Player({
    title: '滑动窗口：最长无重复字符子串',
    badge: '滑动窗口',
    speed: 1050,
    legend: [
      { c: '--viz-active', t: '窗口内' },
      { c: '--viz-compare', t: '新加入' },
      { c: '--viz-path', t: '重复冲突' },
      { c: '--viz-done', t: '最优窗口' },
    ],
    vars: true,
    pseudo: [
      'unordered_map<char,int> last;  int left = 0, best = 0;',
      'for (int right = 0; right < n; ++right) {',
      '  char c = s[right];',
      '  if (last.count(c) && last[c] >= left)',
      '      left = last[c] + 1;      // 跳跃收缩',
      '  last[c] = right;',
      '  best = max(best, right - left + 1);',
      '}',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'text';
      inp.value = str;
      inp.maxLength = 20;
      const apply = () => {
        const v = inp.value.trim();
        if (v) { str = v; rebuild(); }
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      bar.append(mkLabel('字符串', inp), btn);
    },
    build,
    draw(stage, f, meta) {
      setStage(stage, drawArray({ data: meta.s, state: f.state, ptrs: f.ptrs, cell: 42 }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   8. 数组 vs 链表：插入代价对比
   ------------------------------------------------------------ */
function arrayVsList(host) {
  const A = [10, 20, 30, 40, 50];
  const frames = [
    { mode: 'both', hlA: [], hlL: [], say: '在<b>下标 1</b> 处插入新元素 <code>99</code>。看两种结构分别付出什么代价。' },
    { mode: 'arr', hlA: [4], say: '数组：先把最后一个元素 <code>50</code> 往后挪一格。' },
    { mode: 'arr', hlA: [3, 4], say: '继续挪 <code>40</code>…' },
    { mode: 'arr', hlA: [2, 3, 4], say: '继续挪 <code>30</code>…' },
    { mode: 'arr', hlA: [1, 2, 3, 4], say: '再挪 <code>20</code>。<b>为插入 1 个元素，移动了 4 个</b>。' },
    { mode: 'arr', hlA: [1], ins: true, say: '终于腾出位置写入 <code>99</code>。数组插入是 <b>O(n)</b>。' },
    { mode: 'list', hlL: [0], say: '链表：先找到位置 1 的<b>前驱节点</b>（这里是第 0 个）。' },
    { mode: 'list', hlL: [0], newNode: true, say: '创建新节点 <code>99</code>。' },
    { mode: 'list', hlL: [0, 1], newNode: true, link: 1, say: '新节点的 next 指向原来的第 1 个节点。' },
    { mode: 'list', linked: true, say: '前驱的 next 改指新节点。<b>只改了 2 个指针</b>，插入本身是 <code>O(1)</code>。' },
    { mode: 'both', done: true, say: '但注意：链表<b>找到</b>那个位置需要 O(n) 遍历；数组按下标访问才是 O(1)。<b>两者各有各的"快"和"慢"。</b>' },
  ];

  return new Player({
    title: '数组 vs 链表：中间插入的代价',
    badge: '对比',
    speed: 1350,
    build: () => ({ frames, meta: {} }),
    draw(stage, f) {
      const W = 620, H = 210;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 720), style: 'max-width:100%;height:auto' });
      const cw = 52, gap = 6;

      const dimArr = f.mode === 'list';
      const dimList = f.mode === 'arr';

      // --- 数组 ---
      svg.appendChild(svgEl('text', {
        x: 14, y: 20, 'font-size': 11.5, 'text-anchor': 'start',
        fill: dimArr ? 'var(--fg-muted)' : 'var(--sky)', 'font-weight': 700, 'font-family': 'var(--font-sans)',
      }, '数组 vector — 连续内存'));

      const arrData = f.done || f.ins ? [10, 99, 20, 30, 40, 50] : A;
      arrData.forEach((v, k) => {
        const x = 14 + k * (cw + gap), y = 32;
        const hot = (f.hlA || []).includes(k);
        const isNew = (f.ins || f.done) && k === 1;
        svg.appendChild(svgEl('rect', {
          class: `v-cell s-${isNew ? 'done' : hot ? 'compare' : 'idle'}`,
          x, y, width: cw, height: 40, rx: 7,
          opacity: dimArr ? 0.32 : 1,
        }));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + 20, 'font-size': 13 }, String(v)));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + 52, 'font-size': 9.5, class: 'lbl' }, `[${k}]`));
        if (hot) {
          svg.appendChild(svgEl('text', { x: x + cw / 2, y: y - 8, 'font-size': 10, fill: 'var(--viz-compare)', 'font-weight': 700 }, '→挪'));
        }
      });

      // --- 链表 ---
      const listY = 132;
      svg.appendChild(svgEl('text', {
        x: 14, y: listY - 14, 'font-size': 11.5, 'text-anchor': 'start',
        fill: dimList ? 'var(--fg-muted)' : 'var(--violet)', 'font-weight': 700, 'font-family': 'var(--font-sans)',
      }, 'list — 离散节点 + 指针'));

      const nodes = f.linked || f.done ? [10, 99, 20, 30, 40, 50] : A;
      const nw = 46, ngap = 30;
      nodes.forEach((v, k) => {
        const isIns = (f.linked || f.done) && k === 1;
        const x = 14 + k * (nw + ngap), y = listY;
        const hot = (f.hlL || []).includes(k);
        svg.appendChild(svgEl('rect', {
          class: `v-node s-${isIns ? 'done' : hot ? 'compare' : 'idle'}`,
          x, y, width: nw, height: 36, rx: 7,
          opacity: dimList ? 0.32 : 1,
        }));
        svg.appendChild(svgEl('text', { x: x + nw / 2, y: y + 18, 'font-size': 12.5 }, String(v)));
        if (k < nodes.length - 1) {
          svg.appendChild(svgEl('path', {
            d: `M${x + nw + 3} ${y + 18} H${x + nw + ngap - 7}`,
            stroke: isIns || (f.link === 1 && k === 1) ? 'var(--viz-done)' : 'var(--border-strong)',
            'stroke-width': 1.8, fill: 'none', class: 'v-arrow',
            opacity: dimList ? 0.32 : 1,
          }));
          svg.appendChild(svgEl('path', {
            d: `M${x + nw + ngap - 7} ${y + 18} l-5 -3.5 v7 z`,
            fill: 'var(--border-strong)', opacity: dimList ? 0.32 : 1,
          }));
        }
      });

      // 悬浮的新节点
      if (f.newNode) {
        const x = 14 + 1 * (nw + ngap) + 8;
        svg.appendChild(svgEl('rect', {
          class: 'v-node s-done v-pop', x, y: listY - 46, width: nw, height: 36, rx: 7,
        }));
        svg.appendChild(svgEl('text', { x: x + nw / 2, y: listY - 28, 'font-size': 12.5 }, '99'));
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ---------- 工具 ---------- */
function mkLabel(text, inputEl) {
  const l = document.createElement('label');
  l.appendChild(document.createTextNode(text));
  l.appendChild(inputEl);
  return l;
}

export const VIZ = {
  'memory-layout': memoryLayout,
  'pointer-basics': pointerBasics,
  'call-stack': callStack,
  'complexity-curve': complexityCurve,
  'binary-search': binarySearch,
  'two-pointers': twoPointers,
  'sliding-window': slidingWindow,
  'array-vs-list': arrayVsList,
};
