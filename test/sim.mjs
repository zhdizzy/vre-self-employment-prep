// VR&E Self-Employment Prep — node harness. Run from tbv-tools/vre-self-employment-prep:  node test/sim.mjs
// Grid: every mode × ratings × item sets × plan/SBA/market states × empty and filled private fields.
// Asserts: no undefined/NaN in any output; prohibited and unlisted items never count as fundable; the
// signer flips at the manual's $50,000 and the regulation's $25,000; eight feasibility elements; seven
// statement sections; section 5 never asks for a prohibited item; the retro request appears only in the
// under-12-months existing-business case; the docx is a real ZIP; no private field is in the URL field set.
import { solve, buckets } from '../engine.js';
import { buildLetter, buildCostSheet, countBrackets, letterToText, letterToHtml } from '../letter.js';
import { buildDocxBytes } from '../docx.js';
import { signer, RULES, MANUAL_ED_THRESHOLD, REG_ED_THRESHOLD, QUESTIONS } from '../data/rules.js';
import { ITEMS } from '../data/items.js';
import { OBJECTIONS } from '../data/objections.js';
import { PROCESS } from '../data/process.js';
import { FIT_FACTORS } from '../data/fit.js';
import { LIMITS } from '../data/limits.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('FAIL', msg); } };
const esc = s => String(s ?? '');

const MODES = ['idea', 'inprogram', 'pushback', 'own'];
const RATINGS = [{ raw: 'unrated', unrated: true, pending: false, rating: null }, { raw: 'pending', unrated: false, pending: true, rating: null }, { raw: '0', rating: 0 }, { raw: '10', rating: 10 }, { raw: '20', rating: 20 }, { raw: '70', rating: 70 }, { raw: '100', rating: 100 }];
const ITEM_SETS = [
  {},
  { equipment: 12000, inventory: 4000 },
  { equipment: 0, licenses: 450 },
  { equipment: 30000, inventory: 15000, licenses: 500, training: 4000 },          // 49,500 → VR&E Officer (manual)
  { equipment: 30000, inventory: 15000, licenses: 500, training: 4500 },          // 50,000 → Executive Director
  { equipment: 24999 }, { equipment: 25000 },
  { equipment: 12000, vehicle: 38000, lease: 9000 },
  { marketing: 3000, insurance: 1200, capital: 20000 },
  { equipment: 8000, livestock: 6000, land: 90000, mgmt: 600 },
];
const PRIV_EMPTY = { jobs: [{}, {}, {}, {}] };
const PRIV_FULL = { counselor: 'Ms. Ortega', branch: 'United States Army', serviceYears: '2009 to 2017', conditions: 'PTSD and lumbar strain', ratingWording: 'Difficulty in adapting to stressful circumstances\nChronic sleep impairment', bizName: 'Ridgeline Mobile Welding', bizDesc: 'repairs trailers and farm equipment on site', customers: 'ranchers and small haulers within 40 miles', sbaContact: 'the Denver VBOC, October 2026', trainingPlan: 'a 6-week AWS certification at the community college, $1,800', siteDesc: 'a home shop', jobs: [{ title: 'Warehouse supervisor', worked: false, reason: 'standing' }, { title: 'Fab shop, nights', worked: false, reason: 'sleep' }, { title: 'Small repair shop, day shift', worked: true, reason: 'structure' }, {}] };

function mk(o) {
  return { mode: 'idea', ratingRaw: '70', rating: 70, unrated: false, pending: false, stage: 'not-applied', bizType: 'trade', items: {}, plan: 'none', objection: 'nofund', operating: '', currentPlan: '', sba: 'none', financing: 'none', market: 'none', location: 'home', training: 'unsure', credit: 'no', experience: '', substance: 'no', dischargeYear: null, firstRatingYear: null, deps: 0, giUsed: null, limits: [], seFits: [], evidence: [], priv: PRIV_EMPTY, ...o };
}

