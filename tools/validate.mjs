/* ============================================================
   集成校验：注册表 ↔ 课程内容 ↔ 动画注册 三方一致性
   运行：node tools/validate.mjs
   ============================================================ */

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(resolve(root, p)).href);

const KNOWN_BLOCKS = new Set([
  'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'code', 'callout', 'table',
  'quiz', 'steps', 'cards', 'fold', 'viz', 'hr', 'quote', 'html',
  'exercises', 'timer', 'paper',
]);

const EX_LEVELS = new Set(['简单', '中等', '困难', '入门', '进阶', '挑战']);
const EX_FREQS = new Set(['高频', '常考', '经典', '冷门']);

const CALLOUT_KINDS = new Set(['tip', 'note', 'warn', 'danger', 'key']);
/* 会被拼进 class / style / 属性选择器的标识符，必须限定字符集 */
const ID_RE = /^[a-z0-9-]+$/;

let errors = 0, warns = 0;
const err = (m) => { errors++; console.error(`  ✗ ${m}`); };
const warn = (m) => { warns++; console.warn(`  ! ${m}`); };

/** 数值字段：必须是真正的 number。`+v` 强转会让 ''/[]/null/true 全部漏网 */
const numField = (v, q, name) => {
  if (v == null) return;
  if (typeof v !== 'number' || !Number.isFinite(v)) err(`${q}: ${name} 必须是有限数字（当前 ${JSON.stringify(v)}）`);
};

/* ---------- 载入注册表 ---------- */
const { MODULES } = await load('assets/js/core/registry.js');

/* ---------- 载入动画注册 ---------- */
let VIZ_KINDS = new Set();
try {
  const vizIndex = await load('assets/js/viz/index.js');
  VIZ_KINDS = new Set(vizIndex.VIZ_KINDS);
  console.log(`\n动画注册表：${VIZ_KINDS.size} 个 kind`);
} catch (e) {
  err(`viz/index.js 无法加载：${e.message}`);
}

/* ---------- 逐模块校验 ---------- */
const usedKinds = new Set();

function* walkBlocks(blocks, path = '') {
  for (let i = 0; i < (blocks || []).length; i++) {
    const b = blocks[i];
    yield [b, `${path}[${i}]`];
    if (b && b.t === 'fold' && Array.isArray(b.x)) yield* walkBlocks(b.x, `${path}[${i}].x`);
  }
}

/**
 * 校验一个块，返回它贡献的统计量。课程与题库共用，避免两套规则漂移。
 * @param {object} b 块
 * @param {string} q 定位串（用于报错）
 * @param {object} opt { lessonIds: Set, keySeen: Map } —— 题库才传，用于回链与 key 唯一性检查
 */
