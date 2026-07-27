/* ============================================================
   AI Agent / LangGraph 执行流动画
   把抽象概念（循环、工具调用、状态图、检查点…）画成
   可单步的流程图 + 消息流。全部帧在 build() 一次性生成。
   ============================================================ */

import { Player, svgEl, el, setStage, drawGraph } from './engine.js';

/* ------------------------------------------------------------
   通用绘图工具：圆角矩形流程图 + 消息小信封 + HTML 侧栏
   ------------------------------------------------------------ */

/** 粗略估算文本像素宽（中文按 10.5px，其余按 5.6px，字号 9.5） */
function textW(s) {
  let w = 0;
  for (const ch of String(s)) w += ch.charCodeAt(0) > 255 ? 10.5 : 5.8;
  return w;
}

/** 箭头三角（手绘，不依赖 marker） */
function arrowHead(svg, x, y, ux, uy, st) {
  const s = 7.5, px = -uy, py = ux;
  svg.appendChild(svgEl('path', {
    class: 'v-arrow',
    d: `M${x} ${y} L${(x - ux * s + px * s * 0.5).toFixed(1)} ${(y - uy * s + py * s * 0.5).toFixed(1)} L${(x - ux * s - px * s * 0.5).toFixed(1)} ${(y - uy * s - py * s * 0.5).toFixed(1)} Z`,
    fill: st === 'idle' ? 'var(--border-strong)' : st === 'dim' ? 'var(--viz-dim)' : `var(--viz-${st})`,
    opacity: st === 'dim' ? 0.45 : 1,
  }));
}

/** 消息小信封：边中点上的消息摘要芯片 */
function chip(svg, x, y, text, st) {
  const w = Math.min(190, textW(text) + 16), h = 18;
  const g = svgEl('g', { class: st === 'active' || st === 'compare' || st === 'path' ? 'v-pop' : '' });
  g.appendChild(svgEl('rect', {
    x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6,
    fill: 'var(--bg-elev)',
    stroke: st === 'idle' ? 'var(--border-strong)' : `var(--viz-${st})`,
    'stroke-width': 1.4, class: 'v-cell',
  }));
  g.appendChild(svgEl('text', {
    x, y: y + 0.5, 'font-size': 9.5,
    fill: st === 'idle' ? 'var(--fg-muted)' : `var(--viz-${st})`,
    'font-weight': 600,
  }, text));
  svg.appendChild(g);
}

/** 画一个流程图节点（rect / pill / diamond），x,y 为中心 */
function drawFlowNode(svg, n) {
  if (n.hide) return;
  const st = n.state || 'idle';
  const g = svgEl('g', { opacity: st === 'dim' ? 0.42 : 1 });
  const cls = `v-node s-${st}${n.pulse ? ' v-pulse' : ''}${n.pop ? ' v-pop' : ''}`;
  const w = n.w || 110, h = n.h || 42;
  if (n.shape === 'diamond') {
    g.appendChild(svgEl('polygon', {
      class: cls,
      points: `${n.x},${n.y - h / 2} ${n.x + w / 2},${n.y} ${n.x},${n.y + h / 2} ${n.x - w / 2},${n.y}`,
      stroke: 'var(--bg-elev)', 'stroke-width': 2,
    }));
  } else {
    g.appendChild(svgEl('rect', {
      class: cls,
      x: n.x - w / 2, y: n.y - h / 2, width: w, height: h,
      rx: n.shape === 'pill' ? h / 2 : 10,
      stroke: n.dash ? 'var(--fg-muted)' : 'var(--bg-elev)',
      'stroke-width': n.dash ? 1.4 : 2,
      'stroke-dasharray': n.dash ? '5 4' : null,
    }));
  }
  const two = !!n.small;
  g.appendChild(svgEl('text', {
    x: n.x, y: two ? n.y - 6 : n.y, 'font-size': n.fs || 12, 'font-weight': 600,
  }, n.label));
  if (two) {
    g.appendChild(svgEl('text', {
      x: n.x, y: n.y + 9, 'font-size': 8.5,
      fill: st === 'idle' || st === 'dim' ? 'var(--fg-muted)' : '#06131F',
      'font-family': 'var(--font-sans)',
    }, n.small));
  }
  if (n.sub) {
    g.appendChild(svgEl('text', { x: n.x, y: n.y + h / 2 + 12, 'font-size': 9.5, class: 'lbl' }, n.sub));
  }
  if (n.tag) {
    g.appendChild(svgEl('text', {
      x: n.x, y: n.y - h / 2 - 9, 'font-size': 9.5,
      fill: 'var(--accent)', 'font-weight': 700, 'font-family': 'var(--font-sans)',
    }, n.tag));
  }
  svg.appendChild(g);
}

/** 边缘裁剪：从节点中心指向 (tx,ty)，返回矩形边界上的出发点 */
function clipRect(n, tx, ty) {
  const dx = tx - n.x, dy = ty - n.y;
  if (!dx && !dy) return [n.x, n.y];
  const w = (n.w || 110) / 2 + 4, h = (n.h || 42) / 2 + 4;
  const sx = dx ? w / Math.abs(dx) : Infinity;
  const sy = dy ? h / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return [n.x + dx * s, n.y + dy * s];
}

/**
 * 流程图整图绘制
 * o = { W, H, nodes:[{id,x,y,w,h,label,small,sub,tag,state,pulse,pop,shape,dash,hide}],
 *       edges:[{k,a,b,state,label,msg,curve,dash,lx,ly,mx,my}],
 *       lines:[{x1,y1,x2,y2,dash}], texts:[{x,y,t,c,b,fs,anchor}] }
 */
function drawFlow(o) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${o.W} ${o.H}`,
    width: Math.min(o.W, 680),
    style: 'max-width:100%;height:auto',
  });
  const byId = {};
  (o.nodes || []).forEach((n) => { byId[n.id] = n; });

  (o.lines || []).forEach((l) => svg.appendChild(svgEl('line', {
    x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
    stroke: l.c || 'var(--border)', 'stroke-width': l.w || 1.2,
    'stroke-dasharray': l.dash ? '4 6' : null,
  })));

  const lateChips = [];  // 消息芯片最后绘制，保证浮在节点/边之上
  (o.edges || []).forEach((e) => {
    const a = byId[e.a], b = byId[e.b];
    if (!a || !b || a.hide || b.hide) return;
    const st = e.state || 'idle';
    let cx = null, cy = null;
    if (e.curve) {
      const mx0 = (a.x + b.x) / 2, my0 = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      cx = mx0 + (-dy / len) * e.curve;
      cy = my0 + (dx / len) * e.curve;
    }
    const [x1, y1] = clipRect(a, cx == null ? b.x : cx, cy == null ? b.y : cy);
    const [x2, y2] = clipRect(b, cx == null ? a.x : cx, cy == null ? a.y : cy);
    svg.appendChild(svgEl('path', {
      class: `v-edge k-${st}`,
      d: cx == null ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`,
      fill: 'none',
      'stroke-width': st === 'idle' || st === 'dim' ? 1.7 : 2.8,
      'stroke-linecap': 'round',
      'stroke-dasharray': e.dash ? '5 5' : null,
      opacity: st === 'dim' ? 0.45 : 1,
    }));
    let ux = x2 - (cx == null ? x1 : cx), uy = y2 - (cy == null ? y1 : cy);
    const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    arrowHead(svg, x2, y2, ux, uy, st);

    const lx = (cx == null ? (x1 + x2) / 2 : (x1 + 2 * cx + x2) / 4) + (e.lx || 0);
    const ly = (cy == null ? (y1 + y2) / 2 : (y1 + 2 * cy + y2) / 4) + (e.ly == null ? -9 : e.ly);
    if (e.label) {
      svg.appendChild(svgEl('text', {
        x: lx, y: ly, 'font-size': 9.5,
        fill: st === 'idle' ? 'var(--fg-muted)' : `var(--viz-${st})`,
        'font-weight': 700, 'font-family': 'var(--font-sans)',
      }, e.label));
    }
    if (e.msg) {
      lateChips.push([
        (cx == null ? (x1 + x2) / 2 : (x1 + 2 * cx + x2) / 4) + (e.mx || 0),
        (cy == null ? (y1 + y2) / 2 : (y1 + 2 * cy + y2) / 4) + (e.my || 0),
        e.msg, st]);
    }
  });

  (o.nodes || []).forEach((n) => drawFlowNode(svg, n));
  lateChips.forEach(([cx2, cy2, m, st2]) => chip(svg, cx2, cy2, m, st2));

  (o.texts || []).forEach((t) => svg.appendChild(svgEl('text', {
    x: t.x, y: t.y, 'font-size': t.fs || 11,
    fill: t.c || 'var(--fg-muted)', 'font-weight': t.b ? 700 : 400,
    'font-family': 'var(--font-sans)', 'text-anchor': t.anchor || 'middle',
  }, t.t)));

  return svg;
}

/** 帧状态合并：'active' 字符串是 {state:'active'} 的简写 */
const normSt = (v) => (typeof v === 'string' ? { state: v } : v);
const mergeNodes = (defs, st) => defs.map((n) => ({ ...n, ...normSt((st || {})[n.id]) }));
const mergeEdges = (defs, st) => defs.map((e) => ({ ...e, ...normSt((st || {})[e.k]) }));

