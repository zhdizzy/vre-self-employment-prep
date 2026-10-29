// VR&E Self-Employment Prep — the engine, shared by the page (script.js) and the node harness (test/sim.mjs).
// No DOM in here. Rules, not weights: each feasibility element and each fit factor resolves to 'doc'
// (documented), 'thin', or 'miss' from the input shape built by script.js. Startup items resolve to one of
// three buckets (fundable / unlisted / prohibited) and only the fundable bucket ever counts toward the total.

import { signer } from './data/rules.js';
import { ITEMS, ITEM_BY_ID } from './data/items.js';
import { FIT_FACTORS } from './data/fit.js';
import { CHECKLIST } from './data/checklist.js';
import { buildLetter } from './letter.js';

export const VRE_NO_LIMIT_DISCHARGE_YEAR = 2013;
export const VRE_WINDOW_YEARS = 12;
export const EAA_MONTHS = 2;
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');

/* ─── Eligibility (same gate as every VR&E plan) ────────────────────────── */
export function eligibility(s, now = new Date().getFullYear()) {
  if (s.unrated) return { st: 'miss', why: 'VR&E needs a service-connected rating of 10% or more. There is no evaluation, and no self-employment track, without one. SDVOSB certification, by contrast, opens at any rating including 0%.', act: 'File the claim first. An Intent to File locks your effective date while you build it.', link: ['/va-combined/', 'Estimate your rating'] };
  if (s.pending) return { st: 'thin', why: 'Your claim is pending. You can do every piece of the feasibility work now and apply the day it posts.', act: 'Make the SBA appointment and start the plan; add the rating when it arrives.' };
  if (s.rating === 0) return { st: 'miss', why: 'A 0% rating does not open VR&E; the program needs 10% or more. It does open SDVOSB certification.', act: 'If the conditions have worsened, an increase claim is the first step.', link: ['/va-combined/', 'Check the criteria'] };
  let win = { st: 'doc' };
  if (s.dischargeYear && s.dischargeYear < VRE_NO_LIMIT_DISCHARGE_YEAR) {
    if (!s.firstRatingYear) win = { st: 'thin', why: `Discharged ${s.dischargeYear}, so a 12-year window applies, running from the later of discharge or your first rating notice.`, act: 'Enter the year of your first VA rating in the drawer to check the window.' };
    else {
      const anchor = Math.max(s.dischargeYear, s.firstRatingYear);
      win = (now - anchor) <= VRE_WINDOW_YEARS ? { st: 'doc' } : { st: 'miss', why: `Discharged ${s.dischargeYear}, first rated ${s.firstRatingYear}: the 12-year window has passed. A serious employment handicap finding can extend it.`, act: 'Ask the counselor about an extension before assuming it is closed; put the request in writing.' };
    }
  }
  if (win.st !== 'doc') return win;
  if (s.rating === 10) return { st: 'thin', why: 'At 10%, entitlement requires a serious employment handicap finding, not just an employment handicap. The bar is higher, and the statement has to make the severity case.', act: 'Lead section 2 of the statement with VA’s own findings and the limits that make traditional employment unsustainable.' };
  const windowNote = s.dischargeYear && s.dischargeYear < VRE_NO_LIMIT_DISCHARGE_YEAR ? ', inside the 12-year window' : s.dischargeYear ? ', no time limit for discharges in 2013 or later' : '';
  return { st: 'doc', why: `Rated ${s.rating}%${windowNote}. The rating gets you the evaluation; the employment handicap finding opens the program; the counselor’s suitability finding opens this track.`, act: '' };
}

/* ─── Startup items → buckets ───────────────────────────────────────────── */
export function buckets(s) {
  const out = { fundable: [], unlisted: [], prohibited: [], totals: { fundable: 0, unlisted: 0, prohibited: 0, all: 0 }, missingAmounts: [] };
  const items = s.items || {};
  for (const it of ITEMS) {
    if (!(it.id in items)) continue;
    const amount = Math.max(0, Number(items[it.id]) || 0);
    out[it.bucket].push({ item: it, amount });
    out.totals[it.bucket] += amount; out.totals.all += amount;
    if (!amount && it.bucket === 'fundable') out.missingAmounts.push(it);
  }
  out.substance = s.substance === 'yes';
  out.sign = signer(out.totals.fundable);
  return out;
}

