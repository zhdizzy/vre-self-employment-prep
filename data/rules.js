// VR&E Self-Employment Prep — the rules the tool cites. Every entry carries its cite, a link, a verified
// date, and the exact text (`quote`). Plain-English lines are ours; quotes are VA's.
//
// Sources pulled 10/28/26 (workspace: vre-self-employment-sources-2026-10.md):
//   M28C.IV.C.5 Self-Employment Plan (KnowVA 554400000143938, last modified 12/11/24; most sections
//   carry a 10/16/24 change date, the concurrence section 6/21/23); eCFR 38 CFR Part 21 Subpart A at
//   point-in-time 2026-10-01 (21.47, 21.72, 21.73, 21.156, 21.194, 21.196, 21.198, 21.212, 21.214, 21.216,
//   21.250, 21.252, 21.254, 21.256, 21.257, 21.258, 21.268, 21.283, 21.430); 38 U.S.C. 3104, 3117 (LII);
//   va.gov Self-Employment track page. Where the regulation and the manual disagree, both are shown.
// Refresh calendar: Oct 1 (subsistence rates, via /gi-bill-vre/data/vre-rates.js); quarterly re-pull of
// M28C.IV.C.5 (revised 10/16/24, concurrence 6/21/23; both can change again).

export const DATA_STAMP = 'October 28, 2026';
export const VERIFIED = '10/28/26';

const KV = id => `https://www.knowva.ebenefits.va.gov/system/templates/selfservice/va_ssnew/help/customer/locale/en-US/portal/554400000001018/content/${id}`;
export const KNOWVA = { selfEmployment: KV('554400000143938'), evaluation: KV('554400000144554'), reviews: KV('554400000142507'), retro: KV('554400000143066') };
export const ECFR = s => `https://www.ecfr.gov/current/title-38/chapter-I/part-21/subpart-A/section-21.${s}`;
export const APPLY_URL = 'https://www.va.gov/careers-employment/vocational-rehabilitation/apply-vre-form-28-1900/';
export const TRACK_URL = 'https://www.va.gov/careers-employment/vocational-rehabilitation/programs/self-employment/';
export const RATES_URL = 'https://www.benefits.va.gov/vocrehab/vrerates27.asp';
export const SBA = {
  vboc: 'https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program',
  vbocFind: 'https://www.sba.gov/local-assistance/find?type=Veteran%27s%20Business%20Outreach%20Center',
  plan: 'https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan',
  b2b: 'https://www.sba.gov/sba-learning-platform/boots-business',
  sbdc: 'https://americassbdc.org/',
  vetContracting: 'https://www.sba.gov/federal-contracting/contracting-assistance-programs/veteran-contracting-assistance-programs',
  osdbu: 'https://www.va.gov/osdbu/',
};

/* ─── Who signs: the manual's thresholds (what the office uses) and the regulation's (38 CFR 21.258) ── */
export const MANUAL_ED_THRESHOLD = 50000;   // M28C.IV.C.5 5.05.b.2: VR&E Officer at $49,999 or less; Executive Director at $50,000 or more
export const REG_ED_THRESHOLD = 25000;      // 38 CFR 21.258: VR&E Officer under $25,000; Executive Director at $25,000 or more
export const OFFICER_REVIEW_THRESHOLD = 25000; // 38 CFR 21.430(c): non-delegable VR&E Officer review above $25,000 in a calendar year for small-business supplies
export function signer(total) {
  const c = Number(total) || 0;
  const manual = c >= MANUAL_ED_THRESHOLD
    ? { short: 'Executive Director', approver: 'the Executive Director, VR&E Service', how: 'through the VR&E corporate mailbox, with Appendix FD, Appendix FO, the amended plan, VA Form 28-1902n, the business plan, and the Self-Employment Panel report' }
    : { short: 'VR&E Officer', approver: 'the VR&E Officer at your regional office', how: 'on Appendix FD with Appendix FO, the amended plan, VA Form 28-1902n, and the Self-Employment Panel report' };
  const reg = c >= REG_ED_THRESHOLD ? 'Executive Director, VR&E Service' : 'VR&E Officer';
  const officerReview = c > OFFICER_REVIEW_THRESHOLD;
  return { total: c, manual, reg, officerReview, conflict: manual.short === 'VR&E Officer' && reg === 'Executive Director, VR&E Service' };
}