/** HTML 侧栏（monospace，支持行内 HTML） */
function panel(title, rows, width) {
  const p = el('div');
  p.style.cssText = `font-family:var(--font-mono);font-size:11px;line-height:1.8;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 13px;text-align:left;min-width:${width || 220}px;max-width:${(width || 220) + 70}px;flex:0 1 auto;`;
  if (title) {
    const t = el('div', '', title);
    t.style.cssText = 'font-family:var(--font-sans);font-weight:700;font-size:11px;color:var(--fg-muted);letter-spacing:.05em;margin-bottom:6px;';
    p.appendChild(t);
  }
  (rows || []).forEach((r) => {
    if (r == null) return;
    const o = typeof r === 'string' ? { t: r } : r;
    const d = el('div', '', o.t);
    let s = 'padding:1px 6px;border-radius:6px;white-space:pre-wrap;word-break:break-all;color:var(--fg-soft);';
    if (o.head) s += 'color:var(--fg-muted);font-family:var(--font-sans);font-weight:700;margin-top:4px;';
    if (o.hot) s += 'background:var(--primary-soft);color:var(--primary);font-weight:700;';
    if (o.warn) s += 'background:var(--danger-soft);color:var(--danger);font-weight:700;';
    if (o.ok) s += 'color:var(--ok);font-weight:700;';
    if (o.dim) s += 'opacity:.5;';
    d.style.cssText = s;
    p.appendChild(d);
  });
  return p;
}

/** SVG 与侧栏横向排布 */
function rowWrap(...kids) {
  const d = el('div');
  d.style.cssText = 'display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;width:100%;';
  kids.forEach((k) => k && d.appendChild(k));
  return d;
}

/* ------------------------------------------------------------
   1. agent-loop — 纯对话 vs Agent 循环
   ------------------------------------------------------------ */