const BAD = /undefined|NaN|\[object Object\]|null(?![a-z])/;
let combos = 0;
for (const mode of MODES) for (const R of RATINGS) for (const items of ITEM_SETS) for (const plan of ['none', 'draft']) for (const sba of ['none', 'met']) for (const priv of [PRIV_EMPTY, PRIV_FULL]) for (const limits of [[], ['stress', 'standing', 'sleep']]) {
  combos++;
  const operating = mode === 'own' ? (combos % 2 ? 'under12' : 'over12') : '';
  const s = mk({ mode, ratingRaw: R.raw, rating: R.rating ?? null, unrated: !!R.unrated, pending: !!R.pending, items, plan, sba, priv, limits, seFits: limits.length ? ['schedule', 'environment'] : [], operating, market: plan === 'draft' ? 'written' : 'none', training: priv === PRIV_FULL ? 'short' : 'unsure' });
  let r;
  try { r = solve(s); } catch (e) { ok(false, `solve threw for ${JSON.stringify({ mode, rating: R.raw, items })}: ${e.message}\n${e.stack}`); continue; }
  const text = letterToText(r.letter), html = letterToHtml(r.letter, esc);
  const tag = `mode=${mode} rating=${R.raw} items=${JSON.stringify(items)} plan=${plan} sba=${sba} priv=${priv === PRIV_FULL ? 'full' : 'empty'}`;
  ok(!BAD.test(text), `letter text has a bad token: ${tag}\n  ${text.match(new RegExp('.{0,60}' + BAD.source + '.{0,60}'))?.[0]}`);
  ok(!BAD.test(html), `letter html has a bad token: ${tag}`);
  ok(!BAD.test(JSON.stringify(r.feas.map(x => [x.title, x.why, x.act]))), `feasibility has a bad token: ${tag}`);
  ok(!BAD.test(JSON.stringify(r.fit.map(x => [x.text, x.answer]))), `fit has a bad token: ${tag}`);
  ok(!BAD.test(JSON.stringify([r.elig.why, r.elig.act])), `eligibility has a bad token: ${tag}`);
  // Buckets
  const b = r.buckets;
  const expFund = Object.entries(items).filter(([id]) => ITEMS.find(i => i.id === id).bucket === 'fundable').reduce((a, [, v]) => a + v, 0);
  ok(b.totals.fundable === expFund, `fundable total ${b.totals.fundable} != ${expFund}: ${tag}`);
  ok(b.prohibited.every(x => x.item.bucket === 'prohibited') && b.unlisted.every(x => x.item.bucket === 'unlisted'), `bucket membership: ${tag}`);
  // Signer
  ok(r.sign.manual.short === (expFund >= MANUAL_ED_THRESHOLD ? 'Executive Director' : 'VR&E Officer'), `manual signer at ${expFund}: ${r.sign.manual.short}`);
  ok(r.sign.reg === (expFund >= REG_ED_THRESHOLD ? 'Executive Director, VR&E Service' : 'VR&E Officer'), `regulation signer at ${expFund}: ${r.sign.reg}`);
  // Feasibility
  ok(r.feas.length === 8, 'eight feasibility elements');
  ok(r.feasCount >= 0 && r.feasCount <= 8, 'feasibility count in range');
  ok(r.fit.length === 6, 'six fit factors');
  const costEl = r.feas.find(x => x.id === 'cost');
  if (!Object.keys(items).length) ok(costEl.st === 'miss', `no items => cost element missing (${costEl.st})`);
  if (items.vehicle || items.lease || items.land || items.livestock) ok(costEl.st !== 'doc', `prohibited item in list => cost element not documented: ${tag}`);
  if (Object.keys(items).length && Object.values(items).some(v => v === 0) && ITEMS.find(i => i.id in items && items[i.id] === 0 && i.bucket === 'fundable')) ok(costEl.st === 'thin', `missing amount => cost thin: ${tag}`);
  if ('equipment' in items && 'inventory' in items && items.equipment > 0 && !items.vehicle && !items.lease && !items.land && !items.livestock) ok(costEl.st === 'doc', `clean fundable list => cost documented: ${tag}`);
  // Letter
  ok(r.letter.sections.length === 7, 'seven sections');
  ok(/SELF-EMPLOYMENT GOAL STATEMENT/.test(text), 'header present');
  const sec5 = letterToText({ ...r.letter, sections: [r.letter.sections[4]], header: [], closing: [] }, { includeHowTo: false });
  const askPart = sec5.split('I am funding the following myself')[0];
  for (const pro of ['a vehicle', 'lease or rent', 'land or a building', 'livestock']) ok(!new RegExp(`^- ${pro.charAt(0).toUpperCase() + pro.slice(1)}:`, 'm').test(askPart), `section 5 asks for a prohibited item (${pro}): ${tag}`);
  if (items.vehicle) ok(/funding the following myself/.test(sec5) && /a vehicle/.test(sec5), `vehicle moves to the self-funded line: ${tag}`);
  const retro = /retroactive induction/i.test(text);
  ok(retro === (mode === 'own' && operating === 'under12'), `retro request present=${retro} for mode=${mode} operating=${operating}`);
  ok(!/\n- \s*\n/.test(text) && !/<li><\/li>/.test(html), `empty list item: ${tag}`);
  if (priv === PRIV_EMPTY) ok(countBrackets(r.letter) >= 12, `too few brackets on an empty case (${countBrackets(r.letter)})`);
  if (priv === PRIV_FULL && limits.length && plan === 'draft' && sba === 'met' && expFund > 0 && !b.missingAmounts.length) ok(countBrackets(r.letter) <= (R.rating == null ? 13 : 12), `too many brackets on a filled case (${countBrackets(r.letter)}): ${tag}`);
  // Eligibility
  if (R.unrated) ok(r.elig.st === 'miss', 'unrated => eligibility missing');
  if (R.rating === 20 || R.rating === 70 || R.rating === 100) ok(r.elig.st === 'doc', `rated ${R.rating} => eligibility documented`);
  if (R.rating === 10) ok(r.elig.st === 'thin', '10% => thin (SEH)');
  // Startup-only
  ok(r.startupOnly === (mode === 'own' && operating === 'over12'), 'startupOnly flag');
}

