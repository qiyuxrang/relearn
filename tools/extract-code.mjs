/* 抽出题库里全部代码块，落盘供编译验证：node tools/extract-code.mjs <outdir> */
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || '/c/tmp/bank-code');
mkdirSync(out, { recursive: true });
const { BANKS } = await import(pathToFileURL(resolve(root, 'assets/js/core/banks.js')).href);

let n = 0;
const EXT = { cpp: 'cpp', python: 'py', text: 'txt' };
function dump(code, lang, setId, suffix = '') {
  const f = `${String(++n).padStart(2, '0')}_${setId}${suffix}.${EXT[lang] || 'txt'}`;
  writeFileSync(resolve(out, f), code, 'utf8');
}
function walk(bs, setId) {
  (bs || []).forEach((b) => {
    if (!b) return;
    if (b.t === 'code') {
      dump(b.x, b.lang || 'python', setId);
    }
    if (b.t === 'steps') (b.x || []).forEach((s) => {
      if (s && s.code) {
        dump(s.code, s.lang || 'python', setId);
      }
    });
    if (b.t === 'fold' && Array.isArray(b.x)) walk(b.x, setId);
  });
}
for (const bank of BANKS) {
  const { sets } = await import(pathToFileURL(resolve(root, `assets/js/content/banks/${bank.id}.js`)).href);
  for (const s of bank.sets) if (sets[s.id]) walk(sets[s.id].blocks, s.id.replace(/-/g, '_'));
}
console.log(`导出 ${n} 个代码块 → ${out}`);
