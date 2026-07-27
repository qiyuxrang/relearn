/* ============================================================
   Relearn 主应用：路由 · 导航 · 渲染 · 交互
   ============================================================ */

import { icon } from './core/icons.js';
import { store } from './core/store.js';
import {
  MODULES, FLAT, MODULE_BY_ID, LESSON_BY_ID, TOTAL_LESSONS,
  loadLesson, neighbors,
} from './core/registry.js?v=py-basic-20260727';
import {
  BANKS, BANK_SETS, BANK_BY_ID, SET_BY_ID, SET_KIND_LABEL,
  loadSet, setNeighbors,
} from './core/banks.js';
import { renderLesson, renderSet } from './core/render.js';

/* 动画系统懒加载：单个模块损坏不拖垮整站 */
let vizApi = null;
async function getViz() {
  if (vizApi) return vizApi;
  try {
    vizApi = await import('./viz/index.js');
  } catch (e) {
    console.error('[viz] 动画系统加载失败', e);
    vizApi = { mountViz: () => null };
  }
  return vizApi;
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = { route: null, players: [], timers: [] };

/** 清掉所有正在跑的倒计时（切路由时必须调用，否则内存里会留下孤儿 interval） */
function clearTimers() {
  state.timers.forEach((id) => clearInterval(id));
  state.timers = [];
}

/* ============================================================
   主题
   ============================================================ */
function initTheme() {
  const saved = store.theme();
  const prefLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const t = saved || (prefLight ? 'light' : 'dark');
  applyTheme(t);
  $('#themeBtn').addEventListener('click', () => {
    const now = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(now);
    store.setTheme(now);
  });
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const b = $('#themeBtn');
  if (b) {
    b.innerHTML = icon(t === 'light' ? 'moon' : 'sun');
    b.title = t === 'light' ? '切换到深色' : '切换到浅色';
  }
}

/* ============================================================
   侧边栏
   ============================================================ */
function buildSidebar() {
  const nav = $('#nav');
  const openSaved = store.openGroups();
  nav.innerHTML = '';

  MODULES.forEach((m) => {
    const g = document.createElement('div');
    g.className = 'nav-group';
    g.dataset.mod = m.id;

    g.innerHTML = `
      <button class="nav-group__head" type="button" aria-expanded="false">
        <span class="nav-group__icon" style="--tone:var(--${m.tone})">${icon(m.icon)}</span>
        <span class="nav-group__label">${m.title}</span>
        <span class="nav-group__count" data-count="${m.id}">0/${m.lessons.length}</span>
        <span class="nav-group__chev">${icon('chevR')}</span>
      </button>
      <div class="nav-group__items">
        ${m.lessons
          .map(
            (l) =>
              `<a class="nav-item" href="#/l/${l.id}" data-lesson="${l.id}">
                 <span class="nav-item__dot"></span>
                 <span class="nav-item__text">${l.title}</span>
               </a>`
          )
          .join('')}
      </div>`;

    g.querySelector('.nav-group__head').addEventListener('click', () => {
      g.classList.toggle('is-open');
      g.querySelector('.nav-group__head').setAttribute(
        'aria-expanded',
        String(g.classList.contains('is-open'))
      );
      store.setOpenGroups(
        $$('.nav-group.is-open', nav).map((x) => x.dataset.mod)
      );
    });

    if (openSaved ? openSaved.includes(m.id) : false) g.classList.add('is-open');
    nav.appendChild(g);
  });

  /* 题库独立成区：与课程模块视觉分隔，进度也单独统计 */
  BANKS.forEach((b) => {
    const g = document.createElement('div');
    g.className = 'nav-group nav-group--bank';
    g.dataset.mod = `bank:${b.id}`;

    g.innerHTML = `
      <button class="nav-group__head" type="button" aria-expanded="false">
        <span class="nav-group__icon" style="--tone:var(--${b.tone})">${icon(b.icon)}</span>
        <span class="nav-group__label">${b.title}</span>
        <span class="nav-group__count" data-bank-count="${b.id}">0/0</span>
        <span class="nav-group__chev">${icon('chevR')}</span>
      </button>
      <div class="nav-group__items">
        <a class="nav-item nav-item--all" href="#/b/${b.id}" data-set="__bank_${b.id}">
          <span class="nav-item__dot"></span>
          <span class="nav-item__text">题库总览</span>
        </a>
        ${b.sets
          .map(
            (s) =>
              `<a class="nav-item" href="#/q/${s.id}" data-set="${s.id}">
                 <span class="nav-item__dot"></span>
                 <span class="nav-item__text">${s.title}</span>
               </a>`
          )
          .join('')}
      </div>`;

    g.querySelector('.nav-group__head').addEventListener('click', () => {
      g.classList.toggle('is-open');
      g.querySelector('.nav-group__head').setAttribute(
        'aria-expanded',
        String(g.classList.contains('is-open'))
      );
      store.setOpenGroups($$('.nav-group.is-open', nav).map((x) => x.dataset.mod));
    });

    if (openSaved ? openSaved.includes(`bank:${b.id}`) : false) g.classList.add('is-open');
    nav.appendChild(g);
  });
}

/* ---------- 题库题目索引：setId → 该卷的题目 key 列表 ---------- */
const setKeys = new Map();
/* setId → 该卷的题目 {title, badge} 列表，供全站搜索命中具体题名/题号 */
const setExercises = new Map();

/** 从块树里收集所有带 key 的练习题（fold 块内的也要算） */
function collectKeys(blocks, out = []) {
  (blocks || []).forEach((b) => {
    if (!b || typeof b !== 'object') return;
    if (b.t === 'exercises') (b.x || []).forEach((ex) => { if (ex && ex.key) out.push(ex.key); });
    if (b.t === 'fold' && Array.isArray(b.x)) collectKeys(b.x, out);
  });
  return out;
}

/** 收集套卷里全部题目的标题与题号徽标（搜索池用，与 collectKeys 同构） */
function collectExercises(blocks, out = []) {
  (blocks || []).forEach((b) => {
    if (!b || typeof b !== 'object') return;
    if (b.t === 'exercises') (b.x || []).forEach((ex) => {
      if (!ex || !ex.title) return;
      out.push({ title: ex.title, badge: ex.badge || (ex.id != null ? `LC ${ex.id}` : '') });
    });
    if (b.t === 'fold' && Array.isArray(b.x)) collectExercises(b.x, out);
  });
  return out;
}

/** 载入整个题库的所有套卷内容，建立题目索引。
    inflight 去重：boot() 预热与用户点进题库页可能同时触发，不做去重会各跑一遍 */
const indexInflight = new Map();
function indexBank(bankId) {
  const b = BANK_BY_ID[bankId];
  if (!b) return Promise.resolve();
  if (b.sets.every((s) => setKeys.has(s.id))) return Promise.resolve();
  if (indexInflight.has(bankId)) return indexInflight.get(bankId);

  const p = Promise.all(
    b.sets.map(async (s) => {
      if (setKeys.has(s.id)) return;
      try {
        const set = await loadSet(s.id);
        setKeys.set(s.id, set ? collectKeys(set.blocks) : []);
        setExercises.set(s.id, set ? collectExercises(set.blocks) : []);
      } catch (e) {
        console.warn(`[bank] 套卷 ${s.id} 索引失败，题数将少算`, e);
        setKeys.set(s.id, []);
        setExercises.set(s.id, []);
      }
    })
  ).finally(() => indexInflight.delete(bankId));

  indexInflight.set(bankId, p);
  return p;
}

/** 某题库的题量与已攻克数 */
function bankStats(bankId) {
  const b = BANK_BY_ID[bankId];
  if (!b) return { total: 0, solved: 0 };
  const s = store.solved();
  const all = new Set();
  b.sets.forEach((x) => (setKeys.get(x.id) || []).forEach((k) => all.add(k)));
  return { total: all.size, solved: [...all].filter((k) => s.has(k)).length };
}

/** 单份套卷的题量与已攻克数 */
function setStats(setId) {
  const keys = setKeys.get(setId) || [];
  const s = store.solved();
  return { total: keys.length, solved: keys.filter((k) => s.has(k)).length };
}

/** 刷新题库相关的进度显示（侧栏计数与完成态 + 总览页进度条） */
function refreshBankProgress() {
  BANKS.forEach((b) => {
    const st = bankStats(b.id);
    const badge = $(`[data-bank-count="${b.id}"]`);
    if (badge) badge.textContent = `${st.solved}/${st.total}`;
  });
  BANK_SETS.forEach((s) => {
    const st = setStats(s.id);
    const bar = $(`[data-set-bar="${s.id}"]`);
    if (bar) bar.style.width = st.total ? `${(st.solved / st.total) * 100}%` : '0%';
    const n = $(`[data-set-n="${s.id}"]`);
    if (n) n.textContent = st.total ? `${st.solved}/${st.total} 题` : '—';
    // 整卷做完时侧栏点亮，与课程侧的 is-done 对齐
    const item = $(`.nav-item[data-set="${s.id}"]`);
    if (item) item.classList.toggle('is-done', st.total > 0 && st.solved === st.total);
  });
}

function refreshProgress() {
  const done = store.done();

  $$('.nav-item').forEach((a) => {
    a.classList.toggle('is-done', done.has(a.dataset.lesson));
  });

  MODULES.forEach((m) => {
    const c = m.lessons.filter((l) => done.has(l.id)).length;
    const badge = $(`[data-count="${m.id}"]`);
    if (badge) badge.textContent = `${c}/${m.lessons.length}`;
    const bar = $(`[data-track-bar="${m.id}"]`);
    if (bar) bar.style.width = `${(c / m.lessons.length) * 100}%`;
    const pct = $(`[data-track-pct="${m.id}"]`);
    if (pct) pct.textContent = `${Math.round((c / m.lessons.length) * 100)}%`;
  });

  const total = done.size;
  const p = Math.round((total / TOTAL_LESSONS) * 100);
  $('#progFill').style.width = `${p}%`;
  $('#progTxt').textContent = `已完成 ${total} / ${TOTAL_LESSONS} 节 · ${p}%`;
}

function markActiveNav(lessonId) {
  $$('.nav-item').forEach((a) => a.classList.toggle('is-active', !!lessonId && a.dataset.lesson === lessonId));
  const meta = LESSON_BY_ID[lessonId];
  if (meta) {
    const g = $(`.nav-group[data-mod="${meta.mod}"]`);
    if (g && !g.classList.contains('is-open')) {
      g.classList.add('is-open');
      g.querySelector('.nav-group__head').setAttribute('aria-expanded', 'true');
    }
    const item = $(`.nav-item[data-lesson="${lessonId}"]`);
    if (item) requestAnimationFrame(() => item.scrollIntoView({ block: 'nearest' }));
  }
}

/* ============================================================
   路由
   ============================================================ */
function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'l' && parts[1]) return { view: 'lesson', id: parts[1] };
  if (parts[0] === 'm' && parts[1]) return { view: 'module', id: parts[1] };
  if (parts[0] === 'q' && parts[1]) return { view: 'set', id: parts[1] };
  if (parts[0] === 'b' && parts[1]) return { view: 'bank', id: parts[1] };
  return { view: 'home' };
}

