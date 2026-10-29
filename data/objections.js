// VR&E Self-Employment Prep — what counselors say, and the rule that answers each. `concede: true` marks
// the ones where the counselor is right and the tool says so. `ruleIds` point at RULES in rules.js.

export const OBJECTIONS = [
  {
    id: 'nofund', label: 'VR&E doesn’t fund businesses',
    counselorSays: '“VR&E is an education and employment program. We don’t fund businesses.”',
    plain: 'Self-employment is a vocational goal the program may include when it is suitable for you, and the statute itself lists license fees, essential equipment, supplies, and minimum stocks of materials as services VA may provide to start one. The manual has a whole chapter on the self-employment plan.',
    response: 'I understand most plans are school or job placement. The regulation at 38 CFR 21.257 makes self-employment a vocational goal VA can approve, and the manual’s self-employment chapter lays out how. I am asking for the vocational exploration for self-employment under 21.257(a), and I have brought the statement and the work I have done so far.',
    ruleIds: ['seGoal', 'statute', 'approvable'], concede: false, modes: ['pushback', 'idea', 'inprogram'],
  },
  {
    id: 'school', label: 'You should go to school instead',
    counselorSays: '“Let’s get you a degree or a certificate and place you with an employer. That’s the safer path.”',
    plain: 'The counselor decides whether self-employment is suitable, and that is a real decision, not a formality. But the manual gives them six factors to assess and a sentence to test it against: a business you have the skills to start that does not aggravate your conditions. If traditional employment is what aggravates them, say so with the record.',
    response: 'I would like the self-employment assessment documented either way. The six factors in the manual are skills, business skills, the stability of my conditions, resources, legal considerations, and commitment; I have addressed each in my statement. The jobs I could hold were the ones that made my conditions worse. A business built around my limits is the goal that fits.',
    ruleIds: ['fitFactors', 'aggravate', 'seGoal'], concede: false, modes: ['pushback', 'inprogram'],
  },
  {
    id: 'infeasible', label: 'Your plan isn’t feasible',
    counselorSays: '“The panel found the plan infeasible. We should look at other options.”',
    plain: 'An infeasible finding comes with a right to redevelop the plan once. Ask for the panel report and the specific element of the seven that failed, fix that element with your SBA counselor, and resubmit. A second infeasible finding is when the counselor may move to traditional employment, so the revision has to be real.',
    response: 'I understand the plan was found infeasible. The manual gives me the option to redevelop it, and I would like to. Could I have the panel report and the specific findings so my SBA counselor and I can address them directly? I will bring the revised plan on a date we set today.',
    ruleIds: ['infeasible', 'feasibility', 'panel'], concede: false, modes: ['pushback'],
  },
  {
    id: 'expensive', label: 'It’s too expensive',
    counselorSays: '“That’s way over what I can approve. Scale it down or pick something else.”',
    plain: 'There is no dollar cap on a self-employment plan in the regulation or the manual. There is a line above which the plan goes to the Executive Director of VR&E Service instead of the VR&E Officer: $50,000 in the manual, $25,000 in the regulation. A higher tier means a longer wait and a stronger plan, not a no. And the counselor cannot approve a self-employment plan alone at any amount.',
    response: 'I understand the plan has to go above you for concurrence at any cost, and that at this level it goes to the Executive Director. I would rather do that with a tight plan than cut items the business needs to open. I have taken everything the regulation prohibits off the ask, and the itemized costs are quoted. Could we send it up?',
    ruleIds: ['manualThreshold', 'regThreshold', 'officerReview'], concede: false, modes: ['pushback', 'idea'],
  },
  {
    id: 'existing', label: 'You already have a business',
    counselorSays: '“You’re already operating. The self-employment track is for startups.”',
    plain: 'The counselor is right. The manual funds startups only, and bars retroactive induction once a business has been running 12 months. If you are under 12 months, the only retro path is for training expenses at an approved facility tied to the approved plan, not for equipment you already bought. For a running business the doors are SBA, state programs, and the certifications in Veteran Founder Stack.',
    response: 'Understood. If the business is under 12 months old and I have paid for training tied to it at an approved facility, I would like that considered. Otherwise, could we document that self-employment was explored, and talk about whether VR&E employment services apply to me?',
    ruleIds: ['startup', 'retro'], concede: true, modes: ['pushback', 'own'],
  },
  {
    id: 'item', label: 'We don’t pay for that',
    counselorSays: '“VA won’t buy you a truck,” or “we can’t pay your lease,” or “insurance isn’t something we fund.”',
    plain: 'For the truck, the lease, the building, and livestock the counselor is right: the regulation prohibits them. Insurance, marketing, and working capital are not on the list either way; the regulation frames help as what is necessary to begin operations. Equipment, inventory, licenses, and short-term training are on the list. Argue the items that are on it, concede the rest, and fund them yourself in the plan.',
    response: 'Agreed on the vehicle and the space; I have those in the plan as costs I cover. The items I am asking VR&E to consider are the ones the regulation names: the equipment, the opening inventory, the license fees, and the short course. Each has a quote attached.',
    ruleIds: ['prohibited', 'beginOps', 'approvable'], concede: true, modes: ['pushback', 'idea'],
  },
  {
    id: 'sba', label: 'You have to go to SBA first',
    counselorSays: '“I can’t do anything until you’ve met with SBA.”',
    plain: 'Correct, and it is free. The referral is mandatory on every self-employment case. The fastest move is to make the appointment yourself with a Veterans Business Outreach Center, an SBDC, or SCORE before the first meeting, so the counselor is signing a referral for a meeting already on the calendar.',
    response: 'I have an appointment with the VBOC on [date]. Could you complete the Appendix FM referral and the 3288 today so it is in the file before I go?',
    ruleIds: ['sbaReferral', 'standalone'], concede: true, modes: ['pushback', 'idea', 'inprogram'],
  },
  {
    id: 'online', label: 'An online business doesn’t count',
    counselorSays: '“We need a real business location. An online store isn’t something we can support.”',
    plain: 'The manual anticipates online-only businesses: it tells the case manager how to review one during the 12-month follow-up (online, instead of a site visit). Location is one of the seven feasibility elements, and “home office, no cost” is an answer to it.',
    response: 'The manual’s own case-management section covers online-only businesses and tells you how to review one. My plan lists the site as my home office at no cost, which answers the location element, and the market analysis covers how customers find me.',
    ruleIds: ['financialReview', 'feasibility'], concede: false, modes: ['pushback'],
  },
];

export const OBJECTION_BY_ID = Object.fromEntries(OBJECTIONS.map(o => [o.id, o]));
