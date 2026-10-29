// VR&E Self-Employment Prep — UI wiring on the house template (forked from vre-approval-prep 10/28/26).
import { DATA_STAMP, RULES, signer, MANUAL_ED_THRESHOLD, REG_ED_THRESHOLD, OFFICER_REVIEW_THRESHOLD, CANT_DO, ONE_ON_ONE, SBA, TRACK_URL, APPLY_URL, QUESTIONS } from './data/rules.js';
import { ITEMS, ITEM_BY_ID, BUCKET_LABEL, BUCKET_PLAIN, BIZ_BY_ID } from './data/items.js';
import { FIT_FACTORS, SE_FITS } from './data/fit.js';
import { PROCESS } from './data/process.js';
import { OBJECTIONS, OBJECTION_BY_ID } from './data/objections.js';
import { LIMITS, FITS } from './data/limits.js';
import { CHECKLIST } from './data/checklist.js';
import { buildLetter, buildCostSheet, countBrackets, letterToText, letterToHtml } from './letter.js';
import { solve, EAA_MONTHS } from './engine.js';
import { buildDocxBytes, DOCX_MIME } from './docx.js';
import { getVreRate } from '/gi-bill-vre/data/vre-rates.js';
// The denial path is the same as every VR&E decision; reuse the Approval Prep card's verified text rather than copy it.
import { RULES as VAP_RULES, ESCALATION, REAPPLY_WARNING, WH_HOTLINE, REGION_NOTE } from '/vre-approval-prep/data/rules.js';

const $ = id => document.getElementById(id);
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SOURCE = 'vre-self-employment-prep';
const DRAFT_KEY = 'vsep-letter-draft';
const VRE_NO_LIMIT_DISCHARGE_YEAR = 2013;

const emptyPriv = () => ({ counselor: '', branch: '', serviceYears: '', conditions: '', ratingWording: '', bizName: '', bizDesc: '', customers: '', sbaContact: '', trainingPlan: '', siteDesc: '', jobs: [{}, {}, {}, {}] });
const state = { mode: 'idea', revealed: false, last: null, items: new Map(), limits: new Set(), seFits: new Set(), evidence: new Set(), priv: emptyPriv(), sample: false };
$('data-stamp').textContent = DATA_STAMP;

/* ─── Elements ─────────────────────────────────────────────────────────── */
const ratingEl = $('rating'), stageEl = $('stage'), bizEl = $('biz-type'), planEl = $('plan');
const objectionEl = $('objection'), operatingEl = $('operating'), currentEl = $('current-plan');
const sbaEl = $('sba'), finEl = $('financing'), creditEl = $('credit'), marketEl = $('market'), locEl = $('location'), trainingEl = $('training'), expEl = $('experience'), subEl = $('substance');
const dischargeEl = $('discharge-year'), firstRatingEl = $('first-rating-year'), depsEl = $('deps'), giUsedEl = $('gi-used');

$('items').innerHTML = ITEMS.map(it => `<div class="item-row ${it.bucket === 'prohibited' ? 'pro' : it.bucket === 'unlisted' ? 'unl' : ''}" data-row="${it.id}"><input type="checkbox" id="it-${it.id}" data-item="${it.id}"><label class="it-label" for="it-${it.id}">${esc(it.label)}<small>${esc(it.hint)}</small></label><span class="bk bk-${it.bucket}">${esc(BUCKET_LABEL[it.bucket])}</span><div class="with-prefix"><input type="number" data-amt="${it.id}" min="0" step="100" placeholder="amount" inputmode="numeric" aria-label="Amount for ${esc(it.short)}"></div></div>`).join('');
$('limits').innerHTML = LIMITS.map(l => `<label><input type="checkbox" data-limit="${l.id}"> ${esc(l.label)}</label>`).join('');
$('sefits').innerHTML = SE_FITS.map(f => `<label><input type="checkbox" data-sefit="${f.id}"> ${esc(f.label)}</label>`).join('');
document.querySelectorAll('[data-item]').forEach(cb => cb.addEventListener('change', () => {
  const id = cb.dataset.item, row = cb.closest('.item-row');
  if (cb.checked) { state.items.set(id, Number(row.querySelector('[data-amt]').value) || 0); row.classList.add('checked'); }
  else { state.items.delete(id); row.classList.remove('checked'); }
  onFormChange();
}));
document.querySelectorAll('[data-amt]').forEach(inp => inp.addEventListener('input', () => {
  const id = inp.dataset.amt, cb = document.querySelector(`[data-item="${id}"]`);
  if (inp.value !== '' && !cb.checked) { cb.checked = true; inp.closest('.item-row').classList.add('checked'); }
  if (cb.checked) state.items.set(id, Number(inp.value) || 0);
  if (Number(inp.value) > 0) { inp.closest('.item-row').classList.remove('field-missing'); $('items').classList.remove('field-missing'); if (![...state.items.values()].some(a => !(a > 0))) $('form-error').textContent = ''; }
  onFormChange();
}));
// The whole card toggles the item. Clicks on the checkbox and its label already toggle it natively; clicks in
// the amount box are left alone. Checking by card click drops the cursor into the amount box.
document.querySelectorAll('.item-row').forEach(row => row.addEventListener('click', e => {
  if (e.target.closest('input, label')) return;
  const cb = row.querySelector('[data-item]');
  cb.checked = !cb.checked;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
  if (cb.checked) setTimeout(() => row.querySelector('[data-amt]')?.focus({ preventScroll: true }), 0);
}));
document.querySelectorAll('[data-limit]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? state.limits.add(cb.dataset.limit) : state.limits.delete(cb.dataset.limit); onPrivateChange(); }));
document.querySelectorAll('[data-sefit]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? state.seFits.add(cb.dataset.sefit) : state.seFits.delete(cb.dataset.sefit); onPrivateChange(); }));

/* ─── Mode pills (reshape the tool) ────────────────────────────────────── */
const MODE_BRIEF = {
  idea: 'VR&E can buy the equipment, the opening inventory, the licenses, and a short course. It cannot buy the truck, the lease, or the building, and it funds startups only. Check your list and we’ll tag every item the way the regulation does, show who has to sign at your cost, and score the feasibility work the plan will need.',
  inprogram: 'Self-employment is a vocational goal your counselor can approve, with its own two-phase plan in the manual. We’ll map the process from the exploration meeting to the signed plan, with the form at each step, and draft the statement that asks for it.',
  pushback: 'Counselors say the same few things: we don’t fund businesses, go to school instead, it isn’t feasible, we don’t pay for that. Some have a rule that answers them. Some are right, and we say so. Pick what yours said.',
  own: 'The manual is blunt: the track supports startups only, and an existing business is out of scope. We’ll tell you fast whether the one narrow retroactive path applies, and point you at what is open to a running business instead.',
};
const BTN_TEXT = { idea: 'Build My Self-Employment Packet →', inprogram: 'Map My Path to the Track →', pushback: 'Build My Response →', own: 'Show Me What Applies →' };
function setMode(m, opts = {}) {
  state.mode = m;
  document.querySelectorAll('.mode-pill').forEach(p => { p.classList.toggle('active', p.dataset.mode === m); p.setAttribute('aria-pressed', p.dataset.mode === m ? 'true' : 'false'); });
  $('mode-briefing').textContent = MODE_BRIEF[m];
  $('compare-btn').textContent = BTN_TEXT[m];
  $('field-objection').hidden = m !== 'pushback';
  $('field-operating').hidden = m !== 'own';
  $('field-current').hidden = m !== 'inprogram';
  if (m === 'pushback' && !stageEl.value) stageEl.value = 'in-program';
  if (m === 'inprogram' && !stageEl.value) stageEl.value = 'in-program';
  if (state.revealed) reveal({ silent: true });
  updateLiveStrip();
}
document.querySelectorAll('.mode-pill').forEach(p => p.addEventListener('click', () => {
  setMode(p.dataset.mode);
  if (isTourActive() && tourState.steps[tourState.i]?.id === 'pills') showTourStep(tourState.i + 1);
}));

/* ─── Conditional fields ───────────────────────────────────────────────── */
function ratingInfo() {
  const v = ratingEl.value;
  const unrated = v === 'unrated' || v === '';
  const pending = v === 'pending';
  const num = (!unrated && !pending) ? parseInt(v, 10) : null;
  return { raw: v, unrated, pending, num, rated: num !== null };
}
function syncConditionalFields() {
  const r = ratingInfo();
  const rl = $('rating-line');
  if (r.unrated && r.raw !== '') { rl.hidden = false; rl.innerHTML = '<strong>VR&amp;E starts with a rating.</strong> You need a service-connected rating of 10% or more to be evaluated. SDVOSB certification, by contrast, opens at any rating; <a href="/veteran-business/">Veteran Founder Stack</a> covers it.'; }
  else if (r.pending) { rl.hidden = false; rl.innerHTML = '<strong>Decision pending.</strong> Every piece of the feasibility work can be done now. Apply the day the rating posts.'; }
  else if (r.rated && r.num === 0) { rl.hidden = false; rl.innerHTML = '<strong>0% does not open VR&amp;E.</strong> The program needs 10% or more. It does open SDVOSB certification.'; }
  else if (r.rated && r.num === 10) { rl.hidden = false; rl.innerHTML = '<strong>At 10%</strong> entitlement requires a <em>serious</em> employment handicap finding. The statement has to make the severity case.'; }
  else if (r.rated && r.num >= 20) { rl.hidden = false; rl.innerHTML = `<strong>${r.num}% meets the basic threshold.</strong> The employment handicap finding opens the program; the counselor’s suitability finding opens this track. The statement is for both.`; }
  else rl.hidden = true;
  const dy = parseInt(dischargeEl.value, 10);
  const pre2013 = dy && dy < VRE_NO_LIMIT_DISCHARGE_YEAR;
  $('first-rating-year-label').hidden = !pre2013; firstRatingEl.hidden = !pre2013;
}
[ratingEl, dischargeEl].forEach(el => { el.addEventListener('change', syncConditionalFields); el.addEventListener('input', syncConditionalFields); });

/* ─── Inputs → model ───────────────────────────────────────────────────── */
function buildInput() {
  const r = ratingInfo();
  return {
    mode: state.mode, ratingRaw: r.raw, rating: r.num, unrated: r.unrated, pending: r.pending,
    stage: stageEl.value || null, bizType: bizEl.value || null, plan: planEl.value || 'none',
    items: Object.fromEntries(state.items),
    objection: objectionEl.value, operating: operatingEl.value, currentPlan: currentEl.value,
    sba: sbaEl.value, financing: finEl.value, credit: creditEl.value, market: marketEl.value, location: locEl.value, training: trainingEl.value, experience: expEl.value, substance: subEl.value,
    dischargeYear: parseInt(dischargeEl.value, 10) || null, firstRatingYear: parseInt(firstRatingEl.value, 10) || null,
    deps: parseInt(depsEl.value, 10) || 0, giUsed: giUsedEl.value === '' ? null : Math.max(0, parseInt(giUsedEl.value, 10) || 0),
    limits: [...state.limits], seFits: [...state.seFits], evidence: [...state.evidence],
    priv: state.priv,
  };
}
const run = () => solve(buildInput());

/* ─── Live strip ───────────────────────────────────────────────────────── */
let liveTimer = null;
function updateLiveStrip() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const el = $('live-strip');
    const s = buildInput();
    if (!s.ratingRaw || !s.stage) { el.innerHTML = '<strong>Required to run:</strong> your rating and where you are with VR&amp;E. Your list builds here as you check items.'; return; }
    const r = solve(s), b = r.buckets;
    const unpriced = [...state.items.values()].filter(a => !(a > 0)).length;
    const list = b.totals.all > 0 || state.items.size ? ` · on VR&E’s list: <span class="stake">${fmtUSD(b.totals.fundable)}</span>${b.totals.all > b.totals.fundable ? ` of ${fmtUSD(b.totals.all)}` : ''}${b.prohibited.length ? ` · <strong>${b.prohibited.length} prohibited</strong>` : ''}${unpriced ? ` · <strong>${unpriced} item${unpriced === 1 ? '' : 's'} need${unpriced === 1 ? 's' : ''} an amount</strong>` : ''}` : ' · <strong>check what you need money for</strong>';
    const who = b.totals.fundable > 0 ? ` · signer: <strong>${esc(r.sign.manual.short)}</strong>` : '';
    el.innerHTML = `<span class="ready">${r.feasCount} of ${r.feas.length}</span> feasibility elements in hand${list}${who}. Press the button for the packet and the statement.`;
  }, 150);
}
let rerenderTimer = null;
function onFormChange() {
  updateLiveStrip();
  if (!state.revealed) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => reveal({ silent: true }), 250);
}
document.querySelectorAll('#calc-form select, #calc-form input:not([data-amt]):not([data-item]):not([data-limit]):not([data-sefit])').forEach(el => { el.addEventListener('input', onFormChange); el.addEventListener('change', onFormChange); });