async function route() {
  state.players.forEach((p) => p.destroy && p.destroy());
  state.players = [];
  clearTimers();

  const r = parseHash();
  state.route = r;
  const view = $('#view');
  closeSidebar();

  if (r.view === 'lesson') await renderLessonView(r.id, view);
  else if (r.view === 'module') renderModuleView(r.id, view);
  else if (r.view === 'set') await renderSetView(r.id, view);
  else if (r.view === 'bank') renderBankView(r.id, view);
  else renderHome(view);

  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ============================================================
   首页
   ============================================================ */
function renderHome(view) {
  $('#crumb').innerHTML = `<b>首页</b>`;
  markActiveNav(null);

  const done = store.done();
  const last = store.last();
  const lastMeta = last ? LESSON_BY_ID[last] : null;

  const resume = lastMeta
    ? `<a class="resume" href="#/l/${lastMeta.id}">
         <span class="resume__ico">${icon('play')}</span>
         <span class="resume__body">
           <span class="resume__lab">继续学习</span>
           <span class="resume__ttl">${lastMeta.title}</span>
         </span>
         <span class="btn btn--primary">继续 ${icon('arrowR')}</span>
       </a>`
    : '';

  const tracks = MODULES.map((m) => {
    const c = m.lessons.filter((l) => done.has(l.id)).length;
    const pct = Math.round((c / m.lessons.length) * 100);
    return `
      <a class="track" href="#/m/${m.id}" style="--tone:var(--${m.tone});--tone-soft:var(--${m.tone}-soft)">
        <div class="track__top">
          <span class="track__ico">${icon(m.icon)}</span>
          <span class="track__n">${m.lessons.length} 节</span>
        </div>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
        <div class="track__tags">${m.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="track__foot">
          <span class="track__bar"><i data-track-bar="${m.id}" style="width:${pct}%"></i></span>
          <span class="track__pct" data-track-pct="${m.id}">${pct}%</span>
        </div>
      </a>`;
  }).join('');

  const feats = [
    { i: 'play', tone: 'primary', h: '逐帧动画', p: '每个算法都拆成可回退的帧序列，播放、单步、拖动进度条随你控制。' },
    { i: 'terminal', tone: 'sky', h: '代码同步高亮', p: '动画执行到哪一行，伪代码就高亮到哪一行，把抽象过程落回具体语句。' },
    { i: 'target', tone: 'accent', h: '随堂自测', p: '关键概念后立刻检验理解，答错给出解释而不是只判对错。' },
    { i: 'gauge', tone: 'violet', h: '复杂度对照', p: '每种结构与算法都标注时空复杂度，并说明常数因子在真实场景的影响。' },
    { i: 'shuffle', tone: 'rose', h: '可换输入', p: '大部分演示支持自定义数组、图与参数，用你自己的数据跑一遍。' },
    { i: 'checkCircle', tone: 'lime', h: '进度记录', p: '学习进度存在本地浏览器，随时回来接着上次的位置继续。' },
  ]
    .map(
      (f) => `<div class="feat" style="--tone:var(--${f.tone});--tone-soft:var(--${f.tone}-soft)">
        <div class="feat__ico">${icon(f.i)}</div>
        <h4>${f.h}</h4><p>${f.p}</p></div>`
    )
    .join('');

  const lastSetMeta = SET_BY_ID[store.lastSet()];
  const bankResume = lastSetMeta
    ? `<a class="track track--bank" href="#/q/${lastSetMeta.id}" style="--tone:var(--${lastSetMeta.bankTone});--tone-soft:var(--${lastSetMeta.bankTone}-soft)">
         <div class="track__top">
           <span class="track__ico">${icon('play')}</span>
           <span class="track__n">继续做题</span>
         </div>
         <h3>${lastSetMeta.title}</h3>
         <p>上次练到这里，接着往下做。</p>
         <div class="track__tags"><span>${lastSetMeta.bankTitle}</span><span>${SET_KIND_LABEL.get(lastSetMeta.kind) || ''}</span></div>
       </a>`
    : '';

  const bankCards = BANKS.map(
    (b) => `
      <a class="track track--bank" href="#/b/${b.id}" style="--tone:var(--${b.tone});--tone-soft:var(--${b.tone}-soft)">
        <div class="track__top">
          <span class="track__ico">${icon(b.icon)}</span>
          <span class="track__n">${b.sets.length} 份套卷</span>
        </div>
        <h3>${b.title}</h3>
        <p>${b.desc}</p>
        <div class="track__tags">${b.tags.map((t) => `<span>${t}</span>`).join('')}</div>
      </a>`
  ).join('');

  view.innerHTML = `
<div class="home">
  <section class="hero">
    <span class="hero__tag"><span class="dot"></span>${TOTAL_LESSONS} 节课 · 60+ 个可交互动画 · 全中文</span>
    <h1 class="hero__title">把算法<span class="grad">看</span>明白，<br>而不是背下来</h1>
    <p class="hero__lede">
      一套从 Python 基础到图论、再到 AI Agent 编排的系统化复健路线。
      每个抽象概念都配一个能单步执行的动画——先看见它怎么动，再理解它为什么这么写。
    </p>
    <div class="hero__cta">
      <a class="btn btn--primary" href="#/l/${FLAT[0].id}">${icon('play')} 从第一课开始</a>
      <a class="btn" href="#/m/dsa">${icon('compass')} 浏览完整路线</a>
    </div>
    <div class="hero__stats">
      <div class="hstat"><div class="hstat__n">5</div><div class="hstat__l">学习模块</div></div>
      <div class="hstat"><div class="hstat__n">${TOTAL_LESSONS}</div><div class="hstat__l">课程节数</div></div>
      <div class="hstat"><div class="hstat__n">60+</div><div class="hstat__l">动画演示</div></div>
      <div class="hstat"><div class="hstat__n">0</div><div class="hstat__l">构建依赖</div></div>
    </div>
  </section>

  ${resume}

  <section>
    <div class="section-head">
      <h2>学习路线</h2>
      <p>建议按顺序推进；已有基础可以直接跳到感兴趣的模块。</p>
    </div>
    <div class="track-grid">${tracks}</div>
  </section>

  <section>
    <div class="section-head">
      <h2>专项题库</h2>
      <p>课程之外的另一条线：不按知识点推进，按笔试真题的考察点与套卷组织，练到不会随时跳回课程。</p>
    </div>
    <div class="track-grid">${bankResume}${bankCards}</div>
  </section>

  <section>
    <div class="section-head">
      <h2>这个站点是怎么教的</h2>
      <p>比起「讲清楚」，更重要的是让你能自己动手把过程走一遍。</p>
    </div>
    <div class="feat-grid">${feats}</div>
  </section>

  <footer class="foot">
    <p>Relearn · 纯静态站点，无需服务器与构建工具 · 进度保存在浏览器 <code>localStorage</code></p>
  </footer>
</div>`;
}

/* ============================================================
   模块目录页
   ============================================================ */
function renderModuleView(modId, view) {
  const m = MODULE_BY_ID[modId];
  if (!m) return renderHome(view);

  $('#crumb').innerHTML = `<a href="#/">首页</a><span class="sep">/</span><b>${m.title}</b>`;
  markActiveNav(null);

  const done = store.done();
  const c = m.lessons.filter((l) => done.has(l.id)).length;

  const items = m.lessons
    .map((l, i) => {
      const isDone = done.has(l.id);
      return `
      <a class="track" href="#/l/${l.id}" style="--tone:var(--${isDone ? 'ok' : m.tone});--tone-soft:var(--${isDone ? 'ok' : m.tone}-soft)">
        <div class="track__top">
          <span class="track__ico">${isDone ? icon('checkCircle') : `<span style="font-family:var(--font-mono);font-weight:700;font-size:15px">${String(i + 1).padStart(2, '0')}</span>`}</span>
          <span class="track__n">${l.time} 分钟</span>
        </div>
        <h3>${l.title}</h3>
        <div class="track__tags">
          <span>${l.level}</span>${isDone ? '<span style="color:var(--ok)">已完成</span>' : ''}
        </div>
      </a>`;
    })
    .join('');

  view.innerHTML = `
<div class="home">
  <section class="hero" style="padding-top:var(--sp-6);text-align:left">
    <span class="hero__tag" style="--tone:var(--${m.tone})">
      <span style="color:var(--${m.tone});display:inline-flex">${icon(m.icon)}</span>
      模块 · ${m.lessons.length} 节 · 已完成 ${c}
    </span>
    <h1 class="hero__title" style="font-size:var(--fs-3xl)">${m.title}</h1>
    <p class="hero__lede" style="margin-left:0">${m.desc}</p>
    <div class="hero__cta" style="justify-content:flex-start">
      <a class="btn btn--primary" href="#/l/${m.lessons[0].id}">${icon('play')} 开始学习</a>
      <a class="btn" href="#/">${icon('arrowL')} 返回首页</a>
    </div>
  </section>
  <section>
    <div class="section-head"><h2>课程列表</h2><p>点击任意一节直接进入。</p></div>
    <div class="track-grid">${items}</div>
  </section>
</div>`;
}

/* ============================================================
   题库总览页
   ============================================================ */
function renderBankView(bankId, view) {
  const b = BANK_BY_ID[bankId];
  if (!b) return renderHome(view);

  $('#crumb').innerHTML = `<a href="#/">首页</a><span class="sep">/</span><b>${b.title}</b>`;
  markActiveNav(null);
  markActiveSet(`__bank_${bankId}`);

  const mockTime = (b.sets.find((s) => s.kind === 'mock') || {}).time;
  const groups = [
    { kind: 'guide', h: '先读这个', p: '不了解考试形态就刷题，效率会差很多。' },
    { kind: 'topic', h: '考察点专项', p: '按华为机试的高频考点成卷，每项练透一类题。' },
    { kind: 'mock', h: '限时模拟卷', p: `三道题${mockTime ? ` ${mockTime} 分钟` : ''}，完全照搬真实机考的题量与节奏。` },
  ];

  const sections = groups
    .map((g) => {
      const list = b.sets.filter((s) => s.kind === g.kind);
      if (!list.length) return '';
      const cards = list
        .map((s) => {
          const kindLab = SET_KIND_LABEL.get(s.kind) || '';
          return `
      <a class="track" href="#/q/${s.id}" style="--tone:var(--${b.tone});--tone-soft:var(--${b.tone}-soft)">
        <div class="track__top">
          <span class="track__ico">${icon(s.kind === 'mock' ? 'clock' : s.kind === 'guide' ? 'book' : 'target')}</span>
          <span class="track__n">${s.time} 分钟</span>
        </div>
        <h3>${s.title}</h3>
        <div class="track__tags"><span>${kindLab}</span><span>${s.level}</span></div>
        <div class="track__foot">
          <span class="track__bar"><i data-set-bar="${s.id}" style="width:0%"></i></span>
          <span class="track__pct" data-set-n="${s.id}">—</span>
        </div>
      </a>`;
        })
        .join('');
      return `<section>
        <div class="section-head"><h2>${g.h}</h2><p>${g.p}</p></div>
        <div class="track-grid">${cards}</div>
      </section>`;
    })
    .join('');

  view.innerHTML = `
<div class="home">
  <section class="hero" style="padding-top:var(--sp-6);text-align:left">
    <span class="hero__tag" style="--tone:var(--${b.tone})">
      <span style="color:var(--${b.tone});display:inline-flex">${icon(b.icon)}</span>
      题库 · ${b.sets.length} 份套卷
    </span>
    <h1 class="hero__title" style="font-size:var(--fs-3xl)">${b.title}</h1>
    <p class="hero__lede" style="margin-left:0">${b.desc}</p>
    <div class="hero__cta" style="justify-content:flex-start">
      <a class="btn btn--primary" href="#/q/${b.sets[0].id}">${icon('play')} 从导读开始</a>
      <a class="btn" href="#/">${icon('arrowL')} 返回首页</a>
    </div>
    <div class="hero__stats" style="justify-content:flex-start">
      <div class="hstat"><div class="hstat__n" data-bank-total="${b.id}">—</div><div class="hstat__l">收录题目</div></div>
      <div class="hstat"><div class="hstat__n" data-bank-solved="${b.id}">—</div><div class="hstat__l">已攻克</div></div>
      <div class="hstat"><div class="hstat__n">${b.sets.filter((s) => s.kind === 'mock').length}</div><div class="hstat__l">模拟套卷</div></div>
    </div>
  </section>
  ${sections}
</div>`;

  // 题目索引要读全部套卷内容，异步补齐进度数字
  indexBank(bankId).then(() => {
    if (state.route?.view !== 'bank' || state.route.id !== bankId) return;
    const st = bankStats(bankId);
    const t = $(`[data-bank-total="${bankId}"]`);
    const s = $(`[data-bank-solved="${bankId}"]`);
    if (t) t.textContent = String(st.total);
    if (s) s.textContent = String(st.solved);
    refreshBankProgress();
  });
}

/* ============================================================
   套卷页
   ============================================================ */
async function renderSetView(id, view) {
  const meta = SET_BY_ID[id];
  if (!meta) {
    view.innerHTML = `<div class="home"><section class="hero">
      <h1 class="hero__title" style="font-size:var(--fs-2xl)">找不到这份题单</h1>
      <p class="hero__lede">链接可能已经失效。</p>
      <div class="hero__cta"><a class="btn btn--primary" href="#/">回到首页</a></div>
    </section></div>`;
    return;
  }

  $('#crumb').innerHTML =
    `<a href="#/">首页</a><span class="sep">/</span>` +
    `<a href="#/b/${meta.bank}">${meta.bankTitle}</a><span class="sep">/</span><b>${meta.title}</b>`;

  markActiveNav(null);
  markActiveSet(id);
  store.setLastSet(id);

  view.innerHTML = `<div class="lesson-layout"><div class="lesson-body">
    <p style="color:var(--fg-muted);padding:var(--sp-6) 0">正在加载题单…</p>
  </div></div>`;

  let set;
  try {
    set = await loadSet(id);
  } catch (e) {
    console.error(e);
  }
  if (state.route?.view !== 'set' || state.route.id !== id) return;

  if (!set) {
    view.innerHTML = `<div class="lesson-layout"><div class="lesson-body"><article class="prose">
      <h1>${meta.title}</h1>
      <div class="callout callout--note"><span class="callout__icon">${icon('info')}</span>
      <div class="callout__body"><div class="callout__title">这份题单还在整理</div>
      <p>可以先看其它套卷。</p></div></div>
    </article></div></div>`;
    return;
  }

  const keys = collectKeys(set.blocks);
  setKeys.set(id, keys);

  const { html, toc, vizzes, timers } = renderSet({
    ...set,
    kindLabel: SET_KIND_LABEL.get(meta.kind),
    count: keys.length || undefined,
  });
  const nb = setNeighbors(id);

  const pager = `
<nav class="pager">
  ${nb.prev
      ? `<a class="pager__btn" href="#/q/${nb.prev.id}">${icon('arrowL')}
         <span class="pager__inner"><span class="pager__lab">上一份</span>
         <span class="pager__ttl">${nb.prev.title}</span></span></a>`
      : '<span></span>'}
  ${nb.next
      ? `<a class="pager__btn pager__btn--next" href="#/q/${nb.next.id}">
         <span class="pager__inner"><span class="pager__lab">下一份</span>
         <span class="pager__ttl">${nb.next.title}</span></span>${icon('arrowR')}</a>`
      : '<span></span>'}
</nav>`;

  const bar = keys.length
    ? `<div class="done-bar">
         <span class="done-bar__txt">本卷共 ${keys.length} 题，攻克进度 <b data-set-live="${id}">0 / ${keys.length}</b>。逐题点「标记攻克」记录，进度存在本地。</span>
         <a class="btn" href="#/b/${meta.bank}">${icon('list')}<span>题库总览</span></a>
       </div>`
    : '';

  const tocHtml = toc.length
    ? `<aside class="toc"><div class="toc__title">本卷目录</div>
       ${toc.map((t) => `<a href="#${t.id}" class="lv-${t.lv}" data-toc="${t.id}">${t.text}</a>`).join('')}
       </aside>`
    : '<aside></aside>';

  view.innerHTML = `<div class="lesson-layout">
    <div class="lesson-body">${html}${bar}${pager}</div>
    ${tocHtml}
  </div>`;

  // 交互绑定放在 viz 懒加载之前：getViz() 首次是真实网络往返，
  // 尽早绑定复制按钮，避免首屏代码块交互延迟。
  bindSolve(view, id);
  bindTimers(view, timers);
  bindQuiz(view);
  bindCopy(view);
  initTocSpy(toc);
  refreshSetLive(id, view);

  if (vizzes.length) {
    const { mountViz } = await getViz();
    // getViz() 会让出控制权，回来时路由可能已经切走：
    // 此时继续挂载会把旧页面的动画挂到新页面上
    if (state.route?.view !== 'set' || state.route.id !== id) return;
    vizzes.forEach((v) => {
      const host = document.getElementById(v.uid);
      if (!host) return;
      try {
        const p = mountViz(v.kind, host, v.opts);
        if (p) state.players.push(p);
      } catch (e) {
        console.error(`[viz:${v.kind}]`, e);
      }
    });
  }
}

/** 套卷页顶部「攻克 N / M」实时数字 + 每张卡片的按钮态 */
function refreshSetLive(setId, root = document) {
  const st = setStats(setId);
  const live = $(`[data-set-live="${setId}"]`, root);
  if (live) live.textContent = `${st.solved} / ${st.total}`;
  const solved = store.solved();
  $$('[data-solve]', root).forEach((btn) => {
    const on = solved.has(btn.dataset.solve);
    btn.classList.toggle('is-on', on);
    btn.innerHTML = `${icon(on ? 'checkCircle' : 'circle')}<span>${on ? '已攻克' : '标记攻克'}</span>`;
    btn.closest('.ex-card')?.classList.toggle('is-solved', on);
  });
}

function bindSolve(root, setId) {
  $$('[data-solve]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleSolved(btn.dataset.solve);
      refreshSetLive(setId, root);
      refreshBankProgress();
    });
  });
}

