/* ============================================================
   可视化动画引擎
   核心模型：算法生成「帧序列」，播放器只负责渲染指定帧。
   → 步进/回退/跳转都是纯函数式的，不会出现状态漂移。
   ============================================================ */

import { icon } from '../core/icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 创建 SVG 元素并批量设置属性 */
export function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] === undefined || attrs[k] === null) continue;
    el.setAttribute(k, attrs[k]);
  }
  if (text !== undefined) el.textContent = text;
  return el;
}

/** 创建 HTML 元素 */
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* ============================================================
   Player：帧播放器
   ============================================================ */

export class Player {
  /**
   * @param {object} cfg
   * @param {string} cfg.title      面板标题
   * @param {string} [cfg.badge]    左上角徽标文字
   * @param {Array}  [cfg.legend]   图例 [{c:'--viz-active', t:'当前'}]
   * @param {Array}  [cfg.pseudo]   伪代码行数组
   * @param {Function} cfg.build    () => { frames, meta } 生成帧序列
   * @param {Function} cfg.draw     (stage, frame, meta) => void 渲染单帧
   * @param {Function} [cfg.controls] (bar, rebuild) => void 额外输入控件
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.frames = [];
    this.i = 0;
    this.timer = null;
    this.speed = 1;
    this.playing = false;
    this.root = null;
  }

  mount(host) {
    const c = this.cfg;
    const root = el('div', 'viz');
    this.root = root;

    /* --- 头部 --- */
    const head = el('div', 'viz__head');
    head.innerHTML = `
      <span class="viz__badge">${icon('sparkles')}${c.badge || '动画演示'}</span>
      <span class="viz__title">${c.title || ''}</span>`;
    root.appendChild(head);

    /* --- 自定义输入区 --- */
    if (c.controls) {
      const bar = el('div', 'viz__input');
      c.controls(bar, () => this.rebuild());
      root.appendChild(bar);
    }

    /* --- 舞台 --- */
    this.stage = el('div', 'viz__stage');
    root.appendChild(this.stage);

    /* --- 变量监视 --- */
    if (c.vars) {
      this.varsBox = el('div', 'viz__vars');
      root.appendChild(this.varsBox);
    }

    /* --- 伪代码 --- */
    if (c.pseudo && c.pseudo.length) {
      this.pseudoBox = el('div', 'viz__pseudo');
      this.pseudoBox.innerHTML = c.pseudo
        .map(
          (line, k) =>
            `<span class="pl" data-pl="${k}"><span class="pn">${k + 1}</span>${escapeText(line)}</span>`
        )
        .join('');
      root.appendChild(this.pseudoBox);
    }

    /* --- 旁白 --- */
    this.narrate = el('div', 'viz__narrate');
    this.narrate.innerHTML = `<span class="n-ico">${icon('info')}</span><span class="n-txt"></span>`;
    this.nTxt = this.narrate.querySelector('.n-txt');
    root.appendChild(this.narrate);

    /* --- 图例 --- */
    if (c.legend && c.legend.length) {
      const lg = el('div', 'viz__legend');
      lg.innerHTML = c.legend
        .map((g) => `<span><i style="background:var(${g.c})"></i>${g.t}</span>`)
        .join('');
      root.appendChild(lg);
    }

    /* --- 进度轨 --- */
    const track = el('div', 'viz__track');
    this.trackFill = el('div', 'viz__track-fill');
    track.appendChild(this.trackFill);
    track.addEventListener('click', (e) => {
      const r = track.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      this.pause();
      this.go(Math.round(p * (this.frames.length - 1)));
    });
    root.appendChild(track);

    /* --- 控制条 --- */
    const ctrl = el('div', 'viz__ctrl');

    this.bPlay = mkBtn('vbtn vbtn--play', `${icon('play')}<span>播放</span>`, '播放/暂停 (空格)');
    this.bPrev = mkBtn('vbtn', icon('stepB'), '上一步 (←)');
    this.bNext = mkBtn('vbtn', icon('stepF'), '下一步 (→)');
    this.bReset = mkBtn('vbtn', icon('reset'), '重置');
    this.bEnd = mkBtn('vbtn', icon('toEnd'), '跳到结尾');

