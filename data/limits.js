// VR&E Self-Employment Prep (copied from VR&E Approval Prep 10/28/26) — functional-limit categories, "why a job worked" categories,
// and school-support features mapped to the four M28C.IV.C.2.03.a justification questions.
// These are CATEGORIES, never diagnoses. The letter uses letterPhrase in the veteran's voice.

export const LIMITS = [
  { id: 'standing',      label: 'Prolonged standing or walking',                    letterPhrase: 'I cannot stand or walk for long stretches' },
  { id: 'lifting',       label: 'Lifting, carrying, or heavy physical work',         letterPhrase: 'heavy physical work is not sustainable for me' },
  { id: 'sitting',       label: 'Sitting for long periods without moving',           letterPhrase: 'I cannot sit for long periods without changing position' },
  { id: 'commute',       label: 'Long commutes or extended driving',                 letterPhrase: 'long commutes and extended driving aggravate my conditions' },
  { id: 'concentration', label: 'Concentration, memory, or switching between tasks', letterPhrase: 'I have documented difficulty with concentration and memory' },
  { id: 'stress',        label: 'High-pressure, fast-paced, or conflict-heavy work',  letterPhrase: 'high-pressure and conflict-heavy environments aggravate my disability' },
  { id: 'crowds',        label: 'Crowded, loud, or unpredictable settings',          letterPhrase: 'crowded and unpredictable settings are difficult for me' },
  { id: 'sleep',         label: 'Irregular hours, night shifts, or fatigue',         letterPhrase: 'irregular hours and night work worsen my sleep impairment and fatigue' },
  { id: 'appointments',  label: 'Frequent medical or therapy appointments',          letterPhrase: 'I have frequent medical and therapy appointments' },
  { id: 'hearing',       label: 'Hearing in noisy or phone-heavy environments',      letterPhrase: 'hearing loss and tinnitus make noisy or phone-heavy environments difficult' },
  { id: 'hands',         label: 'Repetitive hand, wrist, or fine-motor work',        letterPhrase: 'repetitive hand and wrist use is limited' },
];

// Why a past job DID work. Used for "worked for me" entries and to describe the target role.
export const FITS = [
  { id: 'structure',   label: 'Predictable schedule and clear procedures',  phrase: 'a predictable schedule and clear procedures' },
  { id: 'desk',        label: 'Desk-based, little physical demand',         phrase: 'desk-based work with little physical demand' },
  { id: 'lowconflict', label: 'Low-conflict, not sales-driven',             phrase: 'low-conflict work that is not sales-driven' },
  { id: 'salary',      label: 'Stable salaried pay, not commission',        phrase: 'stable salaried pay instead of commission' },
  { id: 'flexible',    label: 'Flexibility for medical appointments',       phrase: 'flexibility for medical appointments' },
  { id: 'quiet',       label: 'Quiet, small-team setting',                  phrase: 'a quiet, small-team setting' },
  { id: 'remote',      label: 'Remote or hybrid',                           phrase: 'remote or hybrid work' },
  { id: 'daytime',     label: 'Regular daytime hours',                      phrase: 'regular daytime hours' },
];

// What the school offers. `question` is the M28C.IV.C.2.03.a justification question it answers.
// `pairsWith` lists the limit ids that make the feature a disability-based reason. A feature with
// no checked pairing is left out of the letter (the readiness check says so). Question 3 (placement)
// is the one career-outcomes hook; it stays a supporting line and never leads.
export const FEATURES = [
  { id: 'dso',        question: 2, label: 'Disability services office, with accommodations in place or available', letterPhrase: 'a disability services office where my accommodations are in place', pairsWith: ['concentration', 'stress', 'appointments', 'hearing', 'sleep', 'hands', 'crowds', 'sitting', 'standing'] },
  { id: 'vetcenter',  question: 1, label: 'Veteran resource center or veteran-specific advising',                  letterPhrase: 'a veteran resource center with advisors who work with veterans like me', pairsWith: ['stress', 'crowds', 'concentration'] },
  { id: 'hybrid',     question: 1, label: 'Hybrid, online, or part-time format',                                    letterPhrase: 'a hybrid or part-time format', pairsWith: ['commute', 'appointments', 'standing', 'sitting', 'sleep', 'crowds'] },
  { id: 'vacare',     question: 1, label: 'Close to my VA medical center or providers',                            letterPhrase: 'proximity to my VA providers', pairsWith: ['appointments', 'commute'] },
  { id: 'cohort',     question: 1, label: 'Small classes or a cohort model',                                        letterPhrase: 'small classes and a consistent cohort', pairsWith: ['crowds', 'concentration', 'stress'] },
  { id: 'counseling', question: 1, label: 'On-campus counseling or mental health support',                          letterPhrase: 'on-campus counseling I can reach between classes', pairsWith: ['stress', 'concentration', 'sleep'] },
  { id: 'commute',    question: 4, label: 'Shorter commute than the alternative',                                   letterPhrase: 'a shorter commute', pairsWith: ['commute', 'standing', 'sitting'] },
  { id: 'placement',  question: 3, label: 'Placement services and a placement record in my field',                  letterPhrase: 'placement services with a record in my field', pairsWith: [] },
];

export const LIMIT_BY_ID = Object.fromEntries(LIMITS.map(l => [l.id, l]));
export const FIT_BY_ID = Object.fromEntries(FITS.map(f => [f.id, f]));
export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map(f => [f.id, f]));