/* ─── Rules the cards cite ──────────────────────────────────────────────── */
export const RULES = {
  seGoal: {
    id: 'seGoal', cite: '38 CFR 21.257(a)', url: ECFR('257'), verified: VERIFIED,
    title: 'Self-employment is a vocational goal VA can approve',
    plain: 'A Chapter 31 program may include self-employment when VA decides it is a suitable vocational goal for you. The decision rests on your initial evaluation and the rest of this section. The counselor decides suitability; this page is how you shape that decision.',
    quote: 'A program of vocational rehabilitation benefits and services may include self-employment for an individual if VA determines that such an objective is a suitable vocational goal. VA will make this determination based on— (1) The results of the individual’s initial evaluation conducted in accordance with the provisions of § 21.50; and (2) The provisions of this section.',
  },
  statute: {
    id: 'statute', cite: '38 U.S.C. 3104(a)(12)', url: 'https://www.law.cornell.edu/uscode/text/38/3104', verified: VERIFIED,
    title: 'The statute names the money',
    plain: 'Congress listed license fees, essential equipment, supplies, and minimum stocks of materials among the services VA may provide a veteran starting self-employment, under rules and cost limits VA sets by regulation. This is the answer to “VR&E doesn’t fund businesses.”',
    quote: 'Such license fees and essential equipment, supplies, and minimum stocks of materials as the Secretary determines to be necessary for a veteran to begin employment in an occupation…',
  },
  aggravate: {
    id: 'aggravate', cite: 'M28C.IV.C.5 5.01', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The business must not aggravate your rated conditions',
    plain: 'The manual’s one-sentence test for the whole track: a business you have the interest and skills to start, and that does not make your service-connected conditions worse. Your functional limits are evidence here, not a weakness. A business built around them is the point.',
    quote: 'In accordance with 38 U.S.C. § 3104(a)(12), the Chapter 31 program provides assistance for self-employment to an eligible claimant who has the interest and necessary skills to start a business that does not aggravate the claimant’s service-connected disability conditions.',
  },
  startup: {
    id: 'startup', cite: 'M28C.IV.C.5 5.02', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'Startups only',
    plain: 'The track funds a business in its early development stages. A business that already exists is out of scope; the manual sends the counselor back to the evaluation chapter, where an existing business is evidence about whether you have already overcome your employment handicap. There is no procedure for funding or expanding an existing business.',
    quote: 'VR&E only supports a startup business for a self-employment plan. VR&E defines a startup business as a business in its early development stages. … An existing business is not within the scope of the self-employment track.',
  },
  retro: {
    id: 'retro', cite: 'M28C.IV.C.5 5.04.b; M28C.V.B.6', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'Retroactive induction: narrow, and closed at 12 months',
    plain: 'If you already paid for training at a VA-approved facility that goes straight to the skills your approved business needs, VA can consider inducting you retroactively for that training. Not if the business has been running for 12 months or more. This is about training expenses, not the equipment you already bought.',
    quote: 'A claimant may be considered for a retroactive induction only if the claimant has incurred training expenses at an approved VA training facility that is geared towards establishing an approved self-employment plan. … A claimant must not be authorized for a retroactive induction if the business has already been established and operational for at least 12 months.',
  },
  fitFactors: {
    id: 'fitFactors', cite: 'M28C.IV.C.5 5.03', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The six things the counselor assesses',
    plain: 'Before any plan is written the counselor evaluates whether self-employment is appropriate for you. The manual lists what that assessment may include. Answer each one before you are asked. If the answer is yes, it goes on VA Form 28-1902n and you get the VR-64 positive letter; if no, the VR-58 adverse letter and a conversation about traditional employment.',
    quote: 'The assessment of whether self-employment is an appropriate vocational goal may include, but is not limited to, the following: Aptitudes, interests, abilities, and transferable skills; Business planning, operation, and management skills; Stability and progression of the claimant’s disability conditions that may affect establishing and operating a business; Personal resources including financial resources and other support systems; Legal considerations; Personal commitment and resilience.',
  },
  assistOthers: {
    id: 'assistOthers', cite: '38 CFR 21.257(d)', url: ECFR('257'), verified: VERIFIED,
    title: 'What everyone on the track can get',
    plain: 'For any veteran whose self-employment goal is approved: vocational training, incidental training in running a business, license and other fees, necessary tools and supplies for the occupation, and employment services. Subject to the cost approvals in 21.258.',
    quote: 'Subject to the provisions of § 21.258, VA may provide the following assistance to any individual for whom self-employment is determined to be a suitable vocational goal— (1) Vocational training; (2) Incidental training in the management of a business; (3) License or other fees required for self-employment; (4) Necessary tools and supplies for the occupation; and (5) Services described in § 21.252.',
  },
  mostSevere: {
    id: 'mostSevere', cite: '38 CFR 21.257(b), (c)(2), (e); 21.214(e)', url: ECFR('257'), verified: VERIFIED,
    title: 'The regulation’s second tier: inventory and equipment',
    plain: 'The regulation reserves the fuller package, minimum stocks of inventory, essential equipment and machinery, business license fees, for veterans whose limits are so severe that self-employment is the only reasonably feasible vocational goal. The manual’s current working list (next rule) names equipment and inventory for self-employment plans generally and does not use tier names. The strongest record for inventory and equipment is one that shows self-employment is the only goal that fits your rated limits. That is why the statement leads with the limits, not the business idea.',
    quote: 'For purposes of this subpart, individuals with the most severe service-connected disability(ies) who require self-employment means individuals who have been determined by VA to have limitations affecting employability arising from the effects of each individual’s service-connected disability(ies), which are so severe as to necessitate selection of self-employment as the only reasonably feasible vocational goal for the individuals.',
  },
  approvable: {
    id: 'approvable', cite: 'M28C.IV.C.5 5.04.a', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The manual’s working list of what can be bought',
    plain: 'Short-term skills training that does not lead to a degree or diploma, incidental training in running the business, essential equipment and tools including machinery, fixtures, accessories, and appliances, the minimum stock of materials or supplies needed to open, and licenses or other fees. Everything is framed as what is necessary to begin operations. Nothing here is a loan.',
    quote: 'Vocational training, which is limited to short-term skills training that does not lead to a college degree or diploma; Incidental training in the management of a business; Essential equipment, and tools, including machinery, occupational fixtures, accessories, and appliances; Minimum stocks of materials or supplies required for starting the business, e.g., inventory of saleable merchandise or goods, expendable items required for day-to-day operations, and items which are consumed on the premises, licenses or other fees required for self-employment.',
  },
  beginOps: {
    id: 'beginOps', cite: '38 CFR 21.214(e)', url: ECFR('214'), verified: VERIFIED,
    title: '“Generally limited to those necessary to begin operations”',
    plain: 'The regulation’s frame for everything VA buys on this track: what it takes to open the doors. Marketing, insurance, working capital, and payroll are not on the list. That does not make them impossible, but they are not what the program is built to pay for, so budget them yourself and keep them out of the VR&E ask.',
    quote: 'The supplies and related assistance which may be furnished … to a veteran for whom self-employment has been approved as the occupational objective, are generally limited to those necessary to begin operations: (1) Minimum stocks of materials, e.g., inventory of saleable merchandise or goods, expendable items required for day-to-day operations, and items which are consumed on the premises; (2) Essential equipment, including machinery, occupational fixtures, accessories, and appliances; and (3) Other related assistance such as business license fees.',
  },
  prohibited: {
    id: 'prohibited', cite: '38 CFR 21.214(f)', url: ECFR('214'), verified: VERIFIED,
    title: 'Four things VA may not pay for',
    plain: 'Land or buildings, leases or rent, vehicles of any kind, and stocking a farm with animals. These are hard rules in the regulation, not counselor discretion. Take them off the VR&E ask and fund them another way.',
    quote: 'VA may not authorize assistance for: (1) Purchase of, or part payment for, land and buildings; (2) Making full or part payment of leases or rentals; (3) Purchase or rentals of trucks, cars, or other means of transportation; (4) Stocking a farm for animal husbandry operations.',
  },
  substance: {
    id: 'substance', cite: 'M28C.IV.C.5 5.04.c', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'No cannabis or recreational-substance businesses',
    plain: 'A manual rule, not in the regulation: a startup related to medical marijuana or a legalized recreational substance cannot be authorized, even in states where it is legal. Using medical marijuana does not bar you from VR&E; a business in the industry cannot be the plan.',
    quote: 'In addition, any startup business that is related to medical marijuana or a legalized recreational substance industry must not be authorized for self-employment. … However, the provision of goods and services related to training and tools for cultivating, distributing, dispensing, or selling medical marijuana or a legalized recreational substance industry cannot be authorized in a vocational rehabilitation plan.',
  },
  feasibility: {
    id: 'feasibility', cite: '38 CFR 21.257(f)', url: ECFR('257'), verified: VERIFIED,
    title: 'The seven-part feasibility analysis',
    plain: 'Before VA authorizes a self-employment plan it must review the feasibility of your business plan, and the regulation says what that review must include. Build the plan to these seven headings and the counselor, the panel, and the SBA consultant are reading the document they expect.',
    quote: 'The feasibility analysis must include— (1) An analysis of the economic viability of the proposed business; (2) A cost analysis specifying the amount and types of assistance that VA will provide; (3) A market analysis for the individual’s proposed services or products; (4) Availability of financing from non-VA sources, including the individual’s personal resources, local banks, and other sources; (5) Evidence of coordination with the Small Business Administration to secure special consideration under section 8 of the Small Business Act, as amended; (6) The location of the site for the proposed business and the cost of the site, if any; and (7) A training plan to operate a successful business.',
  },
  standalone: {
    id: 'standalone', cite: 'M28C.IV.C.5 5.05.b.1(d)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The plan has to stand on its own',
    plain: 'You write the business plan, with help from SBA or a business consultant. The standard the manual sets is a document a bank could read. That is also the standard the Self-Employment Panel applies.',
    quote: 'The claimant is responsible for developing the proposed business plan with assistance from SBA or other business consultants. The proposed business plan must serve as a stand-alone document that addresses all business concerns and can describe the business to a potential lender.',
  },
  phaseOne: {
    id: 'phaseOne', cite: 'M28C.IV.C.5 5.05.a, 5.05.b.1', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'Two phases, and the first one needs no sign-off above the counselor',
    plain: 'Phase One is a plan whose objectives are the feasibility work: the SBA referral, naming the training or licenses you need, writing the business plan, and getting financially ready (your credit score, assets, and funding sources). Because nothing is bought yet, the VR&E Officer does not have to concur. Phase Two rewrites the plan around the approved business and the actual purchases, and that is where the signatures above the counselor come in.',
    quote: 'Phase one is the development of the IWRP for self-employment that outlines the intermediate objectives for determining the feasibility of the business concept and viability of the business plan. Since the business plan has not been implemented at this point in the IWRP, the VR&E Officer’s concurrence on this plan is not required per 38 CFR 21.258.',
  },
  sbaReferral: {
    id: 'sbaReferral', cite: 'M28C.IV.C.5 5.05.b.1(c)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The SBA referral is mandatory, and free',
    plain: 'Every self-employment case goes to SBA or another business-counseling resource. The counselor uses a referral form (Appendix FM for SBA, FN for others) and a release (VA Form 3288), and SBA has you sign its own release at the first meeting. SCORE mentors, Small Business Development Centers, and Veterans Business Outreach Centers all qualify. Walk in with the appointment already made and you have skipped a month. One caution: the counselor may reject a consultant’s recommendations if they would not produce a viable plan.',
    quote: 'The claimant must be referred to SBA or other resources for assistance during the self-employment process. Referrals to SBA or other resources require completion of Appendix FM, SBA Referral for Self-Employment, or Appendix FN, Referral for Self-employment, and VAF 3288, Request for and Consent to Release of Information from Individual’s Records.',
  },
  panel: {
    id: 'panel', cite: 'M28C.IV.C.5 5.05.b.1(e)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The Self-Employment Panel',
    plain: 'Your plan goes to a panel in the VR&E office: a counselor or employment coordinator, your own counselor, and an SBA consultant or another local self-employment expert. They produce a feasibility report; your counselor must address its recommendations and tell you in writing what comes next (VA Form 28-8606). Once the counselor approves the updates the panel asked for, the case does not go back to the panel.',
    quote: 'The VRC must refer the case to the Self-Employment Panel (SEP) for assistance with the feasibility analysis of the business plan. The SEP is a consultative panel established in each VR&E office, which consists of a VRC or Employment Coordinator (EC), the referring VRC, a business consultant from the Small Business Administration (SBA) or other local representative with expertise in self-employment. … Once the VRC approves the updates on the business plan as recommended by the SEP, the case does not need to return to the SEP.',
  },
  infeasible: {
    id: 'infeasible', cite: 'M28C.IV.C.5 5.05.b.1(f)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'Infeasible once is not the end. Twice can be.',
    plain: 'If the plan is found infeasible you are offered a redevelopment. Ask for the panel report and the element that failed, fix that, resubmit. If the revised plan is also found infeasible, the counselor may turn to traditional employment. You get one real second try, so make it count.',
    quote: 'If the business plan is determined infeasible, the VRC must advise the claimant of the option to redevelop the business plan. Subsequently, if the revised business plan is determined infeasible, the VRC may consider an alternative option for employment, such as traditional employment.',
  },
  manualThreshold: {
    id: 'manualThreshold', cite: 'M28C.IV.C.5 5.05.b.2 (change date June 21, 2023)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The manual: $49,999 stays local, $50,000 goes to Washington',
    plain: 'Once the business plan is approved and the plan is amended around it, the VR&E Officer must concur with a plan whose total cost is $49,999 or less. At $50,000 or more the Executive Director of VR&E Service must concur, through the VR&E corporate mailbox. Neither you nor the counselor can sign the plan until the concurrence is in hand. This is what your office works from.',
    quote: 'In accordance with 38 CFR 21.258, the VR&E Officer must concur with any self-employment plan with an estimated or actual total cost of $49,999 or less prior to the execution of the business plan. … The Executive Director of VR&E Service must concur with any self-employment plan with a total cost of $50,000 or more prior to the execution of the business plan.',
  },
  regThreshold: {
    id: 'regThreshold', cite: '38 CFR 21.258 (amended Feb. 16, 2022)', url: ECFR('258'), verified: VERIFIED,
    title: 'The regulation says $25,000',
    plain: 'The regulation the manual cites draws the line at $25,000: under it the VR&E Officer, at or above it the Executive Director. The manual, written later, uses $50,000. We show both because both are current and they disagree. Expect your office to use the manual’s figure; if anyone cites $25,000, this is where it comes from.',
    quote: 'A self-employment plan with an estimated or actual cost of less than $25,000 may be approved by the Veteran Readiness and Employment (VR&E) Officer with jurisdiction. Any self-employment plan with an estimated or actual cost of $25,000 or more must be approved by the Executive Director, VR&E Service.',
  },
  officerReview: {
    id: 'officerReview', cite: '38 CFR 21.430(c)', url: ECFR('430'), verified: VERIFIED,
    title: 'Above $25,000 in a year, the VR&E Officer reviews the costs personally',
    plain: 'Separate from who approves the plan: when the counselor’s estimate of a calendar year’s program costs for supplies to establish a small business exceeds $25,000, the VR&E Officer must review the costs and cannot delegate it. The counselor may not sign the plan or spend anything until that review is done.',
    quote: 'The VR&E Officer will review the program costs for the services in paragraphs (c)(1) through (3) of this section if the case manager’s program cost estimate for a calendar year exceeds $25,000. The VR&E Officer may not delegate this responsibility. The case manager will neither sign a rehabilitation plan nor authorize expenditures before the VR&E Officer approves the program costs. The services subject to this review are: (1) Providing supplies to help establish a small business…',
  },
  concurrenceDocs: {
    id: 'concurrenceDocs', cite: 'M28C.IV.C.5 5.05.b.2(b)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'What goes up with the request',
    plain: 'The counselor prepares Appendix FD (the approval request) and Appendix FO (itemized program cost), and sends them with the amended plan, the completed VA Form 28-1902n, and the Self-Employment Panel report. For the Executive Director the business plan itself goes too. If approved, you and the counselor sign the amended VA Form 28-10214 and you get a VR-64 or VR-67 letter. If not, the counselor either fixes and resubmits or looks at other options, and you get a VR-58.',
    quote: 'The VRC must prepare and submit Appendix FD, Approval Request for Self-Employment Plan, for the VR&E Officer’s approval. The following documentation must be submitted to the VR&E Officer for review: Amended self-employment plan; Appendix FD, Self-Employment Plan Approval Request; Appendix FO, Itemized Program Cost for Self-employment Business Plan; Completed VAF 28-1902n, Counseling Record - Narrative Report; Self-employment Panel Report.',
  },
  dot189: {
    id: 'dot189', cite: 'M28C.IV.C.5 5.05.b.2(a)(3)', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'The occupation code on your plan',
    plain: 'The redeveloped plan carries an occupation code. If you will do the work of the business, it is the code for that trade. If you will manage the business and not perform its operating duties, the manual assigns code 189, Miscellaneous Managers and Officials. Check which one lands on your plan; it shapes what training counts as necessary.',
    quote: 'If the claimant is performing the duties for operating the business, use the DOT code that corresponds to the proposed type of business or occupation. If the claimant is managing the business and does not perform the duties for operating the business, use DOT code 189, Miscellaneous Managers and Officials.',
  },
  financialReview: {
    id: 'financialReview', cite: 'M28C.IV.C.5 5.06, 5.07', url: KNOWVA.selfEmployment, verified: VERIFIED,
    title: 'Expect to show your books',
    plain: 'Once the plan is running, case management includes a review of the business’s income statement, profit and loss, and tax return, with help from SBA or the panel. After you are declared job-ready, at least 12 months of case management follow, with at least one visit to the business. An online-only business is reviewed online. Keep clean books from day one.',
    quote: 'A minimum of 12 months of case management appointments must be conducted while the case is in JR status for all self-employment cases. … During the 12-month period of employment services, the case manager must conduct at least one site visit at the business location. However, if the business is online only, the case manager must access and review the activities of the business online.',
  },
  noSubsistenceES: {
    id: 'noSubsistenceES', cite: '38 CFR 21.254(b)(1)', url: ECFR('254'), verified: VERIFIED,
    title: 'No subsistence during employment services',
    plain: 'Subsistence allowance is paid while you are in training on the plan. Once the plan moves to employment services, the period after you are job-ready, subsistence stops. The employment adjustment allowance (next rule) is what bridges it.',
    quote: 'The following benefits may not be provided to the veteran by VA during a period or program of employment services: (1) Subsistence allowance, or payment of an allowance at the educational assistance rate paid under Chapter 30 for similar training…',
  },
  eaa: {
    id: 'eaa', cite: '38 CFR 21.268(a), (c)(5), (g)', url: ECFR('268'), verified: VERIFIED,
    title: 'Two months of pay when you open: the employment adjustment allowance',
    plain: 'When you complete the plan and reach the point of employability, VA pays two months at the full-time subsistence rate, at the institutional rate for a self-employment program. It is not charged against your months of entitlement. Most veterans have never heard of it.',
    quote: 'A veteran who completes a period of rehabilitation and reaches the point of employability will be paid an employment adjustment allowance for a period of two months at the full-time subsistence allowance rate for the type of program the veteran was last pursuing. … An employment adjustment allowance will be paid at the institutional rate of subsistence allowance for veterans in any of the following programs: … (5) Self-employment program. … An employment adjustment allowance will not be charged against the veteran’s basic entitlement.',
  },
  esDuration: {
    id: 'esDuration', cite: '38 CFR 21.73', url: ECFR('73'), verified: VERIFIED,
    title: 'Up to 18 months of employment services, not charged against entitlement',
    plain: 'The employment-services period that follows the plan can run as long as you need to get established and adjust, up to 18 months, and it does not use your Chapter 31 months.',
    quote: 'Employment assistance may be provided to the veteran for the period necessary to enable the veteran to secure employment in a suitable occupation, and to adjust in the employment. This period shall not exceed 18 months. … The period of employment assistance provided in paragraph (a) of this section is not charged against the months of entitlement under Chapter 31.',
  },
  entitlement: {
    id: 'entitlement', cite: '38 CFR 21.40(a), (b)', url: ECFR('40'), verified: VERIFIED,
    title: 'Basic entitlement',
    plain: 'Rated 20% or more with an employment handicap, or rated under 20% (in practice 10%) with a serious employment handicap. A 10% rating gets you the evaluation; entitlement needs the counselor’s employment handicap finding. The self-employment track sits inside that; it does not change who can get in.',
    quote: '(a) Veterans with at least 20 percent disability. … (3) Is determined by VA to be in need of rehabilitation because of an employment handicap. (b) Veterans with 10 percent disability. … (3) Is determined by VA to be in need of rehabilitation because of a serious employment handicap.',
  },
  window: {
    id: 'window', cite: '38 U.S.C. 3103(a), (g); 38 CFR 21.41', url: 'https://www.law.cornell.edu/uscode/text/38/3103', verified: '9/30/26',
    title: 'The 12-year window and the 2013 change',
    plain: 'For discharges before January 1, 2013, the basic period of eligibility runs 12 years from the later of discharge or the first notice of a service-connected rating, and a serious employment handicap finding can extend it. For discharges on or after January 1, 2013, there is no time limit.',
    quote: 'Subsection (a) shall not apply to a veteran who was discharged or released from active military, naval, or air service on or after January 1, 2013.',
  },
  vaGovTrack: {
    id: 'vaGovTrack', cite: 'VA.gov, Self-Employment track', url: TRACK_URL, verified: VERIFIED,
    title: 'What VA.gov says the track provides',
    plain: 'Coordination and help developing a proposed business plan, analysis of your business concept, training in small-business operations, marketing, and finances, and guidance on getting resources to implement the plan. After you develop a business plan, VA reviews it and evaluates whether self-employment and the business are viable.',
    quote: '',
  },
};

