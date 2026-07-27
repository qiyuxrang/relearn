/* ============================================================
   Python 基础模块课程内容
   纯数据模块：不 import 任何东西
   ============================================================ */

export const lessons = {
  /* ------------------------------------------------------------
     cpp-hello 起步：Python 程序怎样运行
     ------------------------------------------------------------ */
  'cpp-hello': {
    lede: '先把 Python 程序从文本到执行的过程讲清楚：解释器、脚本、REPL、标准输入输出和报错位置。后面的题库代码都建立在这条基本链路上。',
    blocks: [
      { t: 'h2', x: 'Python 程序从哪里开始' },
      { t: 'p', x: 'Python 文件就是普通文本，解释器会从文件第一行开始顺序执行。没有强制的入口函数；如果你写了函数，它只有在被调用时才会执行。日常刷题时，代码通常直接读取标准输入、计算结果、打印答案。' },
      { t: 'code', lang: 'python', name: 'hello.py', x: `name = input().strip()
print(f"hello, {name}")` },
      { t: 'h2', x: '脚本和交互式环境' },
      { t: 'ul', x: [
        '脚本：把代码保存为 `.py` 文件，用 `python file.py` 运行，适合完整程序和题解。',
        'REPL：直接输入 `python` 进入交互环境，适合试表达式、查对象类型、验证小片段。',
        '在线判题：评测机会把测试数据接到标准输入，程序只需要按题目格式读入并输出。',
      ] },
      { t: 'code', lang: 'text', name: '终端', x: `python hello.py
Alice
hello, Alice` },
      { t: 'callout', kind: 'tip', title: '第一天就固定版本', x: '机试或项目里尽量明确使用 Python 3。命令行里可以先运行 `python --version`，确认当前解释器版本，避免本地和评测环境行为不一致。' },
      { t: 'h2', x: '读报错：先看最后一段' },
      { t: 'p', x: 'Python 的报错会打印 traceback。最上面是调用链，最下面通常是异常类型和原因；定位时先看最后一段，再回到文件名和行号。' },
      { t: 'code', lang: 'text', name: 'traceback 示例', x: `Traceback (most recent call last):
  File "main.py", line 2, in <module>
    print(nums[3])
IndexError: list index out of range` },
      { t: 'quiz', q: '运行脚本时出现 `IndexError: list index out of range`，第一步应该看什么？', opts: [
        '直接重装 Python',
        '先看 traceback 最下面的异常类型，再回到对应文件行号',
        '把所有变量都改成全局变量',
        '只看第一行 Traceback',
      ], answer: 1, explain: '最后一行说明错误类型，文件名和行号告诉你具体位置。' },
      { t: 'exercises', intro: '把运行链路练熟。', x: [
        { badge: '练习', title: '回声脚本', level: '入门', why: '练习 input、strip 和 print 的最小闭环。', hint: '读一行字符串，原样输出；再试试去掉首尾空白。', insight: '能独立跑通脚本，就具备进入题库的基本条件。' },
        { badge: '练习', title: '读懂一次报错', level: '入门', why: '练习从 traceback 定位问题。', hint: '故意访问空列表的第 0 个元素，观察异常类型和行号。', insight: '不要被长调用链吓住，先看异常类型和最靠近自己代码的行。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-types 变量、对象与动态类型
     ------------------------------------------------------------ */
  'cpp-types': {
    lede: 'Python 的变量不是盒子，而是名字。名字绑定到对象，对象自己带着类型和值。理解这一点，才能解释赋值、比较和可变对象的行为。',
    blocks: [
      { t: 'h2', x: '变量是名字，对象才有类型' },
      { t: 'p', x: '写下 `x = 3` 时，Python 创建或复用整数对象 `3`，再让名字 `x` 指向它。变量名没有固定类型，下一行可以绑定到字符串、列表或任何对象。' },
      { t: 'code', lang: 'python', name: 'dynamic_type.py', x: `x = 3
print(type(x), x)

x = "3"
print(type(x), x)` },
      { t: 'h2', x: '常用基础类型' },
      { t: 'table', head: ['类型', '例子', '常见用途'], rows: [
        ['int', '42', '计数、下标、整数运算'],
        ['float', '3.14', '近似小数，注意精度误差'],
        ['str', '"abc"', '文本、题目中的字符处理'],
        ['bool', 'True / False', '条件判断'],
        ['NoneType', 'None', '表示没有值或默认空结果'],
      ] },
      { t: 'h2', x: '类型转换要显式' },
      { t: 'p', x: '标准输入读到的永远先是字符串。要做数学计算，就需要用 `int()`、`float()` 或拆分后的 `map(int, ...)` 转成数字。' },
      { t: 'code', lang: 'python', name: 'parse_numbers.py', x: `a, b = map(int, input().split())
print(a + b)

score = float(input())
print(score >= 60.0)` },
      { t: 'callout', kind: 'warn', title: '不要混淆值相等和对象相同', x: '`==` 比较值是否相等，`is` 比较是否为同一个对象。业务代码里判断数值、字符串和列表内容，通常用 `==`。`is` 主要用于判断 `None`。' },
      { t: 'code', lang: 'python', name: 'eq_vs_is.py', x: `a = [1, 2]
b = [1, 2]
print(a == b)  # True，内容相等
print(a is b)  # False，不是同一个列表对象

value = None
print(value is None)` },
      { t: 'quiz', q: '`input()` 读到 `123` 后，返回值的类型是什么？', opts: [
        'int',
        'str',
        'float',
        'bool',
      ], answer: 1, explain: '`input()` 总是返回字符串，是否转数字由程序自己决定。' },
      { t: 'exercises', intro: '把类型转换和比较练清楚。', x: [
        { badge: '练习', title: '两数相加', level: '入门', why: '练习字符串输入转整数。', hint: '用 `split()` 拆出两个字段，再用 `map(int, ...)`。', insight: '大多数机试输入处理都可以从这一行扩展出来。' },
        { badge: '练习', title: 'None 判空', level: '入门', why: '建立 `is None` 的判断习惯。', hint: '写一个函数，没找到结果时返回 None。', insight: 'None 是哨兵值，不要用空字符串或 0 代替所有缺失状态。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-flow 控制流：分支、循环与推导式
     ------------------------------------------------------------ */
  'cpp-flow': {
    lede: 'Python 用缩进表达代码块，用 if、for、while 组织执行路径。写题时控制流要清楚，边界条件要尽量显式。',
    blocks: [
      { t: 'h2', x: '缩进就是结构' },
      { t: 'p', x: 'Python 不用花括号标记代码块，缩进层级就是结构。相同层级表示同一个块，缩进不一致会直接导致语法错误或逻辑错误。' },
      { t: 'code', lang: 'python', name: 'branch.py', x: `score = int(input())

if score >= 90:
    print("A")
elif score >= 60:
    print("pass")
else:
    print("fail")` },
      { t: 'h2', x: 'for 遍历的是可迭代对象' },
      { t: 'p', x: '`for` 可以遍历列表、字符串、range、字典的键等可迭代对象。需要下标时用 `enumerate`，需要并行遍历时用 `zip`。' },
      { t: 'code', lang: 'python', name: 'for_tools.py', x: `names = ["Ada", "Linus", "Guido"]

for i, name in enumerate(names, start=1):
    print(i, name)

scores = [95, 88, 77]
for name, score in zip(names, scores):
    print(name, score)` },
      { t: 'h2', x: 'while 适合条件驱动' },
      { t: 'p', x: '循环次数已知时优先用 `for range(...)`；需要一直推进直到条件变化时，再用 `while`。写 while 时一定确认循环变量会更新。' },
      { t: 'code', lang: 'python', name: 'while_loop.py', x: `n = int(input())
steps = 0

while n > 1:
    n //= 2
    steps += 1

print(steps)` },
      { t: 'h2', x: '推导式是小循环，不是炫技' },
      { t: 'p', x: '列表、集合、字典推导式适合写短而清晰的转换。只要逻辑开始嵌套太深，就换回普通循环。' },
      { t: 'code', lang: 'python', name: 'comprehension.py', x: `nums = [1, 2, 3, 4, 5]
squares = [x * x for x in nums if x % 2 == 1]
index = {value: i for i, value in enumerate(nums)}

print(squares)
print(index)` },
      { t: 'quiz', q: '遍历列表时既要下标又要元素，最直接的写法是？', opts: [
        '`for item in items`',
        '`for i in range(len(items))` 永远最佳',
        '`for i, item in enumerate(items)`',
        '`while True`',
      ], answer: 2, explain: '`enumerate` 同时给出下标和元素，语义清楚，也不容易写错下标。' },
      { t: 'exercises', intro: '用控制流处理边界。', x: [
        { badge: '练习', title: '统计奇数个数', level: '入门', why: '练习 for、if 和计数变量。', hint: '遍历数字列表，遇到 `x % 2 == 1` 就加一。', insight: '这类模式会扩展成频次统计、过滤和扫描。' },
        { badge: '练习', title: '压缩连续空格', level: '进阶', why: '练习带状态的扫描。', hint: '记录前一个字符是否为空格。', insight: '很多字符串题本质都是一次线性扫描加少量状态。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-func 函数、参数与作用域
     ------------------------------------------------------------ */
  'cpp-func': {
    lede: '函数把一段逻辑封装成可复用单元。Python 函数的重点是参数传递、返回值、默认参数和作用域边界。',
    blocks: [
      { t: 'h2', x: '函数用 def 定义' },
      { t: 'p', x: '函数定义本身不会执行函数体，只有调用时才执行。函数可以返回任意对象；没有显式 `return` 时会返回 `None`。' },
      { t: 'code', lang: 'python', name: 'function_basic.py', x: `def area(width, height):
    return width * height

print(area(3, 5))` },
      { t: 'h2', x: '参数绑定到对象' },
      { t: 'p', x: '调用函数时，形参名字会绑定到实参对象。不可变对象看起来像按值传递；可变对象在函数内修改内容，外面也能看到。' },
      { t: 'code', lang: 'python', name: 'argument_binding.py', x: `def add_one(x):
    x += 1

def append_one(items):
    items.append(1)

n = 10
nums = []
add_one(n)
append_one(nums)
print(n)     # 10
print(nums)  # [1]` },
      { t: 'callout', kind: 'warn', title: '默认参数不要用可变对象', x: '默认参数在函数定义时创建一次。如果写 `def f(items=[])`，多次调用会共享同一个列表。需要默认空列表时，用 `None` 做哨兵。' },
      { t: 'code', lang: 'python', name: 'default_arg.py', x: `def collect(value, items=None):
    if items is None:
        items = []
    items.append(value)
    return items

print(collect(1))
print(collect(2))` },
      { t: 'h2', x: '作用域从近到远查找' },
      { t: 'p', x: '函数内部读取名字时，会先找局部作用域，再找外层函数、模块全局和内置名字。写入局部变量时，默认只影响当前函数。' },
      { t: 'code', lang: 'python', name: 'scope.py', x: `rate = 2

def price(count):
    tax = 1
    return count * rate + tax

print(price(5))` },
      { t: 'quiz', q: '为什么默认参数通常不写成空列表 `[]`？', opts: [
        '列表不能作为参数',
        '默认参数会在每次调用时重新创建，太慢',
        '默认列表会在函数定义时创建一次，多次调用共享',
        'Python 不支持默认参数',
      ], answer: 2, explain: '可变默认参数会保留上次调用修改后的内容，容易产生隐蔽状态。' },
      { t: 'exercises', intro: '把函数边界写稳。', x: [
        { badge: '练习', title: '封装求平均值', level: '入门', why: '练习返回值和空输入处理。', hint: '空列表可以返回 None，调用方再判断。', insight: '函数应明确表达失败或空结果，不要悄悄返回误导性数字。' },
        { badge: '练习', title: '安全追加', level: '入门', why: '练习 None 哨兵替代可变默认参数。', hint: '参数默认 None，函数内创建新列表。', insight: '这是 Python 面试和真实项目里都常见的坑。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-pointer 可变对象、引用语义与拷贝
     ------------------------------------------------------------ */
  'cpp-pointer': {
    lede: 'Python 没有指针语法，但有引用语义。多个名字可以绑定到同一个可变对象，修改内容时会影响所有引用者。',
    blocks: [
      { t: 'h2', x: '赋值不会复制对象' },
      { t: 'p', x: '对列表、字典、集合这类可变对象，`b = a` 只是让两个名字指向同一个对象。修改 `b` 的内容，`a` 看到的内容也会变。' },
      { t: 'code', lang: 'python', name: 'alias.py', x: `a = [1, 2, 3]
b = a
b.append(4)

print(a)
print(a is b)` },
      { t: 'h2', x: '浅拷贝和深拷贝' },
      { t: 'p', x: '浅拷贝会创建外层容器，但里面的元素仍是原来的对象。嵌套列表需要完全独立时，用 `copy.deepcopy`。' },
      { t: 'code', lang: 'python', name: 'copy_demo.py', x: `import copy

grid = [[0, 0], [0, 0]]
shallow = grid[:]
deep = copy.deepcopy(grid)

shallow[0][0] = 7
print(grid)  # 内层列表被共享

deep[1][1] = 9
print(grid)  # deep 不影响原对象` },
      { t: 'callout', kind: 'warn', title: '二维数组初始化常见坑', x: '`[[0] * m] * n` 会让 n 行引用同一个列表。修改一行，所有行都会变。应使用列表推导式逐行创建。' },
      { t: 'code', lang: 'python', name: 'grid_init.py', x: `n, m = 3, 4
bad = [[0] * m] * n
good = [[0] * m for _ in range(n)]

bad[0][0] = 1
good[0][0] = 1

print(bad)
print(good)` },
      { t: 'h2', x: '什么时候原地改，什么时候返回新对象' },
      { t: 'p', x: '原地修改适合性能敏感或明确要更新状态的场景；返回新对象适合让函数更容易推理。刷题时如果题目要求原地操作，再原地改。项目代码里优先让接口语义清楚。' },
      { t: 'quiz', q: '`b = a` 之后执行 `b.append(1)`，如果 a 是列表，会发生什么？', opts: [
        '只修改 b，a 不变',
        'a 和 b 指向同一个列表，所以 a 也能看到变化',
        'Python 会报语法错误',
        'append 会返回一个新列表',
      ], answer: 1, explain: '赋值只是绑定名字，不会复制列表对象。' },
      { t: 'exercises', intro: '把引用和拷贝练出直觉。', x: [
        { badge: '练习', title: '修复二维矩阵初始化', level: '入门', why: '避免多行共享同一对象。', hint: '使用 `[[0] * m for _ in range(n)]`。', insight: '嵌套可变对象时，先问自己哪些层级需要独立。' },
        { badge: '练习', title: '复制嵌套配置', level: '进阶', why: '练习浅拷贝和深拷贝差异。', hint: '构造一个包含列表的字典，分别用 `dict.copy()` 和 `deepcopy`。', insight: '浅拷贝只隔离外层容器，不隔离内层对象。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-array list、tuple、字符串与切片
     ------------------------------------------------------------ */
  'cpp-array': {
    lede: '序列是 Python 高频基础。list 适合可变数组，tuple 适合固定组合，str 适合文本，切片让区间处理更直接。',
    blocks: [
      { t: 'h2', x: 'list 是最常用的可变序列' },
      { t: 'p', x: '列表支持下标访问、追加、弹出、排序和切片。下标从 0 开始，负数下标从末尾倒着数。' },
      { t: 'code', lang: 'python', name: 'list_basic.py', x: `nums = [3, 1, 4]
nums.append(2)
nums.sort()

print(nums[0])
print(nums[-1])
print(nums[1:3])` },
      { t: 'h2', x: 'tuple 表达固定结构' },
      { t: 'p', x: '元组不可变，适合坐标、键值对、函数多返回值等固定结构。不可变也意味着它可以作为字典键，前提是内部元素也可哈希。' },
      { t: 'code', lang: 'python', name: 'tuple_demo.py', x: `point = (3, 5)
x, y = point

def divmod_like(a, b):
    return a // b, a % b

q, r = divmod_like(17, 5)
print(x, y, q, r)` },
      { t: 'h2', x: '字符串不可变' },
      { t: 'p', x: '字符串支持下标、切片、查找和分割，但不能原地修改某个字符。需要构造新字符串时，可以收集到列表后再 `join`。' },
      { t: 'code', lang: 'python', name: 'string_join.py', x: `s = "python"
chars = list(s)
chars[0] = "P"
result = "".join(chars)

print(result)
print(s[1:4])` },
      { t: 'callout', kind: 'tip', title: '切片边界是左闭右开', x: '`s[l:r]` 包含下标 l，不包含下标 r。这个规则和 `range(l, r)` 一致，能减少很多边界错误。' },
      { t: 'code', lang: 'python', name: 'slice_patterns.py', x: `arr = [0, 1, 2, 3, 4, 5]
print(arr[:3])
print(arr[3:])
print(arr[::-1])
print(arr[1:5:2])` },
      { t: 'quiz', q: '`arr[1:4]` 会取到哪些下标？', opts: [
        '1、2、3',
        '1、2、3、4',
        '0、1、2、3',
        '只取 4',
      ], answer: 0, explain: '切片左闭右开，包含 1，不包含 4。' },
      { t: 'exercises', intro: '练序列的常用操作。', x: [
        { badge: '练习', title: '反转单词顺序', level: '入门', why: '练习 split、切片和 join。', hint: '先拆成单词列表，再反向拼接。', insight: '字符串题常由拆分、扫描、重组三个动作组成。' },
        { badge: '练习', title: '旋转列表', level: '进阶', why: '练习切片组合。', hint: 'k 对长度取模，再拼接后半段和前半段。', insight: '切片能让很多区间搬移题更短，但边界仍要先算清楚。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-struct dict、set 与数据建模
     ------------------------------------------------------------ */
  'cpp-struct': {
    lede: 'dict 和 set 是 Python 处理查找、计数、去重和关系映射的核心工具。会建模，算法题和项目代码都会简单很多。',
    blocks: [
      { t: 'h2', x: 'dict：键到值的映射' },
      { t: 'p', x: '字典用键快速找到值。常见模式包括计数、分组、缓存、配置和索引。键必须可哈希，字符串、数字、元组通常可以作为键。' },
      { t: 'code', lang: 'python', name: 'dict_count.py', x: `text = "banana"
freq = {}

for ch in text:
    freq[ch] = freq.get(ch, 0) + 1

print(freq)` },
      { t: 'h2', x: 'set：只关心是否存在' },
      { t: 'p', x: '集合适合去重、成员判断、交并差运算。只需要判断一个元素是否出现过时，set 通常比 list 扫描更合适。' },
      { t: 'code', lang: 'python', name: 'set_demo.py', x: `seen = set()
nums = [1, 3, 3, 5, 1]

for x in nums:
    if x in seen:
        print("repeat", x)
    seen.add(x)

print(seen)` },
      { t: 'h2', x: 'collections 提供常用模型' },
      { t: 'p', x: '`collections.Counter` 适合计数，`defaultdict` 适合分组，`deque` 适合双端队列。它们是 Python 标准库，刷题和项目都常用。' },
      { t: 'code', lang: 'python', name: 'collections_demo.py', x: `from collections import Counter, defaultdict

words = ["ai", "rag", "ai", "agent"]
print(Counter(words))

groups = defaultdict(list)
for word in words:
    groups[len(word)].append(word)

print(dict(groups))` },
      { t: 'callout', kind: 'tip', title: '先选数据模型，再写循环', x: '遇到题目不要先急着写 if。先问：我要按什么键查？要不要计数？要不要保持顺序？模型选对，代码自然会短。' },
      { t: 'quiz', q: '只需要判断一个元素是否出现过，通常优先选择哪种结构？', opts: [
        'list',
        'set',
        'str',
        'float',
      ], answer: 1, explain: 'set 的成员判断语义直接，平均情况下效率也更适合查存在性。' },
      { t: 'exercises', intro: '用映射和集合建模。', x: [
        { badge: '练习', title: '字符频次统计', level: '入门', why: '练习 dict.get 和 Counter。', hint: '先手写字典计数，再用 Counter 对照。', insight: '计数模型是哈希表题的基本功。' },
        { badge: '练习', title: '两数之和', level: '进阶', why: '练习用 dict 存补数或下标。', hint: '遍历时查 `target - x` 是否已经出现。', insight: '把过去的信息放进哈希表，当前元素就能 O(1) 查询。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-modern 模块、异常与文件 I/O
     ------------------------------------------------------------ */
  'cpp-modern': {
    lede: '写项目不能只会单文件脚本。模块、异常和文件 I/O 是把 Python 代码组织成可维护程序的基础。',
    blocks: [
      { t: 'h2', x: '模块就是一个可导入的 .py 文件' },
      { t: 'p', x: '把可复用函数放进单独文件，就可以在其他文件里 import。模块导入时会执行顶层代码，所以脚本入口通常用 `if __name__ == "__main__"` 保护。' },
      { t: 'code', lang: 'python', name: 'math_utils.py', x: `def clamp(value, low, high):
    return max(low, min(value, high))` },
      { t: 'code', lang: 'python', name: 'main.py', x: `from math_utils import clamp

if __name__ == "__main__":
    print(clamp(12, 0, 10))` },
      { t: 'h2', x: '异常用于处理失败路径' },
      { t: 'p', x: '异常不是用来掩盖错误的，而是把失败路径显式写出来。能提前判断的输入问题可以先判断；真正可能失败的外部操作，如文件、网络、解析，再用 try/except。' },
      { t: 'code', lang: 'python', name: 'exception_demo.py', x: `raw = input().strip()

try:
    value = int(raw)
except ValueError:
    print("not a number")
else:
    print(value * 2)` },
      { t: 'h2', x: '文件读写用 with' },
      { t: 'p', x: '`with open(...) as f` 会在代码块结束时自动关闭文件。文本文件要明确编码，中文项目里通常写 `encoding="utf-8"`。' },
      { t: 'code', lang: 'python', name: 'file_io.py', x: `from pathlib import Path

path = Path("notes.txt")
path.write_text("hello\\n", encoding="utf-8")

text = path.read_text(encoding="utf-8")
print(text.strip())` },
      { t: 'callout', kind: 'warn', title: '不要裸 except', x: '`except:` 会吞掉太多问题，包括你自己代码里的拼写错误。优先捕获明确异常，例如 `ValueError`、`FileNotFoundError`。' },
      { t: 'quiz', q: '`if __name__ == "__main__"` 的主要作用是什么？', opts: [
        '让 Python 运行更快',
        '区分直接运行和被 import，避免导入时执行脚本入口',
        '强制变量变成全局变量',
        '自动安装依赖',
      ], answer: 1, explain: '被 import 时模块顶层代码会执行，入口保护可以避免副作用。' },
      { t: 'exercises', intro: '把脚本组织成小项目。', x: [
        { badge: '练习', title: '拆分工具函数', level: '入门', why: '练习模块导入和入口保护。', hint: '一个文件放函数，一个文件调用函数。', insight: '可复用逻辑不要堆在脚本顶层。' },
        { badge: '练习', title: '安全读取整数', level: '进阶', why: '练习明确异常处理。', hint: '捕获 ValueError，返回 None 或错误提示。', insight: '异常处理应该让失败路径更清楚，而不是把错误静默吃掉。' },
      ] },
    ],
  },

  /* ------------------------------------------------------------
     cpp-template 类、协议与类型提示
     ------------------------------------------------------------ */
  'cpp-template': {
    lede: 'Python 的面向对象不靠复杂语法取胜，而是靠清晰的数据和行为边界。类型提示和协议能让接口更明确，也方便编辑器和测试发现问题。',
    blocks: [
      { t: 'h2', x: '类把数据和行为放在一起' },
      { t: 'p', x: '类适合表达有状态、有行为的概念。简单数据优先用 `dataclass`，它能自动生成初始化、显示和比较等常用方法。' },
      { t: 'code', lang: 'python', name: 'dataclass_demo.py', x: `from dataclasses import dataclass

@dataclass
class Task:
    title: str
    done: bool = False

    def finish(self) -> None:
        self.done = True

task = Task("learn Python")
task.finish()
print(task)` },
      { t: 'h2', x: '类型提示说明接口意图' },
      { t: 'p', x: '类型提示不会自动限制运行时类型，但它能让读代码的人、编辑器和静态检查工具更容易理解接口。项目代码里，公共函数建议补上参数和返回类型。' },
      { t: 'code', lang: 'python', name: 'typing_demo.py', x: `def top_k(scores: list[int], k: int) -> list[int]:
    return sorted(scores, reverse=True)[:k]

print(top_k([3, 9, 1, 7], 2))` },
      { t: 'h2', x: '协议关注能做什么' },
      { t: 'p', x: 'Python 更看重对象是否支持某种操作，而不是它属于哪个继承树。只要对象实现了需要的方法，就可以被相同代码使用。' },
      { t: 'code', lang: 'python', name: 'duck_typing.py', x: `class ConsoleWriter:
    def write(self, text: str) -> None:
        print(text)

def greet(writer) -> None:
    writer.write("hello")

greet(ConsoleWriter())` },
      { t: 'callout', kind: 'tip', title: '不要过早写继承体系', x: '学习阶段容易把类写复杂。先用函数、字典、dataclass 解决问题；当多个对象确实共享行为边界时，再引入类和协议。' },
      { t: 'quiz', q: '类型提示在 Python 中的主要价值是什么？', opts: [
        '让代码自动变成静态语言',
        '说明接口意图，帮助阅读、编辑器提示和静态检查',
        '让所有函数自动加速',
        '替代单元测试',
      ], answer: 1, explain: '类型提示主要提供可读性和工具支持，运行时仍需要正确逻辑和测试。' },
      { t: 'exercises', intro: '把对象接口写清楚。', x: [
        { badge: '练习', title: '任务对象', level: '入门', why: '练习 dataclass 和方法。', hint: '定义 title、done 字段，再写 finish 方法。', insight: '简单对象用 dataclass 可以少写很多样板代码。' },
        { badge: '练习', title: '排行榜函数', level: '进阶', why: '练习类型提示和返回值设计。', hint: '输入 `list[int]` 和 k，返回降序前 k 个分数。', insight: '公共函数的类型提示能降低调用方理解成本。' },
      ] },
    ],
  },
};