// Itemized cost sheet
{
  for (const items of ITEM_SETS) for (const priv of [PRIV_EMPTY, PRIV_FULL]) {
    const sh = buildCostSheet(mk({ items, priv }));
    const txt = letterToText(sh), html = letterToHtml(sh, esc);
    ok(!BAD.test(txt) && !BAD.test(html), `cost sheet bad token: ${JSON.stringify(items)}`);
    ok(/ITEMIZED STARTUP COST SHEET/.test(txt) && sh.sections.length === 3, 'cost sheet shape');
    const expAsk = Object.entries(items).filter(([id]) => ITEMS.find(i => i.id === id).bucket === 'fundable').reduce((a, [, v]) => a + v, 0);
    ok(sh.askTotal === expAsk, `cost sheet ask total ${sh.askTotal} != ${expAsk}`);
    const sec1 = letterToText({ ...sh, sections: [sh.sections[0]], header: [], closing: [] }, { includeHowTo: false });
    ok(!/A vehicle|Lease or rent|Land or a building|Livestock/.test(sec1), `prohibited item in the VR&E ask section: ${JSON.stringify(items)}`);
    if (items.vehicle) ok(/A vehicle/.test(letterToText({ ...sh, sections: [sh.sections[1]], header: [], closing: [] }, { includeHowTo: false })), 'vehicle in the self-funded section');
  }
  const bytes = buildDocxBytes(buildCostSheet(mk({ items: { equipment: 12000, vehicle: 30000 } })));
  ok(bytes[0] === 0x50 && bytes[1] === 0x4B && new TextDecoder().decode(bytes).includes('ITEMIZED STARTUP COST SHEET'), 'cost sheet docx is a real ZIP carrying the sheet');
  ok(QUESTIONS.length === 7 && QUESTIONS.every(q => q.q && q.why && q.cite), 'seven questions, each with why and cite');
}

// Signer boundaries
{
  ok(signer(49999).manual.short === 'VR&E Officer' && signer(50000).manual.short === 'Executive Director', 'manual boundary at $50,000');
  ok(signer(24999).reg === 'VR&E Officer' && signer(25000).reg === 'Executive Director, VR&E Service', 'regulation boundary at $25,000');
  ok(signer(25001).officerReview === true && signer(25000).officerReview === false, '21.430(c) review above $25,000');
  ok(signer(30000).conflict === true && signer(10000).conflict === false && signer(60000).conflict === false, 'conflict flag only between $25,000 and $49,999');
}

