// HARPER — the HARmonized Protocol template to Enhance Reproducibility of
// hypothesis-evaluating real-world-evidence studies on treatment effects.
//
//   Wang SV, Pottegård A, Crown W, Arlett P, Ashcroft DM, Benchimol EI, et al.
//   HARmonized Protocol Template to Enhance Reproducibility of hypothesis
//   evaluating real-world evidence studies on treatment effects: a good
//   practices report of a joint ISPE/ISPOR task force.
//   Pharmacoepidemiol Drug Saf 2023 (publ. 2022); PMID 36215113.
//   Template: https://drugepi.gitlab-pages.partners.org/harper/
//
// Unlike a reporting checklist (STROBE/TARGET, applied at write-up), HARPER is
// a PROTOCOL template, applied before the study runs. Its distinctive feature
// is that each methods element pairs structured free text ("context and
// rationale") with a structured OPERATIONAL-DEFINITION TABLE (Tables 1-13) and
// a mandatory STUDY DESIGN DIAGRAM. The checker rewards whether those
// structured artifacts are present, not just whether the topic is mentioned.
// Item ids follow the template's own numbering. Kept in lock-step with
// HARPER_ITEMS inside workers/target-checker/worker.js.

import type { TargetSection } from "./target";

export const HARPER_CITATION =
  "Wang SV, Pottegård A, Crown W, et al. HARmonized Protocol Template to Enhance " +
  "Reproducibility (HARPER): a good practices report of a joint ISPE/ISPOR task force. " +
  "Pharmacoepidemiol Drug Saf 2023; PMID 36215113.";

export const HARPER_URL = "https://drugepi.gitlab-pages.partners.org/harper/";

export const HARPER_CHECKLIST: TargetSection[] = [
  {
    section: "Front matter",
    items: [
      { id: "1", label: "Title page and study identifiers.", hint: "Descriptive title, version/date, registration number, key personnel/sponsor." },
      { id: "2", label: "Structured abstract / synopsis.", hint: "Concise summary of question, design, population, exposure, outcome, and analysis." },
      { id: "3", label: "Amendments and updates.", hint: "A log of protocol changes with dates and rationale." },
      { id: "4", label: "Milestones and timeline (Table 1).", hint: "Planned dates for start/end of data extraction, analysis, and reporting." },
    ],
  },
  {
    section: "Rationale & objectives",
    items: [
      { id: "5", label: "Rationale and background.", hint: "Scientific context, prior evidence, and the gap this study addresses." },
      { id: "6", label: "Research question and objectives — with estimands (Table 2).", hint: "Primary/secondary questions framed as estimands: population, treatments, outcome, summary measure, and handling of intercurrent events." },
    ],
  },
  {
    section: "Research methods",
    items: [
      { id: "7.1", label: "Study design.", hint: "The design (e.g. new-user active-comparator cohort) named and justified." },
      { id: "7.2", label: "Study design diagram.", hint: "HARPER REQUIRES a design diagram showing time 0, time anchors, and assessment windows on a timeline." },
      { id: "7.3.1", label: "Time 0 and primary time anchors — operational definition (Table 3).", hint: "Cohort-entry / index-date definition with eligibility–assignment–follow-up alignment to avoid immortal-time bias." },
      { id: "7.3.2", label: "Inclusion criteria — operational definitions (Table 4).", hint: "Each inclusion criterion with code lists / measurement windows, defined on baseline-available information." },
      { id: "7.3.3", label: "Exclusion criteria — operational definitions (Table 5).", hint: "Each exclusion criterion with code lists / windows and rationale." },
      { id: "7.4.1", label: "Exposure(s) of interest — operational definitions (Table 6).", hint: "Code lists, exposure windows, grace period, and treatment-definition rationale." },
      { id: "7.4.2", label: "Outcome(s) of interest — operational definitions (Table 7).", hint: "Code lists, validation/PPV, and ascertainment window." },
      { id: "7.4.3", label: "Follow-up — operational definition (Table 8).", hint: "Start and end of follow-up and censoring rules." },
      { id: "7.4.4", label: "Covariates — operational definitions (Table 9).", hint: "Confounders and effect modifiers with code lists and assessment windows." },
      { id: "7.5", label: "Data analysis plan, incl. sensitivity analyses (Tables 10–11).", hint: "Estimator, effect measure, confounding control, subgroups; and pre-specified sensitivity analyses with rationale, strengths, limitations." },
      { id: "7.6", label: "Data sources — metadata (Table 12).", hint: "Provenance, type, setting, time period, linkage, and software/versions for each data source." },
      { id: "7.7", label: "Data management.", hint: "Extraction, transformation, derived variables, and data flow." },
      { id: "7.8", label: "Quality control.", hint: "Checks on data, code, and reproducibility (e.g. code review, diagnostics)." },
      { id: "7.9", label: "Study size and feasibility (Table 13).", hint: "Power/sample-size calculation or a feasibility count." },
    ],
  },
  {
    section: "Other information",
    items: [
      { id: "8", label: "Limitations of the methods.", hint: "Confounding, misclassification, missing data, and generalisability appraised honestly." },
      { id: "9", label: "Protection of human subjects.", hint: "Ethics / IRB approval and data-governance statement." },
      { id: "10", label: "Reporting of adverse events.", hint: "Whether and how adverse events are handled (or why not applicable to secondary data)." },
    ],
  },
];