/* ─── Validation (novalidate + JS, house rule) ─────────────────────────── */
function clearMissing() { document.querySelectorAll('.field-missing, .field-error').forEach(el => el.classList.remove('field-missing', 'field-error')); }
function validate() {
  clearMissing();
  if (!ratingEl.value) { ratingEl.closest('.fg-field').classList.add('field-missing'); ratingEl.classList.add('field-error'); return { message: 'Required: your VA rating (the red field). “Haven’t filed yet” is a fine answer.', focusEl: ratingEl }; }
  if (!stageEl.value) { stageEl.closest('.fg-field').classList.add('field-missing'); stageEl.classList.add('field-error'); return { message: 'Required: where you are with VR&E. It decides which card leads.', focusEl: stageEl }; }
  if (state.mode === 'own' && !operatingEl.value) { operatingEl.closest('.fg-field').classList.add('field-missing'); operatingEl.classList.add('field-error'); return { message: 'For an existing business we need how long it has been operating. The 12-month line is the whole answer.', focusEl: operatingEl }; }
  // The startup list is the packet. Every checked item needs a rough amount, and the two "build my packet"
  // modes need at least one item, or the verdict, the signer, and the statement's section 5 have nothing to say.
  const unpriced = [...state.items].filter(([, amt]) => !(amt > 0)).map(([id]) => id);
  if (unpriced.length) {
    unpriced.forEach(id => document.querySelector(`[data-row="${id}"]`)?.classList.add('field-missing'));
    const first = document.querySelector(`[data-amt="${unpriced[0]}"]`);
    return { message: `Put a rough amount beside each item you checked (${unpriced.length} still blank). A quote or a guess is fine; it decides what VR&E can fund and who signs.`, focusEl: first };
  }
  const ri = ratingInfo();
  if ((state.mode === 'idea' || state.mode === 'inprogram') && state.items.size === 0 && !ri.unrated && ri.num !== 0) { // an unrated or 0% veteran's verdict is the rating itself
    $('items').classList.add('field-missing');
    return { message: 'Check at least one thing you need money for, with a rough amount. Your list is what the packet is built from.', focusEl: document.querySelector('[data-item]') };
  }
  return { message: '', focusEl: null };
}
[ratingEl, stageEl, operatingEl].forEach(el => el.addEventListener('change', () => { if (el.value) { clearMissing(); $('form-error').textContent = ''; } }));

