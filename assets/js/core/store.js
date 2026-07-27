/* ============================================================
   本地进度存储（localStorage）
   ============================================================ */

const KEY = 'relearn.v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function write(o) {
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    /* 隐私模式下静默失败 */
  }
}

export const store = {
  /** 已完成的课程 id 集合 */
  done() {
    return new Set(read().done || []);
  },
  isDone(id) {
    return this.done().has(id);
  },
  toggleDone(id) {
    const s = this.done();
    s.has(id) ? s.delete(id) : s.add(id);
    const o = read();
    o.done = [...s];
    write(o);
    return s.has(id);
  },
  setDone(id, v) {
    const s = this.done();
    v ? s.add(id) : s.delete(id);
    const o = read();
    o.done = [...s];
    write(o);
  },

  /** 最近访问 */
  last() {
    return read().last || null;
  },
  setLast(id) {
    const o = read();
    o.last = id;
    write(o);
  },

  /** 主题 */
  theme() {
    return read().theme || null;
  },
  setTheme(t) {
    const o = read();
    o.theme = t;
    write(o);
  },

  /** 侧栏展开的分组 */
  openGroups() {
    return read().open || null;
  },
  setOpenGroups(arr) {
    const o = read();
    o.open = arr;
    write(o);
  },

  /* ---------- 题库进度：与课程 done[] 完全分离 ---------- */

  /** 已攻克的题目 key 集合（key 由题库内容层给出，形如 'hj-4' / 'lc-42'） */
  solved() {
    const b = read().bank;
    return new Set((b && b.solved) || []);
  },
  isSolved(key) {
    return this.solved().has(key);
  },
  toggleSolved(key) {
    const s = this.solved();
    s.has(key) ? s.delete(key) : s.add(key);
    const o = read();
    o.bank = { ...(o.bank || {}), solved: [...s] };
    write(o);
    return s.has(key);
  },

  /** 最近访问的套卷 */
  lastSet() {
    const b = read().bank;
    return (b && b.last) || null;
  },
  setLastSet(id) {
    const o = read();
    o.bank = { ...(o.bank || {}), last: id };
    write(o);
  },

  reset() {
    // 重置只清进度；主题是 UI 偏好，保留
    const o = read();
    write({ theme: o.theme });
  },
};
