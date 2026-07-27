/* ============================================================
   课程注册表：模块 → 课程目录
   每节课的正文按需（动态 import）加载
   ============================================================ */

export const MODULES = [
  {
    id: 'cpp',
    title: 'Python 基础',
    icon: 'code',
    tone: 'sky',
    desc: '从运行环境、变量对象到集合、函数、模块与面向对象。把机试和 AI 项目里最常用的 Python 基础补齐。',
    tags: ['Python3', '标准库', '集合', '函数', '面向对象'],
    file: '../content/cpp.js',
    lessons: [
      { id: 'cpp-hello',    title: '起步：Python 程序怎样运行',  time: 12, level: '入门' },
      { id: 'cpp-types',    title: '变量、对象与动态类型',       time: 18, level: '入门' },
      { id: 'cpp-flow',     title: '控制流：分支、循环与推导式', time: 15, level: '入门' },
      { id: 'cpp-func',     title: '函数、参数与作用域',         time: 20, level: '入门' },
      { id: 'cpp-pointer',  title: '可变对象、引用语义与拷贝',   time: 25, level: '核心' },
      { id: 'cpp-array',    title: 'list、tuple、字符串与切片',  time: 18, level: '入门' },
      { id: 'cpp-struct',   title: 'dict、set 与数据建模',       time: 22, level: '核心' },
      { id: 'cpp-modern',   title: '模块、异常与文件 I/O',       time: 24, level: '进阶' },
      { id: 'cpp-template', title: '类、协议与类型提示',         time: 20, level: '进阶' },
    ],
  },
  {
    id: 'stl',
    title: 'STL 标准容器',
    icon: 'boxes',
    tone: 'violet',
    desc: '不只是「会用」，而是看见 vector 如何扩容、map 如何旋转、哈希如何解决冲突。',
    tags: ['vector', 'map', 'unordered_map', 'algorithm'],
    file: '../content/stl.js',
    lessons: [
      { id: 'stl-overview', title: 'STL 全景：容器 · 迭代器 · 算法', time: 14, level: '入门' },
      { id: 'stl-vector',   title: 'vector：动态数组与扩容代价',     time: 20, level: '核心' },
      { id: 'stl-deque',    title: 'deque / list / forward_list',    time: 18, level: '进阶' },
      { id: 'stl-map',      title: 'map / set：红黑树与有序性',      time: 22, level: '核心' },
      { id: 'stl-hash',     title: 'unordered_map：哈希表与冲突',    time: 22, level: '核心' },
      { id: 'stl-adapter',  title: 'stack / queue / priority_queue', time: 18, level: '入门' },
      { id: 'stl-algo',     title: '<algorithm>：会用就少写百行',    time: 20, level: '进阶' },
    ],
  },
  {
    id: 'dsa',
    title: '数据结构与算法',
    icon: 'binary',
    tone: 'primary',
    desc: '复杂度、线性表、树、堆、并查集，再到排序、二分、双指针、DP 与贪心。每种都有可交互动画。',
    tags: ['复杂度', '树', '排序', 'DP', '回溯'],
    file: '../content/dsa.js',
    lessons: [
      { id: 'dsa-complexity', title: '复杂度分析：大 O 到底在说什么', time: 18, level: '入门' },
      { id: 'dsa-linear',     title: '数组与链表：两种世界观',        time: 20, level: '入门' },
      { id: 'dsa-stack-queue',title: '栈与队列：受限但强大',          time: 20, level: '入门' },
      { id: 'dsa-hash',       title: '哈希表：O(1) 的代价与真相',     time: 22, level: '核心' },
      { id: 'dsa-heap',       title: '堆：上浮、下沉与优先队列',      time: 24, level: '核心' },
      { id: 'dsa-tree',       title: '二叉树与四种遍历',              time: 24, level: '核心' },
      { id: 'dsa-bst',        title: '二叉搜索树与平衡的必要性',      time: 24, level: '核心' },
      { id: 'dsa-dsu',        title: '并查集：路径压缩与按秩合并',    time: 20, level: '进阶' },
      { id: 'dsa-trie',       title: '字典树 Trie：前缀的力量',       time: 18, level: '进阶' },
      { id: 'dsa-sort',       title: '排序全家桶：从冒泡到快排',      time: 30, level: '核心' },
      { id: 'dsa-bsearch',    title: '二分查找：边界是唯一的难点',    time: 22, level: '核心' },
      { id: 'dsa-twoptr',     title: '双指针与滑动窗口',              time: 22, level: '核心' },
      { id: 'dsa-recursion',  title: '递归与回溯：画出决策树',        time: 26, level: '核心' },
      { id: 'dsa-dp',         title: '动态规划：从暴力到状态转移',    time: 32, level: '挑战' },
      { id: 'dsa-greedy',     title: '贪心：什么时候可以「只看眼前」', time: 20, level: '进阶' },
    ],
  },
  {
    id: 'graph',
    title: '图论',
    icon: 'network',
    tone: 'accent',
    desc: '图的表示、遍历、最短路、生成树、连通性与匹配。每个算法都能一步步看它如何"走"。',
    tags: ['BFS/DFS', 'Dijkstra', 'MST', 'Tarjan'],
    file: '../content/graph.js',
    lessons: [
      { id: 'graph-basic',  title: '图的表示：邻接矩阵与邻接表',   time: 18, level: '入门' },
      { id: 'graph-bfs',    title: 'BFS：一圈一圈往外扩',          time: 22, level: '核心' },
      { id: 'graph-dfs',    title: 'DFS：一条路走到黑',            time: 22, level: '核心' },
      { id: 'graph-topo',   title: '拓扑排序：把依赖排成一条线',   time: 20, level: '核心' },
      { id: 'graph-dijkstra', title: 'Dijkstra：贪心式最短路',     time: 26, level: '核心' },
      { id: 'graph-bellman', title: 'Bellman-Ford / SPFA / Floyd', time: 26, level: '进阶' },
      { id: 'graph-mst',    title: '最小生成树：Kruskal 与 Prim',  time: 24, level: '核心' },
      { id: 'graph-scc',    title: '连通分量与 Tarjan',            time: 26, level: '挑战' },
      { id: 'graph-bipart', title: '二分图判定与匈牙利匹配',       time: 24, level: '挑战' },
      { id: 'graph-flow',   title: '网络流入门：最大流最小割',     time: 26, level: '挑战' },
    ],
  },
  {
    id: 'ai',
    title: 'LangGraph 与 AI Agent',
    icon: 'bot',
    tone: 'rose',
    desc: '从 LLM 到工具调用、ReAct、状态图编排、检查点与多智能体。用执行流动画看懂 Agent 每一步的决策。',
    tags: ['LangGraph', 'ReAct', 'Tool Calling', 'Multi-Agent'],
    file: '../content/ai.js',
    lessons: [
      { id: 'ai-intro',     title: 'LLM 与 Agent：从对话到行动',    time: 18, level: '入门' },
      { id: 'ai-tool',      title: 'Tool Calling：让模型使用工具',  time: 22, level: '入门' },
      { id: 'ai-react',     title: 'ReAct：思考—行动—观察循环',     time: 24, level: '核心' },
      { id: 'ai-graph',     title: 'LangGraph 核心：状态、节点与边', time: 26, level: '核心' },
      { id: 'ai-route',     title: '条件路由与循环控制',            time: 24, level: '核心' },
      { id: 'ai-memory',    title: '检查点与持久化记忆',            time: 22, level: '进阶' },
      { id: 'ai-hitl',      title: '人在回路：中断、审批与时间旅行', time: 22, level: '进阶' },
      { id: 'ai-multi',     title: '多智能体：Supervisor 与 Swarm', time: 26, level: '挑战' },
      { id: 'ai-rag',       title: 'RAG 与 Agentic RAG',            time: 24, level: '进阶' },
      { id: 'ai-build',     title: '实战：从零搭一个研究型 Agent',  time: 30, level: '挑战' },
    ],
  },
];