/* ─── The eight feasibility elements (38 CFR 21.257(f) ×7 + the plan itself) ── */
export function feasibility(s) {
  const b = buckets(s); const p = s.priv || {};
  const out = [];
  const planSt = s.plan === 'draft' ? 'doc' : s.plan === 'started' ? 'thin' : 'miss';
  const marketSt = s.market === 'written' ? 'doc' : s.market === 'informal' ? 'thin' : 'miss';
  // 1 viability
  out.push({ id: 'viability', n: 1, title: 'Economic viability of the business', short: 'viability',
    st: planSt === 'doc' && marketSt !== 'miss' ? 'doc' : (planSt !== 'miss' || marketSt !== 'miss') ? 'thin' : 'miss',
    why: planSt === 'doc' && marketSt !== 'miss' ? 'A drafted plan with market work behind it is what the panel reads for viability: can this business make a reasonable profit.' : 'Viability is the panel’s first question: can this business operate and make a reasonable profit. It is answered by the plan’s numbers and the market work, not by confidence.',
    act: planSt === 'doc' && marketSt !== 'miss' ? '' : 'Draft the revenue and cost pages of the plan with your SBA counselor; a one-year cash projection is the minimum.' });
  // 2 cost analysis
  const hasFund = b.fundable.length > 0;
  const clean = hasFund && !b.prohibited.length && !b.missingAmounts.length;
  out.push({ id: 'cost', n: 2, title: 'Cost analysis: what VA would provide', short: 'cost analysis',
    st: clean ? 'doc' : hasFund ? 'thin' : 'miss',
    why: clean ? `Your VR&E ask is ${fmtUSD(b.totals.fundable)} across ${b.fundable.length} item${b.fundable.length === 1 ? '' : 's'}, every one of them on the regulation’s list with an amount. That is the cost analysis the regulation requires.` : hasFund ? (b.prohibited.length ? `Your list includes ${b.prohibited.map(x => x.item.short).join(', ')}, which 38 CFR 21.214(f) prohibits. Leave it in the plan as a cost you cover; take it out of the VR&E ask.` : 'You have the right items checked; the cost analysis needs a dollar figure for each.') : 'The regulation requires a cost analysis specifying the amount and types of assistance VA will provide. Nothing is on your list yet.',
    act: clean ? '' : hasFund ? (b.prohibited.length ? 'Uncheck the prohibited items, or keep them and fund them yourself in the plan.' : 'Enter a quoted amount beside each item.') : 'Check the startup items in the form and enter a quote for each.' });
  // 3 market
  out.push({ id: 'market', n: 3, title: 'Market analysis for your services or products', short: 'market analysis',
    st: marketSt, why: marketSt === 'doc' ? 'Written market analysis in hand: who buys, what they pay now, who else sells it.' : marketSt === 'thin' ? 'You have talked to people and looked around. The panel wants it on paper: customers, price points, competitors, how they find you.' : 'The regulation names a market analysis as a required element, and there is none yet.',
    act: marketSt === 'doc' ? '' : 'An SBDC or VBOC counselor will walk you through a one-page market analysis for free.', link: ['https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan', 'SBA business plan guide'] });
  // 4 financing
  const finSt = s.financing && s.financing !== 'none' ? 'doc' : s.credit === 'yes' ? 'thin' : 'miss';
  out.push({ id: 'financing', n: 4, title: 'Non-VA financing: your resources, a bank, others', short: 'financing',
    st: finSt, why: finSt === 'doc' ? 'You have named where the rest of the money comes from. VA is one source among several in the regulation’s frame, and the panel looks for the others.' : finSt === 'thin' ? 'You know your credit. Now name a source for what VR&E will not cover: savings, a bank, an SBA-backed loan, family.' : 'The regulation lists availability of non-VA financing as a required element. VA does not fund the whole business, and the plan has to show what covers the rest.',
    act: finSt === 'doc' ? '' : 'Pull your credit report, write a one-page personal financial statement, and name at least one source besides VA.' });
  // 5 SBA
  const sbaSt = (s.sba === 'met' || s.sba === 'review') ? 'doc' : s.sba === 'set' ? 'thin' : 'miss';
  out.push({ id: 'sba', n: 5, title: 'Coordination with the SBA', short: 'SBA coordination',
    st: sbaSt, why: sbaSt === 'doc' ? 'You have met with SBA or one of its partners. The referral is mandatory on every self-employment case, so you are ahead of the process.' : sbaSt === 'thin' ? 'Appointment set. Bring the confirmation; the counselor signs the referral for a meeting already on the calendar.' : 'The referral to SBA (or SCORE, an SBDC, a VBOC) is mandatory and free, and the regulation lists evidence of SBA coordination as a required element. Nothing yet.',
    act: sbaSt === 'doc' ? '' : 'Book a Veterans Business Outreach Center appointment this week.', link: ['https://www.sba.gov/local-assistance/find?type=Veteran%27s%20Business%20Outreach%20Center', 'Find a VBOC'] });
  // 6 site
  const loc = s.location || 'home';
  const siteSt = (loc === 'home' || loc === 'online') ? 'doc' : 'thin';
  out.push({ id: 'site', n: 6, title: 'The site and its cost', short: 'site',
    st: siteSt, why: siteSt === 'doc' ? `${loc === 'online' ? 'Online only, run from home' : 'Home-based'}: the site is your home at no added cost. That answers the element, and the manual’s own follow-up rules cover online-only businesses.` : `A ${loc === 'leased' ? 'leased' : 'purchased'} space has to appear in the plan with its cost, and VA will not pay for it: 38 CFR 21.214(f) bars land, buildings, leases, and rent. It is a cost you cover.`,
    act: siteSt === 'doc' ? '' : 'Get a written quote for the space and put it in the plan under your own financing.' });
  // 7 training plan
  const trainingText = !!(p.trainingPlan || '').trim();
  let trSt, trWhy, trAct = '';
  if (s.training === 'none') { trSt = 'doc'; trWhy = 'No training needed to operate: say so in the plan. The element asks for a training plan; “already qualified, here is the proof” is a complete answer.'; }
  else if (s.training === 'short') { trSt = trainingText ? 'doc' : 'thin'; trWhy = trainingText ? 'A short course or certification, named with its provider. That is the kind of training this track pays for.' : 'A short course or certification fits the track. Name it: provider, length, cost.'; trAct = trainingText ? '' : 'Fill the training line in the statement.'; }
  else if (s.training === 'degree') { trSt = 'miss'; trWhy = 'Training on this track is limited to short-term skills training that does not lead to a degree or diploma (M28C.IV.C.5 5.04.a). A degree belongs in a different kind of plan; it can come first, with the business after, but not inside a self-employment plan.'; trAct = 'Decide which plan you are asking for. The GI Bill vs. VR&E tool and VR&E Approval Prep cover the degree route.'; }
  else { trSt = 'thin'; trWhy = 'The regulation requires a training plan to operate a successful business. Tell us whether you need a course, a license, or nothing.'; trAct = 'Answer the training question in the drawer.'; }
  out.push({ id: 'training', n: 7, title: 'A training plan to operate the business', short: 'training plan', st: trSt, why: trWhy, act: trAct });
  // 8 the plan itself
  out.push({ id: 'plan', n: 8, title: 'A written business plan, lender-ready', short: 'business plan',
    st: planSt, why: planSt === 'doc' ? 'You have a complete draft. The manual’s standard is a stand-alone document that could describe the business to a lender; have your SBA counselor read it against that.' : planSt === 'thin' ? 'Started. The seven elements above are its outline; finish it with an SBA counselor so it reads as a lender would expect.' : 'You write the plan, with free help from SBA. Without it there is nothing for the panel to review.',
    act: planSt === 'doc' ? '' : 'Use SBA’s plan template and build it to the seven headings on this page.', link: ['https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan', 'SBA business plan guide'] });
  return out;
}

