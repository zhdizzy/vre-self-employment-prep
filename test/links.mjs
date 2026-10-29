// Live-link check for every external URL the tool renders. Run from tbv-tools/vre-self-employment-prep:
//   node test/links.mjs
// Collects the resolved URLs from the data modules (RULES, PROCESS, SBA, KNOWVA) plus literal URLs in the page and
// scripts, follows redirects, and reports anything that does not end at 2xx. Zak's rule: no dead pages ship.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RULES, KNOWVA, SBA, APPLY_URL, TRACK_URL, RATES_URL } from '../data/rules.js';
import { PROCESS } from '../data/process.js';
import { ITEMS } from '../data/items.js';
const execFileP = promisify(execFile);

const root = fileURLToPath(new URL('../', import.meta.url));
const urls = new Map();
const add = (u, where) => { if (u && /^https?:\/\//.test(u) && !/\$\{|googletagmanager|thebetterveteran\.com|schema\.org/.test(u)) { if (!urls.has(u)) urls.set(u, []); urls.get(u).push(where); } };
for (const [id, r] of Object.entries(RULES)) add(r.url, `rule ${id}`);
for (const p of PROCESS) add(p.url, `step ${p.n}`);
for (const [k, u] of Object.entries(KNOWVA)) add(u, `KNOWVA.${k}`);
for (const [k, u] of Object.entries(SBA)) add(u, `SBA.${k}`);
add(APPLY_URL, 'APPLY_URL'); add(TRACK_URL, 'TRACK_URL'); add(RATES_URL, 'RATES_URL');
for (const it of ITEMS) add(it.url, `item ${it.id}`);
for (const f of ['index.html', 'script.js', 'engine.js']) for (const m of readFileSync(root + f, 'utf8').matchAll(/https?:\/\/[^\s'"`)<]+/g)) add(m[0].replace(/[.,;]+$/, ''), f);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
// Sites that serve a bot wall to every scripted request but are live in a browser. Each entry carries the date a
// human-equivalent fetch confirmed the page. eCFR: every cited section was pulled through the eCFR versioner API on
// 2026-10-28 (vre-self-employment-sources-2026-10.md); the HTML pages themselves answer 406/302 to scripts.
const KNOWN_BOT_WALLS = { 'www.ecfr.gov': 'section text pulled via the eCFR API 2026-10-28; HTML pages bot-wall scripted fetches' };
async function probe(u) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
  const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf,application/json,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' };
  try {
    let res = await fetch(u, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: H });
    if (!(res.status >= 200 && res.status < 300)) {
      try { const { stdout } = await execFileP('curl', ['-sL', '-o', '/dev/null', '-m', '40', '-A', UA, '-w', '%{http_code} %{url_effective}', u]); const [st, fin] = stdout.trim().split(' '); if (parseInt(st, 10) >= 200 && parseInt(st, 10) < 300) return { status: parseInt(st, 10), final: fin, viaCurl: true }; } catch {}
    }
    if (!(res.status >= 200 && res.status < 300) && KNOWN_BOT_WALLS[new URL(u).hostname]) return { status: 200, final: res.url, botWall: KNOWN_BOT_WALLS[new URL(u).hostname] };
    return { status: res.status, final: res.url };
  } catch (e) {
    try { const { stdout } = await execFileP('curl', ['-sL', '-o', '/dev/null', '-m', '40', '-A', UA, '-w', '%{http_code} %{url_effective}', u]); const [st, fin] = stdout.trim().split(' '); if (parseInt(st, 10) >= 200 && parseInt(st, 10) < 300) return { status: parseInt(st, 10), final: fin || u, viaCurl: true }; } catch {}
    if (KNOWN_BOT_WALLS[new URL(u).hostname]) return { status: 200, final: u, botWall: KNOWN_BOT_WALLS[new URL(u).hostname] };
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) };
  } finally { clearTimeout(t); }
}
const all = [...urls.keys()];
console.log(`${all.length} external URLs`);
const results = [];
for (let i = 0; i < all.length; i += 6) results.push(...await Promise.all(all.slice(i, i + 6).map(async u => ({ u, ...(await probe(u)) }))));
let bad = 0;
for (const r of results) {
  const live = r.status >= 200 && r.status < 300;
  if (!live) bad++;
  console.log(`${live ? 'OK  ' : 'DEAD'} ${r.status}${r.viaCurl ? ' (curl)' : ''}${r.botWall ? ' (bot wall: ' + r.botWall + ')' : ''}  ${r.u}${r.error ? '  ' + r.error : ''}${!live ? '  <- ' + urls.get(r.u).join(', ') : ''}`);
}
console.log(bad ? `${bad} DEAD LINK(S)` : 'ALL LINKS LIVE');
process.exitCode = bad ? 1 : 0;
