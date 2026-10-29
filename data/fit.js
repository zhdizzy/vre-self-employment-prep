// VR&E Self-Employment Prep — the six factors the counselor assesses (M28C.IV.C.5 5.03, verbatim text),
// each with the input it reads and a line on what to bring. Plus the "why self-employment fits my limits"
// picker used in the statement. These are CATEGORIES, never diagnoses.

export const FIT_FACTORS = [
  { n: 1, id: 'skills',    text: 'Aptitudes, interests, abilities, and transferable skills', bring: 'Your work history in or near this line of work, military training that transfers, certifications you hold.' },
  { n: 2, id: 'bizskills', text: 'Business planning, operation, and management skills', bring: 'Any business or management course, SBA’s Boots to Business, bookkeeping experience, or the management training you are asking VR&E to fund.' },
  { n: 3, id: 'stability', text: 'Stability and progression of the claimant’s disability conditions that may affect establishing and operating a business', bring: 'Your rating decision’s findings and an honest account of how the business is built around your limits: hours, pace, environment, appointments.' },
  { n: 4, id: 'resources', text: 'Personal resources including financial resources and other support systems', bring: 'A personal financial statement, your credit report, savings or financing identified, and who is in your corner (family, a mentor, a VBOC counselor).' },
  { n: 5, id: 'legal',     text: 'Legal considerations', bring: 'The licenses, permits, registrations, and insurance your trade requires, printed from the state or county page; your entity plan (LLC, sole proprietor).' },
  { n: 6, id: 'commitment', text: 'Personal commitment and resilience', bring: 'The work you have already done: the SBA appointment, the draft plan, the market research. Evidence beats adjectives.' },
];

/* Why self-employment fits my rated limits: the controls it gives. Used in section 2 of the statement. */
export const SE_FITS = [
  { id: 'schedule',   label: 'I control my hours and can work when my conditions allow',          phrase: 'control over my hours, so I can work when my conditions allow and rest when they do not' },
  { id: 'environment', label: 'I control the environment: noise, crowds, lighting, space',          phrase: 'control over my work environment, including noise, crowds, and space' },
  { id: 'nopublic',   label: 'No public-contact or customer-facing duties I cannot sustain',       phrase: 'the ability to limit public-contact duties to what I can sustain' },
  { id: 'home',       label: 'I can work from home or close to it',                                phrase: 'the ability to work from or near home, without a commute that aggravates my conditions' },
  { id: 'pace',       label: 'I set the pace and the workload',                                    phrase: 'control over pace and workload' },
  { id: 'appointments', label: 'Flexibility for medical and therapy appointments',                 phrase: 'flexibility to keep medical and therapy appointments without jeopardizing my income' },
  { id: 'nosupervision', label: 'No supervisor relationship that has been a trigger in past jobs', phrase: 'freedom from the supervisory conflicts that ended past jobs' },
  { id: 'physical',   label: 'I choose work within my physical limits',                            phrase: 'the ability to choose tasks within my documented physical limits and delegate the rest' },
];
export const SE_FIT_BY_ID = Object.fromEntries(SE_FITS.map(f => [f.id, f]));
