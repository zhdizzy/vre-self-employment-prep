/**
 * VR&E Self-Employment Prep headless smoke test (house pattern from vre-approval-prep/test/smoke.mjs).
 * Run from tbv-tools/:  node vre-self-employment-prep/test/smoke.mjs   (port 8918)
 * Serves tbv-tools/ so the cross-tool imports (/gi-bill-vre/data/vre-rates.js, /vre-approval-prep/data/rules.js) resolve like production.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import process from 'node:process';

const execFileP = promisify(execFile);
const PORT = 8918;
const BASE = `http://localhost:${PORT}/vre-self-employment-prep/`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Real keys from buildShareUrl. No private field is in here by design.
const SHARE = '?m=idea&r=70&st=not-applied&bt=trade&pl=draft&it=equipment:30000.inventory:15000.licenses:500.training:4000.vehicle:38000&sb=met&fn=savings&mk=written&lo=home&tr=short&cr=yes&xp=worked&dep=1&ev=rating.dd214.plan.sba&source=vre-self-employment-prep';

let failures = 0;
const check = (ok, label, extra = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`); };
async function chrome(url, extra = []) {
  const { stdout, stderr } = await execFileP(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--enable-logging=stderr', '--v=0', '--virtual-time-budget=9000', '--dump-dom', ...extra, url], { maxBuffer: 30 * 1024 * 1024 }).catch(e => e);
  const errors = (stderr || '').split('\n').filter(l => /Uncaught|ReferenceError|TypeError|SyntaxError|Failed to load module/.test(l));
  return { dom: stdout || '', errors };
}

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));
process.on('exit', () => server.close());

try {
  const first = await chrome(BASE);
  check(first.errors.length === 0, 'first visit: no console errors', first.errors.slice(0, 3).join(' | '));
  check(/id="tour-root"(?![^>]*hidden)/.test(first.dom), 'tour auto-starts on first visit');
  check(/Step 1 of 7/.test(first.dom), 'tour step label renders');
  check(/__vsepArrivalHadParams/.test(first.dom), 'arrival-params snippet present');
  check(/"FAQPage"/.test(first.dom) && /"WebApplication"/.test(first.dom), 'JSON-LD present');
  check(/G-HG7N8F337G/.test(first.dom), 'GA4 present');
  check(/<h1>VR&amp;E Self-Employment Prep<\/h1>/.test(first.dom), 'static h1');
  check(/id="about-this-tool"/.test(first.dom) && /id="how-it-works"/.test(first.dom), 'GEO sections present');
  check(/data-item="equipment"/.test(first.dom) && /data-item="vehicle"/.test(first.dom), 'item checklist rendered');
  check(/data-limit="standing"/.test(first.dom) && /data-sefit="schedule"/.test(first.dom), 'limits and self-employment fits rendered');
  check(/id="results-container"[^>]*style="display:none;"/.test(first.dom), 'results gated on first visit');
  check(/Required to run/.test(first.dom), 'live strip shows the gate message');
  check(/More Free Veteran Tools/.test(first.dom), 'footer present');

  const share = await chrome(BASE + SHARE);
  check(share.errors.length === 0, 'share link: no console errors', share.errors.slice(0, 3).join(' | '));
  check(/id="tour-root"[^>]*hidden/.test(share.dom), 'tour does NOT auto-run for share arrivals');
  check(/id="results-container"[^>]*style="display:\s*block;"/.test(share.dom), 'share link reveals results');
  check(/id="hero-capture"[^>]*style="display:\s*block;"/.test(share.dom), 'hero capture shown at result moment');
  check(/\$49,500/.test(share.dom), 'fundable total $49,500 shown (vehicle excluded)');
  check(/\$38,000/.test(share.dom) && /prohibited/i.test(share.dom), 'vehicle shown as prohibited');
  check(/VR&amp;E Officer at your regional office/.test(share.dom), 'signer is the VR&E Officer at $49,500 (manual)');
  check(/\$25,000/.test(share.dom) && /21\.258/.test(share.dom), 'regulation threshold shown beside the manual’s');
  check(/id="letter-sheet"/.test(share.dom) && /SELF-EMPLOYMENT GOAL STATEMENT/.test(share.dom), 'statement renders');
  check(/class="lb"/.test(share.dom), 'brackets highlighted in the statement');
  check(/funding the following myself/.test(share.dom), 'statement moves the vehicle to the self-funded line');
  check(/id="letter-download"/.test(share.dom), 'Word download button present');
  check(/data-ev="rating" checked/.test(share.dom), 'evidence ticks restored from the link');
  check(/startups only/i.test(share.dom), 'startup-only rule on the page');
  check(/employment adjustment allowance/i.test(share.dom), 'EAA on the money card');
  check(/id="cost-sheet"/.test(share.dom) && /ITEMIZED STARTUP COST SHEET/.test(share.dom) && /id="sheet-download"/.test(share.dom), 'itemized cost sheet renders with its Word button');
  check(/Seven questions to ask at the meeting/.test(share.dom) && /Appendix FM/.test(share.dom), 'questions card renders');
  check(/data-amt="equipment"[^>]*value="30000"/.test(share.dom), 'item amounts restored from the link');

  const ed = await chrome(BASE + SHARE.replace('training:4000', 'training:4500'));
  check(/Executive Director, VR&amp;E Service/.test(ed.dom), 'signer flips to the Executive Director at $50,000');
  check(/one-line/.test(ed.dom), 'one-on-one line appears at $50,000 and up');

  const blank = await chrome(BASE + '?m=idea&r=70&st=not-applied&it=equipment:0.inventory:4000&source=vre-self-employment-prep');
  check(blank.errors.length === 0, 'blank amount: no console errors', blank.errors.slice(0, 3).join(' | '));
  check(/id="results-container"[^>]*style="display:none;"/.test(blank.dom), 'a checked item with no amount keeps the results gated');
  check(/Put a rough amount beside each item you checked/.test(blank.dom), 'blank amount shows the form error');
  check(/class="item-row[^"]*field-missing[^"]*"[^>]*data-row="equipment"/.test(blank.dom), 'the unpriced row is flagged');
  const noItems = await chrome(BASE + '?m=idea&r=70&st=not-applied&source=vre-self-employment-prep');
  check(/id="results-container"[^>]*style="display:none;"/.test(noItems.dom) && /Check at least one thing you need money for/.test(noItems.dom), 'idea mode with no items keeps the results gated');
  const ownNoItems = await chrome(BASE + '?m=own&r=60&st=not-applied&op=under12&source=vre-self-employment-prep');
  check(/id="results-container"[^>]*style="display:\s*block;"/.test(ownNoItems.dom), 'own mode reveals without items');

  const tracking = await chrome(BASE + '?fbclid=abc123&utm_source=fb');
  check(/id="tour-root"(?![^>]*hidden)/.test(tracking.dom), 'tracking params alone still auto-run the tour');
  check(/id="results-container"[^>]*style="display:none;"/.test(tracking.dom), 'tracking params do not skip the gate');

  const own = await chrome(BASE + '?m=own&r=60&st=not-applied&op=over12&source=vre-self-employment-prep');
  check(own.errors.length === 0, 'own/over12: no console errors', own.errors.slice(0, 3).join(' | '));
  check(/This track funds startups only/.test(own.dom), 'existing business over 12 months: startup-only hero');
  check(/veteran-business/.test(own.dom), 'redirects to Veteran Founder Stack');
  check(/<details class="stack-card" open=""[^>]*id="card-own"|id="card-own"[^>]*open/.test(own.dom), 'own mode leads with the startup-only card');

  const under = await chrome(BASE + '?m=own&r=60&st=not-applied&op=under12&source=vre-self-employment-prep');
  check(/retroactive induction/i.test(under.dom), 'under 12 months: retro path shown');

  const push = await chrome(BASE + '?m=pushback&r=70&st=in-program&ob=item&it=equipment:9000.vehicle:30000&source=vre-self-employment-prep');
  check(push.errors.length === 0, 'pushback/item: no console errors', push.errors.slice(0, 3).join(' | '));
  check(/<details class="stack-card" open=""[^>]*id="card-objections"|id="card-objections"[^>]*open/.test(push.dom), 'pushback mode leads with the objections card');
  check(/21\.214\(f\)/.test(push.dom) && /The counselor is right|counselor is right/i.test(push.dom), 'item objection concedes the prohibited items');

  const degree = await chrome(BASE + '?m=inprogram&r=50&st=plan-signed&cp=school&tr=degree&it=equipment:5000&source=vre-self-employment-prep');
  check(/short-term skills training/.test(degree.dom), 'degree answer surfaces the short-term-only rule');
  check(/<details class="stack-card" open=""[^>]*id="card-process"|id="card-process"[^>]*open/.test(degree.dom), 'in-program mode leads with the process card');

  const unrated = await chrome(BASE + '?m=idea&r=unrated&st=not-applied&source=vre-self-employment-prep');
  check(unrated.errors.length === 0, 'unrated: no console errors', unrated.errors.slice(0, 3).join(' | '));
  check(/Start with the rating/.test(unrated.dom), 'unrated hero routes to the claim first');
} finally {
  server.close();
}
console.log(failures === 0 ? 'ALL SMOKE CHECKS PASSED' : `${failures} smoke check(s) failed`);
process.exitCode = failures === 0 ? 0 : 1;
