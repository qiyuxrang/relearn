# Relearn 内容与动画作者手册（子代理契约）

本项目是**零构建**纯静态站点：原生 ES Modules，无 TypeScript、无 JSX、无 npm 依赖。
所有文案一律**简体中文**（代码标识符除外）。写完后必须用 `node --check` 验证语法。

## 目录结构

```
relearn/
├─ index.html
├─ assets/css/            # 已完成，勿改
└─ assets/js/
   ├─ app.js              # 已完成，勿改
   ├─ core/
   │  ├─ icons.js         # icon(name) → svg 字符串
   │  ├─ highlight.js     # 代码高亮（cpp/python/text）
   │  ├─ render.js        # 课程块渲染器
   │  ├─ registry.js      # 课程目录（勿改课程 id）
   │  └─ store.js
   ├─ viz/
   │  ├─ engine.js        # 动画引擎（Player + 绘图函数）
   │  ├─ index.js         # kind → factory 注册表
   │  ├─ basics.js        # 已完成（参考范例）
   │  ├─ sorts.js         # 已完成（参考范例）
   │  ├─ structs.js       # 待写
   │  ├─ trees.js         # 待写
   │  ├─ graphs.js        # 待写
   │  ├─ dp.js            # 待写
   │  └─ agent.js         # 待写
   └─ content/
      ├─ cpp.js  stl.js  dsa.js  graph.js  ai.js   # 待写
```

---

## 一、动画模块契约（assets/js/viz/*.js）

每个模块导出 `export const VIZ = { 'kind-name': factory, ... }`。
`factory(host, opts)` 创建 `Player` 并 `.mount(host)`，返回 player 实例。

### Player 用法（详见 engine.js / basics.js / sorts.js 范例）

```js
import { Player, svgEl, el, drawArray, drawNodes, drawTree, drawGraph,
         layoutHeap, layoutBST, buildTable, setStage, randArr, parseNums } from './engine.js';

function myViz(host, opts = {}) {
  return new Player({
    title: '面板标题',
    badge: '徽标文字',          // 可选
    speed: 900,                 // 每帧毫秒（1x 速度）
    legend: [{ c: '--viz-active', t: '说明' }],   // 可选图例
    vars: true,                 // 可选：显示变量监视条
    pseudo: ['line0', 'line1'], // 可选：伪代码（帧里用 line: 序号 高亮）
    controls(bar, rebuild) {},  // 可选：自定义输入控件（调用 rebuild() 重新生成帧）
    build() { return { frames, meta }; },   // 生成完整帧序列（纯函数！）
    draw(stage, frame, meta, player) {},    // 渲染一帧（每次全量重画）
  }).mount(host);
}
```

### 帧对象约定

```js
{
  say: '旁白，可用 <b> <code>',   // 必填！每帧都要有中文旁白讲清这一步发生了什么
  line: 2,                        // 可选：高亮伪代码行（0-based，可为数组）
  vars: { i: 3, sum: {v: 10, hot: true} },  // 可选：变量监视
  ...自定义绘图数据
}
```

### 绘图工具（engine.js 已提供，优先复用）

- `drawArray({data, state, ptrs, bars, cell})` — 数组/柱状图。state 数组元素取值：
  `idle | active | compare | done | visited | path | pivot | dim`
- `drawNodes({data, state, labels, headLabel, tailNull})` — 链式节点
- `drawTree({nodes})` — nodes: `[{id, v, x, y, parent, state, edgeState, tag, sub}]`
- `drawGraph({verts, edges, directed, uid})` — verts: `[{id,v,x,y,state,sub,tag}]`；edges: `[{a,b,w,state}]`
- `layoutHeap(arr)` — 堆数组 → 树坐标；`layoutBST(root)` — BST → 坐标
- `svgEl(tag, attrs, text)` / `el(tag, cls, html)` / `setStage(stage, ...els)`
- 自绘 SVG 时给元素加 class `v-cell/v-node/v-edge` + `s-<state>`（填充）或 `k-<state>`（描边）即可获得过渡动画

### 规则

1. `build()` 必须是纯函数：一次性生成所有帧，绝不在 draw 里修改状态（保证回退/拖动一致）。
2. 帧数控制在 10~80 帧，太多会拖垮体验；循环加 guard 防死循环。
3. 每帧 `say` 必须解释「为什么」而不只是「做了什么」。
4. 交互输入用 `controls(bar, rebuild)`，输入元素用 `el('input')`，样式已有。
5. 不要用 emoji 当图标；需要图标用 `icon(name)`（core/icons.js）。
6. SVG viewBox 宽度 ≤ 640，`style: 'max-width:100%;height:auto'`。

