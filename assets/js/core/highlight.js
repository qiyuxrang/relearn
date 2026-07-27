/* ============================================================
   轻量语法高亮：支持 C++ / Python / 伪代码 / 纯文本
   采用「一次扫描 + 优先级分词」，避免嵌套替换导致的标签污染
   ============================================================ */

const KW_CPP = new Set([
  'alignas','alignof','and','asm','auto','bool','break','case','catch','char','char8_t','char16_t',
  'char32_t','class','concept','const','consteval','constexpr','constinit','const_cast','continue',
  'co_await','co_return','co_yield','decltype','default','delete','do','double','dynamic_cast','else',
  'enum','explicit','export','extern','false','float','for','friend','goto','if','inline','int','long',
  'mutable','namespace','new','noexcept','not','nullptr','operator','or','private','protected','public',
  'register','reinterpret_cast','requires','return','short','signed','sizeof','static','static_assert',
  'static_cast','struct','switch','template','this','thread_local','throw','true','try','typedef',
  'typeid','typename','union','unsigned','using','virtual','void','volatile','wchar_t','while','xor',
]);

const TYPE_CPP = new Set([
  'std','string','string_view','vector','deque','list','forward_list','array','map','set','multimap',
  'multiset','unordered_map','unordered_set','unordered_multimap','unordered_multiset','stack','queue',
  'priority_queue','pair','tuple','optional','variant','any','function','shared_ptr','unique_ptr',
  'weak_ptr','size_t','ptrdiff_t','uint32_t','int32_t','uint64_t','int64_t','int8_t','uint8_t',
  'int16_t','uint16_t','ostream','istream','iterator','const_iterator','initializer_list','bitset',
  'span','ranges','views','numeric_limits','allocator','hash','less','greater','swap','move','forward',
]);

const KW_PY = new Set([
  'False','None','True','and','as','assert','async','await','break','class','continue','def','del',
  'elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal',
  'not','or','pass','raise','return','try','while','with','yield','match','case','self','cls',
]);

const TYPE_PY = new Set([
  'int','str','float','bool','list','dict','set','tuple','bytes','object','type','Any','Optional',
  'List','Dict','Set','Tuple','Union','Callable','TypedDict','Annotated','Literal','Sequence',
  'Iterator','Generator','Enum','dataclass','StateGraph','START','END','Command','Send',
  'MemorySaver','ToolNode','BaseMessage','HumanMessage','AIMessage','SystemMessage','ToolMessage',
  'ChatAnthropic','print','len','range','enumerate','zip','map','filter','sorted','sum','min','max',
  'abs','isinstance','super','append','add_node','add_edge','add_conditional_edges','compile',
  'invoke','stream','bind_tools',
]);

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (cls, txt) => `<span class="tk-${cls}">${esc(txt)}</span>`;

/**
 * 对单行以外的整段源码做分词高亮
 * @param {string} src  源码
 * @param {string} lang 'cpp' | 'python' | 'text'
 * @returns {string} HTML
 */