export const TRACK_NAME = 'Self-Employment';
export const CANT_DO = 'This drafts the statement and maps the process. It cannot read your rating decision, write your business plan, or tell you whether your case is strong. That takes a person, and for the plan, a free SBA counselor.';

/* ─── The line about 1:1 work (same pattern as VR&E Approval Prep, 9/30/26) ────────── */
export const ONE_ON_ONE = {
  url: '/work-with-me/',
  pushback: 'If your counselor has already said no once, the second conversation matters more than the first. I work through these with veterans one-on-one. If you want help with yours:',
  big: 'At $50,000 or more the plan leaves your regional office and lands on the Executive Director’s desk, so the plan and the statement have to be tight. I build these with veterans one-on-one. If you want a second set of eyes:',
};

/* ─── Questions to ask at the meeting (each tied to a step in M28C.IV.C.5) ───────────────── */
export const QUESTIONS = [
  { q: 'Will you complete the SBA referral (Appendix FM) and the VA Form 3288 release today?', why: 'The referral is mandatory on every self-employment case. Getting it signed at the first meeting starts the clock on the only part of the process you can run yourself.', cite: 'M28C.IV.C.5 5.05.b.1(c)' },
  { q: 'Will Phase One be written as its own plan, with the feasibility objectives, before any purchases are discussed?', why: 'Phase One needs no concurrence above the counselor. A counselor who tries to price the whole plan on day one is skipping the step that protects you.', cite: 'M28C.IV.C.5 5.05.b.1' },
  { q: 'Who sits on the Self-Employment Panel in this office, and what is its usual turnaround?', why: 'The panel decides feasibility. Knowing who is on it and how long it takes lets you plan the SBA work to land before it meets.', cite: 'M28C.IV.C.5 5.05.b.1(e)' },
  { q: 'If the panel finds the plan infeasible, will I get the report and the specific element that failed, in writing?', why: 'You get one redevelopment. It is only worth something if you know what to fix.', cite: 'M28C.IV.C.5 5.05.b.1(f)' },
  { q: 'Which occupation code will go on the plan: the trade, or 189 for a managing owner?', why: 'The code shapes what training counts as necessary. If you will do the work of the business, the code should be the trade’s.', cite: 'M28C.IV.C.5 5.05.b.2(a)(3)' },
  { q: 'At my plan total, who concurs: the VR&E Officer, or the Executive Director?', why: 'Hearing the answer tells you whether the office works from the manual’s $50,000 line or the regulation’s $25,000 line, and how long to expect.', cite: 'M28C.IV.C.5 5.05.b.2; 38 CFR 21.258' },
  { q: 'What will you need to see at the 12-month follow-up: books, tax return, site visit?', why: 'Asking now shows you expect to be reviewed, and it tells you what records to keep from day one.', cite: 'M28C.IV.C.5 5.06, 5.07.c' },
];