---

## 二、课程内容契约（assets/js/content/*.js）

每个文件导出 `export const lessons = { 'lesson-id': lessonObj, ... }`。
lesson-id 必须与 registry.js 完全一致（勿改 registry）。

```js
export const lessons = {
  'cpp-hello': {
    // title 已在 registry，可省；lede 必写
    lede: '一段 1~2 句的导语，说明本节学什么、为什么重要。',
    blocks: [ /* 块数组 */ ],
  },
};
```

### 块类型（core/render.js）

```js
{ t: 'h2', x: '二级标题' }                    // 自动进 TOC
{ t: 'h3', x: '三级标题' }
{ t: 'p', x: '段落。支持 **粗** *强调* `代码` [链接](url)' }
{ t: 'ul', x: ['项1', '项2', {t:'带子列表', sub:['子项']}] }
{ t: 'ol', x: [...] }
{ t: 'code', x: '源码', lang: 'cpp'|'python'|'text', name: '标题', hl: [2,3] }  // hl=高亮行(1-based)
{ t: 'callout', kind: 'tip'|'note'|'warn'|'danger'|'key', title: '标题', x: '内容或[段落数组]' }
{ t: 'table', head: ['列1','列2'], rows: [['a','b'], ...] }   // 单元格支持行内 md
{ t: 'quiz', q: '题目', opts: ['A','B','C','D'], answer: 1, explain: '答案解释' }
{ t: 'steps', x: [{h:'步骤标题', x:'说明', code:'可选代码', lang:'python'}] }
{ t: 'cards', x: [{icon:'zap', tone:'primary', h:'标题', p:'描述'}] }
{ t: 'fold', title: '折叠标题', open: false, x: [子块数组] }
{ t: 'viz', kind: 'sort-bubble', opts: {} }    // 挂载动画
{ t: 'hr' } / { t: 'quote', x: '引用' }
{ t: 'exercises', intro: '可选导语', x: [        // 配套练习（LeetCode / 动手实验）
    { id: 1, title: '两数之和', slug: 'two-sum', level: '简单',
      why: '一句话：练本节哪个知识点',
      hint: '思路提示（默认折叠），支持字符串或段落数组',
      insight: '完成后对照：最优解、复杂度、常见坑（默认折叠）' },
    // 无 LeetCode 题的课（如 AI 模块）用 url + badge 代替 id/slug：
    { badge: '实验', title: '给 Agent 加一个工具', url: 'https://...',
      level: '入门', why: '...', hint: '...', insight: '...' },
] }
// level 只能取：简单/中等/困难（LeetCode 题）或 入门/进阶/挑战（动手实验）
// slug 是 leetcode.cn 的题目 slug，渲染为 https://leetcode.cn/problems/<slug>/
```

`exercises` 还支持一组**题库专属字段**（课程里可用但通常不用，见「四、题库契约」）：
`key`（攻克进度标识）、`freq`（考频）、`limit`（建议用时）、`score`（分值）、`recall`（回链课程）。

复杂度徽标写法：`<span class="cx cx--good">O(1)</span>`（good/mid/bad）放在 table 单元格或 html 块里。
表格单元格里可直接写 HTML。

### 内容质量要求

1. **教学顺序**：动机（为什么需要）→ 直觉（动画）→ 严谨（代码+复杂度）→ 陷阱（callout warn）→ 自测（quiz）。
2. 每节课至少 1 个 `viz` 块（复用已注册的 kind，见下表）、1 个 `quiz`、1 个可运行的完整代码示例。
3. 代码示例按模块选择语言；华为机试题库统一使用 Python 3，示例必须可直接运行。
4. 语言口吻：面向"重新捡起来"的复健学习者——直接、诚实、不堆砌名词；类比要准确。
5. 每节 800~2000 中文字符正文（不含代码）。

### 可用动画 kind 列表

