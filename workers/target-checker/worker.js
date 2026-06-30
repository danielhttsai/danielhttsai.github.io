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

SEPARATELY, assess whether the protocol PRE-SPECIFIES the planned analytical outputs that a rigorous RWE study mocks up in advance (shell tables and figure plans), in the "deliverables" array. For each item below return status: "present" (explicitly planned or described — a shell table, a named figure, or a clear statement it will be produced), "partial" (implied or partially described but not clearly pre-specified), or "absent" (no trace). Prefer "absent" over "partial" when there is no mention at all. Give short evidence and a concrete suggestion for partial/absent items. If an item is genuinely not applicable to the design (e.g. a Kaplan-Meier curve for a cross-sectional descriptive study), mark it "absent" and say so in the evidence. Return one entry per item, using the exact name.
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
          status: { type: "string", enum: ["present", "partial", "absent"] },
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