function agentLoop(host) {
  const NODES = [
    { id: 'u1', x: 90, y: 62, w: 90, h: 36, shape: 'pill', label: '用户' },
    { id: 'l1', x: 300, y: 62, w: 100, h: 40, label: 'LLM' },
    { id: 'a1', x: 512, y: 62, w: 96, h: 36, shape: 'pill', label: '回答' },
    { id: 'u2', x: 68, y: 200, w: 86, h: 36, shape: 'pill', label: '用户' },
    { id: 'l2', x: 222, y: 200, w: 92, h: 42, label: 'LLM' },
    { id: 'd', x: 398, y: 200, w: 130, h: 60, shape: 'diamond', label: '需要工具?', fs: 11 },
    { id: 't', x: 398, y: 296, w: 108, h: 40, label: '执行工具' },
    { id: 'f', x: 560, y: 200, w: 96, h: 44, label: '最终答案', fs: 11.5 },
  ];
  const EDGES = [
    { k: 'e1', a: 'u1', b: 'l1' },
    { k: 'e2', a: 'l1', b: 'a1' },
    { k: 'e3', a: 'u2', b: 'l2' },
    { k: 'e4', a: 'l2', b: 'd' },
    { k: 'e5', a: 'd', b: 't', label: '是', lx: 14, ly: 0 },
    { k: 'e6', a: 't', b: 'l2', curve: -46, label: '结果回灌', ly: 16 },
    { k: 'e7', a: 'd', b: 'f', label: '否' },
  ];

  const F = [];
  const fr = (say, line, ns, es) => F.push({ say, line, ns: ns || {}, es: es || {} });

  fr('上下两条流水线回答同一个问题：<b>「上海明天会下雨吗？」</b>上面是纯对话（Chat），下面是 <b>Agent（智能体）</b>——被放进循环里、可以自己调用工具的 LLM 程序。', 0);
  fr('纯对话：用户的问题被直接交给 LLM，除此之外它<b>拿不到任何外部信息</b>。', 1,
    { u1: 'active' }, { e1: { state: 'active', msg: '明天下雨吗?' } });
  fr('LLM 只能靠<b>训练时记住的旧知识</b>作答——它的知识有截止日期，也连不上天气 API。', 1,
    { u1: 'done', l1: { state: 'active', pulse: 1 } }, { e1: 'done' });
  fr('于是它只能给一个"听起来合理"的猜测。<b>一轮生成，对话结束</b>——这就是纯对话的天花板。', 1,
    { u1: 'done', l1: 'done', a1: 'compare' }, { e1: 'done', e2: { state: 'compare', msg: '大概…不会吧?' } });
  fr('Agent 循环同样从提问开始，但这次 LLM 被放进了一个 <code>while</code> 循环。', 3,
    { u2: 'active' }, { e3: { state: 'active', msg: '明天下雨吗?' } });
  fr('第 1 轮思考：LLM 发现要回答就得有<b>实时天气</b>。它不硬答，而是输出一个<b>工具调用（tool call）</b>请求。', 4,
    { u2: 'done', l2: { state: 'active', pulse: 1 } }, { e3: 'done' });
  fr('运行时检查 LLM 的输出：里面带着 tool_call → <b>需要工具，走「是」分支</b>。', 5,
    { u2: 'done', l2: 'done', d: { state: 'compare', pulse: 1 } },
    { e3: 'done', e4: { state: 'compare', msg: 'tool_call' } });
  fr('真正调用天气 API 的是<b>运行时代码</b>，不是 LLM——LLM 只负责"说出想调什么、参数是什么"。', 6,
    { u2: 'done', l2: 'done', d: 'compare', t: { state: 'active', pulse: 1 } },
    { e3: 'done', e4: 'visited', e5: { state: 'active', msg: 'get_weather("上海")' } });
  fr('工具结果作为一条新消息<b>回灌</b>进对话历史，沿回边送回 LLM。<b>这条回边就是 Agent 与纯对话的本质区别</b>。', 7,
    { u2: 'done', l2: 'active', d: 'visited', t: 'done' },
    { e3: 'done', e4: 'visited', e5: 'visited', e6: { state: 'active', msg: '晴转多云 22°C' } });
  fr('第 2 轮思考：这次对话里已经有真实天气数据了，LLM 判断<b>不再需要工具</b>。', 4,
    { u2: 'done', l2: { state: 'active', pulse: 1 }, d: 'visited', t: 'visited' },
    { e3: 'done', e4: 'visited', e5: 'visited', e6: 'visited' });
  fr('再次经过判断点：这次输出里没有 tool_call → 走「否」分支，跳出循环。', 5,
    { u2: 'done', l2: 'done', d: { state: 'compare', pulse: 1 }, t: 'visited' },
    { e3: 'done', e4: 'visited', e5: 'visited', e6: 'visited' });
  fr('最终答案基于<b>刚查到的真实数据</b>：「上海明天晴转多云，不用带伞。」', 8,
    { u2: 'done', l2: 'done', d: 'done', t: 'visited', f: { state: 'done', pop: 1 } },
    { e3: 'done', e4: 'visited', e5: 'visited', e6: 'visited', e7: { state: 'path', msg: '多云, 不下雨' } });
  fr('总结：<b>Agent = LLM + 工具 + 循环</b>。循环几轮由 LLM 自己决定——查天气 1 轮就够；订机票可能要查航班、比价、下单好几轮。', [3, 8],
    { u2: 'done', l2: 'visited', d: 'visited', t: 'visited', f: 'done' },
    { e3: 'done', e4: 'visited', e5: 'visited', e6: 'visited', e7: 'path' });

  // 进入下半场后，纯对话流水线整体淡出，聚焦 Agent 循环
  F.forEach((f, i) => {
    if (i >= 4) {
      f.ns = { u1: 'dim', l1: 'dim', a1: 'dim', ...f.ns };
      f.es = { e1: 'dim', e2: 'dim', ...f.es };
    }
  });

  return new Player({
    title: '纯对话 vs Agent 循环',
    badge: 'Agent',
    speed: 1500,
    legend: [
      { c: '--viz-active', t: '正在执行' },
      { c: '--viz-compare', t: '判断分支' },
      { c: '--viz-done', t: '已完成' },
      { c: '--viz-visited', t: '走过的路径' },
    ],
    pseudo: [
      '# —— 纯对话 ——',
      'answer = llm.chat([question])       # 一次生成，结束',
      '# —— Agent 循环 ——',
      'while True:',
      '    reply = llm.chat(messages)      # 思考：要不要用工具?',
      '    if not reply.tool_calls: break  # 不需要 → 跳出',
      '    result = run_tool(reply.tool_calls[0])',
      '    messages.append(result)         # 结果回灌，进入下一轮',
      'answer = reply.content              # 最终答案',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      setStage(stage, drawFlow({
        W: 640, H: 344,
        nodes: mergeNodes(NODES, f.ns),
        edges: mergeEdges(EDGES, f.es),
        lines: [{ x1: 24, y1: 112, x2: 616, y2: 112, dash: 1 }],
        texts: [
          { x: 320, y: 18, t: '纯对话：一问一答，一轮结束', b: 1, c: 'var(--sky)', fs: 11.5 },
          { x: 320, y: 134, t: 'Agent 循环：思考 → 工具 → 再思考', b: 1, c: 'var(--primary)', fs: 11.5 },
        ],
      }));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   2. agent-tools — Tool Calling 四泳道时序
   ------------------------------------------------------------ */
function agentTools(host) {
  const LANES = [
    { id: 'user', n: '用户', x: 70 },
    { id: 'llm', n: 'LLM', x: 235 },
    { id: 'rt', n: '运行时', x: 400 },
    { id: 'tool', n: '工具', x: 560 },
  ];
  const MSGS = [
    { f: 0, t: 1, lab: '「东京今天天气怎么样？」' },
    { f: 1, t: 2, lab: 'assistant 消息 + tool_calls (JSON)' },
    { f: 2, t: 3, lab: '执行 get_weather(city="Tokyo")' },
    { f: 3, t: 2, lab: '{"temp": 26, "cond": "sunny"}' },
    { f: 2, t: 1, lab: 'role:"tool" 结果消息' },
    { f: 1, t: 0, lab: '「东京今天晴，26°C。」' },
  ];
  const CODE = {
    ask: ['{ "role": "user",', '  "content": "东京今天天气怎么样？" }'],
    call: ['{ "role": "assistant", "content": null,', '  "tool_calls": [{ "id": "call_1",',
      '    "name": "get_weather",', '    "arguments": "{\\"city\\":\\"Tokyo\\"}" }] }'],
    exec: ['# 运行时（你写的代码）解析并真正执行：', 'args = json.loads(call.arguments)',
      'result = get_weather(**args)  # 真函数'],
    res: ['{ "temp": 26, "cond": "sunny" }'],
    tmsg: ['{ "role": "tool",', '  "tool_call_id": "call_1",',
      '  "content": "{\\"temp\\":26,\\"cond\\":\\"sunny\\"}" }'],
    fin: ['{ "role": "assistant",', '  "content": "东京今天晴，气温 26°C。" }'],
  };

  const F = [];
  const fr = (say, o) => F.push({ say, shown: 0, hot: -1, ...o });

  fr('工具调用（Tool Calling，也叫 Function Calling 函数调用）涉及四个角色。关键认知：<b>LLM 只产出文本/JSON，从不亲手执行代码</b>——执行者是你写的运行时。');
  fr('用户提问，作为 <code>role:"user"</code> 消息进入对话历史。', {
    act: 'user', shown: 1, hot: 0, code: CODE.ask, ct: '消息①：用户提问' });
  fr('LLM 收到两样东西：<b>对话历史 + 工具清单</b>（每个工具的名字、用途、参数 schema）。它判断：答这题得先查天气。', {
    act: 'llm', apulse: 1, shown: 1, code: CODE.ask, ct: '消息①：用户提问' });
  fr('LLM 输出的不是答案，而是一段<b>结构化 JSON</b>：想调 <code>get_weather</code>，参数 <code>city="Tokyo"</code>。生成到此暂停，轮到运行时接手。', {
    act: 'llm', shown: 2, hot: 1, code: CODE.call, ct: '消息②：assistant 的 tool_call' });
  fr('运行时解析 JSON、校验参数，然后<b>调用真实函数</b>——可能是发 HTTP 请求、查数据库、跑脚本。', {
    act: 'rt', shown: 3, hot: 2, code: CODE.exec, ct: '运行时执行' });
  fr('工具在真实世界干活：请求天气服务。这一步的耗时与失败都发生在 LLM 之外，要由运行时兜底（超时、重试）。', {
    act: 'tool', apulse: 1, shown: 3, code: CODE.exec, ct: '运行时执行' });
  fr('工具返回结构化结果。', {
    act: 'tool', shown: 4, hot: 3, code: CODE.res, ct: '工具返回值' });
  fr('运行时把结果包装成 <code>role:"tool"</code> 消息（用 <code>tool_call_id</code> 与请求配对），追加进对话历史。', {
    act: 'rt', shown: 5, hot: 4, code: CODE.tmsg, ct: '消息③：tool 结果回传' });
  fr('<b>第二次调用 LLM</b>：这次历史里已经有工具结果了。所以一次工具调用 = 两次 LLM 请求 + 一次函数执行。', {
    act: 'llm', apulse: 1, shown: 5, code: CODE.tmsg, ct: '消息③：tool 结果回传' });
  fr('LLM 把结构化数据翻译成自然语言，生成最终回答。', {
    act: 'llm', shown: 6, hot: 5, code: CODE.fin, ct: '消息④：最终回答' });
  fr('完整链路：<b>提问 → tool_call JSON → 运行时执行 → 结果回灌 → 最终回答</b>。各家 API（OpenAI / Anthropic / LangChain）的工具调用都是这一套流程。', {
    act: 'user', shown: 6, code: CODE.fin, ct: '消息④：最终回答' });

  return new Player({
    title: 'Tool Calling：一次完整的工具调用时序',
    badge: '工具调用',
    speed: 1600,
    legend: [
      { c: '--viz-active', t: '当前消息' },
      { c: '--viz-visited', t: '已发送' },
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const W = 630, H = 268;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: 630, style: 'max-width:100%;height:auto' });
      LANES.forEach((l) => {
        const on = f.act === l.id;
        svg.appendChild(svgEl('line', {
          x1: l.x, y1: 50, x2: l.x, y2: H - 12,
          stroke: 'var(--border)', 'stroke-width': 1.2, 'stroke-dasharray': '3 5',
        }));
        svg.appendChild(svgEl('rect', {
          class: `v-node s-${on ? 'active' : 'idle'}${on && f.apulse ? ' v-pulse' : ''}`,
          x: l.x - 52, y: 14, width: 104, height: 32, rx: 9,
          stroke: 'var(--bg-elev)', 'stroke-width': 2,
        }));
        svg.appendChild(svgEl('text', { x: l.x, y: 30, 'font-size': 12, 'font-weight': 600 }, l.n));
      });
      MSGS.slice(0, f.shown).forEach((m, i) => {
        const y = 80 + i * 30;
        const hot = i === f.hot;
        const st = hot ? 'active' : 'visited';
        const x1 = LANES[m.f].x, x2 = LANES[m.t].x;
        const dir = x2 > x1 ? 1 : -1;
        const ex = x2 - dir * 8;
        svg.appendChild(svgEl('line', {
          class: `v-edge k-${st}`,
          x1: x1 + dir * 4, y1: y, x2: ex, y2: y,
          'stroke-width': hot ? 2.6 : 1.6, opacity: hot ? 1 : 0.55, 'stroke-linecap': 'round',
        }));
        arrowHead(svg, ex, y, dir, 0, st);
        svg.appendChild(svgEl('text', {
          x: (x1 + x2) / 2, y: y - 9, 'font-size': 9.5,
          fill: hot ? 'var(--viz-active)' : 'var(--fg-muted)',
          'font-weight': hot ? 700 : 400,
        }, m.lab));
      });
      const kids = [svg];
      if (f.code) kids.push(rowWrap(panel(f.ct, f.code.map((c) => `<code style="background:none;padding:0">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>`), 330)));
      setStage(stage, ...kids);
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   3. agent-react — ReAct：Thought → Action → Observation
   ------------------------------------------------------------ */
function agentReact(host) {
  const NODES = [
    { id: 'th', x: 172, y: 58, w: 128, h: 42, shape: 'pill', label: '思考 Thought', fs: 11.5 },
    { id: 'ac', x: 276, y: 202, w: 120, h: 42, shape: 'pill', label: '行动 Action', fs: 11.5 },
    { id: 'ob', x: 68, y: 202, w: 128, h: 42, shape: 'pill', label: '观察 Observation', fs: 10 },
    { id: 'fa', x: 172, y: 300, w: 132, h: 40, label: '最终答案', fs: 11.5 },
  ];
  const EDGES = [
    { k: 'ta', a: 'th', b: 'ac', curve: -36, label: '选工具' },
    { k: 'ao', a: 'ac', b: 'ob', curve: -36, label: '执行', ly: 16 },
    { k: 'ot', a: 'ob', b: 'th', curve: -36, label: '写回轨迹' },
    { k: 'tf', a: 'th', b: 'fa', dash: 1, label: '信息足够', lx: 34, ly: 60 },
  ];
  const TRACE = [
    { nd: 'th', ek: 'ot', txt: 'Thought: 要回答"东京现在几点"，得先知道东京的时区', line: 2,
      say: '第 1 轮<b>思考（Thought）</b>：模型把推理过程<b>写出来</b>——先分解问题：算当地时间需要时区。' },
    { nd: 'ac', ek: 'ta', txt: 'Action: get_timezone("Tokyo")', line: 3,
      say: '<b>行动（Action）</b>：从工具箱里挑一个工具，并给出参数。这行文本会被运行时解析成真实调用。' },
    { nd: 'ob', ek: 'ao', txt: 'Observation: "Asia/Tokyo, UTC+9"', line: 5,
      say: '<b>观察（Observation）</b>：工具返回值被写回轨迹。模型没有"记忆"——它的记忆就是这段越来越长的文本。' },
    { nd: 'th', ek: 'ot', txt: 'Thought: 有时区了，还差一个可靠的当前 UTC 时间', line: 2,
      say: '第 2 轮思考：基于上一轮的观察继续推理。<b>推理与行动交替进行</b>——这正是 ReAct（Reason + Act）名字的含义。' },
    { nd: 'ac', ek: 'ta', txt: 'Action: get_utc_now()', line: 3,
      say: '再次行动：查询当前 UTC 时间，这次不需要参数。' },
    { nd: 'ob', ek: 'ao', txt: 'Observation: "2026-07-26 03:04 UTC"', line: 5,
      say: '第 2 个观察到手。两条事实（时区 + UTC 时间）凑齐了。' },
    { nd: 'th', ek: 'ot', txt: 'Thought: 03:04 + 9 小时 = 12:04，信息足够，可以作答', line: 2,
      say: '第 3 轮思考：模型自己判断<b>不再需要新工具</b>——满足停止条件，准备收尾。' },
    { nd: 'fa', ek: 'tf', txt: 'Final Answer: 东京现在约为 12:04（UTC+9）', line: 4,
      say: '输出 <b>Final Answer</b>，循环终止。整个过程人类可读——这是 ReAct 最大的优点：<b>可解释、可调试</b>。' },
  ];
  const COLOR = { th: 'active', ac: 'compare', ob: 'visited', fa: 'done' };

  const F = [];
  F.push({ say: 'ReAct（Reason + Act，推理+行动）：强迫 LLM 按 <b>Thought → Action → Observation</b> 的固定格式循环工作。右侧是它逐步生成的轨迹（trace）。任务：<b>「东京现在几点？」</b>', line: 0, k: -1 });
  TRACE.forEach((t, i) => F.push({ say: t.say, line: t.line, k: i }));
  F.push({ say: '共 3 轮循环、2 次工具调用。工程上的保险丝：<b>设最大步数</b>（如 <code>MAX_STEPS=10</code>），否则模型可能陷入"再查一下"的死循环。', line: 1, k: TRACE.length - 1, fin: 1 });

  return new Player({
    title: 'ReAct 循环：边想边干，轨迹即记忆',
    badge: 'ReAct',
    speed: 1700,
    legend: [
      { c: '--viz-active', t: 'Thought' },
      { c: '--viz-compare', t: 'Action' },
      { c: '--viz-visited', t: 'Observation' },
      { c: '--viz-done', t: 'Final Answer' },
    ],
    pseudo: [
      'trace = [task]',
      'for step in range(MAX_STEPS):   # 防死循环',
      '    thought = llm(trace)        # Thought: 推理下一步',
      '    action  = parse_action(thought)',
      '    if action is FINISH: return final_answer',
      '    obs = run_tool(action)      # Observation',
      '    trace += [thought, action, obs]  # 轨迹回灌',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const cur = f.k >= 0 ? TRACE[f.k] : null;
      const ns = {}, es = {};
      if (cur) {
        ns[cur.nd] = { state: COLOR[cur.nd], pulse: f.fin ? 0 : 1, pop: cur.nd === 'fa' ? 1 : 0 };
        if (f.k > 0 || cur.nd !== 'th') es[cur.ek] = { state: COLOR[cur.nd] };
      }
      const svg = drawFlow({
        W: 350, H: 336,
        nodes: mergeNodes(NODES, ns),
        edges: mergeEdges(EDGES, es),
        texts: [{ x: 172, y: 172, t: '循环 2~3 轮', fs: 10 }],
      });
      const rows = [];
      for (let i = 0; i <= (f.k < 0 ? -1 : f.k); i++) {
        const t = TRACE[i];
        rows.push({
          t: t.txt,
          hot: i === f.k && !f.fin,
          ok: t.nd === 'fa',
          dim: i < f.k && !(t.nd === 'fa'),
        });
      }
      if (!rows.length) rows.push({ t: '（轨迹将逐步出现在这里）', dim: 1 });
      setStage(stage, rowWrap(svg, panel('轨迹 trace（模型生成的文本）', rows, 250)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   4. lg-graph-basic — LangGraph 状态图：state 在节点间流动
   ------------------------------------------------------------ */
function lgGraphBasic(host) {
  // 两套布局：直线图 / 加 tools 后带循环的图
  const V1 = [
    { id: 'S', v: 'START', x: 60, y: 40 },
    { id: 'C', v: 'chatbot', x: 60, y: 140 },
    { id: 'E', v: 'END', x: 60, y: 240 },
  ];
  const E1 = [{ a: 'S', b: 'C' }, { a: 'C', b: 'E' }];
  const V2 = [
    { id: 'S', v: 'START', x: 70, y: 36 },
    { id: 'C', v: 'chatbot', x: 70, y: 136 },
    { id: 'T', v: 'tools', x: 210, y: 136 },
    { id: 'E', v: 'END', x: 70, y: 240 },
  ];
  const E2 = [
    { a: 'S', b: 'C' },
    { a: 'C', b: 'T', w: '调' },
    { a: 'T', b: 'C', w: '回' },
    { a: 'C', b: 'E' },
  ];

  const M = {
    u: 'Human: 珠峰有多高?',
    a1: 'AI: 8848.86 米。',
    tc: 'AI: tool_call(search)',
    tr: 'Tool: "8848.86 m"',
    a2: 'AI: 珠峰高 8848.86 米。',
  };

  const F = [];
  const fr = (say, o) => F.push({ say, g: 1, vs: {}, es: {}, msgs: [], ...o });

  fr('LangGraph 的核心抽象：<b>状态图（StateGraph）</b>。节点（node）是干活的函数，边（edge）决定下一步去哪，<b>状态（state）</b>是在图里流动的共享数据——这里 state 就是 <code>messages</code> 消息列表。', { line: 0 });
  fr('最小的图：<code>START → chatbot → END</code>。<code>add_node</code> 注册节点函数，<code>add_edge</code> 连线。START/END 是内置的入口和出口。', { line: [2, 3, 4], vs: { S: 'pivot', C: 'idle', E: 'idle' } });
  fr('调用 <code>graph.invoke({"messages": [用户提问]})</code>。初始 state 只有一条 Human 消息，从 START 流入。', { line: 6, vs: { S: 'active' }, msgs: [{ t: M.u, hot: 1 }] });
  fr('state 沿边流到 <code>chatbot</code> 节点。<b>节点函数收到整个 state 作为入参</b>。', { line: 5, vs: { S: 'done', C: 'active' }, es: { SC: 'active' }, msgs: [{ t: M.u }] });
  fr('<code>chatbot</code> 内部调用 LLM，返回 <code>{"messages": [AI 回复]}</code>。LangGraph 不是覆盖，而是按 reducer（合并函数）<b>把新消息追加进列表</b>——列表长度 1 → 2。', { line: 5, vs: { S: 'done', C: { state: 'active', pop: 1 } }, es: { SC: 'visited' }, msgs: [{ t: M.u }, { t: M.a1, hot: 1 }] });
  fr('更新后的 state 流向 END，本次调用返回最终 state。一条直线走完——这其实就是"纯对话"，还没有循环。', { line: 6, vs: { S: 'done', C: 'done', E: 'active' }, es: { SC: 'visited', CE: 'active' }, msgs: [{ t: M.u }, { t: M.a1 }] });
  fr('给图加一个 <code>tools</code> 节点，并加一条 <code>tools → chatbot</code> 的<b>回边</b>——图里出现了环，Agent 循环就画在图结构上。', { g: 2, line: [8, 9], vs: { S: 'pivot', C: 'idle', T: { state: 'pivot', pop: 1 } }, msgs: [] });
  fr('重新运行同样的问题。state 到达 <code>chatbot</code>，这次 LLM 决定：先搜索，输出 tool_call。', { g: 2, line: 5, vs: { S: 'done', C: 'active' }, es: { SC: 'visited' }, msgs: [{ t: M.u }, { t: M.tc, hot: 1 }] });
  fr('state（带着 tool_call）沿边流向 <code>tools</code> 节点执行真实搜索。', { g: 2, line: 8, vs: { S: 'done', C: 'done', T: 'active' }, es: { SC: 'visited', CT: 'active' }, msgs: [{ t: M.u }, { t: M.tc }] });
  fr('工具结果作为 Tool 消息追加进 state（长度 2 → 3），沿<b>回边</b>流回 <code>chatbot</code>。', { g: 2, line: 9, vs: { S: 'done', C: 'active', T: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'active' }, msgs: [{ t: M.u }, { t: M.tc }, { t: M.tr, hot: 1 }] });
  fr('<code>chatbot</code> 第二次执行：拿着搜索结果生成最终回答，追加第 4 条消息。这次没有 tool_call 了。', { g: 2, line: 5, vs: { S: 'done', C: { state: 'active', pop: 1 }, T: 'visited' }, es: { SC: 'visited', CT: 'visited', TC: 'visited' }, msgs: [{ t: M.u }, { t: M.tc }, { t: M.tr }, { t: M.a2, hot: 1 }] });
  fr('state 流到 END，返回。回顾：<b>节点改 state，边送 state</b>；把循环画进图里，Agent 的控制流就一目了然。', { g: 2, line: 6, vs: { S: 'done', C: 'done', T: 'visited', E: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'visited', CE: 'path' }, msgs: [{ t: M.u }, { t: M.tc }, { t: M.tr }, { t: M.a2 }] });

  return new Player({
    title: 'LangGraph：StateGraph 的一次执行',
    badge: 'LangGraph',
    speed: 1600,
    legend: [
      { c: '--viz-active', t: '正在执行' },
      { c: '--viz-done', t: '已执行' },
      { c: '--viz-pivot', t: '新加入图' },
    ],
    pseudo: [
      'class State(TypedDict):',
      '    messages: Annotated[list, add_messages]  # 追加式合并',
      'g = StateGraph(State)',
      'g.add_node("chatbot", chatbot)   # 节点 = 函数(state)->更新',
      'g.add_edge(START, "chatbot"); g.add_edge("chatbot", END)',
      '# chatbot: return {"messages": [llm.invoke(state["messages"])]}',
      'graph.invoke({"messages": [("user", "珠峰有多高?")]})',
      '# —— 升级：加工具节点，图里出现环 ——',
      'g.add_node("tools", ToolNode([search]))',
      'g.add_edge("tools", "chatbot")   # 回边：结果流回 LLM',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const g2 = f.g === 2;
      const verts = (g2 ? V2 : V1).map((v) => ({ ...v, state: (f.vs || {})[v.id] && normSt(f.vs[v.id]).state || 'idle', pop: (f.vs || {})[v.id] && normSt(f.vs[v.id]).pop }));
      const edges = (g2 ? E2 : E1).map((e) => ({ ...e, state: (f.es || {})[e.a + e.b] ? normSt(f.es[e.a + e.b]).state : 'idle' }));
      const svg = drawGraph({ verts, edges, directed: true, uid: g2 ? 'lgb2' : 'lgb1', r: 24 });
      const rows = (f.msgs || []).map((m, i) => ({ t: `[${i}] ${m.t}`, hot: m.hot }));
      if (!rows.length) rows.push({ t: 'messages: []', dim: 1 });
      setStage(stage, rowWrap(svg, panel('state["messages"]（共享状态）', rows, 240)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   5. lg-conditional — 条件边：should_continue 路由
   ------------------------------------------------------------ */
function lgConditional(host) {
  const V = [
    { id: 'S', v: 'START', x: 90, y: 36 },
    { id: 'C', v: 'chatbot', x: 90, y: 130 },
    { id: 'T', v: 'tools', x: 236, y: 130 },
    { id: 'E', v: 'END', x: 90, y: 236 },
  ];
  const EK = (es) => [
    { a: 'S', b: 'C', state: es.SC || 'idle' },
    { a: 'C', b: 'T', w: 'tools', state: es.CT || 'idle' },
    { a: 'T', b: 'C', state: es.TC || 'idle' },
    { a: 'C', b: 'E', w: 'END', state: es.CE || 'idle' },
  ];

  const F = [];
  const fr = (say, o) => F.push({ say, vs: {}, es: {}, ret: null, run: '', ...o });

  fr('<b>条件边（conditional edge）</b>：普通边写死了下一站，条件边则在运行时调用一个<b>路由函数</b>，看它的返回值决定去哪。<code>chatbot</code> 之后的两条虚线边就归 <code>should_continue</code> 管。', { line: [0, 5] });
  fr('<b>第 1 次运行</b>：「北京现在气温多少？」——这题必须查工具。state 进入 <code>chatbot</code>。', { run: '运行 ①「北京现在气温多少?」', line: 7, vs: { S: 'done', C: 'active' }, es: { SC: 'active' } });
  fr('LLM 输出带 <code>tool_calls</code> 的消息。接下来<b>不走固定边</b>，而是先调用路由函数。', { run: '运行 ①「北京现在气温多少?」', line: 1, vs: { S: 'done', C: { state: 'compare', pulse: 1 } }, es: { SC: 'visited' } });
  fr('<code>should_continue(state)</code> 检查最后一条消息：<b>有 tool_calls → 返回 <code>"tools"</code></b>。决策点亮起，路由到 tools 节点。', { run: '运行 ①「北京现在气温多少?」', line: 2, ret: '"tools"', vs: { S: 'done', C: 'compare' }, es: { SC: 'visited', CT: 'compare' } });
  fr('<code>tools</code> 执行天气查询，结果追加进 state，沿回边送回 <code>chatbot</code>。', { run: '运行 ①「北京现在气温多少?」', line: 6, ret: '"tools"', vs: { S: 'done', C: 'active', T: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'active' } });
  fr('<code>chatbot</code> 第二次执行，拿到气温数据，生成纯文本回答——这次<b>没有</b> tool_calls。再次进入路由。', { run: '运行 ①「北京现在气温多少?」', line: 1, vs: { S: 'done', C: { state: 'compare', pulse: 1 }, T: 'visited' }, es: { SC: 'visited', CT: 'visited', TC: 'visited' } });
  fr('<code>should_continue</code> 返回 <code>END</code>，走向终点。运行 ① 结束：<b>tools 循环走了一圈</b>。', { run: '运行 ①「北京现在气温多少?」', line: 3, ret: 'END', vs: { S: 'done', C: 'done', T: 'visited', E: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'visited', CE: 'path' } });
  fr('<b>第 2 次运行</b>：「用一句话介绍长城」——纯知识题，不需要任何工具。', { run: '运行 ②「用一句话介绍长城」', line: 7, vs: { S: 'done', C: 'active' }, es: { SC: 'active' } });
  fr('LLM 直接给出回答，没有 tool_calls。路由函数介入判断。', { run: '运行 ②「用一句话介绍长城」', line: 1, vs: { S: 'done', C: { state: 'compare', pulse: 1 } }, es: { SC: 'visited' } });
  fr('<code>should_continue</code> 返回 <code>END</code>——<b>一次工具都没调，直达终点</b>。同一张图，两条路径。', { run: '运行 ②「用一句话介绍长城」', line: 3, ret: 'END', vs: { S: 'done', C: 'done', E: 'done' }, es: { SC: 'visited', CE: 'path' } });
  fr('总结：<b>把 if/else 画成边</b>，控制流从代码里"藏着"变成图上"看得见"。要不要循环、循环几次，全由路由函数在运行时决定。', { line: [4, 5], vs: { S: 'done', C: 'done', T: 'visited', E: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'visited', CE: 'path' } });

  return new Player({
    title: '条件路由：should_continue 决定去向',
    badge: 'LangGraph',
    speed: 1600,
    legend: [
      { c: '--viz-compare', t: '路由判断中' },
      { c: '--viz-path', t: '选中的路径' },
      { c: '--viz-visited', t: '走过' },
    ],
    pseudo: [
      'def should_continue(state):',
      '    last = state["messages"][-1]',
      '    if last.tool_calls: return "tools"  # 还要干活',
      '    return END                          # 可以收工',
      'g.add_conditional_edges("chatbot", should_continue,',
      '                        {"tools": "tools", END: END})',
      'g.add_edge("tools", "chatbot")',
      'graph.invoke({"messages": [question]})',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const verts = V.map((v) => {
        const s = (f.vs || {})[v.id];
        const o = s ? normSt(s) : {};
        return { ...v, state: o.state || 'idle', pop: o.pop };
      });
      const svg = drawGraph({ verts, edges: EK(f.es || {}), directed: true, uid: 'lgc', r: 24 });
      const rows = [];
      if (f.run) rows.push({ t: f.run, head: 1 });
      rows.push({ t: 'should_continue(state)', dim: !f.ret });
      rows.push(f.ret
        ? { t: `→ 返回 ${f.ret}`, hot: 1 }
        : { t: '→ （等待 chatbot 产出消息）', dim: 1 });
      if (f.ret === '"tools"') rows.push({ t: '路由: 去 tools 节点，稍后回来', ok: 1 });
      if (f.ret === 'END') rows.push({ t: '路由: 去 END，本次运行结束', ok: 1 });
      setStage(stage, rowWrap(svg, panel('路由函数返回值', rows, 235)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   6. lg-checkpoint — 检查点：超步后存档 + 时间旅行
   ------------------------------------------------------------ */
function lgCheckpoint(host) {
  const V = [
    { id: 'S', v: 'START', x: 80, y: 34 },
    { id: 'C', v: 'chatbot', x: 80, y: 126 },
    { id: 'T', v: 'tools', x: 220, y: 126 },
    { id: 'E', v: 'END', x: 80, y: 228 },
  ];
  const EDGE = (es) => [
    { a: 'S', b: 'C', state: es.SC || 'idle' },
    { a: 'C', b: 'T', state: es.CT || 'idle' },
    { a: 'T', b: 'C', state: es.TC || 'idle' },
    { a: 'C', b: 'E', state: es.CE || 'idle' },
  ];
  // checkpoint 列表（thread_id = "t1"）
  const CKS = [
    { id: 'ck-0', s: 'msgs: [Human] · next: chatbot' },
    { id: 'ck-1', s: 'msgs: [H, AI(tool_call)] · next: tools' },
    { id: 'ck-2', s: 'msgs: [H, AI, Tool] · next: chatbot' },
    { id: 'ck-3', s: 'msgs: [H, AI, Tool, AI] · next: END' },
  ];

  const F = [];
  const fr = (say, o) => F.push({ say, vs: {}, es: {}, n: 0, hot: -1, fork: 0, ...o });

  fr('<b>检查点（checkpoint）</b>：LangGraph 每执行完一个<b>超步（superstep，一轮节点执行）</b>，就把当前 state 完整存进 checkpointer（如 SQLite）。同一会话的所有存档挂在一个 <b>thread_id</b> 下。', { line: [0, 1] });
  fr('运行「查一下明天的日出时间」。输入进入图，<b>存下 ck-0</b>：记录了初始消息和"下一步该执行 chatbot"。', { line: 2, n: 1, hot: 0, vs: { S: 'active' }, es: {} });
  fr('超步 1：<code>chatbot</code> 执行，LLM 输出 tool_call。执行完毕→<b>自动存 ck-1</b>。存档列表随执行增长。', { line: 2, n: 2, hot: 1, vs: { S: 'done', C: 'active' }, es: { SC: 'visited' } });
  fr('超步 2：<code>tools</code> 查询日出时间，结果追加进 state → <b>存 ck-2</b>。', { line: 2, n: 3, hot: 2, vs: { S: 'done', C: 'done', T: 'active' }, es: { SC: 'visited', CT: 'visited' } });
  fr('超步 3：<code>chatbot</code> 综合结果生成回答 → <b>存 ck-3</b>，到达 END。一次运行 = 一串可回放的快照。', { line: 2, n: 4, hot: 3, vs: { S: 'done', C: 'active', T: 'done', E: 'done' }, es: { SC: 'visited', CT: 'visited', TC: 'visited', CE: 'visited' } });
  fr('价值一：<b>断点续跑</b>。进程崩了？带同一个 <code>thread_id</code> 再 invoke，从最后一个 checkpoint 接着走，前面的工作不白费。', { line: 3, n: 4, vs: { E: 'done' } });
  fr('价值二：<b>时间旅行（time travel）</b>。用 <code>get_state_history</code> 翻出历史存档——比如选中 <b>ck-2</b>（工具刚返回、还没生成回答的时刻）。', { line: 4, n: 4, hot: 2, vs: { T: 'pivot' } });
  fr('<b>时间倒回</b>：把 ck-2 的 checkpoint_id 传给 invoke，图的"当前时刻"回到超步 2 之后——之后的 ck-3 不影响这条新时间线。', { line: 5, n: 4, hot: 2, vs: { S: 'dim', C: 'active', T: 'done', E: 'dim' }, es: { SC: 'dim', CT: 'dim', TC: 'active', CE: 'dim' } });
  fr('从 ck-2 <b>重新执行</b> chatbot：这次可以换个 prompt 或改掉 state 里的某条消息，让它生成不同风格的回答——历史<b>分叉（fork）</b>出一条新分支 ck-3\'。', { line: 5, n: 4, hot: 2, fork: 1, vs: { S: 'dim', C: { state: 'active', pulse: 1 }, T: 'done' }, es: { TC: 'visited' } });
  fr('新时间线到达 END，产生 <b>ck-3\'</b>。旧的 ck-3 仍在数据库里。<b>执行历史成了一棵可分叉的树</b>——这就是调试 Agent、A/B 重放的底层机制。', { line: 5, n: 4, fork: 2, vs: { S: 'dim', C: 'done', T: 'done', E: 'done' }, es: { TC: 'visited', CE: 'path' } });

  return new Player({
    title: '检查点：每个超步存档，可回滚可分叉',
    badge: 'LangGraph',
    speed: 1700,
    legend: [
      { c: '--viz-active', t: '正在执行' },
      { c: '--viz-pivot', t: '选中的存档时刻' },
      { c: '--viz-path', t: '分叉新时间线' },
    ],
    pseudo: [
      'ckpt = SqliteSaver("agent.db")',
      'graph = g.compile(checkpointer=ckpt)',
      'cfg = {"configurable": {"thread_id": "t1"}}',
      'graph.invoke(inputs, cfg)      # 每超步自动存档',
      'hist = graph.get_state_history(cfg)  # 翻历史',
      'graph.invoke(None, {..., "checkpoint_id": ck2})  # 从 ck-2 分叉重放',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const verts = V.map((v) => {
        const o = (f.vs || {})[v.id] ? normSt(f.vs[v.id]) : {};
        return { ...v, state: o.state || 'idle', pop: o.pop };
      });
      const svg = drawGraph({ verts, edges: EDGE(f.es || {}), directed: true, uid: 'lgk', r: 23 });
      const rows = [{ t: 'thread_id: "t1"', head: 1 }];
      for (let i = 0; i < f.n; i++) {
        rows.push({
          t: `${CKS[i].id}  ${CKS[i].s}`,
          hot: i === f.hot,
          dim: f.fork && i === 3,
        });
      }
      if (f.fork >= 1) rows.push({ t: "ck-3' ← 从 ck-2 分叉的新时间线", warn: f.fork === 1, ok: f.fork === 2 });
      if (!f.n) rows.push({ t: '（尚无存档）', dim: 1 });
      setStage(stage, rowWrap(svg, panel('checkpoint 存档列表', rows, 265)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   7. lg-hitl — 人在回路：interrupt 审批
   ------------------------------------------------------------ */
function lgHitl(host) {
  const NODES = [
    { id: 'S', x: 70, y: 34, w: 84, h: 30, shape: 'pill', label: 'START', fs: 10.5 },
    { id: 'A', x: 70, y: 118, w: 100, h: 40, label: 'agent' },
    { id: 'M', x: 250, y: 118, w: 122, h: 44, label: 'send_email', small: '敏感工具', fs: 11 },
    { id: 'H', x: 250, y: 30, w: 118, h: 36, shape: 'pill', label: '人类审批', dash: 1, fs: 11 },
    { id: 'E', x: 70, y: 218, w: 80, h: 30, shape: 'pill', label: 'END', fs: 10.5 },
  ];
  const EDGES = [
    { k: 'sa', a: 'S', b: 'A' },
    { k: 'am', a: 'A', b: 'M' },
    { k: 'mh', a: 'M', b: 'H', dash: 1, label: 'interrupt' },
    { k: 'hm', a: 'H', b: 'M', dash: 1, curve: -30 },
    { k: 'ma', a: 'M', b: 'A', curve: -40, label: '发送结果', ly: 18 },
    { k: 'ae', a: 'A', b: 'E' },
  ];

  const F = [];
  const fr = (say, o) => F.push({ say, ns: {}, es: {}, rows: [], ...o });
  const draft = { t: 'args: to=boss@x.com', h: '  subject="周报"' };

  fr('<b>人在回路（Human-in-the-loop，HITL）</b>：Agent 可以自动干活，但「发邮件、转账、删库」这类<b>不可逆操作</b>执行前必须有人把关。LangGraph 用 <code>interrupt()</code> 实现暂停。', { line: 0 });
  fr('<b>分支一：批准</b>。任务「给老板发周报邮件」，agent 起草好邮件，产出 <code>send_email</code> 的调用参数。', { line: 5,
    ns: { S: 'done', A: 'active' }, es: { sa: 'visited' },
    rows: [{ t: '任务: 给老板发周报', head: 1 }, draft.t, draft.h] });
  fr('state 流向 <code>send_email</code>。节点函数一进来先执行 <code>interrupt(payload)</code>——它会<b>抛出中断，图停在这里</b>。', { line: [1, 2],
    ns: { S: 'done', A: 'done', M: 'compare' }, es: { sa: 'visited', am: { state: 'active', msg: 'tool_call' } },
    rows: [{ t: '任务: 给老板发周报', head: 1 }, draft.t, draft.h] });
  fr('图<b>挂起（paused）</b>：state 被 checkpointer 存住，进程甚至可以退出。节点闪烁等待——哪怕人一天后才来审，都能原地恢复。', { line: 2,
    ns: { S: 'done', A: 'done', M: { state: 'compare', pulse: 1 }, H: { state: 'active', pulse: 1 } },
    es: { sa: 'visited', am: 'visited', mh: { state: 'active', msg: '待审: 发给 boss@x.com?' } },
    rows: [{ t: '状态: INTERRUPTED (等待人类)', warn: 1 }, draft.t, draft.h] });
  fr('审批人查看邮件内容后<b>批准</b>：用 <code>Command(resume={"action": "approve"})</code> 恢复执行，决定值从暂停点"返回"。', { line: [6, 7],
    ns: { S: 'done', A: 'done', M: 'compare', H: 'done' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: { state: 'done', msg: 'approve' } },
    rows: [{ t: '人类决定: 批准 approve', ok: 1 }, draft.t, draft.h] });
  fr('<code>interrupt()</code> 的返回值就是人给的 resume 数据 → 走批准分支，<b>真正发出邮件</b>。', { line: [2, 3],
    ns: { S: 'done', A: 'done', M: { state: 'done', pop: 1 }, H: 'done' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: 'visited' },
    rows: [{ t: '已发送: 周报 → boss@x.com', ok: 1 }] });
  fr('发送结果回到 agent，汇报完成，走向 END。<b>分支一结束</b>。', { line: 8,
    ns: { S: 'done', A: 'done', M: 'done', H: 'done', E: 'done' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: 'visited', ma: 'visited', ae: 'path' },
    rows: [{ t: 'AI: 邮件已发送（周报）', ok: 1 }] });
  fr('<b>分支二：拒绝并改参数</b>。同样的流程再来一次：这次 agent 起草的收件人写错了——把周报发给了<b>全员</b>。', { line: 5,
    ns: { S: 'done', A: 'active' }, es: { sa: 'visited' },
    rows: [{ t: '任务: 给老板发周报', head: 1 }, { t: 'args: to=all@x.com  ← 收件人可疑!', warn: 1 }] });
  fr('再次在 <code>send_email</code> 前中断挂起。审批人发现问题：这封邮件不该发给所有人。', { line: 2,
    ns: { S: 'done', A: 'done', M: { state: 'compare', pulse: 1 }, H: { state: 'active', pulse: 1 } },
    es: { sa: 'visited', am: 'visited', mh: { state: 'active', msg: '待审: 发给 all@x.com?' } },
    rows: [{ t: '状态: INTERRUPTED (等待人类)', warn: 1 }, { t: 'args: to=all@x.com', warn: 1 }] });
  fr('人类<b>拒绝原参数并给出修正</b>：<code>resume={"action": "edit", "to": "boss@x.com"}</code>。人不只是按按钮，还能<b>改数据</b>。', { line: [6, 7],
    ns: { S: 'done', A: 'done', M: 'compare', H: 'path' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: { state: 'path', msg: 'edit: to=boss@x.com' } },
    rows: [{ t: '人类决定: 拒绝, 改收件人', warn: 1 }, { t: 'to: all@x.com → boss@x.com', hot: 1 }] });
  fr('节点<b>用修正后的参数</b>执行发送——错误在造成事故前被拦下。这就是 HITL 的意义：<b>自动化提效，人类兜底</b>。', { line: [3, 4],
    ns: { S: 'done', A: 'done', M: { state: 'done', pop: 1 }, H: 'path' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: 'visited' },
    rows: [{ t: '已发送: 周报 → boss@x.com', ok: 1 }, { t: '(按人类修正后的参数)', dim: 1 }] });
  fr('两条分支殊途同归：<b>批准 → 原样执行；拒绝 → 改参数再执行</b>。中断依赖 checkpointer 存 state，所以等多久都行——这是生产级 Agent 的标配。', { line: [0, 2],
    ns: { S: 'done', A: 'done', M: 'done', H: 'done', E: 'done' },
    es: { sa: 'visited', am: 'visited', mh: 'visited', hm: 'visited', ma: 'visited', ae: 'path' },
    rows: [{ t: '分支①: approve → 直接执行', ok: 1 }, { t: '分支②: edit → 新参数执行', ok: 1 }] });

  return new Player({
    title: '人在回路：敏感操作前 interrupt 暂停',
    badge: 'HITL',
    speed: 1750,
    legend: [
      { c: '--viz-compare', t: '挂起等待' },
      { c: '--viz-active', t: '人类介入' },
      { c: '--viz-path', t: '拒绝/修改' },
      { c: '--viz-done', t: '批准/完成' },
    ],
    pseudo: [
      'def send_email(state):',
      '    decision = interrupt({          # 图在此暂停,',
      '        "draft": state["draft"]})   # state 落盘等待',
      '    if decision["action"] == "edit":',
      '        state["draft"]["to"] = decision["to"]  # 采纳修改',
      '    return really_send(state["draft"])',
      '# 恢复执行（人类审批后）：',
      'graph.invoke(Command(resume={"action": "approve"}), cfg)',
      'g.add_edge("send_email", "agent")',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const svg = drawFlow({
        W: 360, H: 250,
        nodes: mergeNodes(NODES, f.ns),
        edges: mergeEdges(EDGES, f.es),
      });
      setStage(stage, rowWrap(svg, panel('审批台', f.rows.length ? f.rows : [{ t: '（暂无待审事项）', dim: 1 }], 235)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   8. lg-multi — 多智能体 Supervisor 模式
   ------------------------------------------------------------ */
function lgMulti(host) {
  const NODES = [
    { id: 'U', x: 210, y: 30, w: 92, h: 30, shape: 'pill', label: '用户', fs: 11 },
    { id: 'SUP', x: 210, y: 128, w: 128, h: 46, label: 'supervisor', small: '调度中枢', fs: 11.5 },
    { id: 'R', x: 62, y: 236, w: 100, h: 44, label: '研究员', small: 'researcher', fs: 11.5 },
    { id: 'C', x: 210, y: 250, w: 100, h: 44, label: '编码者', small: 'coder', fs: 11.5 },
    { id: 'V', x: 358, y: 236, w: 100, h: 44, label: '审阅者', small: 'reviewer', fs: 11.5 },
  ];
  const EDGES = [
    { k: 'us', a: 'U', b: 'SUP' },
    { k: 'sr', a: 'SUP', b: 'R', curve: 14 },
    { k: 'rs', a: 'R', b: 'SUP', curve: 14 },
    { k: 'sc', a: 'SUP', b: 'C', curve: 14 },
    { k: 'cs', a: 'C', b: 'SUP', curve: 14 },
    { k: 'sv', a: 'SUP', b: 'V', curve: -14 },
    { k: 'vs', a: 'V', b: 'SUP', curve: -14 },
    { k: 'su', a: 'SUP', b: 'U', curve: -56, dash: 1, label: 'FINISH', lx: -30 },
  ];
  const TODO = (r, c, v) => [
    { t: '任务: 写一个汇率换算脚本', head: 1 },
    { t: `${r ? '[x]' : '[ ]'} 调研: 找汇率 API`, ok: r, hot: r === 2 },
    { t: `${c ? '[x]' : '[ ]'} 编码: 写 Python 脚本`, ok: c, hot: c === 2 },
    { t: `${v ? '[x]' : '[ ]'} 审阅: 检查代码质量`, ok: v, hot: v === 2 },
  ];

  const F = [];
  const fr = (say, o) => F.push({ say, ns: {}, es: {}, rows: [], ...o });

  fr('<b>Supervisor（主管）模式</b>：一个中枢 agent 负责<b>拆解任务、派活、验收</b>，三个专家 agent 各司其职。每个 agent 都是独立的 LLM 循环，中枢本身也是一个 LLM——用它的判断力做路由。', { line: 0, rows: TODO(0, 0, 0) });
  fr('用户提交任务：「写一个汇率换算脚本」。任务先到 supervisor 手里。', { line: 5,
    ns: { U: 'done', SUP: { state: 'active', pulse: 1 } }, es: { us: { state: 'active', msg: '写汇率换算脚本' } }, rows: TODO(0, 0, 0) });
  fr('supervisor 思考：写脚本得先知道用哪个汇率数据源 → <b>路由给研究员</b>。路由本质是 LLM 的结构化输出：<code>{"next": "researcher"}</code>。', { line: [1, 2],
    ns: { U: 'done', SUP: 'done', R: { state: 'active', pulse: 1 } },
    es: { us: 'visited', sr: { state: 'active', msg: '子任务: 找汇率 API' } }, rows: TODO(2, 0, 0) });
  fr('研究员（自己也是个带搜索工具的 agent）干活：查到 <code>exchangerate.host</code> 免费 API，把结论写进共享 state，<b>回报</b> supervisor。', { line: 6,
    ns: { U: 'done', SUP: 'active', R: 'done' },
    es: { us: 'visited', sr: 'visited', rs: { state: 'done', msg: '汇报: 可用 API 找到' } }, rows: TODO(1, 0, 0) });
  fr('supervisor 验收调研结果，决定下一步：材料齐了 → <b>路由给编码者</b>。注意每次决策它都会看全部历史。', { line: [1, 2],
    ns: { U: 'done', SUP: 'done', R: 'visited', C: { state: 'active', pulse: 1 } },
    es: { us: 'visited', rs: 'visited', sc: { state: 'active', msg: '子任务: 写脚本' } }, rows: TODO(1, 2, 0) });
  fr('编码者按调研结论写出 <code>convert.py</code>（请求 API + 命令行参数），产物追加进 state，回报。', { line: 6,
    ns: { U: 'done', SUP: 'active', R: 'visited', C: 'done' },
    es: { us: 'visited', sc: 'visited', cs: { state: 'done', msg: '汇报: convert.py 完成' } }, rows: TODO(1, 1, 0) });
  fr('supervisor 不直接相信"完成"二字 → <b>路由给审阅者</b>把关代码质量。', { line: [1, 2],
    ns: { U: 'done', SUP: 'done', R: 'visited', C: 'visited', V: { state: 'active', pulse: 1 } },
    es: { us: 'visited', cs: 'visited', sv: { state: 'active', msg: '子任务: 审代码' } }, rows: TODO(1, 1, 2) });
  fr('审阅者发现问题：<b>没有处理网络超时</b>。意见写回 state，回报 supervisor——验收不通过。', { line: 6,
    ns: { U: 'done', SUP: 'active', R: 'visited', C: 'visited', V: 'done' },
    es: { us: 'visited', sv: 'visited', vs: { state: 'compare', msg: '意见: 缺超时处理!' } },
    rows: [...TODO(1, 1, 1), { t: '审阅意见: 缺超时处理 → 返工', warn: 1 }] });
  fr('supervisor 读到审阅意见，<b>再次路由给编码者返工</b>——这就是中枢的价值：根据结果动态决定流程，而不是走死流水线。', { line: [1, 2],
    ns: { U: 'done', SUP: 'done', R: 'visited', C: { state: 'active', pulse: 1 }, V: 'visited' },
    es: { us: 'visited', vs: 'visited', sc: { state: 'compare', msg: '返工: 补超时处理' } },
    rows: [...TODO(1, 2, 1), { t: '第 2 轮编码进行中…', hot: 1 }] });
  fr('编码者补上 <code>timeout=5</code> 与重试逻辑，再次提交；审阅者复查<b>通过</b>。', { line: 6,
    ns: { U: 'done', SUP: 'active', R: 'visited', C: 'done', V: 'done' },
    es: { us: 'visited', cs: { state: 'done', msg: 'v2 完成' }, vs: { state: 'done', msg: '复查通过' } },
    rows: [...TODO(1, 1, 1), { t: '审阅: v2 通过', ok: 1 }] });
  fr('三个子任务全部勾掉，supervisor 判断<b>无事可做 → 返回 FINISH</b>，把最终成果交还用户。', { line: [3, 4],
    ns: { U: { state: 'done', pop: 1 }, SUP: 'done', R: 'visited', C: 'visited', V: 'visited' },
    es: { su: { state: 'path', msg: '交付 convert.py' } },
    rows: [...TODO(1, 1, 1), { t: '状态: FINISH, 任务交付', ok: 1 }] });
  fr('小结：<b>专家分工 + 中枢调度</b>。好处是每个 agent 的 prompt/工具都更单纯、可独立测试；代价是多轮 LLM 调用更贵。别为简单任务上多智能体。', { line: 0,
    ns: { U: 'done', SUP: 'done', R: 'visited', C: 'visited', V: 'visited' }, es: {},
    rows: TODO(1, 1, 1) });

  return new Player({
    title: 'Supervisor 多智能体：中枢派活，专家干活',
    badge: '多智能体',
    speed: 1700,
    legend: [
      { c: '--viz-active', t: '被指派/执行中' },
      { c: '--viz-done', t: '完成回报' },
      { c: '--viz-compare', t: '发现问题' },
      { c: '--viz-path', t: '最终交付' },
    ],
    pseudo: [
      'workers = ["researcher", "coder", "reviewer"]',
      'def supervisor(state):        # 中枢也是一个 LLM',
      '    nxt = llm.with_structured_output(Route).invoke(',
      '        [SYS_PROMPT] + state["messages"])   # 决定下一位',
      '    return Command(goto=nxt.next)  # 或 FINISH',
      'for w in workers:  g.add_node(w, make_agent(w))',
      '# 每个 worker 干完活: return Command(goto="supervisor")',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const svg = drawFlow({
        W: 430, H: 296,
        nodes: mergeNodes(NODES, f.ns),
        edges: mergeEdges(EDGES, f.es),
      });
      setStage(stage, rowWrap(svg, panel('任务进度（共享 state）', f.rows, 235)));
    },
  }).mount(host);
}

/* ------------------------------------------------------------
   9. lg-rag — RAG 与 Agentic RAG
   ------------------------------------------------------------ */
function lgRag(host) {
  const NODES = [
    { id: 'Q', x: 68, y: 40, w: 96, h: 36, shape: 'pill', label: '查询', fs: 11.5 },
    { id: 'EMB', x: 68, y: 130, w: 104, h: 42, label: '向量化', small: 'embed', fs: 11.5 },
    { id: 'RET', x: 68, y: 228, w: 104, h: 42, label: '检索', small: 'top-k', fs: 11.5 },
    { id: 'P', x: 252, y: 228, w: 104, h: 42, label: '拼 Prompt', fs: 11 },
    { id: 'L', x: 252, y: 130, w: 104, h: 42, label: 'LLM 生成', fs: 11 },
    { id: 'A', x: 252, y: 40, w: 110, h: 36, shape: 'pill', label: '带引用回答', fs: 10.5 },
    { id: 'RW', x: 425, y: 130, w: 110, h: 42, label: '改写查询', small: 'rewrite', dash: 1, fs: 11 },
  ];
  const EDGES = [
    { k: 'qe', a: 'Q', b: 'EMB' },
    { k: 'er', a: 'EMB', b: 'RET' },
    { k: 'rp', a: 'RET', b: 'P' },
    { k: 'pl', a: 'P', b: 'L' },
    { k: 'la', a: 'L', b: 'A' },
    { k: 'lr', a: 'L', b: 'RW', dash: 1, label: '不相关', ly: -6 },
    { k: 're', a: 'RW', b: 'EMB', curve: -78, dash: 1, label: '重新检索', ly: -8 },
  ];
  // 文档库（4 篇）
  const DOCS = [
    { id: 'd1', t: 'D1 请假流程规定' },
    { id: 'd2', t: 'D2 年假天数细则' },
    { id: 'd3', t: 'D3 食堂菜单公告' },
    { id: 'd4', t: 'D4 差旅报销标准' },
  ];
  const docRows = (hl, sim) => DOCS.map((d, i) => ({
    t: d.t + (sim && sim[i] != null ? `  sim=${sim[i]}` : ''),
    hot: hl && hl.includes(i) ? 1 : 0,
    dim: hl && !hl.includes(i) ? 1 : 0,
  }));

  const F = [];
  const fr = (say, o) => F.push({ say, ns: {}, es: {}, rows: [], pt: '文档库（向量索引）', ...o });

  fr('<b>RAG（Retrieval-Augmented Generation，检索增强生成）</b>：LLM 不知道你公司的内部文档，与其重新训练，不如<b>先检索、再作答</b>。右侧是已被切块并建好向量索引的文档库。', { line: 0, rows: docRows() });
  fr('用户问：「入职第一年有几天年假？」查询进入流水线。', { line: 1,
    ns: { Q: 'active' }, rows: docRows() });
  fr('<b>向量化（embedding）</b>：把查询文本变成一个高维数字向量，语义相近的文本向量也相近——这是"按意思找"而非"按关键词找"的基础。', { line: 1,
    ns: { Q: 'done', EMB: { state: 'active', pulse: 1 } }, es: { qe: { state: 'active', msg: '[0.12, -0.83, …]' } }, rows: docRows() });
  fr('<b>检索</b>：拿查询向量和库里每个文档块算相似度。<b>D2（年假细则）相似度最高</b>，D1 次之；食堂菜单彻底无关。取 top-2。', { line: 2,
    ns: { Q: 'done', EMB: 'done', RET: { state: 'active', pulse: 1 } }, es: { qe: 'visited', er: 'active' },
    rows: docRows([0, 1], ['0.71', '0.93', '0.08', '0.22']) });
  fr('<b>拼 Prompt</b>：把检索到的 D2、D1 原文塞进提示词，明确要求「只依据资料回答，注明出处」。', { line: [3, 4],
    ns: { Q: 'done', EMB: 'done', RET: 'done', P: 'active' }, es: { qe: 'visited', er: 'visited', rp: { state: 'active', msg: 'D2 + D1 原文' } },
    rows: docRows([0, 1], ['0.71', '0.93', '0.08', '0.22']) });
  fr('LLM 基于资料生成回答：「入职第一年按在职月份折算年假，满一年 5 天 <b>[来源: D2]</b>」。带引用 → 可核查、少幻觉。<b>经典 RAG 到此结束</b>。', { line: 5,
    ns: { Q: 'done', EMB: 'done', RET: 'done', P: 'done', L: 'done', A: { state: 'done', pop: 1 } },
    es: { qe: 'visited', er: 'visited', rp: 'visited', pl: 'visited', la: { state: 'path', msg: '答案 [来源: D2]' } },
    rows: docRows([0, 1], ['0.71', '0.93', '0.08', '0.22']) });
  fr('但经典 RAG 是<b>一条直线：检索一次，赌它命中</b>。换个刁钻的问题：「五险一金公司交多少？」——用户嘴里的"五险一金"，文档里可能写作"社会保险及住房公积金"。', { line: 6,
    ns: { Q: 'active', RW: 'idle' }, rows: docRows() });
  fr('检索结果很差：最高相似度只有 0.31，抓回来的是请假流程和报销标准——<b>全都答非所问</b>。', { line: 2,
    ns: { Q: 'done', EMB: 'done', RET: 'compare' }, es: { qe: 'visited', er: 'visited' },
    rows: docRows([], ['0.31', '0.19', '0.05', '0.28']), pt: '文档库：本轮无高分命中' });
  fr('<b>Agentic RAG</b> 的关键一步：把检索结果先交给 LLM <b>评分（grade）</b>。LLM 判定「文档与问题不相关」——不硬答，触发"不相关"分支。', { line: [7, 8],
    ns: { Q: 'done', EMB: 'done', RET: 'visited', L: { state: 'compare', pulse: 1 } },
    es: { qe: 'visited', er: 'visited', lr: { state: 'compare', msg: 'grade: 不相关' } },
    rows: docRows([], ['0.31', '0.19', '0.05', '0.28']) });
  fr('<b>改写查询（rewrite）</b>：LLM 把口语换成文档用语——「五险一金」→「社会保险 住房公积金 缴纳比例」。循环边亮起，<b>回到向量化重新检索</b>。', { line: 9,
    ns: { Q: 'dim', EMB: 'active', RET: 'visited', L: 'visited', RW: { state: 'path', pop: 1 } },
    es: { lr: 'visited', re: { state: 'path', msg: '社会保险 公积金 缴纳比例' } },
    rows: docRows() });
  fr('第二轮检索命中了：新增入库的 <b>D5「社保公积金缴纳办法」相似度 0.95</b>。改个说法，答案就浮出水面。', { line: 2,
    ns: { EMB: 'done', RET: { state: 'active', pulse: 1 }, RW: 'visited' }, es: { re: 'visited', er: 'active' },
    rows: [...docRows([], ['0.24', '0.18', '0.04', '0.33']), { t: 'D5 社保公积金缴纳办法  sim=0.95', hot: 1 }] });
  fr('这次评分通过 → 拼 Prompt → 生成带引用的回答 <b>[来源: D5]</b>。完整闭环：<b>检索→评分→（不行就改写重试）→作答</b>。', { line: [5, 6],
    ns: { EMB: 'done', RET: 'done', P: 'done', L: 'done', A: { state: 'done', pop: 1 }, RW: 'visited' },
    es: { re: 'visited', er: 'visited', rp: 'visited', pl: 'visited', la: { state: 'path', msg: '答案 [来源: D5]' } },
    rows: [...docRows([], null), { t: 'D5 社保公积金缴纳办法', hot: 1 }] });
  fr('对比：经典 RAG 是<b>固定流水线</b>；Agentic RAG 让 LLM 参与决策——评估检索质量、必要时改写重查（要设最大重试次数防死循环）。质量换成本，按需选择。', { line: [6, 9],
    ns: { Q: 'done', EMB: 'done', RET: 'done', P: 'done', L: 'done', A: 'done', RW: 'visited' },
    es: { qe: 'visited', er: 'visited', rp: 'visited', pl: 'visited', la: 'visited', lr: 'visited', re: 'visited' },
    rows: docRows() });

  return new Player({
    title: 'RAG：先检索再回答，不行就改写重查',
    badge: 'RAG',
    speed: 1750,
    legend: [
      { c: '--viz-active', t: '当前阶段' },
      { c: '--viz-compare', t: '评分/不相关' },
      { c: '--viz-path', t: '改写循环/答案' },
    ],
    pseudo: [
      '# —— 经典 RAG：一条直线 ——',
      'vec = embed(query)                  # 查询向量化',
      'docs = index.search(vec, k=2)       # 相似度检索',
      'prompt = f"依据资料回答并注明出处:',
      '           {docs}\\n问题: {query}"',
      'answer = llm(prompt)                # 带引用生成',
      '# —— Agentic RAG：加评分与改写循环 ——',
      'for _ in range(MAX_RETRY):          # 防死循环',
      '    if grade(docs, query) == "相关": break',
      '    query = rewrite(query); docs = search(embed(query))',
    ],
    build: () => ({ frames: F, meta: {} }),
    draw(stage, f) {
      const svg = drawFlow({
        W: 500, H: 282,
        nodes: mergeNodes(NODES, f.ns),
        edges: mergeEdges(EDGES, f.es),
      });
      setStage(stage, rowWrap(svg, panel(f.pt, f.rows, 240)));
    },
  }).mount(host);
}

export const VIZ = {
  'agent-loop': agentLoop,
  'agent-tools': agentTools,
  'agent-react': agentReact,
  'lg-graph-basic': lgGraphBasic,
  'lg-conditional': lgConditional,
  'lg-checkpoint': lgCheckpoint,
  'lg-hitl': lgHitl,
  'lg-multi': lgMulti,
  'lg-rag': lgRag,
};
