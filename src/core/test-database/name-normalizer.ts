/**
 * Name Normalizer — Alias System
 *
 * Purpose:
 *   Resolves common lab test name variations to their canonical
 *   standard names used in the Smart Report Engine.
 *
 * When is this used?
 *   This is the FINAL fallback in the mapping pipeline (Step 4).
 *   It runs only when:
 *     (a) observationId didn't match any client override
 *     (b) observationId didn't match any global BM ID
 *     (c) testName didn't match any standard name exactly
 *
 *   Primary use case: Portal clients where the AI (AA) parses a lab
 *   PDF and sends the test name in both the id and name fields.
 *   The AI may use abbreviated or slightly different names.
 *
 * Rules:
 *   - Keys MUST be lowercase (matching is always lowercase)
 *   - Values MUST be a standard name that exists in profile-mapping.ts
 *   - Add new entries here when admin sees unmapped parameters in logs
 *
 * DO NOT add fuzzy/partial matches — every entry must be deliberate.
 */

export const NAME_ALIASES: Record<string, string> = {

  // ── Diabetes Monitoring ────────────────────────────────────────────
  'fbs':                                      'Blood Sugar (Fasting)',
  'blood glucose fasting':                    'Blood Sugar (Fasting)',
  'blood glucose (fasting)':                  'Blood Sugar (Fasting)',
  'glucose fasting':                          'Blood Sugar (Fasting)',
  'fasting glucose':                          'Blood Sugar (Fasting)',
  'fasting blood sugar':                      'Blood Sugar (Fasting)',
  'blood sugar f':                            'Blood Sugar (Fasting)',
  'blood sugar (f)':                          'Blood Sugar (Fasting)',
  'glucose (f)':                              'Blood Sugar (Fasting)',
  'fasting blood glucose':                    'Blood Sugar (Fasting)',
  'sugar fasting':                            'Blood Sugar (Fasting)',

  'rbs':                                      'Blood Sugar (Random)',
  'blood glucose random':                     'Blood Sugar (Random)',
  'blood glucose (random)':                   'Blood Sugar (Random)',
  'random blood sugar':                       'Blood Sugar (Random)',
  'blood sugar (r)':                          'Blood Sugar (Random)',
  'glucose random':                           'Blood Sugar (Random)',

  'ppbs':                                     'Blood Sugar (Postprandial)',
  'post prandial blood sugar':                'Blood Sugar (Postprandial)',
  'post-prandial blood sugar':                'Blood Sugar (Postprandial)',
  'pp blood sugar':                           'Blood Sugar (Postprandial)',
  'blood sugar (pp)':                         'Blood Sugar (Postprandial)',
  'postprandial glucose':                     'Blood Sugar (Postprandial)',
  '2hr post glucose':                         'Blood Sugar (Postprandial)',

  'hba1c':                                    'HbA1c (Glycosylated Haemoglobin)',
  'hb a1c':                                   'HbA1c (Glycosylated Haemoglobin)',
  'a1c':                                      'HbA1c (Glycosylated Haemoglobin)',
  'glycated haemoglobin':                     'HbA1c (Glycosylated Haemoglobin)',
  'glycosylated haemoglobin':                 'HbA1c (Glycosylated Haemoglobin)',
  'glycated hemoglobin':                      'HbA1c (Glycosylated Haemoglobin)',
  'glycosylated hemoglobin':                  'HbA1c (Glycosylated Haemoglobin)',
  'haemoglobin a1c':                          'HbA1c (Glycosylated Haemoglobin)',
  'hemoglobin a1c':                           'HbA1c (Glycosylated Haemoglobin)',
  'glycohaemoglobin':                         'HbA1c (Glycosylated Haemoglobin)',
  'glycohemoglobin':                          'HbA1c (Glycosylated Haemoglobin)',

  'eag':                                      'eAG (Estimated Average Glucose)',
  'estimated average glucose':                'eAG (Estimated Average Glucose)',
  'avg glucose':                              'eAG (Estimated Average Glucose)',
  'average glucose':                          'eAG (Estimated Average Glucose)',

  // ── Liver Profile ──────────────────────────────────────────────────
  'alt':                                      'SGPT (ALT)',
  'sgpt':                                     'SGPT (ALT)',
  'sgpt (alt)':                               'SGPT (ALT)',
  'alanine transaminase':                     'SGPT (ALT)',
  'alanine aminotransferase':                 'SGPT (ALT)',
  'serum alanine transaminase':               'SGPT (ALT)',
  'serum alt':                                'SGPT (ALT)',

  'ast':                                      'SGOT (AST)',
  'sgot':                                     'SGOT (AST)',
  'sgot (ast)':                               'SGOT (AST)',
  'aspartate transaminase':                   'SGOT (AST)',
  'aspartate aminotransferase':               'SGOT (AST)',
  'serum aspartate transaminase':             'SGOT (AST)',
  'serum ast':                                'SGOT (AST)',

  'total bilirubin':                          'Total Bilirubin',
  'bilirubin total':                          'Total Bilirubin',
  'bilirubin (total)':                        'Total Bilirubin',
  'serum bilirubin total':                    'Total Bilirubin',
  't. bilirubin':                             'Total Bilirubin',

  'direct bilirubin':                         'Direct Bilirubin',
  'bilirubin direct':                         'Direct Bilirubin',
  'bilirubin (direct)':                       'Direct Bilirubin',
  'd. bilirubin':                             'Direct Bilirubin',

  'indirect bilirubin':                       'Indirect Bilirubin',
  'bilirubin indirect':                       'Indirect Bilirubin',
  'bilirubin (indirect)':                     'Indirect Bilirubin',
  'i. bilirubin':                             'Indirect Bilirubin',

  'alb':                                      'Albumin',
  'serum albumin':                            'Albumin',
  's. albumin':                               'Albumin',

  'total protein':                            'Protein (Total)',
  'serum protein':                            'Protein (Total)',
  'serum total protein':                      'Protein (Total)',
  't. protein':                               'Protein (Total)',
  's. protein':                               'Protein (Total)',
  'proteins total':                           'Protein (Total)',

  'globulin':                                 'Globulin',
  'serum globulin':                           'Globulin',

  'alp':                                      'ALP',
  'alkaline phosphatase':                     'ALP',
  'serum alkaline phosphatase':               'ALP',
  's. alkaline phosphatase':                  'ALP',

  'ggt':                                      'GGT',
  'gamma gt':                                 'GGT',
  'gamma glutamyl transferase':               'GGT',
  'gamma-glutamyl transpeptidase':            'GGT',

  'a:g ratio':                                'Albumin : Globulin ratio',
  'ag ratio':                                 'Albumin : Globulin ratio',
  'albumin globulin ratio':                   'Albumin : Globulin ratio',

  // ── Lipid Profile ──────────────────────────────────────────────────
  'cholesterol':                              'Total Cholesterol',
  'total chol':                               'Total Cholesterol',
  'total cholesterol':                        'Total Cholesterol',
  'serum cholesterol':                        'Total Cholesterol',
  't. cholesterol':                           'Total Cholesterol',
  's. cholesterol':                           'Total Cholesterol',
  'chol':                                     'Total Cholesterol',

  'ldl':                                      'LDL Cholesterol',
  'ldl-c':                                    'LDL Cholesterol',
  'ldl chol':                                 'LDL Cholesterol',
  'low density lipoprotein':                  'LDL Cholesterol',
  'ldl cholesterol':                          'LDL Cholesterol',
  'ldl-cholesterol':                          'LDL Cholesterol',

  'hdl':                                      'HDL Cholesterol',
  'hdl-c':                                    'HDL Cholesterol',
  'hdl chol':                                 'HDL Cholesterol',
  'high density lipoprotein':                 'HDL Cholesterol',
  'hdl cholesterol':                          'HDL Cholesterol',
  'hdl-cholesterol':                          'HDL Cholesterol',

  'tg':                                       'Triglycerides',
  'trigs':                                    'Triglycerides',
  'serum triglycerides':                      'Triglycerides',
  'trig':                                     'Triglycerides',
  'triglyceride':                             'Triglycerides',

  'vldl':                                     'VLDL',
  'vldl cholesterol':                         'VLDL',

  'non hdl cholesterol':                      'Non - HDL Cholesterol',
  'non-hdl cholesterol':                      'Non - HDL Cholesterol',
  'non-hdl':                                  'Non - HDL Cholesterol',

  'chol/hdl ratio':                           'Total Cholesterol : HDL ratio',
  'total chol/hdl':                           'Total Cholesterol : HDL ratio',

  'ldl/hdl ratio':                            'LDL : HDL ratio',
  'ldl hdl ratio':                            'LDL : HDL ratio',

  // ── Thyroid Profile ────────────────────────────────────────────────
  'tsh':                                      'TSH',
  'thyroid stimulating hormone':              'TSH',
  'thyroid stimulating hormone (tsh)':        'TSH',
  'serum tsh':                                'TSH',
  's. tsh':                                   'TSH',
  'ultrasensitive tsh':                       'TSH',

  't3':                                       'T3 (Triiodothyronine)',
  'triiodothyronine':                         'T3 (Triiodothyronine)',
  'total t3':                                 'T3 (Triiodothyronine)',
  'serum t3':                                 'T3 (Triiodothyronine)',

  't4':                                       'T4 (Thyroxine)',
  'thyroxine':                                'T4 (Thyroxine)',
  'total t4':                                 'T4 (Thyroxine)',
  'serum t4':                                 'T4 (Thyroxine)',

  'free t3':                                  'Free T3 (Triiodothyronine)',
  'ft3':                                      'Free T3 (Triiodothyronine)',
  'f t3':                                     'Free T3 (Triiodothyronine)',
  'free triiodothyronine':                    'Free T3 (Triiodothyronine)',

  'free t4':                                  'Free T4 (Thyroxine)',
  'ft4':                                      'Free T4 (Thyroxine)',
  'f t4':                                     'Free T4 (Thyroxine)',
  'free thyroxine':                           'Free T4 (Thyroxine)',

  // ── Blood Counts ───────────────────────────────────────────────────
  'haemoglobin':                              'Haemoglobin',
  'hemoglobin':                               'Haemoglobin',
  'hgb':                                      'Haemoglobin',
  'hb':                                       'Haemoglobin',
  'hb%':                                      'Haemoglobin',

  'wbc':                                      'Total Leukocyte Count',
  'tlc':                                      'Total Leukocyte Count',
  'white blood cells':                        'Total Leukocyte Count',
  'white blood cell count':                   'Total Leukocyte Count',
  'leukocyte count':                          'Total Leukocyte Count',
  'total wbc':                                'Total Leukocyte Count',
  'total white blood cell count':             'Total Leukocyte Count',
  'wbc count':                                'Total Leukocyte Count',

  'platelet':                                 'Platelet Count',
  'platelets':                                'Platelet Count',
  'plt':                                      'Platelet Count',
  'thrombocyte count':                        'Platelet Count',
  'platelet count':                           'Platelet Count',
  'blood platelet count':                     'Platelet Count',

  'mcv':                                      'MCV',
  'mean corpuscular volume':                  'MCV',

  'mch':                                      'MCH',
  'mean corpuscular haemoglobin':             'MCH',
  'mean corpuscular hemoglobin':              'MCH',

  'mchc':                                     'MCHC',
  'mean corpuscular haemoglobin concentration': 'MCHC',

  'rdw':                                      'RDW',
  'rdw-cv':                                   'RDW-CV',
  'rdw-sd':                                   'RDW-SD',

  'hct':                                      'Haematocrit',
  'haematocrit':                              'Haematocrit',
  'hematocrit':                               'Haematocrit',
  'packed cell volume':                       'Haematocrit',
  'pcv':                                      'Haematocrit',

  'esr':                                      'ESR',
  'erythrocyte sedimentation rate':           'ESR',
  'sed rate':                                 'ESR',

  'neutrophils':                              'Neutrophils',
  'lymphocytes':                              'Lymphocytes',
  'monocytes':                                'Monocytes',
  'eosinophils':                              'Eosinophils',
  'basophils':                                'Basophils',

  'rbc':                                      'RBC count',
  'rbc count':                                'RBC count',
  'red blood cell count':                     'RBC count',
  'red blood cells':                          'RBC count',

  'mpv':                                      'MPV',
  'mean platelet volume':                     'MPV',

  // ── Kidney Profile ─────────────────────────────────────────────────
  'creatinine':                               'Serum Creatinine',
  's. creatinine':                            'Serum Creatinine',
  's.creatinine':                             'Serum Creatinine',
  'creatinine serum':                         'Serum Creatinine',
  'serum creat':                              'Serum Creatinine',
  'blood creatinine':                         'Serum Creatinine',
  'creat':                                    'Serum Creatinine',

  'bun':                                      'Blood Urea Nitrogen (BUN)',
  'blood urea nitrogen':                      'Blood Urea Nitrogen (BUN)',
  'urea nitrogen':                            'Blood Urea Nitrogen (BUN)',

  'urea':                                     'Blood Urea',
  'blood urea':                               'Blood Urea',
  'serum urea':                               'Blood Urea',
  's. urea':                                  'Blood Urea',

  'uric acid':                                'Uric Acid',
  's. uric acid':                             'Uric Acid',
  'serum uric acid':                          'Uric Acid',
  'uric acid serum':                          'Uric Acid',

  'egfr':                                     'Glomerular Filtration Rate',
  'gfr':                                      'Glomerular Filtration Rate',
  'glomerular filtration rate':               'Glomerular Filtration Rate',
  'estimated gfr':                            'Glomerular Filtration Rate',

  // ── Electrolyte Profile ────────────────────────────────────────────
  'na':                                       'Sodium',
  'serum sodium':                             'Sodium',
  's. sodium':                                'Sodium',
  'na+':                                      'Sodium',

  'k':                                        'Potassium',
  'serum potassium':                          'Potassium',
  's. potassium':                             'Potassium',
  'k+':                                       'Potassium',

  'cl':                                       'Chloride',
  'serum chloride':                           'Chloride',
  's. chloride':                              'Chloride',
  'cl-':                                      'Chloride',

  'ca':                                       'Calcium',
  'serum calcium':                            'Calcium',
  's. calcium':                               'Calcium',
  'total calcium':                            'Calcium',

  'phosphorus':                               'Phosphorus',
  'serum phosphorus':                         'Phosphorus',
  'inorganic phosphorus':                     'Phosphorus',
  's. phosphorus':                            'Phosphorus',
  'phosphate':                                'Phosphorus',

  'mg':                                       'Magnesium',
  'serum magnesium':                          'Magnesium',
  's. magnesium':                             'Magnesium',
  'magnesium serum':                          'Magnesium',

  // ── Vitamin Profile ────────────────────────────────────────────────
  'vitamin d':                                'Vitamin D (25-Hydroxy)',
  'vit d':                                    'Vitamin D (25-Hydroxy)',
  '25-oh vitamin d':                          'Vitamin D (25-Hydroxy)',
  '25-hydroxyvitamin d':                      'Vitamin D (25-Hydroxy)',
  '25 oh vitamin d':                          'Vitamin D (25-Hydroxy)',
  'vitamin d3':                               'Vitamin D (25-Hydroxy)',
  '25(oh)d':                                  'Vitamin D (25-Hydroxy)',
  '25 hydroxyvitamin d':                      'Vitamin D (25-Hydroxy)',
  'vitamin d total':                          'Vitamin D (25-Hydroxy)',

  'vitamin b12':                              'Vitamin B12',
  'vit b12':                                  'Vitamin B12',
  'b12':                                      'Vitamin B12',
  'cyanocobalamin':                           'Vitamin B12',
  'cobalamin':                                'Vitamin B12',
  'vit. b12':                                 'Vitamin B12',

  'folate':                                   'Vitamin B9',
  'folic acid':                               'Vitamin B9',
  'vitamin b9':                               'Vitamin B9',
  'serum folate':                             'Vitamin B9',
  'serum folic acid':                         'Vitamin B9',

  'vitamin c':                                'Vitamin C',
  'vit c':                                    'Vitamin C',
  'ascorbic acid':                            'Vitamin C',

  'vitamin a':                                'Vitamin A',
  'vit a':                                    'Vitamin A',
  'retinol':                                  'Vitamin A',

  // ── Inflammation / Cardiac ─────────────────────────────────────────
  'crp':                                      'CRP',
  'c reactive protein':                       'CRP',
  'c-reactive protein':                       'CRP',

  'hscrp':                                    'HsCRP',
  'hs-crp':                                   'HsCRP',
  'high sensitivity crp':                     'HsCRP',
  'hs crp':                                   'HsCRP',
  'hsCRP':                                    'HsCRP',
  'highly sensitive crp':                     'HsCRP',

  // ── Iron Studies ───────────────────────────────────────────────────
  'ferritin':                                 'Ferritin',
  'serum ferritin':                           'Ferritin',
  's. ferritin':                              'Ferritin',

  'iron':                                     'Iron',
  'serum iron':                               'Iron',
  's. iron':                                  'Iron',
  'fe':                                       'Iron',

  'tibc':                                     'TIBC',
  'total iron binding capacity':              'TIBC',

  'uibc':                                     'UIBC',
  'unsaturated iron binding capacity':        'UIBC',

  // ── Hormones ───────────────────────────────────────────────────────
  'testosterone':                             'Testosterone',
  'serum testosterone':                       'Testosterone',
  's. testosterone':                          'Testosterone',

  'prolactin':                                'Prolactin',
  'serum prolactin':                          'Prolactin',

  'lh':                                       'Leutinizing Harmone',
  'luteinizing hormone':                      'Leutinizing Harmone',
  'leutinizing hormone':                      'Leutinizing Harmone',

  'fsh':                                      'FSH',
  'follicle stimulating hormone':             'FSH',

  'cortisol':                                 'Cortisol Serum (p.m)',
  'serum cortisol':                           'Cortisol Serum (p.m)',
  'cortisol am':                              'Cortisol Serum (p.m)',

  'amh':                                      'AMH',
  'anti mullerian hormone':                   'AMH',
  'anti-mullerian hormone':                   'AMH',

  'dhea':                                     'DHEA-Sulphate',
  'dheas':                                    'DHEA-Sulphate',
  'dhea-s':                                   'DHEA-Sulphate',
  'dehydroepiandrosterone sulfate':           'DHEA-Sulphate',

  // ── Pancreas / Other ───────────────────────────────────────────────
  'amylase':                                  'Amylase',
  'serum amylase':                            'Amylase',

  'lipase':                                   'Lipase',
  'serum lipase':                             'Lipase',

  // ── BMI & BP ───────────────────────────────────────────────────────
  'bmi':                                      'Body Mass Index(BMI)',
  'body mass index':                          'Body Mass Index(BMI)',
  'body mass index (bmi)':                    'Body Mass Index(BMI)',

  'blood pressure':                           'Blood Pressure',
  'bp':                                       'Blood Pressure',
  'b.p.':                                     'Blood Pressure',

  'systolic':                                 'Systolic',
  'systolic bp':                              'Systolic',
  'sbp':                                      'Systolic',

  'diastolic':                                'Diastolic',
  'diastolic bp':                             'Diastolic',
  'dbp':                                      'Diastolic',

  'pulse':                                    'Pulse',
  'pulse rate':                               'Pulse',
  'heart rate':                               'Pulse',
  'hr':                                       'Pulse',

  'weight':                                   'Weight',
  'body weight':                              'Weight',

  'height':                                   'Height',
  'body height':                              'Height',
};

/**
 * Resolves a raw test name to a canonical standard name via alias lookup.
 *
 * @param rawName - The raw test name from the lab/portal input
 * @returns The canonical standard name if found, undefined otherwise
 *
 * @example
 *   resolveAlias('hba1c')         → 'HbA1c (Glycosylated Haemoglobin)'
 *   resolveAlias('FBS')           → 'Blood Sugar (Fasting)'
 *   resolveAlias('unknown test')  → undefined
 */
export function resolveAlias(rawName: string): string | undefined {
  if (!rawName || rawName.trim() === '') return undefined;
  return NAME_ALIASES[rawName.trim().toLowerCase()];
}

/**
 * Returns all aliases registered for diagnostic/admin use.
 */
export function getAllAliases(): Record<string, string> {
  return NAME_ALIASES;
}