/** 扁平化的课程列表（含所属模块信息） */
export const FLAT = MODULES.flatMap((m) =>
  m.lessons.map((l, i) => ({
    ...l,
    mod: m.id,
    modTitle: m.title,
    modTone: m.tone,
    modIcon: m.icon,
    idx: i,
  }))
);

/* 用 null 原型：否则 LESSON_BY_ID['constructor'] 会取到 Object.prototype.constructor，
   路由 #/l/constructor 就会渲染出一个「undefined」页面而不是未找到提示 */
export const LESSON_BY_ID = Object.assign(Object.create(null), Object.fromEntries(FLAT.map((l) => [l.id, l])));
export const MODULE_BY_ID = Object.assign(Object.create(null), Object.fromEntries(MODULES.map((m) => [m.id, m])));

export const TOTAL_LESSONS = FLAT.length;

/** 内容模块缓存 */
const cache = new Map();

export async function loadModuleContent(modId) {
  if (cache.has(modId)) return cache.get(modId);
  const m = MODULE_BY_ID[modId];
  if (!m) throw new Error(`未知模块: ${modId}`);
  const mod = await import(`../content/${modId}.js?v=py-basic-20260727`);
  const data = mod.lessons || mod.default || {};
  cache.set(modId, data);
  return data;
}

export async function loadLesson(lessonId) {
  const meta = LESSON_BY_ID[lessonId];
  if (!meta) return null;
  const content = await loadModuleContent(meta.mod);
  const body = content[lessonId];
  if (!body) return null;
  return { ...meta, ...body, title: body.title || meta.title };
}

/** 相邻课程 */
export function neighbors(lessonId) {
  const i = FLAT.findIndex((l) => l.id === lessonId);
  return {
    prev: i > 0 ? FLAT[i - 1] : null,
    next: i >= 0 && i < FLAT.length - 1 ? FLAT[i + 1] : null,
  };
}
