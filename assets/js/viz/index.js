/* ============================================================
   可视化注册中心：kind → 构造函数
   逐模块隔离加载：单个模块损坏只丢失它自己的动画
   ============================================================ */

const MODULE_FILES = [
  './basics.js',
  './sorts.js',
  './structs.js',
  './trees.js',
  './graphs.js',
  './dp.js',
  './agent.js',
];

const REGISTRY = {};

const results = await Promise.allSettled(MODULE_FILES.map((f) => import(f)));
results.forEach((r, i) => {
  if (r.status === 'fulfilled' && r.value && r.value.VIZ) {
    Object.assign(REGISTRY, r.value.VIZ);
  } else {
    console.error(`[viz] 模块加载失败: ${MODULE_FILES[i]}`, r.reason || '(无 VIZ 导出)');
  }
});

/**
 * 挂载一个可视化到宿主元素
 * @param {string} kind 可视化标识
 * @param {HTMLElement} host 占位元素（会被替换）
 * @param {object} opts 参数
 */
export function mountViz(kind, host, opts = {}) {
  const factory = REGISTRY[kind];
  if (!factory) {
    console.warn(`[viz] 未注册的演示: ${kind}`);
    host.outerHTML = `<div class="callout callout--note"><div class="callout__body">
      <p>演示 <code>${kind}</code> 尚未实现或加载失败。</p></div></div>`;
    return null;
  }
  return factory(host, opts);
}

export const VIZ_KINDS = Object.keys(REGISTRY);