export function highlight(src, lang = 'cpp') {
  if (lang === 'text' || lang === 'plain') return esc(src);

  const isPy = lang === 'python' || lang === 'py';
  const KW = isPy ? KW_PY : KW_CPP;
  const TY = isPy ? TYPE_PY : TYPE_CPP;

  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // --- 注释 ---
    if (!isPy && c === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j === -1) j = n;
      out += span('com', src.slice(i, j));
      i = j;
      continue;
    }
    if (!isPy && c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      out += span('com', src.slice(i, j));
      i = j;
      continue;
    }
    if (isPy && c === '#') {
      let j = src.indexOf('\n', i);
      if (j === -1) j = n;
      out += span('com', src.slice(i, j));
      i = j;
      continue;
    }

    // --- Python 三引号字符串 / 文档串 ---
    if (isPy && (src.startsWith('"""', i) || src.startsWith("'''", i))) {
      const q = src.slice(i, i + 3);
      let j = src.indexOf(q, i + 3);
      j = j === -1 ? n : j + 3;
      out += span('com', src.slice(i, j));
      i = j;
      continue;
    }

    // --- 预处理指令 (C++) ---
    if (!isPy && c === '#' && (i === 0 || src[i - 1] === '\n')) {
      let j = src.indexOf('\n', i);
      if (j === -1) j = n;
      const line = src.slice(i, j);
      // #include <foo> 中的 <foo> 用字符串色
      const m = line.match(/^(#\s*\w+)(\s*)(.*)$/);
      if (m) {
        out += span('pre', m[1]) + esc(m[2]);
        if (/^[<"]/.test(m[3])) out += span('str', m[3]);
        else out += esc(m[3]);
      } else {
        out += span('pre', line);
      }
      i = j;
      continue;
    }

    // --- 字符串 / 字符字面量 ---
    if (c === '"' || c === "'" || (c === '`' && !isPy)) {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        if (src[j] === '\n') break;
        j++;
      }
      out += span('str', src.slice(i, j));
      i = j;
      continue;
    }

    // --- 数字 ---
    if (/[0-9]/.test(c) && !/[A-Za-z_$]/.test(src[i - 1] || '')) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXbBoO._']/.test(src[j])) j++;
      while (j < n && /[uUlLfF]/.test(src[j])) j++;
      out += span('num', src.slice(i, j));
      i = j;
      continue;
    }

    // --- 标识符 / 关键字 / 类型 / 函数调用 ---
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);

      // 向前看：跳过空格后是否为 '('
      let k = j;
      while (k < n && src[k] === ' ') k++;
      const isCall = src[k] === '(';

      if (KW.has(word))       out += span('key', word);
      else if (TY.has(word))  out += span('type', word);
      else if (isCall && !KW.has(word)) out += span('fn', word);
      else if (/^[A-Z][A-Za-z0-9_]*$/.test(word) && word.length > 1) out += span('type', word);
      else out += esc(word);

      i = j;
      continue;
    }

    // --- 运算符 ---
    if (/[+\-*/%=<>!&|^~?:.,;]/.test(c)) {
      let j = i;
      while (j < n && /[+\-*/%=<>!&|^~?:.]/.test(src[j])) j++;
      if (j === i) j = i + 1;
      out += span('op', src.slice(i, j));
      i = j;
      continue;
    }

    out += esc(c);
    i++;
  }

  return out;
}

/** 单个语言面板的高亮正文（含行高亮） */
function paneBody(code, lang, hl) {
  const src = String(code).replace(/^\n+|\s+$/g, '');
  if (hl && hl.length) {
    const set = new Set(hl);
    return src
      .split('\n')
      .map((ln, idx) =>
        set.has(idx + 1)
          ? `<span class="line-hl">${highlight(ln, lang) || ' '}</span>`
          : highlight(ln, lang)
      )
      .join('\n');
  }
  return highlight(src, lang);
}

const paneLabel = (name, lang) =>
  name || (lang === 'python' ? 'python' : lang === 'text' ? 'text' : 'C++');

const COPY_BTN = `
    <button class="copy-btn" type="button" data-copy>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      <span>复制</span>
    </button>`;

/**
 * 渲染完整代码块（含标题栏与复制按钮）
 * @param {object} o
 * @param {string} o.code   源码
 * @param {string} [o.lang] 语言
 * @param {string} [o.name] 文件名/标题
 * @param {number[]} [o.hl] 需高亮的行号（1-based）
 */
export function codeBlock({ code, lang = 'python', name = '', hl = [] }) {
  const body = paneBody(code, lang, hl);
  return `
<div class="codeblock">
  <div class="codeblock__bar">
    <span class="codeblock__dots"><i></i><i></i><i></i></span>
    <span class="codeblock__name">${esc(paneLabel(name, lang))}</span>${COPY_BTN}
  </div>
  <pre><code>${body}</code></pre>
</div>`;
}

export { esc as escapeHtml };