    this.bPlay.onclick = () => (this.playing ? this.pause() : this.play());
    this.bPrev.onclick = () => { this.pause(); this.go(this.i - 1); };
    this.bNext.onclick = () => { this.pause(); this.go(this.i + 1); };
    this.bReset.onclick = () => { this.pause(); this.go(0); };
    this.bEnd.onclick = () => { this.pause(); this.go(this.frames.length - 1); };

    ctrl.append(this.bPlay, this.bPrev, this.bNext, this.bEnd, this.bReset);

    ctrl.appendChild(el('div', 'viz__spacer'));

    this.ind = el('div', 'viz__step-ind');
    ctrl.appendChild(this.ind);

    const sp = el('div', 'viz__speed');
    [[0.5, '0.5x'], [1, '1x'], [2, '2x'], [4, '4x']].forEach(([v, lab]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = lab;
      b.dataset.sp = v;
      if (v === 1) b.classList.add('is-on');
      b.onclick = () => {
        this.speed = v;
        sp.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
        if (this.playing) { this.pause(); this.play(); }
      };
      sp.appendChild(b);
    });
    ctrl.appendChild(sp);

    root.appendChild(ctrl);
    host.replaceWith(root);

    /* --- 键盘控制（面板获得焦点/悬停时） --- */
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); this.playing ? this.pause() : this.play(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.pause(); this.go(this.i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.pause(); this.go(this.i - 1); }
    });

    this.rebuild();
    return this;
  }

  rebuild() {
    this.pause();
    const r = this.cfg.build();
    this.frames = r.frames || [];
    this.meta = r.meta || {};
    this.go(0, true);
  }

  go(n, force) {
    if (!this.frames.length) return;
    const idx = Math.max(0, Math.min(this.frames.length - 1, n));
    if (idx === this.i && !force) {
      if (idx >= this.frames.length - 1) this.pause();
      return;
    }
    this.i = idx;
    const f = this.frames[idx];

    try {
      this.cfg.draw(this.stage, f, this.meta, this);
    } catch (err) {
      console.error('[viz] draw error', err);
    }

    this.nTxt.innerHTML = f.say || '';

    if (this.pseudoBox) {
      const on = f.line;
      this.pseudoBox.querySelectorAll('.pl').forEach((p) => {
        const k = +p.dataset.pl;
        p.classList.toggle('is-on', Array.isArray(on) ? on.includes(k) : k === on);
      });
    }

    if (this.varsBox) {
      const vs = f.vars || {};
      this.varsBox.innerHTML = Object.keys(vs)
        .map((k) => {
          const v = vs[k];
          const hot = typeof v === 'object' && v && v.hot;
          const val = typeof v === 'object' && v ? v.v : v;
          return `<span class="vvar${hot ? ' is-hot' : ''}"><span class="vvar__k">${k}</span><span class="vvar__v">${val}</span></span>`;
        })
        .join('');
    }

    const total = this.frames.length;
    this.ind.innerHTML = `<b>${idx + 1}</b> / ${total}`;
    this.trackFill.style.width = `${total > 1 ? (idx / (total - 1)) * 100 : 100}%`;

    this.bPrev.disabled = idx === 0;
    this.bNext.disabled = idx === total - 1;
    this.bEnd.disabled = idx === total - 1;

    if (idx === total - 1) this.pause();
  }

  play() {
    if (this.playing) return;
    if (this.i >= this.frames.length - 1) this.go(0);
    this.playing = true;
    this.bPlay.innerHTML = `${icon('pause')}<span>暂停</span>`;
    const tick = () => {
      if (!this.playing) return;
      if (this.i >= this.frames.length - 1) { this.pause(); return; }
      this.go(this.i + 1);
      if (this.playing) this.timer = setTimeout(tick, this.interval());
    };
    this.timer = setTimeout(tick, this.interval());
  }

  interval() {
    const base = this.cfg.speed || 780;
    return Math.max(60, base / this.speed);
  }

  pause() {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.bPlay) this.bPlay.innerHTML = `${icon('play')}<span>播放</span>`;
  }

  destroy() { this.pause(); }
}

