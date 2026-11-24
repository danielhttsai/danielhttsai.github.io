// Phenotype library — curated code sets, extracted from the AsPEN ACNU builder
// so the local CCW / Sequential-Trial builders can reuse it.
// Categories: indications, exposures, outcomes. Kept as data only.
//
// Each entry's own `codes` / `definition` / `notes` are its general definition
// (what the builders fill in). The evidence behind it lives in
// phenotype-evidence.ts and is attached below: `validations` (studies that
// measured the accuracy of an algorithm against a reference standard) and, only
// where none was found, `highImpact` (a definition used in a JIF >= 15 journal,
// which is not a validation). An entry with neither says so on the page.
// The free-text `validation` strings this file used to carry were replaced on
// 2026-11-24 by structured studies read from the papers; those strings that named
// no validation study (a methods paper, a study that only used the definition)
// were not carried over.

import { VALIDATIONS, HIGH_IMPACT } from "./phenotype-evidence";

/** One validation study: an algorithm compared with a reference standard, accuracy measured. */
export interface Validation {
  db: string;            // database as filtered on the page (NHIRD, CGRD, Korea NHIS, DPC, HK CDARS ...)
  country: string;
  period?: string;       // data years of the validation sample
  setting?: string;      // population / setting, and the database as the paper names it
  icd10?: string;        // ICD-10 (or -CM / -AM / KCD) codes as validated
  icd9?: string;         // ICD-9-CM codes as validated
  rule?: string;         // other conditions: care setting, counts, drugs, procedures, labs
  ref?: string;          // reference standard
  n?: string;            // validation sample
  ppv?: string; sens?: string; spec?: string; npv?: string; kappa?: string;
  agree?: string;        // agreement figures that are not PPV / sensitivity (drug records, cause of death)
  abstractOnly?: boolean; // only the abstract could be read: nothing beyond it is recorded
  note?: string;
  cite: string; short: string; doi?: string; pmid?: string;
}

/** A definition used in a claims / EHR study in a journal with JIF >= 15. Not a validation:
 *  recorded only for entries where no validation study was found. */
export interface HighImpactUse {
  db: string; country: string; period?: string; setting?: string;
  icd10?: string; icd9?: string; rule?: string;
  journal: string; jif: string; jifYear: string; jifSource: string;
  abstractOnly?: boolean; note?: string;
  cite: string; short: string; doi?: string; pmid?: string;
}

/** Clinical area, used to sub-group each section on the page. */
export type Area = "cv" | "metab" | "renal" | "resp" | "neuro" | "cancer" | "gi" | "msk" | "eye" | "inf" | "injury" | "safety" | "preg" | "death" | "other"
  | "glu" | "cvdrug" | "anticoag" | "psydrug" | "pain" | "general";

export interface Phenotype {
  name: string;
  area?: Area;
  codes?: string;        // the entry's general definition (what the builders fill in)
  notes?: string;
  definition?: string;
  atc?: string[];        // drugs: ATC prefixes for the NHI drug-code lookup
  validations?: Validation[];
  highImpact?: HighImpactUse[];
}

export const AREAS: Record<Area, { en: string; zh: string }> = {
  cv: { en: "Cardiovascular", zh: "心血管" },
  metab: { en: "Diabetes and metabolism", zh: "糖尿病與代謝" },
  renal: { en: "Kidney", zh: "腎臟" },
  resp: { en: "Respiratory", zh: "呼吸" },
  neuro: { en: "Neurology and psychiatry", zh: "神經與精神" },
  cancer: { en: "Cancer", zh: "癌症" },
  gi: { en: "Digestive and liver", zh: "消化與肝臟" },
  msk: { en: "Bone, joint, skin and immune", zh: "骨骼、關節、皮膚與免疫" },
  eye: { en: "Eye", zh: "眼科" },
  inf: { en: "Infection", zh: "感染" },
  injury: { en: "Injury and poisoning", zh: "傷害與中毒" },
  safety: { en: "Drug safety", zh: "藥物安全" },
  preg: { en: "Pregnancy and birth", zh: "懷孕與出生" },
  death: { en: "Death", zh: "死亡" },
  other: { en: "Other", zh: "其他" },
  glu: { en: "Glucose-lowering", zh: "降血糖藥" },
  cvdrug: { en: "Cardiovascular", zh: "心血管用藥" },
  anticoag: { en: "Anticoagulants", zh: "抗凝血劑" },
  psydrug: { en: "Psychotropic", zh: "精神科用藥" },
  pain: { en: "Pain, inflammation and bone", zh: "止痛、抗發炎與骨骼" },
  general: { en: "General", zh: "一般" },
};

