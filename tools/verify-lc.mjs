/* 逐题核实力扣题目：node tools/verify-lc.mjs slug1 slug2 ...
   输出：slug / 题号 / 难度 / 中文题名 / 会员标记（VIP 题不能用） */
const slugs = process.argv.slice(2);
const q = 'query q($s: String!){question(titleSlug:$s){questionFrontendId translatedTitle difficulty isPaidOnly}}';
const D = { Easy: '简单', Medium: '中等', Hard: '困难' };
for (const s of slugs) {
  try {
    const r = await fetch('https://leetcode.cn/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ query: q, variables: { s } }),
    });
    const j = await r.json();
    const d = j?.data?.question;
    console.log(d ? `${s}\t${d.questionFrontendId}\t${D[d.difficulty]}\t${d.translatedTitle}\t${d.isPaidOnly ? 'VIP!!' : 'free'}` : `${s}\tNULL\t-\t-\t-`);
  } catch (e) {
    console.log(`${s}\tERR\t-\t${e.message}\t-`);
  }
  await new Promise((r) => setTimeout(r, 120));
}
