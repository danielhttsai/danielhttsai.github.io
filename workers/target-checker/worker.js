/**
 * TARGET checker — Cloudflare Worker
 * ----------------------------------
 * A thin, trusted proxy in front of the Google Gemini API. The browser sends a
 * protocol's text; this Worker pairs it with the TARGET checklist + a fixed
 * rubric and asks Gemini to judge, item by item, whether the protocol meets
 * each TARGET reporting principle. The API key never reaches the browser.
 *
 * Why a Worker at all: the site is static (GitHub Pages), so there is nowhere
 * else to hide the key. The Worker also locks CORS to the site, caps the input
 * size, and (optionally) checks a Cloudflare Turnstile token to deter bots.
 *
 * Cost: on Gemini's FREE tier (Flash models), billing is disabled, so the worst
 * case is exhausting the daily free quota — never a bill. See README.md.
 *
 * Secrets / vars (set with `wrangler secret put` / in wrangler.toml [vars]):
 *   GEMINI_API_KEY   (secret, required)  — from https://aistudio.google.com/apikey
 *   GEMINI_MODEL     (var, optional)      — defaults to "gemini-flash-latest"
 *   ALLOWED_ORIGIN   (var, optional)      — defaults to the production site
 *   TURNSTILE_SECRET (secret, optional)   — if set, a Turnstile token is required
 */

const DEFAULT_MODEL = "gemini-flash-latest";
const DEFAULT_ORIGIN = "https://danielhttsai.github.io";
const MAX_CHARS = 60000; // ~15k tokens; protocols above this are truncated

// The TARGET checklist, inlined so the Worker is self-contained and the prompt
// is trusted (callers cannot inject their own checklist). Kept in lock-step
// with src/data/target.ts. Cashin AG et al. JAMA 2025; PMID 40899949.
const TARGET_ITEMS = [
  ["1a", "Abstract", "State that the study emulates a target trial using observational data; objectives + brief summary of the target trial."],
  ["1b", "Abstract", "Report the data source(s) used for the emulation."],
  ["1c", "Abstract", "Summarise key assumptions, statistical methods, findings, and conclusions."],
  ["2", "Introduction", "Background: scientific context and the gap in knowledge."],
  ["3", "Introduction", "State the causal question explicitly (population, exposure, comparator, outcome)."],
  ["4", "Introduction", "Rationale for emulating a target trial; cite informing RCTs where relevant."],
  ["5", "Methods", "Data source(s): purpose, type, location, setting, time period; linkage if relevant."],
  ["6", "Methods", "Specify the target trial (the hypothetical pragmatic RCT being emulated)."],
  ["7", "Methods", "Describe how each target-trial component is emulated in the data (7a-7h)."],
  ["7a", "Methods", "Eligibility criteria, using only baseline information (no post-baseline criteria)."],
  ["7b", "Methods", "Treatment strategies, defined precisely (e.g. new use of A vs active comparator B; washout)."],
  ["7c", "Methods", "Assignment procedures and how baseline confounding is handled (e.g. PS methods)."],
  ["7d", "Methods", "Follow-up period: time zero and end; alignment to avoid immortal-time bias."],
  ["7e", "Methods", "Outcome(s): operational definition and code set."],
  ["7f", "Methods", "Causal contrast(s): ITT-equivalent and/or per-protocol effect, stated explicitly."],
  ["7g", "Methods", "Identifying assumptions (exchangeability, positivity, consistency) and how addressed."],
  ["7h", "Methods", "Data analysis plan: estimator, effect measure, subgroup/sensitivity analyses."],
  ["8", "Results", "Participant selection (flow diagram strongly recommended)."],
  ["9", "Results", "Baseline characteristics by treatment strategy."],
  ["10", "Results", "Length of follow-up and reasons for end of follow-up."],
  ["11", "Results", "Missing data, by treatment strategy."],
  ["12", "Results", "Outcome frequency / distribution, by treatment strategy."],
  ["13", "Results", "Effect estimates with precision; absolute and relative."],
  ["14", "Results", "Sensitivity / additional analyses."],
  ["15", "Discussion", "Interpretation of key findings."],
  ["16", "Discussion", "Limitations: target-vs-emulation differences; plausibility of assumptions."],
  ["17", "Other information", "Ethics approval and approval number(s)."],
  ["18", "Other information", "Study protocol registration (and where)."],
  ["19", "Other information", "Sharing of data, analytic code, and materials."],
  ["20", "Other information", "Funding source(s)."],
  ["21", "Other information", "Conflicts of interest."],
];

