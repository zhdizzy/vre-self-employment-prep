// VR&E Self-Employment Prep — what to bring. `showIf(state)` decides whether an item appears.
// The ticked count feeds the feasibility card's evidence line and the statement's supporting-documents list.

export const CHECKLIST = [
  { id: 'rating',    label: 'Your full rating decision (the narrative pages with the findings, not just the award letter)', letterName: 'rating decision', showIf: () => true },
  { id: 'dd214',     label: 'DD-214', letterName: 'DD-214', showIf: () => true },
  { id: 'resume',    label: 'Resume or work history, showing experience in or near this line of work', letterName: 'resume and work history', showIf: () => true },
  { id: 'plan',      label: 'Your business plan, draft or outline, built to the seven feasibility headings', letterName: 'draft business plan', showIf: () => true },
  { id: 'sba',       label: 'SBA / VBOC / SBDC / SCORE appointment confirmation, or the counselor’s notes if you have met', letterName: 'confirmation of SBA counseling', showIf: () => true },
  { id: 'financial', label: 'Personal financial statement and a recent credit report', letterName: 'personal financial statement and credit report', showIf: () => true },
  { id: 'quotes',    label: 'Written quotes for each equipment and inventory item you are asking VA to consider', letterName: 'vendor quotes for each item', showIf: s => (s.itemIds || []).some(id => id === 'equipment' || id === 'inventory') },
  { id: 'licenses',  label: 'The licensing, permit, or certification requirements for your trade, printed from the state or county page', letterName: 'licensing requirements for the trade', showIf: () => true },
  { id: 'site',      label: 'Site information and its cost (a lease quote, or a note that it is your home office at no cost)', letterName: 'site information and cost', showIf: () => true },
  { id: 'training',  label: 'Course or certification details and cost for any training in your plan', letterName: 'training course details', showIf: s => s.training === 'short' || (s.itemIds || []).includes('training') },
  { id: 'market',    label: 'Your market research: who buys, what they pay now, who else sells it', letterName: 'market research', showIf: () => true },
  { id: 'statement', label: 'A printed copy of the Self-Employment Goal Statement from this page', letterName: 'this statement', showIf: () => true },
  { id: 'receipts',  label: 'Receipts for training already paid at a VA-approved facility (for the retroactive question)', letterName: 'receipts for training already completed', showIf: s => s.mode === 'own' && s.operating === 'under12' },
];
