// Regression test for the claims/clinical/exclude keyword seed in
// src/pages/tools/active-comparator-new-user.astro.
//
// The seed decides which covariates go into the error-prone propensity score.
// Getting it wrong in the "clinical variable wrongly marked claims" direction
// is dangerous: the variable enters PS_ep, drags PS_gs toward PS_ep, and
// collapses the calibration correction to a no-op that reads as "no unmeasured
// confounding". These cases cover the languages, specialties and coded-vs-
// measured distinctions that broke it before.
//
//   node scripts/psc-heuristic-test.mjs
//
// It extracts the live regexes from the .astro file, so it fails if the page
// and this list drift apart.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
const SRC = new URL('../src/pages/tools/active-comparator-new-user.astro', import.meta.url);
const src = readFileSync(SRC, 'utf8');
const body = src.slice(src.indexOf('const pscNorm ='), src.indexOf('// Candidate variables ='));
const tmp = new URL('./.psc-heur.tmp.mjs', import.meta.url);
writeFileSync(tmp, body + String.fromCharCode(10) + 'export { pscHeuristic, pscNorm };' + String.fromCharCode(10));
const { pscHeuristic } = await import(tmp.href + '?t=' + Date.now());
unlinkSync(tmp);
const cases = [
 // [name, expected]
 ['身高','clinical'],['體重','clinical'],['血壓','clinical'],['吸菸','clinical'],['眼壓','clinical'],
 ['身長','clinical'],['体重','clinical'],['血圧','clinical'],['喫煙','clinical'],['眼圧','clinical'],
 ['혈압','clinical'],['체중','clinical'],['흡연','clinical'],['크레아티닌','clinical'],
 ['Créatinine','clinical'],['Tension artérielle','clinical'],
 ['PANSS_total','clinical'],['HAM-D','clinical'],['Ki67_index','clinical'],['PD-L1 TPS','clinical'],
 ['Kt_V','clinical'],['gestational_age_wk','clinical'],['Apgar_5min','clinical'],
 ['serum sodium','clinical'],['troponin_peak','clinical'],['family history of MI','clinical'],
 ['functional status','clinical'],['genetic risk score','clinical'],
 ['환자번호','exclude'],['登録番号','exclude'],['案例編號','exclude'],['subject_ref','exclude'],['enrolment_no','exclude'],
 ['weight loss diagnosis','claims'],['alcohol use disorder diagnosis','claims'],
 ['smoking cessation counselling visit','claims'],['biopsy procedure count','claims'],['MRI utilisation count','claims'],
 // regression: the Chi Mei / builtin set must not move
 ['HbA1c_first','clinical'],['eGFR_last','clinical'],['BMI','clinical'],['收縮壓_術前','clinical'],
 ['DM duration','clinical'],['corrected visual acuity pre-op','clinical'],['Smoking status','clinical'],
 ['病歷號碼','exclude'],['outcome_ESRD','exclude'],
 ['Age (continuous)','claims'],['Sex','claims'],['Antiplatelets','claims'],['Charlson Comorbidity Index (CCI)','claims'],
 ['Hypertension','claims'],['Chronic kidney disease','claims'],['Outpatient visit count','claims'],
 ['Polypharmacy (≥5 drug classes)','claims'],['Metformin','claims'],['history_Renal diseases','claims'],
 ['Performance status, absent from claims but proxiable in combination: opioid dispensing intensity in the 180 days before index','clinical'],
];
let bad=0;
for (const [n,exp] of cases) { const got = pscHeuristic(n);
  if (got!==exp) { bad++; console.log('FAIL  %s  -> %s (want %s)', n.slice(0,60), got, exp); } }
console.log(bad===0 ? `ALL ${cases.length} PASS` : `${bad}/${cases.length} FAILED`);
if (bad) process.exit(1);