export const PHENOTYPES: Record<"indications" | "exposures" | "outcomes", Phenotype[]> = {
  indications: [
    { name: "Type 2 diabetes (T2DM)", area: "metab", codes: "ICD-10 E11.* (or ICD-9 250.*0 / 250.*2); confirm by ≥1 antidiabetic dispensing", notes: "Exclude T1DM (E10.*) separately in the exclusion section." },
    { name: "Hypertension", area: "cv", codes: "ICD-10 I10-I15; or ≥2 dispensings of antihypertensive (ATC C02-C09) within 365 d", notes: "" },
    { name: "Atrial fibrillation", area: "cv", codes: "ICD-10 I48.*; PPV ~90% in claims when from inpatient primary diagnosis", notes: "" },
    { name: "Heart failure", area: "cv", codes: "ICD-10 I50.*; or I11.0 / I13.0 / I13.2 (hypertensive HF)", notes: "" },
    { name: "Chronic kidney disease (CKD)", area: "renal", codes: "ICD-10 N18.*; or eGFR <60 ml/min/1.73m² on ≥2 occasions ≥90 d apart", notes: "" },
    { name: "COPD", area: "resp", codes: "ICD-10 J44.*; ≥1 inpatient or ≥2 outpatient", notes: "" },
    { name: "Schizophrenia", area: "neuro", codes: "ICD-10 F20.* (or F25.* schizoaffective); ≥1 inpatient or ≥2 outpatient", notes: "" },
    { name: "Major depressive disorder", area: "neuro", codes: "ICD-10 F32.*, F33.*", notes: "" },
    { name: "ADHD", area: "neuro", codes: "ICD-10 F90.*; consider linkage to stimulant dispensing for confirmation", notes: "" },
    { name: "Dementia", area: "neuro", codes: "ICD-10 F00-F03, G30.*, G31.0, G31.83", notes: "" },
    { name: "Osteoporosis", area: "msk", codes: "ICD-10 M80.*, M81.*", notes: "" },
    { name: "Pregnancy", area: "preg", codes: "ICD-10 O*, Z3*; supplemented by pregnancy-specific dispensings", notes: "Consider trimester-specific look-back." },
    {
      name: "Lennox-Gastaut Syndrome (LGS)", area: "neuro",
      // Codes as the validation paper states them (Yang, Tsai et al 2025,
      // PMID 41000540, Methods). This used to say G40.812, one code of the
      // G40.81x family the paper actually validated.
      codes: "Base cohort: ≥2 epilepsy diagnosis records (ICD-10 G40/G41; ICD-9-CM 345). Confirmed LGS: \"ICD-10 LGS codes (all G40.81 codes) or at least one rufinamide prescription\", i.e. any G40.81x. Probable LGS: \"aged 10 years or younger when simultaneously prescribed 3 or more antiseizure medications (ASMs), with any ICD-9/10 code for developmental delay\" and no codes for other etiologies (code lists in the paper's Supplementary Tables 1-2).",
      notes: "NHIRD-CGRD two-stage validation: NHIRD identification adjusted by CGRD EMR-confirmed PPV (68% confirmed, 42% probable). 2018 PPV-adjusted prevalence ~2.4 / 100,000 overall (0.6 adult, 10.2 paediatric).",
    },
    // Added 2026-11-24 with their validation studies; no general code set of their own yet:
    // the algorithms are in the studies.
    { name: "Diabetes (any type)", area: "metab" },
    { name: "Type 1 diabetes", area: "metab" },
    { name: "Dyslipidaemia", area: "metab" },
    { name: "Ischaemic heart disease", area: "cv" },
    { name: "End-stage kidney disease / dialysis", area: "renal" },
    { name: "Asthma", area: "resp" },
    { name: "Bronchiectasis", area: "resp" },
    { name: "Psychotic disorders", area: "neuro" },
    { name: "Bipolar disorder", area: "neuro" },
    { name: "Epilepsy", area: "neuro" },
    { name: "Parkinson's disease", area: "neuro" },
    { name: "Chronic hepatitis B", area: "gi" },
    { name: "Chronic hepatitis C", area: "gi" },
    { name: "Liver cirrhosis", area: "gi" },
    { name: "Inflammatory bowel disease", area: "gi" },
    { name: "Rheumatoid arthritis", area: "msk" },
    { name: "Systemic lupus erythematosus", area: "msk" },
    { name: "Ankylosing spondylitis", area: "msk" },
    { name: "Gout", area: "msk" },
    { name: "Psoriasis", area: "msk" },
    { name: "Tuberculosis contact", area: "inf" },
    { name: "Gestational diabetes", area: "preg" },
    { name: "Mother-infant linkage", area: "preg" },
    { name: "Smoking", area: "other" },
    { name: "Atrial flutter", area: "cv" },
    { name: "Insomnia / sleep disorders", area: "neuro" },
    { name: "Glaucoma", area: "eye" },
    { name: "Diabetic macular oedema", area: "eye" },
    { name: "Age-related macular degeneration", area: "eye" },
  ],
  exposures: [
    { name: "Metformin", area: "glu", atc: ["A10BA02"], codes: "ATC A10BA02", notes: "" },
    { name: "Sulfonylureas", area: "glu", atc: ["A10BB"], codes: "ATC A10BB* (glibenclamide A10BB01, gliclazide A10BB09, glimepiride A10BB12, glipizide A10BB07)", notes: "" },
    { name: "DPP-4 inhibitors", area: "glu", atc: ["A10BH"], codes: "ATC A10BH* (sitagliptin A10BH01, vildagliptin A10BH02, saxagliptin A10BH03, linagliptin A10BH05, alogliptin A10BH04)", notes: "" },
    { name: "SGLT2 inhibitors", area: "glu", atc: ["A10BK"], codes: "ATC A10BK* (canagliflozin A10BK02, dapagliflozin A10BK01, empagliflozin A10BK03, ertugliflozin A10BK04)", notes: "Available in most AsPEN sites from ~2014 onward." },
    { name: "GLP-1 receptor agonists", area: "glu", atc: ["A10BJ"], codes: "ATC A10BJ* (exenatide A10BJ01, liraglutide A10BJ02, dulaglutide A10BJ05, semaglutide A10BJ06)", notes: "Tirzepatide is A10BX16, outside the A10BJ wildcard, and is a dual GIP/GLP-1 receptor agonist rather than a GLP-1 receptor agonist. Add A10BX16 explicitly if your class definition covers it — and say which definition you used." },
    { name: "Thiazolidinediones (TZDs)", area: "glu", atc: ["A10BG"], codes: "ATC A10BG* (pioglitazone A10BG03)", notes: "" },
    { name: "Insulin (any)", area: "glu", atc: ["A10A"], codes: "ATC A10A*", notes: "" },
    { name: "Statins", area: "cvdrug", atc: ["C10AA"], codes: "ATC C10AA*", notes: "" },
    { name: "ACE inhibitors", area: "cvdrug", atc: ["C09A", "C09B"], codes: "ATC C09A* / C09B*", notes: "" },
    { name: "ARBs", area: "cvdrug", atc: ["C09C", "C09D"], codes: "ATC C09C* / C09D*", notes: "" },
    { name: "Beta-blockers", area: "cvdrug", atc: ["C07A"], codes: "ATC C07A*", notes: "" },
    { name: "Antipsychotics (any)", area: "psydrug", atc: ["N05A"], codes: "ATC N05A* excluding N05AN (lithium)", notes: "N05A* as a whole includes N05AN01 lithium, a mood stabiliser, so it is excluded above; state it either way. The atypicals are not a contiguous range — N05AH, N05AL and N05AX, plus sertindole and ziprasidone inside N05AE — so a first- versus second-generation split has to be by code, not by range." },
    { name: "ADHD stimulants", area: "psydrug", atc: ["N06BA01", "N06BA02", "N06BA04", "N06BA12"], codes: "ATC N06BA01, N06BA02, N06BA04, N06BA12 (amphetamine, dexamfetamine, methylphenidate, lisdexamfetamine)", notes: "Listed by code rather than as N06BA*, which also contains atomoxetine (N06BA09) — a non-stimulant, and often the comparator rather than the exposure. Modafinil (N06BA07) is in the same group and is not an ADHD stimulant either." },
    { name: "Opioid analgesics", area: "pain", atc: ["N02A"], codes: "ATC N02A* (excluding diamorphine where required)", notes: "Consider OMEDD calculation for dose comparison across sites." },
    { name: "NSAIDs", area: "pain", atc: ["M01A"], codes: "ATC M01A* excluding M01AX", notes: "M01AX is \"other anti-inflammatory and antirheumatic agents, non-steroids\" — systemic drugs including nabumetone (M01AX01), nimesulide (M01AX17) and glucosamine (M01AX05), not topical preparations; topical NSAIDs are M02AA and were never inside M01A. Excluding M01AX therefore drops several oral NSAIDs along with glucosamine. Say which you meant." },
    { name: "Bisphosphonates", area: "pain", atc: ["M05BA", "M05BB"], codes: "ATC M05BA* / M05BB*", notes: "" },
    { name: "Anticoagulants; DOACs", area: "anticoag", atc: ["B01AE07", "B01AF01", "B01AF02", "B01AF03"], codes: "ATC B01AE07 (dabigatran), B01AF01 (rivaroxaban), B01AF02 (apixaban), B01AF03 (edoxaban)", notes: "" },
    { name: "Anticoagulants; warfarin", area: "anticoag", atc: ["B01AA03"], codes: "ATC B01AA03", notes: "" },
    // Added 2026-11-24 with their validation studies; no general code set of their own yet:
    // the algorithms are in the studies.
    { name: "Prescription drug records (general)", area: "general" },
  ],
  outcomes: [
    {
      name: "Myocardial infarction (MI)", area: "cv",
      codes: "ICD-10 I21.*, I22.* (primary discharge diagnosis)",
      definition: "First hospitalisation with a primary discharge diagnosis of acute MI.",
    },
    {
      name: "Ischemic stroke", area: "cv",
      codes: "ICD-10 I63.*, I64.* (primary discharge diagnosis)",
      definition: "First hospitalisation with a primary discharge diagnosis of ischemic stroke.",
    },
    {
      name: "Heart failure hospitalisation", area: "cv",
      codes: "ICD-10 I50.*, I11.0, I13.0, I13.2 (primary discharge diagnosis)",
      definition: "First hospitalisation with a primary discharge diagnosis of heart failure.",
    },
    {
      name: "3-point MACE", area: "cv",
      codes: "Composite: ICD-10 I21.*, I22.* (MI); I63.*, I64.* (stroke); cause-of-death I00-I99 (CV death)",
      definition: "Time to first of: non-fatal MI, non-fatal ischemic stroke, or cardiovascular death; whichever occurs first.",
    },
    {
      name: "4-point MACE", area: "cv",
      codes: "3-point MACE + ICD-10 I50.* heart-failure hospitalisation",
      definition: "Time to first of: non-fatal MI, non-fatal stroke, CV death, or heart-failure hospitalisation.",
    },
    {
      name: "All-cause mortality", area: "death",
      codes: "National death-registry linkage (NHIRD ↔ Cause-of-Death; HIRA ↔ KOSIS; etc.); site-specific",
      definition: "Date of death from any cause.",
    },
    {
      name: "Cardiovascular death", area: "death",
      codes: "Cause-of-death ICD-10 I00-I99 (primary cause); requires death-registry linkage",
      definition: "Death with a cardiovascular primary cause on the death certificate.",
    },
    {
      name: "Acute kidney injury (AKI)", area: "renal",
      codes: "ICD-10 N17.* (primary discharge diagnosis); KDIGO criteria where serum creatinine available",
      definition: "First hospitalisation with primary discharge AKI diagnosis OR serum-creatinine-based KDIGO definition where lab linkage exists.",
    },
    {
      name: "Diabetic ketoacidosis (DKA)", area: "metab",
      codes: "ICD-10 E10.1, E11.1, E13.1, E14.1 (primary discharge diagnosis)",
      definition: "First hospitalisation with primary discharge diagnosis of DKA.",
    },
    {
      name: "Hip fracture", area: "msk",
      codes: "ICD-10 S72.0, S72.1, S72.2 (primary discharge diagnosis); paired with surgical procedure code for highest PPV",
      definition: "First hospitalisation with primary discharge diagnosis of hip fracture (typically also requiring surgical-fixation code).",
      // Withdrawn 2026-08-24. The multi-country hip-fracture paper this cited
      // in BMJ Open 2021 (11:e047258) is first-authored by Sing C-W, not Lai,
      // and is a study PROTOCOL — which declares a phenotype rather than
      // measuring one; the 2023 output of that collaboration is in a different
      // journal. "High PPV reported across multiple AsPEN-network sites" named
      // no study, no site and no number, so no reader could check it either.
      // Withdrawn, not replaced.
      notes: "Pairing the diagnosis with a surgical-fixation procedure code is what raises specificity here; nothing in this library measures how well the pair performs.",
    },
    {
      name: "Any fracture", area: "msk",
      codes: "ICD-10 S02 (skull), S12 (neck), S22 (rib), S32 (lumbar/pelvis), S42 (shoulder), S52 (forearm), S62 (hand), S72 (femur), S82 (leg), S92 (foot)",
      definition: "First hospitalisation or specialist outpatient visit with a fracture diagnosis.",
    },
    {
      name: "Falls", area: "msk",
      codes: "ICD-10 W00-W19 (external cause); R29.6 (history of falling); injury-by-fall codes",
      definition: "First ED or hospital encounter with a fall code (often combined with fall-related injury for higher capture).",
      // "Used as a primary outcome in" is provenance, not validation: that
      // study used this definition, it did not measure it. The validation
      // studies for falls are in phenotype-evidence.ts.
      notes: "Used as a primary outcome in Wang GH et al, BMJ 2021 (PMID 34503972), an AsPEN antipsychotic / cholinesterase-inhibitor falls-and-fractures study; that study used this definition, it did not validate it. It combined fall with injury for specificity.",
    },
    {
      name: "Pneumonia hospitalisation", area: "resp",
      codes: "ICD-10 J12-J18 (primary discharge diagnosis)",
      definition: "First hospitalisation with primary discharge pneumonia diagnosis.",
    },
    {
      name: "GI bleeding", area: "gi",
      codes: "ICD-10 K25.0, K25.2, K25.4, K25.6, K26.0, K26.2, K26.4, K26.6, K27.*, K28.*, K29.0, K92.0, K92.1, K92.2 (primary discharge diagnosis)",
      definition: "First hospitalisation with primary discharge diagnosis of GI bleeding.",
    },
    {
      name: "Intracranial haemorrhage", area: "cv",
      codes: "ICD-10 I60.*, I61.*, I62.* (primary discharge diagnosis)",
      definition: "First hospitalisation with primary discharge intracranial-haemorrhage diagnosis.",
    },
    {
      name: "Suicide / self-harm", area: "neuro",
      codes: "ICD-10 X60-X84 (suicide attempts), Y87.0 (sequelae); T-codes for intentional poisoning; combined with mortality-record cause of death",
      definition: "First ED or hospital encounter with suicide / intentional self-harm code, or mortality with intentional-injury cause.",
      // The free-text validation this entry once carried was withdrawn; the
      // studies now shown come from phenotype-evidence.ts. It used to read: "Used in AsPEN psychotropic-COVID work (e.g., Man KKC
      // et al Lancet Psychiatry 2024;PMID 39241791). Codes have low
      // sensitivity; mortality linkage substantially improves capture."
      // Two things were wrong with it. "Used in" is provenance, not
      // validation — a study that used a definition has not measured it. And
      // the citation is false: PMID 39241791 is Luo H, Chai Y, Li S, et al,
      // "Psychotropic drug prescribing before and during the COVID-19
      // pandemic among people with depressive and anxiety disorders: a
      // multinational network study", Lancet Psychiatry 2024;11(10):807-817 —
      // first author not Man, and a prescribing-trends paper that defines no
      // self-harm outcome. Withdrawn, not replaced.
      //
      // This matters more here than anywhere else it was found: this file
      // feeds `PhenotypeLibrary.astro`, which five builders mount, and the
      // thirty-third run had just made `validation` visible on the row under
      // the label "Validation study" — so the false attribution had been
      // promoted from invisible to advertised. The same string was withdrawn
      // from `self-controlled-case-series` and `case-crossover` by earlier
      // runs; nothing checks the copies of this list against each other.
      notes: "Self-harm codes have low sensitivity in claims and mortality-registry linkage substantially improves capture — the most important thing to say about this definition. Note also that Y87.0 is SEQUELAE of intentional self-harm, so including it counts late effects of an old event inside a first-event numerator.",
    },
    {
      name: "Dementia (incident)", area: "neuro",
      codes: "ICD-10 F00-F03, G30.*, G31.0, G31.83; OR ≥1 dispensing of donepezil / galantamine / rivastigmine / memantine",
      definition: "First diagnosis of dementia OR first dispensing of a dementia medication, whichever earlier.",
      // "uses this combined definition" is provenance. PMID 38146486 is the
      // NeuroGEN infrastructure paper, which describes what the participating
      // databases contain; it does not measure how accurately this code set
      // finds dementia. It was labelled "Validation study" here while the
      // descriptive-analysis library declared the same identifier
      // non-validating — the same PMID carrying opposite verdicts on six pages
      // of one site.
      notes: "Used in AsPEN dementia work — Tsai DHT et al, CNS Drugs 2025 (PMID 40437158) and the NeuroGEN infrastructure paper, Tsai DHT et al, Clin Epidemiol 2023 (PMID 38146486). Those studies used this combined definition; neither measured how accurately it finds dementia. Validation studies of the dementia diagnosis codes alone are under Dementia.",
    },
    {
      name: "Thyroid cancer", area: "cancer",
      codes: "ICD-10 C73; cancer-registry linkage (NHIRD ↔ TCR; HIRA ↔ KNCI); strongly recommended",
      definition: "First diagnosis of thyroid cancer from cancer-registry linkage (preferred) or claims (with lower PPV).",
    },
    // Added 2026-11-24 with their validation studies; no general code set of their own yet:
    // the algorithms are in the studies.
    { name: "Acute coronary syndrome", area: "cv" },
    { name: "Stroke (any type)", area: "cv" },
    { name: "Venous thromboembolism / pulmonary embolism", area: "cv" },
    { name: "Out-of-hospital cardiac arrest", area: "cv" },
    { name: "Cardiogenic shock", area: "cv" },
    { name: "Myocarditis", area: "cv" },
    { name: "Cerebral venous sinus thrombosis", area: "cv" },
    { name: "Hypoglycaemia", area: "metab" },
    { name: "Asthma exacerbation", area: "resp" },
    { name: "Interstitial lung disease", area: "resp" },
    { name: "Guillain-Barré syndrome", area: "neuro" },
    { name: "Cancer (any)", area: "cancer" },
    { name: "Lung cancer", area: "cancer" },
    { name: "Breast cancer", area: "cancer" },
    { name: "Colorectal cancer", area: "cancer" },
    { name: "Cervical cancer", area: "cancer" },
    { name: "Pancreatic cancer", area: "cancer" },
    { name: "GI perforation", area: "gi" },
    { name: "Sepsis", area: "inf" },
    { name: "Tuberculosis", area: "inf" },
    { name: "COVID-19", area: "inf" },
    { name: "Herpes zoster", area: "inf" },
    { name: "Dengue", area: "inf" },
    { name: "Anaphylaxis", area: "safety" },
    { name: "Stevens-Johnson syndrome / TEN", area: "safety" },
    { name: "Adverse drug events", area: "safety" },
    { name: "Major bleeding", area: "safety" },
    { name: "Preterm birth / gestational age", area: "preg" },
    { name: "Cause of death (death certificates)", area: "death" },
    { name: "Systemic embolism", area: "cv" },
    { name: "Infective endocarditis", area: "inf" },
    { name: "Surgical site infection", area: "inf" },
    { name: "Burn injury", area: "injury" },
    { name: "Carbon monoxide poisoning", area: "injury" },
  ],
};