// HARPER protocol template (Wang SV et al, ISPE/ISPOR; PMID 36215113).
// Kept in lock-step with src/data/harper.ts. HARPER pairs each methods element
// with an operational-definition table (Tables 1-13) + a study design diagram.
const HARPER_ITEMS = [
  ["1", "Front matter", "Title page and study identifiers (title, version/date, registration, personnel/sponsor)."],
  ["2", "Front matter", "Structured abstract / synopsis."],
  ["3", "Front matter", "Amendments and updates log."],
  ["4", "Front matter", "Milestones and timeline (Table 1)."],
  ["5", "Rationale & objectives", "Rationale and background; scientific context and gap."],
  ["6", "Rationale & objectives", "Research question and objectives framed as estimands (Table 2)."],
  ["7.1", "Research methods", "Study design, named and justified."],
  ["7.2", "Research methods", "Study design diagram (REQUIRED) showing time 0, time anchors, and assessment windows."],
  ["7.3.1", "Research methods", "Time 0 and primary time anchors — operational definition (Table 3); eligibility-assignment-follow-up alignment."],
  ["7.3.2", "Research methods", "Inclusion criteria — operational definitions with code lists/windows (Table 4)."],
  ["7.3.3", "Research methods", "Exclusion criteria — operational definitions (Table 5)."],
  ["7.4.1", "Research methods", "Exposure(s) — operational definitions: code lists, exposure windows, grace period (Table 6)."],
  ["7.4.2", "Research methods", "Outcome(s) — operational definitions: code lists, validation, ascertainment window (Table 7)."],
  ["7.4.3", "Research methods", "Follow-up — operational definition: start, end, censoring (Table 8)."],
  ["7.4.4", "Research methods", "Covariates — operational definitions: confounders & effect modifiers with windows (Table 9)."],
  ["7.5", "Research methods", "Data analysis plan incl. pre-specified sensitivity analyses (Tables 10-11)."],
  ["7.6", "Research methods", "Data sources — metadata: provenance, setting, period, linkage, software (Table 12)."],
  ["7.7", "Research methods", "Data management: extraction, transformation, derived variables."],
  ["7.8", "Research methods", "Quality control: checks on data, code, and reproducibility."],
  ["7.9", "Research methods", "Study size and feasibility — power/sample size or feasibility count (Table 13)."],
  ["8", "Other information", "Limitations of the methods (confounding, misclassification, missing data, generalisability)."],
  ["9", "Other information", "Protection of human subjects (ethics/IRB, data governance)."],
  ["10", "Other information", "Reporting of adverse events (or why not applicable to secondary data)."],
];

// Planned analytical outputs a rigorous RWE protocol should mock up in advance
// (shell tables + figure plans). The checker tests whether each is pre-specified.
const DELIVERABLES = [
  ["Participant flow diagram", "attrition from the source population to the analytic cohort (CONSORT-style)"],
  ["Baseline characteristics table (Table 1)", "baseline covariates by treatment group, ideally with standardized mean differences"],
  ["Love plot / covariate balance", "standardized mean differences before vs after PS matching/weighting"],
  ["Primary results table (shell)", "effect estimates (HR/RR/RD/IRR) with 95% CIs, events, and person-time"],
  ["Cumulative incidence / Kaplan-Meier curve", "time-to-event outcome curves by group (where applicable)"],
  ["Forest plot", "subgroup, sensitivity, or multi-site / meta-analytic estimates"],
  ["Sensitivity-analysis outputs", "negative-control outcomes, E-value, or quantitative bias analysis"],
];

