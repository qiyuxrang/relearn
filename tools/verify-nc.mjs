/* 核实牛客题目：node tools/verify-nc.mjs hash1 hash2 ...  → hash / HTTP / 题名 */
const hs = process.argv.slice(2);
for (const h of hs) {
  try {
    const r = await fetch(`https://www.nowcoder.com/practice/${h}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0' },
      redirect: 'follow',
    });
    const t = await r.text();
    const m = t.match(/<title>([^<]*)<\/title>/);
    const title = m ? m[1].replace(/_牛客题霸_牛客网|_牛客网/g, '').trim() : '(无标题)';
    console.log(`${h}\t${r.status}\t${title}`);
  } catch (e) {
    console.log(`${h}\tERR\t${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