function checkBlock(b, q, opt = {}) {
  const st = { quiz: false, code: false, viz: 0, ex: 0, keys: [] };

  if (b.t === 'quiz') {
    st.quiz = true;
    if (typeof b.answer !== 'number' || !Array.isArray(b.opts) || b.answer < 0 || b.answer >= b.opts.length)
      err(`${q}: quiz answer 越界`);
    if (!b.explain) warn(`${q}: quiz 缺少 explain`);
  }
  if (b.t === 'code') st.code = true;
  if (b.t === 'steps' && Array.isArray(b.x) && b.x.some((s) => s && s.code)) st.code = true;
  if (b.t === 'viz') st.viz = 1;

  if (b.t === 'code') {
    // name 会进 esc()，非字符串直接让渲染器崩整页，必须在门禁拦下
    if (b.name != null && typeof b.name !== 'string') err(`${q}: code.name 必须是字符串`);
  }
  if (b.t === 'steps' && Array.isArray(b.x))
    b.x.forEach((s, j) => {
      if (!s || !s.code) return;
      if (s.name != null && typeof s.name !== 'string') err(`${q}.x[${j}]: steps.name 必须是字符串`);
    });

  // kind / tone 会被拼进 class 与 style 属性，必须走白名单
  if (b.t === 'callout' && b.kind != null && !CALLOUT_KINDS.has(b.kind))
    err(`${q}: callout kind "${b.kind}" 不在 ${[...CALLOUT_KINDS].join('/')} 中`);
  if (b.t === 'cards' && Array.isArray(b.x))
    b.x.forEach((c, j) => {
      if (c && c.tone != null && (typeof c.tone !== 'string' || !ID_RE.test(c.tone)))
        err(`${q}.x[${j}]: cards tone "${c.tone}" 含非法字符`);
    });

  if (b.t === 'table') {
    if (!Array.isArray(b.head) || !Array.isArray(b.rows)) err(`${q}: table 缺 head/rows`);
    else for (const r of b.rows) if (r.length !== b.head.length) { warn(`${q}: table 行列数不齐`); break; }
  }

  // 渲染器会 Math.round 后钳到 1~600，mins=0.4 会渲染成一个点不动的死表，所以要求整数
  if (b.t === 'timer') {
    const m = +b.mins;
    if (!Number.isInteger(m) || m <= 0 || m > 600) err(`${q}: timer.mins 必须是 1~600 的整数`);
  }

  if (b.t === 'paper') {
    if (!Array.isArray(b.x) || !b.x.length) err(`${q}: paper.x 为空`);
    else b.x.forEach((r, j) => {
      if (!r || typeof r !== 'object') { err(`${q}.x[${j}]: paper 行必须是对象`); return; }
      if (!r.title) err(`${q}.x[${j}]: paper 行缺 title`);
      numField(r.score, `${q}.x[${j}]`, 'paper score');
      numField(r.limit, `${q}.x[${j}]`, 'paper limit');
    });
  }

  if (b.t === 'exercises') {
    if (!Array.isArray(b.x) || !b.x.length) { err(`${q}: exercises.x 为空`); return st; }
    st.ex = b.x.length;
    b.x.forEach((ex, j) => {
      const p = `${q}.x[${j}]`;
      if (!ex || !ex.title) { err(`${p}: 练习缺 title`); return; }
      // 力扣题（有 id 或无 badge）必须有链接；badge 型动手实验可以无链接
      if (!ex.slug && !ex.url && (ex.id != null || !ex.badge)) err(`${p}: 练习缺 slug/url（无法生成链接）`);
      if (ex.slug && !/^[a-z0-9-]+$/.test(ex.slug)) err(`${p}: slug "${ex.slug}" 含非法字符`);
      // 渲染器只放行 http(s) 且会 trim，校验器必须同口径拦住，否则线上会静默变成纯文本
      if (ex.url != null && typeof ex.url !== 'string') err(`${p}: url 必须是字符串`);
      else if (ex.url && !/^https?:\/\//i.test(ex.url)) err(`${p}: url 必须以 http(s) 开头`);
      if (typeof ex.url === 'string' && /["'<>\s]/.test(ex.url)) err(`${p}: url 含引号/尖括号/空格`);
      if (ex.badge != null && typeof ex.badge !== 'string') err(`${p}: badge 必须是字符串`);
      if (!ex.level) warn(`${p}: 练习缺 level 难度`);
      else if (!EX_LEVELS.has(ex.level)) err(`${p}: level "${ex.level}" 不在 ${[...EX_LEVELS].join('/')} 中`);
      if (!ex.why) warn(`${p}: 练习缺 why（练什么）`);
      if (!ex.hint) warn(`${p}: 练习缺 hint 思路提示`);
      if (!ex.insight) warn(`${p}: 练习缺 insight 完成后对照`);

      // ---- 题库专属字段 ----
      if (ex.freq != null) {
        if (typeof ex.freq !== 'string') err(`${p}: freq 必须是字符串`);
        else if (!EX_FREQS.has(ex.freq)) err(`${p}: freq "${ex.freq}" 不在 ${[...EX_FREQS].join('/')} 中`);
      }
      numField(ex.limit, p, 'limit（分钟）');
      numField(ex.score, p, 'score');
      if (ex.key != null) {
        if (typeof ex.key !== 'string' || !ID_RE.test(ex.key))
          err(`${p}: key "${ex.key}" 必须是小写字母/数字/连字符`);
        else st.keys.push(ex.key);
      } else if (opt.requireKey && ex.title) {
        // 题库的进度链路完全依赖 key，缺了这题就没有「标记攻克」按钮、也不计入分母
        err(`${p}: 题库题目必须有 key，否则无法记录攻克进度`);
      }
      if (ex.recall != null) {
        const rs = Array.isArray(ex.recall) ? ex.recall : [ex.recall];
        rs.forEach((r, k) => {
          const rp = `${p}.recall[${k}]`;
          if (!r || typeof r !== 'object') { err(`${rp}: recall 必须是对象 {to,text}`); return; }
          if (!r.text) err(`${rp}: recall 缺 text`);
          if (!r.to) { err(`${rp}: recall 缺 to（课程 id）`); return; }
          if (typeof r.to !== 'string' || !/^[a-z0-9-]+$/i.test(r.to)) err(`${rp}: recall.to "${r.to}" 含非法字符`);
          else if (opt.lessonIds && !opt.lessonIds.has(r.to)) err(`${rp}: recall.to "${r.to}" 不是已注册的课程 id`);
        });
      }
    });
  }

  return st;
}

for (const mod of MODULES) {
  console.log(`\n模块 ${mod.id}（${mod.title}）— ${mod.lessons.length} 节`);
  let content;
  try {
    content = (await load(`assets/js/content/${mod.id}.js`)).lessons;
  } catch (e) {
    err(`content/${mod.id}.js 加载失败：${e.message}`);
    continue;
  }

  for (const meta of mod.lessons) {
    const lesson = content[meta.id];
    if (!lesson) { err(`${meta.id}: 注册表有此课程但内容缺失`); continue; }
    if (!lesson.lede) warn(`${meta.id}: 缺少 lede 导语`);
    if (!Array.isArray(lesson.blocks) || !lesson.blocks.length) {
      err(`${meta.id}: blocks 为空`);
      continue;
    }

    let hasQuiz = false, hasCode = false, vizCount = 0, exCount = 0;
    for (const [b, p] of walkBlocks(lesson.blocks)) {
      if (!b || typeof b !== 'object') { err(`${meta.id}${p}: 非法块`); continue; }
      if (!KNOWN_BLOCKS.has(b.t)) { err(`${meta.id}${p}: 未知块类型 "${b.t}"`); continue; }
      if (b.t === 'timer' || b.t === 'paper') { err(`${meta.id}${p}: "${b.t}" 是题库专属块，课程内容不应使用`); continue; }
      if (b.t === 'viz') {
        usedKinds.add(b.kind);
        if (VIZ_KINDS.size && !VIZ_KINDS.has(b.kind)) err(`${meta.id}${p}: 引用了未注册的动画 "${b.kind}"`);
      }
      const st = checkBlock(b, `${meta.id}${p}`);
      hasQuiz = hasQuiz || st.quiz;
      hasCode = hasCode || st.code;
      vizCount += st.viz;
      exCount += st.ex;
    }

    const tags = [];
    if (!hasQuiz) tags.push('无quiz');
    if (!hasCode) tags.push('无code');
    if (!vizCount) tags.push('无viz');
    if (!exCount) tags.push('无练习');
    console.log(`  ✓ ${meta.id}（${lesson.blocks.length} 块${vizCount ? `，${vizCount} 动画` : ''}${exCount ? `，${exCount} 练习` : ''}）${tags.length ? '  ⚠ ' + tags.join(' ') : ''}`);
    if (!hasQuiz) warn(`${meta.id}: 没有自测题`);
    if (!hasCode) warn(`${meta.id}: 没有代码示例`);
  }

  // 内容文件里有、注册表中没有的课程
  for (const id of Object.keys(content)) {
    if (!mod.lessons.some((l) => l.id === id)) warn(`content/${mod.id}.js 含未注册课程 "${id}"`);
  }
}

/* ---------- 题库校验 ---------- */
const LESSON_IDS = new Set(MODULES.flatMap((m) => m.lessons.map((l) => l.id)));
const SET_KINDS = new Set(['guide', 'topic', 'mock']);

let BANKS = [];
try {
  ({ BANKS } = await load('assets/js/core/banks.js'));
} catch (e) {
  err(`core/banks.js 无法加载：${e.message}`);
}

/* key → 首次出现的套卷。store.solved() 是**跨题库共用的一个 Set**，
   所以唯一性必须跨题库检查，不能每个题库重置 */
const keySeen = new Map();

for (const bank of BANKS) {
  console.log(`\n题库 ${bank.id}（${bank.title}）— ${bank.sets.length} 份套卷`);

  // id / tone / icon 会被拼进属性、属性选择器与 style，必须限定字符集
  if (!ID_RE.test(bank.id)) err(`题库 id "${bank.id}" 必须是小写字母/数字/连字符`);
  if (!ID_RE.test(String(bank.tone))) err(`题库 ${bank.id}: tone "${bank.tone}" 含非法字符`);
  if (!Array.isArray(bank.sets) || !bank.sets.length) { err(`题库 ${bank.id}: sets 为空`); continue; }

  let content;
  try {
    content = (await load(`assets/js/content/banks/${bank.id}.js`)).sets;
  } catch (e) {
    err(`content/banks/${bank.id}.js 加载失败：${e.message}`);
    continue;
  }

  const linkSeen = new Map();   // 题目链接 → 首次出现的套卷（跨卷重复只警告，同卷重复才报错）
  let bankTotal = 0;

  for (const meta of bank.sets) {
    if (!ID_RE.test(String(meta.id))) err(`套卷 id "${meta.id}" 必须是小写字母/数字/连字符`);
    if (!SET_KINDS.has(meta.kind)) err(`${meta.id}: kind "${meta.kind}" 不在 ${[...SET_KINDS].join('/')} 中`);

    const set = content[meta.id];
    if (!set) { err(`${meta.id}: 注册表有此套卷但内容缺失`); continue; }
    if (!set.lede) warn(`${meta.id}: 缺少 lede 导语`);
    if (!Array.isArray(set.blocks) || !set.blocks.length) { err(`${meta.id}: blocks 为空`); continue; }

    let exCount = 0, timerCount = 0;
    const localKeys = [];
    const localSlugs = new Map();

    for (const [b, p] of walkBlocks(set.blocks)) {
      if (!b || typeof b !== 'object') { err(`${meta.id}${p}: 非法块`); continue; }
      if (!KNOWN_BLOCKS.has(b.t)) { err(`${meta.id}${p}: 未知块类型 "${b.t}"`); continue; }
      if (b.t === 'viz') {
        usedKinds.add(b.kind);
        if (VIZ_KINDS.size && !VIZ_KINDS.has(b.kind)) err(`${meta.id}${p}: 引用了未注册的动画 "${b.kind}"`);
      }
      if (b.t === 'timer') timerCount++;

      const st = checkBlock(b, `${meta.id}${p}`, { lessonIds: LESSON_IDS, requireKey: true });
      exCount += st.ex;
      localKeys.push(...st.keys);

      // 同一份套卷内不应重复出题；跨卷重复只提醒（专项与模拟卷偶尔可复用，但要有意识）
      if (b.t === 'exercises') {
        (b.x || []).forEach((ex, j) => {
          const link = ex && (ex.slug || ex.url);
          if (!link) return;
          if (localSlugs.has(link)) err(`${meta.id}${p}.x[${j}]: 题目 "${link}" 在本卷内重复（首见于 ${localSlugs.get(link)}）`);
          else localSlugs.set(link, `${p}.x[${j}]`);
          if (linkSeen.has(link) && linkSeen.get(link) !== meta.id)
            warn(`${meta.id}: 题目 "${ex.title}" 与 ${linkSeen.get(link)} 重复出题`);
          else if (!linkSeen.has(link)) linkSeen.set(link, meta.id);
        });
      }
    }

    // key 缺失由 checkBlock 的 requireKey 分支报错，这里只管唯一性
    localKeys.forEach((k) => {
      if (keySeen.has(k)) err(`${meta.id}: 题目 key "${k}" 与 ${keySeen.get(k)} 重复（跨题库必须唯一，否则攻克进度会串）`);
      else keySeen.set(k, meta.id);
    });

    if (meta.kind === 'mock' && !timerCount) warn(`${meta.id}: 模拟卷没有 timer 计时块`);
    if (meta.kind !== 'guide' && !exCount) err(`${meta.id}: 套卷没有任何题目`);

    bankTotal += exCount;
    console.log(`  ✓ ${meta.id}（${set.blocks.length} 块${exCount ? `，${exCount} 题` : ''}${timerCount ? '，带计时' : ''}）`);
  }

  for (const id of Object.keys(content)) {
    if (!bank.sets.some((s) => s.id === id)) warn(`content/banks/${bank.id}.js 含未注册套卷 "${id}"`);
  }
  console.log(`  共 ${bankTotal} 题，${keySeen.size} 个唯一 key`);
}

/* ---------- 未被使用的动画 ---------- */
const unused = [...VIZ_KINDS].filter((k) => !usedKinds.has(k));
if (unused.length) console.log(`\n未被任何课程引用的动画（不算错误）：${unused.join(', ')}`);

console.log(`\n===== 校验结束：${errors} 错误，${warns} 警告 =====`);
process.exit(errors ? 1 : 0);