function mkBtn(cls, html, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.innerHTML = html;
  if (title) { b.title = title; b.setAttribute('aria-label', title); }
  return b;
}

const escapeText = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ============================================================
   通用绘图组件
   ============================================================ */

/**
 * 绘制一维数组（柱状或方块）
 * @param {object} o
 * @param {number[]|string[]} o.data 数据
 * @param {string[]} o.state  每个元素的状态类名后缀（idle/active/compare/done/...）
 * @param {object} [o.ptrs]   指针 {i: 2, j: 5} 或 {i:{at:2,color:'--viz-active'}}
 * @param {boolean} [o.bars]  true 用柱状图（数值型）
 * @param {number} [o.cell]   单元格宽度
 */
export function drawArray(o) {
  const data = o.data || [];
  const n = data.length;
  const cell = o.cell || Math.max(30, Math.min(52, Math.floor(560 / Math.max(n, 1))));
  const gap = Math.max(3, Math.round(cell * 0.12));
  const step = cell + gap;
  const topPad = o.ptrs ? 34 : 12;
  const labelH = o.index === false ? 8 : 22;

  const barMode = o.bars;
  const maxV = barMode ? Math.max(1, ...data.map((d) => Number(d) || 0)) : 0;
  const barH = o.barH || 140;
  const cellH = barMode ? barH : cell;

  const W = Math.max(n * step - gap, 40) + 24;
  const H = topPad + cellH + labelH + 10;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: Math.min(W, 900),
    style: `max-width:100%;height:auto`,
  });

  const ox = 12;

  data.forEach((v, k) => {
    const st = (o.state && o.state[k]) || 'idle';
    const x = ox + k * step;
    let y, h;

    if (barMode) {
      h = Math.max(4, ((Number(v) || 0) / maxV) * barH);
      y = topPad + (barH - h);
    } else {
      h = cell;
      y = topPad;
    }

    const g = svgEl('g');
    g.appendChild(
      svgEl('rect', {
        class: `v-cell s-${st}`,
        x, y, width: cell, height: h,
        rx: Math.min(7, cell * 0.2),
        stroke: 'none',
      })
    );

    // 数值文字
    const fs = Math.max(10, Math.min(15, cell * 0.42));
    if (barMode) {
      g.appendChild(
        svgEl('text', { x: x + cell / 2, y: y - 9, 'font-size': fs, class: 'lbl-b' }, String(v))
      );
    } else {
      g.appendChild(
        svgEl('text', { x: x + cell / 2, y: y + h / 2, 'font-size': fs }, String(v))
      );
    }

    // 下标
    if (o.index !== false) {
      g.appendChild(
        svgEl(
          'text',
          { x: x + cell / 2, y: topPad + cellH + 12, 'font-size': 10, class: 'lbl' },
          String(k)
        )
      );
    }
    svg.appendChild(g);
  });

  // 指针
  if (o.ptrs) {
    const groups = {};
    for (const name in o.ptrs) {
      const raw = o.ptrs[name];
      const at = typeof raw === 'object' ? raw.at : raw;
      if (at == null || at < 0 || at >= n) continue;
      (groups[at] = groups[at] || []).push({ name, color: (typeof raw === 'object' && raw.color) || '--viz-active' });
    }
    for (const at in groups) {
      const list = groups[at];
      const x = ox + +at * step + cell / 2;
      const label = list.map((p) => p.name).join(',');
      const color = list[0].color;
      svg.appendChild(
        svgEl('path', {
          class: 'v-ptr',
          d: `M${x} ${topPad - 4} l-5 -8 h10 z`,
          fill: `var(${color})`,
        })
      );
      svg.appendChild(
        svgEl(
          'text',
          { x, y: topPad - 22, 'font-size': 11, fill: `var(${color})`, 'font-weight': 700 },
          label
        )
      );
    }
  }

  return svg;
}

