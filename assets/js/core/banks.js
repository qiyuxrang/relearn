/* ============================================================
   题库注册表：套卷目录 → 题目集合
   与课程注册表（registry.js）刻意分离：
   课程按「知识点递进」组织，题库按「考察点 / 套卷」组织，
   两者进度独立统计，互不污染。
   ============================================================ */

export const BANKS = [
  {
    id: 'hw',
    title: '华为机试专项',
    icon: 'target',
    tone: 'rose',
    desc: '按华为机试的真实形态组织：ACM 模式手写 I/O、IOI 赛制按测试点给分、3 题 120 分钟，考察点集中在业务模拟与图论、DP 这些高频板子。',
    tags: ['ACM 模式', 'IOI 赛制', '3 题 120 分钟'],
    file: '../content/banks/hw.js',
    /* 套卷目录。kind: 'topic' 专项 | 'mock' 模拟套卷 | 'guide' 说明页 */
    sets: [
      { id: 'hw-guide',   title: '开考前：机试形态与得分策略', kind: 'guide', time: 12, level: '必读' },
      { id: 'hw-io',      title: '专项 · ACM 模式输入输出',    kind: 'topic', time: 40, level: '入门' },
      { id: 'hw-string',  title: '专项 · 字符串处理与模拟',    kind: 'topic', time: 90, level: '核心' },
      { id: 'hw-hash',    title: '专项 · 哈希统计与排序规则',  kind: 'topic', time: 80, level: '核心' },
      { id: 'hw-search',  title: '专项 · DFS / BFS 与网格搜索', kind: 'topic', time: 90, level: '核心' },
      { id: 'hw-dp',      title: '专项 · 动态规划与背包',      kind: 'topic', time: 100, level: '进阶' },
      { id: 'hw-greedy',  title: '专项 · 贪心、双指针与区间',  kind: 'topic', time: 80, level: '进阶' },
      { id: 'hw-math',    title: '专项 · 数学、进制与位运算',  kind: 'topic', time: 70, level: '核心' },
      { id: 'hw-mock-1',  title: '模拟卷 A · 中等场（120 分钟）', kind: 'mock', time: 120, level: '模拟' },
      { id: 'hw-mock-2',  title: '模拟卷 B · 中等偏难场（120 分钟）', kind: 'mock', time: 120, level: '模拟' },
      { id: 'hw-mock-3',  title: '模拟卷 C · 困难场（120 分钟）', kind: 'mock', time: 120, level: '模拟' },
    ],
  },
];

/** 扁平化的套卷列表（含所属题库信息） */
export const BANK_SETS = BANKS.flatMap((b) =>
  b.sets.map((s, i) => ({
    ...s,
    bank: b.id,
    bankTitle: b.title,
    bankTone: b.tone,
    bankIcon: b.icon,
    idx: i,
  }))
);

/* 用 null 原型：否则 SET_BY_ID['constructor'] 会取到 Object.prototype.constructor，
   路由 #/q/constructor 就会渲染出一个「undefined」页面而不是未找到提示 */
export const BANK_BY_ID = Object.assign(Object.create(null), Object.fromEntries(BANKS.map((b) => [b.id, b])));
export const SET_BY_ID = Object.assign(Object.create(null), Object.fromEntries(BANK_SETS.map((s) => [s.id, s])));

export const TOTAL_SETS = BANK_SETS.length;

/** 套卷 kind → 展示用中文名 */
export const SET_KIND_LABEL = new Map([
  ['guide', '导读'],
  ['topic', '专项'],
  ['mock', '模拟卷'],
]);

/** 内容模块缓存。存 Promise 而不是结果：
    并发的 11 个 loadSet 在第一次 resolve 前都会 cache miss，存 Promise 才能真正去重 */
const cache = new Map();

export function loadBankContent(bankId) {
  if (cache.has(bankId)) return cache.get(bankId);
  if (!BANK_BY_ID[bankId]) return Promise.reject(new Error(`未知题库: ${bankId}`));
  const p = import(`../content/banks/${bankId}.js`)
    .then((mod) => mod.sets || mod.default || {})
    .catch((e) => { cache.delete(bankId); throw e; });
  cache.set(bankId, p);
  return p;
}

export async function loadSet(setId) {
  const meta = SET_BY_ID[setId];
  if (!meta) return null;
  const content = await loadBankContent(meta.bank);
  const body = content[setId];
  if (!body) return null;
  return { ...meta, ...body, title: body.title || meta.title };
}

/** 相邻套卷（限定在同一题库内） */
export function setNeighbors(setId) {
  const meta = SET_BY_ID[setId];
  if (!meta) return { prev: null, next: null };
  const list = BANK_SETS.filter((s) => s.bank === meta.bank);
  const i = list.findIndex((s) => s.id === setId);
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}
