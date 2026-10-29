// VR&E Self-Employment Prep — the startup-item catalog. Each item the veteran can check maps to one of
// three buckets with its cite:
//   fundable    on the regulation's and the manual's lists (38 CFR 21.257(d), 21.214(e); M28C.IV.C.5 5.04.a)
//   unlisted    not on either list; the regulation frames assistance as "necessary to begin operations" (21.214(e)).
//               Ask, budget it yourself, keep it out of the VR&E ask. Never counted as fundable.
//   prohibited  38 CFR 21.214(f) (land/buildings, leases/rent, vehicles, farm stocking)
// `letterCategory` is the regulation's own wording used in the statement's ask.

export const ITEMS = [
  { id: 'equipment', bucket: 'fundable',   label: 'Equipment, tools, machinery, fixtures, appliances', short: 'equipment and tools',    ruleId: 'approvable', letterCategory: 'essential equipment and tools (38 CFR 21.214(e)(2); 21.257(d)(4))', hint: 'Quotes from a vendor, one per line item, make this the easiest part of the cost analysis.' },
  { id: 'inventory', bucket: 'fundable',   label: 'Inventory, materials, or supplies to open',          short: 'opening inventory',      ruleId: 'approvable', letterCategory: 'minimum stocks of materials and supplies required to begin operations (38 CFR 21.214(e)(1))', hint: '“Minimum” is the regulation’s word. Ask for what it takes to open, not a season of stock.' },
  { id: 'licenses',  bucket: 'fundable',   label: 'Licenses, permits, registration, and fees',        short: 'licenses and fees',      ruleId: 'assistOthers', letterCategory: 'license and other fees required for self-employment (38 CFR 21.257(d)(3))', hint: 'State and local licenses, professional registration, permits. Print the requirements page.' },
  { id: 'training',  bucket: 'fundable',   label: 'Short-term skills training or a certification',    short: 'skills training',        ruleId: 'approvable', letterCategory: 'vocational training (38 CFR 21.257(d)(1))', hint: 'Short-term only on this track: a course or certification, not a degree or diploma (M28C.IV.C.5 5.04.a).' },
  { id: 'mgmt',      bucket: 'fundable',   label: 'A business-management or bookkeeping course',       short: 'business-management training', ruleId: 'assistOthers', letterCategory: 'incidental training in the management of a business (38 CFR 21.257(d)(2))', hint: 'SBA’s free Boots to Business and SBDC courses often cover this at no cost to anyone.' },
  { id: 'marketing', bucket: 'unlisted',   label: 'Marketing, website, branding',                      short: 'marketing and website',  ruleId: 'beginOps', hint: 'Not on the regulation’s list. Budget it yourself; a website is cheap and a counselor will not fund an ad campaign.' },
  { id: 'insurance', bucket: 'unlisted',   label: 'Insurance',                                        short: 'insurance',              ruleId: 'beginOps', hint: 'Not on the regulation’s list. Some offices read a required policy as a “fee”; ask, but do not count on it.' },
  { id: 'capital',   bucket: 'unlisted',   label: 'Working capital, payroll, rent on a going business, operating costs', short: 'working capital', ruleId: 'beginOps', hint: 'VR&E buys what it takes to open the doors, not what it takes to run the first year. This is what your own financing is for.' },
  { id: 'vehicle',   bucket: 'prohibited', label: 'A vehicle: truck, van, car, trailer',               short: 'a vehicle',              ruleId: 'prohibited', hint: 'Hard no in the regulation, purchase or rental. Even for a mobile business.' },
  { id: 'lease',     bucket: 'prohibited', label: 'Lease, rent, or a deposit on a space',              short: 'lease or rent',          ruleId: 'prohibited', hint: 'Hard no, full or partial. The site still has to be in your plan with its cost; you just fund it.' },
  { id: 'land',      bucket: 'prohibited', label: 'Land or a building',                               short: 'land or a building',     ruleId: 'prohibited', hint: 'Hard no, purchase or part payment.' },
  { id: 'livestock', bucket: 'prohibited', label: 'Livestock or stocking a farm',                     short: 'livestock',              ruleId: 'prohibited', hint: 'Hard no for animal husbandry. Farm equipment and seed are a different question; ask.' },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const BUCKET_LABEL = { fundable: 'On VR&E’s list', unlisted: 'Not on the list', prohibited: 'Prohibited' };
export const BUCKET_PLAIN = {
  fundable: 'The regulation and the manual both name this as assistance VA may provide to start the business.',
  unlisted: 'Neither the regulation nor the manual lists this. VA frames its help as what is necessary to begin operations. Ask the counselor, budget it yourself, and leave it out of the written ask.',
  prohibited: '38 CFR 21.214(f) says VA may not pay for this. Take it off the VR&E ask and fund it another way; it can still appear in the plan as something you cover.',
};

/* Business types, for the DOT-code note and the online-only review line */
export const BIZ_TYPES = [
  { id: 'service',  label: 'A service business (consulting, repair, landscaping, cleaning, photography…)' },
  { id: 'trade',    label: 'A trade or skilled work (electrical, HVAC, welding, carpentry, auto…)' },
  { id: 'product',  label: 'A product or retail business' },
  { id: 'online',   label: 'An online-only business (e-commerce, digital services, content)' },
  { id: 'practice', label: 'A licensed professional practice (therapy, accounting, legal, medical, real estate…)' },
  { id: 'food',     label: 'Food, hospitality, or a food truck' },
  { id: 'other',    label: 'Something else' },
];
export const BIZ_BY_ID = Object.fromEntries(BIZ_TYPES.map(b => [b.id, b]));