/**
 * 绘制链式节点（链表 / 栈 / 队列）
 */
export function drawNodes(o) {
  const data = o.data || [];
  const n = data.length;
  const w = o.w || 62, h = o.h || 40, gap = o.gap || 36;
  const W = Math.max(n * (w + gap) + 40, 120);
  const H = h + 64;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: Math.min(W, 900), style: 'max-width:100%;height:auto' });
  const y = 30;

  data.forEach((d, k) => {
    const x = 20 + k * (w + gap);
    const st = (o.state && o.state[k]) || 'idle';
    const val = typeof d === 'object' ? d.v : d;

    svg.appendChild(svgEl('rect', { class: `v-node s-${st}`, x, y, width: w, height: h, rx: 8 }));
    svg.appendChild(svgEl('text', { x: x + w / 2, y: y + h / 2, 'font-size': 13 }, String(val)));

    if (o.labels && o.labels[k]) {
      svg.appendChild(
        svgEl('text', { x: x + w / 2, y: y + h + 15, 'font-size': 10, class: 'lbl' }, o.labels[k])
      );
    }

    // 箭头
    if (k < n - 1) {
      const ax = x + w + 4, bx = x + w + gap - 6;
      svg.appendChild(
        svgEl('path', {
          class: 'v-arrow',
          d: `M${ax} ${y + h / 2} H${bx}`,
          stroke: 'var(--border-strong)',
          'stroke-width': 1.8,
          fill: 'none',
        })
      );
      svg.appendChild(
        svgEl('path', {
          d: `M${bx} ${y + h / 2} l-6 -4 v8 z`,
          fill: 'var(--border-strong)',
        })
      );
    }
  });

  // 尾部 nullptr
  if (o.tailNull && n) {
    const x = 20 + n * (w + gap);
    svg.appendChild(
      svgEl('text', { x: x + 12, y: y + h / 2, 'font-size': 11, class: 'lbl' }, 'nullptr')
    );
  }

  // 头指针
  if (o.headLabel && n) {
    svg.appendChild(
      svgEl('text', { x: 20 + w / 2, y: 12, 'font-size': 11, fill: 'var(--primary)', 'font-weight': 700 }, o.headLabel)
    );
  }

  return svg;
}

/**
 * 绘制二叉树 / 一般树
 * nodes: [{id, v, x, y, parent, state}]
 */
export function drawTree(o) {
  const nodes = o.nodes || [];
  if (!nodes.length) return svgEl('svg', { viewBox: '0 0 100 40', width: 100 });

  const r = o.r || 19;
  const pad = r + 16;
  const xs = nodes.map((d) => d.x), ys = nodes.map((d) => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = maxX - minX + pad * 2;
  const H = maxY - minY + pad * 2 + (o.extraH || 0);
  const ox = pad - minX, oy = pad - minY;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: Math.min(W, 900),
    style: 'max-width:100%;height:auto',
  });

  const byId = {};
  nodes.forEach((nd) => (byId[nd.id] = nd));

  // 边
  nodes.forEach((nd) => {
    if (nd.parent == null) return;
    const p = byId[nd.parent];
    if (!p) return;
    svg.appendChild(
      svgEl('line', {
        class: `v-edge k-${nd.edgeState || 'idle'}`,
        x1: p.x + ox, y1: p.y + oy,
        x2: nd.x + ox, y2: nd.y + oy,
        'stroke-width': nd.edgeState && nd.edgeState !== 'idle' ? 2.8 : 1.6,
      })
    );
  });

  // 节点
  nodes.forEach((nd) => {
    const g = svgEl('g');
    g.appendChild(
      svgEl('circle', {
        class: `v-node s-${nd.state || 'idle'}${nd.pop ? ' v-pop' : ''}`,
        cx: nd.x + ox, cy: nd.y + oy, r,
        stroke: 'var(--bg-elev)', 'stroke-width': 2,
      })
    );
    g.appendChild(
      svgEl('text', { x: nd.x + ox, y: nd.y + oy, 'font-size': String(nd.v).length > 2 ? 10 : 12.5 }, String(nd.v))
    );
    if (nd.tag) {
      g.appendChild(
        svgEl('text',
          { x: nd.x + ox, y: nd.y + oy - r - 9, 'font-size': 10, fill: 'var(--accent)', 'font-weight': 700 },
          nd.tag)
      );
    }
    if (nd.sub) {
      g.appendChild(
        svgEl('text', { x: nd.x + ox, y: nd.y + oy + r + 12, 'font-size': 9.5, class: 'lbl' }, nd.sub)
      );
    }
    svg.appendChild(g);
  });

  return svg;
}

