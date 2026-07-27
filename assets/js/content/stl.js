/* ============================================================
   STL 标准容器 —— 模块课程内容（纯数据，不 import 任何东西）
   覆盖课程：stl-overview / stl-vector / stl-deque / stl-map /
             stl-hash / stl-adapter / stl-algo
   动画 kind 一律按 SPEC 用字符串引用
   ============================================================ */

/* 复杂度徽标与 HTML 表格的小工具（本文件内部使用，非导出） */
const G = (t) => `<span class="cx cx--good">${t}</span>`;
const M = (t) => `<span class="cx cx--mid">${t}</span>`;
const B = (t) => `<span class="cx cx--bad">${t}</span>`;
const tbl = (head, rows) =>
  `<div class="table-wrap"><table><thead><tr>${head
    .map((h) => `<th>${h}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

export const lessons = {
  /* ==========================================================
     stl-overview  STL 全景
     ========================================================== */
  'stl-overview': {
    lede: 'STL 的设计是一套分工：容器负责存、迭代器负责指、算法负责算。这一节先建立全景地图和一张复杂度总表，让后面每一节都有处安放。',
    blocks: [
      { t: 'h2', x: '为什么先看全景' },
      {
        t: 'p',
        x: '复健期最常见的窘境不是「不会用」，而是「记得几个 API，却说不清它背后是什么结构」——于是选容器靠感觉，复杂度靠背。这个模块要建立的观念只有一句话：**容器的内部结构决定了它每个操作的复杂度**。结构看清了，「该用哪个容器」就从记忆题变成推理题。',
      },
      { t: 'h2', x: 'STL 六大组件' },
      {
        t: 'p',
        x: 'STL（Standard Template Library）由六类零件组成，彼此正交、自由组合：',
      },
      {
        t: 'cards',
        x: [
          { icon: 'boxes', tone: 'violet', h: '容器 Container', p: '存数据的地方：vector、map、unordered_map……每一种背后是一种数据结构。' },
          { icon: 'route', tone: 'primary', h: '迭代器 Iterator', p: '容器与算法之间的桥梁，行为像指针：解引用取值、自增前进。' },
          { icon: 'zap', tone: 'accent', h: '算法 Algorithm', p: 'sort、find、accumulate……只认迭代器不认容器，一套算法通吃所有容器。' },
          { icon: 'workflow', tone: 'sky', h: '仿函数 Functor', p: '重载了 operator() 的对象，如 less、greater，用来定制「怎么比较」。' },
          { icon: 'layers', tone: 'rose', h: '适配器 Adapter', p: '给旧容器换一张受限接口的脸：stack、queue、priority_queue。' },
          { icon: 'memory', tone: 'violet', h: '分配器 Allocator', p: '管理内存的申请与释放。复健阶段可以放心忽略它。' },
        ],
      },
      {
        t: 'p',
        x: '复健重点是前三个：容器（第 2~6 节逐个拆开）、迭代器（本节讲清）、算法（第 7 节）。仿函数会在写自定义比较器时自然遇到。',
      },
      { t: 'h2', x: '容器的四大家族' },
      {
        t: 'ul',
        x: [
          '**序列容器**：`vector`、`deque`、`list`、`forward_list`、`array`——元素按你放置的位置排队，谁挨着谁由你决定。',
          '**关联容器**：`map`、`set`、`multimap`、`multiset`——底层红黑树，元素始终按键有序。',
          '**无序关联容器**：`unordered_map`、`unordered_set` 等——底层哈希表，用「放弃顺序」换平均 O(1)。',
          '**容器适配器**：`stack`、`queue`、`priority_queue`——不是新结构，是对上面容器的接口约束。',
        ],
      },
      { t: 'h2', x: '迭代器：泛化的指针' },
      {
        t: 'p',
        x: '对一块原生数组，`*p` 取值、`++p` 走到下一个。迭代器把这两个动作抽象成统一约定：对 `vector` 它就是指针算术，对 `list` 它是沿 next 指针跳一步，对 `map` 它是中序遍历前进一格。算法只依赖这套约定，于是 `sort(v.begin(), v.end())` 一行代码根本不关心 v 内部长什么样。',
      },
      {
        t: 'p',
        x: '迭代器分等级：**随机访问**（vector、deque，支持 `it + 5`）、**双向**（list、map，只能一步步 `++`/`--`）、**前向**（forward_list）。等级决定算法可用性——`std::sort` 要求随机访问迭代器，所以 list 用不了它，只能用自己的成员函数 `sort()`。',
      },
      { t: 'viz', kind: 'array-vs-list' },
      {
        t: 'code',
        lang: 'cpp',
        name: '迭代器让算法与容器解耦（C++17，可直接编译）',
        x: `#include <algorithm>
#include <iostream>
#include <list>
#include <set>
#include <vector>
using namespace std;

// 只依赖迭代器三件套：* 取值、++ 前进、!= 比较
template <class It>
void show(It first, It last) {
    for (It it = first; it != last; ++it) cout << *it << ' ';
    cout << '\\n';
}

int main() {
    vector<int> v{3, 1, 4, 1, 5};
    list<int>   l{9, 2, 6};
    set<int>    s{5, 3, 8, 3};          // set 自动去重 + 排序

    show(v.begin(), v.end());           // 3 1 4 1 5
    show(l.begin(), l.end());           // 9 2 6
    show(s.begin(), s.end());           // 3 5 8：中序即升序

    sort(v.begin(), v.end());           // 算法只认迭代器，不认容器
    show(v.begin(), v.end());           // 1 1 3 4 5
    cout << *max_element(l.begin(), l.end()) << '\\n';  // 9
    return 0;
}`,
      },
      { t: 'h2', x: '一张表看清所有容器' },
      {
        t: 'p',
        x: '下表是整个模块的地图。先抓三条主线：连续内存给你 O(1) 随机访问；平衡树给你稳定 O(log n) 外加有序；哈希给你平均 O(1) 但放弃顺序。',
      },
      {
        t: 'html',
        x: tbl(
          ['容器', '底层结构', '随机访问', '两端插删', '任意位置插删', '按键/值查找', '遍历顺序'],
          [
            ['<code>vector</code>', '一整块连续数组', G('O(1)'), `尾 ${G('均摊 O(1)')}<br>头 ${B('O(n)')}`, B('O(n)'), B('O(n) 线性扫'), '下标序'],
            ['<code>deque</code>', '分段数组 + 中控表', G('O(1)'), `两端 ${G('O(1)')}`, B('O(n)'), B('O(n)'), '下标序'],
            ['<code>list</code>', '双向链表', B('O(n)'), `两端 ${G('O(1)')}`, `已知位置 ${G('O(1)')}`, B('O(n)'), '插入序'],
            ['<code>map</code> / <code>set</code>', '红黑树', '不支持', '—', M('O(log n)'), M('O(log n)'), '键升序'],
            ['<code>unordered_map</code> / <code>unordered_set</code>', '哈希表', '不支持', '—', `均摊 ${G('O(1)')}<br>最坏 ${B('O(n)')}`, `平均 ${G('O(1)')}<br>最坏 ${B('O(n)')}`, '无序'],
            ['<code>stack</code> / <code>queue</code> / <code>priority_queue</code>', '适配器（复用上面的容器）', '不支持', `仅开放端 ${G('O(1)')}（priority_queue ${M('O(log n)')}）`, '不支持', '不支持', '不可遍历'],
          ]
        ),
      },
      {
        t: 'callout',
        kind: 'warn',
        title: '绿色徽标不是免责声明',
        x: '表里的「均摊」「平均」都带前提：vector 尾插碰上扩容的那一次是 O(n)；哈希表遇到大量冲突会退化到 O(n)。后面每一节都会讲清这些绿色徽标什么时候会变红——这正是「推理选容器」的关键。',
      },
      { t: 'h2', x: '选容器：一条决策路径' },
      {
        t: 'steps',
        x: [
          { h: '默认答案：vector', x: '没有特殊需求就用 vector。连续内存、缓存友好、尾插均摊 O(1)，九成场景的正确答案。' },
          { h: '两端都要进出？deque', x: '头部也要高频插删（比如 BFS 队列的底层）时换 deque。' },
          { h: '要按键查找？先问要不要有序', x: '需要范围查询、有序遍历、前驱后继就选 map/set；只要存在性与计数、越快越好就选 unordered_map/set。' },
          { h: '要 O(1) 拼接或极稳的迭代器？list', x: '在已知位置频繁插删、整段 splice 来 splice 去才值得用 list。这种需求比想象中少。' },
          { h: '只需要一种纪律？用适配器', x: '「后进先出 / 先进先出 / 每次取最值」，就让 stack、queue、priority_queue 替你把多余操作藏起来。' },
        ],
      },
      {
        t: 'quiz',
        q: '要按插入顺序保存 10 万条日志，主要操作是尾部追加和按下标随机抽查，偶尔整体遍历。首选哪个容器？',
        opts: [
          'list——插入 O(1) 最快',
          'vector——尾插均摊 O(1)，下标访问 O(1)',
          'map——日志应该按时间有序存',
          'deque——反正都差不多',
        ],
        answer: 1,
        explain:
          '尾部追加正是 vector 的均摊 O(1) 强项，O(1) 下标访问是连续内存的独门能力；list 按下标找要 O(n)；map 的「按键有序」在按插入顺序追加的场景毫无用处，还要为每次操作付 O(log n)。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '这个模块的学法',
        x: '后面每节固定四步：结构 → 复杂度 → 常用 API → 陷阱。检验学会的标准不是能默写 API，而是能对任意场景说出「用它，因为它的结构是……所以代价是……」。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '两道热身题都有多种容器解法，正好练本节的「先想结构、再选容器」。',
        x: [
          {
            id: 349,
            title: '两个数组的交集',
            slug: 'intersection-of-two-arrays',
            level: '简单',
            why: '练容器选型的决策路径：去重、判存在，该请 set 家族的哪一位出场。',
            hint: '交集要求结果去重。先把一个数组装进能快速判存在的容器，再扫另一个数组逐个查；想想 `unordered_set` 与 `set` 在这里各付什么代价。',
            insight: [
              '最优解：nums1 存入 `unordered_set`，扫 nums2 时命中就收进结果集合、并从原集合里删掉防止重复收，时间 O(n+m)、空间 O(n)。用 `set` 也对，但每次操作多付 O(log n)——这题不需要有序。',
              '常见坑：忘了结果本身要去重，两个数组内部都可能含重复元素；也可以两边排序后用 `std::set_intersection`，但得先各自去重，反而绕。',
            ],
          },
          {
            id: 88,
            title: '合并两个有序数组',
            slug: 'merge-sorted-array',
            level: '简单',
            why: '练迭代器/指针视角的原地区间操作：连续内存上从哪个方向写才不会覆盖没处理的数据。',
            hint: '正着合并会覆盖 nums1 尚未处理的元素。换个方向：三个游标全部从尾部出发，往 nums1 末尾的空位写。',
            insight: [
              '最优解：三指针从后往前归并，时间 O(n+m)、空间 O(1)。核心结论：在 `vector` 这类连续存储上做原地合并，必须朝「空位所在的方向」写入，这是很多原地算法的通用思路。',
              '常见坑：主循环结束后 nums2 可能还有剩余需要继续拷入；nums1 的剩余部分本来就在原位，无需处理。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-vector  vector：动态数组与扩容代价
     ========================================================== */
  'stl-vector': {
    lede: 'vector 是「会自动搬家的数组」。这一节看清它的内存布局、扩容如何发生、为什么 push_back 敢说均摊 O(1)，以及最容易翻车的迭代器失效。',
    blocks: [
      { t: 'h2', x: '内存布局：一整块连续空间' },
      {
        t: 'p',
        x: 'vector 对象本身很小，典型实现只有三根指针：`begin`（数据区起点）、`end`（已用区终点）、`cap`（已申请区终点）。真正的元素放在堆上一块**连续**内存里。连续意味着两件事：`v[i]` 就是「起始地址 + i × 元素大小」一次乘加，O(1)；相邻元素挨着放，CPU 预取器顺着读非常快——这是 vector 遍历速度碾压链表的根本原因。',
      },
      { t: 'h2', x: 'size 与 capacity：两个容易混的量' },
      {
        t: 'ul',
        x: [
          '`size()`：当前**实际存了**多少个元素（end - begin）。',
          '`capacity()`：不搬家的前提下**最多能存**多少（cap - begin）。',
          '`size() < capacity()` 时，push_back 只是在 end 处构造一个元素、end 前移，非常便宜。',
          '`size() == capacity()` 时再 push_back，就触发**扩容**：申请更大的新内存 → 把旧元素全部搬过去 → 释放旧内存。这一次是 O(n)。',
        ],
      },
      { t: 'viz', kind: 'vector-growth' },
      { t: 'h2', x: '为什么 push_back 敢说均摊 O(1)' },
      {
        t: 'p',
        x: '关键在扩容策略：每次不是多要一格，而是按倍数扩（常见 2 倍或 1.5 倍）。从空 vector 连续 push_back n 次，搬运只发生在容量到达 1、2、4、8……的时刻，总搬运次数是 1 + 2 + 4 + … + n/2 < n。也就是 n 次插入总共摊下来的搬运不超过 n 次——平均每次 O(1)。这就是「均摊」的含义：**单次可能很贵，但贵的次数被指数级稀释了**。',
      },
      {
        t: 'p',
        x: '反过来想：如果每次只扩 1 格，第 i 次插入都要搬 i 个元素，总代价 1+2+…+n = O(n²)。倍增策略是用「最多浪费一半内存」换「均摊 O(1)」，一笔非常划算的交易。',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: '观察扩容轨迹（C++17，可直接编译）',
        x: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    size_t last = v.capacity();
    cout << "初始 capacity = " << last << '\\n';

    for (int i = 1; i <= 33; ++i) {
        v.push_back(i);
        if (v.capacity() != last) {          // 容量变了 => 刚发生一次搬家
            cout << "插入第 " << i << " 个时扩容: "
                 << last << " -> " << v.capacity() << '\\n';
            last = v.capacity();
        }
    }

    vector<int> w;
    w.reserve(33);                            // 一次要够，后续 0 次搬家
    for (int i = 1; i <= 33; ++i) w.push_back(i);
    cout << "reserve 后: size=" << w.size()
         << " capacity=" << w.capacity() << '\\n';
    return 0;
}`,
      },
      {
        t: 'p',
        x: '在 MSVC 上你会看到 1→2→3→4→6→9…（1.5 倍），在 GCC/Clang 上是 1→2→4→8→16→32（2 倍）。标准只规定均摊 O(1)，倍率由实现自选。',
      },
      { t: 'h3', x: 'reserve 与 shrink_to_fit' },
      {
        t: 'ul',
        x: [
          '`reserve(n)`：只提容量不改 size。**预先知道规模就先 reserve**，把所有搬家消灭在起点。',
          '`resize(n)`：改 size。变长时补默认值元素，变短时销毁多余元素。和 reserve 是两码事。',
          '`shrink_to_fit()`：请求把 capacity 缩到 size。注意是「请求」，标准允许实现不理你；C++11 前的惯用法是 `vector<int>(v).swap(v)`。',
          '`clear()` 只清元素**不还内存**：size 归零，capacity 原地不动。想真正释放就 clear 后再 shrink_to_fit。',
        ],
      },
      { t: 'h2', x: '各操作复杂度盘点' },
      {
        t: 'html',
        x: tbl(
          ['操作', '复杂度', '为什么'],
          [
            ['<code>v[i]</code> / <code>at(i)</code>', G('O(1)'), '起始地址 + 偏移，一次乘加'],
            ['<code>push_back</code>', G('均摊 O(1)') + ' / 扩容时 ' + B('O(n)'), '通常只在 end 处构造；容量满时整体搬家'],
            ['<code>pop_back</code>', G('O(1)'), '销毁末元素，end 回退'],
            ['<code>insert</code> / <code>erase</code> 中间', B('O(n)'), '插入/删除点之后的元素整体挪一格'],
            ['头部插入 <code>insert(begin(), x)</code>', B('O(n)'), '所有元素后移——两端都要进出请找 deque'],
            ['查找某值 <code>find</code>', B('O(n)'), '无序就只能线性扫；有序可二分 ' + M('O(log n)')],
          ]
        ),
      },
      { t: 'h2', x: '迭代器失效：vector 最锋利的坑' },
      {
        t: 'p',
        x: '扩容会整体搬家，旧内存上的指针、引用、迭代器全部变成悬垂的。没扩容也不安全：插入/删除点之后的元素都被挪动过。规则如下表：',
      },
      {
        t: 'table',
        head: ['操作', '失效范围'],
        rows: [
          ['`push_back` 未触发扩容', '仅 `end()` 迭代器失效，元素迭代器都还有效'],
          ['`push_back` 触发扩容', '**全部**迭代器、指针、引用失效'],
          ['`insert(pos, x)`', '扩容则全失效；不扩容则 pos 及其之后失效'],
          ['`erase(pos)`', 'pos 及其之后全部失效（后面元素被前移了）'],
          ['`reserve` / `resize` 引起重分配', '全部失效'],
          ['`clear()`', '全部元素迭代器失效（capacity 不变也一样）'],
        ],
      },
      {
        t: 'callout',
        kind: 'danger',
        title: '经典事故：边遍历边 erase',
        x: [
          '`for (auto it = v.begin(); it != v.end(); ++it) if (*it % 2 == 0) v.erase(it);` —— erase 之后 it 已失效，再 `++it` 是未定义行为，还会漏判被前移过来的元素。',
          '正确写法一：接住返回值 `it = v.erase(it);`，删了就不 ++，没删才 ++。',
          '正确写法二（首选）：`v.erase(remove_if(v.begin(), v.end(), pred), v.end());` 一次线性扫完，O(n)。',
        ],
      },
      { t: 'h3', x: 'emplace_back 与 push_back' },
      {
        t: 'p',
        x: '`push_back(x)` 接收一个**造好的对象**再放进去（拷贝或移动）；`emplace_back(args...)` 把构造参数直接转发到 vector 内部，在目标内存上**就地构造**，省一次临时对象。对 `vector<int>` 二者没区别；对 `vector<pair<int,string>>` 这类元素，`emplace_back(1, "abc")` 比 `push_back({1, "abc"})` 更省。习惯上：有现成对象用 push_back，用参数造新对象用 emplace_back。',
      },
      {
        t: 'callout',
        kind: 'warn',
        title: '两个次级陷阱',
        x: [
          '`operator[]` **不查界**，越界是未定义行为；`at(i)` 越界抛 `std::out_of_range`。调试期不妨多用 at。',
          '`vector<bool>` 是位压缩特化，`v[i]` 返回的是代理对象而不是 `bool&`，`auto& b = v[i]` 编译不过。需要真正的布尔数组时用 `vector<char>` 或 `deque<bool>` 代替。',
        ],
      },
      {
        t: 'quiz',
        q: '空 vector 依次 push_back 32 个元素（假设 2 倍扩容、初始容量 0→1），元素搬运总次数最接近？',
        opts: ['约 32 次', '约 31 次（1+2+4+8+16）', '约 512 次', '0 次'],
        answer: 1,
        explain:
          '搬运只发生在容量 1→2、2→4、4→8、8→16、16→32 的扩容瞬间，各搬 1、2、4、8、16 个，共 31 次——小于插入次数 n=32。这正是均摊 O(1) 的数字证据。选项 C 是「每次扩 1 格」策略才会有的 O(n²) 量级。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: '连续内存给了 vector O(1) 随机访问和缓存友好；倍增扩容把尾插做到均摊 O(1)；代价是扩容瞬间的 O(n) 搬家与随之而来的迭代器全体失效。知道规模就 reserve，删除用 erase-remove 惯用法。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '三道题都围着 vector 的连续内存做文章：原地挪动、逐行构建、二维填充。',
        x: [
          {
            id: 26,
            title: '删除有序数组中的重复项',
            slug: 'remove-duplicates-from-sorted-array',
            level: '简单',
            why: '练「搬移不删除」的思想——它正是本节 erase-remove 惯用法里 `std::remove`/`std::unique` 的手写版。',
            hint: '维护一个「写指针」指向已去重区的末尾，读指针扫全数组，遇到和已去重区末尾不同的元素才写入。数组有序，重复必相邻。',
            insight: [
              '最优解：快慢双指针一趟扫完，时间 O(n)、空间 O(1)。这就是 `std::unique` 的内部逻辑——把不重复的往前搬、返回新逻辑终点，尾巴留给调用方处置。',
              '常见坑：题目只要求前 k 个位置正确，别费劲清理尾部；写指针初值从 1 开始（第 0 个天然保留），从 0 开始要多一次特判。',
            ],
          },
          {
            id: 118,
            title: '杨辉三角',
            slug: 'pascals-triangle',
            level: '简单',
            why: '练二维 vector 的构建：外层逐行 push_back，内层按行长度初始化，正是「vector 套 vector」的标准操作。',
            hint: '第 i 行有 i+1 个元素，首尾恒为 1；中间第 j 个等于上一行第 j-1 与第 j 个之和。逐行生成，每行造好再放进结果。',
            insight: [
              '最优解：双层循环直接按递推填表，时间 O(n²)、空间 O(1)（不算输出）。构建每行时用 `vector<int> row(i + 1, 1)` 一次初始化，只需再填中间部分。',
              '常见坑：外层结果 vector 若已知行数，`reserve(numRows)` 可免扩容搬家——正是本节 reserve 的用武之地；行内循环边界是 j 从 1 到 i-1，越界读上一行是经典手误。',
            ],
          },
          {
            id: 59,
            title: '螺旋矩阵 II',
            slug: 'spiral-matrix-ii',
            level: '中等',
            why: '练二维 vector 的下标访问与边界收缩：整个过程就是在连续内存的网格上按规则写入。',
            hint: '维护上下左右四条边界，按「右、下、左、上」的顺序填数，每填完一条边就把对应边界向内收一格；边界交错即结束。',
            insight: [
              '最优解：四边界模拟，时间 O(n²)、空间 O(1)（不算输出矩阵），每个格子恰好写一次。初始化用 `vector<vector<int>>(n, vector<int>(n))` 一步到位，比逐行 push_back 清晰。',
              '常见坑：收缩边界的时机——每填完一条边立即收缩并检查是否越过对侧边界，否则奇数阶矩阵的中心格会被重复填或漏填。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-deque  deque / list / forward_list
     ========================================================== */
  'stl-deque': {
    lede: 'vector 的软肋是头部插入 O(n)。deque 用「分段连续」补上这一角；list 则走到另一个极端——彻底放弃连续。这一节把三兄弟放在一起，看清各自赢在哪、输在哪。',
    blocks: [
      { t: 'h2', x: 'deque：分段连续的折中方案' },
      {
        t: 'p',
        x: 'deque（double-ended queue）不是一整块内存，而是**多个固定大小的块（chunk），外加一张中控表（map）按顺序记录每块地址**。下标访问 `d[i]` 分两步：先算落在第几块（除法），再算块内偏移（取模），仍是 O(1)，只是比 vector 多一次指针跳转，常数略大。',
      },
      {
        t: 'p',
        x: '这个结构的妙处在两端：头部满了就在中控表前面挂一块新 chunk，尾部同理——**已有元素一个都不用搬**。所以 push_front 和 push_back 都是 O(1)（中控表偶尔扩，但它只存指针，搬运极便宜）。对比 vector 的 push_front：所有元素后移一格，O(n)。',
      },
      { t: 'viz', kind: 'deque-blocks' },
      {
        t: 'ul',
        x: [
          '两端插删 **O(1)**，下标访问 **O(1)**（常数比 vector 大）。',
          '中间插删仍是 **O(n)**——块内元素还是得挪，别指望 deque 拯救中间插入。',
          '没有 capacity/reserve 的概念；扩张按块进行，不存在 vector 那种整体大搬家。',
          '`push_front`/`push_back` 不会让已有元素的**引用**失效（迭代器会失效），这点比 vector 温和。',
        ],
      },
      {
        t: 'p',
        x: '什么时候选 deque？**两端都要高频进出**的队列类场景。事实上 `stack` 和 `queue` 适配器的默认底层就是 deque（下下节细讲）。只在尾部操作的话，vector 更简单、更快、更省。',
      },
      { t: 'h2', x: 'list：彻底放弃连续' },
      {
        t: 'p',
        x: '`list` 是双向链表：每个节点独立堆分配，携带 `prev`、`next` 两根指针和数据本体。`forward_list` 是单向链表，只有 `next`，省一根指针，也失去反向遍历能力。链表的世界观是：**元素永远不搬家**——插入删除只改身边几根指针。',
      },
      { t: 'viz', kind: 'linked-ops' },
      {
        t: 'ul',
        x: [
          '已知迭代器位置的插入/删除：**O(1)**，且**不影响其他任何迭代器**——这是 list 最稳的地方。',
          '随机访问：不支持 `l[i]`，想到第 i 个只能从头数，**O(n)**。',
          '找元素：**O(n)**，而且实际速度比 vector 的 O(n) 慢得多（原因见下）。',
          '`splice`：把另一条链表的一段整段接进来，只改常数根指针——这是链表的独门绝活。',
        ],
      },
      { t: 'h3', x: 'splice 的 O(1) 拼接' },
      {
        t: 'code',
        lang: 'cpp',
        name: 'splice：O(1) 整段转移（C++17，可直接编译）',
        x: `#include <iostream>
#include <list>
using namespace std;

void show(const list<int>& l, const char* tag) {
    cout << tag << ": ";
    for (int x : l) cout << x << ' ';
    cout << '\\n';
}

int main() {
    list<int> a{1, 2, 3};
    list<int> b{10, 20, 30};

    // 把 b 整条接到 a 的末尾：不拷贝、不分配，只改指针
    a.splice(a.end(), b);
    show(a, "a");                    // 1 2 3 10 20 30
    cout << "b.size=" << b.size() << '\\n';   // 0，b 被掏空

    // 单元素转移：把 a 的头节点移到 a 的末尾
    a.splice(a.end(), a, a.begin());
    show(a, "a");                    // 2 3 10 20 30 1

    // 已知位置删除 O(1)；找到这个位置本身是 O(n)
    a.erase(++a.begin());
    show(a, "a");                    // 2 10 20 30 1
    return 0;
}`,
      },
      {
        t: 'p',
        x: '这种「整段移动零拷贝」是 vector 与 deque 做不到的，LRU 缓存把节点移到队头的经典实现就靠它（配合哈希表存节点迭代器）。同理，list 的 `sort()` 成员函数（归并）排序时只调指针不搬数据，元素地址全程不变。',
      },
      { t: 'h2', x: '诚实的讨论：链表为什么慢' },
      {
        t: 'p',
        x: '教科书说「链表插入 O(1)，数组插入 O(n)」，容易让人以为频繁插入就该选 list。现实经常相反。原因有三：**其一**，O(1) 的前提是「已经站在插入点」，而走到插入点要 O(n) 次指针跳转，每跳一步都是一次潜在的缓存未命中；vector 挪 n 个连续元素反而是预取器最擅长的顺序访问。**其二**，每个节点独立 new/delete，分配器开销与内存碎片都不小。**其三**，每个 int 节点要背两根指针，64 位下负载率不到 20%。经验法则：**元素小、总量大 → 闭眼 vector；只有「拿着迭代器就地増删/splice/要求地址稳定」这类硬需求才请 list 出场**。',
      },
      {
        t: 'callout',
        kind: 'warn',
        title: '别用 std::sort 排 list',
        x: '`std::sort` 要求随机访问迭代器，list 的双向迭代器传进去直接编译报错。list 要排序用成员函数 `l.sort()`。同理 `remove`/`unique` 在 list 上也有成员版本，它们改指针而不搬元素，语义还和算法版不同——`l.remove(x)` 是真删除，而 `std::remove` 只是搬移（第 7 节细讲）。',
      },
      { t: 'h2', x: '三容器对照' },
      {
        t: 'html',
        x: tbl(
          ['操作', '<code>vector</code>', '<code>deque</code>', '<code>list</code>'],
          [
            ['下标访问', G('O(1)'), G('O(1)') + '（常数略大）', B('O(n)')],
            ['尾插', G('均摊 O(1)'), G('O(1)'), G('O(1)')],
            ['头插', B('O(n)'), G('O(1)'), G('O(1)')],
            ['已知位置中间插删', B('O(n)'), B('O(n)'), G('O(1)')],
            ['整段拼接 splice', '不支持', '不支持', G('O(1)')],
            ['缓存友好度', '最好', '较好', '最差'],
            ['插入时旧迭代器', '可能全失效', '失效（引用除外）', '全部保持有效'],
          ]
        ),
      },
      {
        t: 'quiz',
        q: '实现一个 LRU 缓存：命中时要把该节点 O(1) 移到队头，淘汰时 O(1) 删队尾。链式部分选谁？',
        opts: [
          'vector——缓存友好最重要',
          'deque——两端 O(1) 正好',
          'list——已知迭代器时移动/删除 O(1) 且迭代器不失效',
          'forward_list——最省内存',
        ],
        answer: 2,
        explain:
          '「把中间某节点移到队头」恰是 splice 的 O(1) 绝活，且哈希表里存的 list 迭代器在别的节点插删后依然有效。vector/deque 把中间元素挪到头部都是 O(n)，且迭代器会失效；forward_list 是单向的，O(1) 删除任意节点还需要前驱，写起来别扭。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: 'deque = 分段连续，两端 O(1) 而随机访问仍 O(1)，是双端队列的默认答案；list = 指针的世界，胜在已知位置 O(1) 插删、splice 与迭代器稳定，败在缓存不友好。没有硬需求时，默认答案依然是 vector。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '从「用一下 deque」到「亲手实现 deque」再到「单调双端队列」，层层加深。',
        x: [
          {
            id: 933,
            title: '最近的请求次数',
            slug: 'number-of-recent-calls',
            level: '简单',
            why: '练 deque/queue 的滑动窗口用法：新数据从尾进，过期数据从头出，两端 O(1) 正是 deque 的主场。',
            hint: '时间递增到来，每次 ping 先把新时间入队尾，再把队头所有小于 t-3000 的时间弹掉，剩下的队长就是答案。',
            insight: [
              '最优解：每个时间戳恰好入队一次、出队一次，均摊 O(1)，空间 O(w)（窗口内请求数）。核心结论：只在两端进出就选 `deque`（或直接用 `queue` 适配器），vector 头删 O(n) 在这里是明确的错误选型。',
              '常见坑：弹出条件是「严格小于 t-3000」，边界 t-3000 本身在窗口内；别忘了当前这次 ping 也计入答案。',
            ],
          },
          {
            id: 641,
            title: '设计循环双端队列',
            slug: 'design-circular-deque',
            level: '中等',
            why: '亲手实现一个双端队列，才能真正理解 STL deque「头尾游标 + 环绕」的设计动机。',
            hint: '定长数组加 front、size 两个变量即可：尾 = (front + size) % 容量。头插是 front 退一格（+容量再取模防负数），尾插是尾游标处写入。',
            insight: [
              '最优解：环形数组，所有操作 O(1)、空间 O(k)。核心结论：环形数组用取模把「两端」接成一个圈，这与 STL deque 的分段方案不同，但「头尾各一游标、互不搬动元素」的思想一致。',
              '常见坑：C++ 的负数取模结果仍为负，头插要写 `(front - 1 + capacity) % capacity`；区分队满与队空要么记 size，要么牺牲一格，混着用必翻车。',
            ],
          },
          {
            id: 239,
            title: '滑动窗口最大值',
            slug: 'sliding-window-maximum',
            level: '困难',
            why: '单调双端队列是 deque 的招牌算法：一端维护单调性、另一端淘汰过期元素，两端 O(1) 缺一不可。',
            hint: '让 deque 里存下标且对应值从队头到队尾递减：新元素入队前，从**队尾**弹掉所有比它小的（它们永无出头之日）；再看**队头**是否滑出窗口。队头永远是当前窗口最大值。',
            insight: [
              '最优解：单调递减双端队列，每个下标至多入队出队各一次，时间 O(n)、空间 O(k)，比「每个窗口扫一遍」的 O(nk) 和 multiset 做法的 O(n log k) 都优。',
              '核心结论：需要同时在两端删除（尾端维护单调、头端淘汰过期）时，`deque` 是唯一顺手的 STL 容器。',
              '常见坑：队列里存下标而不是值，否则无法判断队头是否已滑出窗口；弹队尾的条件用「小于等于当前值」还是「小于」都能对，但要与收集答案的时机自洽。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-map  map / set：红黑树与有序性
     ========================================================== */
  'stl-map': {
    lede: 'map 与 set 的底层是红黑树——一棵「不追求完美、但保证不失衡太狠」的二叉搜索树。这一节建立树的直觉，然后看有序性换来了哪些独门能力，以及 operator[] 那个著名的坑。',
    blocks: [
      { t: 'h2', x: '为什么是红黑树' },
      {
        t: 'p',
        x: '想按键查找又想保持有序，二叉搜索树（BST）是自然选择：左小右大，查找每步砍半。但普通 BST 有致命弱点——按 1,2,3,4,5 的顺序插入，它会退化成一条链，查找变 O(n)。**红黑树是给自己加了纪律的 BST**：每个节点标红或黑，靠几条着色规则（根为黑、红节点的孩子必黑、任一节点到叶的每条路径黑节点数相同）保证最长路径不超过最短路径的两倍。插入删除后若违规，就通过**旋转**和**变色**局部修复。',
      },
      {
        t: 'p',
        x: '你不需要背平衡规则的细节——STL 已经替你实现好了。要带走的是结论：**树高被压在 O(log n)，所以 map/set 的插入、删除、查找全是稳定的 O(log n)**，没有均摊、没有最坏退化，n = 100 万时也就 20 层上下。',
      },
      { t: 'viz', kind: 'rbtree-intro' },
      { t: 'h2', x: '有序性是花钱买来的能力' },
      {
        t: 'p',
        x: '对比哈希表的平均 O(1)，map 每次操作要花 O(log n)，慢在哪就赚在哪：**中序遍历天然按键升序**。这解锁了哈希表做不到的三类操作：',
      },
      {
        t: 'ul',
        x: [
          '**有序遍历**：`for (auto& [k, v] : m)` 输出必然按键从小到大。',
          '**边界查询**：`lower_bound(k)` 返回第一个 ≥ k 的位置；`upper_bound(k)` 返回第一个 > k 的位置。找前驱后继、找「最接近的值」都靠它们。',
          '**范围操作**：`[lower_bound(a), upper_bound(b))` 恰好圈出键在 [a, b] 内的所有元素。',
        ],
      },
      {
        t: 'code',
        lang: 'cpp',
        name: '有序性的三件套（C++17，可直接编译）',
        x: `#include <iostream>
#include <iterator>   // prev
#include <map>
#include <string>
using namespace std;

int main() {
    map<int, string> score = {
        {60, "及格"}, {80, "良好"}, {90, "优秀"}, {70, "中等"},
    };

    // 1) 遍历必然按键升序（60 70 80 90），与插入顺序无关
    for (auto& [k, v] : score) cout << k << '=' << v << ' ';
    cout << '\\n';

    // 2) 边界查询：75 分落在哪个档？
    auto it = score.upper_bound(75);   // 第一个 > 75 的键：80
    cout << "75 分的上一档: " << it->second << '\\n';
    cout << "75 分的下一档: " << prev(it)->second << '\\n';  // 70 中等

    // 3) 范围遍历：[70, 90] 之间的所有档位
    for (auto p = score.lower_bound(70); p != score.upper_bound(90); ++p)
        cout << p->first << ' ';       // 70 80 90
    cout << '\\n';
    return 0;
}`,
      },
      {
        t: 'callout',
        kind: 'tip',
        title: '成员版优先',
        x: '`<algorithm>` 里也有自由函数 `std::lower_bound`，但它对 map 的双向迭代器只能线性走，退化到 O(n)。**关联容器一律用成员函数版** `m.lower_bound(k)`、`m.count(k)`、`m.find(k)`，它们直接下树，O(log n)。',
      },
      { t: 'h2', x: 'operator[] 的坑：读也会写' },
      {
        t: 'p',
        x: '`m[k]` 的真实语义是：**找到 k 就返回它的值；找不到就当场插入 {k, 默认值} 再返回**。它从不失败，代价是「只想看一眼」也会污染容器：',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: 'operator[] 的隐式插入',
        hl: [8, 9],
        x: `#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    map<string, int> cnt;
    if (cnt["apple"] > 0) cout << "有苹果\\n";  // 本想查询……
    cout << cnt.size() << '\\n';   // 1！"apple"->0 已被悄悄插入

    // 正确的只读检查：
    if (cnt.count("pear"))        cout << "有梨\\n";
    if (auto it = cnt.find("pear"); it != cnt.end())
        cout << it->second << '\\n';
    cout << cnt.size() << '\\n';   // 仍是 1
    return 0;
}`,
      },
      {
        t: 'callout',
        kind: 'danger',
        title: '三条纪律',
        x: [
          '**查询用 `find` / `count` / (C++20) `contains`，不要用 `[]`**。`[]` 只用于「确实想写入或累加」的场合，比如词频统计 `cnt[word]++`（这里隐式插 0 恰好是想要的）。',
          '`[]` 要求值类型可默认构造，所以 `map<int, const int>` 或无默认构造函数的值类型用不了 `[]`。',
          '`const map` 上没有 `[]`（它可能修改容器）——const 成员函数里写 `m[k]` 直接编译错误，这常是新手撞上的第一堵墙。',
        ],
      },
      { t: 'h2', x: '增删改查的正确姿势' },
      {
        t: 'ul',
        x: [
          '`insert({k, v})`：k 已存在则**不覆盖**，返回 `pair<iterator, bool>` 告诉你成没成功。',
          '`emplace(k, v)`：与 insert 同语义，但就地构造，省临时对象。',
          '`insert_or_assign(k, v)`（C++17）：存在就覆盖，不存在就插入——语义比 `m[k] = v` 更明确，还不要求默认构造。',
          '`erase(k)` 返回删掉的个数（map 里非 0 即 1）；`erase(it)` 删迭代器指向的元素，其余迭代器**不受影响**。',
          '`try_emplace(k, args...)`（C++17）：键存在时**连值都不构造**，做缓存时最省。',
        ],
      },
      {
        t: 'p',
        x: '节点稳定性是红黑树的隐藏福利：插入删除只旋转指针，**元素本体从不搬家**，所以指向元素的指针/引用/迭代器只在该元素被删时才失效。拿着 `&m[k]` 长期用是安全的——vector 可不敢这么玩。',
      },
      {
        t: 'html',
        x: tbl(
          ['操作', '复杂度', '说明'],
          [
            ['<code>find</code> / <code>count</code> / <code>contains</code>', M('O(log n)'), '沿树高走一趟，稳定无退化'],
            ['<code>insert</code> / <code>emplace</code> / <code>erase</code>', M('O(log n)'), '定位 + 至多常数次旋转变色'],
            ['<code>lower_bound</code> / <code>upper_bound</code>（成员版）', M('O(log n)'), '哈希表给不了的能力'],
            ['迭代器 <code>++</code>（中序前进一格）', G('均摊 O(1)'), '整棵树遍历共 O(n)'],
            ['自由函数 <code>std::lower_bound</code> 用在 map 上', B('O(n)'), '双向迭代器只能线性走——别用'],
          ]
        ),
      },
      { t: 'h2', x: 'set、multimap、multiset 一瞥' },
      {
        t: 'ul',
        x: [
          '`set<K>`：只有键没有值的 map，「有序去重集合」。判断存在 O(log n)，遍历升序。',
          '`multiset` / `multimap`：允许重复键。`count(k)` 可能大于 1；`equal_range(k)` 返回该键的整段区间；注意 `erase(k)` 会删掉**所有**等于 k 的元素，只删一个要 `ms.erase(ms.find(k))`。',
          'multimap 没有 `[]`——一个键对多个值，`[]` 该返回谁说不清，干脆不提供。',
        ],
      },
      {
        t: 'quiz',
        q: '需要维护一个动态整数集合，反复执行两种操作：插入一个数；查询「大于等于 x 的最小元素」。选哪个容器？',
        opts: [
          'unordered_set——查找平均 O(1) 最快',
          'vector 保持有序 + 手写二分',
          'set——insert 与 lower_bound 都是 O(log n)',
          'priority_queue——它专管最值',
        ],
        answer: 2,
        explain:
          '「≥ x 的最小元素」就是 lower_bound，需要有序结构；unordered_set 无序，回答不了这种问题。有序 vector 查询 O(log n) 但**插入要挪元素 O(n)**，动态插入场景吃亏。priority_queue 只能看堆顶最值，问不了任意 x。set 两种操作都是 O(log n)，正合适。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: '红黑树用受控的不完美换来稳定 O(log n) 与永远有序。选 map 的理由从来不是「查得快」——查得快找哈希表——而是 lower_bound、范围遍历、有序输出这些**只有树给得起**的能力。最后默念三遍：查询不用方括号。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '三道题分别对应 map 的三张王牌：有序遍历、lower_bound 边界查询、有序集合上的范围检索。',
        x: [
          {
            id: 2418,
            title: '按身高排序',
            slug: 'sort-the-people',
            level: '简单',
            why: '练 map「插入即有序」的特性：把键值对丢进去，中序遍历自动给出按键排好的结果。',
            hint: '身高互不相同，天然适合做键。想按身高从高到低输出，可以用 `map<int, string, greater<int>>` 定制比较器，或正序遍历后反转。',
            insight: [
              '最优解：map 建立身高到名字的映射后顺序遍历，时间 O(n log n)、空间 O(n)；与「下标数组 + sort 自定义比较器」殊途同归。',
              '核心结论：`map` 的中序遍历必然按键有序，「边插边排」类需求可以零额外代码解决。常见坑：这招依赖键互异——有重复键就得换 `multimap` 或回到 sort。',
            ],
          },
          {
            id: 729,
            title: '我的日程安排表 I',
            slug: 'my-calendar-i',
            level: '中等',
            why: '练成员版 lower_bound 找前驱后继：判断新区间是否与已有区间重叠，只需看左右两个邻居。',
            hint: '用 `map<int, int>` 按起点存区间。插入 [s, e) 前用 `lower_bound(s)` 找到起点不小于 s 的第一个区间——只需检查它和它的前一个区间是否与新区间重叠。',
            insight: [
              '最优解：每次预订 O(log n)，n 次共 O(n log n)、空间 O(n)。核心结论：有序结构里「找可能冲突的邻居」就是 lower_bound 的前驱后继查询，这正是 unordered_map 给不了的能力。',
              '常见坑：重叠判定用半开区间最干净——后继区间起点 < e 或前驱区间终点 > s 即冲突；调用 `prev()` 前必须确认迭代器不是 `begin()`。',
            ],
          },
          {
            id: 220,
            title: '存在重复元素 III',
            slug: 'contains-duplicate-iii',
            level: '困难',
            why: '综合练 set 上的滑动窗口 + lower_bound：在有序集合里找「与 x 最接近的值」，树结构的看家本领。',
            hint: '维护一个只装最近 indexDiff 个元素的 `set` 窗口。对每个新数 x，用 `lower_bound(x - valueDiff)` 找窗口里第一个不小于 x - valueDiff 的数，看它是否不超过 x + valueDiff。',
            insight: [
              '最优解之一：set + 滑动窗口，时间 O(n log k)、空间 O(k)；另有按值分桶的 O(n) 解法，桶宽取 valueDiff+1，同桶必命中、邻桶再验证。',
              '核心结论：「窗口内是否存在落在某数值区间的元素」应交给**有序** set 的 lower_bound——哈希 set 只能精确命中，回答不了区间问题。',
              '常见坑：数值相减可能溢出 int，用 long long；窗口滑出时删元素，若有重复值需删迭代器而非按值删（按值会全删——不过本题窗口内出现相等值时已直接返回 true）。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-hash  unordered_map：哈希表与冲突
     ========================================================== */
  'stl-hash': {
    lede: 'unordered_map 用一记乘除把「找键」变成「算下标」，平均 O(1)。这一节拆开哈希函数、桶、冲突与 rehash，看清 O(1) 的前提条件，以及它什么时候会塌成 O(n)。',
    blocks: [
      { t: 'h2', x: '核心想法：用计算代替比较' },
      {
        t: 'p',
        x: '树查找靠一路**比较**，走 O(log n) 步；哈希表换思路：拿键算个数——`index = hash(key) % 桶数`——直接跳到第 index 号**桶**（bucket）。理想情况一步到位，O(1)。这是「用空间和无序换时间」：桶数组要预留富余，且键在桶里的分布和大小顺序毫无关系。',
      },
      { t: 'h2', x: '冲突：两个键落进同一个桶' },
      {
        t: 'p',
        x: '键空间几乎无限而桶有限，`hash(a) % n == hash(b) % n` 迟早发生，这叫**冲突**。libstdc++/MSVC 的 unordered_map 用**链地址法**（separate chaining）解决：每个桶挂一条链表，冲突的元素依次挂上去。于是一次查找 = 算哈希定位桶 + 沿桶内链表逐个比较 `operator==`。链条短，就是 O(1)；链条长，就退向 O(n)。',
      },
      { t: 'viz', kind: 'hash-table' },
      { t: 'h2', x: '负载因子与 rehash' },
      {
        t: 'p',
        x: '衡量拥挤程度的量叫**负载因子** load_factor = 元素数 ÷ 桶数。插入后若超过 `max_load_factor()`（默认 1.0），容器就 **rehash**：分配更大的桶数组（近似翻倍，实现常取素数），**所有元素重新算位置搬家**——一次 O(n)。和 vector 扩容同一个套路：单次昂贵、指数稀释，插入依然**均摊 O(1)**。',
      },
      {
        t: 'ul',
        x: [
          '`load_factor()` / `max_load_factor(f)`：查看/设定拥挤阈值。调低换更快查找，代价是更多内存、更早 rehash。',
          '`reserve(n)`：按「将要存 n 个元素」预分桶。**能预估规模就 reserve**，一次都不 rehash。',
          '`bucket_count()`、`bucket_size(i)`：观察桶数与某桶链长，排查分布是否健康。',
          'rehash 后**迭代器全失效**；但和 map 一样节点不搬家，**指针与引用仍有效**。',
        ],
      },
      { t: 'h2', x: '平均 O(1)，最坏 O(n)' },
      {
        t: 'p',
        x: '「平均 O(1)」的前提是**哈希函数把键摊得均匀**。若所有键挤进一个桶，哈希表退化成一条链表，查找 O(n)。这不只是理论：竞赛里有人专门构造一批模桶数同余的整数，把选手的 unordered_map 卡到超时（GCC 的 `std::hash<int>` 是恒等映射，特别好卡）。防御手段是自定义带随机盐的哈希，或者干脆换 map——它的 O(log n) 无法被数据卡崩。',
      },
      {
        t: 'html',
        x: tbl(
          ['操作', '平均', '最坏（全冲突/正在 rehash）'],
          [
            ['查找 <code>find</code>', G('O(1)'), B('O(n)')],
            ['插入 <code>insert</code>', G('均摊 O(1)'), B('O(n)')],
            ['删除 <code>erase(key)</code>', G('O(1)'), B('O(n)')],
            ['遍历', M('O(n + 桶数)'), M('O(n + 桶数)')],
          ]
        ),
      },
      { t: 'h2', x: '自定义类型做 key：需要两样东西' },
      {
        t: 'p',
        x: '`unordered_map<K, V>` 对 K 的要求：**能算哈希**（存在 `std::hash<K>` 或你提供仿函数）和**能判等**（`operator==`，冲突时在桶内逐个确认用）。标准库只内置了整数、浮点、指针、string 等的哈希；拿 pair 或自定义 struct 做键就得自己写：',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: '自定义键的完整示例（C++17，可直接编译）',
        x: `#include <functional>
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

struct Point {
    int x, y;
    bool operator==(const Point& o) const {   // 要求 1：判等
        return x == o.x && y == o.y;
    }
};

struct PointHash {                            // 要求 2：哈希仿函数
    size_t operator()(const Point& p) const {
        size_t h1 = hash<int>{}(p.x);
        size_t h2 = hash<int>{}(p.y);
        return h1 ^ (h2 + 0x9e3779b9 + (h1 << 6) + (h1 >> 2)); // 混合两个哈希
    }
};

int main() {
    unordered_map<Point, string, PointHash> grid;
    grid.reserve(64);                         // 预估规模，避免 rehash
    grid[{1, 2}] = "宝箱";
    grid[{3, 4}] = "陷阱";

    Point p{1, 2};
    if (auto it = grid.find(p); it != grid.end())
        cout << "(1,2) 处是: " << it->second << '\\n';

    cout << "元素 " << grid.size()
         << " 个 / 桶 " << grid.bucket_count()
         << " 个, 负载因子 " << grid.load_factor() << '\\n';
    return 0;
}`,
      },
      {
        t: 'callout',
        kind: 'warn',
        title: '组合哈希别偷懒用异或',
        x: '直接 `h1 ^ h2` 看似简洁，实则危险：异或满足交换律，(1,2) 与 (2,1) 哈希相同；x == y 的所有点全部归零挤进同一桶。示例里的 `0x9e3779b9` 移位混合（源自 boost::hash_combine）打破了对称性。另外注意：**键对象被存入后不许再被修改出不同哈希值**——那会让它「失踪」在错误的桶里，这也是 unordered_set 元素只读的原因。',
      },
      { t: 'h2', x: 'unordered_map 还是 map？' },
      {
        t: 'html',
        x: tbl(
          ['维度', '<code>unordered_map</code>（哈希表）', '<code>map</code>（红黑树）'],
          [
            ['查找/插入/删除', `平均 ${G('O(1)')}，最坏 ${B('O(n)')}`, `稳定 ${M('O(log n)')}`],
            ['遍历顺序', '无意义，rehash 后还会变', '永远按键升序'],
            ['范围查询 / lower_bound', '不支持', '支持，O(log n)'],
            ['对键的要求', 'hash + ==', '仅 < （严格弱序）'],
            ['内存', '桶数组 + 节点，偏大', '每节点 3 指针 + 颜色'],
            ['被恶意数据攻击', '可被构造冲突卡到 O(n)', '不受影响'],
          ]
        ),
      },
      {
        t: 'p',
        x: '选择基准：**默认 unordered_map**——多数场景只需要「存取一个键」，平均 O(1) 香。出现以下任一条就换 map：要有序遍历或范围查询；要 lower_bound/前驱后继；键难写哈希但天然可比较；对最坏情况有硬要求（对外服务、竞赛防卡）。',
      },
      {
        t: 'quiz',
        q: 'unordered_map 装了 100 万个元素，某次 find 却慢得像遍历。下列哪个是**不可能**的原因？',
        opts: [
          '大量键被构造成同余冲突，全挤在一个桶里',
          '自定义哈希写得太差，比如所有键都返回 0',
          '元素太多导致红黑树太深',
          '键的 operator== 本身极慢（比如超长字符串逐字符比较）',
        ],
        answer: 2,
        explain:
          'unordered_map 底层是哈希表 + 桶内链表，**没有红黑树**（树是 map 的底层），所以 C 不可能。A、B 都会把元素堆进同一桶使查找退化 O(n)；D 中哈希冲突后要用 == 逐个确认，== 慢会放大每次比较的常数。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: '哈希表 = 哈希函数把键摊进桶 + 链地址消化冲突 + 负载因子触发 rehash。平均 O(1) 的前提是分布均匀，最坏 O(n) 真实存在。自定义键给 hash 和 ==；能预估规模就 reserve；需要顺序与范围就回去找 map。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '三道哈希经典题，共同主题：用平均 O(1) 的「以键换址」把暴力解降一个数量级。',
        x: [
          {
            id: 1,
            title: '两数之和',
            slug: 'two-sum',
            level: '简单',
            why: '哈希表的开山第一题：用 unordered_map 把「找配对」从 O(n²) 降到 O(n)。',
            hint: '一边扫一边把「值 -> 下标」存进 `unordered_map`；对每个 x 先查 target - x 是否已在表里，再把 x 入表。',
            insight: [
              '最优解：一趟哈希，时间平均 O(n)、空间 O(n)。核心结论：需要「x 是否出现过、在哪」这类精确命中查询时，`unordered_map` 平均 O(1) 是默认答案，不需要有序就别付 map 的 O(log n)。',
              '常见坑：先查后存才能避免 x 与自己配对（target 恰为 2x 时）；查询用 `find` 而不是 `[]`，别让只读检查悄悄插入脏数据——正是本节 operator[] 的纪律。',
            ],
          },
          {
            id: 49,
            title: '字母异位词分组',
            slug: 'group-anagrams',
            level: '中等',
            why: '练「设计键」：把一组等价的东西映射到同一个规范化键上，unordered_map 天然完成分组。',
            hint: '互为异位词的字符串有同一个「指纹」——排序后的字符串（或 26 个字母的计数）。拿指纹当键，`unordered_map<string, vector<string>>` 自动把同组词聚到一起。',
            insight: [
              '最优解：以排序串为键，时间 O(n·k log k)（k 为串长），空间 O(n·k)；计数键可做到 O(n·k)。核心结论：哈希分组的功力全在**键的设计**——把「等价关系」编码成「键相等」。',
              '常见坑：标准库没有 `pair`/`vector` 的现成哈希，所以计数指纹要先拼成 string（比如计数值加分隔符）再当键，否则就要自己写哈希仿函数——正文自定义键一节的直接应用。',
            ],
          },
          {
            id: 128,
            title: '最长连续序列',
            slug: 'longest-consecutive-sequence',
            level: '中等',
            why: '一道「必须放弃排序改用哈希」的题：要求 O(n)，考验你对 unordered_set 判存在 O(1) 的运用。',
            hint: '全部数字装进 `unordered_set`。只从「序列起点」开始数——x 是起点当且仅当 x-1 不在集合里；然后 x+1、x+2……逐个查到断为止。',
            insight: [
              '最优解：unordered_set + 只从起点扩展，每个数最多被访问两次，平均 O(n)、空间 O(n)；排序解法 O(n log n) 拿不到满分思路。',
              '核心结论：「判断某数是否存在」重复上亿次的场景是 `unordered_set` 的主场；起点判断那一步是把 O(n²) 剪成 O(n) 的关键，漏掉它复杂度直接退化。',
              '常见坑：数组可含重复值，set 天然去重正好；空数组要先特判返回 0。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-adapter  stack / queue / priority_queue
     ========================================================== */
  'stl-adapter': {
    lede: 'stack、queue、priority_queue 不是新的数据结构，而是给现有容器戴上「接口口罩」——封掉多余操作，只留一种纪律。这一节看清适配器封装了谁、留下了什么，以及自定义比较器的三种写法。',
    blocks: [
      { t: 'h2', x: '适配器：做减法的封装' },
      {
        t: 'p',
        x: '`stack<int>` 内部就抱着一个真容器（默认 `deque<int>`），把它锁在私有成员里，对外只开放 `push`/`pop`/`top`。你**不能**遍历、不能随机访问、拿不到迭代器。这看似削弱，实则是**用类型系统强制执行纪律**：声明用 stack，等于向所有读代码的人承诺「此处只有后进先出」。算法正确性依赖这种纪律时（比如括号匹配、单调栈），封印本身就是价值。',
      },
      {
        t: 'cards',
        x: [
          { icon: 'layers', tone: 'violet', h: 'stack — LIFO', p: '只操作同一端：push/pop/top 全在「顶」。默认底层 deque。' },
          { icon: 'route', tone: 'primary', h: 'queue — FIFO', p: '尾进头出：push 进队尾，front/pop 看队头。默认底层 deque。' },
          { icon: 'trending', tone: 'accent', h: 'priority_queue — 最值优先', p: '出队的永远是当前「最大」（默认）。底层是建在 vector 上的二叉堆。' },
        ],
      },
      { t: 'h2', x: '底层容器：为什么默认是 deque' },
      {
        t: 'p',
        x: '适配器对底层的要求只是几个函数名：stack 需要 `back`/`push_back`/`pop_back`，queue 还要 `front`/`pop_front`。vector、deque、list 都能胜任 stack；queue 因为要在头部弹出，而 vector 连 `pop_front` 都没提供（头删 O(n)，干脆不给），直接出局。默认选 deque 的理由：两端 O(1) 天然契合，且**增长按块进行，没有 vector 那种整体搬迁的最坏尖峰**。你可以显式换底座：`stack<int, vector<int>> s;`——vector 版常数更小更缓存友好，竞赛里不少人这么写。',
      },
      { t: 'viz', kind: 'stack-ops' },
      {
        t: 'callout',
        kind: 'danger',
        title: '空容器上 pop/top 是未定义行为',
        x: '适配器不做任何越界检查：空 stack 调 `top()`、空 queue 调 `front()`，直接未定义行为——可能崩溃也可能返回垃圾值。**先 `empty()` 后取**是铁律。另一个手误：`pop()` 返回 `void`，取值和弹出是两步——`int x = s.top(); s.pop();`，没有「pop 出返回值」这回事（这是为异常安全刻意设计的）。',
      },
      { t: 'h2', x: 'queue：BFS 的标配' },
      { t: 'viz', kind: 'queue-circular' },
      {
        t: 'p',
        x: 'queue 的全部 API：`push`（进队尾）、`pop`（出队头）、`front`/`back`（看两头）、`empty`/`size`。BFS 的层序扩张、生产者-消费者缓冲，都是它的地盘。上面的环形数组动画展示了「用数组实现队列」的经典技巧——STL 的 deque 底座原理不同，但「头尾各一个游标」的思想相通。',
      },
      { t: 'h2', x: 'priority_queue：底层是堆' },
      {
        t: 'p',
        x: 'priority_queue 抱着一个 vector，但把它**组织成二叉堆**：数组下标隐含一棵完全二叉树（i 的孩子是 2i+1、2i+2），每个父节点 ≥ 孩子（默认大顶堆）。`push` 把新元素放到末尾再**上浮**，`pop` 把堆顶与末尾交换、删掉末尾、新顶**下沉**——两者都只沿树高走，**O(log n)**；`top()` 看堆顶 **O(1)**。它只维护「最值可及」这一个承诺，不维护全序，所以比「每次插入后排序」便宜得多。',
      },
      {
        t: 'html',
        x: tbl(
          ['操作', '<code>stack</code>', '<code>queue</code>', '<code>priority_queue</code>'],
          [
            ['进 push', G('O(1)'), G('O(1)'), M('O(log n)')],
            ['出 pop', G('O(1)'), G('O(1)'), M('O(log n)')],
            ['看 top/front', G('O(1)'), G('O(1)'), G('O(1)')],
            ['遍历 / 迭代器', '不提供', '不提供', '不提供'],
            ['默认底层', 'deque', 'deque', 'vector + 堆算法'],
          ]
        ),
      },
      { t: 'h2', x: '自定义比较器的三种写法' },
      {
        t: 'p',
        x: '默认 `priority_queue<int>` 是**大顶堆**（用 `less<int>` 比较，反直觉但记住即可：比较器说谁「小」，谁就沉底）。要小顶堆或按自定义规则排，有三种写法：',
      },
      {
        t: 'steps',
        x: [
          {
            h: '写法一：现成仿函数 greater',
            x: '最常用的小顶堆一行搞定。注意三个模板参数要写全：元素类型、底层容器、比较器。',
            code: `priority_queue<int, vector<int>, greater<int>> pq;  // 小顶堆
pq.push(3); pq.push(1); pq.push(2);
// pq.top() == 1`,
            lang: 'cpp',
          },
          {
            h: '写法二：自定义函数对象',
            x: '规则复杂、要复用时，写个重载 operator() 的结构体。比较器语义与 sort 一致：返回 true 表示 a 排在 b 前（在堆里意味着 a 优先级更低、更沉底）。',
            code: `struct ByDist {
    bool operator()(const pair<int,int>& a, const pair<int,int>& b) const {
        return a.second > b.second;   // 距离大的沉底 => 距离小的先出队
    }
};
priority_queue<pair<int,int>, vector<pair<int,int>>, ByDist> pq;`,
            lang: 'cpp',
          },
          {
            h: '写法三：lambda + decltype',
            x: '临时规则就地写 lambda。因为 lambda 类型无名，要用 decltype 告诉模板，并把 lambda 传给构造函数。',
            code: `auto cmp = [](int a, int b) { return a > b; };   // 小顶堆
priority_queue<int, vector<int>, decltype(cmp)> pq(cmp);`,
            lang: 'cpp',
          },
        ],
      },
      {
        t: 'code',
        lang: 'cpp',
        name: '综合示例：任务调度（C++17，可直接编译）',
        x: `#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

struct Task {
    string name;
    int prio;      // 数字越小越紧急
};

struct Cmp {
    bool operator()(const Task& a, const Task& b) const {
        return a.prio > b.prio;    // prio 大的沉底 => 小的先出队
    }
};

int main() {
    priority_queue<Task, vector<Task>, Cmp> pq;
    pq.push({"写周报", 3});
    pq.push({"修线上 bug", 1});
    pq.push({"回邮件", 2});

    while (!pq.empty()) {                    // 先 empty 后取，铁律
        cout << pq.top().name << '\\n';      // 依次: 修线上 bug、回邮件、写周报
        pq.pop();
    }
    return 0;
}`,
      },
      {
        t: 'callout',
        kind: 'warn',
        title: '比较器方向是重灾区',
        x: '想要「x 先出队」，比较器就要让「x 的对手排在前面沉底」——即返回 `a 比 b 差`。口诀：**priority_queue 的比较器和 sort 相同写法时，出队顺序恰好相反**。`less`（a < b）配出大顶堆、`greater` 配出小顶堆就是这个规律的实例。写完比较器，push 三个数验证一下 top，比盯着口诀想三分钟可靠。',
      },
      { t: 'viz', kind: 'heap-ops' },
      {
        t: 'quiz',
        q: '从 1 亿个数里持续维护「最小的 10 个」，标准做法是？',
        opts: [
          '小顶堆装全部 1 亿个数，弹 10 次',
          '容量 10 的大顶堆：新数比堆顶小就替换堆顶',
          '容量 10 的小顶堆：新数比堆顶大就替换堆顶',
          '每来一个数就全量 sort 一次',
        ],
        answer: 1,
        explain:
          '维护「最小的 k 个」用**大顶堆**：堆顶是这 k 个里最大的（守门员），新数比守门员还小就把守门员换掉，每次 O(log k)，总 O(n log k)，内存 O(k)。A 内存 O(n) 且没必要；C 方向反了——小顶堆的堆顶是 10 个里最小的，无法判断新数该不该进；D 是 O(n² log n) 级的灾难。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: '适配器 = 接口约束：stack/queue 封掉随机访问只留一种进出纪律，底层默认 deque；priority_queue 是 vector 上的二叉堆，push/pop O(log n)。比较器三种写法按场景挑：greater 一行流、函数对象可复用、lambda 加 decltype 最灵活。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '三个适配器各出一题：stack 的配对纪律、priority_queue 的 Top-K、对顶堆的进阶玩法。',
        x: [
          {
            id: 20,
            title: '有效的括号',
            slug: 'valid-parentheses',
            level: '简单',
            why: 'stack 的教科书应用：最近打开的括号必须最先闭合，正是后进先出纪律本身。',
            hint: '遇左括号压栈；遇右括号看栈顶是否为配对的左括号，是则弹出，否则失败。扫完后栈应当为空。',
            insight: [
              '最优解：一趟栈模拟，时间 O(n)、空间 O(n)。核心结论：「最近的未完成事项最先了结」的问题就交给 `stack`——它封掉随机访问，恰好强制执行这条纪律。',
              '常见坑：两处空栈操作——右括号来时栈已空（直接失败）与扫描结束栈未空（还有未闭合的左括号）；牢记正文的铁律：先 `empty()` 后 `top()`。',
            ],
          },
          {
            id: 215,
            title: '数组中的第K个最大元素',
            slug: 'kth-largest-element-in-an-array',
            level: '中等',
            why: '练「容量 k 的堆解 Top-K」：小顶堆当守门员，是 priority_queue 最高频的实战套路。',
            hint: '维护容量为 k 的**小顶堆**（`greater<int>` 三参数写法）：新数比堆顶大就换掉堆顶。扫完后堆顶即第 k 大。也可试试 `nth_element`。',
            insight: [
              '最优解：小顶堆 O(n log k)、空间 O(k)；`nth_element`（快速选择）平均 O(n) 更快但会改动原数组。核心结论：第 k **大**用**小**顶堆——堆顶是候选集中最弱的守门员，方向想反是最常见的错误。',
              '常见坑：`priority_queue<int, vector<int>, greater<int>>` 三个模板参数必须写全，漏了中间的底层容器编译不过。',
            ],
          },
          {
            id: 295,
            title: '数据流的中位数',
            slug: 'find-median-from-data-stream',
            level: '困难',
            why: '对顶堆：一大一小两个 priority_queue 各管一半数据，动态维护「中间的分界线」。',
            hint: '大顶堆存较小的一半，小顶堆存较大的一半，保持两堆大小差不超过 1。新数先进一个堆，再把该堆的堆顶挪到另一个堆完成再平衡。',
            insight: [
              '最优解：对顶堆，插入 O(log n)、取中位数 O(1)、空间 O(n)。核心结论：需要反复取「第 50% 位置」这类分位值时，用两个方向相反的 `priority_queue` 夹住分界线，比每次排序 O(n log n) 便宜得多。',
              '常见坑：插入后必须先过一遍「先入 A 堆、再把 A 堆顶弹给 B」的中转流程，直接按大小判断进哪个堆容易破坏「大顶堆所有元素 ≤ 小顶堆所有元素」的不变式；奇数个时约定哪个堆多存一个要前后一致。',
            ],
          },
        ],
      },
    ],
  },

  /* ==========================================================
     stl-algo  <algorithm>：会用就少写百行
     ========================================================== */
  'stl-algo': {
    lede: '<algorithm> 里躺着几十个被千锤百炼的函数：排序、二分、统计、去重、旋转……它们只认迭代器区间 [first, last)。这一节把最高频的十来个过一遍，每个都配可跑的小例子。',
    blocks: [
      { t: 'h2', x: '约定：算法吃的是左闭右开区间' },
      {
        t: 'p',
        x: '所有算法的输入都是 `[first, last)`：包含 first，**不包含** last。`v.end()` 指向最后一个元素的**后一位**，正好做右端点。这个约定让「空区间」（first == last）和「区间长度」（last - first）都不需要特判。另外多数算法接受一个可调用对象定制行为——lambda 在这里大放异彩。',
      },
      { t: 'h2', x: 'sort 与 stable_sort：什么时候需要稳定' },
      {
        t: 'p',
        x: '`sort` 是内省排序（快排 + 堆排 + 插排的混合体），O(n log n)，但**不稳定**——相等元素可能被打乱相对顺序。`stable_sort`（归并）保证相等元素保持原有先后，代价是稍慢、可能需要 O(n) 辅助内存。什么时候必须稳定？**二次排序**场景：先按提交时间排好，再按分数排，希望同分者仍按时间序——此时第二轮必须 stable_sort，否则第一轮的功夫白费。',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: 'sort / stable_sort 对比',
        x: `vector<pair<string,int>> v = {{"甲",90}, {"乙",85}, {"丙",90}, {"丁",85}};
// 按分数降序；同分保持原顺序（甲在丙前、乙在丁前）
stable_sort(v.begin(), v.end(),
            [](auto& a, auto& b) { return a.second > b.second; });
// 结果: 甲90 丙90 乙85 丁85 —— 换成 sort 则甲丙、乙丁的先后无保证`,
      },
      { t: 'viz', kind: 'sort-race' },
      { t: 'h2', x: '二分三件套：前提是有序' },
      {
        t: 'ul',
        x: [
          '`binary_search(f, l, x)`：只回答**有没有**，返回 bool。',
          '`lower_bound(f, l, x)`：第一个 **≥ x** 的位置——插入点、计数、找位置都靠它。',
          '`upper_bound(f, l, x)`：第一个 **> x** 的位置。`upper_bound - lower_bound` 就是 x 出现的次数。',
        ],
      },
      { t: 'viz', kind: 'binary-search' },
      {
        t: 'code',
        lang: 'cpp',
        name: '二分定位与计数',
        x: `vector<int> v = {1, 3, 3, 3, 7, 9};        // 必须有序！
auto lo = lower_bound(v.begin(), v.end(), 3);  // 指向下标 1
auto hi = upper_bound(v.begin(), v.end(), 3);  // 指向下标 4（元素 7）
cout << "3 出现 " << (hi - lo) << " 次\\n";     // 3 次
cout << "首个 3 在下标 " << (lo - v.begin()) << '\\n';
bool has7 = binary_search(v.begin(), v.end(), 7);   // true`,
      },
      {
        t: 'callout',
        kind: 'danger',
        title: '对无序区间二分 = 未定义行为',
        x: '二分三件套要求区间**已按同一比较器有序**。对乱序 vector 调 lower_bound 不会报错，只会安静地给出错误答案——这类 bug 没有崩溃现场，特别难查。另外记住上一节的教训：对 map/set 用**成员版** `s.lower_bound(x)`，自由函数版在双向迭代器上会退化成 O(n)。',
      },
      { t: 'h2', x: '统计与查找：min/max、accumulate、count_if、find_if' },
      {
        t: 'code',
        lang: 'cpp',
        name: '统计四连（注意 accumulate 在 <numeric>）',
        x: `#include <numeric>     // accumulate 住这里，不在 <algorithm>
vector<int> v = {4, 8, 1, 6, 3};

auto mx = max_element(v.begin(), v.end());   // 迭代器，*mx == 8
auto mn = min_element(v.begin(), v.end());   // *mn == 1

long long sum = accumulate(v.begin(), v.end(), 0LL);   // 22
double avg = accumulate(v.begin(), v.end(), 0.0) / v.size();

int evens = count_if(v.begin(), v.end(),
                     [](int x) { return x % 2 == 0; });   // 3 个偶数

auto it = find_if(v.begin(), v.end(),
                  [](int x) { return x > 5; });   // 第一个 >5：指向 8
if (it != v.end()) cout << *it << " 在下标 " << (it - v.begin()) << '\\n';`,
      },
      {
        t: 'callout',
        kind: 'warn',
        title: 'accumulate 的初值决定一切',
        x: '`accumulate(f, l, 0)` 的累加类型跟着**初值**走：初值写 `0`（int），累加一亿个 int 就会溢出；求和要 `0LL`，求浮点均值要 `0.0`。这是 accumulate 最著名的坑。另外 min_element/max_element 返回的是**迭代器**不是值，空区间时等于 end()，解引用前先判空。',
      },
      { t: 'h2', x: 'unique + erase：去重惯用法' },
      {
        t: 'p',
        x: '`unique` 有个反直觉的设计：它**不删除**任何元素，只把相邻的重复元素往后「搬」，把不重复的前移，返回新逻辑终点；尾部留下一段内容无意义的残余。真正的删除要靠容器的 erase 补刀——这就是 **erase-unique 惯用法**。同理还有 remove/remove_if：`std::remove` 只搬不删的原因是**算法只持有迭代器，根本不知道容器是谁**，没资格改变容器大小。',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: '排序 + 去重三板斧（C++17，可直接编译）',
        x: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};

    sort(v.begin(), v.end());                 // 1) 排序让重复元素相邻
    auto tail = unique(v.begin(), v.end());   // 2) 相邻去重，返回新逻辑终点
    v.erase(tail, v.end());                   // 3) 真正砍掉尾巴

    for (int x : v) cout << x << ' ';         // 1 2 3 4 5 6 9
    cout << "\\nsize=" << v.size() << '\\n';   // 7

    // 同门师兄弟：erase-remove 删除所有偶数
    v.erase(remove_if(v.begin(), v.end(),
                      [](int x) { return x % 2 == 0; }),
            v.end());
    for (int x : v) cout << x << ' ';         // 1 3 5 9
    cout << '\\n';
    return 0;
}`,
      },
      {
        t: 'p',
        x: 'C++20 起可以写 `std::erase(v, x)` / `std::erase_if(v, pred)` 一步到位，但旧代码里 erase-remove 遍地都是，必须能读懂。',
      },
      { t: 'h2', x: 'reverse 与 rotate' },
      {
        t: 'code',
        lang: 'cpp',
        name: '反转与旋转',
        x: `vector<int> v = {1, 2, 3, 4, 5};
reverse(v.begin(), v.end());              // 5 4 3 2 1

vector<int> w = {1, 2, 3, 4, 5};
// rotate(first, middle, last)：middle 成为新开头
rotate(w.begin(), w.begin() + 2, w.end()); // 3 4 5 1 2（整体左移 2 格）
// 「右移 k 格」= 左移 n-k 格；三次 reverse 也能实现同样效果`,
      },
      { t: 'h2', x: 'C++20 ranges 一瞥' },
      {
        t: 'p',
        x: 'C++20 的 ranges 让算法直接吃容器、用管道组合，不必再写成对的 begin/end：',
      },
      {
        t: 'code',
        lang: 'cpp',
        name: 'ranges 风格（需 C++20，-std=c++20）',
        x: `#include <ranges>
#include <algorithm>
vector<int> v = {5, 2, 8, 1, 9};

ranges::sort(v);                           // 直接传容器
// 过滤 + 变换的惰性视图：不产生中间容器
for (int x : v | views::filter([](int x) { return x % 2 == 1; })
               | views::transform([](int x) { return x * 10; }))
    cout << x << ' ';                      // 10 50 90`,
      },
      {
        t: 'p',
        x: '视图是**惰性**的：filter/transform 在遍历时才逐个计算，链再长也不拷贝数据。复健阶段知道「ranges::sort(v) 能这么写、views 能管道组合」即可，工程里能读懂就不掉队。',
      },
      { t: 'h2', x: '高频算法速查' },
      {
        t: 'html',
        x: tbl(
          ['算法', '作用', '复杂度', '备注'],
          [
            ['<code>sort</code>', '排序（不稳定）', M('O(n log n)'), '要求随机访问迭代器'],
            ['<code>stable_sort</code>', '稳定排序', M('O(n log n)'), '二次排序场景必选'],
            ['<code>nth_element</code>', '只保证第 n 位就位', G('平均 O(n)'), '求中位数/第 k 大，比全排便宜'],
            ['<code>lower_bound</code> / <code>upper_bound</code>', '有序区间二分定位', M('O(log n)'), B('前提：有序')],
            ['<code>min_element</code> / <code>max_element</code>', '最值位置', M('O(n)'), '返回迭代器'],
            ['<code>accumulate</code>', '累加 / 折叠', M('O(n)'), '在 &lt;numeric&gt;，初值定类型'],
            ['<code>count_if</code> / <code>find_if</code>', '按条件计数 / 找首个', M('O(n)'), '配 lambda'],
            ['<code>unique</code> / <code>remove_if</code>', '搬移式去重 / 删除', M('O(n)'), '必须配 erase 收尾'],
            ['<code>reverse</code> / <code>rotate</code>', '反转 / 旋转', M('O(n)'), '原地完成'],
          ]
        ),
      },
      {
        t: 'quiz',
        q: '`vector<int> v = {5,1,5,2,5};` 直接执行 `v.erase(unique(v.begin(), v.end()), v.end());`（未排序），结果是？',
        opts: [
          '{1, 2, 5}——所有重复都被去掉',
          '{5, 1, 5, 2, 5}——原样不变',
          '{5, 1, 5, 2}——只有相邻重复被合并',
          '未定义行为',
        ],
        answer: 1,
        explain:
          'unique 只合并**相邻**的重复元素。{5,1,5,2,5} 里没有任何两个相邻元素相等，unique 一个都不动，返回 end()，erase 删的是空区间——所以原样不变（选项 B）。想全局去重必须先 sort 让重复相邻，这正是「排序 + 去重三板斧」的第一板斧存在的意义。',
      },
      {
        t: 'callout',
        kind: 'key',
        title: '本节带走',
        x: '算法只认 [first, last) 和迭代器等级：sort 要随机访问、二分要先有序、remove/unique 只搬不删要 erase 收尾。稳定性在二次排序时才花钱买（stable_sort）；统计交给 accumulate/count_if；C++20 的 ranges 把这一切变成管道。会查这张表，胜过手写一百行循环。',
      },
      { t: 'h2', x: '配套练习' },
      {
        t: 'exercises',
        intro: '三道题各练一类算法武器：标记统计、sort 加自定义比较器、以及一个能被标准库一行替换的经典算法。',
        x: [
          {
            id: 448,
            title: '找到所有数组中消失的数字',
            slug: 'find-all-numbers-disappeared-in-an-array',
            level: '简单',
            why: '热身：先用一行 STL 解出来，再挑战 O(1) 空间原地标记，体会「会用算法」和「懂原理」的差距。',
            hint: '朴素做法用标记数组或 set 判存在。进阶要求 O(1) 额外空间：值域恰好是 1 到 n，可以把「出现过」这个信息记在数组自己身上——比如把对应下标的元素变成负数。',
            insight: [
              '最优解：原地取负标记，两趟扫描，时间 O(n)、空间 O(1)（不算输出）。第一趟对每个值 v 把下标 abs(v)-1 处取负，第二趟收集仍为正的下标。',
              '核心结论：「值域 = 下标范围」时数组本身就是最好的哈希表。常见坑：第一趟必须用 `abs(v)` 取下标，因为该位置可能已被前面的操作变负。',
            ],
          },
          {
            id: 56,
            title: '合并区间',
            slug: 'merge-intervals',
            level: '中等',
            why: '练 sort 加 lambda 比较器的标准流程：先按左端点排序，重叠区间必然相邻，一趟合并收工。',
            hint: '先 `sort` 按区间左端点升序（lambda 比较器）。然后线性扫：当前区间左端点不超过结果集末区间的右端点就合并（右端点取 max），否则开新区间。',
            insight: [
              '最优解：排序 O(n log n) + 线性合并 O(n)，空间 O(1)（不算输出）。核心结论：区间题九成先排序——排序把「任意两两比较」压成「只看相邻」，这是 sort 作为预处理最典型的价值。',
              '常见坑：合并时右端点要取 `max(当前右, 新右)`，完全包含的区间（新右更小）会让漏写 max 的代码出错；比较器只按 `a[0] < b[0]` 即可，不需要二级排序。',
            ],
          },
          {
            id: 31,
            title: '下一个排列',
            slug: 'next-permutation',
            level: '中等',
            why: '亲手实现 `std::next_permutation`：反向扫描找拐点、二分性质找交换对、reverse 收尾，三个算法思想一次用齐。',
            hint: '从右往左找第一个「升序对」nums[i] < nums[i+1]；再从右往左找第一个大于 nums[i] 的数与之交换；最后把 i 之后的整段 `reverse` 成升序。写完可与标准库行为对拍验证。',
            insight: [
              '最优解：一趟找拐点 + 一趟找交换对 + 一次 reverse，时间 O(n)、空间 O(1)。这正是 `std::next_permutation` 的实现，读懂它就理解了「字典序枚举」的原理。',
              '常见坑：整个数组已是最大排列（完全降序）时找不到拐点，直接整体 reverse 回最小排列——标准库此时返回 false，你的实现也要覆盖这个分支；交换后忘记 reverse 尾段是第二大错误来源。',
            ],
          },
        ],
      },
    ],
  },
};
