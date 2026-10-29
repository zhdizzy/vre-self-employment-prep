// VR&E Self-Employment Prep — the statement engine.
// buildLetter(state) returns sections of blocks; each block is a list of "parts" where a part is
// { t: 'text' } (known) or { b: 'INSTRUCTION' } (a bracket the veteran fills in). Seven sections:
// background; employment handicap and why self-employment fits it; the business; feasibility work done;
// what I am asking VR&E to consider funding (fundable bucket only); training plan; my request.
// No client facts live here. Everything is template + the veteran's own entries.

import { LIMIT_BY_ID, FIT_BY_ID } from './data/limits.js';
import { SE_FIT_BY_ID } from './data/fit.js';
import { ITEMS, ITEM_BY_ID, BIZ_BY_ID } from './data/items.js';
import { CHECKLIST } from './data/checklist.js';
import { signer } from './data/rules.js';

const T = t => ({ t });
const B = b => ({ b });
const V = (value, bracket) => (value && String(value).trim()) ? T(String(value).trim()) : B(bracket);
const P = (...parts) => ({ type: 'p', items: [parts.flat()] });
const UL = items => ({ type: 'ul', items: items.map(i => [i].flat()) });
const OL = items => ({ type: 'ol', items: items.map(i => [i].flat()) });
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');
function joinList(arr) {
  if (arr.length <= 1) return arr.join('');
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const BIZ_PHRASE = { service: 'a service business', trade: 'a skilled-trade business', product: 'a product business', online: 'an online business', practice: 'a licensed professional practice', food: 'a food business', other: 'a business' };

export function buildLetter(s) {
  const p = s.priv || {};
  const limits = (s.limits || []).map(id => LIMIT_BY_ID[id]).filter(Boolean);
  const seFits = (s.seFits || []).map(id => SE_FIT_BY_ID[id]).filter(Boolean);
  const jobs = (p.jobs || []).filter(j => j && j.title && j.title.trim());
  const items = s.items || {};
  const fund = ITEMS.filter(i => i.bucket === 'fundable' && i.id in items).map(i => ({ item: i, amount: Math.max(0, Number(items[i.id]) || 0) }));
  const self = ITEMS.filter(i => i.bucket !== 'fundable' && i.id in items).map(i => ({ item: i, amount: Math.max(0, Number(items[i.id]) || 0) }));
  const fundTotal = fund.reduce((a, x) => a + x.amount, 0);
  const sign = signer(fundTotal);
  const bizName = (p.bizName || '').trim();
  const bizRef = bizName || null;
  const severe = limits.length >= 3 && seFits.length >= 2; // the record supports the "only reasonably feasible goal" language

  const header = [
    [T('SELF-EMPLOYMENT GOAL STATEMENT')],
    [T('Veteran Readiness and Employment (Chapter 31), Self-Employment Track')],
    [T('From: '), B('YOUR FULL NAME')],
    [T('To: '), V(p.counselor, 'COUNSELOR NAME'), T(', Vocational Rehabilitation Counselor')],
    [T('Date: '), B('DATE')],
  ];

  const howTo = [
    'Everything in [BRACKETS] needs your real information.',
    'Rewrite any sentence that does not sound like you. The counselor should hear your voice, not a template.',
    'Only include what is true and what you are comfortable having in your VR&E file.',
    'Section 5 asks only for items the regulation names. Everything else stays in the plan as a cost you cover. Do not add the truck.',
    'Send it before the appointment, bring a printed copy, and ask for two minutes to walk through it before the form edit starts.',
    'Delete this box before you send it.',
  ];

  const sections = [];

  /* 1. Background */
  {
    const blocks = [];
    blocks.push(P(T('I served in the '), V(p.branch, 'BRANCH'), T(' from '), V(p.serviceYears, 'START YEAR TO END YEAR'), T('. '), B('ONE LINE ON WHAT YOU DID IN SERVICE, AND ANY EDUCATION OR TRAINING SINCE')));
    const ratingText = s.rating != null ? `${s.rating} percent` : null;
    blocks.push(P(T('VA rates my service-connected '), V(p.conditions, 'YOUR SERVICE-CONNECTED CONDITIONS'), T(' at '), V(ratingText, 'COMBINED RATING'), T(' combined, effective '), B('EFFECTIVE DATE ON YOUR DECISION'), T('. I am requesting that self-employment be evaluated and approved as my vocational goal under 38 CFR 21.257, with a plan on the Self-Employment track to start '), bizRef ? T(bizRef) : B('BUSINESS NAME OR WORKING TITLE'), T(`, ${BIZ_PHRASE[s.bizType] || 'a business'}${(p.bizDesc || '').trim() ? ` that ${(p.bizDesc || '').trim().replace(/[.\s]+$/, '')}` : ''}.`)));
    sections.push({ n: 1, title: 'Background', blocks });
  }

  /* 2. Employment handicap, and why self-employment fits it */
  {
    const blocks = [];
    blocks.push(P(T('My '), B('MONTH YEAR'), T(' rating decision documents the ways my service-connected disabilities limit my ability to work. Among VA’s findings are:')));
    const findings = (p.ratingWording || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (findings.length) blocks.push(UL(findings.map(f => T(`“${f.replace(/^["“]|["”]$/g, '')}”`))));
    else blocks.push(UL([B('PASTE THE EXACT FINDINGS FROM YOUR RATING DECISION, ONE PER LINE, e.g., the functional limitations VA listed under each condition')]));
    if (limits.length) blocks.push(P(T(`In day-to-day terms: ${joinList(limits.map(l => l.letterPhrase))}.`)));
    if (jobs.length) {
      blocks.push(P(T('My work history since leaving the service shows how these limitations play out in employment:')));
      blocks.push(UL(jobs.map(j => {
        if (j.worked) { const fit = FIT_BY_ID[j.reason]; return [T(`${j.title.trim()}. This role offered ${fit ? fit.phrase : ''}`), fit ? T('') : B('WHAT MADE IT WORK'), T(', and that is the environment self-employment lets me build on purpose.')]; }
        const lim = LIMIT_BY_ID[j.reason];
        return [T(`${j.title.trim()}. `), lim ? T(cap(lim.letterPhrase)) : B('WHY IT DID NOT WORK, TIED TO YOUR CONDITIONS'), T(', and the role was not sustainable for me.')];
      })));
    } else {
      blocks.push(P(T('My work history since leaving the service shows how these limitations play out in employment: '), B('LIST TWO TO FOUR JOBS SINCE SERVICE. FOR EACH, SAY WHETHER IT WORKED FOR YOU AND WHY, TIED TO YOUR CONDITIONS.')));
    }
    if (seFits.length) {
      blocks.push(P(T(`Self-employment fits these limitations in ways an employer’s job does not. Running my own business gives me ${joinList(seFits.map(f => f.phrase))}.`)));
      if (severe) blocks.push(P(T('Given the number and severity of these limitations, I believe self-employment is not simply a preference but the only reasonably feasible vocational goal for me, in the sense 38 CFR 21.257(b) describes, and I ask that the evaluation address that question directly.')));
      else blocks.push(P(T('For these reasons I believe self-employment is a suitable vocational goal for me under 38 CFR 21.257(a), and the business is built so that it does not aggravate my service-connected conditions.')));
    } else {
      blocks.push(P(T('Self-employment fits these limitations because '), B('SAY WHICH CONTROLS IT GIVES YOU: your hours, your environment, your pace, no public-contact duties, work from home, flexibility for appointments'), T('. The business is built so that it does not aggravate my service-connected conditions.')));
    }
    sections.push({ n: 2, title: 'My employment handicap, and why self-employment fits it', blocks });
  }

  /* 3. The business */
  {
    const blocks = [];
    blocks.push(P(bizRef ? T(`${bizRef} is `) : [B('BUSINESS NAME'), T(' is ')], T(`${BIZ_PHRASE[s.bizType] || 'a business'}`), (p.bizDesc || '').trim() ? T(` that ${(p.bizDesc || '').trim().replace(/[.\s]+$/, '')}.`) : [T(' that '), B('WHAT IT SELLS, IN ONE SENTENCE'), T('.')]));
    blocks.push(P(T('My customers are '), V(p.customers, 'WHO BUYS, AND WHY THEY BUY FROM YOU'), T('. '), (s.location === 'leased' || s.location === 'purchased') ? [T('The business will operate from '), V(p.siteDesc, 'THE SPACE AND ITS COST'), T(', a cost I will cover myself; I understand VA does not pay for land, buildings, leases, or rent.')] : s.location === 'online' ? T('The business operates online from my home, at no added cost for a site.') : [T('The business will operate from my home'), (p.siteDesc || '').trim() ? T(` (${(p.siteDesc || '').trim()})`) : T(''), T(', at no added cost for a site.')]));
    if (s.bizType === 'online') blocks.push(P(T('I understand the manual’s case-management procedures cover online-only businesses, and I will provide access for review during the follow-up period.')));
    sections.push({ n: 3, title: 'The business', blocks });
  }

  /* 4. Feasibility work done so far */
  {
    const blocks = [];
    blocks.push(P(T('I have begun the feasibility work the regulation describes in 38 CFR 21.257(f):')));
    const items = [];
    if (s.sba === 'met' || s.sba === 'review') items.push([T('SBA coordination: I have met with '), V(p.sbaContact, 'THE OFFICE (VBOC, SBDC, SCORE) AND DATE'), T(s.sba === 'review' ? ', and have their written review of my draft plan.' : '.')]);
    else if (s.sba === 'set') items.push([T('SBA coordination: my appointment with '), V(p.sbaContact, 'THE OFFICE (VBOC, SBDC, SCORE)'), T(' is on '), B('DATE'), T('. I ask that the Appendix FM referral and VA Form 3288 be completed so it is in the file before I go.')]);
    else items.push([T('SBA coordination: '), B('BOOK A VBOC, SBDC, OR SCORE APPOINTMENT AND PUT THE DATE HERE'), T('. I ask that the referral be completed at this meeting.')]);
    items.push(s.market === 'written' ? [T('Market analysis: completed in writing and attached.')] : s.market === 'informal' ? [T('Market analysis: I have surveyed the local market informally and am writing it up with my SBA counselor by '), B('DATE'), T('.')] : [T('Market analysis: '), B('WHO BUYS, WHAT THEY PAY NOW, WHO ELSE SELLS IT; OR THE DATE YOU WILL HAVE IT')]);
    items.push(s.financing && s.financing !== 'none' ? [T(`Non-VA financing: ${({ savings: 'my own savings', bank: 'a bank or credit union', investor: 'family or an investor', 'sba-loan': 'an SBA-backed loan now in process' })[s.financing] || 'identified sources'} will cover the costs VA does not. `), s.credit === 'yes' ? T('I have reviewed my credit report.') : B('CHECK YOUR CREDIT REPORT BEFORE THE MEETING')] : [T('Non-VA financing: '), B('NAME THE SOURCE FOR WHAT VA WILL NOT COVER: savings, a bank, an SBA-backed loan, family')]);
    items.push(s.plan === 'draft' ? [T('Business plan: a complete draft, built to the seven feasibility headings, is attached.')] : s.plan === 'started' ? [T('Business plan: in progress with my SBA counselor, to be complete by '), B('DATE'), T('.')] : [T('Business plan: '), B('START IT WITH YOUR SBA COUNSELOR AND PUT THE TARGET DATE HERE')]);
    blocks.push(UL(items));
    sections.push({ n: 4, title: 'Feasibility work done so far', blocks });
  }

  /* 5. What I am asking VR&E to consider funding */
  {
    const blocks = [];
    if (fund.length) {
      blocks.push(P(T('The items below are what the business needs to begin operations, each one named in 38 CFR 21.257(d) or 21.214(e). Written quotes are attached for each.')));
      blocks.push(UL(fund.map(({ item, amount }) => [T(`${cap(item.short)}: `), amount ? T(fmtUSD(amount)) : B('QUOTED AMOUNT'), T(`. ${item.letterCategory}.`)])));
      blocks.push(P(T(`Total requested: ${fundTotal ? fmtUSD(fundTotal) : ''}`), fundTotal ? T('') : B('SUM OF THE QUOTES'), T(`. I understand that ${fundTotal >= 50000 ? 'at this level the plan requires the concurrence of the Executive Director, VR&E Service, under the manual’s self-employment chapter, and I have prepared the plan for that review' : 'the plan requires the VR&E Officer’s concurrence before it is signed, and I have prepared the plan for that review'}.`)));
    } else {
      blocks.push(P(T('The items I am asking VR&E to consider are limited to what the regulation names: '), B('LIST EACH ITEM FROM THE FUNDABLE LIST ON THIS PAGE WITH ITS QUOTED AMOUNT: equipment, opening inventory, licenses and fees, a short course')));
    }
    if (self.length) blocks.push(P(T(`I am funding the following myself and have listed them in the plan with their costs: ${joinList(self.map(x => x.item.short))}. I understand that ${self.some(x => x.item.bucket === 'prohibited') ? 'the regulation does not permit VA to pay for ' + joinList(self.filter(x => x.item.bucket === 'prohibited').map(x => x.item.short)) + (self.some(x => x.item.bucket === 'unlisted') ? ', and that ' : '') : ''}${self.some(x => x.item.bucket === 'unlisted') ? joinList(self.filter(x => x.item.bucket === 'unlisted').map(x => x.item.short)) + ' ' + (self.filter(x => x.item.bucket === 'unlisted').length === 1 ? 'is' : 'are') + ' not on the regulation’s list' : ''}.`)));
    else blocks.push(P(B('IF THE BUSINESS NEEDS ANYTHING VA CANNOT BUY (a vehicle, a space, insurance, marketing, working capital), SAY HERE THAT YOU ARE FUNDING IT YOURSELF AND THAT IT IS IN THE PLAN WITH ITS COST. IF NOT, DELETE THIS LINE.')));
    sections.push({ n: 5, title: 'What I am asking VR&E to consider funding', blocks });
  }

  /* 6. Training plan */
  {
    const blocks = [];
    if (s.training === 'none') blocks.push(P(T('I am already qualified to operate the business: '), B('THE EXPERIENCE, LICENSE, OR CERTIFICATION THAT SHOWS IT'), T('. No further training is needed to open, and I will use SBA’s free business counseling for the management side.')));
    else if (s.training === 'short') blocks.push(P(T('To operate the business I need '), V(p.trainingPlan, 'THE COURSE OR CERTIFICATION, THE PROVIDER, ITS LENGTH AND COST'), T('. It is short-term skills training that does not lead to a degree, the kind the manual’s self-employment chapter allows, and I ask that it be included in the plan.')));
    else if (s.training === 'degree') blocks.push(P(T('I understand that training on the Self-Employment track is limited to short-term skills training and does not include a degree program. '), B('STATE WHETHER YOU ARE ASKING FOR THE DEGREE UNDER A SEPARATE PLAN FIRST, OR WHETHER A SHORT COURSE WOULD QUALIFY YOU TO OPEN')));
    else blocks.push(P(T('Training plan: '), B('SAY WHETHER YOU NEED A SHORT COURSE OR LICENSE TO OPERATE, OR WHETHER YOU ARE ALREADY QUALIFIED, AND HOW YOU WILL LEARN THE MANAGEMENT SIDE (SBA’s Boots to Business is free)')));
    sections.push({ n: 6, title: 'Training plan', blocks });
  }

  /* 7. Request */
  {
    const blocks = [];
    blocks.push(P(T('I respectfully request:')));
    const items = [];
    items.push([T('A determination of employment handicap '), B('ADD “and serious employment handicap” IF YOUR LIMITATIONS ARE SEVERE OR YOU ARE RATED 10%'), T(' based on the evidence above.')]);
    items.push([T('Vocational exploration for self-employment under 38 CFR 21.257(a) and M28C.IV.C.5, with the six factors addressed in this statement documented on VA Form 28-1902n.')]);
    items.push([T('Referral to the SBA or a partner office under the VR&E–SBA agreement (Appendix FM and VA Form 3288) at this meeting.')]);
    items.push([T('A Phase One Individualized Written Rehabilitation Plan for self-employment, with the feasibility objectives above, and referral to the Self-Employment Panel when the plan is ready.')]);
    if (s.mode === 'own' && s.operating === 'under12') items.push([T('Consideration of retroactive induction for the training I have already paid for at an approved facility, which is tied directly to the skills this business requires: '), B('COURSE, PROVIDER, DATES, AMOUNT')]);
    blocks.push(OL(items));
    const visible = CHECKLIST.filter(c => c.showIf({ ...s, itemIds: Object.keys(s.items || {}) }));
    const have = visible.filter(c => (s.evidence || []).includes(c.id) && c.id !== 'statement').map(c => c.letterName);
    const missing = visible.filter(c => !(s.evidence || []).includes(c.id) && c.id !== 'statement').map(c => c.letterName);
    blocks.push(P(T('Supporting documents: '), have.length ? T(joinList(have)) : T(''), missing.length ? [have.length ? T('; ') : T(''), B(`STILL TO GATHER: ${missing.join(', ')}`)] : T(''), T('.')));
    blocks.push(P(T('Thank you for your time and your help with my plan.')));
    sections.push({ n: 7, title: 'My request', blocks });
  }

  const closing = [[T('Respectfully,')], [B('YOUR NAME')], [B('PHONE'), T(' | '), B('EMAIL')]];
  return { header, howTo, sections, closing, sign };
}

/* ─── Counting and serialising (unchanged from VR&E Approval Prep) ─────────── */
function* allParts(letter) {
  for (const line of letter.header) yield* line;
  for (const sec of letter.sections) for (const blk of sec.blocks) for (const item of blk.items) yield* item;
  for (const line of letter.closing) yield* line;
}
export function countBrackets(letter) { let n = 0; for (const part of allParts(letter)) if (part.b) n++; return n; }
const partText = part => part.b ? `[${part.b}]` : (part.t || '');
const lineText = parts => parts.map(partText).join('');

export function letterToText(letter, { includeHowTo = true } = {}) {
  const out = [];
  letter.header.forEach(l => out.push(lineText(l)));
  out.push('');
  if (includeHowTo) { out.push('HOW TO USE THIS DRAFT'); letter.howTo.forEach(h => out.push(`- ${h}`)); out.push(''); }
  for (const sec of letter.sections) {
    out.push(`${sec.n}. ${sec.title.toUpperCase()}`); out.push('');
    for (const blk of sec.blocks) {
      if (blk.type === 'p') out.push(lineText(blk.items[0]));
      else blk.items.forEach((it, i) => out.push(`${blk.type === 'ol' ? (i + 1) + '.' : '-'} ${lineText(it)}`));
      out.push('');
    }
  }
  letter.closing.forEach(l => out.push(lineText(l)));
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function letterToHtml(letter, esc) {
  const part = p => p.b ? `<span class="lb">[${esc(p.b)}]</span>` : esc(p.t || '');
  const line = parts => parts.map(part).join('');
  const h = letter.header.map((l, i) => `<p class="lh${i < 2 ? ' lh-title' : ''}">${line(l)}</p>`).join('');
  const how = `<div class="l-howto"><p class="l-howto-t">How to use this draft</p><ul>${letter.howTo.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  const secs = letter.sections.map(sec => `<h4>${sec.n}. ${esc(sec.title)}</h4>${sec.blocks.map(blk => blk.type === 'p' ? `<p>${line(blk.items[0])}</p>` : `<${blk.type}>${blk.items.map(it => `<li>${line(it)}</li>`).join('')}</${blk.type}>`).join('')}`).join('');
  const close = letter.closing.map(l => `<p class="lc">${line(l)}</p>`).join('');
  return h + how + secs + close;
}

/* ─── Itemized startup cost sheet ───────────────────────────────────────────
   The counselor submits an itemized program cost sheet (Appendix FO) with the concurrence request, and the
   panel's cost analysis (38 CFR 21.257(f)(2)) is the same list. Same block shape as the statement so the
   HTML, text, and Word serialisers all work on it. */
export function buildCostSheet(s) {
  const items = s.items || {};
  const rows = ITEMS.filter(i => i.id in items).map(i => ({ item: i, amount: Math.max(0, Number(items[i.id]) || 0) }));
  const ask = rows.filter(r => r.item.bucket === 'fundable');
  const self = rows.filter(r => r.item.bucket !== 'fundable');
  const sum = a => a.reduce((t, r) => t + r.amount, 0);
  const askTotal = sum(ask), selfTotal = sum(self), total = askTotal + selfTotal;
  const sign = signer(askTotal);
  const p = s.priv || {};
  const header = [
    [T('ITEMIZED STARTUP COST SHEET')],
    [T('Veteran Readiness and Employment (Chapter 31), Self-Employment Track')],
    [T('Business: '), V(p.bizName, 'BUSINESS NAME OR WORKING TITLE')],
    [T('Prepared by: '), B('YOUR FULL NAME'), T('   Date: '), B('DATE')],
  ];
  const howTo = [
    'One line per item, with a written quote attached for each line in section 1. Replace every [BRACKET].',
    'Section 1 lists only items the regulation names (38 CFR 21.257(d), 21.214(e)). Section 2 is everything else, including anything 21.214(f) prohibits, shown as costs you cover.',
    'This is the cost analysis the feasibility review requires (38 CFR 21.257(f)(2)) and the list your counselor itemizes on Appendix FO. Bring it to the first meeting.',
  ];
  const line = r => [T(`${cap(r.item.short)}: `), r.amount ? T(fmtUSD(r.amount)) : B('QUOTED AMOUNT'), T(' from '), B('VENDOR OR SOURCE'), T(`. ${r.item.letterCategory || (r.item.bucket === 'prohibited' ? 'Not fundable under 38 CFR 21.214(f); funded by me' : 'Not on the regulation’s list; funded by me')}.`)];
  const sections = [];
  sections.push({ n: 1, title: 'Items I am asking VR&E to consider', blocks: ask.length ? [UL(ask.map(line)), P(T(`Subtotal requested from VR&E: ${fmtUSD(askTotal)}.`))] : [P(B('NO ITEMS ON THE REGULATION’S LIST ARE CHECKED YET. ADD EQUIPMENT, INVENTORY, LICENSES, OR A SHORT COURSE WITH A QUOTE FOR EACH.'))] });
  sections.push({ n: 2, title: 'Items I am funding myself', blocks: self.length ? [UL(self.map(line)), P(T(`Subtotal funded by me: ${fmtUSD(selfTotal)}.`))] : [P(T('None. Everything the business needs to open is on the list above.'))] });
  sections.push({ n: 3, title: 'Totals and approval level', blocks: [
    UL([
      [T(`Total startup cost: ${fmtUSD(total)}.`)],
      [T(`Requested from VR&E: ${fmtUSD(askTotal)}.`)],
      [T(`Funded by me or other sources: ${fmtUSD(selfTotal)}. `), B('NAME THE SOURCE: savings, a bank, an SBA-backed loan, family')],
      [T(`Concurrence required: ${sign.manual.approver} (M28C.IV.C.5 5.05.b.2). The regulation at 38 CFR 21.258 places the line at $25,000, which would put this plan with the ${sign.reg}.`)],
    ]),
  ] });
  return { header, howTo, sections, closing: [], sign, askTotal, selfTotal, total };
}