/**
 * 绘制图（顶点 + 边），支持有向/无向/带权
 * verts: [{id, v, x, y, state, sub}]
 * edges: [{a, b, w, state, dir}]
 */
export function drawGraph(o) {
  const verts = o.verts || [];
  const edges = o.edges || [];
  if (!verts.length) return svgEl('svg', { viewBox: '0 0 100 40', width: 100 });

  const r = o.r || 20;
  const pad = r + 24;
  const xs = verts.map((d) => d.x), ys = verts.map((d) => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = maxX - minX + pad * 2;
  const H = maxY - minY + pad * 2;
  const ox = pad - minX, oy = pad - minY;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: Math.min(W, 880),
    style: 'max-width:100%;height:auto',
  });

  const byId = {};
  verts.forEach((v) => (byId[v.id] = v));

  // 箭头标记
  if (o.directed) {
    const defs = svgEl('defs');
    ['idle', 'active', 'done', 'path', 'visited', 'compare', 'dim'].forEach((s) => {
      const m = svgEl('marker', {
        id: `ah-${s}-${o.uid || 'g'}`,
        viewBox: '0 0 10 10', refX: 9, refY: 5,
        markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse',
      });
      m.appendChild(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', fill: `var(--viz-${s})` }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);
  }

  // 边
  edges.forEach((e) => {
    const a = byId[e.a], b = byId[e.b];
    if (!a || !b) return;
    const st = e.state || 'idle';
    const x1 = a.x + ox, y1 = a.y + oy, x2 = b.x + ox, y2 = b.y + oy;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const gapEnd = o.directed ? r + 6 : r;
    const sx = x1 + ux * r, sy = y1 + uy * r;
    const ex = x2 - ux * gapEnd, ey = y2 - uy * gapEnd;

    const line = svgEl('line', {
      class: `v-edge k-${st}`,
      x1: sx, y1: sy, x2: ex, y2: ey,
      'stroke-width': st === 'idle' || st === 'dim' ? 1.7 : 3,
      'stroke-linecap': 'round',
    });
    if (o.directed) line.setAttribute('marker-end', `url(#ah-${st}-${o.uid || 'g'})`);
    svg.appendChild(line);

    // 权重
    if (e.w !== undefined && e.w !== null) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const nx = -uy * 11, ny = ux * 11;
      svg.appendChild(
        svgEl('rect', {
          x: mx + nx - 12, y: my + ny - 8.5, width: 24, height: 17, rx: 5,
          fill: 'var(--bg-elev)', stroke: `var(--viz-${st})`,
          'stroke-width': st === 'idle' ? 1 : 1.6, class: 'v-edge',
        })
      );
      svg.appendChild(
        svgEl('text',
          { x: mx + nx, y: my + ny, 'font-size': 10.5,
            fill: st === 'idle' ? 'var(--fg-muted)' : `var(--viz-${st})`, 'font-weight': 700 },
          String(e.w))
      );
    }
  });

  // 顶点
  verts.forEach((v) => {
    const g = svgEl('g');
    g.appendChild(
      svgEl('circle', {
        class: `v-node s-${v.state || 'idle'}${v.pop ? ' v-pop' : ''}`,
        cx: v.x + ox, cy: v.y + oy, r,
        stroke: 'var(--bg-elev)', 'stroke-width': 2.5,
      })
    );
    g.appendChild(
      svgEl('text', { x: v.x + ox, y: v.y + oy, 'font-size': 13, 'font-weight': 600 }, String(v.v))
    );
    if (v.sub != null) {
      g.appendChild(
        svgEl('rect', {
          x: v.x + ox - 15, y: v.y + oy + r + 1, width: 30, height: 15, rx: 4,
          fill: 'var(--muted)', stroke: 'var(--border)',
        })
      );
      g.appendChild(
        svgEl('text',
          { x: v.x + ox, y: v.y + oy + r + 8.5, 'font-size': 9.5, fill: 'var(--accent)', 'font-weight': 700 },
          String(v.sub))
      );
    }
    if (v.tag) {
      g.appendChild(
        svgEl('text',
          { x: v.x + ox, y: v.y + oy - r - 8, 'font-size': 10, fill: 'var(--primary)', 'font-weight': 700 },
          v.tag)
      );
    }
    svg.appendChild(g);
  });

  return svg;
}

/** 布局：把二叉树数组（堆式）转成坐标节点 */
export function layoutHeap(arr, opts = {}) {
  const n = arr.length;
  const levels = n ? Math.floor(Math.log2(n)) + 1 : 0;
  const hGap = opts.hGap || 44;
  const vGap = opts.vGap || 62;
  const width = Math.pow(2, levels - 1) * hGap;
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const lv = Math.floor(Math.log2(i + 1));
    const idxInLv = i + 1 - Math.pow(2, lv);
    const cnt = Math.pow(2, lv);
    const slot = width / cnt;
    nodes.push({
      id: i,
      v: arr[i],
      x: slot * (idxInLv + 0.5),
      y: lv * vGap,
      parent: i === 0 ? null : Math.floor((i - 1) / 2),
    });
  }
  return nodes;
}

