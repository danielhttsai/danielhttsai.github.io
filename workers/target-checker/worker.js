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

const SYSTEM_PROMPT = `You are a methodological reviewer assessing whether a research protocol or manuscript conforms to the TARGET reporting guideline (Cashin AG, Hansford HJ, Hernán MA, Swanson SA, et al. "Transparent Reporting of Observational Studies Emulating a Target Trial: The TARGET Statement." JAMA 2025; PMID 40899949).

You will be given the full text of a study document. Judge EACH TARGET item below against the text and return a verdict.

For every item, assign one status:
- "met": the text clearly and substantively addresses the item.
- "partial": the item is touched on but is vague, incomplete, or missing a key element.
- "missing": the item is not addressed at all.
- "na": genuinely not applicable to THIS document type (e.g. Results/Discussion items in a pre-study protocol that has not been run). Prefer "missing" over "na" unless the item truly cannot apply.

Rules:
- Judge SUBSTANCE, not keywords. A protocol that says "we adjust for confounders" without naming the identifying assumptions does NOT meet item 7g.
- Be a strict but fair reviewer. Do not give credit for things that are merely implied.
- "evidence": one short sentence — quote or closely paraphrase the part of the text that addresses the item, OR state plainly what is missing. Max ~30 words.
- "suggestion": one concrete, actionable sentence on how to satisfy the item (only meaningful for partial/missing; for "met" you may give a brief refinement or leave a short confirmation). Max ~30 words.
- Return a verdict for ALL items, in the order given, using the exact item ids.
- Pay special attention to the target-trial-specific items (3, 6, 7a-7h, 16): explicit causal question, a specified target trial, the one-to-one emulation mapping, time-zero alignment / immortal-time bias, identifying assumptions, and an honest target-vs-emulation limitations appraisal. These are where target-trial emulations most often fall short.

The TARGET items (id | section | what it asks):
${TARGET_ITEMS.map(([id, sec, label]) => `${id} | ${sec} | ${label}`).join("\n")}`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
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
  required: ["summary", "items"],
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

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiBody = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: "STUDY DOCUMENT TO ASSESS:\n\n" + text }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    let gemRes;
    try {
      gemRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    } catch (e) {
      return json({ error: "Could not reach the AI service. Try again shortly." }, 502, origin);
    }

    if (!gemRes.ok) {
      const detail = await gemRes.text().catch(() => "");
      // 429 from the free tier = daily/per-minute quota exhausted.
      if (gemRes.status === 429) {
        return json({ error: "The free daily AI quota is used up. Please try again tomorrow (resets 00:00 UTC)." }, 429, origin);
      }
      return json({ error: "The AI service returned an error (" + gemRes.status + ")." , detail: detail.slice(0, 300) }, 502, origin);
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

    return json({ ...parsed, truncated }, 200, origin);
  },
};