**basics.js（已完成）**: memory-layout, pointer-basics, call-stack, complexity-curve, binary-search, two-pointers, sliding-window, array-vs-list
**sorts.js（已完成）**: sort-bubble, sort-selection, sort-insertion, sort-merge, sort-quick, sort-heap, sort-race
**structs.js**: vector-growth, stack-ops, queue-circular, hash-table, linked-ops, deque-blocks
**trees.js**: tree-traversal, bst-ops, heap-ops, trie-ops, dsu-ops, rbtree-intro
**graphs.js**: graph-repr, graph-bfs, graph-dfs, graph-topo, graph-dijkstra, graph-bellman, graph-mst-kruskal, graph-mst-prim, graph-scc, graph-bipartite, graph-flow
**dp.js**: dp-fib, dp-climb, dp-knapsack, dp-lcs, dp-lis, greedy-interval, backtrack-queens, backtrack-subset
**agent.js**: agent-loop, agent-tools, agent-react, lg-graph-basic, lg-conditional, lg-checkpoint, lg-hitl, lg-multi, lg-rag

（动画作者按此清单实现；课程作者按此清单引用。两边共享此契约，禁止私改 kind 名。）

---

## 三、验证

```bash
node --check assets/js/viz/xxx.js      # 每写完一个文件必须跑
node --check assets/js/content/xxx.js
node tools/validate.mjs                # 全站一致性校验，必须 0 错误 0 警告
```

content 文件是数据模块，除 `export const lessons` 外不要 import 任何东西（保持零依赖，viz kind 用字符串引用）。
viz 文件只 import `./engine.js` 与（如需图标）`../core/icons.js`。

外链核实工具（新增题目时必跑）：

```bash
node tools/verify-lc.mjs two-sum 3sum       # 力扣：题号/难度/中文题名/是否会员题
node tools/verify-nc.mjs <hash> <hash>      # 牛客：HTTP 状态 + 题名
```

---

## 四、题库契约（assets/js/content/banks/*.js）

题库与课程是**两套并行的目录**，刻意分离：课程按知识点递进（`registry.js` / `#/l/<id>`），
题库按考察点与套卷组织（`banks.js` / `#/q/<setId>`、`#/b/<bankId>`）。
进度也分开存：课程用 `relearn.v1` 的 `done[]`，题库用 `bank.solved[]`，互不污染。

```js
// assets/js/content/banks/hw.js
export const sets = {
  'hw-string': {
    lede: '导语（必写）',
    tags: ['字符串', '模拟'],   // 可选
    blocks: [ /* 与课程完全相同的块类型，外加 timer / paper */ ],
  },
};
```

套卷 id 与 `kind` 由 `assets/js/core/banks.js` 的 `BANKS[].sets` 声明，**内容文件不得自造 id**。
`kind` 三选一：`guide`（导读）/ `topic`（考察点专项）/ `mock`（限时模拟卷）。

### 题库专属块

```js
{ t: 'timer', mins: 120, label: '模拟考试计时', note: '说明文字' }   // mins 取 1~600
{ t: 'paper', title: '本卷构成', pass: '通过线说明', x: [
    { title: '题目名', point: '考察点', score: 150, limit: 30 },     // limit 单位分钟
] }
```

`timer` 与 `paper` **只能用在题库里**，课程内容使用会被 `validate.mjs` 判为错误。

### exercises 的题库专属字段

```js
{ t: 'exercises', x: [{
    key: 'hw-str-01',                       // 攻克进度标识，【全库唯一】，^[a-z0-9-]+$
    freq: '高频',                            // 考频，只能取 高频/常考/经典/冷门
    limit: 25,                               // 建议用时（分钟）
    score: 150,                              // 分值（模拟卷用）
    recall: [{ to: 'dsa-hash', text: '哈希表' }],   // 回链课程，to 必须是已注册课程 id
    // ……以及全部通用字段 id/title/slug/url/badge/level/why/hint/insight
}] }
```

- `key` 是进度记录的主键，缺了这道题就无法标记攻克（校验器会警告）；**全库重复会报错**，否则两处进度会串
- `recall` 是题库最有价值的差异化功能：练到不会 → 一键跳回对应课程节
- 同一份套卷内**不得出现重复题目**（按 slug/url 判定），校验器会拦

### 题库校验规则（`tools/validate.mjs` 已覆盖）

- 套卷 `kind` 白名单；`mock` 卷缺 `timer` 会警告；非 `guide` 卷没有题目会报错
- `key` 格式与全库唯一性；`freq` 白名单；`limit`/`score` 必须是数字
- `recall.to` 必须是真实存在的课程 id（防止回链 404）
- 卷内题目去重