/** 布局：BST 中序展开定位 */
export function layoutBST(root, opts = {}) {
  const hGap = opts.hGap || 46;
  const vGap = opts.vGap || 62;
  const nodes = [];
  let col = 0;
  const walk = (node, depth, parent) => {
    if (!node) return;
    walk(node.l, depth + 1, node.key);
    nodes.push({ id: node.key, v: node.key, x: col++ * hGap, y: depth * vGap, parent, ref: node });
    walk(node.r, depth + 1, node.key);
  };
  walk(root, 0, null);
  return nodes;
}

/** 简易表格渲染（DP 表 / 距离表） */
export function buildTable({ head, rows, cls }) {
  const t = el('table', 'viz-table');
  if (head) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    head.forEach((h) => {
      const th = document.createElement('th');
      th.innerHTML = h;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    t.appendChild(thead);
  }
  const tb = document.createElement('tbody');
  rows.forEach((r, ri) => {
    const tr = document.createElement('tr');
    r.forEach((c, ci) => {
      const td = document.createElement('td');
      if (typeof c === 'object' && c !== null) {
        td.innerHTML = c.v;
        if (c.cls) td.className = c.cls;
      } else {
        td.innerHTML = c;
        const k = cls && cls[ri] && cls[ri][ci];
        if (k) td.className = k;
      }
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

/** 清空并写入舞台 */
export function setStage(stage, ...children) {
  stage.innerHTML = '';
  children.forEach((c) => c && stage.appendChild(c));
}

/** 生成随机整数数组 */
export function randArr(n, lo = 5, hi = 99) {
  return Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
}

/** 解析用户输入的数字串 */
export function parseNums(s, fallback) {
  const a = String(s)
    .split(/[\s,，、]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
  return a.length ? a : fallback;
}