/* ─── Submit gate ──────────────────────────────────────────────────────── */
$('calc-form').addEventListener('submit', e => { e.preventDefault(); reveal(); });
function reveal(opts = {}) {
  const v = validate();
  if (opts.silent && v.message) { clearMissing(); return; }
  $('form-error').textContent = v.message;
  if (v.message) { if (!isTourActive()) v.focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); v.focusEl.focus({ preventScroll: true }); return; }
  const r = run();
  state.last = r;
  renderHero(r);
  renderCards(r);
  state.revealed = true;
  $('hero-verdict').style.display = 'block';
  $('hero-capture').style.display = 'block';
  $('results-container').style.display = 'block';
  $('action-bar').style.display = 'flex';
  if (opts.silent) return;
  if (typeof gtag === 'function') gtag('event', 'show_results', { mode: state.mode, rating: r.s.ratingRaw, tier: r.sign.manual.short, fundableBand: r.buckets.totals.fundable >= 50000 ? '50k+' : r.buckets.totals.fundable >= 25000 ? '25-50k' : r.buckets.totals.fundable > 0 ? 'under25k' : 'none' });
  if (isTourActive() && tourState.steps[tourState.i]?.id === 'gate') endTour();
  if (!isTourActive()) $('hero-verdict').scrollIntoView({ behavior: 'smooth', block: 'start' });
  let resultsSeen = true;
  try { resultsSeen = localStorage.getItem(RESULTS_TOUR_KEY) === '1'; } catch {}
  if (!resultsSeen && !window.__vsepArrivalHadParams) setTimeout(() => startTourWith(RESULTS_TOUR, RESULTS_TOUR_KEY), 800);
}
$('retake-btn').addEventListener('click', () => {
  state.revealed = false;
  ['hero-verdict', 'hero-capture', 'results-container'].forEach(id => $(id).style.display = 'none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── Jump links: every gap points at the field that fixes it ──────────── */
function gapTarget(key) {
  switch (key) {
    case 'viability': return { sel: '#plan' };
    case 'cost': return { sel: '#items' };
    case 'market': return { sel: '#market', drawer: true };
    case 'financing': return { sel: '#financing', drawer: true };
    case 'sba': return { sel: '#sba', drawer: true };
    case 'site': return { sel: '#location', drawer: true };
    case 'training': return { sel: '#training', drawer: true };
    case 'plan': return { sel: '#plan' };
    case 'limits': return { sel: '#card-limits', drawer: true };
    case 'fillin': return { sel: '#fill-in', fillin: true };
    case 'evidence': return { sel: '#card-evidence .ev-list', card: '#card-evidence' };
    default: return null;
  }
}
function goTo(key) {
  const t = gapTarget(key); if (!t) return;
  if (t.drawer) $('assumptions-drawer').open = true;
  if (t.card) { const c = document.querySelector(t.card); if (c) c.open = true; }
  if (t.fillin) { const lc = $('card-letter'); if (lc) lc.open = true; const fi = $('fill-in'); if (fi) fi.open = true; }
  const el = document.querySelector(t.sel); if (!el) return;
  const box = el.closest('.fg-field, .input-card, .fi-sec, .fill-in, .stack-card') || el;
  if (!isTourActive()) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  box.classList.remove('goto-flash'); void box.offsetWidth; box.classList.add('goto-flash');
  const f = el.matches('input, select, textarea') ? el : el.querySelector('input, select, textarea');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 450);
}
document.addEventListener('click', e => { const a = e.target.closest('[data-goto]'); if (!a) return; e.preventDefault(); goTo(a.dataset.goto); });
const gapLink = (g, text) => `<a href="#" class="gap-link" data-goto="${g.id}">${esc(text || g.short || g.title)}</a>`;

/* ─── Hero ─────────────────────────────────────────────────────────────── */
function renderHero(r) {
  const el = $('hero-verdict');
  const s = r.s, b = r.buckets, sg = r.sign;
  const first = r.gaps[0];
  let kicker, line;
  if (s.unrated || s.rating === 0) {
    kicker = 'Start with the rating';
    line = `VR&E starts with a service-connected rating of 10% or more. ${s.unrated ? 'File the claim first; an Intent to File locks your effective date while you build it.' : 'A 0% rating does not open the program; an increase claim is the first step.'} SDVOSB certification does not need a rating threshold; <a href="/veteran-business/">Veteran Founder Stack</a> covers that door. Everything below still shows what the counselor will look for.`;
  } else if (r.startupOnly) {
    kicker = 'This track funds startups only';
    line = `The manual says it in one sentence: an existing business is not within the scope of the self-employment track, and at 12 months or more of operation the one retroactive path is closed too. That is a real answer, and a fast one. What is open to a running business: free SBA counseling and SBA-backed loans, your state’s veteran-business programs, and SDVOSB or VOSB certification. <a href="/veteran-business/">Veteran Founder Stack</a> walks all three.`;
  } else if (r.retroOpen) {
    kicker = 'One narrow door, and it closes at 12 months';
    line = `The track itself is for startups. Under 12 months of operation there is one retroactive path: training you already paid for at a VA-approved facility that is tied directly to the business can be considered for retroactive induction. Equipment you already bought is not covered. The statement below asks for that consideration, and the rest of the packet shows what a plan would need.`;
  } else if (s.mode === 'pushback') {
    const o = OBJECTION_BY_ID[s.objection];
    const rule = RULES[o.ruleIds[0]];
    kicker = o.concede ? 'The counselor is right on this one' : 'The rule that answers it';
    line = o.concede
      ? `Your counselor said <strong>“${esc(o.label.toLowerCase())}.”</strong> On that point the rule is on their side: <strong>${esc(rule.cite)}</strong>, ${esc(rule.title.toLowerCase())}. The response below concedes it and moves the conversation to what the regulation does allow${b.totals.fundable ? `: ${fmtUSD(b.totals.fundable)} of your list is on VR&E’s list` : ''}.`
      : `Your counselor said <strong>“${esc(o.label.toLowerCase())}.”</strong> The rule that answers it is <strong>${esc(rule.cite)}</strong>: ${esc(rule.title.toLowerCase())}. Your response and your statement are drafted below; you have <strong>${r.feasCount} of 8</strong> feasibility elements in hand.`;
  } else if (!state.items.size) {
    kicker = `${r.feasCount} of 8 feasibility elements in hand`;
    line = `Check what you need money for in the form and this verdict reads your list item by item: what VR&E can buy, what the regulation prohibits, and who has to sign. ${first ? `Start with ${gapLink(first)}.` : ''} Your statement is drafted below with brackets where it needs your details.`;
  } else {
    const pro = b.prohibited.map(x => x.item.short), unl = b.unlisted.map(x => x.item.short);
    kicker = b.totals.fundable > 0 ? `${fmtUSD(b.totals.fundable)} of your ${fmtUSD(b.totals.all)} is on VR&E’s list` : 'Nothing on your list is on VR&E’s list yet';
    line = `${b.totals.fundable > 0 ? `<strong>${fmtUSD(b.totals.fundable)}</strong> across ${b.fundable.length} item${b.fundable.length === 1 ? '' : 's'} is the kind of assistance the regulation names.` : 'The items you checked are either prohibited or not on the regulation’s list.'}${pro.length ? ` <strong>${fmtUSD(b.totals.prohibited)}</strong> can’t be funded (${esc(pro.join(', '))}; 38 CFR 21.214(f)).` : ''}${unl.length ? ` ${esc(unl.join(', ').replace(/^./, c => c.toUpperCase()))} ${unl.length === 1 ? 'is' : 'are'} not on the list; budget ${unl.length === 1 ? 'it' : 'them'} yourself.` : ''}${b.substance ? ' <strong>A cannabis or recreational-substance business cannot be authorized</strong> under the manual, whatever is on the list.' : ''} ${b.totals.fundable > 0 ? `Your plan would go to <strong>${esc(sg.manual.approver)}</strong>.` : ''} You have <strong>${r.feasCount} of 8</strong> feasibility elements${first ? `; start with ${gapLink(first)}` : ''}.`;
  }
  const tiles = `<div class="three-num">
    <div class="num-card comfortable"><span class="nc-label">On VR&E’s list</span><span class="nc-amount">${b.totals.fundable > 0 ? fmtUSD(b.totals.fundable) : state.items.size ? '$0' : '—'}</span><span class="nc-sub">${state.items.size ? `${b.fundable.length} of ${state.items.size} items checked${b.prohibited.length ? `; ${b.prohibited.length} prohibited` : ''}${b.unlisted.length ? `; ${b.unlisted.length} not on the list` : ''}` : 'check your startup items'}</span></div>
    <div class="num-card"><span class="nc-label">Who signs your plan</span><span class="nc-amount">${b.totals.fundable > 0 ? esc(sg.manual.short) : '—'}</span><span class="nc-sub">${b.totals.fundable > 0 ? (sg.manual.short === 'Executive Director' ? `manual: $${MANUAL_ED_THRESHOLD.toLocaleString()} and up` : `manual: under $${MANUAL_ED_THRESHOLD.toLocaleString()}${sg.conflict ? '; the regulation says ' + esc(sg.reg) : ''}`) : 'enter amounts to see'}</span></div>
    <div class="num-card"><span class="nc-label">Feasibility elements</span><span class="nc-amount">${r.feasCount} of 8</span><span class="nc-sub">${r.gaps.length ? 'thin or missing: ' + r.gaps.map(g => gapLink(g)).join(' · ') : 'all documented'}</span></div>
  </div>`;
  const bracketLine = `<p class="v-sub"><span class="chip chip-gold">Your statement</span> <strong>${countBrackets(r.letter)} brackets</strong> still need your real information. <a href="#" class="gap-link" data-goto="fillin">Fill them in here →</a> Nothing you type there leaves this device.</p>`;
  el.innerHTML = `<p class="v-kicker">${kicker}</p><p class="v-line">${line}</p>${tiles}${bracketLine}`;
}

/* ─── Cards ────────────────────────────────────────────────────────────── */
function card(id, title, value, valueClass, body, open) {
  return `<details class="stack-card" id="card-${id}"${open ? ' open' : ''}><summary><span class="sc-title">${esc(title)}</span><span class="sc-value ${valueClass || ''}">${value}</span></summary><div class="sc-body">${body}</div></details>`;
}
function ruleBlockOf(r) {
  if (!r) return '';
  return `<div class="rule"><p class="rule-t">${esc(r.title)}</p><p>${esc(r.plain)}</p>${r.quote ? `<details class="rule-q"><summary>The exact text</summary><p><em>“${esc(r.quote)}”</em></p></details>` : ''}<p class="rule-c"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.cite)}</a>${r.verified && r.verified !== 'pending' ? ` · verified ${esc(r.verified)}` : ''}</p></div>`;
}
const ruleBlock = id => ruleBlockOf(RULES[id]);
const oneLine = key => `<p class="one-line">${esc(ONE_ON_ONE[key])} <a href="${ONE_ON_ONE.url}">Work With Me →</a></p>`;
const stLabel = { doc: ['rs-doc', 'Documented'], thin: ['rs-thin', 'Thin'], miss: ['rs-miss', 'Missing'] };
const feasListHtml = r => r.feas.map(x => `<li><span class="rs ${stLabel[x.st][0]}">${stLabel[x.st][1]}</span><div><p class="r-t">${x.n}. ${esc(x.title)}</p><p class="r-w">${esc(x.why)}</p>${x.act ? `<p class="r-a">${esc(x.act)}${x.link ? ` <a href="${esc(x.link[0])}"${x.link[0].startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(x.link[1])} →</a>` : ''}</p>` : ''}${x.st !== 'doc' ? `<p class="r-fix"><a href="#" class="gap-link" data-goto="${x.id}">Take me there →</a></p>` : ''}</div></li>`).join('');

function renderCards(r) {
  const s = r.s, b = r.buckets, sg = r.sign;
  const cards = {};
  // Fit
  {
    const el = r.elig;
    const fitRows = r.fit.map(f => `<li><span class="rs ${stLabel[f.st][0]}">${stLabel[f.st][1]}</span><div><p class="r-t">${f.n}. ${esc(f.text)}</p><p class="r-w">${esc(f.answer)}</p><p class="r-a">Bring: ${esc(f.bring)}</p></div></li>`).join('');
    cards.fit = card('fit', 'Is the track open to you, and does the idea fit', `${r.fit.filter(f => f.st === 'doc').length} of 6 factors answered`, el.st === 'miss' ? 'off' : 'door', `
      <p><strong>Eligibility.</strong> <span class="rs ${stLabel[el.st][0]}">${stLabel[el.st][1]}</span> ${esc(el.why)}${el.act ? ` <em>${esc(el.act)}</em>` : ''}${el.link ? ` <a href="${esc(el.link[0])}"${el.link[0].startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(el.link[1])} →</a>` : ''}</p>
      <p><strong>Fit.</strong> Before any plan is written, the counselor assesses whether self-employment is appropriate for you. The manual lists six things that assessment may include. Your answers, read against each:</p>
      <ul class="ready-list">${fitRows}</ul>
      <p>If the answer is yes, it is documented on VA Form 28-1902n and you get the <strong>VR-64</strong> positive letter. If no, a <strong>VR-58</strong> adverse letter and a conversation about traditional employment. Either way, ask for it in writing.</p>
      ${ruleBlock('aggravate')}${ruleBlock('fitFactors')}${ruleBlock('seGoal')}${ruleBlock('entitlement')}${s.dischargeYear && s.dischargeYear < VRE_NO_LIMIT_DISCHARGE_YEAR ? ruleBlock('window') : ''}
      <p class="sc-src">38 CFR 21.40, 21.257(a); M28C.IV.C.5 5.01, 5.03. ${esc(CANT_DO)}</p>`, false);
  }
  // Items
  {
    const rows = ITEMS.filter(it => it.id in (s.items || {})).map(it => { const amt = s.items[it.id]; return `<li><span class="bk bk-${it.bucket}">${esc(BUCKET_LABEL[it.bucket])}</span><div><p class="vl-t">${esc(it.label)}${amt ? ` <span class="vl-amt">${fmtUSD(amt)}</span>` : ''}</p><p class="vl-w">${esc(BUCKET_PLAIN[it.bucket])} ${esc(it.hint)}</p>${it.letterCategory ? `<p class="vl-w"><em>In the statement as:</em> ${esc(it.letterCategory)}.</p>` : ''}</div></li>`; }).join('');
    const totals = `<div class="bucket-total"><div><span class="bt-n">${fmtUSD(b.totals.fundable)}</span><span class="bt-l">on VR&E’s list (${b.fundable.length} item${b.fundable.length === 1 ? '' : 's'})</span></div><div><span class="bt-n">${fmtUSD(b.totals.unlisted)}</span><span class="bt-l">not on the list (${b.unlisted.length})</span></div><div><span class="bt-n">${fmtUSD(b.totals.prohibited)}</span><span class="bt-l">prohibited (${b.prohibited.length})</span></div></div>`;
    const shortTraining = (s.items || {}).training != null || s.training === 'degree' ? `<p><strong>Training on this track is short-term only.</strong> A course or a certification, not a degree or diploma (M28C.IV.C.5 5.04.a). ${s.training === 'degree' ? 'You said the business needs a degree: that belongs in a different plan first, with the business after.' : ''}</p>` : '';
    cards.items = card('items', 'What VR&E can buy from your list, item by item', state.items.size ? `${fmtUSD(b.totals.fundable)} on the list` : 'check your items', state.items.size ? (b.totals.fundable > 0 ? '' : 'off') : 'off', `
      ${state.items.size ? `<p>Three buckets, each with its cite. Only the first one goes in your written ask.</p>${totals}<ul class="verdict-list">${rows}</ul>` : '<p>Check what you need money for in the form and each item lands in one of three buckets: on VR&E’s list, not on the list, or prohibited. Only the first one goes in your written ask.</p>'}
      ${b.substance ? `<div class="warn-line"><strong>Cannabis or recreational-substance business.</strong> The manual bars it from any self-employment plan regardless of the items. ${esc(RULES.substance.plain)}</div>` : ''}
      ${shortTraining}
      <div class="callout callout-gold"><h3>${esc(RULES.mostSevere.title)}</h3><p>${esc(RULES.mostSevere.plain)}</p></div>
      ${ruleBlock('approvable')}${ruleBlock('assistOthers')}${ruleBlock('beginOps')}${ruleBlock('prohibited')}${ruleBlock('mostSevere')}${ruleBlock('statute')}${b.substance ? ruleBlock('substance') : ''}`, false);
  }
  // Signers
  {
    const fund = b.totals.fundable;
    const rows = [
      ['Phase One (feasibility work, SBA referral, writing the plan)', 'No concurrence needed above the counselor', 'Manual', 'M28C.IV.C.5 5.05.b.1', fund === 0],
      [`Plan total of $49,999 or less`, 'VR&E Officer', 'Manual', 'M28C.IV.C.5 5.05.b.2', fund > 0 && fund < MANUAL_ED_THRESHOLD],
      [`Plan total of $50,000 or more`, 'Executive Director, VR&E Service', 'Manual', 'M28C.IV.C.5 5.05.b.2', fund >= MANUAL_ED_THRESHOLD],
      [`Under $25,000 / $25,000 or more`, 'VR&E Officer / Executive Director', 'Regulation', '38 CFR 21.258', false],
      [`Program costs above $25,000 in a calendar year for small-business supplies`, 'VR&E Officer reviews, cannot delegate', 'Regulation', '38 CFR 21.430(c)', sg.officerReview],
    ].map(([a, w, src, cite, you]) => `<tr class="${you ? 'you-row' : ''}"><td>${esc(a)}</td><td>${esc(w)}</td><td>${esc(cite)}<span class="src-chip">${src}</span></td></tr>`).join('');
    const lead = fund > 0
      ? `<p>With <strong>${fmtUSD(fund)}</strong> on VR&E’s list, the manual your office works from sends the plan to <strong>${esc(sg.manual.approver)}</strong>, ${esc(sg.manual.how)}.${sg.conflict ? ` The regulation it cites, 38 CFR 21.258, would send a plan at this amount to the Executive Director instead; both are current, they disagree, and we show both.` : ''}${sg.officerReview ? ' Separately, 38 CFR 21.430(c) requires the VR&E Officer to review program costs above $25,000 in a calendar year for small-business supplies, personally.' : ''} Nobody signs the plan until the concurrence is back.</p>`
      : '<p>Enter amounts beside your items and this card names who has to sign. Either way: the counselor cannot approve a self-employment plan alone, and Phase One needs no one above the counselor.</p>';
    cards.signers = card('signers', 'Who signs your plan', fund > 0 ? esc(sg.manual.short) : 'enter amounts', fund >= MANUAL_ED_THRESHOLD ? 'door' : '', `${lead}
      <div class="table-scroll"><table class="cmp-table ladder-table sign-table"><thead><tr><th>Plan cost</th><th>Who</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p><strong>Why two numbers.</strong> The manual chapter (change date June 21, 2023) uses $49,999 / $50,000. The regulation it cites (amended February 16, 2022) uses $25,000. Your office works from the manual. If anyone cites $25,000, this is where it comes from. We do not reconcile them, because VA has not.</p>
      ${ruleBlock('phaseOne')}${ruleBlock('manualThreshold')}${ruleBlock('regThreshold')}${ruleBlock('officerReview')}${ruleBlock('concurrenceDocs')}
      ${fund >= MANUAL_ED_THRESHOLD ? oneLine('big') : ''}`, false);
  }
  // Feasibility
  cards.feas = card('feas', 'The feasibility analysis: 8 elements', `${r.feasCount} of 8 documented`, r.gaps.length ? 'door' : '', `
    <p>Seven elements the regulation says the feasibility analysis <em>must include</em>, plus the business plan itself. Each marked documented, thin, or missing from your answers. No percentage, no odds; just where the plan is thin so you can fix it before the panel sees it.</p>
    <ul class="ready-list">${feasListHtml(r)}</ul>
    <p><strong>Free help with every element:</strong> <a href="${SBA.vbocFind}" target="_blank" rel="noopener">a Veterans Business Outreach Center</a>, <a href="${SBA.sbdc}" target="_blank" rel="noopener">a Small Business Development Center</a>, SCORE mentors, and <a href="${SBA.b2b}" target="_blank" rel="noopener">SBA’s Boots to Business course</a>. The referral to one of them is mandatory anyway.</p>
    ${ruleBlock('feasibility')}${ruleBlock('standalone')}${ruleBlock('panel')}${ruleBlock('infeasible')}
    <p class="sc-src">38 CFR 21.257(f); M28C.IV.C.5 5.05.b.1(d), (e), (f).</p>`, false);
  // Process
  {
    const steps = PROCESS.map(p => `<li><div><p class="st-t">${esc(p.title)}</p><p class="st-w"><strong>${esc(p.who)}.</strong> ${esc(p.what)}</p>${p.forms.length ? `<p class="st-forms"><strong>Forms:</strong> ${esc(p.forms.join(' · '))}</p>` : ''}<p class="st-cite rule-c"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.cite)}</a></p></div></li>`).join('');
    const where = s.stage === 'not-applied' ? 1 : s.stage === 'applied' ? 2 : s.stage === 'in-program' || s.stage === 'plan-signed' ? 3 : s.stage === 'se-plan' ? 6 : 8;
    cards.process = card('process', 'The process, step by step', `12 steps · you’re near step ${where}`, 'door', `
      <p>From application to rehabilitated, with who acts and the form at each step. Print this one. ${s.stage === 'plan-signed' ? '<strong>You have a signed plan for school or training:</strong> the change you are asking for is a redevelopment of that plan to a self-employment goal, which starts at step 3 (vocational exploration) and runs the same road from there.' : ''}</p>
      <ol class="steps-list">${steps}</ol>
      ${ruleBlock('sbaReferral')}${ruleBlock('dot189')}${ruleBlock('financialReview')}
      <p class="sc-src">M28C.IV.C.5 5.03 through 5.08; 38 CFR 21.257, 21.258, 21.268, 21.283. <a href="${TRACK_URL}" target="_blank" rel="noopener">VA.gov’s page on the track</a> · <a href="${APPLY_URL}" target="_blank" rel="noopener">Apply (VA Form 28-1900)</a>.</p>`, false);
  }
  // Cost sheet
  {
    const rows = ITEMS.filter(it => it.id in (s.items || {})).map(it => ({ it, amt: s.items[it.id] }));
    const tr = x => `<tr><td>${esc(x.it.label)}</td><td>${esc(x.it.bucket === 'fundable' ? x.it.letterCategory.replace(/\s*\(.*$/, '') : x.it.bucket === 'prohibited' ? 'Prohibited, 38 CFR 21.214(f)' : 'Not on the regulation’s list')}</td><td>${x.it.bucket === 'fundable' ? 'VR&E ask' : 'Funded by me'}</td><td>${x.amt ? fmtUSD(x.amt) : '—'}</td></tr>`;
    const table = rows.length ? `<div class="table-scroll"><table class="cmp-table sheet-table"><thead><tr><th>Item</th><th>Regulation category</th><th>Who pays</th><th>Amount</th></tr></thead><tbody>${rows.map(tr).join('')}<tr class="total"><td colspan="3">Requested from VR&E</td><td>${fmtUSD(b.totals.fundable)}</td></tr><tr class="total"><td colspan="3">Funded by me</td><td>${fmtUSD(b.totals.unlisted + b.totals.prohibited)}</td></tr><tr class="total"><td colspan="3">Total startup cost</td><td>${fmtUSD(b.totals.all)}</td></tr></tbody></table></div>` : '<p>Check your startup items in the form and the sheet fills in.</p>';
    cards.sheet = card('sheet', 'Your itemized cost sheet', rows.length ? `${rows.length} line${rows.length === 1 ? '' : 's'} · ${fmtUSD(b.totals.fundable)} ask` : 'check items', rows.length ? '' : 'off', `
      <p>The counselor itemizes your plan on Appendix FO for the concurrence request, and the panel’s cost analysis (38 CFR 21.257(f)(2)) is the same list. This is that list, in two parts: what you are asking VR&E to consider, and what you fund yourself. One written quote per line in part one. Bring it to the first meeting.</p>
      ${table}
      <div class="letter-tools no-print">
        <button type="button" id="sheet-print" class="action-btn secondary">Print sheet only</button>
        <button type="button" id="sheet-download" class="action-btn secondary">Download for Word</button>
      </div>
      <div id="cost-sheet"></div>
      ${ruleBlock('concurrenceDocs')}`, false);
  }
  // Questions to ask
  cards.questions = card('questions', 'Seven questions to ask at the meeting', `${QUESTIONS.length} questions`, '', `
    <p>Each one moves the process a step, and each one tells the counselor you have read the chapter. Ask them in this order.</p>
    <ol class="q-list">${QUESTIONS.map(q => `<li><p class="q-q">${esc(q.q)}</p><p class="q-why">${esc(q.why)}</p><p class="q-cite">${esc(q.cite)}</p></li>`).join('')}</ol>`, false);
  // Letter
  cards.letter = card('letter', 'Your Self-Employment Goal Statement', `${countBrackets(r.letter)} brackets left`, 'door', renderLetterCard(r), true);
  // Objections
  {
    const list = s.mode === 'pushback' ? [OBJECTION_BY_ID[s.objection], ...OBJECTIONS.filter(o => o.id !== s.objection)] : OBJECTIONS;
    const html = list.map((o, i) => `<div class="obj ${i === 0 && s.mode === 'pushback' ? 'picked' : ''}"><p class="o-says">${esc(o.counselorSays)}${o.concede ? ' <span class="q-tag">the counselor is right on this</span>' : ''}</p><p class="o-plain">${esc(o.plain)}</p><p class="o-resp">${esc(o.response)}</p><p class="o-cite">${o.ruleIds.map(id => `<a href="${esc(RULES[id].url)}" target="_blank" rel="noopener">${esc(RULES[id].cite)}</a>`).join(' · ')}</p></div>`).join('');
    cards.objections = card('objections', 'What counselors say, and the rule that answers it', `${OBJECTIONS.length} objections`, 'door', `<p>The likely wording, a short response in your voice, and the cite. Where the counselor is right, the response concedes it and moves the conversation to what the regulation allows. Say it in your own words; the cite is for the file.</p>${html}${s.mode === 'pushback' ? oneLine('pushback') : ''}`, false);
  }
  // Own (existing business)
  if (s.mode === 'own') {
    cards.own = card('own', 'You already own a business: what the manual says', r.startupOnly ? 'startups only' : 'one narrow door', r.startupOnly ? 'off' : 'door', `
      <div class="redirect-card"><h3>${r.startupOnly ? 'This track funds startups only.' : 'Under 12 months: one retroactive path.'}</h3>
      <p>${r.startupOnly ? 'VR&E “only supports a startup business for a self-employment plan,” and an existing business “is not within the scope of the self-employment track.” At 12 months or more of operation the retroactive path is closed as well. There is no manual procedure for funding or expanding an existing business.' : 'The track itself is for startups. Under 12 months there is one path: if you already paid for training at a VA-approved facility that goes straight to the skills the business needs, VA can consider retroactive induction for that training. Equipment, inventory, or a lease you already paid for are not covered by it.'}</p>
      <p><strong>What is open to a running business:</strong></p>
      <ul><li><a href="/veteran-business/">Veteran Founder Stack</a>: SDVOSB and VOSB certification (any rating for SDVOSB, including 0%), the set-aside contract dollars in your industry, SBA fee relief on 7(a) loans, and your state’s programs.</li><li>Free counseling and SBA-backed loans through <a href="${SBA.vbocFind}" target="_blank" rel="noopener">a Veterans Business Outreach Center</a>.</li><li>VR&E employment services, if you are otherwise entitled: the question to ask the counselor is whether a program of employment services applies to a self-employed veteran with an employment handicap (38 CFR 21.47).</li></ul></div>
      ${ruleBlock('startup')}${ruleBlock('retro')}
      <p class="sc-src">M28C.IV.C.5 5.02, 5.04.b; M28C.V.B.6. ${esc(CANT_DO)}</p>`, false);
  }
  // Money
  {
    const flat = getVreRate(s.deps, 'fullTime');
    const eaa = flat * EAA_MONTHS;
    cards.money = card('money', 'The money during and after the plan', `${fmtUSD(flat)}/mo while training`, '', `
      <div class="money-grid">
        <div class="money-tile"><span class="mt-n">${fmtUSD(flat)}</span><span class="mt-l">Chapter 31 full-time subsistence, ${s.deps === 0 ? 'no dependents' : `${s.deps}${s.deps >= 4 ? '+' : ''} dependent${s.deps === 1 ? '' : 's'}`}, flat national rate, while you train on the plan</span></div>
        <div class="money-tile"><span class="mt-n">${fmtUSD(eaa)}</span><span class="mt-l">Employment adjustment allowance: two months at the full-time rate when you reach the point of employability, not charged against entitlement</span></div>
      </div>
      <p>During the training phase of a self-employment plan, subsistence is paid like any Chapter 31 plan. Once you are declared job-ready and the case moves to employment services, subsistence stops (38 CFR 21.254(b)), and the employment adjustment allowance bridges it. Employment services can run up to 18 months and are not charged against your months of entitlement. The items VA buys for the business are not a loan and are not charged against entitlement either; the training time is.</p>
      ${ruleBlock('eaa')}${ruleBlock('noSubsistenceES')}${ruleBlock('esDuration')}
      <p class="sc-src">Subsistence rates as published by VA for the current fiscal year (imported from the GI Bill vs. VR&E tool’s rate file; <a href="https://www.benefits.va.gov/vocrehab/vrerates27.asp" target="_blank" rel="noopener">source</a>). Rates change each October 1.</p>`, false);
  }
  // Denied / infeasible
  {
    const key = s.stage === 'denied' ? 'denied' : 'silent';
    const e = ESCALATION[key];
    const others = Object.entries(ESCALATION).filter(([k]) => k !== key && k !== 'orientation');
    const steps = ee => `<ol class="steps-list">${ee.steps.map(([t2, w]) => `<li><div><p class="st-t">${esc(t2)}</p><p class="st-w">${esc(w)}</p></div></li>`).join('')}</ol>`;
    cards.denied = card('denied', 'If the plan is called infeasible, or the goal is denied', s.stage === 'denied' ? 'your next step' : 'in case', s.stage === 'denied' ? 'door' : 'off', `
      <div class="warn-line"><strong>Infeasible is a plan decision; denied is a goal decision.</strong> An infeasible finding comes with one redevelopment: get the panel report, fix the element that failed, resubmit. A denial of the self-employment goal, or of entitlement, is a decision with review rights and a one-year clock.</div>
      ${ruleBlock('infeasible')}
      <div class="warn-line"><strong>Review first. Reapply only alongside.</strong> ${esc(REAPPLY_WARNING)}</div>
      <p class="region-note">${esc(REGION_NOTE)}</p>
      <p><strong>${esc(e.title)}</strong></p>${steps(e)}
      ${others.map(([, ee]) => `<details class="faq-item"><summary>${esc(ee.title)}</summary><div style="padding:0 18px 12px">${steps(ee)}</div></details>`).join('')}
      ${ruleBlockOf(VAP_RULES.review)}${ruleBlockOf(VAP_RULES.dueProcess)}
      <p class="sc-src">${esc(WH_HOTLINE.label)}: ${esc(WH_HOTLINE.phone)}. A VSO (DAV, VFW, American Legion) represents you at no cost. Congressional caseworkers handle VA inquiries for constituents. Review-lane text shared with <a href="/vre-approval-prep/">VR&E Approval Prep</a>, verified 9/30/26.</p>`, false);
  }
  // Evidence
  {
    const visible = r.evidence.visible, have = r.evidence.have;
    cards.evidence = card('evidence', 'What to bring', `${have} of ${visible.length} gathered`, have >= 6 ? '' : 'off', `
      <p>Tick items as you gather them. The count feeds the supporting-documents line in your statement. Print this card and bring it.</p>
      <ul class="ev-list">${visible.map(c => `<li><label><input type="checkbox" data-ev="${c.id}"${s.evidence.includes(c.id) ? ' checked' : ''}> ${esc(c.label)}</label></li>`).join('')}</ul>`, false);
  }
  const ORDER = {
    idea: ['fit', 'items', 'sheet', 'feas', 'letter', 'process', 'questions', 'signers', 'objections', 'money', 'denied', 'evidence'],
    inprogram: ['process', 'questions', 'letter', 'fit', 'items', 'sheet', 'feas', 'signers', 'objections', 'money', 'denied', 'evidence'],
    pushback: ['objections', 'letter', 'items', 'sheet', 'fit', 'feas', 'signers', 'process', 'questions', 'money', 'denied', 'evidence'],
    own: ['own', 'items', 'sheet', 'process', 'questions', 'objections', 'letter', 'fit', 'feas', 'signers', 'money', 'denied', 'evidence'],
  };
  const order = ORDER[s.mode].filter(id => cards[id]);
  const html = order.map((id, i) => { let h = cards[id]; if (i === 0 && !h.includes(' open>')) h = h.replace('<details class="stack-card"', '<details class="stack-card" open'); return h; }).join('');
  $('cards-panel').innerHTML = html;
  wireLetterCard();
  wireSheetCard();
  document.querySelectorAll('[data-ev]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? state.evidence.add(cb.dataset.ev) : state.evidence.delete(cb.dataset.ev); reveal({ silent: true }); }));
}

/* ─── Letter card ──────────────────────────────────────────────────────── */
const SAMPLE = {
  mode: 'idea', rating: 70, unrated: false, pending: false, stage: 'applied', bizType: 'trade', plan: 'draft', items: { equipment: 18500, inventory: 2200, licenses: 450, training: 1800, vehicle: 32000, insurance: 1400 },
  sba: 'met', financing: 'savings', credit: 'yes', market: 'written', location: 'home', training: 'short', experience: 'worked', substance: 'no', operating: '',
  limits: ['stress', 'crowds', 'sleep', 'standing'], seFits: ['schedule', 'environment', 'nopublic'], evidence: ['rating', 'dd214', 'resume', 'plan', 'sba', 'financial', 'quotes', 'licenses', 'site', 'market'],
  priv: { counselor: 'Ms. Ortega', branch: 'United States Army', serviceYears: '2009 to 2017', conditions: 'post-traumatic stress disorder, lumbar strain, and tinnitus', ratingWording: 'Difficulty in adapting to stressful circumstances\nChronic sleep impairment\nDisturbances of motivation and mood\nForward flexion of the thoracolumbar spine limited by pain', bizName: 'Ridgeline Mobile Welding', bizDesc: 'repairs trailers, gates, and farm equipment at the customer’s site', customers: 'ranchers, small haulers, and contractors within 40 miles who cannot bring broken equipment to a shop', sbaContact: 'the Veterans Business Outreach Center, September 2026', trainingPlan: 'a six-week AWS structural certification at the community college, $1,800', siteDesc: 'a home shop in my garage', jobs: [{ title: 'Warehouse shift supervisor', worked: false, reason: 'standing' }, { title: 'Fabrication shop, night shift', worked: false, reason: 'sleep' }, { title: 'Small repair shop, day shift, two-person crew', worked: true, reason: 'quiet' }, {}] },
};
function currentLetter() { return state.sample ? buildLetter(SAMPLE) : buildLetter(buildInput()); }
function renderLetterCard(r) {
  const p = state.priv;
  const jobRow = (j, i) => `<div class="job-row"><input type="text" data-job="${i}" data-k="title" placeholder="Job ${i + 1}, e.g. warehouse supervisor" value="${esc(j.title || '')}" maxlength="80"><select data-job="${i}" data-k="worked"><option value="no"${j.worked ? '' : ' selected'}>Did not work for me</option><option value="yes"${j.worked ? ' selected' : ''}>Worked for me</option></select><select data-job="${i}" data-k="reason">${(j.worked ? FITS : LIMITS).map(x => `<option value="${x.id}"${j.reason === x.id ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>`;
  const f = (id, label, ph, val, type = 'text') => `<div class="fg-field"><label for="fi-${id}">${label}</label><input type="${type}" id="fi-${id}" data-priv="${id}" placeholder="${esc(ph)}" value="${esc(val || '')}" maxlength="160" autocomplete="off"></div>`;
  return `
    <p>A Self-Employment Goal Statement, addressed to your counselor, in your words. Filled in from your answers; a highlighted bracket wherever it needs your real information. Section 5 asks only for items on the regulation’s list. ${esc(CANT_DO)}</p>
    <div class="letter-tools no-print">
      <button type="button" id="letter-copy" class="action-btn secondary">Copy statement</button>
      <button type="button" id="letter-print" class="action-btn secondary">Print statement only</button>
      <button type="button" id="letter-download" class="action-btn secondary">Download for Word</button>
      <button type="button" id="sample-toggle" class="sample-toggle" aria-pressed="${state.sample ? 'true' : 'false'}">${state.sample ? 'Back to my statement' : 'See a finished example'}</button>
      <span class="bracket-count" id="bracket-count"></span>
    </div>
    <p class="phone-hint no-print">On a phone, <strong>Download for Word</strong> opens your share menu: pick Pages, Word, Google Docs, or Save to Files. If a different app opens instead, use <strong>Copy statement</strong> and paste it wherever you write.</p>
    <p class="letter-sample-note" id="letter-sample-note" ${state.sample ? '' : 'hidden'}>An example for a fictional veteran, to show what a finished draft looks like. Nothing in it is yours. Switch back to keep working on your own.</p>
    <div id="letter-sheet"></div>
    <details class="fill-in" id="fill-in">
      <summary><span class="fi-title">Fill in your statement</span><span class="fi-count" id="fi-count"></span><span class="drawer-hint">Your rating decision’s wording, your work history, the business in a sentence, your SBA contact, the training. One section at a time, and the statement above updates as you type. Saved on this device only.</span></summary>
      <div class="fi-body">
        <div class="fi-sec"><p class="fi-h">Header and background</p>
          <div class="fg-two">${f('counselor', 'Counselor’s name', 'e.g. Ms. Ortega', p.counselor)}${f('branch', 'Branch', 'e.g. United States Navy', p.branch)}</div>
          <div class="fg-two">${f('serviceYears', 'Service years', 'e.g. 2010 to 2018', p.serviceYears)}${f('conditions', 'Your service-connected conditions', 'e.g. PTSD, lumbar strain, tinnitus', p.conditions)}</div>
        </div>
        <div class="fi-sec"><p class="fi-h">Your employment handicap, in VA’s words</p>
          <label for="fi-wording" class="chk-label">Paste the findings from your rating decision, one per line</label>
          <textarea id="fi-wording" data-priv="ratingWording" placeholder="e.g.\nDifficulty in adapting to stressful circumstances\nChronic sleep impairment\nForward flexion limited by pain">${esc(p.ratingWording || '')}</textarea>
          <p class="fi-note">Use VA’s exact words from the narrative pages of the decision. The tool never supplies findings for you. Your limits and why self-employment fits them come from the drawer above.</p>
          <p class="chk-label" style="margin-top:10px">Work history since service (up to four)</p>
          ${p.jobs.map(jobRow).join('')}
        </div>
        <div class="fi-sec"><p class="fi-h">The business</p>
          <div class="fg-two">${f('bizName', 'Business name or working title', 'e.g. Ridgeline Mobile Welding', p.bizName)}${f('customers', 'Who buys, and why from you', 'e.g. ranchers within 40 miles who can’t haul equipment to a shop', p.customers)}</div>
          <label for="fi-bizdesc" class="chk-label">What it does, in one sentence (continues “a business that…”)</label>
          <input type="text" id="fi-bizdesc" data-priv="bizDesc" placeholder="e.g. repairs trailers and farm equipment at the customer’s site" value="${esc(p.bizDesc || '')}" maxlength="200" autocomplete="off">
          <div class="fg-two" style="margin-top:10px">${f('siteDesc', 'The site (if leased or bought, the space and its cost)', 'e.g. a 900 sq ft bay at $1,100/mo', p.siteDesc)}${f('sbaContact', 'SBA / VBOC / SBDC / SCORE contact so far', 'e.g. the Denver VBOC, October 2026', p.sbaContact)}</div>
        </div>
        <div class="fi-sec"><p class="fi-h">Training plan</p>
          <label for="fi-training" class="chk-label">The course or certification, provider, length, and cost</label>
          <input type="text" id="fi-training" data-priv="trainingPlan" placeholder="e.g. a six-week AWS certification at the community college, $1,800" value="${esc(p.trainingPlan || '')}" maxlength="200" autocomplete="off">
          <p class="fi-note">Short-term only on this track. Set “Training or license needed” in the drawer to match.</p>
        </div>
        <div class="fi-sec"><button type="button" class="fi-clear" id="letter-clear">Clear my draft from this device</button> <span class="fi-note">Saved in your browser only. Never sent to us, never in a link.</span></div>
      </div>
    </details>`;
}
function paintLetter() {
  const sheet = $('letter-sheet'); if (!sheet) return;
  const L = currentLetter();
  sheet.innerHTML = letterToHtml(L, esc);
  const n = countBrackets(L);
  const bc = $('bracket-count'); if (bc) { bc.textContent = state.sample ? 'example' : `${n} bracket${n === 1 ? '' : 's'} left`; bc.classList.toggle('done', n === 0 && !state.sample); }
  const sv = document.querySelector('#card-letter .sc-value'); if (sv) sv.textContent = state.sample ? 'example shown' : `${n} brackets left`;
  const fc = $('fi-count'); if (fc) { fc.textContent = n === 0 ? 'all filled' : `${n} to fill in`; fc.classList.toggle('done', n === 0); }
}
let saveTimer = null;
function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ priv: state.priv, limits: [...state.limits], seFits: [...state.seFits], evidence: [...state.evidence] })); } catch {} }, 300);
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (!d) return;
    state.priv = { ...emptyPriv(), ...(d.priv || {}) };
    state.priv.jobs = [0, 1, 2, 3].map(i => (state.priv.jobs || [])[i] || {});
    (d.limits || []).forEach(x => state.limits.add(x)); (d.seFits || []).forEach(x => state.seFits.add(x)); (d.evidence || []).forEach(x => state.evidence.add(x));
    document.querySelectorAll('[data-limit]').forEach(cb => cb.checked = state.limits.has(cb.dataset.limit));
    document.querySelectorAll('[data-sefit]').forEach(cb => cb.checked = state.seFits.has(cb.dataset.sefit));
  } catch {}
}
function onPrivateChange() {
  saveDraft();
  if (state.revealed) { const r = run(); state.last = r; renderHero(r); paintLetter(); refreshFeasCard(r); }
}
function refreshFeasCard(r) {
  const rl = document.querySelector('#card-feas .ready-list');
  if (rl) rl.innerHTML = feasListHtml(r);
  const sv = document.querySelector('#card-feas .sc-value'); if (sv) sv.textContent = `${r.feasCount} of 8 documented`;
}
function wireLetterCard() {
  paintLetter();
  document.querySelectorAll('[data-priv]').forEach(el => el.addEventListener('input', () => { state.priv[el.dataset.priv] = el.value; onPrivateChange(); }));
  document.querySelectorAll('[data-job]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
    const i = +el.dataset.job, k = el.dataset.k, j = state.priv.jobs[i] || (state.priv.jobs[i] = {});
    if (k === 'worked') { j.worked = el.value === 'yes'; j.reason = (j.worked ? FITS : LIMITS)[0].id; const rs = document.querySelector(`select[data-job="${i}"][data-k="reason"]`); if (rs) rs.innerHTML = (j.worked ? FITS : LIMITS).map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join(''); }
    else if (k === 'reason') j.reason = el.value;
    else { j.title = el.value; if (!j.reason) j.reason = (j.worked ? FITS : LIMITS)[0].id; }
    onPrivateChange();
  }));
  $('letter-copy')?.addEventListener('click', async () => {
    if (state.sample) return;
    const btn = $('letter-copy'), text = letterToText(currentLetter());
    try { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = o; }, 2000); } catch { prompt('Copy your statement:', text); }
    if (typeof gtag === 'function') gtag('event', 'letter_copy', { source: SOURCE });
  });
  $('letter-download')?.addEventListener('click', async () => {
    if (state.sample) return;
    const name = 'VRE-self-employment-goal-statement-draft.docx';
    const bytes = buildDocxBytes(currentLetter());
    if (typeof gtag === 'function') gtag('event', 'letter_download', { source: SOURCE, format: 'docx' });
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && typeof File === 'function' && navigator.canShare) {
      try {
        const file = new File([bytes], name, { type: DOCX_MIME });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'VR&E Self-Employment Goal Statement (draft)' }); return; }
      } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: DOCX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $('letter-print')?.addEventListener('click', () => {
    if (state.sample) return;
    document.body.classList.add('print-letter-only');
    const done = () => { document.body.classList.remove('print-letter-only'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
    if (typeof gtag === 'function') gtag('event', 'letter_print', { source: SOURCE });
  });
  $('sample-toggle')?.addEventListener('click', () => {
    state.sample = !state.sample;
    const b = $('sample-toggle'); b.setAttribute('aria-pressed', state.sample ? 'true' : 'false'); b.textContent = state.sample ? 'Back to my statement' : 'See a finished example';
    $('letter-sample-note').hidden = !state.sample;
    $('letter-copy').disabled = state.sample; $('letter-print').disabled = state.sample; $('letter-download').disabled = state.sample;
    paintLetter();
  });
  $('letter-clear')?.addEventListener('click', () => {
    if (!confirm('Clear the statement details saved on this device? Your form selections stay.')) return;
    state.priv = emptyPriv();
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    reveal({ silent: true });
  });
}

/* ─── Cost sheet card ──────────────────────────────────────────────────── */
function wireSheetCard() {
  const sheet = $('cost-sheet'); if (!sheet) return;
  const paint = () => { sheet.innerHTML = letterToHtml(buildCostSheet(buildInput()), esc); };
  paint();
  $('sheet-download')?.addEventListener('click', async () => {
    const name = 'VRE-startup-cost-sheet.docx';
    const bytes = buildDocxBytes(buildCostSheet(buildInput()));
    if (typeof gtag === 'function') gtag('event', 'letter_download', { source: SOURCE, format: 'docx-sheet' });
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && typeof File === 'function' && navigator.canShare) {
      try { const file = new File([bytes], name, { type: DOCX_MIME }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'VR&E startup cost sheet (draft)' }); return; } }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: DOCX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $('sheet-print')?.addEventListener('click', () => {
    document.body.classList.add('print-sheet-only');
    const done = () => { document.body.classList.remove('print-sheet-only'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
    if (typeof gtag === 'function') gtag('event', 'letter_print', { source: SOURCE, format: 'sheet' });
  });
}

/* ─── FAQ (visible; mirrors FAQPage JSON-LD) ───────────────────────────── */
const FAQ = [
  ['Will VR&E pay for me to start a business?', 'It can. Self-employment is a vocational goal VA may approve under 38 CFR 21.257 when a counselor finds it suitable for you, and the statute (38 U.S.C. 3104(a)(12)) lists license fees, essential equipment, supplies, and minimum stocks of materials among the services VA may provide to start one. You need a service-connected rating of 10% or more, an employment handicap from those conditions, and a business that does not aggravate them. The program funds startups only, and the money is for what it takes to open the doors, not to run the first year. It is not a loan.'],
  ['What will VR&E not pay for in a self-employment plan?', '38 CFR 21.214(f) prohibits four things outright: purchase or part payment of land or buildings; full or part payment of leases or rentals; purchase or rental of trucks, cars, or other transportation; and stocking a farm for animal husbandry. VA’s manual adds that a business related to medical marijuana or a legalized recreational substance cannot be authorized. Marketing, insurance, working capital, and payroll are not prohibited, but they are not on the regulation’s list either; VA frames its assistance as what is necessary to begin operations, so budget those yourself.'],
  ['Do I have to go through the SBA to get VR&E self-employment approved?', 'Yes. VA’s manual (M28C.IV.C.5) says the claimant must be referred to SBA or another business-counseling resource during the self-employment process, using a referral form and a release. SCORE mentors, Small Business Development Centers, and Veterans Business Outreach Centers all qualify and are free. The business plan you write with them must address the seven feasibility elements in 38 CFR 21.257(f) and stand on its own as a document a lender could read. A Self-Employment Panel in the VR&E office then reviews feasibility.'],
  ['Who approves a VR&E self-employment plan, and is there a dollar cap?', 'There is no cap, but the counselor cannot approve a self-employment plan alone at any amount. Under VA’s manual the VR&E Officer must concur with a plan whose total cost is $49,999 or less, and the Executive Director of VR&E Service must concur at $50,000 or more. The regulation the manual cites, 38 CFR 21.258, draws the line at $25,000 instead; both are current and they disagree, so expect your office to use the manual’s figure. Phase One of the plan, the feasibility work and the SBA referral, needs no concurrence above the counselor because nothing is being bought yet.'],
  ['Can VR&E fund a business I already own?', 'No. VA’s manual says VR&E only supports a startup business for a self-employment plan, and an existing business is not within the scope of the track. The one narrow exception is retroactive induction for training you already paid for at a VA-approved facility that is tied to an approved self-employment plan, and that is barred once the business has been operating for 12 months or more. For a running business the doors are SBA counseling and loans, state veteran-business programs, and SDVOSB or VOSB certification.'],
];
$('faq-items').innerHTML = FAQ.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

/* ─── Share URL (selections and amounts only; nothing personal, no limits, no fits) ── */
const URL_FIELDS = [['r', ratingEl], ['st', stageEl], ['bt', bizEl], ['pl', planEl], ['ob', objectionEl], ['op', operatingEl], ['cp', currentEl], ['sb', sbaEl], ['fn', finEl], ['mk', marketEl], ['lo', locEl], ['tr', trainingEl], ['cr', creditEl], ['xp', expEl], ['sub', subEl], ['dy', dischargeEl], ['fr', firstRatingEl], ['dep', depsEl], ['gu', giUsedEl]];
const SHARE_KEYS = new Set(['m', ...URL_FIELDS.map(([k]) => k), 'it', 'ev']);
function buildShareUrl() {
  const p = new URLSearchParams();
  p.set('m', state.mode);
  for (const [k, el] of URL_FIELDS) if (el.value !== '' && el.value != null) p.set(k, el.value);
  if (state.items.size) p.set('it', [...state.items].map(([id, amt]) => `${id}:${Math.round(amt) || 0}`).join('.'));
  if (state.evidence.size) p.set('ev', [...state.evidence].join('.'));
  return location.origin + location.pathname + '?' + p.toString() + '&source=' + SOURCE;
}
function hasShareParams(p) { return [...p.keys()].some(k => SHARE_KEYS.has(k)); }
function loadFromUrl() {
  const p = new URLSearchParams(location.search);
  if (!hasShareParams(p)) return false;
  if (!p.has('r')) { if (p.has('m') && MODE_BRIEF[p.get('m')]) { setMode(p.get('m')); history.replaceState(null, '', location.pathname); } return false; }
  setMode(MODE_BRIEF[p.get('m')] ? p.get('m') : 'idea');
  for (const [k, el] of URL_FIELDS) if (p.has(k)) el.value = p.get(k);
  if (p.has('it')) for (const pair of p.get('it').split('.')) {
    const [id, amt] = pair.split(':'); if (!ITEM_BY_ID[id]) continue;
    state.items.set(id, Number(amt) || 0);
    const cb = document.querySelector(`[data-item="${id}"]`), ai = document.querySelector(`[data-amt="${id}"]`);
    if (cb) { cb.checked = true; cb.closest('.item-row').classList.add('checked'); }
    if (ai && Number(amt)) { ai.value = String(Number(amt)); ai.setAttribute('value', String(Number(amt))); }
  }
  if (p.has('ev')) p.get('ev').split('.').filter(Boolean).forEach(x => state.evidence.add(x));
  syncConditionalFields();
  if (['sb', 'fn', 'mk', 'lo', 'tr', 'xp', 'dy', 'cr', 'sub'].some(k => p.has(k))) $('assumptions-drawer').open = true;
  history.replaceState(null, '', location.pathname);
  reveal();
  return true;
}

/* ─── Email capture ────────────────────────────────────────────────────── */
async function sendResultsEmail(email, statusEl2, btn, placement) {
  if (!email || !email.includes('@')) { statusEl2.textContent = 'Please enter a valid email.'; statusEl2.className = 'email-status error'; return false; }
  btn.disabled = true;
  statusEl2.textContent = 'Sending…'; statusEl2.className = 'email-status';
  try {
    const res = await fetch('/api/email-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, resultsUrl: buildShareUrl(), source: SOURCE }) });
    const data = await res.json();
    if (res.ok && data.success) {
      statusEl2.textContent = '✓ Check your inbox: your packet link is on the way.'; statusEl2.className = 'email-status success';
      if (typeof gtag === 'function') gtag('event', 'email_capture', { placement, source: SOURCE });
      return true;
    }
    statusEl2.textContent = data.error || 'Something went wrong. Please try again.'; statusEl2.className = 'email-status error';
  } catch { statusEl2.textContent = 'Network error. Please try again.'; statusEl2.className = 'email-status error'; }
  finally { btn.disabled = false; }
  return false;
}
$('hero-capture-form').addEventListener('submit', async e => { e.preventDefault(); if (await sendResultsEmail($('hero-email-input').value.trim(), $('hero-email-status'), $('hero-email-btn'), 'hero')) $('hero-email-input').value = ''; });
$('email-results-form').addEventListener('submit', async e => { e.preventDefault(); if (await sendResultsEmail($('email-input').value.trim(), $('email-status'), $('email-submit-btn'), 'bottom')) $('email-input').value = ''; });
$('print-btn').addEventListener('click', () => window.print());
$('share-btn').addEventListener('click', async () => {
  const btn = $('share-btn');
  try { await navigator.clipboard.writeText(buildShareUrl()); const o = btn.textContent; btn.textContent = '✓ Link Copied!'; setTimeout(() => { btn.textContent = o; }, 2000); }
  catch { prompt('Copy this link:', buildShareUrl()); }
});

/* ─── Interactive tour (house standard, copied from VFI via vre-approval-prep) ── */
const INPUT_TOUR_KEY = 'vsep-tour-seen', RESULTS_TOUR_KEY = 'vsep-results-tour-seen';
const INPUT_TOUR = [
  { id: 'welcome', target: null, label: 'Step 1 of 7', title: 'Welcome: 60 seconds, then it’s all yours', text: 'VR&E can pay for a veteran to start a business. The rules are specific and mostly unread. This reads your startup list against them, shows who signs, scores the feasibility work, and drafts the statement you bring to the counselor. Fill in your real answers as we go; exit anytime.' },
  { id: 'pills', target: '#mode-pills', label: 'Step 2 of 7', title: 'What brings you here?', text: 'A business idea, already in VR&E, a counselor pushing back, or a business you already run. The cards are the same; which one leads and how the verdict reads changes. Click one.' },
  { id: 'you', target: '#card-you', label: 'Step 3 of 7', title: 'Your rating and where you are', text: 'A rating of 10% or more opens the evaluation. Where you are with VR&E decides which card leads.' },
  { id: 'biz', target: '#card-items', label: 'Step 4 of 7', title: 'Your startup list', text: 'Check what you need money for and put a rough amount beside each. Every item is tagged the way the regulation treats it: on the list, not on the list, or prohibited. Only the green ones count, and the amounts are what the packet is built from.' },
  { id: 'assumptions', target: '#assumptions-drawer', label: 'Step 5 of 7', title: 'Your limits and the feasibility work', text: 'All optional, and this is where the statement gets its strength: how your rated conditions limit work, why self-employment fits them, and the SBA, financing, and market work you have done. The limits stay on your device.' },
  { id: 'live', target: '#live-strip', label: 'Step 6 of 7', title: 'Your packet, live', text: 'How many of the eight feasibility elements you have, how much of your list is fundable, and who signs, updating as you answer.' },
  { id: 'gate', target: '#compare-btn', label: 'Step 7 of 7', title: 'Build the packet', text: 'Press it, and we’ll walk through the results and the statement together.' },
];
const RESULTS_TOUR = [
  { id: 'r-hero', target: '#hero-verdict', label: 'Results 1 of 5', title: 'The verdict', text: 'What VR&E can buy from your list, who signs, and how many feasibility elements you have. Every gap named here is a link: click one and it takes you to the field that fixes it.' },
  { id: 'r-lead', target: '#cards-panel > details:first-child', label: 'Results 2 of 5', title: 'The card that leads', text: 'For your situation, this is the one to read first. Open the others the same way; each carries its cite, the exact text behind a tap, and a verified date.' },
  { id: 'r-letter', target: '#letter-sheet', label: 'Results 3 of 5', title: 'Your statement', text: 'Drafted from your answers. Every highlighted bracket is something only you can supply. Section 5 asks only for items the regulation names; the rest moves to a line saying you fund it yourself. “See a finished example” shows what done looks like.' },
  { id: 'r-fill', target: '#fill-in', label: 'Results 4 of 5', title: 'Fill it in, one section at a time', text: 'Paste the findings from your rating decision, add your jobs and the business in a sentence, and the statement above rewrites itself as you type. Saved in your browser only; never sent, never in a link.' },
  { id: 'r-capture', target: '#email-results-container', label: 'Results 5 of 5', title: 'Don’t lose this', text: 'Email yourself the link; it rebuilds your selections, your list with its amounts, and the statement with its brackets. That’s the walkthrough.' },
];
const tourState = { active: false, i: 0, steps: INPUT_TOUR, seenKey: INPUT_TOUR_KEY, timer: null };
function isTourActive() { return tourState.active; }
function tourEls() { return { root: $('tour-root'), spot: $('tour-spotlight'), tip: $('tour-tooltip') }; }
function positionTour() {
  const step = tourState.steps[tourState.i]; if (!step) return;
  const { spot, tip } = tourEls();
  if (!step.target) {
    spot.style.cssText = `top:${scrollY + innerHeight / 2}px; left:50vw; width:0; height:0;`;
    if (!matchMedia('(max-width: 560px)').matches) {
      tip.style.left = Math.max(24, (innerWidth - Math.min(380, innerWidth - 48)) / 2) + 'px';
      tip.style.top = (scrollY + innerHeight / 2 - (tip.offsetHeight || 220) / 2) + 'px';
    }
    return;
  }
  const target = document.querySelector(step.target);
  if (!target || target.offsetParent === null) return;
  const r = target.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return;
  const pad = 8;
  Object.assign(spot.style, { top: (r.top + scrollY - pad) + 'px', left: (r.left + scrollX - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
  const tipH = tip.offsetHeight || 180;
  const below = r.bottom + 16 + tipH < innerHeight || r.top < tipH + 32;
  if (matchMedia('(max-width: 560px)').matches) { tip.style.top = ''; tip.style.left = ''; }
  else {
    tip.style.top = (below ? r.bottom + scrollY + 14 : r.top + scrollY - tipH - 14) + 'px';
    tip.style.left = Math.max(12, Math.min(r.left + scrollX, innerWidth - tip.offsetWidth - 12)) + 'px';
  }
}
function showTourStep(i, dir = 1) {
  if (i < 0 || i >= tourState.steps.length) return endTour();
  const step = tourState.steps[i];
  if (step.target) { const el = document.querySelector(step.target); if (!el || el.offsetParent === null) return showTourStep(i + dir, dir); }
  tourState.i = i;
  const visible = tourState.steps.filter(s => { if (!s.target) return true; const el = document.querySelector(s.target); return el && el.offsetParent !== null; });
  $('tour-step-label').textContent = `${step.label.split(' ')[0]} ${visible.indexOf(step) + 1} of ${visible.length}`;
  $('tour-title').textContent = step.title;
  $('tour-text').textContent = step.text;
  $('tour-next').textContent = i === tourState.steps.length - 1 ? 'Done ✓' : 'Next';
  $('tour-back').style.visibility = i === 0 ? 'hidden' : 'visible';
  if (step.id === 'assumptions') $('assumptions-drawer').open = true;
  if (step.id === 'r-fill') { const fi = $('fill-in'); if (fi) fi.open = true; }
  if (!step.target) window.scrollTo({ top: 0, behavior: 'smooth' });
  else { const target = document.querySelector(step.target); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  setTimeout(positionTour, 350);
}
function startTourWith(steps, seenKey) {
  tourState.steps = steps; tourState.seenKey = seenKey; tourState.active = true; tourState.i = 0;
  $('tour-root').hidden = false;
  showTourStep(0);
  clearInterval(tourState.timer);
  tourState.timer = setInterval(positionTour, 400);
}
function endTour() {
  tourState.active = false;
  clearInterval(tourState.timer);
  $('tour-root').hidden = true;
  try { localStorage.setItem(tourState.seenKey, '1'); } catch {}
}
$('tour-next').addEventListener('click', () => showTourStep(tourState.i + 1, 1));
$('tour-back').addEventListener('click', () => showTourStep(tourState.i - 1, -1));
$('tour-exit').addEventListener('click', endTour);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tourState.active) endTour(); });
document.addEventListener('click', e => {
  if (!tourState.active || e.detail === 0) return;
  if (e.target.closest('#tour-tooltip') || e.target.closest('#tour-restart')) return;
  if (e.target.closest('#compare-btn') || e.target.closest('.mode-pill')) return;
  const r = $('tour-spotlight').getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) endTour();
});
$('tour-restart').addEventListener('click', () => startTourWith(INPUT_TOUR, INPUT_TOUR_KEY));
addEventListener('resize', positionTour);

/* ─── Intro: collapse on phones, one tap to expand (content stays in the HTML) ── */
{
  const about = $('about-this-tool');
  if (about && !about.querySelector('.about-more')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'about-more no-print'; b.textContent = 'Read more';
    b.addEventListener('click', () => { const open = about.classList.toggle('open'); b.textContent = open ? 'Show less' : 'Read more'; });
    about.appendChild(b);
  }
}

/* ─── Init ─────────────────────────────────────────────────────────────── */
loadDraft();
setMode('idea');
syncConditionalFields();
const arrived = loadFromUrl();
let tourSeen = true;
try { tourSeen = localStorage.getItem(INPUT_TOUR_KEY) === '1'; } catch {}
if (!arrived && !window.__vsepArrivalHadParams && !tourSeen) setTimeout(() => startTourWith(INPUT_TOUR, INPUT_TOUR_KEY), 600);
updateLiveStrip();
