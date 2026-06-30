// TARGET checklist — the canonical 21-item reporting framework for
// observational studies emulating a target trial.
//
//   Cashin AG, Hansford HJ, Hernán MA, Swanson SA, Lee H, Jones MD, et al.
//   Transparent Reporting of Observational Studies Emulating a Target Trial:
//   The TARGET Statement. JAMA 2025. PMID 40899949. (CC BY-ND 4.0)
//   Full checklist + elaboration: https://target-guideline.org
//
// This is the SAME item set the ACNU protocol builder maps to when it
// generates a TARGET checklist .docx, so the generator and the checker
// speak the same language. Item 7 (target-trial emulation) carries the
// sub-elements a-h that are the heart of the framework.

export interface TargetItem {
  /** Item number as printed in the TARGET statement, e.g. "1a", "7", "7c". */
  id: string;
  /** What the item asks the protocol to report. */
  label: string;
  /** A short, plain hint on what "addressed" looks like — steers both the
   *  reader and the AI checker toward the substance, not just the keyword. */
  hint?: string;
}

export interface TargetSection {
  section: string;
  items: TargetItem[];
}

export const TARGET_CITATION =
  "Cashin AG, Hansford HJ, Hernán MA, Swanson SA, Lee H, Jones MD, et al. " +
  "Transparent Reporting of Observational Studies Emulating a Target Trial: " +
  "The TARGET Statement. JAMA 2025. PMID 40899949.";

export const TARGET_URL = "https://target-guideline.org";

export const TARGET_CHECKLIST: TargetSection[] = [
  {
    section: "Abstract",
    items: [
      { id: "1a", label: "State that the study emulates a target trial using observational data; give objectives and briefly summarise the specified target trial.", hint: "The abstract should name the target-trial framing explicitly, not just describe an observational cohort." },
      { id: "1b", label: "Report the data source(s) used for the emulation.", hint: "Which database(s)/registries, named in the abstract." },
      { id: "1c", label: "Summarise key assumptions, statistical methods, findings, and conclusions.", hint: "Identifying assumptions + main estimate + conclusion in the abstract." },
    ],
  },
  {
    section: "Introduction",
    items: [
      { id: "2", label: "Background: scientific context and the gap in knowledge.", hint: "Why this question matters and what is unknown." },
      { id: "3", label: "State the causal question.", hint: "An explicit causal contrast — population, exposure, comparator, outcome — not merely an 'association' aim." },
      { id: "4", label: "Rationale for emulating a target trial with the available data; cite informing RCTs where relevant.", hint: "Why an emulation (rather than/in addition to an RCT), and which trials inform the design." },
    ],
  },
  {
    section: "Methods",
    items: [
      { id: "5", label: "Data source(s): original purpose, type, geographic location(s), setting, time period; data linkage if relevant.", hint: "Provenance and linkage of each data source, not just its name." },
      { id: "6", label: "Specify the target trial (the hypothetical pragmatic RCT being emulated).", hint: "A described protocol for the trial you would have run." },
      { id: "7", label: "Describe how each target-trial component is emulated in the observational data (elements a–h below).", hint: "The one-to-one mapping of trial design onto the data is the core of TARGET." },
      { id: "7a", label: "Eligibility criteria.", hint: "Inclusion/exclusion defined using only information available at baseline (no post-baseline criteria)." },
      { id: "7b", label: "Treatment strategies.", hint: "The strategies being compared, defined precisely (e.g. new use of A vs active comparator B; washout)." },
      { id: "7c", label: "Assignment procedures.", hint: "How treatment groups are assigned at baseline and how baseline confounding is handled (e.g. PS methods)." },
      { id: "7d", label: "Follow-up period.", hint: "Time zero and when follow-up ends; aligned eligibility, assignment, and start of follow-up to avoid immortal-time bias." },
      { id: "7e", label: "Outcome(s).", hint: "Operational outcome definition and code set." },
      { id: "7f", label: "Causal contrast(s) of interest.", hint: "Intention-to-treat-equivalent and/or per-protocol effect, stated explicitly." },
      { id: "7g", label: "Identifying assumptions (e.g. exchangeability, positivity, consistency) and how they are addressed.", hint: "Named assumptions plus covariates/methods that make them plausible." },
      { id: "7h", label: "Data analysis plan.", hint: "Estimator, effect measure, subgroup/sensitivity analyses pre-specified." },
    ],
  },
  {
    section: "Results",
    items: [
      { id: "8", label: "Participant selection (a flow diagram is strongly recommended).", hint: "From source population to analytic cohort, with exclusions." },
      { id: "9", label: "Baseline characteristics by treatment strategy.", hint: "A 'Table 1' across strategies, with balance metrics where PS is used." },
      { id: "10", label: "Length of follow-up and reasons for end of follow-up.", hint: "Person-time and why follow-up ended." },
      { id: "11", label: "Missing data, by treatment strategy.", hint: "Extent and handling of missingness." },
      { id: "12", label: "Outcome frequency / distribution, by treatment strategy.", hint: "Events and rates per group." },
      { id: "13", label: "Effect estimates with measures of precision; absolute and relative.", hint: "Both relative (e.g. HR) and absolute (e.g. risk difference) with CIs." },
      { id: "14", label: "Sensitivity / additional analyses.", hint: "Pre-specified robustness checks." },
    ],
  },
  {
    section: "Discussion",
    items: [
      { id: "15", label: "Interpretation of key findings.", hint: "What the results mean for the causal question." },
      { id: "16", label: "Limitations: differences between the target trial and the emulation; plausibility of identifying assumptions.", hint: "Honest appraisal of confounding, misclassification, and target-vs-emulation gaps." },
    ],
  },
  {
    section: "Other information",
    items: [
      { id: "17", label: "Ethics approval and approval number(s).", hint: "IRB/ethics statement." },
      { id: "18", label: "Study protocol registration (and where).", hint: "Pre-registration location, e.g. EU PAS Register / ClinicalTrials.gov." },
      { id: "19", label: "Sharing of data, analytic code, and materials.", hint: "What is shared and how to obtain it." },
      { id: "20", label: "Funding source(s).", hint: "Who funded the study and their role." },
      { id: "21", label: "Conflicts of interest.", hint: "Declarations for each author." },
    ],
  },
];

/** Flattened item list (handy for the AI prompt and for scoring). */
export const TARGET_ITEMS_FLAT: (TargetItem & { section: string })[] =
  TARGET_CHECKLIST.flatMap((s) => s.items.map((it) => ({ ...it, section: s.section })));