/** 模拟卷倒计时：只在当前页存活，切路由由 clearTimers() 统一回收 */
function bindTimers(root, timers) {
  (timers || []).forEach(({ uid, mins }) => {
    const clock = $(`[data-timer-clock="${uid}"]`, root);
    const go = $(`[data-timer-go="${uid}"]`, root);
    const rs = $(`[data-timer-rs="${uid}"]`, root);
    const box = $(`[data-timer="${uid}"]`, root);
    if (!clock || !go || !rs) return;

    const total = mins * 60;
    let left = total;
    let tick = null;

    const paint = () => {
      const h = Math.floor(left / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = left % 60;
      clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      box?.classList.toggle('is-warn', left > 0 && left <= 600);
      box?.classList.toggle('is-over', left === 0);
    };

    const stop = (finished) => {
      if (tick) clearInterval(tick);
      state.timers = state.timers.filter((x) => x !== tick);
      tick = null;
      if (finished) {
        go.disabled = true;
        go.innerHTML = `${icon('checkCircle')}<span>时间到</span>`;
      } else {
        go.innerHTML = `${icon('play')}<span>继续</span>`;
      }
    };

    go.addEventListener('click', () => {
      if (tick) { stop(); return; }
      if (left <= 0) return;
      tick = setInterval(() => {
        left = Math.max(0, left - 1);
        paint();
        if (left === 0) stop(true);
      }, 1000);
      state.timers.push(tick);
      go.innerHTML = `${icon('pause')}<span>暂停</span>`;
    });

    rs.addEventListener('click', () => {
      stop();
      left = total;
      go.disabled = false;
      paint();
      go.innerHTML = `${icon('play')}<span>开始</span>`;
    });

    paint();
  });
}

function markActiveSet(setId) {
  $$('.nav-item[data-set]').forEach((a) => a.classList.toggle('is-active', a.dataset.set === setId));
  const meta = SET_BY_ID[setId];
  const bankId = meta ? meta.bank : String(setId || '').replace(/^__bank_/, '');
  const g = $(`.nav-group[data-mod="bank:${bankId}"]`);
  if (g && !g.classList.contains('is-open')) {
    g.classList.add('is-open');
    g.querySelector('.nav-group__head').setAttribute('aria-expanded', 'true');
  }
}

/* ============================================================
   课程页
   ============================================================ */
async function renderLessonView(id, view) {
  const meta = LESSON_BY_ID[id];
  if (!meta) {
    view.innerHTML = `<div class="home"><section class="hero">
      <h1 class="hero__title" style="font-size:var(--fs-2xl)">找不到这节课</h1>
      <p class="hero__lede">链接可能已经失效。</p>
      <div class="hero__cta"><a class="btn btn--primary" href="#/">回到首页</a></div>
    </section></div>`;
    return;
  }

  $('#crumb').innerHTML =
    `<a href="#/">首页</a><span class="sep">/</span>` +
    `<a href="#/m/${meta.mod}">${meta.modTitle}</a><span class="sep">/</span><b>${meta.title}</b>`;

  markActiveNav(id);
  store.setLast(id);

  view.innerHTML = `<div class="lesson-layout"><div class="lesson-body">
    <p style="color:var(--fg-muted);padding:var(--sp-6) 0">正在加载课程…</p>
  </div></div>`;

  let lesson;
  try {
    lesson = await loadLesson(id);
  } catch (e) {
    console.error(e);
  }

  if (!lesson) {
    view.innerHTML = `<div class="lesson-layout"><div class="lesson-body"><article class="prose">
      <h1>${meta.title}</h1>
      <div class="callout callout--note"><span class="callout__icon">${icon('info')}</span>
      <div class="callout__body"><div class="callout__title">本节内容正在完善</div>
      <p>这一节的正文还没有写完。你可以先学习其它章节。</p></div></div>
    </article></div></div>`;
    return;
  }

  const { html, toc, vizzes } = renderLesson(lesson);
  const nb = neighbors(id);
  const isDone = store.isDone(id);

  const pager = `
<nav class="pager">
  ${nb.prev
      ? `<a class="pager__btn" href="#/l/${nb.prev.id}">${icon('arrowL')}
         <span class="pager__inner"><span class="pager__lab">上一节</span>
         <span class="pager__ttl">${nb.prev.title}</span></span></a>`
      : '<span></span>'}
  ${nb.next
      ? `<a class="pager__btn pager__btn--next" href="#/l/${nb.next.id}">
         <span class="pager__inner"><span class="pager__lab">下一节</span>
         <span class="pager__ttl">${nb.next.title}</span></span>${icon('arrowR')}</a>`
      : '<span></span>'}
</nav>`;

  const doneBar = `
<div class="done-bar">
  <span class="done-bar__txt">学完了？标记一下，进度会保存在本地。</span>
  <button class="btn ${isDone ? 'btn--ok' : 'btn--primary'}" id="doneBtn" type="button">
    ${icon(isDone ? 'checkCircle' : 'check')}<span>${isDone ? '已完成' : '标记为已完成'}</span>
  </button>
</div>`;

  const tocHtml = toc.length
    ? `<aside class="toc"><div class="toc__title">本节目录</div>
       ${toc.map((t) => `<a href="#${t.id}" class="lv-${t.lv}" data-toc="${t.id}">${t.text}</a>`).join('')}
       </aside>`
    : '<aside></aside>';

  view.innerHTML = `<div class="lesson-layout">
    <div class="lesson-body">${html}${doneBar}${pager}</div>
    ${tocHtml}
  </div>`;

  // 完成按钮与交互绑定放在 viz 懒加载之前：
  // getViz() 首次是真实网络往返，代码块按钮先绑定，动画随后加载。
  const btn = $('#doneBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const now = store.toggleDone(id);
      btn.className = `btn ${now ? 'btn--ok' : 'btn--primary'}`;
      btn.innerHTML = `${icon(now ? 'checkCircle' : 'check')}<span>${now ? '已完成' : '标记为已完成'}</span>`;
      refreshProgress();
      if (now && nb.next) setTimeout(() => { location.hash = `#/l/${nb.next.id}`; }, 480);
    });
  }

  bindQuiz(view);
  bindCopy(view);
  initTocSpy(toc);

  // 挂载可视化（懒加载，渲染时若已切换路由则放弃）
  if (vizzes.length) {
    const { mountViz } = await getViz();
    // getViz() 让出后路由可能已切走，此后的挂载都会作用在新页面的 DOM 上
    if (state.route?.view !== 'lesson' || state.route.id !== id) return;
    vizzes.forEach((v) => {
      const host = document.getElementById(v.uid);
      if (!host) return;
      try {
        const p = mountViz(v.kind, host, v.opts);
        if (p) state.players.push(p);
      } catch (e) {
        console.error(`[viz:${v.kind}]`, e);
        host.outerHTML = `<div class="callout callout--warn"><span class="callout__icon">${icon('alert')}</span>
          <div class="callout__body"><div class="callout__title">动画加载失败</div>
          <p>演示 <code>${v.kind}</code> 无法渲染，其余内容不受影响。</p></div></div>`;
      }
    });
  }
}