// Pre-2013 window logic
{
  const now = new Date().getFullYear();
  ok(solve(mk({ dischargeYear: 2005, firstRatingYear: 2006 })).elig.st === 'miss', 'pre-2013, window passed => missing');
  ok(solve(mk({ dischargeYear: 2012, firstRatingYear: now - 3 })).elig.st === 'doc', 'pre-2013 but recent first rating => documented');
  ok(solve(mk({ dischargeYear: 2010, firstRatingYear: null })).elig.st === 'thin', 'pre-2013, no first rating year => thin');
  ok(solve(mk({ dischargeYear: 2013 })).elig.st === 'doc', '2013 discharge => no window');
}

// Training element
{
  const t = o => solve(mk(o)).feas.find(x => x.id === 'training').st;
  ok(t({ training: 'degree' }) === 'miss', 'degree => training element missing (short-term only)');
  ok(t({ training: 'none' }) === 'doc', 'already qualified => documented');
  ok(t({ training: 'short' }) === 'thin' && t({ training: 'short', priv: PRIV_FULL }) === 'doc', 'short course: thin until named');
  const txt = letterToText(buildLetter(mk({ training: 'degree' })));
  ok(/limited to short-term skills training/.test(txt), 'degree case: letter states the short-term rule');
}

// Severe language only with a strong record
{
  const strong = letterToText(buildLetter(mk({ limits: ['stress', 'standing', 'sleep'], seFits: ['schedule', 'environment'], priv: PRIV_FULL })));
  ok(/only reasonably feasible vocational goal/.test(strong), 'three limits + two fits => 21.257(b) language');
  const mild = letterToText(buildLetter(mk({ limits: ['stress'], seFits: ['schedule'], priv: PRIV_FULL })));
  ok(!/only reasonably feasible vocational goal/.test(mild) && /suitable vocational goal for me under 38 CFR 21.257\(a\)/.test(mild), 'one limit => suitable-goal language only');
}

// Word download: a real .docx
{
  const bytes = buildDocxBytes(buildLetter(mk({ priv: PRIV_FULL, items: { equipment: 12000 } })));
  const txt = new TextDecoder().decode(bytes);
  ok(bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04, 'docx starts with the ZIP local-file signature');
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']) ok(txt.includes(part), `docx contains ${part}`);
  ok(txt.includes('<w:highlight w:val="yellow"/>'), 'brackets are highlighted in the docx');
  ok(txt.includes('SELF-EMPLOYMENT GOAL STATEMENT'), 'docx carries the statement text');
  ok(txt.includes('Self-Employment Goal Statement (draft)'), 'docx core title updated');
  ok(!txt.includes('Vocational Goal and Rehabilitation Plan Statement'), 'no Approval Prep title left in the docx');
}

// Share-URL discipline: private keys never appear in the URL field list (mirrors script.js URL_FIELDS + extras)
{
  const URL_KEYS = ['m', 'r', 'st', 'bt', 'pl', 'ob', 'op', 'cp', 'sb', 'fn', 'mk', 'lo', 'tr', 'cr', 'xp', 'sub', 'dy', 'fr', 'dep', 'gu', 'it', 'ev'];
  const PRIVATE = ['bizName', 'bizDesc', 'customers', 'counselor', 'ratingWording', 'jobs', 'sbaContact', 'trainingPlan', 'siteDesc', 'limits', 'seFits', 'lim', 'sf', 'bn', 'bd'];
  for (const k of PRIVATE) ok(!URL_KEYS.includes(k), `private key ${k} in URL field list`);
}

// Data integrity
{
  for (const it of ITEMS) ok(['fundable', 'unlisted', 'prohibited'].includes(it.bucket) && RULES[it.ruleId], `item ${it.id} bucket/rule`);
  for (const o of OBJECTIONS) for (const id of o.ruleIds) ok(RULES[id], `objection ${o.id} cites unknown rule ${id}`);
  ok(PROCESS.length === 12 && PROCESS.every((p, i) => p.n === i + 1), 'twelve process steps, numbered');
  ok(FIT_FACTORS.length === 6, 'six fit factors in data');
  for (const [id, r] of Object.entries(RULES)) ok(r.cite && r.url && r.verified && r.title && r.plain, `rule ${id} complete`);
  ok(LIMITS.length === 11, 'limits list intact');
  ok(ITEMS.filter(i => i.bucket === 'prohibited').length === 4, 'four prohibited items (21.214(f))');
}

console.log(`${combos} combinations, ${checks} checks, ${fails} failures`);
process.exitCode = fails ? 1 : 0;
