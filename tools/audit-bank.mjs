/* 题库外链独立复核：提取全部 slug/url，逐个核实
   node tools/audit-bank.mjs            列出清单
   node tools/audit-bank.mjs --check    真的去请求核实 */
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { BANKS } = await import(pathToFileURL(resolve(root, 'assets/js/core/banks.js')).href);

const items = [];
function walk(bs, set) {
  (bs || []).forEach((b) => {
    if (!b) return;
    if (b.t === 'exercises') (b.x || []).forEach((ex) => ex && ex.title && items.push({ ...ex, set }));
    if (b.t === 'fold' && Array.isArray(b.x)) walk(b.x, set);
  });
}
for (const bank of BANKS) {
  const { sets } = await import(pathToFileURL(resolve(root, `assets/js/content/banks/${bank.id}.js`)).href);
  for (const s of bank.sets) if (sets[s.id]) walk(sets[s.id].blocks, s.id);
}

const lc = items.filter((x) => x.slug);
const nc = items.filter((x) => x.url);
console.log(`共 ${items.length} 题：力扣 ${lc.length}，外链 ${nc.length}`);

if (!process.argv.includes('--check')) {
  items.forEach((x) => console.log(`${x.set}\t${x.key}\t${x.id ?? x.badge}\t${x.level}\t${x.title}\t${x.slug || x.url}`));
  process.exit(0);
}

const D = { Easy: '简单', Medium: '中等', Hard: '困难' };
let bad = 0;
const q = 'query q($s: String!){question(titleSlug:$s){questionFrontendId translatedTitle difficulty isPaidOnly}}';
for (const x of lc) {
  const r = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query: q, variables: { s: x.slug } }),
  }).then((r) => r.json()).catch(() => null);
  const d = r?.data?.question;
  if (!d) { console.log(`✗ ${x.set}/${x.key} slug 不存在: ${x.slug}`); bad++; continue; }
  const errs = [];
  if (String(d.questionFrontendId) !== String(x.id)) errs.push(`题号 数据=${x.id} 官方=${d.questionFrontendId}`);
  if (d.translatedTitle !== x.title) errs.push(`题名 数据="${x.title}" 官方="${d.translatedTitle}"`);
  if (D[d.difficulty] !== x.level) errs.push(`难度 数据=${x.level} 官方=${D[d.difficulty]}`);
  if (d.isPaidOnly) errs.push('会员题！');
  if (errs.length) { console.log(`✗ ${x.set}/${x.key} ${x.slug}: ${errs.join(' | ')}`); bad++; }
  await new Promise((r) => setTimeout(r, 110));
}
for (const x of nc) {
  const r = await fetch(x.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' }, redirect: 'follow' }).catch(() => null);
  if (!r || r.status !== 200) { console.log(`✗ ${x.set}/${x.key} HTTP ${r ? r.status : 'ERR'}: ${x.url}`); bad++; continue; }
  const t = await r.text();
  const m = t.match(/<title>([^<]*)<\/title>/);
  const title = m ? m[1].replace(/_牛客题霸_牛客网|_牛客网/g, '').trim() : '';
  // 牛客的列表页标题与详情页标题偶有出入（如 HJ101），所以只要求详情页标题是我们写的题名的子串
  const norm = (s) => s.replace(/[\s（）()【】]/g, '');
  if (title && !norm(x.title).includes(norm(title))) {
    console.log(`✗ ${x.set}/${x.key} 题名 数据="${x.title}" 站点="${title}"`); bad++;
  }
  await new Promise((r) => setTimeout(r, 140));
}
console.log(bad ? `\n===== ${bad} 处不一致 =====` : '\n===== 全部一致 =====');
process.exit(bad ? 1 : 0);