/* ============================================================
   交互绑定
   ============================================================ */
function bindQuiz(root) {
  $$('[data-quiz]', root).forEach((b) => {
    b.addEventListener('click', () => {
      const box = $(`[data-quiz-box="${b.dataset.quiz}"]`, root);
      if (!box || box.dataset.answered) return;
      box.dataset.answered = '1';
      const ans = +box.dataset.answer;
      const pick = +b.dataset.i;
      $$('[data-quiz]', box).forEach((o) => {
        o.disabled = true;
        const i = +o.dataset.i;
        if (i === ans) o.classList.add('is-right');
        else if (i === pick) o.classList.add('is-wrong');
      });
      const exp = $(`[data-quiz-exp="${b.dataset.quiz}"]`, root);
      if (exp && exp.textContent.trim()) exp.classList.add('is-on');
    });
  });
}

function bindCopy(root) {
  $$('[data-copy]', root).forEach((b) => {
    b.addEventListener('click', async () => {
      // 复制当前可见代码块。
      const code = b.closest('.codeblock').querySelector('pre:not([hidden]) code');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.innerText);
      } catch {
        const r = document.createRange();
        r.selectNode(code);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
        try { document.execCommand('copy'); } catch { /* ignore */ }
        s.removeAllRanges();
      }
      b.classList.add('is-ok');
      b.querySelector('span').textContent = '已复制';
      setTimeout(() => {
        b.classList.remove('is-ok');
        b.querySelector('span').textContent = '复制';
      }, 1600);
    });
  });
}