const FRAMEWORKS = {
  harper: {
    name: "HARPER",
    intro: 'the HARPER protocol template (HARmonized Protocol Template to Enhance Reproducibility; Wang SV et al., a joint ISPE/ISPOR task force good-practices report; Pharmacoepidemiol Drug Saf 2023, PMID 36215113). HARPER is a PROTOCOL template applied BEFORE a study runs — judge whether each element is PRESENT and adequately PRE-SPECIFIED with its operational-definition table, not whether results are reported',
    emphasis: 'HARPER\'s distinctive requirements are a STUDY DESIGN DIAGRAM (7.2) and an OPERATIONAL-DEFINITION TABLE for time 0 (7.3.1), inclusion (7.3.2), exclusion (7.3.3), exposure (7.4.1), outcome (7.4.2), follow-up (7.4.3), and covariates (7.4.4) — typically code lists with measurement windows. Mark an item "partial" if the topic is discussed but the operational definition / code list / table is missing. Weigh these structured artifacts heavily.',
    items: HARPER_ITEMS,
  },
  target: {
    name: "TARGET",
    intro: 'the TARGET reporting guideline (Cashin AG, Hansford HJ, Hernán MA, Swanson SA, et al. "Transparent Reporting of Observational Studies Emulating a Target Trial: The TARGET Statement." JAMA 2025; PMID 40899949)',
    emphasis: 'Pay special attention to the target-trial-specific items (3, 6, 7a-7h, 16): explicit causal question, a specified target trial, the one-to-one emulation mapping, time-zero alignment / immortal-time bias, identifying assumptions, and an honest target-vs-emulation limitations appraisal. These are where target-trial emulations most often fall short.',
    items: TARGET_ITEMS,
  },
};

const SHARED_EXTRACTION = `ALSO extract the study design so it can be drawn as a study-design diagram, in the "design" object:
- designType: the design in a few words (e.g. "Active-comparator new-user cohort", "Self-controlled case series", "Case-crossover", "Descriptive cohort").
- population, exposure, comparator, outcome: short phrases. Use "—" where genuinely absent (e.g. no comparator in a descriptive or self-controlled design).
- indexDate: how time zero (cohort entry / index date) is defined in one short phrase.
- inclusion: an array of the inclusion / eligibility criteria. EXTRACT THESE EVEN IF THEY ARE WRITTEN AS PROSE or embedded in the population / eligibility / setting description — do NOT leave this empty whenever the document describes who is eligible (e.g. age limits, required diagnoses, required prior treatments such as "failure of two antidepressants", enrolment/look-back requirements, calendar window). One criterion per element, short near-verbatim phrases.
- exclusion: an array of the exclusion criteria, likewise extracted from prose OR lists (e.g. competing diagnoses, prior exposure within a washout, contraindications, pregnancy, prior outcome). Do NOT leave empty if the document describes who is excluded.
- covariates: an array of the covariates / confounders / baseline variables the study adjusts for, matches/weights on, or measures at baseline. EXTRACT from any adjustment / confounding / propensity-score / "we controlled for" description, not only from an explicit "covariates" list. Do NOT leave empty if the document names baseline variables used for adjustment.
- For inclusion, exclusion, and covariates: only return an empty array if the document genuinely contains NO such information at all. If eligibility or adjustment is described anywhere, these arrays MUST be populated.
- timeline: the key analysis windows on a DAY axis where day 0 = the index date. Use NEGATIVE days for time before index and POSITIVE for time after. For each window give label, kind (one of: washout, covariate, exposure, followup, grace, outcome), startDay, endDay, and an optional short note. Infer durations from the text — e.g. "365-day washout" → start -365, end 0; "180-day covariate look-back" → -180 to 0; "5-year follow-up" → 0 to 1825; "30-day grace period" → 0 to 30. If a duration is not stated, choose a reasonable default and set note to "assumed". Always include an eligibility/washout window before index and a follow-up window after index where the design has them. Order windows chronologically by startDay.

SEPARATELY, assess whether the protocol PRE-SPECIFIES the planned analytical outputs that a rigorous RWE study mocks up in advance (shell tables and figure plans), in the "deliverables" array. The seven names below are written in the vocabulary of a person-level, propensity-score-adjusted, time-to-event cohort. JUDGE EACH ITEM AS THIS DESIGN OWES IT: where a design produces a modified version of an item — a case-selection flow rather than a cohort attrition flow, a case-series or period-composition description rather than a baseline table by treatment group, an incidence-rate-ratio-by-risk-window profile rather than a survival curve — judge that modified version, and say in the evidence which version you judged. For each item below return status: "present" (explicitly planned or described — a shell table, a named figure, or a clear statement it will be produced), "partial" (implied or partially described but not clearly pre-specified), "absent" (this design can produce this output or an equivalent, and the document does not plan it), or "na" (this design's ESTIMATOR structurally cannot produce this output or any equivalent). Prefer "absent" over "partial" when there is no mention at all. Give short evidence for every item, and a concrete suggestion for "partial" and "absent" items; for "present" a brief refinement or confirmation is enough, and for "na" no suggestion is wanted, so return "—" (the page does not print a suggestion on either).
This "na" is NOT the item-level "na" defined earlier in this prompt: that one is about the document TYPE (a protocol has no results yet). Here a protocol that has not been run is still expected to PLAN every output its design can produce, so "the study has not happened yet" is never grounds for "na" on a deliverable.
"na" carries a burden of proof. Its evidence must name the design and the structural feature of its estimator that rules the output out — e.g. covariate balance in a within-person design, where conditioning on the person already removes all time-invariant confounding, so there is no between-person balance to diagnose; or a survival curve where no persons are followed from a shared time origin. The document's silence is never grounds for "na": "not needed here", "not usual for this design" and "the authors did not plan one" all mean "absent". NEVER mark "Primary results table (shell)" or "Sensitivity-analysis outputs" as "na" — every design has a primary estimate and identifying assumptions to probe, whatever the measure and whatever the assumption. When torn between "na" and "absent", choose "absent".
Return one entry per item, using the exact name.
The deliverables (name | what it is):
${DELIVERABLES.map(([n, d]) => `${n} | ${d}`).join("\n")}

ALSO judge whether this study is a target-trial emulation — an observational study explicitly designed to emulate a specified hypothetical randomized trial (explicit "target trial" framing, an emulation table, or a deliberate one-to-one design-to-data mapping). Return targetTrialEmulation.likely (boolean) and a one-sentence reason. Judge this independently of which guideline is being checked.`;