/* ─── The six fit factors (M28C.IV.C.5 5.03) read against the inputs ─────── */
export function fit(s) {
  const b = buckets(s);
  const has = id => id in (s.items || {});
  const ev = s.evidence || [];
  const ans = {};
  ans.skills = s.experience === 'worked' ? ['doc', 'You have worked in this line of work. Put the years and the roles in the statement.'] : s.experience === 'some' ? ['thin', 'Some experience. Name the transferable skills from service and the gap the training covers.'] : s.experience === 'none' ? ['miss', 'No experience in this line yet. The counselor will ask how you know you can do the work; the training plan and SBA counseling are the answer.'] : ['thin', 'Tell us your experience in this line of work (drawer).'];
  ans.bizskills = (s.sba === 'met' || s.sba === 'review') ? ['doc', 'SBA counseling is under way, which is how the manual expects business skills to be built.'] : has('mgmt') ? ['doc', 'You are asking for the management training the regulation allows; pair it with SBA’s free Boots to Business.'] : s.sba === 'set' ? ['thin', 'SBA appointment set. Add a business or bookkeeping course to the ask if you have not run a business before.'] : ['miss', 'Nothing yet shows business skills. Book SBA counseling and consider the management course the regulation allows.'];
  const lims = (s.limits || []).length, fits = (s.seFits || []).length;
  ans.stability = lims && fits ? ['doc', 'You have named your limits and the controls self-employment gives you over them. That is the stability answer, framed the way the manual frames it.'] : (lims || fits) ? ['thin', lims ? 'Limits named. Now say which controls self-employment gives you over them (drawer).' : 'You said why self-employment fits. Check the limits it fits (drawer) so the two connect in the statement.'] : ['miss', 'The counselor assesses how your conditions affect running a business. Check your limits and the controls self-employment gives you.'];
  const fin = s.financing && s.financing !== 'none', cr = s.credit === 'yes';
  ans.resources = fin && cr ? ['doc', 'Financing named and credit checked. Bring the personal financial statement.'] : (fin || cr) ? ['thin', fin ? 'Financing named; check your credit before the meeting, the manual lists it under financial readiness.' : 'Credit checked; name at least one non-VA funding source.'] : ['miss', 'Personal resources is a factor and nothing here shows yours yet.'];
  ans.legal = ev.includes('licenses') ? ['doc', 'You have the licensing requirements printed. Add your entity plan (LLC or sole proprietor) and the insurance the trade requires.'] : (has('licenses') || s.training === 'short' || s.bizType === 'practice') ? ['thin', 'Licenses or certification are in your plan. Print the requirements page from the state or county and bring it.'] : ['thin', 'Even a business with no license needs an entity, a tax ID, and often a local permit. Say what applies.'];
  const effort = (s.plan !== 'none' && s.plan ? 1 : 0) + (s.sba && s.sba !== 'none' ? 1 : 0) + (s.market && s.market !== 'none' ? 1 : 0);
  ans.commitment = effort >= 2 ? ['doc', 'The plan, the SBA contact, the market work: the record shows the commitment, which is better than asserting it.'] : effort === 1 ? ['thin', 'One piece of groundwork done. Two or three is a record.'] : ['miss', 'Nothing yet shows the work. Make the SBA appointment and start the plan; both are free and both are evidence.'];
  return FIT_FACTORS.map(f => ({ ...f, st: ans[f.id][0], answer: ans[f.id][1] }));
}

/* ─── Solve ─────────────────────────────────────────────────────────────── */
export function solve(s) {
  const elig = eligibility(s);
  const b = buckets(s);
  const feas = feasibility(s);
  const feasCount = feas.filter(e => e.st === 'doc').length;
  const gaps = feas.filter(e => e.st !== 'doc');
  const fitList = fit(s);
  const startupOnly = s.mode === 'own' && s.operating === 'over12';
  const retroOpen = s.mode === 'own' && s.operating === 'under12';
  const visible = CHECKLIST.filter(c => c.showIf({ ...s, itemIds: Object.keys(s.items || {}) }));
  const have = visible.filter(c => (s.evidence || []).includes(c.id)).length;
  return { s, elig, buckets: b, sign: b.sign, feas, feasCount, gaps, fit: fitList, startupOnly, retroOpen, evidence: { have, total: visible.length, visible }, letter: buildLetter(s) };
}