let tocObserver = null;
function initTocSpy(toc) {
  if (tocObserver) tocObserver.disconnect();
  if (!toc.length) return;
  const links = new Map($$('[data-toc]').map((a) => [a.dataset.toc, a]));
  tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = links.get(e.target.id);
        if (a) a.classList.add('is-active');
      });
    },
    { rootMargin: '-70px 0px -72% 0px', threshold: 0 }
  );
  toc.forEach((t) => {
    const h = document.getElementById(t.id);
    if (h) tocObserver.observe(h);
  });
}

/* ============================================================
   搜索
   ============================================================ */
function initSearch() {
  const input = $('#search');
  const panel = $('#searchPanel');
  let sel = -1;

  const close = () => { panel.classList.remove('is-on'); sel = -1; };

  const run = (q) => {
    const s = q.trim().toLowerCase();
    if (!s) return close();

    /* 课程与题库套卷一起搜，用 href/sub 抹平两者差异 */
    const pool = [
      ...FLAT.map((l) => ({
        href: `#/l/${l.id}`,
        title: l.title,
        group: l.modTitle,
        id: l.id,
        sub: `${l.modTitle} · ${l.level} · ${l.time} 分钟`,
      })),
      ...BANK_SETS.map((x) => ({
        href: `#/q/${x.id}`,
        title: x.title,
        group: x.bankTitle,
        id: x.id,
        sub: `${x.bankTitle} · ${SET_KIND_LABEL.get(x.kind) || ''} · ${x.time} 分钟`,
      })),
      /* 题库里的具体题目也可搜（题名/题号）；索引由 indexBank 空闲预热，没热完就先少见几条 */
      ...BANK_SETS.flatMap((x) =>
        (setExercises.get(x.id) || []).map((ex) => ({
          href: `#/q/${x.id}`,
          title: ex.title,
          group: x.title,
          id: x.id,
          badge: ex.badge,
          sub: `${x.title}${ex.badge ? ` · ${ex.badge}` : ''}`,
        }))
      ),
    ];

    const hits = pool
      .map((l) => {
        const t = l.title.toLowerCase();
        const m = l.group.toLowerCase();
        let score = 0;
        if (t.includes(s)) score = t.startsWith(s) ? 100 : 60;
        else if (l.badge && l.badge.toLowerCase().includes(s)) score = 50;
        else if (m.includes(s)) score = 30;
        else if (l.id.includes(s)) score = 40;
        return { l, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (!hits.length) {
      panel.innerHTML = `<div class="search-panel__empty">没有找到「${escapeHtml(q)}」相关的课程</div>`;
      panel.classList.add('is-on');
      return;
    }

    panel.innerHTML = hits
      .map(
        ({ l }, i) =>
          `<button class="sr-item" type="button" data-go="${escapeAttr(l.href)}" data-i="${i}">
             <div class="sr-item__t">${mark(l.title, s)}</div>
             <div class="sr-item__m">${escapeHtml(l.sub)}</div>
           </button>`
      )
      .join('');
    panel.classList.add('is-on');
    sel = -1;

    $$('[data-go]', panel).forEach((b) => {
      b.addEventListener('click', () => {
        location.hash = b.dataset.go;
        input.value = '';
        close();
      });
    });
  };

  input.addEventListener('input', () => run(input.value));
  input.addEventListener('focus', () => { if (input.value.trim()) run(input.value); });

  input.addEventListener('keydown', (e) => {
    const items = $$('[data-go]', panel);
    if (e.key === 'Escape') { input.blur(); close(); return; }
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; }
    else if (e.key === 'Enter') {
      e.preventDefault();
      (items[sel] || items[0]).click();
      return;
    } else return;
    items.forEach((x, i) => x.classList.toggle('is-sel', i === sel));
    items[sel].scrollIntoView({ block: 'nearest' });
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== input) close();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSidebar();
      input.focus();
      input.select();
    }
  });
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 插进 HTML 属性时还要处理引号，否则 " 会截断属性 */
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

function mark(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, i)) +
    `<mark>${escapeHtml(text.slice(i, i + q.length))}</mark>` +
    escapeHtml(text.slice(i + q.length))
  );
}