function buildSystemPrompt(fwKey) {
  const fw = FRAMEWORKS[fwKey] || FRAMEWORKS.harper;
  return `You are a methodological reviewer assessing whether a research protocol or manuscript conforms to ${fw.intro}.

You will be given the full text of a study document. Judge EACH ${fw.name} item below against the text and return a verdict.

For every item, assign one status:
- "met": the text clearly and substantively addresses the item.
- "partial": the item is touched on but is vague, incomplete, or missing a key element.
- "missing": the item is not addressed at all.
- "na": genuinely not applicable to THIS document type (e.g. results items in a pre-study protocol that has not been run). Prefer "missing" over "na" unless the item truly cannot apply.

Rules:
- Judge SUBSTANCE, not keywords. A document that says "we adjust for confounders" without specifying them does NOT fully satisfy a covariates item.
- Be a strict but fair reviewer. Do not give credit for things that are merely implied.
- "evidence": one short sentence — quote or closely paraphrase the part of the text that addresses the item, OR state plainly what is missing. Max ~30 words.
- "suggestion": one concrete, actionable sentence on how to satisfy the item (for "met" you may give a brief refinement or confirmation). Max ~30 words.
- Return a verdict for ALL items, in the order given, using the exact item ids.
- ${fw.emphasis}

${SHARED_EXTRACTION}

The ${fw.name} items (id | section | what it asks):
${fw.items.map(([id, sec, label]) => `${id} | ${sec} | ${label}`).join("\n")}`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    targetTrialEmulation: {
      type: "object",
      properties: {
        likely: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["likely", "reason"],
    },
    design: {
      type: "object",
      properties: {
        designType: { type: "string" },
        population: { type: "string" },
        exposure: { type: "string" },
        comparator: { type: "string" },
        outcome: { type: "string" },
        indexDate: { type: "string" },
        inclusion: { type: "array", items: { type: "string" } },
        exclusion: { type: "array", items: { type: "string" } },
        covariates: { type: "array", items: { type: "string" } },
        timeline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              kind: { type: "string", enum: ["washout", "covariate", "exposure", "followup", "grace", "outcome"] },
              startDay: { type: "number" },
              endDay: { type: "number" },
              note: { type: "string" },
            },
            required: ["label", "kind", "startDay", "endDay"],
          },
        },
      },
      required: ["designType", "population", "exposure", "comparator", "outcome", "indexDate", "inclusion", "exclusion", "covariates", "timeline"],
    },
    deliverables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          // "na" is enforced here, not merely requested: this schema is sent to
          // Gemini as a responseSchema, so a status outside the enum cannot be
          // generated. Without it the model had no way to say "this design
          // cannot produce this output" and the prompt told it to say "absent"
          // — which the page renders red and attaches a suggestion to. Keep in
          // lock-step with DELIV_ALIASES and DELIV_META in protocol-checker.astro.
          status: { type: "string", enum: ["present", "partial", "absent", "na"] },
          evidence: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["name", "status", "evidence", "suggestion"],
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["met", "partial", "missing", "na"] },
          evidence: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["id", "status", "evidence", "suggestion"],
      },
    },
  },
  required: ["summary", "targetTrialEmulation", "design", "deliverables", "items"],
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function verifyTurnstile(secret, token, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token || "");
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const data = await r.json().catch(() => ({ success: false }));
  return !!data.success;
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const reqOrigin = request.headers.get("Origin") || "";
    // Echo the request origin only if it is the allowed site (or localhost dev).
    const isLocal = /^https?:\/\/localhost(:\d+)?$/.test(reqOrigin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(reqOrigin);
    const origin = reqOrigin === allowed || isLocal ? reqOrigin : allowed;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, origin);
    }
    if (reqOrigin && reqOrigin !== allowed && !isLocal) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "Checker is not configured (missing API key)." }, 500, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400, origin);
    }

    // ── Mode: confounder triage (RWE Studio) ─────────────────────────────
    // Receives ONLY metadata — the clinical question and column names/types,
    // never patient-level rows. Classifies each column's causal role for the
    // SPECIFIC exposure→outcome pair, so the client can pre-tick genuine
    // confounders and warn against adjusting for mediators/colliders.
    if (payload && payload.mode === "confounders") {
      if (env.TURNSTILE_SECRET) {
        const ok = await verifyTurnstile(env.TURNSTILE_SECRET, payload.turnstileToken, request.headers.get("CF-Connecting-IP"));
        if (!ok) return json({ error: "Bot check failed. Please reload and try again." }, 403, origin);
      }
      const q = payload.question || {};
      const exposure = String(q.exposure || "").slice(0, 300).trim();
      const outcome = String(q.outcome || "").slice(0, 300).trim();
      const population = String(q.population || "").slice(0, 300).trim();
      const comparator = String(q.comparator || "").slice(0, 300).trim();
      const cols = (Array.isArray(payload.columns) ? payload.columns : [])
        .slice(0, 150)
        .map((c) => ({ name: String(c && c.name || "").slice(0, 120), type: String(c && c.type || "").slice(0, 20) }))
        .filter((c) => c.name);
      if (!exposure || !outcome || !cols.length) {
        return json({ error: "Provide the exposure, outcome, and a column list." }, 400, origin);
      }

      const sysText = [
        "You are a senior pharmacoepidemiologist doing causal-inference variable triage for a new-user active-comparator cohort study.",
        "Study question: among " + (population || "(population not stated)") + ", the effect of " + exposure +
          (comparator ? " versus " + comparator : "") + " on " + outcome + ".",
        "You are given ONLY the dataset's column names (and rough types) — no data. For EACH column, judge its causal role FOR THIS SPECIFIC exposure–outcome pair:",
        "- confounder: plausibly a common cause of (or proxy for a common cause of) BOTH treatment choice and the outcome, measured at/before baseline → SHOULD be adjusted (adjust=true).",
        "- mediator: plausibly on the causal pathway from the exposure to the outcome, or measured after treatment start → must NOT be adjusted.",
        "- collider: plausibly caused by both exposure and outcome (or a consequence of the outcome) → must NOT be adjusted.",
        "- instrument: affects treatment choice but has no independent path to the outcome (e.g. prescriber preference, calendar period of policy) → should NOT be adjusted (amplifies bias).",
        "- structural: IDs, dates, follow-up time, the treatment/outcome variables themselves, or administrative bookkeeping → not applicable (adjust=false).",
        "- unclear: cannot tell from the name → adjust=false, say why in one clause.",
        "Be conservative: only mark adjust=true when the column plausibly precedes treatment and relates to BOTH prescribing and the outcome. Cryptic names are 'unclear', not guesses.",
        "Give a SHORT reason (max ~15 words) for every column, phrased clinically (e.g. 'renal function influences both drug choice and MACE risk').",
      ].join("\n");
      const userText = "COLUMNS (name : type):\n" + cols.map((c) => c.name + " : " + (c.type || "?")).join("\n");
      const schema = {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                role: { type: "STRING", enum: ["confounder", "mediator", "collider", "instrument", "structural", "unclear"] },
                adjust: { type: "BOOLEAN" },
                reason: { type: "STRING" },
              },
              required: ["name", "role", "adjust", "reason"],
            },
          },
        },
        required: ["items"],
      };

      const gBody = {
        system_instruction: { parts: [{ text: sysText }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: schema },
      };
      const RETRY2 = new Set([500, 502, 503]);
      let res2 = null, net2 = false;
      const url2 = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
      for (let a = 0; a < 2; a++) {
        if (a > 0) await new Promise((r) => setTimeout(r, 1200));
        try { res2 = await fetch(url2, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gBody) }); }
        catch { net2 = true; continue; }
        net2 = false;
        if (res2.ok || !RETRY2.has(res2.status)) break;
      }
      if (net2 || !res2) return json({ error: "Could not reach the AI service. Please try again shortly." }, 502, origin);
      if (!res2.ok) {
        if (res2.status === 429) return json({ error: "The AI is rate-limited right now. Please wait a minute and try again." }, 429, origin);
        return json({ error: "The AI service returned an error (" + res2.status + ")." }, 502, origin);
      }
      const data2 = await res2.json().catch(() => null);
      const raw2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed2 = null;
      try { parsed2 = JSON.parse(raw2); } catch {}
      if (!parsed2 || !Array.isArray(parsed2.items)) return json({ error: "The AI returned an unreadable result. Please try again." }, 502, origin);
      return json({ items: parsed2.items }, 200, origin);
    }

    // ── Mode: data-source triage for propensity-score calibration ────────
    // Receives ONLY metadata — the causal question, the name of the claims
    // database the main study will run in, and variable NAMES (plus optional
    // codebook text the investigator typed). Never patient-level rows.
    // For each variable it judges (a) whether the variable is plausibly
    // recorded in an administrative CLAIMS database or is CLINICAL-only, and
    // (b) how strongly it is likely to confound the specific exposure→outcome
    // contrast. The client uses this to split covariates into the error-prone
    // PS (claims) and the gold-standard PS (claims + clinical) of Stürmer's
    // propensity-score-calibration method.
    if (payload && payload.mode === "psvars") {
      if (env.TURNSTILE_SECRET) {
        const ok = await verifyTurnstile(env.TURNSTILE_SECRET, payload.turnstileToken, request.headers.get("CF-Connecting-IP"));
        if (!ok) return json({ error: "Bot check failed. Please reload and try again." }, 403, origin);
      }
      const q = payload.question || {};
      const exposure = String(q.exposure || "").slice(0, 300).trim();
      const outcome = String(q.outcome || "").slice(0, 300).trim();
      const population = String(q.population || "").slice(0, 300).trim();
      const comparator = String(q.comparator || "").slice(0, 300).trim();
      const claimsDb = String(payload.claimsDb || "").slice(0, 200).trim() || "Taiwan's National Health Insurance Research Database (NHIRD)";
      // Each variable carries a short caller-supplied id. Names are echoed back
      // by the model and are unreliable as keys: it re-cases them, appends the
      // note, and — for the long descriptive covariate names investigators
      // actually write — gets a truncated copy in the first place. The id is
      // what the client matches on.
      const vars = (Array.isArray(payload.variables) ? payload.variables : [])
        .slice(0, 200)
        .map((v, i) => ({
          id: String((v && v.id) || ("v" + i)).slice(0, 24),
          name: String((v && v.name) || "").slice(0, 240),
          note: String((v && v.note) || "").slice(0, 240),
        }))
        .filter((v) => v.name);
      if (!vars.length) {
        return json({ error: "Provide at least one variable name." }, 400, origin);
      }

      const sysText = [
        "You are a senior pharmacoepidemiologist planning a propensity-score CALIBRATION study (Stürmer T, Schneeweiss S, Avorn J, Glynn RJ, Am J Epidemiol 2005;162:279-89).",
        "A large study will run in " + claimsDb + " — an administrative CLAIMS database — and can only build an error-prone propensity score from the variables that database records. A smaller, richer validation dataset (hospital EMR / registry / cohort) holds the same claims variables PLUS extra clinical variables, and is used to build the gold-standard propensity score.",
        exposure && outcome
          ? "The causal question: among " + (population || "(population not stated)") + ", the effect of " + exposure + (comparator ? " versus " + comparator : "") + " on " + outcome + "."
          : "The causal question was not fully specified; judge confounding generically for a drug-safety cohort study and say so in the reason.",
        "",
        "What an administrative claims database like this DOES contain: patient demographics (age, sex, region, insurance/premium category), enrolment and disenrolment dates, outpatient/inpatient/emergency encounters with DIAGNOSIS codes (ICD), PROCEDURE and operation codes, drug DISPENSING / prescription records with ATC codes, dose, days supply and dispensing counts, costs, provider and facility identifiers, and (via linkage) death registry and cancer registry records. Anything that can be derived from those — comorbidity history flags, Charlson/Elixhauser indices, comedication flags, prior healthcare utilisation, treatment counts, index and follow-up dates, coded outcomes — is CLAIMS-available.",
        "What such a database DOES NOT contain: laboratory RESULT VALUES (HbA1c, creatinine, eGFR, lipids, haemoglobin, albumin, INR, urine albumin, etc.), vital signs and anthropometry (height, weight, BMI, blood pressure, heart rate), imaging or test MEASUREMENTS and their readings (ejection fraction, spirometry, visual acuity, intraocular pressure, tumour stage/grade, biopsy findings), clinical severity scores (NYHA, GCS, NIHSS, Child-Pugh, MELD, ECOG, APACHE), lifestyle and behaviour (smoking, alcohol, betel quid, diet, exercise), symptoms, functional status, frailty measured clinically, socioeconomic detail beyond coarse insurance/region proxies, family history, and genetic data.",
        "Borderline judgements: a coded DIAGNOSIS of a condition (e.g. 'obesity diagnosed', 'CKD diagnosis') IS in claims even though the underlying measurement is not; a lab-derived STAGE or VALUE is not. Disease DURATION is only partly available in claims — it is left-truncated at the database start — treat it as clinical unless the note says otherwise, and say why.",
        "",
        "Each variable is given as `id | name` (with `:: note` where the investigator supplied one). Return the id EXACTLY as given — it is how the caller matches your answer back. Return one entry per variable, for every variable.",
        "For EACH variable below, return:",
        "- source: 'claims' if the variable is plausibly recorded in or derivable from " + claimsDb + "; 'clinical' if only a clinical/EMR/registry dataset would have it; 'unclear' if the name is too cryptic to judge.",
        "- confounding: how strongly the variable is likely to confound THIS exposure→outcome contrast — 'strong', 'moderate', 'weak', or 'none'. Use 'none' for identifiers, dates, follow-up bookkeeping, the treatment variable itself, and the outcome variables themselves.",
        "- role: 'baseline' (a pre-treatment covariate), 'treatment', 'outcome', 'identifier', or 'post-baseline' (measured after treatment start — must NOT enter either propensity score).",
        "- reason: max ~18 words, phrased clinically, saying WHY it is (or is not) in claims and why it does (or does not) confound.",
        "Be conservative and honest. Cryptic names are 'unclear', not guesses. Variable names may be in English, Chinese, or a mix; interpret both.",
      ].join("\n");
      const userText = "VARIABLES (id | name :: investigator's note, if any):\n" +
        vars.map((v) => v.id + " | " + v.name + (v.note ? " :: " + v.note : "")).join("\n");
      const schema = {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                name: { type: "STRING" },
                source: { type: "STRING", enum: ["claims", "clinical", "unclear"] },
                confounding: { type: "STRING", enum: ["strong", "moderate", "weak", "none"] },
                role: { type: "STRING", enum: ["baseline", "treatment", "outcome", "identifier", "post-baseline"] },
                reason: { type: "STRING" },
              },
              // propertyOrdering is what actually makes Gemini emit `id`.
              // With `required` alone it silently omitted the field on every
              // item, which is how the id-matching fix failed its first test.
              propertyOrdering: ["id", "name", "source", "confounding", "role", "reason"],
              required: ["id", "name", "source", "confounding", "role", "reason"],
            },
          },
        },
        required: ["items"],
      };

      const gBody3 = {
        system_instruction: { parts: [{ text: sysText }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: schema },
      };
      const RETRY3 = new Set([500, 502, 503]);
      let res3 = null, net3 = false;
      const url3 = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
      for (let a = 0; a < 2; a++) {
        if (a > 0) await new Promise((r) => setTimeout(r, 1200));
        try { res3 = await fetch(url3, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gBody3) }); }
        catch { net3 = true; continue; }
        net3 = false;
        if (res3.ok || !RETRY3.has(res3.status)) break;
      }
      if (net3 || !res3) return json({ error: "Could not reach the AI service. Please try again shortly." }, 502, origin);
      if (!res3.ok) {
        if (res3.status === 429) return json({ error: "The AI is rate-limited right now. Please wait a minute and try again." }, 429, origin);
        return json({ error: "The AI service returned an error (" + res3.status + ")." }, 502, origin);
      }
      const data3 = await res3.json().catch(() => null);
      const raw3 = data3?.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed3 = null;
      try { parsed3 = JSON.parse(raw3); } catch {}
      if (!parsed3 || !Array.isArray(parsed3.items)) return json({ error: "The AI returned an unreadable result. Please try again." }, 502, origin);
      return json({ items: parsed3.items }, 200, origin);
    }

    let text = (payload && typeof payload.text === "string" ? payload.text : "").trim();
    if (text.length < 200) {
      return json({ error: "Please paste at least a few paragraphs of the protocol (200+ characters)." }, 400, origin);
    }
    let truncated = false;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      truncated = true;
    }

    if (env.TURNSTILE_SECRET) {
      const ok = await verifyTurnstile(env.TURNSTILE_SECRET, payload.turnstileToken, request.headers.get("CF-Connecting-IP"));
      if (!ok) return json({ error: "Bot check failed. Please reload and try again." }, 403, origin);
    }

    const framework = FRAMEWORKS[payload && payload.framework] ? payload.framework : "harper";

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiBody = {
      system_instruction: { parts: [{ text: buildSystemPrompt(framework) }] },
      contents: [{ role: "user", parts: [{ text: "STUDY DOCUMENT TO ASSESS:\n\n" + text }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    // Gemini's free tier sometimes returns 503 (model overloaded) or 500/502
    // under load. These are transient — retry a few times with backoff before
    // giving up. 429 (quota) is NOT retried; it won't clear in seconds.
    // Keep retries LOW: every retry is another real request against the free
    // daily quota. One retry (2 attempts total) is enough for a transient blip;
    // the browser adds at most one more. (Was 4 — that, times the client's
    // retries, could burn ~12 requests per click when Gemini was flaky.)
    const RETRYABLE = new Set([500, 502, 503]);
    let gemRes = null;
    let netError = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
      try {
        gemRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        });
      } catch (e) {
        netError = true;
        continue; // transient network hiccup — retry
      }
      netError = false;
      if (gemRes.ok || !RETRYABLE.has(gemRes.status)) break; // done or non-retryable
    }

    if (netError || !gemRes) {
      return json({ error: "Could not reach the AI service. Please try again shortly." }, 502, origin);
    }

    if (!gemRes.ok) {
      const detail = await gemRes.text().catch(() => "");
      // 429 from the free tier — distinguish the per-DAY quota (wait for the
      // reset) from a per-MINUTE rate limit (retry in a moment). Gemini's error
      // body names the quota that was hit.
      if (gemRes.status === 429) {
        const perDay = /per\s*day|PerDay|RequestsPerDay|GenerateContentPerDay/i.test(detail);
        return json({
          error: perDay
            ? "The free daily Gemini quota is used up. It resets at midnight US Pacific Time (about 3 pm Taiwan time) — please try again then."
            : "The AI is rate-limited right now (too many requests in a short window). Please wait a minute and try again.",
        }, 429, origin);
      }
      if (RETRYABLE.has(gemRes.status)) {
        return json({ error: "The AI model is busy right now (overloaded). Please try again in a moment." }, 503, origin);
      }
      return json({ error: "The AI service returned an error (" + gemRes.status + ").", detail: detail.slice(0, 300) }, 502, origin);
    }

    const data = await gemRes.json().catch(() => null);
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return json({ error: "The AI returned an empty result. Please try again." }, 502, origin);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "The AI returned an unreadable result. Please try again." }, 502, origin);
    }

    return json({ ...parsed, framework, truncated }, 200, origin);
  },
};