// Attach the evidence by name. A key in phenotype-evidence.ts that matches no
// entry would be silently dropped, so it fails the build instead.
{
  const names = new Set(Object.values(PHENOTYPES).flat().map((p) => p.name));
  for (const k of [...Object.keys(VALIDATIONS), ...Object.keys(HIGH_IMPACT)]) {
    if (!names.has(k)) throw new Error(`phenotype-evidence.ts: no phenotype named "${k}"`);
  }
  for (const p of Object.values(PHENOTYPES).flat()) {
    if (VALIDATIONS[p.name]) p.validations = VALIDATIONS[p.name];
    if (HIGH_IMPACT[p.name]) p.highImpact = HIGH_IMPACT[p.name];
  }
}

/** "validated" | "highImpact" | "none" */
export const tierOf = (p: Phenotype) => (p.validations?.length ? "validated" : p.highImpact?.length ? "highImpact" : "none");

/** Highest PPV a study of this entry reports, as a number in percent (for the builders' short form). */
export function bestPpv(p: Phenotype): { ppv: number; study: Validation } | null {
  let best: { ppv: number; study: Validation } | null = null;
  for (const v of p.validations ?? []) {
    const m = (v.ppv ?? "").match(/\d+(?:\.\d+)?/);
    if (!m) continue;
    let x = parseFloat(m[0]);
    if (x <= 1) x *= 100;
    if (x > 100) continue;
    if (!best || x > best.ppv) best = { ppv: x, study: v };
  }
  return best;
}