/* ============================================================
   移动端侧栏
   ============================================================ */
function openSidebar() {
  $('#sidebar').classList.add('is-open');
  $('#scrim').classList.add('is-on');
}
function closeSidebar() {
  $('#sidebar').classList.remove('is-open');
  $('#scrim').classList.remove('is-on');
}

/* ============================================================
   启动
   ============================================================ */
function boot() {
  // 图标注入
  $('#menuBtn').innerHTML = icon('menu');
  $('#searchIco').outerHTML = icon('search');

  initTheme();
  buildSidebar();
  refreshProgress();
  initSearch();

  // 题库内容较大，等浏览器空闲再索引，别和首屏抢带宽
  const warmBanks = () => BANKS.forEach((b) => {
    indexBank(b.id).then(refreshBankProgress).catch(() => {});
  });
  if (typeof requestIdleCallback === 'function') requestIdleCallback(warmBanks, { timeout: 4000 });
  else setTimeout(warmBanks, 1500);

  $('#menuBtn').addEventListener('click', () => {
    $('#sidebar').classList.contains('is-open') ? closeSidebar() : openSidebar();
  });
  $('#scrim').addEventListener('click', closeSidebar);

  window.addEventListener('hashchange', route);
  route();

  // 全局快捷键：上下节切换
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (state.route?.view !== 'lesson') return;
    const nb = neighbors(state.route.id);
    if (e.key === 'j' && nb.next) location.hash = `#/l/${nb.next.id}`;
    if (e.key === 'k' && nb.prev) location.hash = `#/l/${nb.prev.id}`;
  });
}

document.addEventListener('DOMContentLoaded', boot);
