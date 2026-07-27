/* ============================================================
   数据结构动画：vector 扩容 · 栈 · 循环队列 · 哈希表 · 链表 · deque
   ============================================================ */

import {
  Player, svgEl, el, drawNodes, setStage, parseNums,
} from './engine.js';

/* ---------- 小工具 ---------- */
function mkLabel(text, inputEl) {
  const l = document.createElement('label');
  l.appendChild(document.createTextNode(text));
  l.appendChild(inputEl);
  return l;
}

/* ------------------------------------------------------------
   1. vector-growth：push_back 触发扩容（申请→搬移→释放）
   ------------------------------------------------------------ */
function vectorGrowth(host, opts = {}) {
  let pushes = Math.min(12, Math.max(3, opts.pushes || 7));

  const build = () => {
    const frames = [];
    let cap = 2, gen = 0, copies = 0;
    const vals = [];
    const addrOf = (g) => `0x${(g + 1).toString(16).toUpperCase()}000`;
    const V = () => ({ size: vals.length, capacity: cap, 累计搬移: copies });

    frames.push({
      old: { addr: addrOf(0), cap, vals: [], state: [] }, neo: null,
      vars: V(), line: 0,
      say: 'vector 的本质：<b>堆上一段连续内存</b> + 两个数字 size/capacity。初始容量 2。连续内存才能按下标 O(1) 随机访问。',
    });

    for (let k = 1; k <= pushes && frames.length < 76; k++) {
      const x = k;
      if (vals.length === cap) {
        frames.push({
          old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map(() => 'compare') }, neo: null,
          vars: { ...V(), size: { v: vals.length, hot: true } }, line: 1,
          say: `要 push <code>${x}</code>，但 <code>size == capacity（${cap}）</code>。旧内存右边的地址<b>可能已被别的对象占用</b>，不能原地扩——只能整体搬家。`,
        });
        const ncap = cap * 2;
        frames.push({
          old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map(() => 'idle') },
          neo: { addr: addrOf(gen + 1), cap: ncap, vals: [], state: [] },
          vars: { ...V(), 新容量: ncap }, line: [2, 3],
          say: `① 申请一块 <b>2 倍</b>大的新内存（容量 ${ncap}）。为什么翻倍而不是 +1？<b>翻倍才能把搬移成本摊薄成均摊 O(1)</b>；每次 +1 会退化成 O(n²)。`,
        });
        for (let i = 0; i < vals.length; i++) {
          copies++;
          frames.push({
            old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map((_, t) => (t < i ? 'dim' : t === i ? 'active' : 'idle')) },
            neo: { addr: addrOf(gen + 1), cap: ncap, vals: vals.slice(0, i + 1), state: vals.slice(0, i + 1).map((_, t) => (t === i ? 'active' : 'done')) },
            vars: V(), line: 4,
            say: `② 搬移第 ${i + 1}/${vals.length} 个元素 <code>${vals[i]}</code>（逐个拷贝构造）。<b>这一次扩容要付出 O(size) 的代价</b>。`,
          });
        }
        frames.push({
          old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map(() => 'dim'), freed: true },
          neo: { addr: addrOf(gen + 1), cap: ncap, vals: [...vals], state: vals.map(() => 'done') },
          vars: { ...V(), capacity: { v: ncap, hot: true } }, line: 5,
          say: `③ <code>delete[]</code> 旧内存，指针指向新地址 ${addrOf(gen + 1)}。<b>此前保存的所有指针、引用、迭代器全部悬空失效</b>——这就是「扩容导致迭代器失效」。`,
        });
        cap = ncap; gen++;
      }
      vals.push(x);
      frames.push({
        old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map((_, t) => (t === vals.length - 1 ? 'active' : 'done')) },
        neo: null, vars: V(), line: 7,
        say: `写入 <code>d[${vals.length - 1}] = ${x}</code>，size 变为 ${vals.length}。容量未满时 push_back 只是一次写入，<b>严格 O(1)</b>。`,
      });
    }

    frames.push({
      old: { addr: addrOf(gen), cap, vals: [...vals], state: vals.map(() => 'done') },
      neo: null, vars: { ...V(), 均摊拷贝: (copies / pushes).toFixed(2) }, line: 8,
      say: `push ${pushes} 次，总共只搬移了 <b>${copies}</b> 次元素。平均每次 push 摊到 ${(copies / pushes).toFixed(2)} 次拷贝——虽然个别 push 是 O(n)，<b>均摊下来仍是 O(1)</b>。`,
    });

    return { frames, meta: {} };
  };

  return new Player({
    title: 'vector 扩容：申请 2 倍 → 搬移 → 释放',
    badge: 'vector',
    speed: 1100,
    vars: true,
    legend: [
      { c: '--viz-active', t: '正在写入/搬移' },
      { c: '--viz-compare', t: '容量已满' },
      { c: '--viz-done', t: '已在新内存' },
      { c: '--viz-dim', t: '旧数据/已释放' },
    ],
    pseudo: [
      'void push_back(const T& x) {',
      '  if (size == capacity) {            // 满了',
      '    size_t ncap = capacity * 2;      // 翻倍',
      '    T* nd = new T[ncap];             // ① 申请新内存',
      '    for (i = 0; i < size; ++i) nd[i] = d[i]; // ② 搬移',
      '    delete[] d; d = nd; capacity = ncap;     // ③ 释放旧的',
      '  }',
      '  d[size++] = x;                     // 写入末尾',
      '}  // 均摊 O(1)',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'number';
      inp.min = 3; inp.max = 12;
      inp.value = pushes;
      inp.setAttribute('aria-label', 'push 次数');
      const apply = () => {
        pushes = Math.min(12, Math.max(3, Number(inp.value) || pushes));
        inp.value = pushes;
        rebuild();
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      const more = el('button', 'vbtn', '再 push 一次');
      more.onclick = () => {
        pushes = Math.min(12, pushes + 1);
        inp.value = pushes;
        rebuild();
      };
      bar.append(mkLabel('连续 push 次数', inp), btn, more);
    },
    build,
    draw(stage, f) {
      const rows = [f.old, f.neo].filter(Boolean);
      const capMax = Math.max(...rows.map((r) => r.cap));
      const cw = Math.max(28, Math.min(46, Math.floor(540 / capMax)));
      const gap = 4, step = cw + gap, ox = 14;
      const rowH = cw + 44;
      const W = Math.min(640, ox * 2 + capMax * step);
      const H = rows.length * rowH + 14;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 680), style: 'max-width:100%;height:auto' });

      rows.forEach((r, ri) => {
        const y = 30 + ri * rowH;
        svg.appendChild(svgEl('text', {
          x: ox, y: y - 12, 'font-size': 11, 'text-anchor': 'start', 'font-weight': 700,
          fill: r.freed ? 'var(--viz-path)' : ri === 0 && f.neo ? 'var(--fg-muted)' : 'var(--primary)',
          'font-family': 'var(--font-sans)',
        }, r.freed ? `旧内存 ${r.addr} —— 已 delete[]，迭代器悬空` : `${f.neo ? (ri === 0 ? '旧内存 ' : '新内存 ') : '堆内存 '}${r.addr}（容量 ${r.cap}）`));

        for (let i = 0; i < r.cap; i++) {
          const x = ox + i * step;
          const g = svgEl('g');
          if (i < r.vals.length) {
            g.appendChild(svgEl('rect', {
              class: `v-cell s-${r.state[i] || 'idle'}`,
              x, y, width: cw, height: cw, rx: 6,
              opacity: r.freed ? 0.38 : 1,
            }));
            g.appendChild(svgEl('text', { x: x + cw / 2, y: y + cw / 2, 'font-size': Math.min(14, cw * 0.42) }, String(r.vals[i])));
          } else {
            g.appendChild(svgEl('rect', {
              x, y, width: cw, height: cw, rx: 6,
              fill: 'none', stroke: 'var(--border)', 'stroke-dasharray': '4 3',
            }));
          }
          g.appendChild(svgEl('text', { x: x + cw / 2, y: y + cw + 11, 'font-size': 9, class: 'lbl' }, String(i)));
          svg.appendChild(g);
        }
        if (!r.freed && r.vals.length < r.cap) {
          svg.appendChild(svgEl('text', {
            x: ox + r.vals.length * step + cw / 2, y: y + cw + 24, 'font-size': 9.5, class: 'lbl',
          }, '↑ 下个空位'));
        }
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   2. stack-ops：竖直栈 + 括号匹配
   ------------------------------------------------------------ */
function stackOps(host, opts = {}) {
  let str = (opts.str || '({[]})').slice(0, 10);
  const OPEN = { '(': ')', '[': ']', '{': '}' };
  const CLOSE = { ')': '(', ']': '[', '}': '{' };

  const build = () => {
    const s = str.split('');
    const frames = [];
    const stk = [];
    const snap = (chIdx, stState, say, line, extra = {}) => {
      frames.push({
        chars: [...s], chIdx,
        stack: stk.map((c) => ({ ...c })),
        stState,
        vars: { 已读: chIdx < 0 ? 0 : chIdx + 1, 栈深: stk.length },
        say, line, ...extra,
      });
    };

    snap(-1, null, `用栈判断 <code>"${str}"</code> 的括号是否匹配。核心直觉：<b>最晚打开的括号必须最早闭合</b>——这正是栈的 LIFO（后进先出）。`, 0);
    snap(-1, null, '规则只有两条：遇<b>开括号</b>就 push；遇<b>闭括号</b>就与栈顶配对，配上则 pop，配不上立即失败。栈顶永远是「最近还没闭合的那个」。', 1);
    snap(-1, null, '为什么不用计数器？因为 <code>([)]</code> 里各种括号数量都平衡，却是非法的——<b>必须记住嵌套顺序</b>，而栈恰好按顺序记住一切未完成的事。', 2);

    let ok = true, failAt = -1;
    for (let i = 0; i < s.length && frames.length < 68; i++) {
      const ch = s[i];
      if (OPEN[ch]) {
        stk.push({ ch, at: i });
        snap(i, { top: 'active' }, `读到开括号 <code>'${ch}'</code> → <b>push 入栈</b>（O(1)，只动栈顶）。它在等待自己的 <code>'${OPEN[ch]}'</code>。`, 3);
      } else if (CLOSE[ch]) {
        if (!stk.length) {
          ok = false; failAt = i;
          snap(i, null, `读到闭括号 <code>'${ch}'</code>，先看栈里有没有开括号在等它……`, 4);
          snap(i, { all: 'path' }, `<b>栈是空的</b>——没有任何开括号在等它，匹配失败。`, 5, { fail: true });
          break;
        }
        const top = stk[stk.length - 1];
        snap(i, { top: 'compare' }, `读到闭括号 <code>'${ch}'</code>，与栈顶 <code>'${top.ch}'</code> 比较：闭括号<b>只能</b>匹配最近未闭合的那个开括号。`, 6);
        if (OPEN[top.ch] === ch) {
          const popped = stk.pop();
          snap(i, { pop: popped.ch }, `<code>'${popped.ch}'</code> 与 <code>'${ch}'</code> 配对成功 → <b>pop 出栈</b>。一对括号就此闭合。`, 6);
        } else {
          ok = false; failAt = i;
          snap(i, { top: 'path' }, `栈顶是 <code>'${top.ch}'</code>，期待 <code>'${OPEN[top.ch]}'</code> 却来了 <code>'${ch}'</code> → <b>交叉嵌套，非法</b>。`, 7, { fail: true });
          break;
        }
      } else {
        snap(i, null, `<code>'${ch}'</code> 不是括号，跳过。`, 2);
      }
    }

    if (ok && stk.length) {
      ok = false;
      failAt = s.length - 1;
      snap(s.length - 1, null, `所有字符都读完了。判定条件是最后一问：<b>栈空了吗？</b>`, 8);
      snap(s.length - 1, { all: 'path' }, `没有——栈里还剩 <b>${stk.length}</b> 个开括号（${stk.map((c) => `'${c.ch}'`).join('、')}）没等到闭合 → 匹配失败。`, 8, { fail: true });
    } else if (ok) {
      snap(s.length - 1, { empty: true }, `扫描结束且<b>栈恰好为空</b> → <code>"${str}"</code> 完全匹配。`, 8, { win: true });
    }

    frames.push({
      chars: [...s], chIdx: ok ? s.length - 1 : failAt,
      stack: stk.map((c) => ({ ...c })),
      stState: ok ? { empty: true } : { all: 'path' },
      vars: { 结论: ok ? '匹配' : '不匹配' }, line: 8, [ok ? 'win' : 'fail']: true,
      say: ok
        ? '每个字符只进出栈一次 → <b>O(n) 时间，O(n) 空间</b>。凡是「最近的未完成事项要最先处理」的问题（函数调用、撤销、表达式求值），栈都是天然答案。'
        : '结论：<b>不匹配</b>。注意栈的报错是「立即的」——一发现交叉嵌套或多余括号就能停，不必读完全部输入。',
    });

    // 输入极短时补充教学帧，保证节奏完整（防守：最多补 4 帧）
    const epilogue = [
      '补充：<code>push/pop/top</code> 全是 <b>O(1)</b>——栈只在一端操作，永远不用挪动其他元素。',
      '同一模式随处可见：函数调用栈、编辑器 Ctrl+Z 撤销、浏览器后退、表达式求值——<b>都是 LIFO</b>。',
      '若只有一种括号，一个计数器就够了；<b>多种括号的嵌套顺序</b>才是非用栈不可的原因。',
      '试试上方输入 <code>([)]</code>（交叉嵌套）或 <code>((()</code>（缺闭合），观察两种失败方式的区别。',
    ];
    let ei = 0;
    while (frames.length < 10 && ei < epilogue.length) {
      const last = frames[frames.length - 1];
      frames.push({ ...last, say: epilogue[ei++], line: 9 });
    }

    return { frames, meta: {} };
  };

  return new Player({
    title: '栈与括号匹配：最晚打开，最早闭合',
    badge: '栈 LIFO',
    speed: 1150,
    vars: true,
    legend: [
      { c: '--viz-active', t: 'push 入栈' },
      { c: '--viz-compare', t: '与栈顶比较' },
      { c: '--viz-done', t: '配对成功' },
      { c: '--viz-path', t: '不匹配' },
    ],
    pseudo: [
      'bool valid(string s) {',
      '  stack<char> st;',
      '  for (char c : s) {',
      '    if (c==\'(\' || c==\'[\' || c==\'{\') st.push(c);',
      '    else {',
      '      if (st.empty()) return false;',
      '      if (match(st.top(), c)) st.pop();',
      '      else return false;   // 交叉嵌套',
      '  } }  return st.empty();',
      '}',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'text';
      inp.maxLength = 10;
      inp.value = str;
      inp.setAttribute('aria-label', '括号串');
      const apply = () => {
        const v = inp.value.trim();
        if (v) { str = v.slice(0, 10); inp.value = str; rebuild(); }
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      const b1 = el('button', 'vbtn', '({[]})');
      b1.onclick = () => { str = '({[]})'; inp.value = str; rebuild(); };
      const b2 = el('button', 'vbtn', '([)]');
      b2.onclick = () => { str = '([)]'; inp.value = str; rebuild(); };
      const b3 = el('button', 'vbtn', '((()');
      b3.onclick = () => { str = '((()'; inp.value = str; rebuild(); };
      bar.append(mkLabel('括号串', inp), btn, b1, b2, b3);
    },
    build,
    draw(stage, f) {
      const W = 560, H = 240;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 620), style: 'max-width:100%;height:auto' });

      /* 左侧：输入串 */
      const cw = Math.min(34, Math.floor(300 / Math.max(f.chars.length, 1)));
      svg.appendChild(svgEl('text', { x: 14, y: 18, 'font-size': 11, 'text-anchor': 'start', class: 'lbl' }, '输入串（逐字符扫描）'));
      f.chars.forEach((ch, k) => {
        const x = 14 + k * (cw + 4), y = 30;
        let st = 'idle';
        if (k < f.chIdx) st = 'dim';
        else if (k === f.chIdx) st = f.fail ? 'path' : f.win ? 'done' : 'compare';
        svg.appendChild(svgEl('rect', { class: `v-cell s-${st}`, x, y, width: cw, height: cw, rx: 6 }));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + cw / 2, 'font-size': 14 }, ch));
      });
      if (f.chIdx >= 0 && f.chIdx < f.chars.length) {
        const x = 14 + f.chIdx * (cw + 4) + cw / 2;
        svg.appendChild(svgEl('path', { class: 'v-ptr', d: `M${x} ${30 + cw + 6} l-5 8 h10 z`, fill: 'var(--viz-compare)' }));
      }

      /* 右侧：竖直栈（深栈时自动压缩格高） */
      const sx = 400, sw = 96, gap = 4;
      const baseY = H - 26;
      const slots = f.stack.length + 1; // 留一格给弹出动画
      const sh = Math.max(14, Math.min(30, Math.floor((baseY - 44) / Math.max(slots, 1)) - gap));
      svg.appendChild(svgEl('text', { x: sx + sw / 2, y: 18, 'font-size': 11, class: 'lbl' }, '栈（顶在上）'));
      // 栈壁
      svg.appendChild(svgEl('path', {
        d: `M${sx - 8} ${34} V${baseY + 6} H${sx + sw + 8} V${34}`,
        fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 2,
      }));

      const ss = f.stState || {};
      f.stack.forEach((c, k) => {
        const y = baseY - (k + 1) * (sh + gap) + gap;
        const isTop = k === f.stack.length - 1;
        let st = 'visited';
        if (ss.all === 'path') st = 'path';
        else if (isTop && ss.top) st = ss.top;
        svg.appendChild(svgEl('rect', { class: `v-cell s-${st}${isTop && ss.top === 'active' ? ' v-pop' : ''}`, x: sx, y, width: sw, height: sh, rx: 6 }));
        svg.appendChild(svgEl('text', { x: sx + sw / 2, y: y + sh / 2, 'font-size': 14 }, c.ch));
        if (isTop) {
          svg.appendChild(svgEl('text', { x: sx - 16, y: y + sh / 2, 'font-size': 10, fill: 'var(--primary)', 'font-weight': 700, 'text-anchor': 'end' }, 'top →'));
        }
      });

      // 刚弹出的元素
      if (ss.pop) {
        const y = baseY - (f.stack.length + 1) * (sh + gap) - 6;
        svg.appendChild(svgEl('rect', { class: 'v-cell s-done v-pop', x: sx + 14, y, width: sw - 28, height: sh, rx: 6 }));
        svg.appendChild(svgEl('text', { x: sx + sw / 2, y: y + sh / 2, 'font-size': 13 }, `${ss.pop} 弹出`));
      }
      if (!f.stack.length && (ss.empty || f.win)) {
        svg.appendChild(svgEl('text', { x: sx + sw / 2, y: baseY - 20, 'font-size': 11, fill: 'var(--viz-done)', 'font-weight': 700 }, '栈空 = 全部配对'));
      } else if (!f.stack.length) {
        svg.appendChild(svgEl('text', { x: sx + sw / 2, y: baseY - 20, 'font-size': 10.5, class: 'lbl' }, '（空）'));
      }

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   3. queue-circular：循环队列（牺牲一格法）
   ------------------------------------------------------------ */
function queueCircular(host) {
  const CAP = 6; // 实际可存 CAP-1 个

  const build = () => {
    const frames = [];
    const buf = Array(CAP).fill(null);
    let front = 0, rear = 0;
    const size = () => (rear - front + CAP) % CAP;

    const snap = (say, line, hl = {}, extra = {}) => {
      frames.push({
        buf: [...buf], front, rear, hl,
        vars: {
          front, rear, size: size(),
          判空: `front==rear? ${front === rear ? '是' : '否'}`,
          判满: `(rear+1)%${CAP}==front? ${(rear + 1) % CAP === front ? '是' : '否'}`,
        },
        say, line, ...extra,
      });
    };

    snap(`环形数组容量 ${CAP}，但<b>故意只存 ${CAP - 1} 个</b>（牺牲一格）。为什么？若允许存满，「队空」和「队满」时都有 <code>front == rear</code>，<b>无法区分</b>。`, 0);

    const enq = (v) => {
      if ((rear + 1) % CAP === front) {
        snap(`想入队 <code>${v}</code>，但 <code>(rear+1)%${CAP} == front</code> → <b>队满</b>，拒绝。rear 指着的这格必须留空当哨兵——它就是被牺牲的那一格。`, 4, { cell: rear, state: 'path' });
        return;
      }
      buf[rear] = v;
      snap(`入队 <code>${v}</code>：写入 <code>buf[rear=${rear}]</code>。队尾只进不出，像排队的末尾。`, 5, { cell: rear, state: 'active' });
      rear = (rear + 1) % CAP;
      snap(`<code>rear = (rear+1) % ${CAP} = ${rear}</code>。<b>取模让指针走到末尾后绕回 0</b>——数组"卷"成了环，空间循环复用。`, 5, { cell: rear, state: 'compare', ring: true });
    };
    const deq = () => {
      if (front === rear) {
        snap('想出队，但 <code>front == rear</code> → <b>队空</b>，拒绝。', 9, {});
        return;
      }
      const v = buf[front];
      snap(`出队：取出 <code>buf[front=${front}] = ${v}</code>。队头只出不进——先进先出（FIFO）。`, 10, { cell: front, state: 'done' });
      buf[front] = null;
      front = (front + 1) % CAP;
      snap(`<code>front = (front+1) % ${CAP} = ${front}</code>。旧格子空出来，<b>之后 rear 绕一圈还能重用它</b>——这就是环形的意义：不用像普通数组那样整体前挪 O(n)。`, 10, { ring: true });
    };

    // 脚本：入 3 → 出 2 → 连入 4（63 时 rear 回绕到 0）→ 入 90 触发队满 → 出 1
    [10, 22, 35].forEach(enq);
    deq(); deq();
    [47, 51, 63, 78].forEach(enq);
    enq(90); // (rear+1)%6 == front → 队满被拒
    deq();
    snap(`最终 size = ${size()}。入队/出队都只动一个指针，<b>严格 O(1)</b>；代价仅仅是牺牲 1 格空间。`, 11, {}, { fin: true });

    return { frames, meta: {} };
  };

  return new Player({
    title: '循环队列：取模回绕 + 牺牲一格判满',
    badge: '队列 FIFO',
    speed: 1200,
    vars: true,
    legend: [
      { c: '--viz-active', t: '入队写入' },
      { c: '--viz-done', t: '出队取出' },
      { c: '--viz-compare', t: '指针新位置' },
      { c: '--viz-path', t: '队满拒绝' },
    ],
    pseudo: [
      'int buf[N], front = 0, rear = 0;   // N=6，实存 N-1',
      'bool empty() { return front == rear; }',
      'bool full()  { return (rear+1) % N == front; }',
      'bool push(int x) {',
      '  if (full()) return false;',
      '  buf[rear] = x; rear = (rear+1) % N;',
      '  return true;',
      '}',
      'bool pop(int& x) {',
      '  if (empty()) return false;',
      '  x = buf[front]; front = (front+1) % N;',
      '  return true;  // 全部 O(1)',
      '}',
    ],
    build,
    draw(stage, f) {
      const W = 600, H = 300;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 640), style: 'max-width:100%;height:auto' });
      const cx = 180, cy = 150, R = 82, cw = 40;
      const angOf = (i) => (i / CAP) * Math.PI * 2 - Math.PI / 2;

      // 环形布局：CAP 个格子（下标顺时针）
      for (let i = 0; i < CAP; i++) {
        const ang = angOf(i);
        const x = cx + Math.cos(ang) * R - cw / 2;
        const y = cy + Math.sin(ang) * R - cw / 2;
        const v = f.buf[i];
        let st = v === null ? 'idle' : 'visited';
        if (f.hl && f.hl.cell === i && f.hl.state) st = f.hl.state;
        if (f.fin && v !== null) st = 'done';

        svg.appendChild(svgEl('rect', { class: `v-cell s-${st}`, x, y, width: cw, height: cw, rx: 8, opacity: v === null && st === 'idle' ? 0.55 : 1 }));
        svg.appendChild(svgEl('text', { x: x + cw / 2, y: y + cw / 2, 'font-size': 13 }, v === null ? '·' : String(v)));
        // 下标（放在环内侧）
        svg.appendChild(svgEl('text', {
          x: cx + Math.cos(ang) * 52, y: cy + Math.sin(ang) * 52,
          'font-size': 10, class: 'lbl',
        }, `[${i}]`));
      }

      // 中心：回绕公式
      svg.appendChild(svgEl('text', {
        x: cx, y: cy, 'font-size': 10.5,
        fill: f.hl && f.hl.ring ? 'var(--viz-compare)' : 'var(--fg-muted)',
        'font-weight': f.hl && f.hl.ring ? 700 : 400,
      }, '(i+1) % 6 回绕'));

      // front / rear：色块徽标 + 指向格子的小三角
      const ptr = (idx, label, color) => {
        const ang = angOf(idx);
        const bx = cx + Math.cos(ang) * 126;
        const by = cy + Math.sin(ang) * 126;
        const tx2 = cx + Math.cos(ang) * 106;
        const ty2 = cy + Math.sin(ang) * 106;
        // 指向格子的三角
        const a1 = ang + Math.PI * 0.88, a2 = ang - Math.PI * 0.88;
        svg.appendChild(svgEl('path', {
          class: 'v-ptr',
          d: `M${tx2 - Math.cos(ang) * 8} ${ty2 - Math.sin(ang) * 8} L${tx2 - Math.cos(a1) * 8} ${ty2 - Math.sin(a1) * 8} L${tx2 - Math.cos(a2) * 8} ${ty2 - Math.sin(a2) * 8} z`,
          fill: `var(${color})`,
        }));
        const bw2 = label.length > 5 ? 74 : 44;
        svg.appendChild(svgEl('rect', {
          class: 'v-ptr', x: bx - bw2 / 2, y: by - 9, width: bw2, height: 18, rx: 9, fill: `var(${color})`,
        }));
        svg.appendChild(svgEl('text', { x: bx, y: by, 'font-size': 10, 'font-weight': 700, fill: '#06131F' }, label));
      };
      if (f.front === f.rear) {
        ptr(f.front, 'front=rear', '--viz-pivot');
      } else {
        ptr(f.front, 'front', '--viz-done');
        ptr(f.rear, 'rear', '--viz-active');
      }

      // 右侧文字面板
      const tx = 400;
      svg.appendChild(svgEl('text', { x: tx, y: 66, 'font-size': 11.5, 'text-anchor': 'start', 'font-weight': 700, fill: 'var(--fg)', 'font-family': 'var(--font-sans)' }, '规则'));
      [
        ['队空：front == rear', '--fg-muted'],
        ['队满：(rear+1)%6 == front', '--fg-muted'],
        ['入队：写 rear，再 rear+1', '--fg-muted'],
        ['出队：读 front，再 front+1', '--fg-muted'],
        ['永远牺牲 1 格作哨兵', '--accent'],
      ].forEach(([t, c], i) => {
        svg.appendChild(svgEl('text', { x: tx, y: 90 + i * 22, 'font-size': 10.5, 'text-anchor': 'start', fill: `var(${c})`, 'font-family': 'var(--font-sans)' }, t));
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   4. hash-table：取模散列 + 链地址 + rehash
   ------------------------------------------------------------ */
function hashTable(host, opts = {}) {
  let keys = (opts.keys || [12, 25, 37, 8, 41, 29]).slice(0, 8);

  const build = () => {
    const frames = [];
    let B = 4;
    let buckets = Array.from({ length: B }, () => []);
    let n = 0;

    const snap = (say, line, hl = {}, extra = {}) => {
      frames.push({
        B, buckets: buckets.map((b) => [...b]), hl,
        vars: { 元素数: n, 桶数: B, '负载因子α': (n / B).toFixed(2), ...extra.vars },
        say, line, ...extra,
      });
    };

    snap(`哈希表 = 数组 + 哈希函数。<code>hash(key) % ${B}</code> 把任意 key 映射到某个桶下标，<b>一步定位，不用挨个找</b>——这是平均 O(1) 的来源。`, 0);

    for (const k of keys) {
      if (frames.length > 66) break;
      const h = k % B;
      snap(`插入 <b>${k}</b>：计算 <code>${k} % ${B} = ${h}</code> → 落入 ${h} 号桶。`, 2, { bucket: h, calc: k });
      const chain = buckets[h];
      if (chain.length) {
        snap(`${h} 号桶已被 <code>${chain.join(' → ')}</code> 占用——<b>哈希冲突</b>。不同 key 完全可能算出同一下标。`, 3, { bucket: h, conflict: true, key: k });
        chain.push(k);
        n++;
        snap(`<b>链地址法</b>：把 ${k} 挂到该桶链表末尾。冲突不丢数据，但这条链上的查找退化成线性扫描——<b>最坏所有 key 挤一条链，就是 O(n)</b>。`, 4, { bucket: h, newIdx: chain.length - 1 });
      } else {
        chain.push(k);
        n++;
        snap(`${h} 号桶为空，${k} 直接放入。查找它时同样一步到位。`, 4, { bucket: h, newIdx: 0 });
      }

      if (n / B >= 1.0 && B < 8 && frames.length < 60) {
        snap(`负载因子 <code>α = ${n}/${B} = ${(n / B).toFixed(2)} ≥ 1.0</code>。链条开始变长，O(1) 快守不住了 → <b>触发 rehash</b>。`, 5, { alarm: true, vars: { 'α阈值': '1.0' } });
        const NB = B * 2;
        const nb = Array.from({ length: NB }, () => []);
        const all = buckets.flat();
        for (const x of all) nb[x % NB].push(x);
        const moved = all.filter((x) => x % NB !== x % B);
        B = NB;
        buckets = nb;
        snap(`桶数翻倍到 <b>${B}</b>，所有 ${n} 个 key 用 <code>key % ${B}</code> <b>重新计算、全部搬家</b>（如 ${moved.length ? moved.map((x) => `${x}→${x % B}号`).join('、') : '部分留在原桶'}）。这次搬迁是 O(n)，但和 vector 扩容同理，<b>均摊后插入仍是 O(1)</b>。`, 6, { rehashed: true });
      }
    }

    snap(`完成：${n} 个 key、${B} 个桶，α = ${(n / B).toFixed(2)}。<b>平均 O(1)</b> 靠两件事：哈希函数散得开 + 负载因子压得低；两者任一失守就滑向 <b>O(n)</b>。`, 8, { fin: true });

    // key 很少时补齐教学帧（防守：最多补 5 帧）
    const extra = [
      '查找与插入同路：<code>hash(key) % B</code> 定桶，再沿链比对。链短则近似 <b>O(1)</b>，链长则退化为线性。',
      '最坏情况：所有 key 哈希到同一个桶（可被恶意构造），整表退化成一条链表 → <b>O(n)</b>。',
      'rehash 是「一次付清」的大账单：单次 O(n)，但翻倍策略保证它足够稀疏，<b>均摊到每次插入仍是 O(1)</b>。',
      '这就是 <code>unordered_map</code> 的原理；代价是元素<b>无序</b>、且 rehash 时迭代器失效。',
      '与红黑树的 <code>map</code>（稳定 O(log n)、有序）相比：<b>只要不需要顺序，哈希表通常是更快的默认选择</b>。',
      '试试上方按「全冲突」按钮：所有 key 都是 4 的倍数，对 4 取模全部撞进同一个桶。',
    ];
    let xi = 0;
    while (frames.length < 10 && xi < extra.length) {
      const last = frames[frames.length - 1];
      frames.push({ ...last, say: extra[xi++], line: 8 });
    }

    return { frames, meta: {} };
  };

  return new Player({
    title: '哈希表：取模定桶 · 冲突挂链 · 超载翻倍',
    badge: '哈希表',
    speed: 1350,
    vars: true,
    legend: [
      { c: '--viz-active', t: '新插入' },
      { c: '--viz-compare', t: '定位的桶' },
      { c: '--viz-path', t: '冲突/超载' },
      { c: '--viz-done', t: 'rehash 完成' },
    ],
    pseudo: [
      'void insert(int key) {',
      '  // 哈希函数：任意 key → [0, B)',
      '  int h = key % B;',
      '  // 冲突：不同 key 同一桶',
      '  bucket[h].push_back(key);  ++n;',
      '  if ((double)n / B >= 1.0) {   // 负载因子超阈值',
      '    B *= 2; 所有元素按 key % B 重新入桶;  // rehash',
      '  }',
      '}  // 平均 O(1)，最坏 O(n)',
    ],
    controls(bar, rebuild) {
      const inp = el('input');
      inp.type = 'text';
      inp.value = keys.join(', ');
      inp.setAttribute('aria-label', '插入的 key');
      const apply = () => {
        keys = parseNums(inp.value, keys).map((x) => Math.abs(Math.round(x)) % 100).slice(0, 8);
        inp.value = keys.join(', ');
        rebuild();
      };
      const btn = el('button', 'vbtn', '应用');
      btn.onclick = apply;
      inp.onkeydown = (e) => e.key === 'Enter' && apply();
      const bad = el('button', 'vbtn', '全冲突');
      bad.onclick = () => { keys = [4, 8, 12, 16, 20]; inp.value = keys.join(', '); rebuild(); };
      bar.append(mkLabel('依次插入', inp), btn, bad);
    },
    build,
    draw(stage, f) {
      const rowH = 40, bw = 44, nw = 40, gap = 10;
      const W = 560;
      const H = f.B * rowH + 34;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 620), style: 'max-width:100%;height:auto' });
      const hl = f.hl || {};

      // 顶部：hash 计算展示
      if (hl.calc !== undefined) {
        svg.appendChild(svgEl('text', {
          x: W / 2, y: 14, 'font-size': 12, fill: 'var(--viz-compare)', 'font-weight': 700,
        }, `hash(${hl.calc}) = ${hl.calc} % ${f.B} = ${hl.calc % f.B}`));
      } else if (hl.alarm) {
        svg.appendChild(svgEl('text', { x: W / 2, y: 14, 'font-size': 12, fill: 'var(--viz-path)', 'font-weight': 700 }, '负载因子超标，rehash！'));
      } else if (hl.rehashed) {
        svg.appendChild(svgEl('text', { x: W / 2, y: 14, 'font-size': 12, fill: 'var(--viz-done)', 'font-weight': 700 }, `桶数组翻倍 → ${f.B} 个桶，全部搬迁完毕`));
      }

      f.buckets.forEach((chain, bi) => {
        const y = 24 + bi * rowH;
        const isHot = hl.bucket === bi;
        let bst = 'idle';
        if (isHot) bst = hl.conflict ? 'path' : 'compare';
        if (hl.rehashed || (f.fin && chain.length)) bst = chain.length ? 'done' : 'idle';
        if (hl.alarm) bst = chain.length ? 'path' : 'idle';

        // 桶格
        svg.appendChild(svgEl('rect', { class: `v-cell s-${bst}`, x: 34, y, width: bw, height: rowH - 8, rx: 7, opacity: chain.length || isHot ? 1 : 0.5 }));
        svg.appendChild(svgEl('text', { x: 34 + bw / 2, y: y + (rowH - 8) / 2, 'font-size': 12, 'font-weight': 700 }, String(bi)));
        svg.appendChild(svgEl('text', { x: 26, y: y + (rowH - 8) / 2, 'font-size': 9.5, class: 'lbl', 'text-anchor': 'end' }, '桶'));

        // 链（长链时自动压缩间距，保证不超出画布）
        const maxChain = Math.max(1, ...f.buckets.map((c) => c.length));
        const stepX = Math.min(nw + gap + 14, Math.floor((W - 96 - nw) / Math.max(maxChain - 1, 1)));
        chain.forEach((k, ci) => {
          const x = 34 + bw + 18 + ci * stepX;
          const isNew = isHot && hl.newIdx === ci;
          let st = 'visited';
          if (isNew) st = 'active';
          else if (hl.alarm) st = 'path';
          else if (hl.rehashed || f.fin) st = 'done';
          // 链箭头
          svg.appendChild(svgEl('path', {
            class: 'v-arrow',
            d: `M${x - 16} ${y + (rowH - 8) / 2} H${x - 4}`,
            stroke: 'var(--border-strong)', 'stroke-width': 1.8, fill: 'none',
          }));
          svg.appendChild(svgEl('path', { d: `M${x - 4} ${y + (rowH - 8) / 2} l-5 -3.5 v7 z`, fill: 'var(--border-strong)' }));
          svg.appendChild(svgEl('rect', { class: `v-node s-${st}${isNew ? ' v-pop' : ''}`, x, y: y + 2, width: nw, height: rowH - 12, rx: 7 }));
          svg.appendChild(svgEl('text', { x: x + nw / 2, y: y + 2 + (rowH - 12) / 2, 'font-size': 12 }, String(k)));
        });
        if (!chain.length) {
          svg.appendChild(svgEl('text', { x: 34 + bw + 22, y: y + (rowH - 8) / 2, 'font-size': 9.5, class: 'lbl', 'text-anchor': 'start' }, '∅'));
        }
      });

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   5. linked-ops：头插 / 尾插 / 按值删除 / 三指针反转
   ------------------------------------------------------------ */
function linkedOps(host) {
  const build = () => {
    const frames = [];
    let list = [];
    const F = (say, line, o = {}) => {
      frames.push({ data: [...list], say, line, ...o });
    };

    /* -- 头插 -- */
    F('单链表：每个节点只知道「自己的值」和「下一个是谁」。所有操作的本质都是<b>改 next 指针</b>。先演示头插。', 0);
    list = [7];
    F('头插 <code>7</code>：新节点 next 指向原 head（空表指 nullptr），head 改指新节点。<b>不管链多长都只改 2 个指针，O(1)</b>。', 1, { state: ['active'], labels: ['新'] });
    list = [3, 7];
    F('再头插 <code>3</code>：同样两步。注意<b>头插会让元素顺序与插入顺序相反</b>。', 1, { state: ['active', 'idle'], labels: ['新', ''] });

    /* -- 尾插 -- */
    list = [3, 7, 9];
    F('尾插 <code>9</code>：先从 head 走到最后一个节点（O(n) 遍历），再把它的 next 指向新节点。<b>若维护 tail 指针则也是 O(1)</b>。', 2, { state: ['dim', 'dim', 'active'], labels: ['', '', '新'] });
    list = [3, 7, 9, 5];
    F('尾插 <code>5</code>。当前链：<code>3 → 7 → 9 → 5</code>。', 2, { state: ['idle', 'idle', 'idle', 'active'], labels: ['', '', '', '新'] });

    /* -- 按值删除 -- */
    F('删除值为 <code>9</code> 的节点。难点：单链表节点<b>不知道谁指向自己</b>，必须先找到它的<b>前驱</b>。', 3);
    F('从头找：<code>cur=3</code>，不是 9，前驱指针跟上。', 4, { state: ['compare', 'idle', 'idle', 'idle'], ptr: { prev: -1, cur: 0 } });
    F('<code>cur=7</code>，不是 9，继续。prev 停在 7 的位置。', 4, { state: ['dim', 'compare', 'idle', 'idle'], ptr: { prev: 0, cur: 1 } });
    F('<code>cur=9</code>，<b>找到了</b>。它的前驱是 7。', 4, { state: ['dim', 'pivot', 'path', 'idle'], ptr: { prev: 1, cur: 2 } });
    F('关键一步：<code>prev->next = cur->next</code>，让 7 <b>绕过 9</b> 直接指向 5。9 从链上被"摘"下来。', 5, { state: ['dim', 'active', 'path', 'idle'], ptr: { prev: 1, cur: 2 }, bypass: [1, 3] });
    list = [3, 7, 5];
    F('<code>delete</code> 被摘下的节点，否则内存泄漏。删除本身 O(1)，<b>贵在找前驱的 O(n)</b>。', 5, { state: ['done', 'done', 'done'] });

    /* -- 三指针反转 -- */
    list = [3, 7, 5];
    F('最后：<b>三指针迭代反转</b>。用 prev/cur/next 三个指针，把每个节点的 next 逐个"掰"向反方向。', 6, { ptr: { prev: -1, cur: 0 }, rev: [] });
    F('初始 <code>prev = nullptr</code>，<code>cur = head(3)</code>。先用 <code>next</code> 记住 7——<b>一旦改了 3 的指针，不先存就再也找不到后面了</b>。', 7, { state: ['active', 'compare', 'idle'], ptr: { prev: -1, cur: 0, next: 1 }, rev: [] });
    F('掰第 1 个：<code>3->next = prev(nullptr)</code>，3 变成未来的尾巴。然后整体右移：<code>prev=3, cur=7</code>。', 8, { state: ['done', 'active', 'idle'], ptr: { prev: 0, cur: 1, next: 2 }, rev: [0] });
    F('掰第 2 个：<code>7->next = 3</code>（箭头反向）。右移：<code>prev=7, cur=5</code>。已反转区在左侧逐渐变长。', 8, { state: ['done', 'done', 'active'], ptr: { prev: 1, cur: 2 }, rev: [0, 1] });
    F('掰第 3 个：<code>5->next = 7</code>。<code>cur</code> 走到 nullptr，循环结束。', 8, { state: ['done', 'done', 'done'], ptr: { prev: 2, cur: -2 }, rev: [0, 1, 2] });
    list = [5, 7, 3];
    F('<code>head = prev</code>，反转完成：<code>5 → 7 → 3</code>。每个节点恰好被处理一次，<b>O(n) 时间、O(1) 空间</b>，全程没有申请新节点。', 9, { state: ['done', 'done', 'done'] });

    return { frames, meta: {} };
  };

  return new Player({
    title: '单链表四连：头插 · 尾插 · 删除 · 反转',
    badge: '链表',
    speed: 1500,
    legend: [
      { c: '--viz-active', t: '正在操作' },
      { c: '--viz-compare', t: '正在查找' },
      { c: '--viz-path', t: '待删除' },
      { c: '--viz-pivot', t: '前驱 prev' },
      { c: '--viz-done', t: '已完成' },
    ],
    pseudo: [
      '// 头插 O(1)',
      'node->next = head;  head = node;',
      '// 尾插：走到尾再接（或维护 tail 指针）',
      '// 按值删除：必须先找前驱',
      'while (cur && cur->val != x) { prev = cur; cur = cur->next; }',
      'prev->next = cur->next;  delete cur;',
      '// 三指针反转',
      'ListNode *prev = nullptr, *cur = head;',
      'while (cur) { next = cur->next; cur->next = prev;',
      '              prev = cur; cur = next; }  head = prev;',
    ],
    build,
    draw(stage, f) {
      // 需要三指针标签 / 反向箭头 / 绕行弧线时自绘，其余用 drawNodes
      if (f.rev !== undefined || f.bypass || f.ptr) {
        const data = f.data;
        const w = 62, h = 40, gap = 44;
        const W = Math.max(data.length * (w + gap) + 60, 200), H = 132;
        const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 620), style: 'max-width:100%;height:auto' });
        const y = 46;
        const xs = data.map((_, k) => 20 + k * (w + gap));

        data.forEach((v, k) => {
          const st = (f.state && f.state[k]) || 'idle';
          svg.appendChild(svgEl('rect', { class: `v-node s-${st}`, x: xs[k], y, width: w, height: h, rx: 8 }));
          svg.appendChild(svgEl('text', { x: xs[k] + w / 2, y: y + h / 2, 'font-size': 13 }, String(v)));
        });

        // 箭头：已反转的往左指，未反转的往右指
        data.forEach((_, k) => {
          const rev = f.rev && f.rev.includes(k);
          if (f.bypass && k === f.bypass[0]) return; // 被绕过的那条不画默认箭头
          if (rev) {
            if (k === 0) {
              svg.appendChild(svgEl('text', { x: xs[0] - 6, y: y + h / 2, 'font-size': 10, class: 'lbl', 'text-anchor': 'end' }, '∅'));
              svg.appendChild(svgEl('path', { class: 'v-arrow', d: `M${xs[0] - 2} ${y + h / 2} h-6`, stroke: 'var(--viz-done)', 'stroke-width': 2, fill: 'none' }));
            } else {
              const ax = xs[k] - 4, bx = xs[k - 1] + w + 6;
              svg.appendChild(svgEl('path', { class: 'v-arrow', d: `M${ax} ${y + h / 2} H${bx}`, stroke: 'var(--viz-done)', 'stroke-width': 2.2, fill: 'none' }));
              svg.appendChild(svgEl('path', { d: `M${bx} ${y + h / 2} l6 -4 v8 z`, fill: 'var(--viz-done)' }));
            }
          } else if (k < data.length - 1) {
            const ax = xs[k] + w + 4, bx = xs[k + 1] - 6;
            svg.appendChild(svgEl('path', { class: 'v-arrow', d: `M${ax} ${y + h / 2} H${bx}`, stroke: 'var(--border-strong)', 'stroke-width': 1.8, fill: 'none' }));
            svg.appendChild(svgEl('path', { d: `M${bx} ${y + h / 2} l-6 -4 v8 z`, fill: 'var(--border-strong)' }));
          } else if (!f.rev) {
            svg.appendChild(svgEl('text', { x: xs[k] + w + 10, y: y + h / 2, 'font-size': 10, class: 'lbl', 'text-anchor': 'start' }, 'nullptr'));
          }
        });

        // 绕行弧线（删除）
        if (f.bypass) {
          const [a, b] = f.bypass;
          const ax = xs[a] + w, bx = xs[b];
          svg.appendChild(svgEl('path', {
            class: 'v-arrow',
            d: `M${ax} ${y + 6} C ${ax + 30} ${y - 30}, ${bx - 30} ${y - 30}, ${bx} ${y + 6}`,
            stroke: 'var(--viz-active)', 'stroke-width': 2.4, fill: 'none',
          }));
          svg.appendChild(svgEl('path', { d: `M${bx} ${y + 6} l-9 -4 l3 9 z`, fill: 'var(--viz-active)' }));
          svg.appendChild(svgEl('text', { x: (ax + bx) / 2, y: y - 26, 'font-size': 10, fill: 'var(--viz-active)', 'font-weight': 700 }, 'prev->next = cur->next'));
        }

        // prev/cur/next 指针标签
        if (f.ptr) {
          const tags = [['prev', f.ptr.prev, '--viz-pivot'], ['cur', f.ptr.cur, '--viz-compare'], ['next', f.ptr.next, '--viz-active']];
          tags.forEach(([name, at, color]) => {
            if (at === undefined) return;
            let x;
            if (at === -1) x = 8;                      // nullptr（左侧）
            else if (at === -2) x = xs[data.length - 1] + w + 26; // 走出尾部
            else if (at >= 0 && at < data.length) x = xs[at] + w / 2;
            else return;
            const yy = y + h + 10;
            svg.appendChild(svgEl('path', { class: 'v-ptr', d: `M${x} ${yy} l-5 8 h10 z`, fill: `var(${color})` }));
            svg.appendChild(svgEl('text', { x, y: yy + 18, 'font-size': 10.5, fill: `var(${color})`, 'font-weight': 700 }, at < 0 ? `${name}=∅` : name));
          });
        }

        setStage(stage, svg);
      } else {
        setStage(stage, drawNodes({
          data: f.data, state: f.state, labels: f.labels,
          headLabel: 'head', tailNull: true,
        }));
      }
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   6. deque-blocks：中控 map + 分段块，两端扩展
   ------------------------------------------------------------ */
function dequeBlocks(host) {
  const BS = 4;      // 每块 4 格
  const SLOTS = 5;   // map 槽位数

  const build = () => {
    const frames = [];
    // blocks: { slot -> {cells: [...] } }，cells 从块内偏移 0 开始，null 表示空
    let blocks = { 2: Array(BS).fill(null) };
    let frontSlot = 2, frontOff = 2;  // 下一个 push_front 写入位置（回退后）
    let backSlot = 2, backOff = 2;    // 下一个 push_back 写入位置
    // 初始：块 2 的 [2] 空着，先放两个元素铺底

    const snapBlocks = () => {
      const o = {};
      for (const s in blocks) o[s] = [...blocks[s]];
      return o;
    };
    const F = (say, line, hl = {}) => {
      frames.push({
        blocks: snapBlocks(), hl, say, line,
        vars: {
          块数: Object.keys(blocks).length,
          'map 槽位': SLOTS,
          元素数: Object.values(blocks).reduce((t, b) => t + b.filter((x) => x !== null).length, 0),
        },
      });
    };

    F('vector 是一整块连续内存；<b>deque 是「分段连续」</b>：一个中控 map 数组存指针，每个指针指向一个固定大小的块（这里每块 4 格）。', 0);

    const pushBack = (v) => {
      if (backOff === BS) {
        const ns = backSlot + 1;
        blocks[ns] = Array(BS).fill(null);
        backSlot = ns; backOff = 0;
        F(`尾部块写满了 → <b>新分配一个块</b>，把指针挂到 map[${ns}]。<b>老元素一个都不用搬</b>——对比 vector 扩容要整体搬迁 O(n)。`, 4, { newBlock: ns, side: 'back' });
      }
      blocks[backSlot][backOff] = v;
      F(`push_back(${v})：写入块 map[${backSlot}] 的第 ${backOff} 格。块内还有空位时就是<b>一次写入，O(1)</b>。`, 5, { cell: [backSlot, backOff], state: 'active' });
      backOff++;
    };
    const pushFront = (v) => {
      if (frontOff === 0) {
        const ns = frontSlot - 1;
        blocks[ns] = Array(BS).fill(null);
        frontSlot = ns; frontOff = BS;
        F(`头部块已顶满 → 在 map[${ns}] 挂新块。<b>vector 做不到这件事</b>：它头部插入必须把所有元素右移 O(n)；deque 在头部加块只要 O(1)。`, 1, { newBlock: ns, side: 'front' });
      }
      frontOff--;
      blocks[frontSlot][frontOff] = v;
      F(`push_front(${v})：写入块 map[${frontSlot}] 的第 ${frontOff} 格（<b>从块尾往块头倒着填</b>，给后续头插留空间）。`, 2, { cell: [frontSlot, frontOff], state: 'compare' });
    };

    // 铺底两个
    blocks[2][2] = 10; backOff = 3;
    F('先放好一个元素 <code>10</code>（在中间块的中部起步——<b>两边都留余地</b>，这是 deque 的布局哲学）。', 0, { cell: [2, 2], state: 'done' });

    pushBack(20);
    pushBack(30);       // 触发尾部新块
    pushBack(40);
    pushFront(5);
    pushFront(3);       // frontOff 走到 0
    pushFront(1);       // 触发头部新块

    F(`最终 3 个块通过 map 串起来，逻辑上是一条连续序列 <code>1,3,5,10,20,30,40</code>。随机访问 <code>d[i]</code> 只需两步算术（i/4 定块、i%4 定格），<b>仍是 O(1)</b>，只比 vector 多一次指针跳转。`, 6, { fin: true });
    F('代价：内存不再整段连续，<b>缓存局部性差于 vector</b>；但换来了 <b>push_front O(1)</b> 和扩展时<b>永不整体搬迁</b>——已有元素的引用在两端插入时保持有效。', 6, { fin: true });

    return { frames, meta: {} };
  };

  return new Player({
    title: 'deque 分段连续：中控 map + 定长块',
    badge: 'deque',
    speed: 1450,
    vars: true,
    legend: [
      { c: '--viz-active', t: 'push_back 写入' },
      { c: '--viz-compare', t: 'push_front 写入' },
      { c: '--viz-pivot', t: '新分配的块' },
      { c: '--viz-done', t: '已有元素' },
    ],
    pseudo: [
      'void push_front(const T& x) {',
      '  if (首块已满) map[--first] = new_block();  // O(1) 加块',
      '  *(--front_pos) = x;    // 块内倒着填',
      '}',
      'void push_back(const T& x) {  // 对称：尾满则挂新块',
      '  *(back_pos++) = x;',
      '}  // 两端均摊 O(1)，且从不搬迁旧元素',
    ],
    build,
    draw(stage, f) {
      const W = 620, H = 250;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 680), style: 'max-width:100%;height:auto' });
      const hl = f.hl || {};

      // 中控 map：一排 5 个槽
      const mw = 46, mgap = 8, mx0 = (W - SLOTS * (mw + mgap)) / 2;
      const my = 26;
      svg.appendChild(svgEl('text', { x: mx0 - 10, y: my + 14, 'font-size': 11, class: 'lbl', 'text-anchor': 'end' }, '中控 map'));

      const used = Object.keys(f.blocks).map(Number).sort((a, b) => a - b);
      // 块区
      const bw = 38, bgap = 5;
      const blockW = BS * (bw + bgap) - bgap;
      const totalBW = used.length * (blockW + 26) - 26;
      const bx0 = (W - totalBW) / 2;
      const by = 120;

      const blockX = {};
      used.forEach((s, i) => { blockX[s] = bx0 + i * (blockW + 26); });

      for (let s = 0; s < SLOTS; s++) {
        const x = mx0 + s * (mw + mgap);
        const has = f.blocks[s] !== undefined;
        const isNew = hl.newBlock === s;
        svg.appendChild(svgEl('rect', {
          class: `v-cell s-${isNew ? 'pivot' : has ? 'visited' : 'idle'}${isNew ? ' v-pop' : ''}`,
          x, y: my, width: mw, height: 28, rx: 6, opacity: has || isNew ? 1 : 0.4,
        }));
        svg.appendChild(svgEl('text', { x: x + mw / 2, y: my + 14, 'font-size': 10.5 }, has ? 'ptr' : '空'));
        svg.appendChild(svgEl('text', { x: x + mw / 2, y: my + 40, 'font-size': 9, class: 'lbl' }, `map[${s}]`));

        // map → 块 的指针线
        if (has) {
          const tx = blockX[s] + blockW / 2;
          svg.appendChild(svgEl('path', {
            class: `v-edge k-${isNew ? 'pivot' : 'idle'}`,
            d: `M${x + mw / 2} ${my + 28} C ${x + mw / 2} ${my + 62}, ${tx} ${by - 34}, ${tx} ${by - 8}`,
            fill: 'none', 'stroke-width': isNew ? 2.6 : 1.6,
          }));
          svg.appendChild(svgEl('path', { d: `M${tx} ${by - 8} l-4 -7 h8 z`, fill: isNew ? 'var(--viz-pivot)' : 'var(--border-strong)' }));
        }
      }

      // 块本体
      used.forEach((s) => {
        const cells = f.blocks[s];
        const x0 = blockX[s];
        const isNew = hl.newBlock === s;
        svg.appendChild(svgEl('rect', {
          x: x0 - 6, y: by - 6, width: blockW + 12, height: bw + 12, rx: 9,
          fill: 'none', stroke: isNew ? 'var(--viz-pivot)' : 'var(--border)', 'stroke-width': isNew ? 2 : 1.2,
          class: 'v-edge',
        }));
        cells.forEach((v, ci) => {
          const x = x0 + ci * (bw + bgap);
          let st = v === null ? 'idle' : 'done';
          if (hl.cell && hl.cell[0] === s && hl.cell[1] === ci) st = hl.state || 'active';
          svg.appendChild(svgEl('rect', { class: `v-cell s-${st}`, x, y: by, width: bw, height: bw, rx: 6, opacity: v === null && st === 'idle' ? 0.45 : 1 }));
          svg.appendChild(svgEl('text', { x: x + bw / 2, y: by + bw / 2, 'font-size': 12 }, v === null ? '·' : String(v)));
        });
        svg.appendChild(svgEl('text', { x: x0 + blockW / 2, y: by + bw + 16, 'font-size': 9.5, class: 'lbl' }, `块（map[${s}] 所指，定长 ${BS}）`));
      });

      // 两端标注
      if (used.length) {
        const lx = blockX[used[0]];
        const rx = blockX[used[used.length - 1]] + blockW;
        svg.appendChild(svgEl('text', { x: lx - 8, y: by + bw / 2, 'font-size': 10, fill: 'var(--viz-compare)', 'font-weight': 700, 'text-anchor': 'end' }, '← push_front 端'));
        svg.appendChild(svgEl('text', { x: rx + 8, y: by + bw / 2, 'font-size': 10, fill: 'var(--viz-active)', 'font-weight': 700, 'text-anchor': 'start' }, 'push_back 端 →'));
      }

      // 底部对比条
      svg.appendChild(svgEl('text', {
        x: W / 2, y: H - 12, 'font-size': 10.5,
        fill: hl.newBlock !== undefined ? 'var(--viz-pivot)' : 'var(--fg-muted)',
        'font-weight': hl.newBlock !== undefined ? 700 : 400, 'font-family': 'var(--font-sans)',
      }, hl.newBlock !== undefined ? '对比 vector：扩容要搬全部元素；deque 只是挂一个新块' : 'map 存块指针 · 块存元素 · 逻辑连续、物理分段'));

      setStage(stage, svg);
    },
  }).mount(host);
}

/* ------------------------------------------------------------ 导出 */
export const VIZ = {
  'vector-growth': vectorGrowth,
  'stack-ops': stackOps,
  'queue-circular': queueCircular,
  'hash-table': hashTable,
  'linked-ops': linkedOps,
  'deque-blocks': dequeBlocks,
};
