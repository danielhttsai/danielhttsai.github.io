# Brief for automated improvement agents

This file is the standing context for scheduled agents that improve this site.
It is committed deliberately so a cloud agent with no prior context can read it.

## What this site is

Daniel Hsiang-Te Tsai's academic site — postdoctoral research fellow at the
Population Health Data Center (PHDc), NCKU; pharmacoepidemiology and real-world
evidence. Astro 5 + Tailwind 4, fully static, deployed to GitHub Pages at
https://danielhttsai.github.io. No SSR, no backend.

The three tools that matter:

| Path | What it is |
|---|---|
| `src/pages/tools/protocol-generator.astro` | Hub: nine study designs, six questions that narrow the choice, `Use when / Assumes / Breaks when` per design |
| `src/pages/tools/protocol-checker.astro` | Upload a protocol, get an item-by-item HARPER or TARGET verdict via a Gemini-backed Cloudflare Worker |
| `src/pages/tools/rwe-studio.astro` | Upload a messy hospital dataset, profile/clean it, map columns to a design, run **real R in the browser** via WebR. Designs: ACNU, ITS, SCCS, case-crossover |

Nine protocol builders: `active-comparator-new-user`, `clone-censor-weight`,
`sequential-trial`, `self-controlled-case-series`, `case-crossover`,
`descriptive-analysis`, `interrupted-time-series`, `trend-in-trend`,
`case-control`. Shared components: `src/components/DesignDiagram.astro`
(timeline diagrams + `window.svgToPng` figure export), `ProtocolCommon.astro`
(`window.PC`, shared HARPER/TARGET prose + amendments log), `WebrEngine.astro`.

## Non-negotiables

1. **Patient data never leaves the browser.** RWE Studio promises this on screen.
   Any AI call may send column names, codebook text and counts only — never a
   cell value, never a row.
2. **Never `git add -A`.** Stage only files you touched, by name.
3. **Never rewrite a commit you did not create** — no amend, rebase-edit, reset
   or force-push on someone else's work.
4. **Never build into the shared `dist/`.** Use `--outDir "dist-$$"`.
5. **Depth, not breadth.** Daniel has chosen this explicitly. Do not add new
   designs or features. Make what exists correct, legible and defensible.

## The standard this site is held to

Audience is four groups at once: students meeting a design for the first time,
AsPEN/NeuroGEN peers, Daniel's own research, and reviewers or hiring committees.
So explanations must **layer** — a plain-language line first, the rigorous detail
underneath. Never remove the rigour; never hide the explanation.

Statistical claims must be defensible. If you cannot substantiate a method from a
source you actually read, say so rather than reconstructing it from memory.
Verify every citation against Crossref or PubMed before asserting it — a
fabricated reference and three wrong author lists have already been found here.

## The bug class to hunt

**A plausible number is more dangerous than a crash.** Prefer refusing over
guessing, and make every refusal visible on screen. Real examples found in this
codebase, all of which produced confident, wrong, non-crashing output:

- Covariates coerced with `as.numeric()` became all-NA, so crude == adjusted — a
  reassuring null from a broken model.
- ITS periods sorted lexicographically (`Jan-19`, `1/2019`, `Week 10`), giving a
  significant effect **in the opposite direction**.
- A denominator aggregated with the outcome's rule, manufacturing a downward trend.
- `parseInt("1e3")` = 1 while the prose printed "1e3 days" — a 1000-day washout
  exported beside a 1-day diagram.
- Blank fields silently refilled from defaults at export, so "Clear all" produced
  a protocol asserting windows the user never chose.
- `NFD` decomposing Hangul into jamo, so every Korean variable name normalised to
  an empty string and fell through to the wrong branch.
- An `<em>` inside an `<option>` closed the `<select>`, silently dropping four
  choices; every other value fell through to generic prose.
- A demo dataset balanced by arithmetic, hiding the very bug class it should expose.
- A saved draft carrying a removed dropdown value, silently substituting a
  different estimator into the exported protocol.
- A `<select>` offering four options resolved through a three-entry map that had
  been copy-pasted into three exports, so the fourth choice fell through to the
  `||` default and every document named a different analysis from the one chosen.
  **When you find a map like this, check it against the option list, and make it
  one map.** Three of this run's bugs were copy-pasted lookups drifting.
- A bootstrap fitting a different outcome model from the point estimate it
  bracketed, so a log-odds interval was printed around a log-rate-ratio — close
  enough for a rare outcome to look right.
- A regex written against prose (`/negative control/`) that never matched the
  label it was filtering (`Negative-control outcome`), silently emptying a
  checklist row.
- `"a" + map[k] || "b" + "."` — `+` binds tighter than `||`, so the fallback is
  unreachable and the trailing string is swallowed.
- **A positive fact asserted about a `<select>` by ruling one value out.**
  `if (s.effect !== "HR")` is true of the empty string too, and a `<select>`
  reads as `""` whenever a saved draft or `?seed=` link blanked it. The document
  then claimed "An absolute contrast is selected" directly above a section
  reading "(not specified)". **Use a whitelist of the values that make the claim
  true, never a not-equal against one value.**
- A field read from `s.subgroups` when the form's controls are `subgroupsPick`
  and `subgroupsCustom`, so a whole checklist item reported "(none specified)"
  forever. Worth diffing every `name="…"` against every `s.<x>` once per builder.
- An `<option>` 1293 characters wide setting a grid column's min-content, pushing
  an entire form off a phone screen — a layout bug, but the same species: nothing
  errors, the page just silently becomes unusable at one viewport.

## The bar for "done"

A change is not done because it builds. It is done when you have **observed it
working** and can say what you observed. Report honestly what you could not
verify. Two specific traps:

- **The live site serves stale copies after deploy.** Always cache-bust when
  verifying. Agents have twice nearly reported their own shipped work missing.
- **The checker is non-deterministic.** The same protocol scored 19, 20, 21 and 22
  of 23 across four runs. Read the per-item evidence string, never the total, and
  never conclude from a single run.

## Ship loop

```bash
npx --no-install astro build --outDir "dist-$$"     # never the shared dist/
git add <your files only>
git commit -m "..."
for i in 1 2 3 4 5; do
  git fetch -q origin && git rebase --autostash -q origin/main && git push -q origin main && break
  sleep $((RANDOM % 20 + 5))
done
```

Then confirm the deploy succeeded and check the live page with a cache-buster.

## Environment traps (found 2026-08-22; check these before losing an hour)

The cloud sandbox's egress proxy is far more restrictive than it looks.

- **`npm install` hangs forever.** `package-lock.json` pins every tarball to
  `registry.npmmirror.com`, which the proxy 403s, and npm honours the lockfile's
  `resolved` URLs. It stalls at ~180 extracted files with no error. Use
  `npm i --no-package-lock --no-audit --fund=false` — 26 seconds. Do not "fix"
  the lockfile unless that is your task.
- **`unpkg.com` is blocked**, so the `docx` library never loads and no `.docx`
  export can run at all. To exercise that path: `npm pack docx@8.5.0`, then in
  Playwright `page.route('**/unpkg.com/**', r => r.fulfill({ path: '…/package/build/index.umd.js' }))`.
  This works, and unzipping `word/document.xml` is a good way to assert on the
  real exported document.
- **Crossref, PubMed, PMC, doi.org and the publisher sites are all blocked** —
  `curl` and `WebFetch` both fail. Only the `WebSearch` tool works. It is good
  enough to confirm a title/journal/volume/pages/author list from result
  snippets, but say so; do not upgrade a snippet to "verified against Crossref".
- **`danielhttsai.github.io` itself is blocked.** The ship loop's "check the
  live page with a cache-buster" step cannot be done from here. Verify against a
  local `astro build` + `http-server` instead, and say in the report that the
  live site was not checked.
- Chromium + Playwright are installed globally (`/opt/node22/lib/node_modules/playwright`,
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Driving the built site headless
  is by far the best verification available here — use it.

## Known open items

- SCCS's Farrington event-dependent-exposure sensitivity item is ticked by default
  with no explanation or citation. Daniel said to leave it for now.
- Weight diagnostics in RWE Studio cover IPTW only; SMR, overlap and
  fine-stratification weights get no equivalent check.
- No post-matching balance table (the SMD-after column is IPTW-weighted only).
- Nobody has ever opened an exported `.docx` in Microsoft Word — every claim about
  those files is what a parser saw. (2026-08-22: a real `.docx` was generated and
  its `word/document.xml` read, by routing the blocked CDN to an npm copy of the
  same library. Still nobody has opened one in Word.)

### Found 2026-08-22, argued over by two reviewers, deliberately left

Both reviewers agreed these are real. They are listed with what each is, so the
next run does not have to re-derive them. Ranked roughly by damage.

- ~~**The `1e3` family for `washout`, `lookback` and `grace`.**~~ **Done
  2026-08-22 (second run).** `readDays` reuses the same `DAYS_RE` the covariate
  rows use and returns unreadable / deliberately blank / a number; prose, figure,
  checks, Word and the TARGET checklist all consume it, so they cannot disagree.
  An unreadable value prints "(not specified — “1e3” could not be read as a
  number of days)" and the figure omits the window rather than drawing a wrong
  one; the checks panel names the field. `doReset` now restores each select's
  authored default instead of `selectedIndex = 0`, so Clear no longer moves
  maximum follow-up from five years to one. Verified in Chromium for 1e3, blank,
  a pasted "30 days", 365, 730 and a deliberate 0.
- ~~**"Clear all" refills defaults at export.**~~ **Done 2026-08-22 (second
  run)**, together with the item above: the exports refuse instead of applying
  `|| "365"` / `|| "30"`, and `doReset` restores each select's authored default.
- ~~**`pcOf` hardcodes the analysis sentence.**~~ **Done 2026-08-22 (second
  run).** The abstract now reads `psMethod`, `primaryAnalysisType` and
  `effectMeasure`, and falls back to naming the section rather than to a
  plausible constant. Verified in a generated `.docx`: it reads "Overlap weights
  with a landmark analysis, reporting a hazard ratio".
- **No target estimand is ever named.** Matching targets the ATT, stabilised IPTW
  the ATE, overlap weights the ATO, IV a LATE — and site estimates are then
  meta-analysed together. The two reviewers disagreed here and the sceptic won:
  a `psMethod → estimand` map would be **wrong or undetermined for six of the
  thirteen** entries (`hdps` and `drs` say "IPTW or matching" / "match or
  stratify"; `strat`, `gformula`, `tmle` and `outcome-reg` are unspecified), so
  auto-stamping an estimand would manufacture exactly the confident-wrong-label
  bug we hunt. If it is done at all it should be a field the user fills, with
  only the seven determined cases pre-filled — which is a feature, so ask Daniel.
  Two entries now name their own estimand in prose (overlap → ATO, IPTW → ATE).
- **A stale `?seed=` or saved draft blanks a `<select>` silently.** `writeForm`
  assigns `el.value` with no membership check; an unmatched value leaves
  `selectedIndex = -1`, and a select with no selection contributes no entry to
  `FormData`, so `s.psMethod` becomes `undefined` and the export falls through to
  generic prose — while the green "pre-filled from link" banner claims success.
  Not executed (no jsdom here); it is spec behaviour and worth a browser test.
- **`pickedCitations` is never pruned.** Picking a phenotype from the library
  stores its validation citation under the phenotype's name, persisted in its own
  localStorage key, cleared only by "Clear all". Pick MI, then pick stroke, and
  the reference list cites an MI validation study for a stroke-only protocol.
- **Changing `psMethod` by hand does not clear `psMethodDetails`.** After a
  library pick, §7 can read "Method: 1:1 PS matching" directly above "operational
  details: … overlap weights …" — two different estimands in one section. Do
  **not** fix by wiping the textarea on change: it is explicitly hand-editable
  ("Edit freely"), and wiping it is a data-loss bug. Show a mismatch warning in
  the checks panel instead.
- **`pscNorm` deletes whole writing systems.** It keeps Latin + kana + CJK +
  Hangul, so Cyrillic, Greek, Thai, Hebrew, Arabic and **full-width Latin**
  normalise to `""` and fall through to "claims-available". `ＨｂＡ１ｃ` — what a
  CJK IME in full-width mode produces — is classified as a claims variable,
  enters PS_ep, and collapses the correction to a no-op that reads as "no
  unmeasured confounding". The file's own comment at that spot says exactly that.
  Likely one-character fix: `NFKC` instead of `NFD`/`NFC`.
- **`DesignDiagram`'s `fmtDay` rounds 345–364 days to "1y"** in the written
  window list that ships in the `.docx`. Cosmetic, but the bullets are the only
  machine-readable description of the figure.
- **`grace` is computed in `renderScheme` and never used.** Tempting to draw it
  as a band like `clone-censor-weight.astro:319` does — **don't**. In CCW the
  grace period is the initiation window and genuinely sits at days 0→g. Here it
  is the permissible refill gap ("Discontinuation of index drug (gap > grace
  period)"), which opens at the end of each dispensing at a patient-specific time
  and has no fixed position on an index-anchored axis. Drawing it would assert
  something false. Delete the dead variable, or say in the legend why the grace
  period is not drawable here.
- **Citation to check when a verifier is reachable.** `Rosenbaum PR, Rubin DB.
  The bias due to incomplete matching. Biometrics 1985;41:103-16` is cited as the
  method reference for "Greedy PS matching with replacement". That paper is about
  bias from incomplete/inexact matching, not matching with replacement, and the
  0.2 × SD-logit caliper in the same definition is Austin 2011 (Pharm Stat
  10:150-161). Flagged, not verified against a record — the APIs were blocked.
  A separate reviewer claim that Stürmer 2005 is free at PMC1444885 was
  **rejected**: it was asserted from memory while the verifier was unreachable,
  and the file's existing text already honestly says it could not check.

### Added by the second 2026-08-22 run (two reviewers again, run concurrently)

Two runs of this task fired at once and converged independently on the same
defects, which is good evidence they were real. Closed on top of the first run's
work: the three top-level day counts, the reset default, `pcOf`'s hardcoded
abstract, and four more below. **If you see a rebase conflict across all nine
builders, check `git log origin/main` before resolving — you may be duplicating
a sibling run.** Resetting and re-applying only the non-duplicate fixes was
cleaner than fighting the other run's refactor.

- ~~**Non-collapsibility was flagged as `effectMeasure !== "RD"`.**~~ Fixed: only
  the hazard ratio is non-collapsible among the four measures offered. A user
  reporting an RR or an IRR was told the opposite of the truth by a paragraph
  that opens by naming the odds and hazard ratio correctly.
- ~~**The immortal-time check was pushed unconditionally.**~~ Fixed. It sat
  under the panel's own "Washout is 0" warning and certified time-zero alignment
  anyway, and stayed green under a landmark analysis. It still cannot read a
  post-index eligibility criterion, and now says so.
- ~~**ITT with deviation censoring.**~~ A check now fires: the first two
  censoring rules ship ticked, so choosing ITT exported a protocol declaring an
  as-assigned analysis and instructing sites to censor at discontinuation and
  switch. Not silently rewritten — the user is told, and decides.
- ~~**`val$id %in% ids` in the calibration bootstrap.**~~ Fixed to `match()`.
  %in% is a membership mask, so a patient drawn three times contributed one
  validation row: a ~63% distinct subsample, not the resample the comment above
  it promises.

Still open, examined and deliberately left this run:

- **`shortDbName()` treats any trailing parenthetical as an acronym**, so
  `Medicare (20% sample)` is exported as a data source called `20% sample` and
  the word "Medicare" appears nowhere in the protocol, the Word file, or TARGET
  item 5 — the data-source provenance item. The only affected row in
  `databases.json`. **Not fixed because site ids derive from the same function**
  (`US-20sample`), so correcting the label silently unticks that site in every
  saved draft with no message. Do the id migration and the label together.
- **The defaults are type-2-diabetes-specific and all 41 covariates ship
  `checked={true}`.** A warfarin-vs-DOAC protocol exports an exclusion for type 1
  diabetes and adjusts for GLP-1 RA dispensing. The same ticks feed the
  feasibility engine, so a fresh page with one site selected shows an amber panel
  claiming lab, mortality and cancer-registry linkage are "implied by your study
  text" before any study text exists — one root cause, two wrong outputs in
  opposite directions. `Charlson Comorbidity Index` is also ticked alongside
  eight of its own components. **This is a defaults policy question for Daniel,
  not a bug.**
- **The estimand question was left as the first run decided it** — auto-stamping
  a `psMethod → estimand` map is undetermined for six of thirteen entries. Note
  though that ATT for the three matching options is not undetermined, and pooling
  an ATT with an ATE across sites is exactly what section 8 does. Worth asking
  Daniel whether the five determined cases should name their estimand in prose,
  as overlap and IPTW already do.
- **Amendments row.** The comma is fixed, but the row is still `sm:`, and it
  lives in the left pane, which is half the page now. Measured at a 1024px
  viewport: the three text columns come out 37/52/52px. `min-w-0` on the inputs
  plus an `xl:` breakpoint fixes it; left alone here because it is cosmetic and
  the other run had just touched that file.

- No fabricated reference was found in the ACNU builder this run. Roughly twenty
  citations were confirmed from search records; the phenotype-library entries
  that cite by narrative ("Shao SC et al, Clinical Epidemiology series";
  "Lai EC et al, BMJ Open 2021/2023") are not checkable as written and should be
  resolved to specific records.

### Found 2026-08-22 by a third run, overlapping the second

Two agents worked `active-comparator-new-user.astro` at the same time and found
much the same things; the section above is the second run's, this is what was
left after it. **If you are one of two runs, check `git log origin/main` before
you start and again before you commit** — a full rebase conflict across nine
files is the cheap outcome; silently reverting someone's fix is the expensive
one. The phone-width overflow that section closes was re-measured here on
`origin/main` and is genuinely gone: ACNU, case-crossover, SCCS and
descriptive-analysis all report 390/390 at a 390px viewport.

Fixed by this run: the PS-performance sentence no longer promises a c-statistic
for the four methods that fit no propensity score (TMLE is not one of them — it
does fit a PS, so only the before/after-weighting half was wrong there); "Until
end of database availability (no cap)" is recognised instead of drawing a flat
five-year bar and scolding the user about the tool's own dropdown option; the
censoring list and the grace period now name the analysis they govern, so an ITT
protocol stops specifying as-treated censoring unlabelled; three effect-measure
maps stopped falling back to "Hazard ratio".

Still open, examined and deliberately left:

- **Seven of the nine builders never call `PC.mountAmendments(form)`** — only
  SCCS and case-crossover do. So there is no amendments editor on those pages,
  the hidden field can only ever be empty, and `amendmentIntro` therefore emits
  its zero-row branch every time: "This is the original version of the protocol
  (v3.0 · 2026-08-01); no amendments have been made. Any later change is
  recorded here…" — a positive claim about the study's history that the tool
  cannot check, next to a version string contradicting it, followed by a promise
  of a mechanism the page does not have. Both reviewers converged on this as the
  sharpest thing left in the file. There is a category difference between "no
  amendments have been made" (only the investigator can say that) and "no
  amendments have been recorded in this protocol" (the tool can verify that),
  and HARPER item 3 exists to keep them apart. Note the trap: the comment at the
  top of `ProtocolCommon.astro` says "ITEM 3 IS SATISFIED WITH NO BUILDER CHANGE
  AT ALL", which is true of the *sentence* and false of the *editor* — it is
  what made a reviewer pass this on the first read. Mounting the editor is the
  documented three-line change; whether that counts as a feature is Daniel's
  call, but the sentence should not make a claim the page cannot support.
- **The indication "📚 Pick from library" button silently drops the code set.**
  It sets `data-target-name` but not `data-target-codes`, unlike the exposure,
  comparator and outcome buttons, so `fill("codes", …)` returns early. Picking
  "Type 2 diabetes (T2DM)" writes the bare phenotype name into a field whose
  placeholder is `T2DM (ICD-10 E11.x) ever before index`, and the validated
  codes are gone. The user believes they took a validated definition.
- **`rowsJoin` destroys unreadable per-covariate lines.** Clicking a covariate
  chip or dragging a look-back handle rewrites the entire textarea from parsed
  rows, and any line the parser could not read comes back as `Name | 0` —
  "Comedications | one year" is gone, and the textarea was the only copy. The
  read path learnt "unreadable ≠ zero"; the write path did not.
- **No check compares two fields.** A 730-day washout preset chip sits beside a
  default-ticked "continuous enrolment ≥365 d" inclusion criterion — you cannot
  establish 730 days of non-use with 365 days of observable data, and the tool
  nudges you into it. A grace period can exceed the maximum follow-up.
  `maxFollowupCustom = "0 days"` exports a cohort study with zero person-time,
  and the figure quietly drops the follow-up bar because a zero-width window is
  filtered out. Each of these should refuse, visibly.
- **Competing risks are never mentioned** — no `competing`, `Fine-Gray`,
  `subdistribution` or `cause-specific` anywhere — while "Death from a
  non-outcome cause" is a default-ticked censoring rule, the default effect
  measure is a Cox HR, and the planned outputs promise "Kaplan–Meier /
  cumulative-incidence curves" without saying which. The reviewers split: the
  methodologist called it a reject-and-resubmit omission for an elderly cohort;
  the applied analyst pointed out that censoring at competing death with a Cox
  model *is* the cause-specific hazard, a defensible primary analysis, so
  nothing false is printed and it is a missing feature rather than a silent
  failure. Recorded, not ranked highly.
- **Three phenotype-library citations challenged, none verifiable here.** The
  "Dementia (incident)" entry attributes PMID 40437158 to "Tsai DHT et al CNS
  Drugs 2025"; a search record suggests it is Luo H et al, *Communications
  Medicine* 2025;5:203, with no Tsai authorship. The self-harm entry cites PMID
  39241791 as validation for ICD-10 X60-X84/Y87.0 ascertainment when it appears
  to be a drug-utilisation study. Entries citing "Shao SC et al Cardiovascular
  Diabetology 2019 DOAC studies" and "Hsieh CY et al Clinical Epidemiology 2019"
  for cause-of-death accuracy may be attached to the wrong claim. **These are
  leads, not findings** — Crossref and PubMed are blocked from a cloud run, and
  this repo has already had a fabricated author introduced by exactly this route.
  Do not rewrite any of them without an authoritative record.

### Found 2026-08-22 by a fourth run — RWE Studio, not ACNU

Four consecutive runs had worked `active-comparator-new-user.astro`. This one
rotated to `rwe-studio.astro` and found five defects of the house bug class in
the estimation path. **Two environment discoveries here change what a run can
verify — read them before anything else.**

#### Environment: you can run the real R, and drive the real upload path

- **`sudo apt-get install -y --no-install-recommends r-base-core r-cran-survival`
  works.** Roughly 90 seconds, and it gives you R 4.3.3 with `survival`. The
  WebR CDN (`webr.r-wasm.org`) is still 403, so the browser cannot run the
  analysis — but you do not need it to. Drive the page in Chromium, call
  `buildScript()` and `analysisCSV()` from `page.evaluate`, write the CSV out,
  `sed` the `/data.csv` path, and run it with `Rscript`. **Every R claim in this
  run was executed, not read.** Do this. Reading generated R is how three of the
  bugs below survived previous reviews.
- **`cdnjs.cloudflare.com` is blocked, which is where SheetJS comes from**, so
  file upload silently does nothing in a headless run and `DATA.columns` stays
  empty — it is not your test that is broken. Fix it the way the brief already
  describes for `docx`: `npm pack xlsx@0.18.5`, then
  `page.route('**cdnjs.cloudflare.com/**xlsx**', r => r.fulfill({ path: '…/package/dist/xlsx.full.min.js' }))`.
  Without this you can only test the four demo datasets, which is how a bug in
  the coercion of *uploaded* files stayed hidden.
- **The ship loop in this file is wrong for this environment.** The session
  starts on a **detached HEAD**, and the local `main` branch is stale (12 behind
  when this run started), so `git push origin main` pushes that stale branch and
  is rejected as non-fast-forward. Use **`git push origin HEAD:main`**.
- Feeding a canned R output back through the page — `page.evaluate(o => {
  window.RWEngine = { run: async () => o } }, realROutput)` — renders the whole
  results/diagnostics/export layer without WebR. Generate the canned output with
  real `Rscript` so it is faithful.

#### Fixed this run

- ~~**Any number that was not zero counted as a "yes".**~~ `toBin`'s last line was
  `n > 0 ? 1 : 0`. An outcome coded 1 = yes, 2 = no, 9 = unknown — ordinary in
  registry and hospital extracts — became an outcome that happened to *every*
  patient. The "Coded flags — which value means yes" vocabulary is built only
  from two-level columns, so a three-level column never appears in the structure
  panel; `chk01` in R, which exists to refuse exactly this, then saw a variable
  whose only value was 1 and passed it. 400 events in 400 patients, three
  confident hazard ratios, one of them 1.27 (1.00-1.61). Now refuses, and the
  mapping step names the unreadable values and blocks step 4.
- ~~**A missing number became a hard zero.**~~ The blank guard in `buildMaster`
  tested the original value while the number came from a value already replaced
  by `""`; `Number("")` is 0 and `String(null)` is `"null"`, which is not `""`.
  35 patients in the cohort demo entered the propensity model aged 0, and
  because nothing was missing any more, `complete.cases` had nothing to drop and
  "Drop rows missing a required mapped variable" silently did nothing.
- ~~**Weight diagnostics described IPTW whatever was fitted.**~~ (The brief's own
  open item, plus a false reassurance.) `wdiag` was applied only to the IPTW
  weights, so unticking IPTW and ticking SMR produced an SMR hazard ratio, a
  Table 1 column headed "SMD after IPTW", a badge reading "IPTW withheld" and
  the sentence "the other estimators are unaffected and are still shown" — while
  the SMR weights on that same data had ESS 2.5% and a top-1% share of 36%,
  against 7.0% and 26% for the IPTW weights just refused. Each scheme is now
  judged on its own weights. **SMR is gated like IPTW; overlap is not** — overlap
  weights are bounded in [0,1], so a small ESS there means the equipoise
  population is small, not that a few patients carry the answer. Do not "fix"
  that asymmetry; it is deliberate.
- ~~**Fine stratification and matching hid who they dropped.**~~ Fine
  stratification silently discarded every patient in a single-arm stratum (20%
  of the no-overlap demo at 10 strata, 42% at 50). Matching reported "(343
  matched)" — rows, not exposed — while only 117 of 235 exposed were matched,
  and greedy no-replacement matching drops the highest-propensity exposed
  first. Both now report survivors, and matching names its estimand and warns
  when the ratio is arithmetically impossible (2:1 needs 470 comparators, 330
  exist).
- ~~**A pipe in a column name shifted the balance column.**~~ `Sex (M|F)` split
  the `TABLE1|` row into six fields against a five-column header, so the cell
  under "SMD after IPTW" showed the *before*-weighting SMD and the after value
  landed in an unheaded column the exports drop. Sanitised on the way in, both
  from the form (`q()`) and from the data (`sq()` in R).

#### Open, examined this run, deliberately left

Ranked by damage. The first is the sharpest thing left in this file.

- **The ITS default standard errors look badly anti-conservative.** `auto`
  applies a Newey-West sandwich to every series with ≥12 rows (`its_ac`, the
  `useh<-(AC=='newey') || (AC=='auto' && nrow(a)>=12)` line). It is HC0-type: no
  finite-sample correction, no prewhitening, z critical values. A reviewer's
  simulation put the rejection rate of a nominal 5% test at **20.9% at 24
  periods and 35.4% at 12**, and worse than the model-based SE it replaces at
  every length below roughly 60 periods *including* the autocorrelated cases it
  exists to fix. **This is a strong claim and it was NOT reproduced in R by this
  run — it comes from a Python re-implementation of the file's own sandwich.**
  Reproduce it in R before changing anything; if it holds, raise the threshold
  far above 12 and print the HAC interval as a sensitivity rather than the
  headline. Independently and definitely true: the `<option>` text still says
  "only if Durbin-Watson flags serial correlation", which the code has
  deliberately not done since the comment above it was written, and the
  `RESULT_NOTE` says "model-based standard errors were requested" in the auto
  path where nothing was requested. Fix the wording regardless.
- **The ITS time index is a rank over observed periods** (`a$t<-match(a$key,ukey)`).
  A month absent from the input is closed up rather than left as a gap, so every
  "per period" coefficient is per observed row. A reviewer's simulation of a
  36-month series with months 7-12 missing moved the end-of-follow-up contrast
  from 1.366 to 1.632. Not reproduced in R here. The fix has a precedent in the
  same function: when the labels parse as dates, check consecutive periods are
  one unit apart and **refuse**, exactly as the period-ordering guard does.
- **"Fine stratification" is a stratified Cox model, not the published method**,
  which reweights strata precisely so sparse ones need not be dropped. On the
  cohort demo the two differ (0.640 as coded vs 0.671 ATT-weighted at 10
  strata). Either implement the weights or rename the row. The file cites
  nothing there — **do not add a citation from memory**; the attribution to
  Desai et al. Epidemiology 2017 is a reviewer's recollection, unverified.
- **The PS-calibration page asserts, without checking, that the correction it
  withheld would have hurt.** The "Applying the correction anyway would give HR
  … — further from the gold standard than doing nothing" branch is
  unconditional, and all three numbers are on that same line. A reviewer
  produced a counterexample at S = 73% where the correction moved *toward* the
  gold standard, and one at S = 90% (green, released) where it more than doubled
  the error. Two lines: compare `|bcal-bG|` with `|bT-bG|` and say which
  happened. Worth doing; the arithmetic is already there.
- **The per-protocol row is naive censoring at discontinuation**, with no IPCW
  offered or mentioned, and a blank DISC silently read as "never discontinued"
  (376 of 565 on the cohort demo). No note reports either. Also `est_itt` is a
  no-op — the ITT rows are emitted unconditionally — and ticking PP without
  mapping DISC skips it in silence while the handoff JSON still records
  `estimand: "ITT+PP"`.
- **`MASTER` is frozen once built.** Nothing in step 4, the structure panel, or
  the covariate ticks invalidates it, and `runanalysis` rebuilds only when it is
  null. Un-tick a covariate after building and the analysis still runs on the
  cohort that covariate's missingness defined. Flip "which value means yes" and
  the covariates flip while the exposure and outcome do not. One line each, the
  design radio already shows the pattern.
- **`LAST` is likewise stale**: change the methods or the interruption point and
  export without re-running, and the Word file carries the previous run's
  estimates and script under today's date.
- **`its_cycle` is read with `parseInt`, so `1e3` becomes a cycle of 1** — the
  brief's own `parseInt("1e3")` family, still live. Harmonic terms collapse to
  constants and the only trace is a generic collinearity note.
- **European decimals**: `Number(String(v).replace(/,/g,""))` turns `3,5` into
  35, in `buildMaster` and in the profiler, so the profile cannot expose it. The
  fix needs a per-column locale decision — say which was assumed rather than
  guessing silently.
- **`dupRowCount` joins cells with no separator while the de-duplication that
  follows joins with `"|"`**, so the panel's duplicate count and the cleaning
  step disagree in both directions.
- **The exports omit every diagnostic that gates the numbers they print** — the
  whole positivity/weight panel and the PS-calibration verdict are on screen
  only. The refusals travel (they are `RESULT_NOTE`/estimate rows), but the ESS,
  concentration and balance verdicts do not.
- **The "Validation sample is internal / external" control changes nothing** in
  the generated R; it only travels into the handoff JSON, while sitting among
  controls that do affect the analysis.
- **SCCS and case-crossover state no assumptions in their output.** The
  estimators are correct — both were re-derived and reproduce their demos' known
  truths (IRR 2.99 against a true 3.0; OR 2.55 against a true 2.5) — but nothing
  warns that SCCS assumes the event does not alter later exposure or end
  observation, or that a case-crossover is biased by an exposure-prevalence
  trend. The case-crossover also never checks that each stratum has exactly one
  hazard window.
- **`MASS` is requested for the negative binomial but `WebrEngine` installs only
  `survival`**, so in the browser the overdispersed branch is always
  quasi-Poisson. `famlab` reports the truth, so nothing false is printed, but
  the UI text promises negative binomial first.

#### A method note for whoever runs this next

The two-reviewer method paid for itself here, but not in the way the prompt
suggests. Both reviewers were right about arithmetic and wrong about causes at
least once — one insisted the cohort demo's advertised numbers were a stale
caption, when the real cause was the missing-becomes-zero bug producing them.
The disagreement was only resolvable because R was installed and the claim could
be executed. **Treat a reviewer's simulation as a lead, not a finding**, and
promote it only when you have reproduced it in the tool's own stack. Two of the
open items above are recorded precisely because that could not be done in time.

### Found 2026-08-22 by a fifth run — the ITS inference path in RWE Studio

This run took the previous run's sharpest open item ("the ITS default standard
errors look badly anti-conservative … reproduce it in R before changing
anything") and did exactly that. It reproduces. Everything below was executed,
not read: R 4.3.3 for the statistics, Chromium against a local `astro build` for
the browser behaviour.

#### The harness worth reusing

`its_harness.mjs` in this run's scratch: Playwright loads the built page, clicks
the cohort demo, checks the `its` design radio, sets `select[data-role="TIDX"]`
and `="YCOUNT"`, sets the option inputs, then `page.evaluate` calls
`buildMaster()`, `analysisCSV()` and `buildScript()` and writes `analysis.R` and
`data.csv` out. `sed` the `/data.csv` path and run it with `Rscript`. It
reproduces the demo caption's advertised number to three decimals, which is how
you know the harness is faithful before you trust anything else it says.
Everything in the ITS block is reachable this way without WebR.

Also reusable: the top-level `let`s in this file (`MAP`, `DATA`, `MASTER`, `LAST`)
and its function declarations are genuine globals, because the whole script block
is `is:inline` — a classic script, not a module. `page.evaluate(() => MAP)` works.

#### Fixed this run

- ~~**The `auto` standard errors were narrower than the ones they corrected.**~~
  Re-implementing this file's own `hacv`/`brd`/`ef`/`Lg` and simulating the null
  (2000–2500 replicates, two seeds) put the rejection rate of a nominal 5% test
  at **0.38 at 12 periods, 0.21 at 24, 0.18 at 36, 0.13 at 60 and 0.09 at 100** —
  the previous run's alleged 20.9% at 24 and 35.4% at 12, confirmed. The second
  half of that allegation holds too: the sandwich is worse than the model-based
  SE at every length below about 60 *including* under AR(1) errors. On the cohort
  demo at the default setting the shipped interval for the pre-intervention slope
  was **2.9× narrower on the log scale** than the model-based interval for the
  same coefficient. Cause: HC0 (no finite-sample scaling) plus z critical values.
  `auto` now takes **the wider of the two SEs, coefficient by coefficient**. That
  rule was simulated against both alternatives and is at least as good as
  whichever happens to be better in every cell tested — nominal 0.05 at rho=0 at
  every length, and below both at rho=0.3/0.5/0.7. **Do not "simplify" it back to
  picking one estimator by a threshold: no threshold wins, because which of the
  two is better depends on rho, which the data does not tell you.** The meat is
  now scaled by n/(n−k), and the bandwidth and length are per series (`nser`)
  rather than `nrow(a)` — a controlled ITS of two six-period series counted as
  twelve and got the correction anyway.
- ~~**A blanket 1.96 for every interval.**~~ R itself uses t for `lm` and
  quasi-Poisson and z for Poisson and negative binomial, so two of the four
  families this file fits were getting intervals that were too narrow before any
  sandwich was involved. Now `qt(0.975, df.residual)` wherever R would use it,
  and always for the sandwich; `critlab` states which, in the results.
- ~~**The `auto` option label described behaviour the code deliberately did not
  have.**~~ It promised "HAC SE only if Durbin–Watson flags serial correlation";
  DW had not been consulted since the comment above that line was written.
- ~~**"Model-based standard errors were requested" when nothing was
  requested.**~~ `!useh` was reachable four ways and only one was a request. The
  worst was `Vh` coming back NULL from `hacv`, which silently switched inference
  and printed that note — so a user who explicitly chose "always use Newey–West"
  got the opposite and was told they had asked for it. That failure now has its
  own note. The same sentence also asserted "too narrow" under a two-sided
  condition, and in practice fired more often for DW > 2.5, which is *negative*
  serial correlation, where the intervals are too wide. Split by direction.
- ~~**`parseInt("1e3") === 1` for the seasonality cycle length.**~~ Still live,
  as the brief suspected. `<input type="number" min="2" step="1">` accepts `1e3`
  as valid, so nothing on screen objects. With CYC=1 the harmonic pair is
  `sin(2πt)` and `cos(2πt)`: R drops the constant and **fits the floating-point
  noise**, giving a seasonal coefficient of 3.95e12 (SE 1.26e13), a near-singular
  design that makes the sandwich throw, and an end-of-follow-up contrast moving
  from 1.465 (0.996–2.155) to 1.466 (0.581–3.700). Read as a number now, refused
  visibly in `validateMap` when blank / non-integer / < 2 — and R separately
  refuses a cycle at least as long as the series, which the browser cannot judge
  because it does not know how many periods survive aggregation.
- ~~**An interruption date inside a period selected the NEXT period.**~~ `kd[ord]`
  holds period *starts* and the cut date was compared to it raw, so 15 January
  selected February and January — the month the intervention happened in — was
  analysed as a control month. Found independently by this run's harness and by
  one of its reviewers, who measured a level change moving from 0.903
  (0.742–1.099) to 0.778 (0.615–0.983): a null turned significant. The date is
  floored to the period unit now, and a note says when the date given was not a
  period start, because a partly-exposed first period is the investigator's call.

#### The refusal channel for ITS

`RESULT_NOTE|` lines are the only warnings that travel: the parser at
`runanalysis` collects them into `notes`, which reach the on-screen panel, the
Markdown report and the `.docx` under "How the model was fitted". A bare `cat()`
lands in `#routput`, a black `<pre>` below the chart that reads as a debug
console and is dumped into a code block in the exports. **Five real warnings are
still bare `cat()`** — "the time column does not parse as dates", "dropped N
row(s) with a missing time or outcome value", "aggregated N row(s)", "too few
periods per season", "dropped N period(s) with a missing or non-positive
denominator". One of those ("too few periods per season") was converted this
run and the new cycle-length refusal was written as a note; the rest were left. This is
a cheap, high-value sweep for a future run: "half your data was discarded" is
currently formatted as debug output.

#### Open in the ITS path, examined this run, deliberately left

Ranked by how likely a real user is to hit it. All were executed by the applied
reviewer against real R unless marked otherwise.

- **`Q1 2018`-style labels are ordered by concatenating their digits.** The
  period-order fallback at the `stub`/`num` line strips everything after the
  first space in `pdate`, so `Q1 2017` never parses as a date and falls to the
  digit-concatenation branch: `Q1 2017`→12017, `Q1 2018`→12018, `Q1 2019`→12019,
  `Q2 2017`→22017. The guard (one stub, no NAs, no duplicates) passes. Twelve
  quarters with a true −25% drop came out ordered Q1 2017, Q1 2018, Q1 2019, Q2
  2017 … and reported an end-of-follow-up contrast of **0.322 (0.019–5.455)** — a
  claimed 68% reduction — while the note stated confidently "Periods were ordered
  by the number inside each label". This is the exact failure the form panel
  promises it has closed ("Periods analysed in the wrong order can **reverse** the
  estimated effect, so this is never guessed"). The guard needs to check the
  concatenation is monotone when there is more than one digit group, or refuse.
  **This is the sharpest thing left in the file.**
- **A control series with no denominator is silently deleted and the result is
  then labelled "control series".** Intervention hospital plus comparator, both
  mapped, but you only know your own catchment population — so the control rows'
  `DENOM` is blank, the bad-denominator drop removes all of them, and the run
  continues. Every headline row is labelled "control series" when they are the
  intervention series, the difference-in-differences rows vanish without comment,
  `controlled=yes` is exported, and the note affirmatively describes a controlled
  analysis that did not happen. `Control-series periods | 0 | 0` in Table 1 is the
  only honest line. Same failure from a constant `SERIES` column, which `chk01`
  and `binTrouble` both accept: there the counterfactual line equals the fitted
  line, so the chart draws no effect underneath a table reporting one.
- **One differing cell in the denominator column flips the auto-combine rule for
  the whole series.** `dconst` is a single global `all()`. Changing one cell by
  +1 in one of 36 periods moved the mean denominator from 10,575 to **264,985**
  (row count leaking into the offset) and the level change from 1.047 to 0.950.
  The note does change to say "sum", but a swing that large deserves a refusal.
- **A decimal comma is silently multiplied by ten.** `Number(s.replace(/,/g,""))`
  in `buildMaster` turns `3,5` into 35 and `0,75` into 75. It also **defeats the R
  guard**: `chknum` would refuse `"3,5"` by name, but JavaScript has already made
  it a valid number, so R never sees anything wrong. Any German/French/Spanish
  Excel export of a rate produces a confident tenfold-wrong answer. (The brief's
  fourth run recorded this; it is still live, and the "R will catch it" assumption
  is wrong.)
- **"Cycle length" is ignored by calendar dummies except for the single value 4.**
  With date-parsed labels the seasonality column is month-of-year unless CYC is
  exactly 4, so 6, 12 and 52 all produce the same twelve monthly dummies. Weekly
  data with cycle 52 gets months. The harmonic option *does* honour the value, so
  one control means two different things depending on its neighbour.
- **Mapping the "Season / cycle position" role does nothing** unless the separate
  Seasonality dropdown is also changed from its default of None. Estimates are
  identical to the last digit with and without the column mapped, and nothing says
  it was ignored.
- **The default period unit is Month, so an already-weekly series is silently
  re-aggregated.** 104 weekly rows became 24 monthly ones; the 4-vs-5-week
  boundaries injected a sawtooth the tool read as overdispersion (2.01) and
  "corrected" by switching to quasi-Poisson. The warning is a bare `cat()`.
- **Table 1's "Total outcome" reports a sum of rates in rate mode**, because
  `a$Y` has been overwritten with `Y/N` by then: "Total outcome: 0.125" for 1,330
  events, copied verbatim into the Word report. The same branch suppresses the
  denominator row, so a rate-mode Table 1 shows no evidence a denominator existed.
- **The printed coefficient table shows model-based SEs and p-values even when
  the intervals above used the sandwich.** `print(summary(fit)$coefficients)`
  knows nothing about the chosen variance. Two different standard errors for the
  same coefficient on the same screen, one of them carrying a p-value.
- **The Durbin–Watson disclaimer is hard-coded to the GLM case** and prints on OLS
  fits too, where DW is exactly the statistic it was designed for — telling the
  user to disregard the one diagnostic that is fully valid in that branch.
- **Two `ordmode` strings claim a confirmation the user never gave** — "(you
  confirmed it is chronological)" — and are exported verbatim into the Word
  report, where they read as an attestation the analyst signed. Selecting a
  dropdown option is not a confirmation.
- **Changing an ITS control leaves the previous run's results and chart on
  screen** with no staleness marker; only a *design* change clears them. The
  exports are safe (`LAST` is a snapshot), but the screen invites reading the new
  setting with the old numbers. ARGUED, not executed.
- **The HAC degeneracy guard is set at `dg < 1e-6*dm`** — six orders of
  magnitude, so a factor-4 variance collapse sails through it.
- **The ITS demo cannot make a single ITS diagnostic fire.** The cohort demo is
  24 perfectly-formed ISO monthly periods, 25 rows each, no denominator, no
  control series, no seasonality, dates that parse first time, and ≥ 12 rows — so
  the denominator combine rule, the control-series path, the period-order
  fallback, the cycle length and the SE choice are all unreachable. It is the
  only file offered as an ITS demo. Given this file's own stated principle that
  a diagnostic nobody sees fire is a diagnostic nobody trusts, ITS is the design
  with no demo built to exercise its refusals. **A second ITS demo is a feature,
  so it is Daniel's call — but it is the highest-leverage one on this list.**

#### Fixed later the same run, after the two reviewers argued

The prompt's two-reviewer method earned its keep here in a way worth
recording: **the methodologist's sharpest finding was against this run's own
fix, not against the code it inherited.** The applied reviewer's list and the
methodologist's overlapped on the period-order and control-series defects
(found independently, from different constructed data, which is good evidence
they are real), but only the methodologist thought to *simulate the new
warning's trigger* rather than read it.

- ~~**The new short-series warning was gated on the statistic the file says is
  too weak to gate on.**~~ The first version required `nser<48 && r1>=0.2`.
  Simulated at a fixed true rho of 0.7 that gate fired in **30% of runs at 24
  periods and 55% at 36** — and at 60 periods, where both estimators reject a
  true null a fifth to a quarter of the time and coverage is worst anywhere in
  the simulation, the length cutoff blocked it entirely. Now gated on length
  alone (`nser<60`), with `r1` reported inside as information. **The general
  lesson: a warning whose trigger is a noisy estimate is itself a coin flip.
  Simulate the gate, not just the estimator.**
- ~~**`AC='newey'` chosen explicitly had no caveat.**~~ Still 8.8–20.8% rejection
  under the null with independent residuals. It is honoured, not overridden —
  the user asked — but the results now say it is the narrower and
  anti-conservative option at that length.
- ~~**`CYC=2` still put a 1.5e13 coefficient in the model.**~~ The morning's
  cycle fix guarded the *number* (below 2, or at least as long as the series)
  and missed the case between: `sin(2*pi*t/2)` is `sin(pi*t)`, zero at every
  whole t but ~1e-16 in floating point, so R fits it. Guarding the number was
  the wrong shape of fix; each harmonic term's column is now checked for
  variation and dropped by name if it has none. **When you guard an input,
  check whether the thing you actually care about is a property of the column.**
- ~~**`Q1 2015`-style labels ordered quarter-before-year.**~~ Both reviewers.
  A monotonically rising 24-quarter series with no intervention reported a
  significant 42% drop (0.582, 0.343–0.987) under a note claiming the periods
  had been ordered "by the number inside each label". Unpadded ISO weeks the
  same: a 3.1%/week rise reported a *declining* pre-intervention slope and an
  end-of-follow-up contrast of 2.519 (1.337–4.746). A label with more than one
  run of digits is refused now. Both escape hatches were checked afterwards:
  `Week 1`…`Week 24` still orders by its single number, and the quarters order
  correctly under "the order they appear in the file" — each then correctly
  reporting no effect.
- ~~**Controlled ITS reported the control's slope as "Pre-intervention
  slope".**~~ Under `g + t + …` the `t` coefficient is the slope at `g=0`. A
  controlled run reported a flat baseline (1.003) while the intervention series
  rose 5% a month. Renamed, and `g:t` — the parallel-pre-trends test the whole
  DiD estimand rests on, fitted all along and never shown — is now reported,
  with a note when the series are demonstrably not parallel.
- ~~**"Observed vs counterfactual" was fitted vs counterfactual.**~~ On the
  cohort demo the final period's observed count is 16 against a fitted 18.73:
  the row said 0.655 where observed/counterfactual is 0.559. Renamed, with a
  note on why the model value is the right one to use.

#### What the reviewers disagreed about, and who was right

- The applied reviewer called the HAC arithmetic correct and the narrow
  intervals "genuine underdispersion plus HC0's known small-sample bias, not a
  coding error". The methodologist agreed the algebra is right — bread, scores,
  Bartlett weights and the dispersion cancellation all check out — and both
  were correct: the fix is a finite-sample correction and a different default,
  not a repair to the estimator. **Nobody should "fix" `hacv`'s algebra.**
- The applied reviewer flagged the 12-row cliff as the headline SE problem
  (11 periods → 0.610–1.152, 12 periods → 0.798–0.858, from one extra month on
  an option the user never touched). The methodologist showed the cliff is a
  symptom: the sandwich is anti-conservative at *every* length in range, so
  removing the cliff by lowering the threshold would have been the wrong fix.
  The methodologist won; the threshold is gone entirely.
- Both reviewers independently proposed that `hacdeg` (the zero-variance
  guard) is effectively dead code — 0 firings in 32,500 simulated fits plus
  every real case. Left alone: harmless, and it is a guard against a real if
  rare pathology. Its threshold (`dg < 1e-6*dm`) is six orders of magnitude,
  so a factor-4 variance collapse passes it. Worth tightening some day.

### Found 2026-08-22 by a sixth run — the Protocol Checker, which no run had opened

Five consecutive runs had worked the protocol builders and RWE Studio. This one
rotated to `src/pages/tools/protocol-checker.astro` and its Cloudflare Worker
(`workers/target-checker/worker.js`), which together had four commits ever and
no deep pass. Two reviewers ran concurrently and converged independently on
three of the defects below, which is good evidence they were real.

#### Environment: the checker can be made fully deterministic

- **The worker is unreachable** (`target-checker.danielhttsai.workers.dev` → proxy
  403), and the AI is non-deterministic anyway, so **do not try to run it**. Drive
  the built page in Chromium and route the worker URL to a canned JSON response:
  `page.route('**/target-checker.danielhttsai.workers.dev/**', r => r.fulfill({...}))`.
  Every claim in this section was executed that way. This is strictly better than
  a live run: you choose the model's answer, so you can test the answer shapes
  that matter (a missing id, an en dash, prose where an array was asked for) and
  get the same result twice.
- The reusable harness is small: serve `dist-check/` from a `node:http` server,
  `page.evaluate` to set `#text` and dispatch `input`, click `#check`, wait for
  `#results:not(.hidden), #runerror:not(.hidden)`, then read the DOM. Capture the
  Markdown by monkey-patching `URL.createObjectURL` and `HTMLAnchorElement.click`
  before clicking `#download`; the same trick plus `npm pack docx@8.5.0` and a
  `page.route` on `**unpkg.com/**` gives you a **real `.docx`** to unzip and read
  (`word/document.xml`). Both were used here.
- **`page.setInputFiles` works** for the upload path, and `.txt`/`.md` need no CDN
  at all — only `.docx`/`.pdf`/`.xlsx` need the blocked `cdnjs.cloudflare.com`.
- The session starts on a **detached HEAD**; push with `git push origin HEAD:main`.
- `dist-check/` is **not** in `.gitignore`. Never `git add -A` (you were told).

#### Fixed this run

All executed before and after, in Chromium against a local build, and — where
the exports are involved — asserted in a generated `.docx`, not inferred.

- ~~**`Number(null) === 0`, so a window the AI could not place was drawn at day
  0.**~~ `cleanTimeline` exists to catch unusable windows and says so in its own
  comment, but tested `Number.isFinite(Number(v))`. `Number(null)`, `Number("")`,
  `Number(false)` and `Number([])` are all finite `0`, so a covariate look-back
  returned with `startDay: null` was drawn as **"0 → 0"** — and a 365-day
  new-user washout returned as `null → null` became a zero-day washout, which is
  a different study. Only a non-numeric *string* was ever caught. Days are read
  now (`readDay`/`DAY_RE`), and a dropped window names the value that could not
  be read.
- ~~**Both exports printed the raw timeline, contradicting the screen.**~~ A
  report could caveat that a window had no usable days and then print
  "Exposure window: day 0 → 90 days" three sections later, or print the literal
  word `null` as a day number. And when the screen **refused** to show a scheme
  at all, both exports printed the section anyway — six em-dashes and three
  "none stated" lines that read as findings. `renderScheme` now returns
  `{kept, dropped, lists}` and both exporters consume it. **One computation,
  three surfaces** — the pattern this brief keeps asking for.
- ~~**The AI is told to invent durations and the invention was invisible.**~~ The
  worker prompt says "If a duration is not stated, choose a reasonable default
  and set note to 'assumed'", and `note` never reached the screen. A window the
  AI *declares* it assumed is now dashed and hollow, marked `*`, named under the
  diagram and carried into both reports via the caveats channel. **The converse
  is deliberately not claimed**: `note` is optional in the worker's schema, so
  the caption says a solid bar is not a guarantee the duration was stated.
  Reviewer A caught that over-claim in this run's own fix.
- ~~**`unclear` was aliased to `partial`.**~~ Both reviewers, independently. On
  this page Partial means something specific and accusatory ("the topic is
  raised but a key element … is missing"); a model answering "unclear" made no
  such finding. Four "unclear" items produced four amber chips, their evidence
  printed as if it were a deficiency, all four inside the denominator, and no
  caveat. They are "Not assessed" now, keep the model's sentence, and are
  caveated. The conflation sat four lines below the comment warning against it.
- ~~**The score's denominator moved with what the model chose to answer.**~~
  N/A and Not assessed are excluded from it, so the *same* protocol with the
  *same* thirteen met items reads 13 of 23, 13 of 17 (six omitted) or **13 of 13
  — 100%** (the rest marked `na`). The summary now names the checklist's own
  size whenever the denominator is smaller, and says what was taken out. The
  legend also claimed only "Not assessed" is excluded, when N/A is too.
- ~~**The model's free-text `summary` was printed in the tool's voice.**~~ It is
  unvalidated prose and routinely states a total of its own: one run opened
  "satisfies 21 of the 23 HARPER items" directly above a tally of 13, and named
  as missing two items the tool had explicitly refused to judge. Now quoted and
  attributed, below the computed count, on all three surfaces.
- ~~**Neither export carried the frame around the number.**~~ The legend and the
  "this score is one sample, not a measurement — 19, 20, 21 and 22 of 23 across
  four unchanged runs" paragraph were on screen only, while the `.docx` — logo,
  date, colour-coded verdicts, a tally — is the artefact that most resembles a
  measurement. Both exporters now **read those paragraphs out of the DOM**
  (`frameText()`), so they cannot drift from what the user read. A third was
  added: neither HARPER nor TARGET defines a conformance score.
- ~~**Criteria returned as prose were reported as "none stated".**~~ The worker
  presses hardest on exactly these three fields ("EXTRACT THESE EVEN IF THEY ARE
  WRITTEN AS PROSE", "MUST be populated") — in prose, which is what elicits a
  prose answer. The panel and both exports rendered any non-array as
  "— none stated —", so a protocol whose eligibility the AI had extracted in
  full was reported to its author as having none; object entries reached the
  Word file as `[object Object]`. Prose is shown as written and **not split**,
  with a note; unreadable entries are counted and named.
- ~~**One en dash erased a verdict and invented an off-list one.**~~ The
  planned-outputs panel matched names by raw lowercase equality. "Cumulative
  incidence / Kaplan–Meier curve" (en dash — the typographically correct form of
  the eponym, and what a model returns) missed the worker's ASCII-hyphen name,
  so the row said "the AI returned no verdict" (false — it said `present` and
  quoted the section) *and* the same figure reappeared at the foot of the list
  under a caveat saying it was "not on the list it was asked about". A repeated
  name rendered twice with opposite verdicts. `reconcile()` thirty lines up
  already normalises ids and already handles duplicates; this now follows the
  same rules.
- ~~**`.txt` was the one upload with no parser behind it.**~~ `extractPlain` was
  `file.text()`. A gzip renamed `protocol_v3.txt` was accepted as "37,873
  characters extracted · ready to check", sent to Gemini and scored; so was a
  renamed `.docx`. UTF-16 (Notepad's "Unicode", and several Windows stats
  packages) is half NULs. UTF-16 with a BOM is decoded properly now — the BOM
  makes that a fact, not a guess — and anything still >2% unreadable bytes is
  refused by name with the percentage. Verified on six real files.
- ~~**The Word button could fail forever in silence, naming the wrong host.**~~
  Its failure went only to `#status`, in the input card ~1,300px above the
  button, up to 20s later; the button stayed enabled and unchanged. And the
  message hardcoded `cdnjs.cloudflare.com` because three of `loadScript`'s four
  callers use it — the Word export loads from **unpkg.com**, so a user behind a
  proxy blocking unpkg was sent to IT to unblock the wrong domain.
- ~~**`fmtDay` rounded a window into a different window.**~~ A 100-day look-back
  was drawn "−3mo" (90 days) and 400 days of follow-up "+1.1y" (401.5) while the
  exports printed the raw numbers. It abbreviates only exact conversions now.
- ~~**A timeline answered in prose produced "No analysis windows could be placed
  on a day axis from this text"**~~ — a claim about the protocol, for a failure
  in the shape of the answer.

#### Checked and clean (do not re-derive)

- The worker's `HARPER_ITEMS`/`TARGET_ITEMS` ids match `src/data/harper.ts` (23)
  and `src/data/target.ts` (31) exactly, `DELIVERABLES` matches
  `DELIVERABLE_NAMES`, and `MAX_CHARS` is 60000 in both. All three "keep in
  lock-step" comments are currently true.
- `reconcile`/`normId` are solid: `Item 7.3.1.`, `7A`, trailing `)` all
  normalise; unknown ids are reported, not guessed; duplicates keep the first
  and are named.
- `escapeHtml` covers every model-controlled string reaching `innerHTML`; the
  `.docx` escapes correctly.
- Empty file, `.docx` containing only a table, file-plus-paste precedence, a
  207,227-character paste's truncation arithmetic, and Clear-then-Check were all
  executed and are correct.
- `src/data/strobe.ts` is not in the `FRAMEWORKS` registry — dead data, not a bug.

#### Open, examined this run, deliberately left

Ranked by damage. The first three need a source this sandbox cannot reach; do
**not** act on them from memory or from a search snippet.

- **TARGET's target-trial SPECIFICATION items (6a-6h) appear to be missing
  entirely.** The published statement is built on a side-by-side pair —
  specification (6a-h: the causal estimand) beside emulation (7a-h: how it is
  estimated). This repo ships 7a-7h and a single undivided item 6 ("Specify the
  target trial"), so an emulation is scored on the emulation column alone and
  item 6 is a line a model will mark "met" for any paper containing the phrase.
  **Snippet evidence only** (JAMA 2025;334(12):1084-1093, doi
  10.1001/jama.2025.13350). Adding eight checklist items with invented wording is
  exactly the fabrication this repo has already been burned by. Check the record,
  then add `harper.ts`-style entries to `target.ts` **and** `worker.js` together.
- **HARPER's Table 1-13 mapping is asserted item by item and is unverified.**
  Those numbers go into the Gemini prompt *and* onto the user's screen ("7.3.3.
  Exclusion criteria … (Table 5)"), so a wrong number sends an author to the
  wrong table in the real template. One search summary suggested HARPER's Table 1
  is the *amendments* log, not milestones — which would put every later number
  out by one — and tellingly item 3 (Amendments) is the only item here with no
  table number. That snippet may equally describe the *article's* tables. Check
  the template PDF; fix `harper.ts` and `worker.js` together, they are one map.
- **HARPER's top-level section number is uncertain.** Two search summaries
  disagree: one puts Research methods at 7 (supporting the repo), one at 5 with
  identical sub-numbering (5.1 design, 5.2 diagram, …), which would make every
  `7.x` id wrong. Same check, same two files.
- **Citations are real but incomplete.** Both papers were confirmed from search
  snippets — HARPER PDS 2023;32(1):44-55, doi 10.1002/pds.5507, PMID 36215113;
  TARGET JAMA 2025;334(12):1084-1093, doi 10.1001/jama.2025.13350, PMID 40899949
  — and **both author lists match the repo exactly**. No fabricated reference was
  found. But `HARPER_CITATION`/`TARGET_CITATION` omit volume, issue, pages and
  DOI, and they are the only citation a reader of the exported `.docx` gets; the
  HARPER title as rendered is a paraphrase (the published title has no "(HARPER)"
  and includes "of hypothesis evaluating real-world evidence studies on treatment
  effects" — the file's own header comment has it right); HARPER was co-published
  in *Value in Health* and only one journal is cited; and `target.ts:6` asserts
  "(CC BY-ND 4.0)", which was not checkable and matters, because ND would
  restrict the reworded item labels this file ships.
- **The planned-outputs check has no "not applicable" verdict, and the worker
  orders genuinely-N/A outputs recorded as "Absent".** The deliverables enum is
  `present|partial|absent` while the item checklist in the same response has
  `na`. A design where a Love plot, a KM curve and a by-treatment Table 1 do not
  apply draws **four red "Absent" chips for four non-defects** — which is exactly
  what SCCS, case-crossover, ITS and descriptive protocols from this site's own
  generator will produce. The fix is client aliases plus a worker enum and prompt
  change; the client half alone is inert, and the **worker is deployed
  separately, so nothing changed in `worker.js` can be verified from here**. Left
  for that reason, not because it is wrong.
- **TARGET is described as "the canonical 21-item framework" and scored out of
  31.** Splitting 1→1a/1b/1c and 7→7a-7h is a legitimate finer audit, but nothing
  on screen says the denominator is the tool's own sub-division, so "28 of 31
  TARGET items" reads as a fraction of the published checklist. Item 7 is also
  scored *alongside* 7a-7h, so satisfying every sub-element necessarily satisfies
  the parent — and by the page's own comment item 7 is the one the model most
  often omits, which then moves the denominator.
- **A finished report stays on screen, unmarked, after the input changes.**
  `runCheck` hides stale results on the *run* boundary, deliberately; the input
  boundary has no equivalent. Edit the pasted text and the previous report stays,
  both download buttons live, no staleness marker — and the exported `.docx`
  carries today's date. Switching the framework radio leaves the picker saying
  TARGET while the results still say "HARPER conformance". Fix: hash the input
  into `lastReport`, compare on `input`/`handleFile`, show an amber "generated
  from different text — re-run" bar. Do not auto-hide the report; that reads as
  data loss.
- **"Also check against TARGET" spends a request 779px below the warning written
  to be seen before it is spent.** Measured. The button ticks the radio, calls
  `refreshFrameworkNote()` and immediately runs, so the "expect a near-perfect
  score that means very little" note is rendered correctly and never on screen on
  that path. The post-run caveat does fire and does reach both exports, so
  nothing false is printed. General pattern worth one fix: **every immediate
  warning this page emits lives in the input card at the top, while the user
  lives in the results card ~1,300px down** — including the Clear-then-Check
  refusal. The Word-export failure was moved for this reason; the others were not.
- **`RESPONSE_SCHEMA` lacks `propertyOrdering`** while the other two worker modes
  carry it with a comment recording that `required` alone made Gemini silently
  omit the field on every item. The failure was simulated (every item missing
  `id`) and is handled honestly — "0 of 0 assessable items met", 23 Not assessed,
  two caveats — so this is robustness, not a defect. Still, the asymmetry with
  the file's own hard-won fix is worth closing when the worker is next deployed.
- **The prompt tells the model to prefer "missing" over "na"**, naming results
  items in a pre-study protocol as the example, while the UI caveat says the
  opposite treatment is intended. Both are documented as correct, and the choice
  moves the denominator.
- **`inclusion`, `exclusion` and `covariates` have no provenance channel.** The
  timeline now marks what the AI assumed; these three get the same "MUST be
  populated" pressure in the prompt and have no `note` field in the schema, so a
  paraphrased or inferred criterion is typographically identical to a quoted one
  in the Word file.

#### What the two reviewers disagreed about, and who was right

- **The moving denominator.** The methodologist ranked it second-worst in the
  tool; the applied reviewer met the same behaviour (a run answering 1 of 31
  items reads "1 of 1 assessable, 100%"), called it adequately disclosed in the
  same sentence, and said **leave it**. The methodologist won, but the applied
  reviewer's objection shaped the fix: the score was not restructured, the
  checklist's own size was simply named beside it. The decisive case was the
  all-`na` run, where there is no "could not be assessed" clause at all and the
  headline is a clean 100%.
- **The dashed-window fix was attacked by the reviewer, not defended by him.**
  The methodologist accepted the fix and then pointed out that its marking is
  *self-reported by the fabricator* — `note` is optional in the schema, so an
  unmarked window proves nothing. The caption now says so explicitly. **This is
  the second run in a row where the sharpest methodological finding was against
  the run's own fix.** Keep doing that.
- Both reviewers independently reproduced the `Number()` coercion and the
  export-vs-screen divergence from `HEAD` before either was fixed, from different
  constructed data. That is the strongest evidence available here that a finding
  is real, and it is cheap to get: give two reviewers the same file and let them
  build their own fixtures.

### Found 2026-08-22 by a seventh run — the case-control path, which no run had opened

Six runs had worked ACNU (×3), RWE Studio (×2) and the Protocol Checker. This one
rotated to **`src/pages/tools/case-control.astro`** (632 lines, never opened) and
the `CC` card in `protocol-generator.astro`. Two reviewers ran concurrently on the
same file from different angles and **converged independently on four defects**,
which is the strongest evidence available here that they are real.

#### Environment notes that held, and one that did not

- Everything in the fourth/sixth runs' sections is still true: `npm i
  --no-package-lock --no-audit --fund=false`; `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)` for a **real** `.docx`; Crossref/PubMed/doi.org
  blocked, `WebSearch` only; the live site unreachable.
- **The session did NOT start on a detached HEAD this time** — it was on a normal
  branch and `git push` behaved. Check `git status` rather than assuming either way.
- The whole builder script block is `is:inline`, so `page.evaluate(() =>
  buildMarkdown(readForm()))` and `await buildDocx(readForm())` work directly.
  That is the entire harness needed for a protocol builder — no WebR, no worker.
- **A number typed into `input[type=number]` that the browser rejects comes back
  as `""`, not as the text.** Pasting `90 days` empties the field while the box
  still looks filled. So `DAYS_RE`'s tolerance of "365 days" is for pasted/seeded
  values, not for typing — but the blank it produces is the case that matters.

#### Fixed this run

All executed in Chromium against a local `astro build`, before and after, and the
export claims asserted by unzipping a generated `.docx` and reading
`word/document.xml` — not inferred from `buildDocx`.

- ~~**`parseInt("1e3") === 1`, still live in this builder.**~~ The brief recorded
  this family as closed in ACNU; it was untouched here. `1e3` in the exposure
  look-back gave **three** answers in one document: §6 prose "the **1e3**-day
  window", the design table "1e3 days", and the figure's written window list
  "day −1d to 0" — with the SVG drawing a one-day exposure window nested inside a
  365-day covariate window. Worse, **the check that exists to catch exactly that
  nesting was silenced by it** (`365 < parseInt("1e3")` is `365 < 1`), and the
  reverse input (`covlookback=1e3`) fired a **false alarm quoting a number the
  user never typed**: "The covariate look-back (1 d) is shorter than the exposure
  look-back (90 d)". One `readDays`/`readCount` now feeds prose, figure, checks
  and Word; the figure omits a window it cannot place.
- ~~**Blank boxes exported as defaults, then laundered into localStorage.**~~
  `V("lookback") || "90"`, `|| "365"`, `|| "4"` in `readForm`. Deleting the
  contents exported "the **90-day** window" and "**4** control(s) per case" with
  the boxes visibly empty and **no check firing** — because the default was
  substituted before `computeChecks` ever saw the blank. The state was then
  written to `localStorage` as 90/365/4, so a reload silently made the default
  real. The file's own comment at `doReset` names this bug; only that half had
  been fixed.
- ~~**Case-cohort + the three default-ticked matching factors.**~~ Change one
  dropdown and nothing else and the `.docx` was headed "Matched case-control
  study", matched on age, sex and index date, with a case-cohort weighted
  estimator in the analysis section — `grep incoherent word/document.xml` → 0.
  The refusal existed, in the checks panel, which does not travel. There is now a
  `conflicts()` list feeding the panel, the Markdown and the `.docx` from one
  computation, beside the existing "this draft is incomplete" banner.
- ~~**Case-cohort named a Prentice estimator and called its output a risk
  ratio.**~~ Reviewer A's headline finding, and the one thing in the file worth a
  reject-and-resubmit. Prentice pseudo-likelihood is a weighted Cox partial
  likelihood → **hazard ratio**; the case-base cross-product against the subcohort
  → **risk ratio**, but only over a **fixed cohort with complete follow-up**.
  Both confirmed from search snippets (a Lifetime Data Analysis paper for the
  first, several sources for the second, "without requiring any rare-disease
  assumption ... from a fixed cohort"). Not verified against the primary records —
  Prentice 1986 Biometrika 73:1-11 was never read. The stated *reason* for the
  robust variance was borrowed from the Cox setting too ("subcohort members
  contribute to several risk sets"); in the cross-product there are no risk sets
  and the overlap of cases and subcohort is why. Both estimands are now named,
  with their conditions, on all four surfaces including the header explainer they
  originate from.
- ~~**The analysis was chosen from the matching ticks alone.**~~ Untick the three
  defaults under risk-set sampling — one gesture — and §8 prescribed
  "unconditional logistic regression" while the panel above showed a green tick
  promising the incidence-rate ratio. Incidence-density sampling time-matches by
  construction; conditioning on those risk sets is what buys the rate-ratio
  reading. `analysisText` now routes on the scheme, not only on `isMatched()`.
- ~~**"Do not enter the matching factors as covariates", stated
  unconditionally.**~~ True for individual matching, **exactly backwards for
  frequency matching**, where the correct fit is unconditional *including* them.
  The form cannot tell the two apart, so both branches are stated and the user is
  asked which they did. **This was a correction to this run's own fix**, which had
  shipped four hours earlier as a flat error message accusing the user — the third
  run in a row where the sharpest methodological finding was against the run's own
  work. Keep doing this.
- ~~**Overmatching was never mentioned**~~ while "Region / site" and
  "Primary-care practice" sit in the matching list — both proxies for prescribing
  behaviour, i.e. for the exposure. A warning names them now.
- ~~**A stale draft or `?seed=` silently became risk-set sampling.**~~ The restore
  loop does `els.value = val` with no membership check; an unknown value leaves
  `selectedIndex = -1`, the select shows nothing, and `V()` returns `""` — which
  `|| "riskset"` turned into a **specific, definite, wrong** scheme with a green
  tick endorsing it. (The brief's ACNU version of this falls through to *generic*
  prose; this one was worse.) Now named as unset everywhere, with a red error.
  The three parallel sampling maps plus the panel's if/else chain are one
  `SAMPLING` table, and the page checks it against its own `<select>` at load.
- ~~**The phenotype-library buttons discarded the code set.**~~ All three declared
  only `data-target-name`, so picking "Myocardial infarction (MI)" from a modal
  captioned *Validated phenotype library*, which had just displayed the ICD codes
  and the operational definition, wrote the bare name and left the case-definition
  field empty. Every other builder wires `data-target-def`/`data-target-codes`.
  This is the ACNU indication-button bug (third run) in a second file — **check
  the remaining builders' buttons against `PhenotypeLibrary.astro`'s documented
  attributes; it is a two-minute grep.**
- ~~**The Word file had no research question at all**~~ — the PICO sentence lived
  only in the Markdown — **and its section numbers ran one behind** the Markdown
  throughout, so "as stated in section 5" meant different sections depending on
  which export the reader had.
- ~~**Zero controls per case and a zero-day covariate window**~~ (under a section
  listing covariates) stayed on screen; they travel now.
- ~~**The Knol "90%" sentence.**~~ The number itself is supported by search
  snippets ("90% of the studies reported only an odds ratio despite the fact that
  the majority used designs that estimate risk ratios or incidence rate ratios"),
  so it is **not** fabricated — but as written it welded that marginal to an
  *unconditional* entitlement, and Knol's own denominators cap that conjunction at
  ~81% (105 + 17 of 150) and show it was conditional for the majority: 57 of 125
  needed a stable source population, 16 of 17 needed the rare-disease assumption,
  only 48 needed nothing. On the page whose thesis is *state your assumptions*.
  Rewritten to report what Knol reports. **Evidence is search-snippet only.**

#### Checked and clean (do not re-derive)

- **Citations: nothing fabricated in the case-control path.** All five references
  (Vandenbroucke & Pearce 2012 IJE 41(5):1480-9; Wacholder I 1992 AJE
  135(9):1019-28; Knol 2008 AJE 168(9):1073-81; Labrecque 2021 AJE 190(2):318-21;
  Essebag 2003 Am Heart J 146(4):581-90) matched search records on author list,
  journal, year, volume, issue and pages, as did the CC card's `cite`/`doi`. Two
  DOIs (`aje.a116396`, `aje/kwaa167`) never appeared in any snippet. **One
  possible defect, deliberately left**: a reviewer's snippet says Wacholder II and
  III carry a different author order (Wacholder, Silverman, McLaughlin, Mandel)
  from paper I, and the reference lists all three under I's order. Snippet-only
  evidence, and this repo has already had an author list broken by a
  well-intentioned fix — do not touch it without a record.
- Every `name="…"` diffed against every `s.<x>` in `readForm`: all controls read,
  no `s.subgroups`-style typo. No `+`/`||` precedence bug. 390px viewport clean
  (390/390). "Clear all" restores the authored defaults and unticks correctly.

#### Open, examined this run, deliberately left

- **The outcome library still loses the ICD codes.** `PhenotypeLibrary`'s
  `fillFrom` sets `targetDef` to `item.definition || item.codes`, so where an
  entry has both — every outcome — the codes are dropped once a definition exists,
  and case-control has no separate codes field to point at. Fixing it means
  changing the shared component's fallback, which would alter `outcomeDef` in four
  other builders. Worth doing deliberately, in one pass, not as a side effect.
- **`max="20"` on "Controls per case" binds nothing.** `500` prints as "500 per
  case". No `:invalid` styling exists anywhere in the repo, and there is no submit.
  Nothing false is printed — the user sees what they typed — so it is the species
  without the damage.
- **Three matching factors ship ticked**, so a blank form is a "matched
  case-control study" in the abstract, the subtitle, §1, §3, §5's heading and the
  Word design table before any design decision is made. `SENSITIVITY` ships four
  ticked including "Matched vs unmatched analysis". **Defaults policy — Daniel's
  call**, same class as the ACNU note above.
- **No study size, power or sparse-data check.** Six matching factors at 4:1 can
  leave most matched sets uninformative (no exposure variation contributes nothing
  to the conditional likelihood) and nothing says so.
- **No risk period is ever elicited**, yet under cumulative sampling the tool
  promises the odds ratio approximates "the risk ratio" — which is undefined
  without one. §8 also opens "The estimand is the effect of E on O", which names
  no population, contrast or time horizon.
- **"overstates it"** (three places) is directionally ambiguous: for a protective
  exposure the OR is *smaller* than the RR. "Further from the null" is exact.
- **`pcOf.analysis` under cumulative sampling produces a comma splice** in the
  exported abstract: "…estimates the odds ratio of the full cohort; it
  approximates the risk ratio only if the outcome is rare, and overstates it
  otherwise, with 95% confidence intervals."
- **`PC.mountAmendments(form)` is not called here either** — confirmed by DOM
  query — while both exports still assert "no amendments have been made". Same
  item as the third run's; seven builders, unchanged.

#### What the two reviewers disagreed about, and who was right

- The applied reviewer ranked the phenotype-library data loss first and never
  looked at the estimand; the methodologist ranked the Prentice/risk-ratio muddle
  first and never noticed the library button. **Neither list contained the
  other's top finding.** That is the strongest argument yet for running the two
  briefs genuinely differently rather than as two passes of the same review.
- Both independently reproduced the `1e3` family, the blank-default refill, the
  case-cohort/matching incoherence and the missing covariate-vs-matching check,
  from separately constructed fixtures. Four-for-four convergence.
- The methodologist's frequency-matching point **overturned this run's own
  earlier fix**, which had shipped as a flat error. The fix was softened to name
  the fork. Had the two reviewers only agreed, that error would still be live.

### Found 2026-08-22 by an eighth run — clone-censor-weight, and three shared components

Seven runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker and
case-control. This one rotated to **`src/pages/tools/clone-censor-weight.astro`**
(746 lines, never opened by a run) plus the shared components it depends on —
`DesignDiagram.astro`, `SitesPicker.astro`, `ProtocolCommon.astro`,
`PhenotypeLibrary.astro`, `TargetChecklist.astro`. Two reviewers ran
concurrently with genuinely different briefs, then each was given the other's
list and told to attack it. **The second round changed the answer** — see
"who was right" below.

#### Environment: one harness trap that will cost you an hour

- **`URL.createObjectURL` must not be stubbed when capturing a download.** The
  obvious way to grab a `.docx` from a builder — monkey-patch
  `URL.createObjectURL` to keep the blob and return a placeholder string — makes
  `svgToPng` fail, because it rasterises the diagram by loading *its own* blob:
  URL into an `<img>`. The page then correctly reports "the browser could not
  render the diagram" and you conclude the site is broken when your harness is.
  Record the blob and return the **real** URL. And take the blob whose type is
  `wordprocessingml`, not the first one: on the five builders that embed the
  figure the first blob is the SVG.
- The session started on a **detached HEAD** again. `git push origin HEAD:main`.
  (The seventh run saw a normal branch, so keep checking `git status`.)
- Everything else in the fourth/sixth/seventh runs' notes still holds: `npm i
  --no-package-lock --no-audit --fund=false` (26s); `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)` for a real `.docx`; Crossref/PubMed/doi.org
  blocked, `WebSearch` only; the live site unreachable, so nothing here was
  checked against `danielhttsai.github.io`.
- **Do not rebuild the directory your reviewers are driving.** Build your own
  changes to a second `--outDir` and leave theirs alone, or their round-two
  observations are made against a tree that moved under them. One reviewer's
  round-two list correctly flagged this: it had found a defect in `SitesPicker`
  that had been fixed and rebuilt while it was reading.
- The reusable harness (`harness.mjs` in this run's scratch) is small: serve
  `dist-*` from `node:http`, `page.route` unpkg to the local docx copy,
  `setFields` by `name`, then `preview`/`checks`/`diagramText`/`saveDocx`. The
  whole script block is `is:inline`, so `page.evaluate(() => readForm())` and
  `buildMarkdown(readForm())` work directly.

#### Fixed this run

Shared components first — these reach several builders each.

- ~~**`DesignDiagram`'s `fmtDay` rounded a window into a different window.**~~
  The brief's own open item, and worse than recorded. It abbreviated by
  rounding: 350 d → "−1y", 364 d → "−1y", 89 d → "−3mo", 61 d → "−2mo". Not
  decoration — `describeSpec` turns these into the written window list that
  `designDiagramDocx` ships inside the `.docx`, the only machine-readable
  description of the figure a Word reader gets. Worst case: an inclusion
  look-back of 350 and an exclusion look-back of 365 both read "day −1y to 0",
  so the figure asserted two different windows were the same one. **The
  Protocol Checker had already fixed its own copy of this function** (sixth
  run) and the two then disagreed — the drift this repo keeps paying for. Now
  the checker's rule: abbreviate only exact conversions, "?" for a non-number.
  Verified end to end in a real case-control `.docx`: "day −1y to 0" →
  "day −350d to 0".
- ~~**`SitesPicker`: one click to add a data source deleted the others.**~~
  Found independently by this run and by the applied reviewer. It rewrote the
  whole field from whichever boxes were ticked and skipped the write when none
  were. Three failures: untick every site and the guard `sel.length` blocked
  the last write, so zero boxes ticked left "Taiwan (TWB)" named as the data
  source; the boxes have no `name`, so they are outside `readForm`/localStorage
  and after a reload the field held three sites with nothing ticked; which made
  the next click destructive — ticking a fourth site **replaced all three**.
  Each box now owns exactly its own token, the boxes follow the field on load /
  edit / reset, and hand-typed text is left alone. Shared by case-control, CCW,
  ITS, sequential-trial and trend-in-trend.
- ~~**A `?seed=` link destroyed the saved draft under a banner promising it was
  recoverable.**~~ **Both reviewers ranked this first**, from different
  directions, and it is the only defect either found that destroys the user's
  *input* rather than producing a document a co-author could catch. The builder's
  first `render()` autosaves to the same localStorage key the draft is in;
  instrumented, that write lands ~66 ms after navigation with `readyState`
  still `"loading"`. The banner then said — in Chinese, on pages written in
  English — that the draft was still in the browser and that reloading without
  the seed would bring it back. It brings back the seed. The draft is copied to
  a `<key>.before-seed` backup before the seed is applied; the banner says
  plainly that reloading will NOT recover it and offers a button that restores
  it and reloads without the seed; it is bilingual. **Note the mechanism trap**:
  one reviewer first proposed re-ordering the banner paint, and on re-deriving
  it showed that cannot work — `applySeed` and the autosave write the same key,
  so the draft dies on the first render whatever the paint order. It needed a
  second key. Shared by every builder accepting `?seed=`.

Then CCW itself.

- ~~**The refusals never left the screen.**~~ The checks panel was the only place
  this page said no. Grace 400 d against 90 d of follow-up showed a red ✕ and
  exported a Word protocol *and* a TARGET checklist stating both numbers as
  settled decisions, under "Word document downloaded." `blockers()` now paints
  the panel, heads both exports and prefixes TARGET item 1a — one computation,
  four surfaces, following case-control's `conflicts()`.
- ~~**Three incoherent designs had no check at all.**~~ Maximum follow-up of 0
  (which also disabled the grace-vs-follow-up rule, since that required
  follow-up > 0); strategy A identical to strategy B; and **the outcome also
  listed among the IPCW-weighted censoring events** — a persistence study could
  export "Outcome: Treatment discontinuation" three paragraphs below "Events
  weighted by IPCW: Treatment discontinuation", censoring every patient at the
  event being counted. The applied reviewer called that last one the worst
  thing either list contained, and it is the only one that produces *no* number
  rather than a wrong one.
- ~~**An off-list effect measure fell through to confident generic prose.**~~ The
  brief's `selectedIndex = -1` family, live here. A stale draft or `?seed=`
  leaves the select unmatched, the value reads back `""`, and §10 named "the
  per-protocol effect on the risk of the outcome" — no measure, no horizon, no
  contrast — with the HR caveat and the RMST-horizon error silently off too.
  The five values are checked against the markup at load; an unset measure is
  refused by name.
- ~~**A parser used as a decision procedure** (the methodologist's framing, and
  the right one — it was four bugs with one cause).~~ `parseRows` read the day
  count through `dayInt`, which turns anything unreadable into **0**, and split
  each row on its **first** pipe. "Comedications | one year" exported as a
  look-back of "(0 d)"; "Chronic kidney disease | stage 3+ | 365" lost half its
  name and read "stage 3+" as zero days. This happened on **every keystroke** —
  the applied reviewer's original claim that a drag or a chip click caused it
  was OVERSTATED in mechanism and UNDERSTATED in damage; the click only made it
  permanent, by writing the guess back over the textarea that held the only
  copy. Rows are read by `numDays` now, exactly as the three boxes are; the name
  keeps its pipes; the figure omits a window it cannot place; `rowsJoin`
  preserves the raw text of untouched rows. Same cause, same pass: `/^death/i`
  was anchored, so a custom "All-cause death" was listed as an IPCW-weighted
  censoring event with the Young 2020 note and the panel warning both silent;
  and `/truncat/i` was substring-matched over the ticked list **and** the free
  text together, so unticking truncation and writing "No truncation of the
  weights is applied" made §8 assert truncation *was* pre-specified, three
  paragraphs above §13 listing the denial.
- ~~**Two free-text fields were filled in for the user, differently in each
  export.**~~ Every other unfilled field exports a visible bracket, but the
  deviation rule — the one decision that defines a CCW study, and not symmetric
  between the arms — exported as finished prose describing a rule nobody chose.
- ~~**The Word protocol carried no design diagram.**~~ `DesignDiagram.astro`
  documents the recipe and `designDiagramMd` states that HARPER 7.2 requires
  one. Five builders follow it; this one drew a diagram on screen and shipped
  the document without it, silently. **Sequential-trial, SCCS and case-crossover
  still do not** — the same three-line change each.
- ~~**"The caveat in Section 10".**~~ One `effectText` feeds four surfaces that
  number their sections differently or not at all: right in the Markdown
  (1–13), pointing at "Subgroup analyses" in the Word file (1–11), dangling in
  the abstract and TARGET. Nothing in that function may cite a section number;
  there is a comment saying so.
- ~~**TARGET item 7b prefixed a literal "Initiate ".**~~ The Strategy A box's own
  worked example begins "Initiate anticoagulation…", so the tool's placeholder
  produced "Initiate Initiate anticoagulation…" in the checklist a reviewer
  reads — for a design where neither arm need be an initiation strategy.
- ~~**The "as-started (ITT-analogue)" comparison paragraph.**~~ Unconditional, in
  three documents, three untrue claims: it is an as-treated analysis, not an ITT
  analogue (an ITT effect needs an assignment at time zero, and this design
  exists *because* there is none); the gap between it and the CCW estimate does
  not "index the immortal-time bias removed" (they differ in ≥5 respects); and
  it prescribed Fine-Gray for "the competing risk of death" even when the
  outcome *is* death. One string now, and it asks for the competing-risk choice
  instead of making it.
- ~~**The estimand had no direction, and the risk ratio was filed as an absolute
  effect.**~~ All five branches now name strategy A minus strategy B and say
  once that risk = 1 − survival.
- ~~**`stop()` treated a closing bracket as sentence-ending punctuation**~~, so
  the tool's own placeholder ran on: "…eligible for, all strategies) Eligibility,
  strategy assignment, and…". A bracket is terminal only when it closes
  something already punctuated.

#### What the two reviewers disagreed about, and who was right

**The headline: the methodologist's strongest finding was wrong, and it was the
methodologist who broke it.** Asked to attack its own list, it withdrew its
#2 ("positivity stated backwards", four emission sites, ranked second overall).
The strategies in this design are **complementary**, so deviating from arm A
*is* adhering to arm B: `P(deviate) > 0 in both arms` ⟺ `P(adhere) > 0 in both
arms` ⟺ `0 < P(initiate by G | L) < 1`. The file's condition is **equivalent to
the correct one**, and its "the next sentence contradicts it" argument
collapsed — the next sentence agrees with it. **Do not "fix" that paragraph to
say the opposite.** Had the two reviewers only agreed, a correct statement about
positivity would have been replaced with a wrong one, in four places, in the
identifying-assumptions section of every exported protocol.

- Its #3 ("stabilised weight defined as the unstabilised weight") went the same
  way: the numerator is a modelling *choice*, and the em-dash clause glosses
  what an IPCW is. **Under-specified, not wrong.**
- Its #1 (the survival-difference/risk-difference sign) was OVERSTATED as
  "licenses reporting a benefit as a harm" — magnitude-only shorthand is
  ordinary, and Maringe's own abstract uses it. What survived is smaller and was
  fixed: no direction was ever stated, and the `both` branch was flatly wrong.
- The applied reviewer's #6 verdict ("the tool never refuses") was **SPLIT**: two
  of its five cases *did* raise red ✕ on screen and were a restatement of "the
  panel does not travel"; three raised nothing anywhere and were new to both
  lists. Worth copying: make a reviewer separate "the tool did not detect it"
  from "the tool detected it and did not deliver it".
- **Neither reviewer's top finding appeared on the other's list** — the same
  result as the seventh run. The applied reviewer led with the seed path
  destroying a draft; the methodologist led with the estimand. Both were right,
  and both lists independently contained the `?seed=` item by the end.

#### Open, examined this run, deliberately left

Ranked. The first two are the same question and are **Daniel's call**.

- **The CCW form cannot state how any variable is measured.** There is no
  control matching `/code|def|algorith|valid/` anywhere on the page — no code
  set, no operational definition, for population, outcome or anything else. So
  the phenotype-library buttons, which declare only `data-target-name`, write a
  bare label with nowhere to put the ICD codes the modal has just displayed
  under the heading *Validated phenotype library*. This is the third run to find
  this button pattern (ACNU's indication, case-control's three, now these), and
  the audit is done: **`clone-censor-weight`, `interrupted-time-series`,
  `sequential-trial` and `trend-in-trend` all have name-only buttons and no
  field to point a `data-target-codes` at.** ACNU, case-crossover, SCCS,
  descriptive-analysis and case-control do have the fields. So this is not a
  wiring bug in four files; it is four builders that never asked for an
  operational definition — TARGET 7e and HARPER's operational-definition items,
  omitted outright. Adding the fields is a feature.
- **The defaults assert a design nobody made.** Four subgroups and five
  sensitivity analyses ship ticked and export as pre-specified. The sharp half
  is not the lists: §8 *reasons* from a default tick — "Truncation at the
  1st/99th percentiles is examined as a pre-specified sensitivity analysis" — a
  statistical decision asserted as pre-specified that nobody made. (The
  free-text half of that sentence was fixed; the default tick still drives it.)
  Same class as the ACNU and case-control defaults notes. **Defaults policy.**
- **`PC.mountAmendments(form)` is still not called here**, and `readForm()`
  omits `amendments`. Better evidenced than the third and seventh runs' version:
  a seeded amendments log prints a full HARPER table in the export, then one
  reload and the same draft says "no amendments have been made" — because the
  field is never saved. That is data loss, not only an unsupported claim. Seven
  builders, unchanged.
- **§7's censoring schedule is hard-coded to initiate-vs-defer.** For strategies
  "Continue statin indefinitely" vs "Discontinue within the grace period" it
  still emits "a clone in the **initiate** arm can only deviate at one time …
  whereas a clone in the **deferred** arm can deviate at any moment" and
  prescribes a time-fixed weight model for one and a time-varying model for the
  other — the wrong models, for arms that do not exist. Fixing it needs the form
  to know what kind of strategy pair it has, which is a new control.
- **A non-grace strategy pair is not detected** (e.g. "Rivaroxaban" vs
  "Warfarin"), and the protocol asserts "Grace period: 14 days … during which
  the data are still compatible with either strategy" — a false claim about the
  data. Left deliberately: the tool cannot tell two drug names from two
  strategies, and guessing would manufacture exactly the wrong-label bug this
  brief hunts.
- **What survives of the positivity finding**, having lost the "backwards"
  claim: the condition as written does not generalise to the non-complementary
  strategy pairs the form permits (a patient may take neither drug); it is
  scoped "within the grace period" while §8 says the weights are cumulative over
  follow-up and the default censoring events occur after it; and "non-zero"
  should be "bounded away from zero". Small, and it needs the item above first.
- **"Stabilised" is said four times and the numerator model is never stated**,
  while §8 commits the primary analysis to untruncated weights. An analyst
  cannot implement the section as written.
- **The variance claim may overstate.** "Model-based standard errors must not be
  used … they are too small" — clone duplication is anticonservative but
  treating estimated weights as fixed is conservative, so the net sign is not a
  theorem; and a patient-clustered robust variance, the standard alternative, is
  excluded by implication without being mentioned. No bootstrap replicate count
  is pre-specified. **The reviewer marked this SUSPECT, not established, and it
  was not simulated. Treat it as a lead.**
- **A blank inclusion look-back is not a blocker**, so "inclusion criteria
  assessed over (not specified)" appears inside the sentence defining the weight
  model, and in TARGET item 7a.
- **A row's day count is rounded silently** (365.7 → 366) — the "rounded to whole
  days" info check still covers only the three numeric boxes.
- **`SitesPicker` tokenises on ";"**, so a hand-typed data source containing a
  semicolon is split into two tokens. Harmless today (non-site tokens are
  preserved verbatim) but it is the same species.
- **`ProtocolCommon`'s tail asserts facts about the study it cannot know** —
  that IRB approval is obtained, that the protocol is registered, that ≥80%
  power is targeted, that analytic code is peer-reviewed. Every builder, every
  export.
- **Sequential-trial, SCCS and case-crossover export no design diagram**, as
  above.

#### Citations — checked, nothing changed

All seven `REFS` entries were confirmed from search snippets, author lists,
journals, volumes and page ranges matching the file exactly, including Gaber CE,
Hanson KA, Kim S, Lund JL, Lee TA, Murray EJ (Curr Epidemiol Rep 2024;11(3):
164-174) with all six authors in order, and "Reflection" singular in Maringe.
The inline attributions were checked too: Maringe's 1-year survival + 1-year
RMST pair is confirmed, Maringe on the Cox model and the causal HR is supported
in substance, Young 2020 for the death/hypothetical estimand is correct.
**Search-snippet evidence only — Crossref, PubMed and doi.org are blocked; this
is not "verified against Crossref".** No fabricated reference was found and
**no citation was changed**. Two housekeeping notes: the Cashin 2025 reference
is rendered two different ways across the protocol and the TARGET export, and
Gran 2010 and Gaber 2024 are in the reference list but never cited in the text.

### Found 2026-08-22 by a ninth run — descriptive-analysis, the biggest never-opened builder

Eight runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control and clone-censor-weight. This one rotated to
**`src/pages/tools/descriptive-analysis.astro`** (1691 lines, never opened) plus
`ProtocolCommon.astro`. Two reviewers ran concurrently with genuinely different
briefs. **Neither reviewer's top finding appeared on the other's list, and
neither contained the orchestrator's** — three lists, three different headline
defects, all real. That is now four runs in a row where running the two briefs
genuinely differently was what found the sharpest thing.

#### Environment: nothing new blocked, one harness note

- `npm i --no-package-lock --no-audit --fund=false` (26 s), `npm pack docx@8.5.0`
  + `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org blocked and
  `WebSearch` only, the live site unreachable — all still true. Nothing here was
  checked against `danielhttsai.github.io`.
- **The session was on a detached HEAD again.** `git push origin HEAD:main`.
- **Playwright's global install has no named exports.** `const { chromium } =
  await import('/opt/node22/lib/node_modules/playwright/index.js')` gives
  `undefined`; it is a CJS default export, so use
  `const pw = await import(…); const chromium = pw.chromium || pw.default.chromium`.
  This costs ten minutes if you copy the previous runs' snippet verbatim.
- **Build your reviewers a `dist-` they own and never rebuild it.** One reviewer
  correctly reported that the file grew 1691 → 1854 lines underneath it and
  re-checked every finding against the working tree, marking each LIVE / already
  being fixed. That is the right behaviour, and it only happened because it was
  told the tree was moving. Tell them.

#### Fixed this run

All executed in Chromium against a local build, before and after, and every
export claim asserted by unzipping a generated `.docx` and reading
`word/document.xml`.

- ~~**The refusals never left the screen.**~~ Four `level:"error"` checks lived
  only in the panel. `blockers()` now paints the panel, the Markdown, the Word
  protocol and the STROBE checklist from one computation (CCW's `blockers()` /
  case-control's `conflicts()` pattern). Verified: a protocol with
  age-standardisation ticked and no age stratum now carries "This draft specifies
  a metric it cannot compute" in the real `.docx`, and the STROBE checklist's
  item 1a is prefixed with it.
- ~~**The feasibility panel was the only place the tool compared a metric's data
  needs against the sites, and it existed only on screen.**~~ Reviewer A's
  finding, and the sharpest of the three "does not travel" cases: a protocol
  could name three databases with no mortality linkage under "Numerator:
  all-cause deaths in cohort (mortality-linked records)" while STROBE item 9
  claimed the gap had been reported. `featureGaps()` now feeds the amber panel,
  the checks panel, both exports and item 9; a metric whose linkage **no**
  selected site carries is a blocker, not a heads-up.
- ~~**Every stem in `FEATURE_TRIGGERS` was dead.**~~ Each alternation was wrapped
  `\b( … )\b`, making the trailing boundary mandatory, so `carcinom`,
  `malignan`, `pregnan`, `gestation`, `radiolog`, `echocardio`, `genomic`,
  `tumou?r` and `death` matched only when the word ended there. Executed:
  "carcinoma", "pregnancy", "pregnant women", "gestational age", "radiology",
  "echocardiogram", "genomics", "tumours", "deaths" and **"leukaemia"** (the
  `leuk[ae]mia` bracket covers "leukemia" and "leukamia", i.e. neither common
  spelling of the British one) all matched nothing. `labs` was the one group
  written without the trailing `\b` and the one group that worked. **Note the
  deliberate narrowing:** bare `angio` matched nothing with the boundary and
  matches "angiotensin" without it, so the imaging cue is now `angiograph`.
- ~~**The structured abstract was a constant.**~~ It asserted "age-standardised
  rates … and pooled across sites" in every export, three sections above
  "Cross-site comparison: Descriptive only … no pooled estimate" — on the default
  form, with no user action. The ACNU `pcOf` bug in a second file. Read from the
  form now, and an unset option is named rather than replaced by a plausible one.
- ~~**Six fields exported a plausible value the user never entered.**~~ An
  untouched Section 9 exported "Time-series of 2010–2023" — a specific fourteen-
  year series — while the panel simultaneously said the trend range was not
  given; likewise `ageStdBands`, `suppression`, `ethics`, `dissemination`.
- ~~**Four pairs of copy-pasted `<select>` lookups with drifting wording.**~~ One
  `SELECT_TXT` now, plus `auditSelectMaps()` which asserts at load that each
  map's keys are exactly the option values in the markup and `console.error`s if
  not. The `strobeWhere` copy carried a fourth key (`fe`) the form has never
  offered.
- ~~**A stale draft or `?seed=` blanked a select and the export invented a
  choice.**~~ `writeForm` assigned `el.value` with no membership check;
  `selectedIndex = -1` shows an empty box and `FormData` omits the control
  entirely, so the dead value is **not recoverable from the state object** — it
  has to be captured at the moment of restore. The authored default is kept now
  and each dropped value is named in the panel. Worst case reproduced:
  `contribution: "pooled"` exported "Site-level aggregate (counts + person-time)
  only", the opposite of what the draft asked for, in the sentence an IRB reads.
- ~~**"Clear all" deleted the page.**~~ `selectedIndex = 0` moved the maximum
  joinpoints from 3 to 2 (the only one of nine selects whose authored default is
  not index 0 — worth auditing that way in every builder), and blanking `value=`
  / textarea content destroyed nine curated references, the ethics and
  dissemination paragraphs, the index-date rule, the standardisation age bands
  and the suppression rule **permanently**, because `render()` saves the empty
  state a tick later. `el.defaultValue` fixes all seven.
- ~~**A `|` in a code set silently deleted half of it.**~~ `ICD-10 F00.* |
  G30.*` emitted a three-cell row against a two-column header; GFM drops cells
  past the header width, so `G30.*` vanished from the Markdown — while the
  `.docx` kept it. **The two exported documents specified different code sets for
  the same study.** Escaped in every Markdown table cell.
- ~~**`pickedCitations` was never pruned**~~ (the brief's own standing item, live
  here in a second copy of the library modal). A citation now travels only while
  the phenotype it validates is still the value of one of the four name fields.
- ~~**Markdown and Word numbered their sections differently.**~~ With no metric
  ticked the Markdown emitted a fallback section and advanced `n`; `buildDocx`
  did neither, so Statistical analysis was "8." in one and "7." in the other and
  every later section too. The comment above the `n++` reasons about this and
  gets it backwards. Verified by extracting Heading-1 runs from both real files.
- ~~**Indirect standardisation.**~~ Two errors in one table cell. It printed
  "observed / expected events × 1000" under a unit of "per 1000 (standardised)"
  — an SMR/SIR is a dimensionless ratio. And it named WHO 2000 / ESP 2013 / Segi
  1960 as what it standardises *to*: those are age-**structure** weight vectors
  and carry no rates, so the expected count cannot be computed from the object
  the protocol names. Refused now, with the internal-pooled option identified as
  the one choice on that menu that does yield age-specific rates.
- ~~**The joinpoint control conflated the search with the selection rule.**~~ It
  offered "Grid search (NCI Joinpoint Regression Program default)" against
  "Permutation test (more conservative)" as alternatives. A grid search *locates*
  candidate joinpoints; a separate rule decides *how many*; Kim 2000, cited on
  the same line, uses both together. Grid search has never been that program's
  model-selection default — permutation test through v4.9, weighted BIC from
  v5.0 (**confirmed twice, independently, from NCI's own documentation**). The
  option values were deliberately **not** remapped, because a saved draft
  carrying `grid` would then silently mean something else; the labels and the
  exported prose were corrected instead, and the protocol now asks for the
  software and version.
- ~~**The points-per-segment number was wrong.**~~ Adjacent segments share their
  joinpoint observation, so the average is `(npts + jp)/(jp + 1)`, not
  `npts/(jp + 1)`: 10 points with 3 joinpoints is 3.3, printed as "2".
- ~~**Trend-in-trend stage 2 was described as a 2×2 of exposure by outcome**~~ —
  the one thing the design does not require. It is fitted to stratum-period
  marginals (N, n exposed, n outcomes), which is why it can run on aggregate data
  under a federated agreement. **Search-snippet evidence; the primary record was
  not read.** Everything else in that stub is correct and was checked: "cumulative
  probability of exposure" is the right expansion of CPE and quintiles is right.
  **Do not let anyone "correct" those from memory.**
- ~~**`ageStandardised` and `joinpoint` ticked alone.**~~ Both say they operate on
  "the relevant metric above" / "the primary metric (above)". With no occurrence
  or utilisation metric ticked there is no metric above; refused now.
- ~~**The terminal age band.**~~ Default bands stop at 85+; WHO 2000 runs to 100+
  and ESP 2013 to 95+, so the reference weights above 85 must be summed and the
  protocol never said so. Two sites collapsing them differently produce
  "WHO-2000-standardised" rates that are not comparable — the exact failure this
  page exists to prevent.
- ~~**The DDD source-population check tested the wrong second field**~~
  (`suppression`, a copy-paste) and any `populationDef` containing the word
  "population" silenced it.
- ~~**The STROBE header sentence was false in both directions.**~~ It asserted
  "Methods items are pre-filled; Results / Discussion items are placeholders"
  while a Methods item (10, study size) was deferred and four Results/Discussion
  items were pre-filled. Computed from the key set now — "16 of the 23 checklist
  items are pre-filled (1a, 3, 4, …)" — and items 10 and 22 are filled, both of
  which the exported protocol devotes a section to. Item 5 now gives the dates
  STROBE asks for, and item 7 names the **exposure**, which it never did although
  the whole Utilisation half of the builder rests on it.
- ~~**Two references resolved to different papers.**~~ PMID 36821644 was "Tan EC …
  *Multi-country comparison of polypharmacy*. Pharmacoepidemiol Drug Saf 2023" —
  wrong first author, wrong journal, invented title; it is **Lee H, Baek YH, Kim
  JH, Liao TC, Lau WCY, Man KKC, et al. Age Ageing 2023;52(2):afad014**. PMID
  30540837 was "Ooba N et al PDS 2018"; it is **Kubota K et al, PLoS One
  2018;13(12):e0208796**. Both **confirmed twice, independently** (reviewer and
  orchestrator, separate searches, PubMed record + publisher page). Crossref,
  PubMed and doi.org are blocked, so this is **search-record evidence, not a
  Crossref check.** The co-author list was taken only from a snippet that showed
  it; where it did not, "et al." Also fixed: the file named Lai as first author
  of the Clin Epidemiol 2019 NHIRD paper in one entry and Hsieh in another, both
  exporting into the same reference list — an internal contradiction needing no
  external record.
- ~~**Two false sentences.**~~ External-cause deaths were called "an important
  **denominator** for excess-mortality calculations" (they are a numerator, on
  this page of all pages), and the normal-approximation warning said intervals
  "cross zero or **exceed 1**", merging a property of proportions with rates that
  are unbounded above.
- ~~**Two phenotype code sets contradicted their own definitions.**~~ "First
  hospitalisation … acute MI" shipped `I21.*, I22.*` — I22 is *subsequent* MI, by
  definition not a first event. "Ischemic stroke" shipped `I63.*, I64.*` — I64 is
  stroke *not specified* as haemorrhage or infarction, and its share varies
  enormously by country and imaging availability, so it can dominate a
  cross-country comparison. **The code sets were not changed** — the ICD
  semantics are stated in the definition and the choice left to the user.

#### What the reviewers disagreed about, and who was right

- **The methodologist's #7 was a false alarm against work in flight.** It grepped
  at 21:09, saw `blockerMd` defined and never called, and reported that the
  four-surface comment above it asserted a guarantee the code did not provide.
  It was right at 21:09 and wrong by 21:11. That is a race artefact rather than a
  disagreement, but it is a real cost of running reviewers against a moving tree
  — and note that the *right* response to a comment claiming more than the code
  does is exactly what it did.
- **Neither reviewer's top finding appeared on the other's list, and neither
  contained the orchestrator's.** The applied reviewer led with the dead trigger
  regexes; the methodologist led with indirect standardisation naming an
  uncomputable reference; the orchestrator led with the refusals not travelling.
  All three were real and independently reproduced.
- **Three convergences, from separately constructed fixtures**: the dead stems,
  the section-numbering mismatch, and the stale-select fallback. The brief's
  claim that convergence is the strongest available evidence held again.
- The methodologist proposed prefixing the abstract with "crude" when
  standardisation is unticked. **Declined**: "Age-standardised rates" is itself
  one of the thirteen metrics, so its label already appears in the list when it
  is ticked, and prefixing produced "age-standardised Incidence rate,
  Age-standardised rates". Caught only by reading the rendered output of the
  run's own fix.

#### Open, examined this run, deliberately left

Ranked. The first is the highest-value thing left in this file.

- **No ICD-9 → ICD-10 check, in a tool whose entire phenotype library is ICD-10
  and whose headline example is a 2010-2023 trend.** Taiwan's NHIRD coded in
  ICD-9-CM until 2016 and US claims until Oct 2015, so `ICD-10 I21.*, I22.*` over
  2010-2023 returns **zero Taiwanese cases before 2016** — and the two validation
  papers the tool itself attaches to those phenotypes (Cheng 2014, Hsieh 2015,
  both confirmed) validated **ICD-9-CM** codes. A coding changeover is also the
  textbook source of a spurious joinpoint, and the tool will fit one and report
  an APC for it. Giving each phenotype an `icd9` field is a feature, so it is
  Daniel's call; a check that fires when the study calendar starts before the
  transition and the code sets name only ICD-10 is not, and is the cheap half.
- **The defaults assert a study nobody specified.** Three metrics, four strata
  and four sensitivity analyses ship ticked, so a fresh page exports three full
  methods sections; `missing()` never fires for metrics because the defaults
  satisfy it; and the first two red ✕ a user ever sees are caused entirely by
  defaults, which trains them to ignore the panel. Conversely the incidence
  prevalent-case check is *silently satisfied* by the authored `indexDateRule`
  containing the word "washout". Same class as the ACNU, case-control and CCW
  defaults notes. **Defaults policy — Daniel's call.**
- **`validation:` fields that are not validation studies**, exported under a
  modal captioned *Validated phenotype library* and merged into "Key references".
  The self-harm entry cites PMID 39241791, which a search record says is a
  psychotropic-**prescribing** trends paper (Lancet Psychiatry 2024) — the brief's
  third run flagged this independently, so two runs now agree. The dementia entry
  cites a real, correctly-attributed paper (PMID 38146486) that is a database
  *inventory*, not a phenotype validation. The COVID and pregnancy entries label
  as "AsPEN" networks that are not AsPEN. **Leads, not findings** — the honest
  fix is structural (split `validation` into a PPV/sensitivity citation and a
  "used in" provenance line, with `pmid`/`doi` fields that can be machine-checked)
  and that is a schema change worth doing deliberately.
- **Nine `validation:` strings are UNCHECKABLE as written** — "Lin CY et al,
  NHIRD diabetes definition", "cite Wong MCS et al where applicable", "Cheng CL
  et al NHIRD validation", "Hsu CC et al; Shao SC et al CGRD CKD work", "Yeh JJ
  et al NHIRD HF definition", "Lai EC et al, BMJ Open 2021/2023". No title, year,
  volume or identifier, and they export into the reference list verbatim.
- **No cross-field date check.** `studyCalendar = 2015-01-01 to 2015-12-31` with
  `trendYears = 2010–2023` exports both, four sections apart, with no objection —
  a one-year study cannot yield a fourteen-point annual series. This is the
  commonest copy-paste error when adapting a previous protocol.
- **Persistence and switching are forced into a numerator/denominator table where
  neither is one**, on the page whose stated purpose is catching
  numerator/denominator mismatch. Persistence's "numerator" is a duration and its
  formula a Kaplan-Meier median; its `unit` says "% at 1 y" while the formula says
  "6 / 12 months"; and it specifies **no censoring rule and no treatment of
  death**, which is a competing risk for discontinuation and materially
  overstates persistence in the ≥65 and heart-failure cohorts the library ships.
  Switching's numerator ÷ denominator can exceed 1 (a person may switch twice)
  and it never defines whether an overlapping start is a switch or an add-on —
  the difference between it and the `concomitant` metric two rows down.
- **Point prevalence's numerator is "members with an *active* condition on the
  prevalence date"**, which is not observable in claims without a look-back rule;
  period prevalence's is "≥1 qualifying record during the window", which is
  *treated* prevalence and misses a prevalent case with no encounter. Both are
  implementable only after the analyst re-specifies them.
- **Missing checks a multi-country descriptive study is rejected for**: no check
  on comparability of case ascertainment across countries (the dominant threat in
  this design, and the "Alternative case-finding rule" sensitivity analysis is
  *not* default-ticked); no mention of overdispersion, though exact Poisson is
  offered for annual aggregated counts with recurrent events and geographic
  clustering; no multiplicity note, though the default four strata crossed give
  thousands of intervals; nothing catches that a DDD numerator from a 60%-coverage
  claims database is divided by 100% of a country's inhabitants; and ticking two
  overlapping cause-of-death groups ("Cardiovascular I00-I99" and "Cerebrovascular
  I60-I69") double-counts in silence.
- **The Dobson interval is hard-coded for direct standardisation** while Section
  10 lets the user pick a bootstrap, so both print in one document. Dobson is
  **correct** for a directly standardised rate (Dobson AJ, Kuulasmaa K, Eberle E,
  Scherer J, Stat Med 1991;10:457-462, confirmed) — **do not "fix" it**; the
  problem is only that it ignores the user's choice.
- **The standardised unit does not follow what is being standardised.** Ticking
  `pointPrev` (a %) or `ddd` with `ageStandardised` still prints "per 1000
  (standardised)", and a standardised incidence rate loses its person-time
  dimension.
- **`enrolmentRestricted` ends in a bare `|enrol`** and `popBlob` always contains
  the authored `indexDateRule` ("database enrolment + 365 d washout"), so the DDD
  source-population warning fires unconditionally — including for a user who
  correctly writes "all inhabitants; no enrolment requirement".
- **`PC.mountAmendments(form)` is not called here either.** Seven builders,
  unchanged since the third run.
- **Wagner 2002 (segmented regression / ITS) sits in the default reference list**
  though no part of this protocol uses ITS; Dobson 1991, Lerman 1980 (the grid
  search) and Clegg 2009 (AAPC) are used and uncited; RECORD-PE is not offered,
  though it is the expected extension for a routinely-collected-data protocol.
- **STROBE item 1a answers "Multi-national descriptive epidemiology study"**,
  which is not one of the commonly used terms STROBE item 1a asks for — a
  DDD/prevalence study is a repeated cross-sectional, an incidence study a cohort.
  Item 12 omits missing data, which STROBE names and the form has no field for.

#### Checked and clean (do not re-derive)

- **DDD/1000 inhabitants/day**: `(DDDs × 1000) / (population × days)` and the
  mid-period source-population denominator both match the WHO ATC/DDD convention.
  Unit correct.
- **Trend-in-trend apart from stage 2**: CPE expansion, quintiles, the stage-1
  description and `exp(β₁)` as an odds ratio are all right, and the check
  correctly refuses it as a descriptive metric.
- **Initiation rate and concomitant use** cohere; period vs point prevalence are
  each internally matched to their own numerators and the check correctly refuses
  to let them share a column.
- **Direct standardisation** `Σ (age-stratum rate × reference proportion)` correct.
- **Citations confirmed from search records, unchanged**: Lai ECC 2015 Curr
  Epidemiol Rep 2(4):229-238; Lai EC 2015 Epidemiology 26(6):815-820; Kim HJ, Fay
  MP, Feuer EJ, Midthune DN 2000 Stat Med 19(3):335-351; Ji X, Small DS, Leonard
  CE, Hennessy S 2017 Epidemiology 28(4):529-536; Wagner AK 2002 J Clin Pharm Ther
  27(4):299-309; WHO GPE Discussion Paper 31 (Ahmad OB et al); Hsieh CY 2019 Clin
  Epidemiol 11:349-58; Shao SC 2019 PDS 28(5):593-600; Cheng CL 2014 J Epidemiol
  24(6):500-7; Hsieh CY 2015 J Formos Med Assoc 114(3):254-9; von Elm 2007 PLoS
  Med 4:e296. Author lists, journals, volumes and pages all match the file.
- **The library modal**: all four buttons carry the right `data-target-*`, so the
  ACNU/case-control name-only-button bug is **not** present. This page has its own
  modal and does **not** mount `PhenotypeLibrary.astro` — whose `PHENOTYPES` has
  `indications` but neither `populations` nor `mortalityCauses`, so adding
  `<PhenotypeLibrary />` here later would bind a second handler to the same
  buttons and break two of the four categories. The filtered-index lookup is right.
- **`renderScheme`** already refuses to read a calendar range as a duration;
  `1e3 days`, `2010-2023` and `Calendar years 2010–2023 (annual)` all fall back to
  the labelled schematic. No `parseInt` foot-gun remains on this page.
- **390 px and 1024 px viewports**: no horizontal overflow (390/390, 1024/1024).
- The design diagram is exported (`designDiagramFigure` + `designDiagramDocx`) and
  `lastFigNote` was empty on every run — Figure 1 embedded every time.

### Found 2026-08-22 by a tenth run — self-controlled case series, the biggest never-opened builder

Nine runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control, clone-censor-weight and descriptive-analysis. This one rotated to
**`src/pages/tools/self-controlled-case-series.astro`** (1529 lines, never
opened). Two reviewers ran concurrently with genuinely different briefs, and the
orchestrator worked its own list; **the orchestrator and the methodologist
converged independently on two defects from different starting points**, which
is the usual good evidence that they were real.

The focus chosen was deliberately narrow: **the numbers that define the SCCS
estimand, and whether the exported document says what the form says.** In an
SCCS the period strip *is* the estimand — the IRR is exposed person-time against
reference person-time — so a window length is not a presentational detail.

#### Environment: nothing newly blocked, three harness notes

- `npm i --no-package-lock --no-audit --fund=false`, `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org blocked with
  `WebSearch` only, the live site unreachable — all still true. **Nothing here
  was checked against `danielhttsai.github.io`.**
- The session was on a **detached HEAD** again. `git push origin HEAD:main`.
- **Pick a port your reviewers are not on.** Two subagents and the orchestrator
  all defaulted to 8099 and the second one died on `EADDRINUSE` before printing
  anything useful. Give each a distinct port up front.
- **`page.mouse` does not drive this page's drag handles.** They listen for
  `pointerdown` and filter on `pointerId`, and Playwright's mouse API produced
  no change at all — on the pre-change build too, which is how it was confirmed
  to be the harness and not a regression. Dispatch real `PointerEvent`s from
  `page.evaluate` instead (`pointerdown` on the handle, `pointermove` on
  `document` with the same `pointerId`, wait two `requestAnimationFrame`s
  because `apply()` is rAF-throttled, then `pointerup`). That works.
- `window.__builder = { readForm, buildMarkdown, buildDocx }` is already exported
  from the IIFE on this page, so `page.evaluate(() => window.__builder.buildDocx(...))`
  gives you a real .docx without touching the DOM.

#### Fixed this run

All executed in Chromium against a local build, before and after. Every export
claim was asserted by unzipping a generated `.docx` and reading
`word/document.xml`, never inferred.

- ~~**Every unreadable window length silently became one day.**~~ The sharpest
  thing in the file, and the house `parseInt` family in the field that defines
  the estimand. `parseRows` and `parsePeriods` both read the day count as
  `Math.max(1, parseInt(p[1]) || 1)`. Executed on the exported protocol table:
  `1e3` → 1 d (parseInt stops at the "e"), `thirty` → 1 d, `0.5` → 1 d, `-30` →
  1 d, `1,000` → 1 d, blank → 1 d, and a line that had lost its "|"
  (`Reference 90`) exported as a period *named* "Reference 90" lasting one day.
  **The write path was worse than the read path**: `rowsJoin`/`periodsJoin`
  rebuild the whole textarea from parsed rows and run on every chip click and
  every edge drag, so clicking "+ Frailty" rewrote `Comedications | one year` to
  `Comedications | 1` — the textarea was the only copy. Both parsers are
  tri-state now (`DAYS_RE`/`readDays`, the cohort builder's reading), unreadable
  is carried as `raw` and never becomes a number, the joins write the original
  text back, the exports name the line, the strip refuses to draw rather than
  assert a geometry the form does not determine, and a `stop` check names the
  field. **`30 days` still reads as 30** — that case was already right.
  Splitting on the **last** "|" also lets a period name contain one
  (`Sex (M|F) window | 30` parses correctly) and turns a pipe-less line into a
  named period with a missing length rather than a silent one-day one.
- ~~**Zero could never be said.**~~ Once lengths are read rather than clamped up
  to 1, the two zeros differ: a 0-day pre/post/washout segment is legitimate
  (this page's own sensitivity list offers "Alternative pre-risk window (0, 30,
  60 d)") and gets an info note; a 0-day *exposure* window leaves no exposed
  person-time, so the IRR has no numerator, and that is a blocker.
- ~~**The structured abstract was a constant.**~~ The `pcOf` bug in a third
  file. It asserted "a conditional Poisson (self-controlled) model contrasting
  exposed vs unexposed person-time within each case" for **all three** design
  variants — including active-comparator, whose own option text promises "no
  reliance on a 'no-drug' baseline", so there is no unexposed time in the
  contrast at all. It also outlived `primaryModel`, `effectMeasure` and
  `metaMethod`. Read from the form now; an unset field names its section rather
  than being replaced by a plausible constant.
- ~~**"Pretreatment" was not a pre-exposure window.**~~ The page header tells the
  user to "separate a short **pretreatment** window (e.g., 14 days)"; typing
  exactly that produced a purple "Custom period" and then the panel reported
  "No pre-exposure risk window". The tool contradicting its own instructions.
- ~~**A washout was a post-exposure risk window.**~~ Different objects: a
  post-risk window is a parameter the conditional Poisson model estimates, a
  washout is person-time removed from the likelihood. A segment labelled
  "Washout" was drawn in the colour the legend called "Post-exposure risk" — the
  figure's key disagreeing with the label on the bar. Own kind, colour and
  legend entry now, and because the tool genuinely cannot tell which is meant,
  it asks.
- ~~**Nothing compared the period strip with the risk-window dropdown**~~, though
  §6 prints both in one table: a strip reading "Exposure risk 30 d" was exported
  directly above "Days 0-180 after exposure start". Two statements of the
  estimand, two different IRRs. Deliberately **silent on the authored defaults**
  ("Entire exposure episode" beside a 30-day segment), where the strip is a
  schematic rather than a contradiction — a red mark on an untouched page
  teaches people to ignore the panel.
- ~~**An active-comparator SCCS with an untreated baseline and no comparator.**~~
  Section 5 says "no reliance on a 'no-drug' baseline"; section 6's baseline
  field still read "All observation time NOT in pre-risk, risk, or post-risk
  windows", which is precisely that baseline; and the comparator drug is named
  **nowhere** in the document because the form has no field for one. The tool
  cannot supply the drug, so it says what is wrong and where the answer goes.
- ~~**A stale draft blanked a `<select>` and the export answered for it.**~~ The
  brief's own standing item, live here. `writeForm` assigned `el.value` with no
  membership check; `selectedIndex = -1` renders an empty box, `FormData` omits
  the control entirely, and each export's `|| …` supplied a definite choice.
  Reproduced from a draft carrying `sccsVariant: "nested-case-control"`: the
  Design line and §5 both asserted "Standard SCCS (Farrington 1995)" and §10 a
  DerSimonian–Laird meta-analysis, none of it chosen, nothing on screen. The
  dead value **must be captured at restore** — it is not recoverable afterwards.
- ~~**The Word protocol shipped without the design diagram.**~~ HARPER item 7.2,
  and one of the brief's own open items ("Sequential-trial, SCCS and
  case-crossover export no design diagram"). Verified by unzipping: `word/media`
  now carries the figure beside the logo, under a numbered caption. **One trap
  the shared helper does not cover**: `fig.lines` comes from a WeakMap that only
  `renderDesignDiagram` fills, and this page draws its own bespoke SVG, so the
  plain-text window list came back **empty** — and that text is what an automated
  checker reading the .docx sees, since it cannot see the picture at all. Built
  from the same parse the strip is drawn from. When a length is unreadable there
  is no diagram, and the document says so where the figure should be.
- ~~**A "validated phenotype library" citing a paper that says otherwise.**~~ The
  `validation` field was hidden from the user, and appended verbatim to the
  numbered reference list. The self-harm entry read "Man KKC et al Lancet
  Psychiatry 2024 (PMID 39241791) used a comparable composite definition". PMID
  39241791 is **Luo H, Chai Y, Li S, et al, "Psychotropic drug prescribing before
  and during the COVID-19 pandemic among people with depressive and anxiety
  disorders: a multinational network study", Lancet Psychiatry
  2024;11(10):807-817** — a drug-utilisation trends study defining no self-harm
  outcome, first author not Man. **The brief's third and ninth runs flagged this
  same PMID from other files; that is now four independent agreements.** The
  GI-bleeding entry cited "Andersen M, Pratt N et al. PDS 2013" for "AsPEN PSSA
  NSAID/PPI safety work"; that record is the AsPEN **network description** paper,
  PDS 2013;22(7):700-704, PMID 23653370 — not PSSA work, not NSAIDs or PPIs, not
  a validation. Both confirmed twice, independently. **Neither was replaced with
  a substitute citation**: removing a claim shown false is safe, inventing its
  replacement is how a fabricated reference got in here once already.
  `validation` (a real validation study, the only thing reaching the reference
  list) is now split from `provenance` (a "used in / see also" note, shown but
  never a numbered reference) — the structural fix the ninth run recommended.
  Two entries keep a validation study; six say plainly they have none, **in the
  modal, at the moment of picking**. The two survivors both validated ICD-9-CM
  coding while the code sets shown are ICD-10, and now say so.
- ~~**`pickedCitations` was never pruned**~~ (standing brief item). Pick MI then
  stroke and the MI validation study stayed in a stroke-only protocol's
  reference list, and survived a reload. A citation travels only while the
  phenotype it validates is still named in the form. The reference list was also
  built by **two copies of one expression**, one per export — the drift pattern
  this codebase keeps getting caught by — and is built once now.
- ~~**Every cross-reference named a section of the form, printed into the
  export**~~, whose numbering differs: "(Event handling, section 4)" pointed at
  the exposure table. They name the field now.
- ~~**STROBE items 5 and 12 asserted what the protocol denied.**~~ Item 5 said
  pre-exposure windows were "as defined in the protocol" even when the same
  document carried "No pre-exposure risk window"; item 12 made season a
  time-varying covariate directly under item 11 reporting it not adjusted.
- ~~**"No assumption checks are outstanding for this draft."**~~ Printed over a
  wholly blank protocol, where it reads as an attestation. It says what it
  actually means now — that four pattern matches found nothing.
- ~~**Table 1 had identical columns by construction.**~~ `groupBy: "risk vs
  baseline period"` → "Table 1 — baseline characteristics by risk vs baseline
  period", in a design where every case contributes person-time to both. By site
  now.
- ~~**A sensitivity analysis that was the primary analysis.**~~ "Restrict to
  first event only (vs all events)" ships ticked; set the case definition to
  first-event-only and the protocol pre-specifies its own primary analysis as a
  check on itself.
- ~~**The feasibility regexes were mostly dead.**~~ The trailing-`\b` defect the
  ninth run fixed in descriptive-analysis, live here in a second copy: every stem
  in five of six groups matched nothing — "carcinoma", "malignancy", "tumours",
  "pregnancy", "gestational age", "births", "echocardiogram", "angiography",
  "radiology", "genomics", "deaths". `labs` was again the one group written
  without the trailing `\b` and the one group that worked. The vetted
  descriptive-analysis replacements were mirrored rather than re-derived,
  including the deliberate `angio` → `angiograph` narrowing.

#### Checked and clean (do not re-derive)

- **The four assumption statements** (`ASSUMPTIONS`, lines ~135-164) are
  methodologically correct — the methodologist read each `plain`/`precise`/`check`
  against the design's actual requirements and found nothing backwards. In
  particular assumption 1's "mirror image" argument (an excess of exposures after
  an event ≡ an excess of events before an exposure, which is why a pre-exposure
  window measures it) is the standard justification, stated correctly; and
  assumption 2 correctly says the standard model does not apply at all when the
  outcome is death.
- **Every form control is read.** All 43 `name="…"` values resolve to a
  `s.<x>`/`elements.<x>` read, and no read lacks a control. That is the brief's
  own recommended per-builder audit, done — this file does **not** have the
  `s.subgroups` vs `subgroupsPick` defect.
- **This is one of the two builders that DO mount the amendments editor.**
  `PC.mountAmendments(form)` is called, `amendments` is a real control, and
  `readForm()` includes it — so the eighth run's data-loss finding does **not**
  apply here. The residual "no amendments have been made" wording is
  ProtocolCommon's, and is a cross-cutting item, not this page's.
- **The seven `references` entries were all confirmed** from search records —
  Whitaker 2006 Stat Med 25(10):1768-97; Farrington 1995 Biometrics 51(1):228-35;
  Petersen 2016 BMJ 354:i4515; Whitaker 2018 Stat Med 37(4):643-58; Farrington
  2011 JASA 106(494):417-26 (**and it is genuinely about event-dependent
  observation periods**, as its annotation says); Wang 2021 BMJ 374:n1925 with the
  14-day pretreatment window and IRR 6.17 both confirmed; Hsieh 2019 Clin
  Epidemiol 11:349-358; Shao 2019 PDS 28(5):593-600. Author lists, journals,
  volumes and pages match the file. **Search-record evidence, not a Crossref
  check.** No fabricated reference was found among them and none was changed.
- **The `protocol-generator.astro` hub entry for SCCS is accurate** — `plain`,
  `when`, `assumes` and `fails` are all methodologically correct (fatal outcome,
  event-dependent exposure, and chronic continuous exposure with no unexposed
  time are the right three failure modes), and its Petersen 2016 citation is
  confirmed. Nothing was changed there.
- **390 / 768 / 1024 / 1440 px**: no horizontal overflow at any of them.
- **"Clear all"** already restored each select's *authored* default rather than
  `selectedIndex = 0`, and restores `defaultValue` for text and textareas. That
  earlier fix is intact and was re-verified.
- `renderScheme` geometry is right: day 0 lands at the start of the first
  Exposure risk segment, the default strip spans -104 → +134, and the calendar
  anchor correctly moves day 0 to cohort entry with a negative baseline block.

#### Open, examined this run, deliberately left

Ranked. The first two are the highest-value things left in this file.

- **The protocol never says what the IRR is, or is not.** Nothing states that it
  is a within-person relative incidence estimated in cases only, that no absolute
  risk or risk difference is estimable without an external denominator, and that
  it is **not** interchangeable with a cohort hazard ratio — while section 8 of
  the same site pools SCCS IRRs with other designs' estimates. The headline
  number goes out unqualified. This is prose, not a feature, and is the cheapest
  large win left.
- **`ProtocolCommon`'s "Study size and feasibility" paragraph is a cohort power
  calculation.** "Power is assessed per data source … the study targets ≥ 80%
  power to detect the smallest clinically important effect at a two-sided α =
  0.05" — but nothing in this form collects a smallest clinically important
  effect, an expected IRR, a case count or an exposed-time fraction, and SCCS
  power depends on the number of *cases* and the proportion of observation time
  that is exposed, not on a two-arm α/power. **Left because it is shared by all
  nine builders** and the brief already records the ProtocolCommon tail as
  cross-cutting; a per-page `skip: ["studySize"]` would make the nine
  inconsistent. Worth doing deliberately, across the set.
- **The Farrington event-dependent *exposure* sensitivity item.** The default
  list offers "Method of Farrington for event-dependent exposure (SCCS-EDE)"
  while the only Farrington method the protocol cites is the JASA 2011
  event-dependent *observation periods* paper — a different problem with
  different methods. **Left because the brief records that Daniel asked for this
  item to be left for now**; recorded here because a reviewer reached the same
  conclusion independently, which strengthens the case whenever he revisits it.
- **The "AsPEN" attribution on Wang 2021 is unverified.** The page calls it "the
  AsPEN antipsychotic-falls series" and "AsPEN exemplar" in the header and in
  assumption 1's `check` string, which is exported into every protocol. The
  paper's *content* is confirmed (14-day pretreatment window, pretreatment IRR
  6.17, the authors' reading of it as underlying disease); every snippet found
  describes it as a single-country Taiwan NHIRD analysis, and no AsPEN
  affiliation could be confirmed either way. The phenotype-library entry was
  reworded to "a Taiwan NHIRD self-controlled case series", which the title and
  author affiliations support. **The header and assumption strings were left
  alone: this is a lead, not a finding**, and the brief is explicit that
  attributions are not rewritten on a reviewer's recollection.
- **Multiple exposure episodes are never addressed.** The form defines
  days-of-supply plus a grace period, which generates *many* episodes per person,
  but the strip, the diagram and section 6 all describe exactly one. Nothing says
  whether risk windows from successive dispensings are pooled, treated as
  recurrent, or truncated when they overlap — and the diagram cannot show it.
- **Cases that contribute nothing to the likelihood.** A case with no unexposed
  (or no exposed) time drops out of the conditional likelihood entirely. The
  protocol never says so, never estimates how many, and the flow diagram does not
  account for them.
- **Other missing pre-specifications a referee would ask for**: an SCCS-specific
  sample-size statement; whether age is a factor and what happens to sparse
  bands; a small-cell/disclosure rule and what a site does when the model will
  not fit (separation, zero events in a window); multiplicity across four default
  subgroups × five default sensitivity analyses × N sites; missing data (STROBE
  item 12 asks and the form has no field); and a negative-control outcome that
  names no outcome and no decision rule ("should show null" is not falsifiable
  as written).
- **`pcOf.data` ignores `sitesOther`**, so a study run entirely at hand-typed
  sites has an abstract reading "multi-national AsPEN data sources".
- **`ProtocolCommon`'s `defaultOutputs` uses cohort language for a case series** —
  "Participant-flow diagram (source population → analytic cohort…)" — and this
  page's own `plannedOutputs` adds "Case-selection flow diagram", so the planned
  outputs list two flow diagrams. Cross-cutting; not fixable from this page
  without making the nine builders inconsistent.
- **The checks panel does not sort by level**, so a ⛔ can appear below a ⚠. Pre-existing;
  cosmetic, but the blocker is the one to read first.
- **`riskWindowDef`'s "Entire exposure episode" is data-driven** (days of supply +
  grace) while the strip is a fixed length. The new contradiction check
  deliberately stays silent there, treating the strip as a schematic — which is
  defensible but means the one default combination is never questioned.


#### Round two: the reviewer was pointed at this run's own commits

The prompt's two-reviewer method earned its keep in the same way the fifth run
recorded, and it is worth stating as a rule: **after you ship, send a reviewer
back at your own diff, not at the code you replaced.** The methodologist's
sharpest finding in its second round was a bug this run had introduced, and it
was worse than several it had inherited.

- ~~**A `stop` that could never be cleared, and became false.**~~ `staleSelects`
  was reset only inside `writeForm`, which runs at restore. So after the user did
  exactly what the new check told them to — pick a real design variant — §8 went
  on saying "SCCS variant was saved as nested-case-control … it has been left at
  Standard SCCS" while §5 of the same document said "Active-comparator
  within-person SCCS". It survived "Clear all" and travelled into the Word
  protocol and STROBE item 19. **A blocker nobody can dismiss is precisely what
  teaches people to ignore the panel** — the thing these checks exist to avoid.
  Cleared per-control on `change`/`input`, and emptied by `doReset`.
- ~~**Zero blocked only one side of the ratio.**~~ Zero-length *exposure* was a
  stop; every Reference segment at zero got "ℹ a legitimate way to say no such
  window". But that strip has no unexposed person-time — no denominator — which
  is the condition the structural "No reference (baseline) period" stop already
  existed for, reached numerically. Both sides block now; the info is kept for
  pre/post/washout/custom, where zero genuinely does mean "no such window".
- ~~**A strip with no exposure segment said nothing at all.**~~ Day 0 *is* the
  first exposure segment's start, so a Reference-only strip drew an "Exposure
  start (day 0)" anchor and wrote "Time zero (day 0): each case's own first
  exposure" into the Word window list — describing an exposure that does not
  exist. Now a stop, and the list says "the start of the strip" when there is no
  anchor.
- ~~**A zero-day look-back drew a bar.**~~ The parser this run replaced carried
  the invariant in its own comment — "a '0 d' look-back can't be drawn as a
  visible bar" — and dropping the clamp dropped the guarantee. **When you replace
  a coercion, read what the coercion was guaranteeing.**
- ~~**The Word window list omitted the calendar baseline block**~~, so a
  calendar-anchored protocol carried a picture starting at day −730 beside a
  written list starting at day 0 — and that list is the only part a text-reading
  checker sees.
- ~~**The legend advertised colours that were not drawn**~~ (pre/post were
  unconditional). The same inconsistency this run had just fixed for washout,
  still live for the other four.
- ~~**The refusal note asked for the impossible.**~~ When a length cannot be read
  there is deliberately no diagram on screen, but `DesignDiagram`'s stock note
  says "please paste a screenshot of the on-screen diagram here". The page writes
  its own note now. **Trap for reuse: that stock wording is fine for a rendering
  failure and wrong for a principled refusal.**
- ~~**The citation-pruning rule was wrong in both directions.**~~ Searching four
  fields for the phenotype name as a substring meant rewording the outcome
  ("Myocardial infarction (MI)" → "Acute myocardial infarction") **deleted** the
  validation reference silently, while naming MI as an inclusion criterion
  ("Hip fracture in patients with prior myocardial infarction") **revived** an MI
  outcome-validation study into a hip-fracture protocol — the same bug from the
  other side. Citations are keyed by the **field** the name was written into now,
  so a second pick evicts the first deterministically; and because neither
  dropping nor keeping is safe in silence, a lapsed entry is withheld **and**
  reported.
- ~~**Two wording errors, one substantive.**~~ The first-event note said to allow
  all events "and see whether the interval widens" — backwards: under clustering
  it is the all-events interval that is too narrow and the first-event analysis
  that is conservative. And "washout time is *normally* removed from the
  likelihood" overstated a literature in which both treatments appear.
- ~~**A `|` in a table cell split the Markdown row.**~~ Typing
  "ATC N05A* | excluding N05AN01" in the code set emitted a three-cell row
  against a two-column header; GFM drops the cells past the header width, so the
  Markdown silently lost "excluding N05AN01" while the `.docx` kept it — **the
  two exported documents specified different code sets for the same study.**
  Period names can contain a "|" too now that the parser splits on the last one.
  Escaped by `tc()` in every Markdown table cell. (Same defect as
  descriptive-analysis. Note for the record: this landed inside the commit
  "fixes for this run's own defects", whose message does not mention it.)
- ~~**`lcFirst` lower-cased acronyms**~~ — "SCCS conditional Poisson" became
  "sCCS" in the abstract. Found by re-reading the run's own diff, not by a
  reviewer.
- **The estimand sentence** the reviewer insisted on was taken: `pcOf.limitations`
  now states the IRR is a within-person relative incidence from cases only, not
  an absolute risk, and **not interchangeable with a cohort hazard ratio**.

#### What the reviewers disagreed about, and who was right

- **The methodologist filed two retractions, and both are instructive.** It
  nearly reported "the Word diagram fix does not work" as its top finding — its
  harness stubbed `URL.createObjectURL` to capture the docx Blob, and `svgToPng`
  calls the *same* API to hand the serialised SVG to an `<img>`, so the stub fed
  it a dead URL and every export reported the figure missing. **If you stub
  `createObjectURL` on this site, delegate for non-docx callers.** It also
  withdrew its round-one "drag behaviour clean" as never actually executed.
- **It was right that `page.mouse` cannot reach the drag handles, and wrong about
  why** — it concluded `elementFromPoint` returns nothing because the diagram is
  ~5,400 px down the page; the orchestrator had already established the same
  symptom on the *pre-change* build, which is what proved it was the harness and
  not a regression. Dispatching real `PointerEvent`s works and was used to verify
  that a drag writes to the correct row.
- **On the ≥80% power claim in `ProtocolCommon` the reviewer pressed and the
  orchestrator held.** Its argument is good — the sentence is not merely generic
  but *wrong in kind* for SCCS, and `pcOf` already passes `skip: ["ethics"]`, so
  `skip: ["ethics", "studySize"]` is a one-line local mitigation. It was left
  anyway, because removing the section from one builder of nine makes the set
  inconsistent and the replacement paragraph is a real piece of design. **This is
  the strongest single argument for doing the ProtocolCommon tail deliberately,
  across all nine, and it is the best-evidenced item left in this brief.**
- **On the Farrington event-dependent-*exposure* item the reviewer's stronger
  claim was declined**: it argued that leaving the item is defensible but leaving
  it *ticked by default* is not, since every untouched export then pre-specifies a
  named method whose only nearby citation is the observation-period paper. That
  is persuasive, but the brief records that **Daniel asked for this item to be
  left**, and a default he chose is not an agent's to flip. Recorded for him.
- **The reviewer withdrew its covariate-look-back finding** once the prose fix
  landed, and said so explicitly rather than leaving it on the list.
- **Its "0-30 is silent by luck, not by reason"** is right and worth keeping in
  mind: that check agrees only because the authored default exposure segment
  happens to be 30 days. Agreement is still agreement, so the silence is correct
  — but the reasoning is coincidental and a future default change would need it
  re-checked.

#### An honest gap in this run's method

**Only one of the two reviewers ever reported.** The applied-analyst reviewer ran
for the whole session and produced nothing, including after being asked
explicitly to stop digging and return whatever it had already executed. So the
"two epidemiologists who disagree" method ran, in practice, as one methodologist
plus the orchestrator — and the disagreements recorded above are between those
two, not between the two briefs the prompt describes.

That matters for what is *not* covered here. The applied reviewer had been given
the areas the methodologist was not: `SitesPicker`, the library modal's
behaviour, the Markdown-vs-`.docx` divergence, and layout at 390 px. Of those the
orchestrator checked the Markdown/`.docx` divergence (a `|` in a code set emitted
a three-cell row against a two-column header, so the Markdown silently lost half
the code set while the `.docx` kept it — fixed, `tc()`) and the viewports
(390/768/1024/1440, all clean). **`SitesPicker` and the library modal on this
page were not independently reviewed by anyone.** Treat them as unexamined.

Practical note for the next run: give a subagent a deadline in its opening brief
("report at N minutes with whatever you have executed, even if incomplete"),
rather than trying to extract a report from it later. A reviewer that returns
nothing costs the whole run its second perspective.

### Found 2026-08-22 by an eleventh run — case-crossover, the last big never-opened builder

Ten runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control, clone-censor-weight, descriptive-analysis and SCCS. This one
rotated to **`src/pages/tools/case-crossover.astro`** (1272 lines, never
opened). Two reviewers ran concurrently with genuinely different briefs, both
with a 45-minute deadline in their opening prompt — **and both reported**, which
is the first time in three runs. The deadline instruction the tenth run
recommended works; keep using it.

The focus chosen was **the window scheme**, because in a case-crossover the
hazard and referent windows *are* the estimand: the odds ratio is the contrast
between exposure in one and exposure in the others. A window length is not a
presentational detail here any more than it is in SCCS.

#### Environment: nothing newly blocked

- `npm i --no-package-lock --no-audit --fund=false`, `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org blocked with
  `WebSearch` only, the live site unreachable — all still true. **Nothing here
  was checked against `danielhttsai.github.io`.**
- The session was on a **detached HEAD** again. `git push origin HEAD:main`.
- Ports: orchestrator 8123/8124, reviewers 8121/8122/8131. Assign them up front.
- A reusable harness is in this run's scratch: `harness.mjs` (static server,
  CJS-safe Playwright import, the `docx` CDN route, and a `URL.createObjectURL`
  stub that **delegates for `image/*`** so `svgToPng` still works — the tenth
  run's trap, avoided by construction), plus `t1`…`t4` driving the page.

#### Fixed this run

All executed in Chromium against a local build, before and after. Every export
claim was asserted by unzipping a generated `.docx` and reading
`word/document.xml`, never inferred.

- ~~**Every window length was clamped, and `1e3` meant one day.**~~ The house
  `parseInt` family, in the four numbers that define the estimand. `ccoGeom`
  read all of them with `Math.max(1, parseInt(x) || 1)`. **This one is reachable
  by typing, not only by a stale draft**: `input[type=number]` accepts `1e3` as
  a valid floating-point literal, so Chromium keeps `1e3` in the box, reports
  `validity.valid === true` and `valueAsNumber === 1000`, while `parseInt` stops
  at the "e" and returns 1. A thousand-day hazard window exported as
  "day −1 (1 d)" with the field still showing 1e3 beside it. `7.5` → 7; `0` and
  blank → 1; a blank offset → L+g, placing the first referent window against the
  hazard window with no gap and no mention; an offset of `1e3` → 1, putting all
  three referent windows on top of the hazard window — the same person-time on
  both sides of the contrast. Tri-state now (`DAYS_RE`/`readDays`, the ACNU
  idiom): a number, deliberately blank, or unreadable. Nothing is drawn, and
  sections 5 and 6 of both documents say the scheme is unspecified.
- ~~**The variant menu and the window geometry were independent.**~~ Reviewer
  A's top finding and the orchestrator's #1, found independently. `ccoGeom`
  never read `ccoVariant`, so the fixed-offset scheme was printed in §6, the
  diagram and STROBE item 5 whatever was chosen in §7. Selecting "Symmetric
  bidirectional; controls before AND after event" exported that sentence
  directly above a table listing three referent windows at days −66, −126 and
  −186, every one before the event; selecting time-stratified exported a
  fixed-offset table, which is exactly what time-stratified referent selection
  is not (it partitions the study period into calendar strata and draws
  referents from the case's own stratum, before and after, not at a fixed
  offset — which is the whole mechanism that makes it trend-robust). **The
  builder has no field for what those two variants need, so it says what is
  missing and where the answer goes rather than inventing geometry.** Note
  Reviewer A's sharpest supporting detail: the page's own CCTC exemplar
  (Huang 2023) used *randomly selected* 30-day referent periods from days −61 to
  −180, so even the cited exemplar contradicts the geometry exported under its
  name.
- ~~**"Interpreted as incidence rate ratio under the rare-disease
  assumption."**~~ The exported default for the effect measure, and wrong in a
  way a methods referee catches on sight. A case-crossover samples referent
  person-time from the case's own past — incidence-density sampling — under
  which the exposure odds ratio estimates the rate ratio **directly, with no
  rarity assumption**. Rarity is what cumulative-incidence sampling needs.
  Assumption 2's title carried the same error ("abrupt in onset, **and
  uncommon**") while this page's own library offers *falls*, which is not rare —
  so a student was told to refuse a design that is fine.
- ~~**Nothing said what the OR is not.**~~ Now stated in the abstract's
  limitations, §8 and STROBE item 19: a within-person contrast computed in cases
  only, carrying no information about absolute risk, **not interchangeable with
  a cohort hazard ratio** — while §8 of every protocol on this site pools site
  estimates and the sibling builders emit hazard ratios and SCCS rate ratios.
  The SCCS builder already carried its equivalent sentence; this is the second.
- ~~**A stale draft blanked four `<select>`s and both exports answered for
  them.**~~ The brief's standing item, live here, executed end to end by
  Reviewer B with `.docx` evidence. **`nControls` makes this worse than the
  usual version**: a blanked select exported ONE referent window where the
  page's default is three, so a stale draft did not restore the default, it
  quietly specified a different design. Captured at restore (the value is
  unrecoverable afterwards), named in the panel and both exports, cleared **per
  control** on change and by `doReset` — the tenth run's lesson about a blocker
  that outlives its own fix.
- ~~**Two checks existed only on screen.**~~ The sharper says, in effect, "do
  not use bidirectional referents for dispensed medicines"; a protocol exported
  with that variant carried §7 naming it with no trace of the objection.
  `checksOf()` is computed once now and painted into the panel, both exports and
  STROBE item 19 (the CCW `blockers()` pattern).
- ~~**The phenotype library's `validation` strings were hidden and
  auto-appended to the reference list.**~~ The code comment admitted it. Two of
  the eight were wrong about the record they named — the self-harm entry's
  PMID 39241791 (Luo H et al, a prescribing-trends paper; **fifth independent
  agreement across runs on this one PMID**) and the GI-bleeding entry's
  Andersen/Pratt PDS 2013 (the AsPEN network *description* paper). Both removed,
  neither replaced. Four more said nothing lookup-able. `validation` (a study
  that measured the definition's accuracy — the only thing reaching the
  reference list) is split from `provenance` (a "used in" note, shown, never
  numbered), both are shown **in the modal at the moment of picking**, an entry
  with no validation says so, and the two survivors say they validated ICD-9-CM
  while the code sets shown are ICD-10.
- ~~**`pickedCitations` was never pruned**~~ (standing item, third builder).
  Keyed by the field the pick writes into now, so a second pick evicts the
  first; entries saved under the old name-keyed scheme are dropped on load
  rather than carried into every future protocol.
- ~~**A space passed the Word export's fallback test.**~~ The Markdown trimmed
  (`orFb`) and the `.docx` tested `s.x || fb`. Three spaces in the title
  produced a Markdown protocol headed "(Untitled…)" and a `.docx` opening on an
  empty bold heading: two documents disagreeing about whether the study had a
  title. The fallback *prose* had also drifted between the two exports and is
  one copy (`FB`) now.
- ~~**The Word protocol shipped without the design diagram**~~ (HARPER 7.2, and
  a standing brief item). Added, verified by unzipping — `word/media` carries
  two images with the figure, one without. **The exact inclusive spans are
  substituted for `fig.lines`**, because the shared helper's `fmtDay` rounds −60
  to "−2mo" and a 7-day referent window came out as "day −66d to −2mo".
- ~~**A check's level was decided by matching its own prose**~~
  (`/allowed, but/.test(i) ? "info" : "stop"`) — the species the brief names.
  Each issue carries its level now, and the panel sorts blockers above warnings.
- ~~**Markdown table cells were unescaped**~~ — `ATC M01A* | excluding M01AX`
  emitted a three-cell row against a two-column header and GFM drops the
  overflow, so the two exported documents specified different exposures. `tc()`
  + one `mdTable()`; §1, §4, §5 and §6 verified as 2-cell rows in the browser.
- ~~**The feasibility regexes were the third copy of the `\b( … )\b` defect.**~~
  "carcinoma", "malignancy", "tumours", "pregnancy", "gestational age",
  "echocardiogram", "angiography", "radiology", "genomics" and "deaths" all
  matched nothing; `labs` was again the one group written without the trailing
  `\b` and the one that worked. Mirrored from descriptive-analysis's vetted set
  rather than re-derived, including the `angio` → `angiograph` narrowing.
- ~~**Assumption 4 cited the wrong paper**~~ — Mittleman 1995 is about how many
  referent windows to use (relative efficiency), attached to a claim about
  window overlap and referent eligibility. Janes 2005, already in the reference
  list, is the paper that argues it. ~~**Assumption 3's remedy was
  overstated**~~: time stratification removes calendar-time trends, not a trend
  specific to the individual, which is the case its own plain line describes.
- ~~**Table 1 had identical columns by construction**~~ — `groupBy: "hazard vs
  control window"` in a design where the same person contributes both. By site
  now, exactly as SCCS was fixed.
- ~~**The STROBE covering sentence was false in both directions**~~ — "Methods
  items are pre-filled; Results / Discussion items are placeholders" while items
  17, 19 and 21 were pre-filled and Methods item 10 was not. Counted now.

#### Checked and clean (do not re-derive)

- **The four `ASSUMPTIONS` are otherwise sound.** Assumption 1 (transient
  exposure, and only exposure-discordant cases contributing to the conditional
  likelihood) and assumption 4 (non-overlapping windows, eligible person-time,
  structural zeros from enrolment / marketing date / age band, immeasurable
  in-hospital time) are correct as written and were read against the design's
  requirements by the methodologist.
- **The window arithmetic is right.** Hazard = −(g+L−1) … −g and control k =
  −(k·off+C−1) … −(k·off) match the stated inclusive-day convention; the
  hazard-overlap test (`off ≤ g+L−1`) and the control-overlap test (`off < C`)
  were both re-derived and are correct.
- **`strobeWhere()`'s keys are clean.** All twelve match real item numbers in
  `src/data/strobe.ts`; the unmapped items fall through to a placeholder, which
  is right for a protocol. No key drift.
- **The three `<select>` lookup maps** (variant, meta, arch) match their option
  lists exactly, in all three of `buildMarkdown`, `buildDocx` and `strobeWhere`.
  The copy-paste drift this codebase keeps getting caught by is **not** present.
- **Both library buttons' `data-target-*` resolve to real fields.** The ACNU
  name-only-button bug is not here. `exposures` entries carry only `{name,
  codes}` — no definition, no validation — so the missing `data-target-def` on
  that button drops nothing.
- **"Clear all" was already right**: `defaultValue` / `defaultChecked` /
  `defaultSelected`, citations cleared, the timeline preset reapplied, and it
  survives a reload.
- **This is one of the two builders that DO mount `PC.mountAmendments`.**
- **390 / 768 / 1024 / 1440 px**: no horizontal overflow at any of them.
- **Citations confirmed from search records, unchanged**: Mittleman/Maclure/
  Robins AJE 1995;142(1):91-8 (PMID 7785679); Janes/Sheppard/Lumley Epidemiology
  2005;16(6):717-26; Suissa Epidemiology 1995;6(3):248-53 (PMID 7619931); Wang
  S, Linkletter, Maclure, Dore, Mor, Buka, Wellenius Epidemiology
  2011;22(4):568-74 (full author list matched); Huang WC…Lai ECC BMJ 2023
  e076045 (**volume "382" appeared in no snippet — unconfirmed**); Hsieh CY
  Clin Epidemiol 2019;11:349-358; Shao SC PDS 2019;28(5):593-600; Cheng CL
  J Epidemiol 2014;24(6) (PMID 25174915, pages unconfirmed); Cheng CL PDS
  2011;20(3):236-42 (PMID 21351304); Hsieh CY JFMA 2015;114(3):254-9 (PMID
  24140108); Wang GH BMJ 2021 (PMID 34503972). **Search-snippet evidence, not a
  Crossref check.** Maclure 1991 was not separately searched. **No citation
  text was rewritten** — the orchestrator drafted fuller author lists and titles
  for three of them from memory and reverted every one, because only the
  journal / year / volume / issue / PMID had been confirmed. Do not upgrade a
  citation on a recollection; that is how this repo got a fabricated reference.

#### Open, examined this run, deliberately left

Ranked. The first is the highest-value thing left in this file.

- **Carry-over and persistent use are invisible, and they are the practical
  killer.** The default exposure rule is "Any dispensing within the window
  counts as exposed" with 7-day windows spaced 60 days apart, while 28/30/90-day
  supplies dominate Asian claims data. A person on a 90-day supply is exposed in
  every window or none — non-discordant, contributing nothing to the conditional
  likelihood — so with a dispensing-date rule and a short window you are not
  measuring *being on the drug*, you are measuring *refill timing*, and the
  estimate rests on the irregular-refill minority. Nothing on the page
  distinguishes dispensing-date from days-supply exposure and no assumption
  mentions carry-over. Assumption 1 gets close but frames it as "consider
  another design" rather than "state which of the two you mean". Reviewer A
  offered PMID 32548875 as a possible reference; **it was not read and is a
  lead, not a citation to add.**
- **The CCTC variant is named and never operationalised.** §7 and STROBE item 4
  assert `OR_CCTC = OR_case / OR_control`, and nothing anywhere defines the
  future-case control series: how future cases are identified, how their
  pseudo-index date is assigned, or the lag between a case's event and a
  control's. The variant caveat added this run says the same referent scheme
  applies to both series, which is true and not sufficient. A field for it is a
  feature, so it is Daniel's call; a check that fires when `cctc` is chosen and
  no control-series definition exists is not, and is the cheap half.
- **Reverse causation / protopathic bias is not an assumption.** Prodromal
  symptoms cause the dispensing; the 1-day default gap is a token nod, and only
  the CCTC option's helper text mentions it.
- **Fatal outcomes have no post-event time.** MI, ICH and self-harm are all in
  the library. Pick self-harm and the symmetric variant, or tick symmetric
  sampling as a sensitivity analysis, and the protocol asks for post-event
  exposure in decedents. The new bidirectional warnings fire, but neither knows
  the outcome may be fatal.
- **Recurrent events.** Every phenotype definition says "First hospitalisation…"
  and the design conditions on one event, but nothing states that only first
  events are analysed, and a recurrence inside a referent window makes that
  window ineligible person-time.
- **`ProtocolCommon`'s tail is wrong in kind for a case-only design**, again:
  "the study targets ≥ 80% power to detect the smallest clinically important
  effect at a two-sided α = 0.05" when case-crossover power depends on the
  number of exposure-discordant cases and the referent-window exposure
  prevalence; and its shared limitation "residual and unmeasured confounding
  cannot be excluded" undersells a self-matched design, where all time-invariant
  between-person confounding is removed **by construction** and only
  time-varying confounding remains. **This is now the third builder to record
  the same objection** (SCCS argued it hardest and the orchestrator held). It
  remains the best-evidenced item in this brief and it should be done
  deliberately across all nine, not locally in one.
- **`ProtocolCommon`'s amendments sentence.** "This is the original version of
  the protocol; no amendments have been made" — a positive claim about the
  study's history that the tool cannot check. Cross-cutting; unchanged since the
  third run.
- **Three ticked defaults still assert a study nobody specified**, in the ACNU /
  descriptive-analysis / CCW pattern: five sensitivity analyses and four
  subgroups ship ticked, "Country / site" is listed as a subgroup though site is
  the unit of the primary analysis and its meta-analysis, and "First-ever vs
  repeated exposure" appears as a ticked subgroup *and* a ticked sensitivity
  analysis in the same document. This run added checks that say what is wrong
  rather than changing what ships. **Defaults policy — Daniel's call.**
- **`SENSITIVITY[8]`, "Stratify by season to control for time-trends in
  exposure", is incoherent for this design**: each case's windows fall wherever
  they fall in the calendar and referents 60/120/180 days back already straddle
  seasons. What is meant is time-stratified referent selection, which is item 4.
  Unticked, so nothing exports it by default.
- **`SENSITIVITY[7]` is weaker than what §6 already requires** — "Exclude events
  within 30 days of cohort entry" against §6's hard requirement of continuous
  coverage back to the earliest referent window (day −186 on the defaults).
- **`shortDbName()`'s trailing-parenthetical bug** is present here too (this
  file has its own copy). Standing cross-cutting item; the id migration and the
  label have to be done together.
- **The site checkbox labels overflow their own border** — at 1024 px "Medical
  Data Vision (MDV) Database" measures 321/206, and the text crosses into the
  neighbouring column. Cosmetic, page-level layout is clean at every viewport.
- **Clicking a timeline preset overwrites custom milestones** with no
  confirmation and no undo. The button says what it does; low severity.

#### What the reviewers disagreed about, and who was right

- **The methodologist's first act was to attack this run's own uncommitted
  diff, and it was right to.** It read the tree mid-edit, found `ccoGeom`
  returning `issues` as objects while four consumers still did `"- " + i` and
  `.join(" ")` (three `[object Object]`s, one silently-wrong check level), and
  `spanTxt(G.haz)` unguarded on the new `haz: null` path. All four were closed
  before it reported, but the finding was correct at the moment it was made and
  the *class* is the one this brief keeps recording: **when you replace a
  coercion, the invariants the coercion was silently guaranteeing are gone.**
  Note its supporting detail — `renderScheme` is wrapped in a try/catch, so a
  throw there blanks the diagram with no error on screen. **Tell your reviewers
  the tree is moving and they will do this; it is worth the noise.**
- **The two reviewers converged on the bidirectional variant from opposite
  ends.** The methodologist noticed the page warns about a post-event window it
  never draws or exports; the applied analyst noticed the warning never leaves
  the screen. Neither had the other's half, and together they are one defect.
- **The applied analyst's whitespace finding was invisible to the
  methodologist** and vice versa: three of the run's fixes came from one list
  only. That is now five runs in a row where running the two briefs *genuinely
  differently* is what found the sharpest thing.
- **Reviewer A's "Multiple control windows is the primary analysis" was
  downgraded, not taken.** With three referent windows in the primary, ticking
  "multiple control windows (e.g., 4 control periods)" may legitimately mean
  "also try four" — it is ambiguous, not false. It ships ticked, so raising it
  as a warning would put a third amber mark on an untouched page. It is an ℹ
  asking for the number, and the two amber marks a fresh page shows were
  re-counted after the change.
- **Reviewer B's report that `nControls` was left on `parseInt` was correct**
  and was the one field the orchestrator's first pass missed — worth recording
  because it is the field whose reader looked *least* dangerous (a `<select>`
  can only hold 1–4) and was in fact the most, since a blanked select holds
  nothing at all.

#### A method note

Both reviewers were given a **hard deadline in their opening brief** ("report at
45 minutes with whatever you have executed"), which the tenth run recommended
after a reviewer ran the whole session and returned nothing. Both reported, in
time, with executed evidence. Do this every time.

The other thing that paid: telling each reviewer **explicitly** that the working
tree was moving under it and to re-read the file and mark each finding LIVE /
ALREADY FIXED before reporting. Both did, accurately, and one of them spent its
opening section on the orchestrator's own half-finished diff — which is the
single most valuable thing either of them produced.

#### Round two: the reviewer was pointed at this run's own commits

Same result the fifth and tenth runs recorded, and it is now three for three:
**after you ship, send a reviewer back at your own diff, not at the code you
replaced.** Seven executed findings, and the worst of them was worse than
several this run had inherited. All seven were fixed and each was re-executed.

- ~~**The new blocker survived exactly one page load.**~~ The commit is titled
  "a document must not answer for a field the form has lost" and `staleSelects`
  was the only record that a value had been dropped — its own comment said so.
  But `render()` runs immediately after restore and saves `readForm()`, the
  **substituted** state, back over the draft. First load: the red mark. Reload:
  the value is valid, the record is empty, and the export asserts "Standard
  (Maclure 1991)" as a deliberate choice. **The brief's own listed bug restored
  one reload later by the commit that named it.** Carried in the saved draft
  under a reserved key now. **General form: a check computed at restore is only
  as durable as the thing that saves the state afterwards.**
- ~~**A blocker nobody could dismiss.**~~ Made live by the fix above: a
  `<select>` fires no `change` event when you re-pick the option it is already
  showing, so a user who wanted the value it was left at had no action at all.
  It has a "Keep what it was left at" button. The tenth run's lesson, met from
  the other side — persisting a warning and making it answerable are one change.
- ~~**Every section cross-reference was right in exactly one of the two places
  the new shared checks render.**~~ The form is numbered 6 Hazard / 7 Control /
  8 Variant; the exported protocol 5 Hazard / 6 Control / 7 Variant / 8
  Assumptions. "Pick a variant under section 8" is right on screen and points at
  the assumptions in the document, and it fires on the **default** page, so
  every default export carried it. **A string rendered into both the form and
  the export cannot name a section number.** This is the cost of the
  compute-once-render-everywhere pattern the brief otherwise recommends, and it
  is worth checking in the four builders that already use it.
- ~~**The new adjacency warning stated the geometry backwards.**~~ Hazard days
  −7…−1 with offset 8 puts control 1 at days −14…−8: it ends the day before the
  hazard window begins, and the note said it begins where the hazard window
  ends. Inverted against the page's own "End anchor: Day −1" vocabulary.
- ~~**One newline instead of two.**~~ GFM continues a table until a blank line,
  so §6's continuous-coverage requirement became a fifth row of the table above
  it — in the Markdown only, while the `.docx` had it as a paragraph. **Check
  this whenever a literal Markdown table is replaced by a builder function.**
- ~~**STROBE item 19 kept the rarity assumption the same commit removed
  everywhere else**~~, so the protocol and the checklist, from one untouched
  form, disagreed about whether the design needs a rare outcome. It was also
  inlining every check in full — 2,400 characters in one table cell.
- ~~**The citation re-keying did not close the hole it was written for.**~~
  Keyed by the definition textarea, a second library pick evicted the first —
  but hand-editing did not. Pick MI, then type hip fracture over the name, the
  definition and the codes, and the MI validation study stayed in the reference
  list for an outcome appearing nowhere else: the exact sentence the fix claimed
  to prevent, reached by the ordinary workflow. Keyed to the field carrying the
  phenotype's **name** now, with the name stored beside the citation; a lapsed
  citation is withheld **and** reported. Equality, not substring matching —
  SCCS was caught by substring matching in both directions at once.
- ~~**A refusal that gave a false reason.**~~ `DAYS_RE` has no sign, so a gap of
  −3 was refused as "not a whole number of days". It is one; it is negative.

What the reviewer verified as working, so a future run need not re-derive it:
all four drag handles drive the form under real `PointerEvent`s and are removed
with the diagram in the refusing state, so `onEdit`'s null `cur.g`/`cur.off` is
unreachable; the refusing-state `.docx` builds, carries the refusal, contains no
day index anywhere and holds the logo only in `word/media` while a healthy
export embeds a 66 KB figure with the exact spans; `checksOf` throws nowhere;
the citation prune keys match the write-side keys.

**A note on the reviewer's own method.** It reported one finding as a LEAD
because its test dispatched a synthetic `change` event, which cleared the
blocker where a real re-pick would not — and said so rather than reporting it as
executed. That honesty is what made the finding usable: it was reasoned from the
DOM spec, it was right, and it became live only after the fix above.

### Found 2026-08-23 by a twelfth run — sequential trial emulation, and the hub card that routes to it

Eleven runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control, clone-censor-weight, descriptive-analysis, SCCS and
case-crossover. **Three builders had still never been opened**:
`sequential-trial`, `interrupted-time-series` and `trend-in-trend` (`git log
--` on each shows only the initial import). This run took
**`src/pages/tools/sequential-trial.astro`** (773 lines) plus the ST card in
`protocol-generator.astro`, on the grounds that target-trial emulation is the
most used framework of the three and the hub card is what every user reads
first.

Two reviewers ran concurrently with genuinely different briefs and a 45-minute
deadline; both reported, on time, with executed evidence. The deadline
instruction works — keep using it. A third reviewer was then sent at this run's
own two commits.

#### Environment: nothing newly blocked, three notes

- `npm i --no-package-lock --no-audit --fund=false`, `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org blocked with
  `WebSearch` only, the live site unreachable — all still true. **Nothing here
  was checked against `danielhttsai.github.io`**; the deploy was confirmed green
  via the Actions API instead.
- Detached HEAD again. `git push origin HEAD:main`.
- **A `.docx` escapes apostrophes as `&apos;` even after you strip the tags.** A
  regex containing a literal `'` will report your own text as missing. That cost
  this run one false alarm on a fix that was working; it was caught by dumping
  the surrounding characters instead of trusting the boolean.
- Ports: orchestrator 8161/8162, reviewers 8141/8142, 8151/8152, round two
  8171/8172. Assign up front.
- A reusable `harness.mjs` is in this run's scratch: static server, CJS-safe
  Playwright import by absolute path, the `docx` CDN route, and an `armCapture`
  whose `URL.createObjectURL` stub **delegates for `image/*`** so `svgToPng`
  still works — the tenth run's trap, avoided by construction.

#### Fixed this run

All executed in Chromium against a local build, before and after; every export
claim asserted by unzipping a generated `.docx` and reading
`word/document.xml`, never inferred.

- ~~**A day count read three ways.**~~ The file opens with a comment promising
  "ONE reading of a day-count, shared by the protocol text, the diagram and the
  checks, so they cannot tell three different stories about the same box".
  `covLbText` was the single consumer that never used it. `covlookback = "-5"`
  gave a checks panel reading "the protocol prints (invalid) rather than
  guessing", a diagram with no look-back drawn, and §4 asserting "a covariate /
  eligibility look-back of **-5 days before each origin**" — which reached the
  Word design summary and **TARGET item 7a**. `"1e3"` printed verbatim beside a
  diagram drawn at 1000; `"365.7"` printed beside 366 under a note claiming the
  rounding applied "in the protocol and the diagram alike". **When a file
  declares a single reader, grep every consumer against it — one had escaped.**
- ~~**Unreadable ≠ zero, on the way OUT as well as in.**~~ The standing brief
  item from the third run, live here. `dayInt` coerced an unreadable
  per-covariate length to 0, so `Comedications | six months` became a covariate
  measured on the origin day alone, and `rowsJoin` wrote that 0 back over the
  textarea — the only copy — whenever a chip was clicked or a handle dragged.
  Rows now split on the **last** `|` (so `Sex (M|F)` keeps its name) and carry
  `{name, raw, days}` where `days` is a number, `null` or `NaN`.
- ~~**`parseInt`, again.**~~ The chip buttons seeded rows with
  `parseInt(covlookback) || 365`: two faults in one expression. A 1000-day
  look-back seeded a **one-day** row, and the fallback invented a year for
  anyone whose box was empty — including immediately after "Clear all", which
  blanks it and then promises "every number is now blank".
- ~~**A follow-up nobody set, drawn as five years.**~~ `Math.max(1,
  dayInt(s.futrial) || 1825)` gave the across-trials strip a `+5y` label beside
  prose reading "(not specified)" and a check asserting the diagram showed a
  placeholder — true of the top figure, false of the strip.
- ~~**A stale draft blanked three `<select>`s and the export answered for
  them.**~~ The brief's standing item, **executed in a browser here for the
  first time**. A draft naming `estimand: "per-protocol"`, `effect: "SDIFF"`,
  `interval: "fortnightly"` left all three at `selectedIndex = -1`, and a select
  with no selection contributes nothing to the form — so §3 asserted **monthly**
  origins, §9 read "The target estimand is the treatment effect", and §10 step 3
  said "run ITT and per-protocol variants" (the ternary's else-branch): **two
  different answers to one blanked field, neither the draft's**, with the checks
  panel silent. Captured before the first render saves over the draft, persisted
  **in** the draft under a reserved key, cleared per control, cleared by "Clear
  all", dismissible by a Keep button, and it travels into both exports and
  TARGET. See the trap below — the first version of this fix was wrong.
- ~~**Refusals that never left the screen.**~~ Nothing `computeChecks` produced
  reached any export. Errors and warnings are computed once and painted into the
  panel, the Markdown, the `.docx` and TARGET item 7h.
- ~~**No design diagram in the Word protocol** (HARPER 7.2).~~ This was the
  **only one of the nine builders exporting no figure at all** — `grep -l
  designDiagramFigure src/pages/tools/*.astro` returned the other eight. The
  page draws two figures, captions them, and `word/media` held the logo alone.
  Both embed now; `fig.lines` is nulled so the written description comes from
  the same readers as the prose, because the shared `fmtDay` rounds 350 days to
  "1y".
- ~~**Two mutually exclusive designs, shipped as simultaneous defaults.**~~
  Reviewer A's top finding, and the sharpest thing in the file. The assignment
  default said "patients initiating the comparator in that interval … form the
  control arm" — an **active-comparator** sequential trial, in which a patient is
  assigned at the one origin at which they initiate and enters exactly ONE
  trial. The enrolment default, **in the same exported document**, said "A
  patient may enrol in several consecutive trials until they are treated" — the
  **initiator-versus-not-yet-treated** design of Hernán 2008 / Danaei 2013, in
  which the control arm IS the untreated. Each deletes the other's control arm.
  Every argument the protocol then makes about re-use — non-independence, the
  bootstrap over patients, the refusal to meta-analyse, `pcOf.limitations` — is
  idle under the first design. All four cited papers are the second; the
  placeholders were the first; the hub's example ("Benzodiazepine **vs no use**
  in pregnancy") routes users to the second before they arrive. The page has no
  field that chooses, so it **names the fork and asks**. The three near-duplicate
  copies of every default sentence (Markdown / Word / TARGET) are one `DEF` now —
  that duplication is *why* they drifted into two designs.
- ~~**Proportional hazards certified on the wrong grounds.**~~ "Unlike the cloned
  design, the arms within one nested trial are different people, so proportional
  hazards is not violated by construction here", in the effect-measure helper
  text and again in the checks panel. Wrong mechanism (a cloned design breaks PH
  because the same clones occupy both arms until the grace period ends — shared
  identity is not what does it) and wrong conclusion (under ITT the arms
  converge as controls initiate, so the HR drifts to the null **by
  construction**, by the mechanism §9 already describes).
- ~~**Three surfaces named a different primary variance method.**~~ Header:
  "estimates are pooled with a patient-clustered robust variance". §10: the
  bootstrap over patients is the reference and the robust variance "the cheaper
  alternative". Hub `assumes`: "a variance clustered on the patient" — listed
  beside exchangeability and positivity, where an estimator is a category error.
- ~~**The hub's "Breaks when" named analyst mistakes, not design failures**~~ —
  and both were mistakes the builder already catches. Replaced with: eligibility
  that does not actually vary over time (the design collapses to a single-origin
  new-user study); within-trial positivity failure; confounders affected by
  earlier treatment (a baseline PS per origin is not enough — a g-method is).
- ~~**Competing risks appeared nowhere**~~ — no `competing`, `Fine-Gray` or
  `cause-specific` in the file — while the default follow-up censors at death and
  the default effect measure is a **survival difference plus RMST**. This is
  sharper here than the same item in ACNU, where the default was a Cox HR (=
  the cause-specific hazard, defensible): 1−KM censoring at death is not the
  cumulative incidence, and an RMST difference built that way is defined in a
  world where the competing event cannot happen. The seeded example is dementia
  in adults ≥ 50.
- Smaller, same species: a **default-ticked sensitivity analysis asked for an I²
  the checks panel warns on the same untouched page is meaningless here**; "the
  same machinery as a clone-censor-weight analysis" omitted that the arms being
  different people is exactly why this estimator needs IPTW **and** IPCW
  together; the pooled estimate is now described as the information-weighted
  average it is; what happens to a control's earlier records when they later
  initiate (kept under ITT, censored under PP) is stated; within-trial
  positivity diagnostics are a planned output; the RMST-horizon check fired for
  a blank τ but not an unreadable one; a window over fifty years is flagged
  rather than drawn as **−273972.6y**; `doReset` restores each select's authored
  default instead of `selectedIndex = 0`.

#### Checked and clean (do not re-derive)

- **`washout` and `futrial` are correct across the whole matrix** — `1e3`→1000,
  `-5`→refused, `7.5`→8 with a rounding note, `0`, blank, `99999999`: prose,
  both diagrams and the checks agree.
- **Number boxes cannot be poisoned by text.** Typing `365 days` or `one year`
  into `<input type=number>` with a real keyboard yields `"365"` / `""`.
- **`name=` ↔ `s.<x>` is clean** — all 24 control names are read by `readForm`.
- **`effect` has five options and `effectText` five keys; `estimand` three and
  three.** No fall-through to a `||` default.
- **Layout is clean at 390 / 768 / 1024 / 1440 px** (`scrollWidth ===
  clientWidth` at all four), measured twice.
- **Citations — all six `REFS` confirmed from search snippets**, author lists,
  volumes, issues, pages and DOIs matched: Hernán 2008 Epidemiology
  19(6):766-779; Danaei 2013 SMMR 22(1):70-96 (author list exact, including
  "García Rodríguez LA"); Gran 2010 Stat Med 29(26):2757-2768; Keogh 2023 Stat
  Med 42(13):2191-2225; Hernán & Robins 2016 AJE 183(8):758-764; Cashin 2025
  JAMA 334(12):1084-1093. **Search-snippet evidence, not a Crossref check. No
  citation text was changed.**
  - **One attribution is UNCONFIRMED and was left in place**: "Danaei et al.
    (2013) … described the resulting intervals as *conservative*". No snippet
    from Danaei 2013 says this. The *claim* is independently supported (Limozin,
    Seaman & Su, SMMR 2025 / arXiv:2407.08317: "The sandwich variance estimator
    is popular but conservative"), but the attribution needs journal access.
    Either verify it or drop the attribution and keep the claim.

#### Round two: the reviewer was pointed at this run's own commits

**Four for four.** After shipping, a third reviewer was given only this run's
diff and told to break it. Its sharpest finding was a bug this run had just
written, worse than several it had inherited. Seven executed findings, all
fixed and each re-executed. The pattern is now well enough established that it
should be treated as a required step, not an optional one.

- ~~**A check asserted a fact by ruling one value out.**~~ The new
  competing-risks check fired `if (s.effect !== "HR")`, true of `""` as well. A
  `?seed=` link carrying `effect: ""` produced a protocol whose §9 read "We
  report (not specified)" and whose first page read "An absolute contrast is
  selected". **The defect this run existed to remove, reintroduced by the fix
  for a different one.** General rule, and it belongs in the bug-class list:
  **never assert a positive fact about a `<select>` by ruling one value out —
  use a whitelist.** A blank estimand or effect measure now blocks; the
  stale-select machinery does not cover it, because it only fires for a value
  the page does not *offer*, and an empty string is not a value.
- ~~**A page-breaking stray identifier.**~~ Hoisting the figure descriptions out
  of `buildDocx` left the fragment `an` on a line of its own. **Trap worth
  knowing: `astro build` does not parse `is:inline` scripts, and neither does
  `new Function(src)` catch this** — a bare identifier is a valid expression
  statement, so it parses and throws a `ReferenceError` only when the code runs.
  A `new Function` check is still worth running (it caught a duplicate `const`
  in the same edit, which had killed the entire page's JS with a green build),
  but **only clicking the button in a browser finds the runtime case.**
- ~~**The last-`|` split ate a name when no day count followed it.**~~ This
  run's own claim that `Sex (M|F)` keeps its name held only when a number
  followed the pipe. `Sex (M|F)` alone became a covariate called "Sex (M" with
  an unreadable length "F)", and one chip click rewrote the textarea to
  `Sex (M | F)` — **the exact destruction the same commit set out to fix.**
  Every row keeps `line` (the user's text) now, is written back byte-for-byte
  when unreadable, and is quoted whole rather than split.
- ~~**A blocker stated something false on screen**~~ — "(…and that box is
  currently empty)" while the box read 365. Conditional now.
- ~~**Four places still asserted the design the previous commit had just
  stopped asserting**~~ — the abstract (`pcOf.analysis`), `pcOf.limitations`,
  TARGET item 7g, and **Figure 2's written description, added by this run**.
  Naming a fork in §§4-6 is worth little while four other strings answer it.
  **When you make a claim conditional, grep the whole file for the claim.**
- ~~**Making the checks travel changed their audience**~~ and three strings had
  not noticed: one named a section number that exists only in the export (the
  form is numbered 1-5, the protocol 1-13), one said "above" while rendering at
  the *top* of the document, one told the reader to press a button. The
  stale-select message has two renderings now, identical in substance.
- ~~**A judgement call, decided the reviewer's way.**~~ Promoting the
  proportional-hazards and competing-risks notes to `warn` put an amber banner
  above the abstract of **every** finished protocol the page can produce — no
  input clears them, since any effect measure fires one or the other. A warning
  nobody can answer is what teaches people to ignore the panel, which this run's
  own code comment said three lines above the code that did it. Both are `info`
  now and their substance is stated unconditionally in the protocol prose (§8
  competing risks, §9 proportional hazards), which is where it reaches the
  reader of the Word file anyway. **Measured: a fully completed protocol exports
  with 0 flagged bullets; an untouched one carries 6, all of them "you have not
  filled this in yet".**

#### What the reviewers disagreed about, and who was right

- **The two briefs split cleanly and neither could see the other's half.** The
  applied analyst closed with "the load-bearing gaps on this page are
  **transport**, not statistics: a stronger sentence about estimands that stays
  on screen is worth nothing to the person who receives the `.docx`". The
  methodologist's top finding was that the page shipped **two mutually
  exclusive designs**. Both were right about their own half and wrong to rank
  the other below it — transport a contradiction faithfully and you have
  faithfully transported a contradiction. Doing only one would have left the
  page broken in the other's terms.
- **The applied analyst predicted the methodologist would overstate "no target
  estimand is named"** (carried over from the ACNU brief entry). It did not —
  `estimand` is a real select here and §9/§10/TARGET 7f all read it. The
  prediction was sound and the item genuinely does not apply to this builder.
- **The methodologist predicted the applied analyst would re-report the chip
  `parseInt` and the `+5y` label as live.** It did, correctly labelling them
  ALREADY FIXED — it had executed them against the pre-diff build before the
  orchestrator's commit landed. Both reviewers handled the moving tree well
  because both were told explicitly that it was moving.
- **Both were wrong about `doReset`'s select fallback, in opposite ways.** The
  reviewer called it "vacuous" because `defaultSelected` is false for every
  option in this file, so `fallback` collapses to `options[0]` — identical to
  the `selectedIndex = 0` it replaced. That is true *today* and the point is
  that it stops being true the moment someone adds a `selected` attribute,
  which is the failure the brief already records from another builder. Left as
  written; recorded here so it is not "fixed" back.

#### Open, examined this run, deliberately left

- **`ProtocolCommon`'s tail is wrong in kind here too** — "the study targets
  ≥ 80% power to detect the smallest clinically important effect at a two-sided
  α = 0.05" for a design whose power depends on the number of trials, the
  overlap within each, and how fast controls initiate. **Fourth builder to
  record this objection.** It remains the best-evidenced item in this brief and
  should be done deliberately across all nine, not locally in one.
- **`ProtocolCommon`'s amendments sentence**, and **this builder does not call
  `PC.mountAmendments`** — seven of nine still do not. Cross-cutting, unchanged
  since the third run.
- **`shortDbName()`'s trailing-parenthetical bug** — this file has its own copy.
  Standing cross-cutting item; the id migration and the label must be done together.
- **Missing data are not mentioned anywhere** (2 hits, both parser messages).
  HARPER/TARGET reviewers expect a statement; STROBE item 12 asks for one.
- **The "conservative" attribution to Danaei 2013 is unconfirmed** — see the
  citations note above. Verify or drop the attribution and keep the claim.
- **Four subgroups and five sensitivity analyses ship ticked**, the ACNU /
  descriptive-analysis / CCW / case-crossover pattern. **Defaults policy —
  Daniel's call.**
- **There is still no field that chooses the control arm.** This run made the
  fork explicit in the prose and blocked on the eligibility rule, which is the
  cheap half. A `<select>` for it would let the page stop hedging in six
  places and would make the re-use machinery conditional on a real value rather
  than on a sentence the user typed — but that is a feature, so it is Daniel's
  call. **It is the highest-leverage one on this list.**
- **`interrupted-time-series.astro` and `trend-in-trend.astro` have still never
  been opened** — `git log --` on each shows only the initial import. They are
  the obvious next rotation. `trend-in-trend` looked carefully written on a
  read-through (tri-state estimator handling, a real refusal for a stale
  estimator, comments that name the bugs they fixed); `interrupted-time-series`
  overlaps the ITS statistics two runs have already gone deep on in RWE Studio,
  so knowledge transfers.

### Found 2026-08-23 by a thirteenth run — the ITS builder, second-to-last never-opened file

Twelve runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control, clone-censor-weight, descriptive-analysis, SCCS, case-crossover and
sequential-trial. Two builders had never been opened. This run took
**`src/pages/tools/interrupted-time-series.astro`** (715 lines) on the grounds
that the ITS statistics two runs went deep on in RWE Studio transfer directly,
and ITS is much the more used of the two designs. **`trend-in-trend.astro` is now
the last file in the set that has never been reviewed.**

Two reviewers ran concurrently on genuinely different briefs with a 40-minute
deadline; both reported on time with executed evidence. A third was then sent at
this run's own commits. The deadline instruction keeps working — keep using it.

#### Environment: nothing newly blocked, four notes

- `npm i --no-package-lock --no-audit --fund=false`, `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org blocked with
  `WebSearch` only, the live site unreachable, detached HEAD (`git push origin
  HEAD:main`) — all still true. The deploy was confirmed green via the Actions
  API instead of against `danielhttsai.github.io`.
- **R is NOT installed in this session's container.** The fourth run's
  `apt-get install r-base-core` note is about RWE Studio's generated R; nothing
  in this builder needs it, and no statistical claim here was executed in R.
  Where this run relies on simulated evidence it is the FIFTH run's, cited as
  such, not re-derived.
- Ports: reviewers 8141/8142 and 8151/8152, orchestrator 8161-8170, round two
  8171/8172. Assign up front.
- A reusable `harness.mjs` is in this run's scratch: static server, Playwright by
  absolute path, the `docx` CDN route, `setField`/`preview`/`checks` helpers, and
  an `armCapture` whose `URL.createObjectURL` stub delegates for `image/*` so
  `svgToPng` still works. `smoke.mjs`, `v3.mjs` (captures and unzips a real
  `.docx`) and `v5.mjs` (drives the checks matrix) are worked examples.
- The `<script is:inline>` block is a classic script, so `page.evaluate(() =>
  readPts('1e3'))` and `computeChecks(readForm())` reach its functions directly.
  That is by far the fastest way to test this file.

#### Fixed this run

All executed in Chromium against a local build, before and after; every export
claim asserted by unzipping a generated `.docx` and reading `word/document.xml`,
never inferred.

- ~~**One box, four different numbers.**~~ `prePoints = "1e3"` — which
  `<input type="number">` accepts without complaint — gave a protocol asserting
  "1e3 pre-intervention points", a caption quoting 1e3, a checks panel saying
  "Only **1**", and a drawing of **2**. The clamp disclosure, the one sentence
  that promises to say when the picture is not showing your number, stayed
  silent because it tested `parseInt("1e3") > 36`, which is `1 > 36`. One
  `readPts` now; `1e3` reads as 1000 (matching the other builders' day readers),
  a fractional count is refused, and the caption discloses both the 36-point
  clamp and the fallback-to-illustrative case.
- ~~**A blank count exported as 24, and silenced its own warning.**~~
  `readForm` had `V("prePoints") || "24"`. Emptying the box exported a protocol
  asserting 24 points **and** cleared the "aim for ≥ 8" bar, so the warning that
  would have queried it disappeared at the same moment.
- ~~**Zero pre-intervention points was a caution.**~~ With no pre-period there
  is no trend to extrapolate, so there is no counterfactual; it exported "0
  pre-intervention points" with no incomplete banner at all. A blocker now.
- ~~**A stale draft rewrote the whole analysis and destroyed itself.**~~ The
  brief's standing item, worst instance yet, because this page has **four**
  selects. A draft naming an unoffered time unit / model / seasonality /
  autocorrelation left all four at `selectedIndex = -1`; a select with no
  selection contributes nothing to `FormData`, so the export substituted
  monthly + Poisson + no seasonality + no autocorrelation handling, the checks
  panel reported the substitutions as facts ("No seasonality adjustment with
  **monthly** data" for a draft that never said monthly), no banner appeared,
  and the first render wrote the substitutions back over the draft — the user's
  values gone within a second of page load. Ported the twelfth run's machinery
  (record inside the draft under a reserved key, per-control clearing, a Keep
  button, two renderings for the two audiences).
- ~~**The warnings that decide whether the estimate means anything never left
  the screen.**~~ Only `missing()` travelled. A protocol with every field filled,
  monthly data, no seasonality adjustment and no autocorrelation handling
  exported as a clean, finished-looking document while the page showed both
  warnings in amber. Blockers and cautions now open both exports.
- ~~**§6 and §7 named two different primary estimands.**~~ Ticking Controlled
  ITS rewrote §6 ("the difference … is the primary estimate") and left
  `effectText` — a function of `s.model` alone — naming the undifferenced
  within-series changes in the section headed Estimand. Also wrong on scale (the
  group-by-segment interaction is a **ratio of rate ratios**, not an IRR) and on
  the counterfactual (§7 kept the intervention series' own extrapolated
  pre-trend, which is the object the control series exists to replace).
- ~~**A pre-specification of something the form cannot specify.**~~ §7 promised
  the difference from the counterfactual "at a pre-specified post-intervention
  time point"; every named control was enumerated and there is no horizon field.
  The contrast is linear in the change-in-slope coefficient, so without a horizon
  it is a family of estimands. The protocol fixes the end of the series, says
  why, and asks for any additional horizon to be named — which is also the only
  horizon RWE Studio can produce, as the form's own note two panels up said.
- ~~**The panel endorsed an estimator that is not defined for the model.**~~ No
  check read `model` against `autocorr`, so the default Poisson with
  Prais–Winsten exported a §6 naming a log link with an offset and a GLS
  quasi-differencing transform of a linear model in consecutive sentences, while
  the panel called it "a sound choice for this protocol". Refused now; ARIMA on
  counts flagged more softly (it can be made to mean something, but not what §6
  names). Prais–Winsten and Cochrane–Orcutt were also treated as synonyms — they
  differ in whether the first observation survives, which on these series
  lengths is one of the few pre-intervention points.
- ~~**Choosing Newey–West silenced the autocorrelation warning and said nothing
  in its place.**~~ The fifth run's simulated evidence (rejection ≈0.38 at 12
  periods, 0.21 at 24, 0.18 at 36; worse than model-based below ~60 even under
  AR(1)) says that at this builder's own default of 24 + 24, picking HAC
  produces the failure the warning it silenced was describing. Now caveated
  below 60 periods, with the wider-of-the-two rule the Studio itself uses, and
  the prose asks for the lag rule to be pre-specified.
- ~~**Seasonality exported as an unqualified assertion.**~~ "Harmonic (Fourier)
  terms" names neither cycle length nor number of pairs — the number of pairs
  trades directly against the change-in-slope coefficient, so it left that to be
  chosen after the data were seen. Calendar dummies were accepted with **yearly**
  periods, where every observation falls at the same point of the calendar year.
  And the "no seasonality" warning was written against three of the five options
  in the unit dropdown, so two fell through it silently — the copy-drift species.
  Rewritten as "which period lengths can resolve a within-year cycle", with the
  ones that cannot saying so.
- ~~**Nothing compared the model's size with the series length.**~~ The form has
  always collected both. Monthly dummies with three points either side is 15
  parameters against 6 observations, and the panel warned only that the segments
  were short. Blocker now, with the count shown; a thin-but-fittable model
  reports its residual degrees of freedom.
- ~~**The study-size paragraph was written for a person-level cohort.**~~
  "Power … from observed exposure and outcome frequencies", "person-time and
  event counts" — and in an uncontrolled ITS there is no exposure frequency,
  because after the date everyone is exposed. **Fifth builder to record this
  objection, and the first to close it without a cross-cutting change**:
  `tailSections` reads `nz(s.studySize, …)` for exactly this purpose and ACNU
  already passes `skip: ["studySize", "ethics"]`, so a builder-supplied
  paragraph is the house-sanctioned route. The new one prints the two numbers
  the form already collects and points at two published simulation methods.
- ~~**The corrigendum's year.**~~ Cited as `Int J Epidemiol 2020;50(3):1045`;
  volume 50 issue 3 of that journal is 2021 (search-snippet evidence from the
  OUP listing). Also: the parameterisation error the corrigendum exists because
  of had no citation until §4 began stating the coding — Xiao/Augusto/Wagenaar
  IJE 2021;50(3):1011-1015 (dyaa148) added.
- Smaller, same species: a named control series with the box unticked was
  dropped from every surface with nothing said (the check only ever fired the
  other way); the figure's written description asserted 60 points over a drawing
  of 36, because the clamp sentence never travelled; the `.docx` ran two
  sentences together whenever a denominator was supplied, because the full stop
  sat inside the `or()` fallback, while the Markdown read correctly; the two
  exports lower-cased the acronyms in their analysis plans ("newey–west …
  (hac)", "acf/pacf", "arima"); the Word statistical-analysis list had four
  steps where the Markdown had five; "every 6 months" read out as "aggregated
  into equal every 6 months intervals"; `doReset` set selects to
  `selectedIndex = 0` rather than their authored default; and the reference
  list, the seasonality label map and the autocorrelation label map were each
  two copies with different fallbacks — one of each now.

#### Checked and clean (do not re-derive)

- **The Wagner (2002) convention claim is defensible.** The panel's note ("0 at
  the first affected period, so the level-change coefficient IS the immediate
  step") was the assigned suspicion and survived: Wang et al. BMC Med Res
  Methodol 2025;25:98 says under Wagner's parametrization that coefficient
  "indicat[es] the change-in-level or immediate effect", and Xiao 2021 says the
  post-intervention segment should "begin by counting from zero". The arithmetic
  agrees. **Wagner 2002's own coding table could NOT be read — every publisher
  host is blocked — so this rests on two secondary sources via snippets.** The
  claim now also travels into both exports, which was the actual defect.
- **All six original citations confirmed from search snippets** (Wagner 2002
  JCPT 27(4):299-309 / PMID 12174032; Lopez Bernal 2017 IJE 46(1):348-355;
  Lopez Bernal 2018 IJE 47(6):2082-2093; Kontopantelis BMJ 2015;350:h2750 /
  PMID 26058820; Penfold & Zhang Acad Pediatr 2013;13(6 Suppl):S38-44 /
  PMID 24268083), one year corrected. **Snippet evidence, not a Crossref check.**
  The two new power references are snippet-confirmed the same way and are cited
  with the PMIDs actually observed rather than DOIs that were not.
- **Layout is clean at 390 / 768 / 1024 / 1440 px** (`scrollWidth ===
  clientWidth`), re-measured after the new and longer check messages were added.
- **Every `name=` in the form is read by `readForm`** (20 controls, checked).
- **Every `<select>` option is covered by every consuming map** — no
  fall-through to a `||` default in `modelText`, `seasonText`, `autocorrText`,
  `effectText` or the design-summary table.
- **The drag handles work** (a real mouse drag moves the count, the preview and
  the autosave agree), and **"Clear all" was already correct** for text inputs.
- **The claims this page makes about what RWE Studio implements are accurate**,
  checked against `rwe-studio.astro`'s current option list — including that its
  ITS now offers "the wider of the model-based and Newey–West standard error".

#### Round two: the reviewer was pointed at this run's own commits

**Five for five.** A third reviewer was given only this run's diff and told to
break it, and every one of its five findings was damage this run had done — two
of them worse than what they replaced. Treat this as a required step, not an
optional one; it is now 5/5 across five runs.

- ~~**Making the checks travel opened a Markdown injection.**~~ The messages
  quote what the user typed. The form's own inputs cannot contain a newline, but
  a saved draft or a `?seed=` link can, and a quoted message becomes a
  blockquote line — so a link carrying `unit: "X\n\n## 99. Forged section\n"`
  put a forged top-level heading and a free paragraph **between the banner and
  §1 of the exported protocol**. A shared link was enough; nothing in the
  recipient's browser had to be touched. The old code could not do this, because
  `missingMd()` only ever emitted fixed strings. **General rule: the moment a
  message containing user text starts travelling into a structured document,
  it needs flattening and a length cap.** The `.docx` was unaffected (it
  XML-escapes runs), which is exactly why checking only the `.docx` would have
  missed it.
- ~~**The estimand sentence had the scale exactly backwards.**~~ It said the
  group-by-segment interaction terms "on the log scale are ratios of rate ratios
  rather than rate ratios". On the log scale they are **differences of log rate
  ratios**; they are ratios of rate ratios once **exponentiated**. That shipped
  in both exports, inside the sentence this run rewrote *in order to get the
  scale right*.
- ~~**The estimand section still contradicted three other surfaces.**~~ The
  commit claimed to fix "two sections naming two different primary estimands",
  and made it 3-vs-1: the abstract, §1 and §6 all said "difference" while §7
  said "RATIO … rather than rate ratios". Both are true on different scales, but
  nothing said so. Naming the contrast a difference and the reported quantity
  its exponent reconciles all four. **When you rewrite one surface's wording,
  grep the other surfaces for the claim before calling it fixed** — the same
  lesson the twelfth run recorded, learned again.
- ~~**The counterfactual sentence denied what it had just said.**~~ "the
  intervention series' pre-intervention trend carried forward with the change
  the control series shows — **not its own extrapolated pre-trend**". The first
  clause *is* that trend, control-adjusted. A control series replaces the
  *assumption* that the pre-trend would have continued unchanged, not the trend,
  which is still fitted and still the baseline.
- ~~**The degrees-of-freedom guard's stated reason was half false.**~~ It said a
  model with as many parameters as observations "cannot be fitted" and that
  "nothing can be estimated". A square full-rank design estimates every
  coefficient **exactly**; what does not exist is the residual variance and
  therefore the standard errors. Two separate messages now. The reviewer
  independently confirmed the parameter arithmetic itself (4 / 8 segmented
  terms, `nObs = (pre+post) × 2` when controlled, 11 month / 3 quarter dummies,
  harmonic charged 2 as a stated lower bound) is **correct** — do not "fix" it.
- ~~**A true refusal with a false reason.**~~ `-5` was refused as a value that
  "could not be read as a whole number of periods". It reads perfectly well; it
  is negative.

Found by the orchestrator re-reading its own diff, before the reviewer reported:
three check messages written for a screen that now travelled into the document
("the draft **below**", "see the caveat **this panel** raises", "**Tick the
box**"), a `§6` hard-coded into a message that reaches both exports (**the Word
file drops "Intervention and interruption", so its sections are offset by one
from §5 on** — the step-3 strings got this right and a later message did not),
`readPts` accepting `0x10` as 16, and the stale-select guard exempting the empty
string, which is the single likeliest way a select ends up blank. **A sweep that
enumerates every message the code can emit and greps them for positional
language is cheap and worth doing whenever checks start travelling** — 40
distinct messages here, one bad one left after two manual passes.

#### The trap that cost this run the most

`astro build` does not parse `is:inline` scripts, and this file's script is one.
A regex literal was written with **literal U+2028 / U+2029 characters inside its
character class**. Those are line terminators in JavaScript source, so the
literal was broken across lines: `Invalid regular expression: missing /`, thrown
at runtime, with the build reporting success and the entire page's JavaScript
dead. Only loading the page in a browser found it. The eleventh and twelfth runs
recorded the same class (a stray identifier, a duplicate `const`); this is a new
member of it, and a `new Function(src)` check would **not** have caught it
either, since the source is only invalid once the line breaks are interpreted.
**Click the buttons in a browser after every edit to an `is:inline` script.**

#### What the reviewers disagreed about, and who was right

- **The two briefs split cleanly and neither could see the other's half, again.**
  The methodologist's top finding was that the panel called an undefined
  estimator "a sound choice" — a false statement in the exported document. The
  applied analyst's was that opening the page with a stale draft **destroyed the
  user's saved values within a second**, silently, and then described a study
  they had not specified. Neither would have found the other's: one is a claim
  about statistics, the other is a lifecycle bug with no wrong sentence in it.
  Both shipped.
- **The methodologist declined to propose the fix its own argument implied, and
  was overruled.** On the study-size paragraph it wrote "I side with the previous
  four reviewers on the content; I am not proposing a local `skip`", treating the
  disposition as settled against it. That deference was misplaced: the shared
  component reads `nz(s.studySize, …)` **specifically** so a builder can supply
  its own paragraph, and ACNU has passed `skip: ["studySize", "ethics"]` since
  before any of these runs. Using a documented per-builder hook is not the
  cross-cutting change previous reviewers were refused. **Five runs recorded this
  objection; it was closeable locally the whole time.** Worth checking, when an
  item has been deferred repeatedly, whether it was deferred for a reason that
  still applies.
- **A lead one reviewer could not execute, another executed.** The methodologist
  filed the blank-`<select>` fall-through as "lead, not a finding — `readForm`
  defaults `model` to `poisson` before `effectText` and I could not construct a
  reaching input". Round two constructed it: a `?seed=` link with all four select
  values as empty strings. The lead was right and the reason it could not be
  reached was wrong. **Do not discard a lead because one route into it is
  blocked.**
- **Both reviewers named their least-sure finding, and both were vindicated
  differently.** The methodologist's was the ARIMA half of its estimator
  finding — "some analysts legitimately fit ARIMA to log rates, so it may be
  shorthand rather than error". That is right, and it is why Prais-Winsten with a
  count model is a **blocker** here and ARIMA is only a **warning** asking which
  model is meant. Round two's least-sure was that the estimand sections still
  contradicted each other, "a specialist might not call it a contradiction at
  all" — it was correct, and the fix was to name the scale rather than to pick a
  side.
- **The Wagner (2002) attribution was checked twice, independently, and held.**
  The orchestrator and the methodologist searched separately, found the same two
  secondary sources, and reached the same verdict. Neither could read Wagner
  itself. Recorded as snippet evidence in both places, and the item that actually
  changed was that the claim never reached the exported document.

#### Open, examined this run, deliberately left

- **`ProtocolCommon`'s planned-outputs list is still wrong in kind here**, and
  unlike `studySize` it has **no per-builder override hook**: every ITS protocol
  promises a "Participant-flow diagram (source population → analytic cohort)"
  and a "Table 1 — baseline characteristics", for an analysis of an aggregated
  count series that has no participants and no analytic cohort. What ITS
  reporting actually needs — the coefficient table with the design-matrix
  coding, the ACF/PACF and Durbin–Watson diagnostics §8 promises, the
  counterfactual-difference table §7 promises — is absent. Fixing it means
  either a hook like `studySize`'s or `skip: ["outputs"]` plus a local list.
  **Cross-cutting; the same is true of `limitationsText`, which leads with
  person-level residual confounding for a design whose principal threat is a
  co-intervention.**
- **`PC.mountAmendments` is never called here** — seven of nine builders still
  do not, unchanged since the third run.
- **No horizon field.** This run made the horizon explicit and honest in prose;
  a `<select>` or text field for additional horizons is a feature, so Daniel's
  call.
- **Both "📚 Library" buttons drop the validated code set.** They set
  `data-target-name` only, and this page has no codes field at all, so picking
  from a modal headed "Validated phenotype library" writes the bare phenotype
  name and discards `item.codes`, `item.definition` and the validation citation.
  The user believes they took a validated definition. Same species as the third
  run's ACNU indication-button finding, but here it is the norm for both
  buttons, and closing it properly means adding a field (a feature).
- **Two subgroups and five sensitivity analyses ship ticked**, including
  "Exclude a transition / phase-in period" while the transition field is empty
  and RWE Studio cannot do it. **Defaults policy — Daniel's call**, the sixth
  builder to record it.
- **`trend-in-trend.astro` has never been opened** — `git log --` shows one
  cross-cutting commit and nothing else. It is the last one. A read-through
  suggests it is carefully written (tri-state estimator handling, a real refusal
  for a stale estimator), which is exactly what was said about this file too.

### Found 2026-08-23 by a fourteenth run — trend-in-trend, the last never-opened builder

Thirteen runs had worked ACNU (×3), RWE Studio (×2), the Protocol Checker,
case-control, clone-censor-weight, descriptive-analysis, SCCS, case-crossover,
sequential-trial and ITS. This run took **`src/pages/tools/trend-in-trend.astro`**
(651 lines), which `git log --` showed had one cross-cutting commit and no
review ever. **Every builder in the set has now been opened at least once.**

Two reviewers ran concurrently on genuinely different briefs with a 40-minute
deadline; both reported on time with executed evidence, and **converged
independently on three defects** (the calendar/period contradiction, the blank
numeric field, the wrong study-size paragraph), which is good evidence those
were real. A third was then sent at this run's own commits.

#### Environment: nothing newly blocked, four notes

- `npm i --no-package-lock --no-audit --fund=false`, `npm pack docx@8.5.0` +
  `page.route('**unpkg.com/**', …)`, Crossref/PubMed/doi.org/**CRAN**/publisher
  hosts all 403 with `WebSearch` the only way out, the live site unreachable,
  detached HEAD (`git push origin HEAD:main`) — all still true.
- **R is not needed for this builder** and was not installed.
- Ports: reviewers 8141/8142 and 8151/8152, orchestrator 8161-8167, round two
  8171/8172. Assign up front.
- A reusable `harness.mjs` is in this run's scratch (`scratchpad/tit/`): static
  server, Playwright by absolute path, the `docx` CDN route, an `open({ draft,
  seed })` that pre-seeds localStorage or a `?seed=` link, and
  `armCapture`/`grabText`/`grabBytes` for capturing a real download. `v1`–`v4`
  and `msgs.mjs` are worked examples.
- The `<script is:inline>` block is a classic script, so `page.evaluate(() =>
  readNum('1e3'))` and `page.evaluate(() => computeChecks(readForm(), true))`
  reach its functions directly. Much the fastest way to test this file.

#### The trap that nearly cost this run the page, again

The thirteenth run recorded that a **literal U+2028 inside a regex character
class** breaks an `is:inline` script at runtime while the build reports success.
Porting that run's `oneLine` helper, this run **reintroduced exactly that bug**
— the literal characters travelled instead of the `\u2028\u2029` escapes. It was
caught within a minute only because the brief said to look. **Scan for it after
any edit that copies a regex between files:**
`python3 -c "import io;print([hex(ord(c)) for c in io.open(P,encoding='utf-8').read() if ord(c) in (0x2028,0x2029)])"`
The brief paid for itself here; keep the entry.

#### Fixed this run

All executed in Chromium against a local build, before and after; every export
claim asserted by unzipping a generated `.docx` and reading `word/document.xml`,
never inferred.

- ~~**The hub defined CPE as the thing the builder has a red error to
  refute.**~~ `protocol-generator.astro` told the reader that trend-in-trend
  strata "are defined by their **cumulative percentage exposed (CPE)**". Ji et
  al's abstract divides the population into strata "based on the **cumulative
  probability of exposure given covariates**" — a probability predicted per
  person by a stage-1 model, which is the entire reason the design is robust to
  time-invariant unmeasured confounding. Stratifying on the observed percentage
  exposed defines the strata by the exposure trend itself and gives that
  property away. `descriptive-analysis.astro` states it correctly in two places
  and the builder ships a red error saying exactly this; **three files defined
  CPE and only the hub — the page a reader meets first — was wrong.** Snippet
  evidence for the abstract wording; every publisher host is 403.
- ~~**One box, four different numbers.**~~ `nperiods = "1e3"` — which
  `<input type="number">` accepts without complaint — gave §3 "**1e3** periods",
  a checks panel saying "Only **1**", a caption reading "1e3" and a drawing of
  **3**, with the clamp disclosure silent because it tested
  `parseInt("1e3") > 24`. One `readNum` now, consumed by the prose, the checks,
  the caption, the drawing, both Word tables and the figure description.
- ~~**A blank count exported as 10 and silenced its own warning.**~~
  `V("nperiods") || "10"`. Emptying the box exported "10 periods" the form was
  not showing **and** cleared the "aim for ≥ 5" bar at the same moment, because
  10 is not fewer than 5. The page's own reset handler carried a comment saying
  precisely this was unacceptable and fixed it only for "Clear all". Same for
  `nstrata` and 5. Also closes the paste case: `<input type="number">` discards
  `"10 years"`, `" 7 "` and `"0x10"` to `""` before any script sees them, so the
  user saw an **empty box** beside a confident number.
- ~~**Zero periods drew ten.**~~ `parseInt(s.nperiods) || 10` — `0` is falsy —
  drew a ten-period figure under a caption reading "0" and a panel reading
  "Only 0". The drawing now discloses **both** clamp directions; it had only
  ever admitted to clamping down.
- ~~**A stale draft rewrote the analysis and then destroyed the evidence.**~~
  This page had the machinery for `estimator` alone. A draft or `?seed=` link
  naming a `period` or `effect` it does not offer left those selects at
  `selectedIndex = -1`, contributing nothing to `FormData`, so `|| "yearly"` and
  `|| "OR"` substituted silently — and the first render's autosave then wrote
  the substitutions **back over the draft**, so the user's own values were gone
  within a second of page load, unrecoverable. A colleague opening your link got
  a different protocol from the one you sent. Ported the twelfth run's
  machinery: all selects, the empty string included, the record persisted inside
  the draft under a reserved key, per-control clearing, a Keep button, two
  renderings for the two audiences.
- ~~**The warnings that decide whether the estimate means anything never left
  the screen.**~~ Only `missing()` travelled. A user could watch the page refuse
  a strata count of `-5` in red and export a Word file whose design-summary
  table stated "**-5 quantiles of the cumulative probability of exposure**" as
  fact, with §7 step 2 instructing sites to "assign each person to one of -5 CPE
  strata". Blockers and cautions now open both exports, flattened by `oneLine`
  and capped by `clip` first — the messages quote what the user typed, a shared
  link can carry a newline, and a newline ends a Markdown blockquote.
- ~~**Nothing reconciled four inputs describing one axis.**~~ "2005–2018 in
  yearly periods (**10** periods)" exported with a straight face, and the page's
  own placeholders (`e.g. 2005`, `e.g. 2018`) beside a default of 10 handed the
  user that contradiction **before they typed anything**. Checked only where it
  is unambiguous — both ends bare four-digit years, where all four offered
  period lengths divide the span exactly. A month-precision end is not guessed
  at, because a wrong period count is the thing the check exists to catch.
- ~~**The sparse-cell note was about the wrong axis.**~~ It fired on strata > 5
  and said nothing about periods, so 5 strata × 168 monthly periods — 840 cells
  over a fixed number of cases — passed in silence while 10 × 10 was flagged.
  Sparsity is a property of the `G × Tn` grid. What the tool genuinely cannot do
  is *judge* sparsity, because it never learns the case count, so it now reports
  the grid it will produce and says that rather than inventing a threshold.
- ~~**The study-size paragraph was the generic person-level cohort one.**~~
  "Power … from observed exposure and outcome frequencies", "person-time and
  event counts" — for a design with no exposed-versus-unexposed contrast, in a
  document whose own figure description says it "is not anchored to a
  person-level day 0", so the exported protocol contradicted itself across two
  sections. **The paper that says how to size it was already in this page's
  bibliography and had never been invoked.** Sixth builder to record this
  objection; closed locally, as the thirteenth run established, via
  `ProtocolCommon`'s `nz(s.studySize, …)` hook. The new paragraph names the
  determinant that actually matters (the strength of the exposure-prevalence
  trend), cites Ertefaie et al 2018 for it, and names the package's Monte-Carlo
  routines `ttpower()` / `ttdetect()` with the parameters the form already
  collects.
- ~~**Half of the identification flag was missing.**~~ Three surfaces said
  `TrendInTrend::OR()` "flags non-identification". The documented indicator
  covers "not identifiable **or weakly identified**", and weak identification is
  much the more dangerous of the two because a number still prints — it is
  simply unstable. Also added the package's own documented caveat that the
  bootstrap interval may have slightly **below-nominal** coverage, which four
  surfaces had promised as a plain 95%.
- Smaller, same species: the file's strongest comparative claim ("the conditions
  under which trend-in-trend is biased are a subset of those under which a
  cohort study is biased") was stated in the tool's own voice on 2 of 8 surfaces
  and is now attributed to Ji et al; a user's own sentence ran into the
  boilerplate after it in **both** exports, because the placeholders carry no
  full stop ("Proportion dispensed A strong time trend in exposure is…"); the
  legend now says the per-stratum exposure trends — whose divergence the design
  turns on, and which the analysis plan asks to be reported — are **not** the
  curves drawn; "Clear all" promised to "forget the saved draft" and then had
  `render()` write it straight back; `doReset` set selects to `selectedIndex =
  0` rather than their authored default; and the two rule-of-thumb thresholds
  (≥ 5 periods, ≥ 3 strata) now say they are this tool's heuristics rather than
  sitting in the same authoritative voice as the sourced "Ji et al used
  quintiles (5)".

#### Checked and clean (do not re-derive)

- **All four citations resolve, author lists included** — Ji 2017 Epidemiology
  28(4):529-536 / PMID 27775954; Ertefaie 2018 Epidemiology 29(3):e21-e23 /
  doi 10.1097/EDE.0000000000000803; Dasgupta 2019 Pharmacoepidemiol Drug Saf
  28(5):716-725 / doi 10.1002/pds.4736 / PMID 30714239 (author list confirmed
  verbatim and in order); the `TrendInTrend` CRAN package by Ji X & Ertefaie A.
  **Snippet evidence, checked independently by two agents; NOT a Crossref
  check** — Crossref, PubMed, doi.org and CRAN are all 403 here. **No fabricated
  reference in this file.** Ertefaie's PMID could not be seen in any snippet.
- **A lead was resolved IN THE PAGE'S FAVOUR, which is why leads are not
  findings.** The claim that `OR()` flags non-identification looked invented —
  the first snippet found described the failure as "may fail to converge". A
  second search of the package reference lists exactly that indicator among its
  return values. Do not rewrite it.
- **The stage-2 description is correct.** `OR()` takes `n11`/`n10`/`n01`/`n00`
  as `G × Tn` matrices, so the page's "2 × 2 table per stratum per period" is
  right, not the ecologic-marginals shortcut a reviewer suspected.
- **Stage 1 / CPE is correct and consistent on all six surfaces that state it**,
  and matches Ji's abstract.
- **exp(β₁) is an odds ratio and every surface agrees** — no surface claims RR,
  HR or RD; the RR option's rare-outcome rationale appears in all five places it
  needs to and is nowhere overstated.
- **All 19 `name=` attributes are read by `readForm`.** Diffed mechanically.
- **Layout is clean at 390 / 768 / 1024 / 1440 px** (`scrollWidth ===
  clientWidth`), re-measured after the new and much longer check messages.
- **A sweep of all 35 distinct messages `computeChecks` can emit** found **zero**
  positional or screen-only language in the document rendering (the three that
  say "press Keep" are the screen variants, correctly split). Worth repeating
  whenever checks start travelling; it is cheap.
- The Word export builds (302 KB, valid zip, logo and Figure 1 placed), the
  five numbered analysis steps are present in **both** exports, and no acronym
  is lower-cased. The drag handle works. The `?seed=` path decodes correctly.

#### What the reviewers disagreed about, and who was right

- **The two briefs split cleanly and neither could see the other's half.** The
  methodologist's top finding was that the exported protocol is sized by a
  person-level cohort paragraph while the same document's figure description
  says the design "is not anchored to a person-level day 0". The applied
  analyst's was that opening the page with a stale draft **destroyed the user's
  saved values within a second** and then described a study they had not
  specified. One is a claim about statistics, the other a lifecycle bug with no
  wrong sentence in it. Both shipped. **Keep running the two briefs disjoint.**
- **The orchestrator overruled the methodologist twice, and both times the
  weaker version of the finding was the right one.**
  - It argued the tool "flags by default the analysis it recommends by default"
    (the > 5 strata note firing at 10, while a default-ticked sensitivity
    analysis suggests 3 vs 5 vs 10). **Rejected**: the note explicitly asks the
    user to "compare against 5 strata as a sensitivity analysis", which is what
    that ticked analysis does. They agree; they do not conflict.
  - It argued the legend asserts per-stratum *exposure* trends the figure never
    draws. **Half right.** "Outcome trend, high-CPE stratum (steep rise in
    exposure)" describes *which stratum* the curve belongs to, not a second
    drawn curve. But the underlying gap is real — the divergence of exposure
    trends across strata is the one thing the design turns on and the one thing
    the figure does not show. Fixed by **saying so**, not by drawing invented
    per-stratum curves, which would assert something false.
- **The methodologist named its own least-confident finding and it was left, on
  its own advice.** `exp(β₁)` is a single odds ratio fitted across all `G × Tn`
  cells, so it is identified only under no effect modification by CPE — and CPE
  strata are strata of propensity to be treated, which in pharmacoepidemiology
  is routinely an effect modifier. The page's assumption box is headed
  "Assumptions, stated as the paper states them", a positive completeness
  claim, and never mentions it. The reviewer wrote: "Anyone acting on this must
  read Ji 2017 §Methods first" — which is impossible from this container, every
  publisher host being 403. **Left deliberately. This repo has already had a
  fabricated citation introduced by exactly the route of reasoning about a
  paper nobody could open.**
- **The applied analyst named its own least-confident finding and it was also
  left.** The Markdown and the Word file number their sections differently (the
  `.docx` swaps this page's §3 prose for a design-summary table, so everything
  after is offset by one), making "Section 7" ambiguous in an amendment. It
  flagged this as possibly deliberate; **the brief confirms it is the house
  pattern**, recorded by the thirteenth run for ITS. Not changed — but the
  lesson *was* applied: no travelling message hard-codes a section number.
- **A citation suspicion was resolved IN THE PAGE'S FAVOUR by two agents
  independently.** Both suspected `OR()`'s non-identification flag might be
  invented; both found the package reference listing exactly that indicator.
  Recorded because it is the counter-example to the run's own instinct: **a
  reviewer's suspicion is a lead, and leads lose about as often as they win.**

#### Round two: the reviewer was pointed at this run's own commits

**Six for six.** A third reviewer was given only this run's diff and told to
break it, and every one of its six findings was damage this run had done — the
sharpest one contradicting the commit message directly. **It is now 6/6 across
six runs. Treat this as a required step, not an optional one.**

- ~~**The drag handle was the fifth consumer, and the reader never reached
  it.**~~ The commit opened by claiming "ONE reader for both counts, because
  four surfaces consume them" and named `1e3` as the motivating case — while
  leaving `parseInt(form.elements.nperiods.value) || 10` in the drag handler.
  With `1e3` in the box (prose and caption both reading 1000, figure showing its
  24-period clamp) one nudge set the field to **4**. With the box blank — the
  state the diff exists to make loud — a nudge produced **9**, the removed
  default of 10 handed back through the drag path. **When you write "one reader
  now", grep the whole file for the old expression before you believe it.**
- ~~**The substitution record was trusted on the way back in.**~~ Its `used`
  value is assigned to `form.elements[x.name]` and nothing checked the name
  belonged to a `<select>`, so a record naming a text input overwrote that field
  and the autosave destroyed the user's value a second later — the exact damage
  the mechanism prevents, generalised to every field, with a nonsense blocker
  about a free-text box printed alongside. Reachable only by hand-written
  localStorage (`?seed=` is closed — the seeded branch never reads the reserved
  key), so it is hardening rather than a live attack. Note the second-order bug
  in the first fix: capping the array **before** the validity filter let junk
  entries at the front push a legitimate record off the end.
- ~~**Markdown markup in a string that feeds the Word file.**~~ The new
  study-size paragraph was written with backticks around `ttpower()` etc, but
  `pcOf()` feeds **both** exports, so three backtick pairs printed as literal
  characters in the `.docx`. The ProtocolCommon paragraph it replaced contained
  no markup. **Anything set in `pcOf()` is plain text; only `buildMarkdown` may
  carry Markdown.**
- ~~**`numText` printed exponential notation.**~~ `Number.isInteger(1e21)` is
  true and `String(1e21)` is `"1e+21"`, so ≥2^53 came back out as
  "**1e+21** periods" — the exact notation the reader was built to keep out of
  the protocol. `Number.isSafeInteger` is the right guard and also guarantees
  no exponent in the output.
- ~~**`-0`**~~ slipped past `v < 0` and was reported as "zero periods" rather
  than as negative.
- ~~**Grammar in text that now travels.**~~ "in every 6 months periods", "is 1
  periods", "Only 1 calendar periods", "1 CPE strata", double parentheses from
  wrapping an already-parenthesised refusal, and an ellipsis `sent()` did not
  treat as terminal punctuation so it appended a fifth dot. **Once check
  messages travel into a document, their grammar is the document's grammar.**

Also worth recording: **the reviewer independently re-verified every factual
claim the diff introduced** — `ttpower`/`ttdetect` exist with the argument list
the paragraph describes, Ertefaie 2018's finding is stated in the right
direction, the "not identifiable **or weakly identified**" rewording matches the
package documentation, and the bootstrap-coverage caveat is accurate. It
attacked Markdown injection through `?seed=` with newlines and fenced blocks and
**could not forge structure**: `<input>` value sanitisation drops CR/LF before
`V()` sees them, and `oneLine`/`clip` flatten whatever survives.

#### A harness note that cost this run twenty minutes

Playwright's `mouse.move`/`down`/`up` **silently fails to drive this page's drag
handle** — the handle sits ~3000 px down the page and the first synthetic drag
on a fresh page never registers, even for a plain valid value, so a naive test
reports "no change" and looks like a product bug. Dispatch real `PointerEvent`s
instead, with an explicit `pointerId`, from inside `page.evaluate`:

```js
const h = document.querySelector('.tit-handle'); const r = h.getBoundingClientRect();
const mk = (t, x) => new PointerEvent(t, { pointerId: 1, pointerType: 'mouse', bubbles: true, clientX: x, clientY: r.y + r.height/2 });
h.dispatchEvent(mk('pointerdown', r.x + r.width/2));
document.dispatchEvent(mk('pointermove', r.x + r.width/2 - 100));
document.dispatchEvent(mk('pointerup',   r.x + r.width/2 - 100));
```

That exercises the real handler and is how the drag fix above was confirmed.
The eleventh run's reviewer and this run's applied analyst both reported the
drag as "works but I could not measure it" — this is why.

#### Open, examined this run, deliberately left

- **The homogeneity assumption** (above). Needs Ji 2017 §Methods. Also absent:
  any statement that the design assumes the outcome does not affect subsequent
  exposure. **Do not write either from memory.**
- **"A time-stable confounder cannot bias it" is stated unqualified on six
  surfaces.** It is a consequence of the unbiased-unless condition *within the
  model*, not an unconditional guarantee. Consistent everywhere, so it is a
  minor overreach rather than a contradiction — but a scope clause would be
  more honest.
- **The diagram always draws a positive effect.** `slope` is strictly
  increasing in the stratum index with no null case, so the picture asserts a
  causal effect whatever the data would show. "Schematic only — the shapes are
  illustrative, not your data" mitigates it. A null-case toggle is a feature.
- **`PC.mountAmendments` is never called here** — seven of nine builders still
  do not, unchanged since the third run.
- **Both "📚 Library" buttons drop the validated code set.** They set
  `data-target-name` only and this page has no codes field, so picking from a
  modal headed "Validated phenotype library" writes the bare phenotype name and
  discards the codes, the definition and the validation citation. Same species
  as ACNU's and ITS's; closing it properly means adding a field.
- **Two subgroups and four sensitivity analyses ship ticked.** Seventh builder
  to record it. **Defaults policy — Daniel's call.**
- **The hub's TIT card still says the design assumes "the unmeasured
  confounding is time-invariant"**, which is a stronger framing than the
  paper's condition. Left as a defensible simplification for a chooser card;
  the builder states it precisely. Only the CPE definition was wrong enough to
  change.
- **The drag handle's px-per-period accuracy is still unverified**, though the
  handle is now confirmed to work and to start from the drawn count (see the
  harness note above for how to drive it). Nobody has checked that one period of
  drag equals `pxPer = (plotR - plotL) / (np - 1)` pixels.
- **Ertefaie 2018's PMID (29337845) was never observed in a snippet** — every
  other field of all four references was. Unverified, not wrong.
- **`impliedPeriods` deliberately checks only the unambiguous case** (both ends
  bare four-digit years). A month- or day-precision range, or a free-text one
  like "Q1 2005", is not checked at all and says nothing. Widening it means
  deciding what "2005-03" to "2018" means, and guessing there would recreate
  the bug the check exists to catch.

### Found 2026-08-23 by a fifteenth run — the protocol generator hub, the last unreviewed tool

Fourteen runs had worked the nine builders (all now opened at least once), RWE
Studio twice and the Protocol Checker once. **`src/pages/tools/protocol-generator.astro`
— one of the three top-level tools, and the page every reader meets first — had
three commits ever, all drive-by, and no review.** 367 lines, no client script,
so the bug class here is not a wrong number: it is a wrong *route* and a claim
the builder it links to states more carefully.

Two reviewers ran concurrently on disjoint briefs (statistics + citations;
routing + navigation). They **converged independently on the routing defect**,
which the orchestrator had also written up before either reported — three
independent findings of the same thing.

#### Environment: one new trap, everything else unchanged

- **`npm i --no-package-lock` can leave packages partially extracted** — the
  directory is present but the entry file is missing, `npm i` then reports "up
  to date", and `astro build` dies with `ERR_MODULE_NOT_FOUND` on
  `prismjs/components/index.js`, `zod-to-json-schema/dist/esm/index.js` and
  others. Reinstalling the named package one at a time **does not converge** —
  it wipes that package's own deps and you chase it round in circles. The fix
  is `rm -rf node_modules && npm i --no-package-lock --no-audit --fund=false`,
  which takes 10 seconds. Both reviewers hit this independently; one lost its
  build entirely and reviewed from source only.
- **`npm i <pkg>` rewrites `package.json`.** The repair loop above silently
  added `prismjs`, `zod-to-json-schema` and `package-manager-detector` to
  dependencies and bumped `astro` from `^5.0.0` to `^5.18.2`. Caught at
  `git diff` before staging. **Always `git diff package.json` before you commit.**
- `dist-*/` **is** gitignored now (it was not when the sixth run wrote that it
  was not). The ship loop's `--outDir "dist-$$"` is safe.
- Detached HEAD as always — `git push origin HEAD:main`.
- Crossref/PubMed/doi.org/CRAN/publisher hosts all 403, `WebSearch` the only
  way out, live site unreachable: all still true.
- Ports used: reviewers 8181/8191, orchestrator 8201, round two 8211.

#### Checked and clean (do not re-derive)

- **All nine citations resolve — authors, journal, year, volume, pages — and no
  fabricated reference is in this file.** Snippet evidence only (Crossref,
  PubMed and doi.org are 403); checked by one reviewer and spot-checked
  independently by the orchestrator. Lund 2015 Curr Epidemiol Rep 2:221-228;
  Maringe 2020 IJE 49:1719-1729; Hernán 2008 Epidemiology 19:766-779;
  Petersen 2016 BMJ 354:i4515; Maclure 1991 AJE 133:144-153; Vandenbroucke &
  Pearce 2012 IJE 41:1480-1489; Lopez Bernal 2017 IJE 46:348-355; Ji 2017
  Epidemiology 28:529-536; Lai 2015 Curr Epidemiol Rep 2:229-238. All nine DOI
  prefixes are also internally consistent with the journal claimed (Springer
  s40471 series, OUP ije dy{aa,s,w} year-letters, LWW pre-2010 `0b013e` vs
  modern `EDE.00000`, BMJ `i` series) — a cheap cross-check worth repeating.
- **The trend-in-trend CPE definition fixed by the fourteenth run is correct
  and matches the builder.** Do not revisit.
- **The case-control card is the strongest on the page.** Every clause of its
  risk-set / cumulative / case-cohort / Prentice-weighted estimand sentence was
  checked against `case-control.astro:336-351` and `:513` and is faithful, as
  is the matching rule. Leave it alone.
- **All nine slugs resolve to pages that build; all nine `#SHORT` anchors exist,
  are unique, and every chip href resolves** (executed against the build).
- **The `studioDesigns` sentence is true**: `rwe-studio.astro` defines exactly
  `acnu`, `sccs`, `cco`, `its`, and exactly those four cards carry `studio: true`.
  Checked both directions.
- **No horizontal overflow at 390 / 768 / 1024 / 1440 px**, re-measured after
  the routing change made the question blocks taller.
- Descriptive-analysis, ITS and ACNU cards otherwise match their builders.

#### Fixed this run

All executed in Chromium against a local build, before and after.

- ~~**Every routing question answered only one of its own branches.**~~ The six
  questions each rendered one flat row of chips labelled "Points to". Q1's row
  was the *yes* branch, Q2's was the *no* branch, Q4's was one of the two
  answers its own heading names — **no consistent polarity to learn**. A reader
  who correctly infers from Q1 that the row means "designs for yes" reads Q2's
  row as saying CCW and ST are for when you *can* tell the strategies apart on
  day one, the exact inverse; ACNU, the design for that case, had no chip on Q2
  and was reachable from one chip on the whole page. Two rows contradicted the
  prose printed directly beneath them: Q1's paragraph ends "If no such
  comparator exists, you are pushed towards a self-controlled or calendar-time
  design" above a row offering only the three cohort designs, so the
  drug-versus-nothing reader was routed to the ACNU card whose *Breaks when* is
  "No genuine comparator exists and the honest question is 'drug vs nothing'" —
  the routing delivering them to the card that refutes it. Q4 was worse: the
  question names both answers and the paragraph's second half explains that the
  three chipped designs do not handle the other one. Routes now carry
  `{ if, to, note? }`; both branches always render; a branch that leads nowhere
  says so (Q3's "if no") rather than being omitted.
- ~~**Case-crossover "removes time-invariant within-person confounding".**~~
  Inverted — self-matching removes *between*-person confounding, and the page
  said so correctly twelve lines above in the family lede. A factor constant
  within a person *is* a between-person difference; what survives within the
  person is the time-varying part the design is most vulnerable to.
- ~~**A zero grace period "means the strategies coincide".**~~ They become
  perfectly *distinguishable* at time zero, which is what cloning exists to
  avoid; `clone-censor-weight.astro:501` says so verbatim and names the remedy
  the card omitted (use ACNU). Reading it as "coincide" also mis-signposts the
  fix — it suggests redefining the strategies when you should change design.
- ~~**Four conditions the builders state and the hub had dropped.**~~ ACNU
  asserted censoring at switch *is* informative (builder conditions it on the
  reasons for stopping being outcome-associated). Sequential trial asserted the
  trials are not independent samples — which is false for the variant where
  both arms initiate at the origin, and the builder raises a *hard error* asking
  the user which study they mean. SCCS listed three of the builder's four
  assumptions, omitting that repeat events within a person must be independent —
  on a card whose own example is recurrent falls in older adults. Its
  pre-exposure window was described as absorbing confounding by indication,
  the reading the builder explicitly refuses.
- ~~**The caution box generalised an SCCS-only failure to both self-controlled
  designs.**~~ It said they "are unusable if the event changes later exposure".
  A backward-looking case-crossover never samples post-event exposure, so it
  cannot be biased by it — `case-crossover.astro` mentions event-dependent
  exposure **0 times**, the SCCS builder **6**. Now attributed to the design it
  belongs to, with the note that the bidirectional referent offered as a
  sensitivity analysis gives that immunity up.
- ~~**"At least 8, ideally 12" pre-intervention points, unattributed.**~~ It
  matches the builder so it was not a contradiction, but it sat inside *Assumes*
  directly above a citation that does not support it. A search traces the 8 to
  Penfold & Zhang rather than Lopez Bernal and finds **nothing at all for the
  12**. Labelled this tool's own rule of thumb, following the precedent
  trend-in-trend already sets. **No citation was added** — snippet evidence is
  not grounds for asserting one, and this repo has had a fabricated reference
  introduced by exactly that route.
- Smaller, same species: the nine short codes were used thousands of characters
  before the cards defining them with **no title or aria-label**, so decoding a
  chip meant clicking it and losing your place — they now carry the design's
  full title from **one map derived from the card list**, with a build-time
  throw if a route ever names a design the page does not define (**verified by
  planting a typo: the build fails with the route named**). All eleven anchors
  landed their target *under* the 65px sticky header (`scroll-mt-6` = 24px), so
  clicking a chip labelled SCCS hid the SCCS label that confirms arrival —
  measured 49 vs 65, now 121. The novice box promised the questions "narrow nine
  designs down to one or two" four lines above the retraction that they are not
  a decision tree. Chips were 23px against a WCAG minimum of 24. `studioDesigns`
  would have rendered "undefined" into a user-facing sentence at one design or
  none.

#### What the reviewers disagreed about, and who was right

- **The two reviewers cited the SAME sentence to opposite effect, and that is
  the most useful thing that happened this run.** The applied analyst quoted
  clone-censor-weight's "there is nothing to clone and the strategies coincide"
  **approvingly**, as supporting evidence for its (correct) point that cloning
  is wasted machinery when the arms are already distinguishable at time zero.
  The methodologist independently identified that same sentence as **inverted**.
  The methodologist was right — the builder says "distinguishable at time zero"
  verbatim. **B's conclusion survived; its supporting quote did not.** This is
  the brief's standing lesson in a new form: a reviewer can be right about the
  conclusion and wrong about the evidence, so check the quote, not just the
  claim.
- **The disjoint-brief split paid off again and should be kept.** The
  methodologist's top finding was a term inverted between two lines of the same
  page; the applied analyst's was that the routing widget delivers the
  no-comparator reader to the card that refutes the routing. Neither could have
  found the other's. Both shipped.
- **The orchestrator's own finding was invisible to both briefs.** The caution
  box is neither a card (methodologist's scope) nor a route (applied analyst's),
  so nobody was pointed at it and it carried the run's third inversion. **When
  you split briefs by structure, list the page regions that belong to neither.**
- **The applied analyst named its own least-confident finding and it was
  rejected on its own advice.** It argued CCW is mis-filed under an
  active-comparator question when its worked example is statin-vs-no-statin,
  but said itself it would not move CCW. Not moved — CCW runs fine with two
  active strategies, and the family lede already hedges with "Strongest when a
  genuine active comparator exists". Recorded below as an editorial question.
- **The methodologist named its own least-confident finding and it was
  downgraded, also on its own advice.** Whether "separated out to absorb" fairly
  conveys the builder's "report it as a parameter in its own right". Folded into
  the SCCS rewrite as a rider rather than shipped as a headline.
- **One reviewer suggestion was rejected outright**: noting the 2021 corrigendum
  to Lopez Bernal 2017 on a one-line hub citation. Correct that it exists;
  wrong thing to put on a chooser card.

#### Open in the hub, examined this run, deliberately left

- **`Q4`'s "if it changes over time → ACNU, CCW, ST" is the weakest new route.**
  It mirrors the page's own amber box ("The cohort designs handle time-varying
  confounding, but only for what you actually measured"), and the note says the
  confounder must have been measured — but strictly, only CCW's IPCW is a
  g-method. A baseline propensity score, which is what ACNU and per-origin ST
  fit, does not handle treatment-confounder feedback, and `sequential-trial.astro`
  says so in its own *Breaks when*. The route is defensible as a pointer and is
  consistent with the page; **naming the g-method requirement in that note would
  be more honest and is the obvious next edit.**
- **CCW is chipped under "do you have an active comparator?" while its worked
  example is statin vs no statin**, and its family is literally named "Cohort
  designs with a comparator" whose `plain` says "from the day they start
  treatment" — the no-statin arm never starts treatment. The Q1-**no** reader,
  often exactly the grace-period treat-vs-don't case CCW exists for, is now
  routed to SCCS/CCO/ITS/TIT and will not find it. **Editorial: change the
  example, the family label, or add CCW to the no-comparator route. Daniel's
  call — all three are visible choices, not bugs.**
- **The `interrupted-time-series.astro` builder still states "aim for ≥ 8
  (ideally ≥ 12)" unattributed.** The hub now labels it a rule of thumb; the
  builder does not. One-line consistency fix, left because the ITS builder had
  its own dedicated run and this was not that run's scope.
- **Penfold & Zhang 2013 is a LEAD for the ≥ 8 threshold, not a finding.** From
  a course-website snippet summarising the ITS literature, not the paper. **Do
  not cite it without an authoritative record.** Nothing was found for "12".
- **The build-time guard checks that route codes exist; it does not check that
  `short` values are unique**, so two designs sharing a short would silently
  collapse `titleOf` and duplicate an anchor id. All nine are unique today
  (verified). Cheap to add.
- **Nothing checks that every design is reachable from some route.** Deliberate
  — a design legitimately need not be routed — but it means a future edit could
  orphan one silently.
- **`PC.mountAmendments` is still never called in seven of nine builders**,
  unchanged since the third run. Not a hub issue; still open.
- The hub's TIT card framing of time-invariant confounding was examined by the
  fourteenth run and left; unchanged here.

#### Round two: the reviewer was pointed at this run's own commits

**Seven for seven.** A third reviewer was given only this run's diff and told to
break it, and it returned thirteen findings, of which the top three were
executed damage this run had done. It is now 7/7 across seven runs. **This is a
required step.** It reported late — after the brief's first draft had already
recorded that it had not — so if yours is slow, wait for it.

**Its sharpest finding contradicted the commit message directly, for the third
run running.** `bad7f3e`'s message opens by describing the drug-versus-nothing
reader being routed to the ACNU card whose own *Breaks when* refutes the route.
The diff fixed that on Q1 and **recreated it on Q2**: the new "If yes — each arm
is declared at time zero → ACNU" branch, which the diff itself invented, catches
the same reader one question later, because "take drug X" versus "take nothing"
*is* distinguishable on day one. Q1's "If no" and Q2's "If yes" contradicted
each other four inches apart. Q2's yes-branch is now a note saying the question
does not narrow anything on its own. **When you add a branch to fix a misroute,
walk your own worked example through every other question before you believe it.**

Two more executed findings in the same diff:

- **The `aria-label` added to make chips decodable broke WCAG 2.5.3 Label in
  Name (Level A).** `aria-label="Self-Controlled Case Series"` on a link whose
  visible text is `SCCS` *replaces* the accessible name, so a voice-control user
  saying "click SCCS" matches nothing, and a screen-reader user never hears the
  code they then have to recognise on the card. The `title` attribute alone
  already gave the intended benefit. Now `aria-label={`${s} — ${titleOf[s]}`}`.
  **An accessibility affordance added without checking the spec made the page
  less accessible than before the diff.**
- **The new Q3 no-branch note said "questions 1, 5 and 6 are the ones that route
  you"** — Q2 and Q4 also route, and the note rendered directly above Q4. A
  reader taking it literally skips the two questions that would send them to a
  cohort design. This is the same species the commit set out to kill, committed
  in the sentence written to kill it.

Also fixed from its list: the Q4 time-varying note claimed measurement was
sufficient, contradicting ST's and ACNU's own cards (only CCW's IPCW is a
g-method) — the g-method clause is now there; the commit message claimed it had
addressed the "not a decision tree" retraction's placement when it had only
rewritten the *promise*, leaving the concession stated **twice** in two
registers (now merged into the box); CCW's `assumes` held a known structural
*violation* of proportional hazards rather than an assumption (reframed as a
requirement); **"every clone deviates immediately" is false** — exactly one of
each patient's two clones deviates, the other contributes full follow-up, and
this run had copied the sentence verbatim from `clone-censor-weight.astro:501`,
**so that builder line is wrong too and is still live**; Q1's "If no" was an
enumerated claim silently omitting CC and DA; SCCS said "the intervals" where
the builder says *confidence* intervals, on a card whose surrounding text uses
"interval" to mean person-time, and condemned its own worked example
(recurrent falls) without the builder's one-clause remedy; a dangling "That" in
the ST card; and at 390px the 6px inter-route gap against a 4px wrap gap made a
wrapped chip line read as a third, unlabelled route.

**A citation correction this run got wrong and round two caught.** The ITS
threshold was relabelled "this tool's own rule of thumb" on the strength of a
reviewer finding no attribution — but **Penfold RB, Zhang F. Acad Pediatr
2013;13(6 Suppl):S38-S44, doi:10.1016/j.acap.2013.08.002 is already in the ITS
builder's own bibliography** (`interrupted-time-series.astro:436`), which is
exactly the source the ≥ 8 traces to. The hub was telling the reader a number
was homemade while the page it links to cites its source. It now says
"a conventional minimum, not a threshold from the tutorial cited below" and no
new citation was asserted. **The builder also warns at ≥ 8 on *both* sides; the
hub's parenthetical said only "before the interruption" inside a clause opening
"there are enough points either side".** Lesson: "unattributed" is a claim about
the whole repo, and this repo is 3,800 lines of brief and 21,000 lines of tool —
grep before you assert an absence.

The orchestrator had separately attacked its own diff and found three defects,
all in prose it had itself introduced, all by **reading the rendered card text
rather than the source diff**:

- An em-dash aside inserted into case-crossover's `assumes` **replaced the comma
  that separated the first list item**, so the list ran on: "...prevalence — ...
  — the outcome has abrupt onset". Rewritten with semicolons.
- Clone-censor-weight's `fails` gained a sentence opening "Or ..." directly
  above a "; or" clause.
- The novice box ended "a fault in theirs", with no clear antecedent.

**The lesson worth keeping: render the strings and read them, do not read the
diff.** All three were invisible in the diff and obvious on the page. This is
the same species as the fourteenth run's grammar findings, and it is now clear
that any run editing these long prose strings should dump the rendered
`when`/`assumes`/`fails` for every card it touched and read them cold.

Round two also **verified the diff's own claims and confirmed most of them**,
which is worth recording because it is the counterweight to the list above: the
65px header measurement, `scroll-mt-24` landing every anchor 31px clear, the
chip tap size, `titleOf` being genuinely one derived map, the build guard
actually exiting 1 on a planted typo, no overflow at 390/1280, all nine designs
reachable, the Maringe/PH addition being faithful to `clone-censor-weight.astro`,
the SCCS independence assumption being genuinely the builder's fourth, and the
bidirectional-referent point being genuinely in `case-crossover.astro`. It also
independently confirmed via snippet that Lopez Bernal 2017 sets *no* fixed
minimum, which is what made the Penfold & Zhang correction above possible.

Two further gaps it named in the guard, left deliberately: it validates
route → design exists, but **not** that `short` values are unique (a duplicate
would silently collapse `titleOf` and duplicate an anchor id) and **not** that
every design is reachable from some route. All nine are unique and reachable
today, verified. Cheap to add if a future run touches this.

**Open, and this run's clearest hand-off: the ITS builder still states
"aim for ≥ 8 (ideally ≥ 12)" unattributed on both its warnings, while Penfold &
Zhang sits in its own bibliography.** One-line fix, not done here because the
ITS builder was the thirteenth run's scope and this run's was the hub.

### Found 2026-08-23 by a sixteenth run — the Protocol Checker, second pass

Fifteen runs had worked the nine builders, RWE Studio twice, the hub once, and
the **Protocol Checker exactly once** (the sixth run). It was the rotation gap,
so this run took it — specifically the question the sixth run left at the top of
its open list: **nothing on this page tied the report on screen to the input
that produced it.**

Two reviewers ran concurrently on disjoint briefs (checklists + scoring
arithmetic + citations; the client-side state machine), then were sent at each
other's lists, then a third was sent at this run's own diff.

#### Environment: one new trap

- **This repo is a SHALLOW CLONE (50 commits).** `git rev-parse
  --is-shallow-repository` → true. `git log --follow --
  src/pages/tools/protocol-checker.astro` returns **one** commit, although the
  sixth run made ~14 fixes to that file and every one is in the working tree.
  The scheduled prompt tells each run to "choose by looking at `git log` to see
  what recent runs covered" — **do not.** A run that trusts `git log -- <path>`
  will conclude a heavily-worked file has never been opened and will duplicate
  an earlier run wholesale. **This brief is the authority on coverage.**
- The sixth run's canned-fixture recipe still works exactly as written and is
  still the right way to test this page (worker routed via `page.route`, both
  downloads captured by monkey-patching `URL.createObjectURL` +
  `HTMLAnchorElement.prototype.click`). **A real `.docx` was generated and its
  `word/document.xml` read again**, by routing the blocked unpkg CDN to
  `npm pack docx@8.5.0`. Still nobody has opened one in Microsoft Word.
- Pasted fixture text **must exceed 200 characters** or `runCheck` refuses and
  the harness times out waiting for a panel that will never appear. Two of this
  run's test sections failed on exactly that before the code was even wrong.
- To exercise TARGET you must tick its radio first; otherwise the
  framework-mismatch guard fires (correctly) and hides the results.
- Ports used: reviewers 8311, orchestrator 8401-8412, round two 8501.
- Crossref/PubMed/doi.org blocked, `WebSearch` only, live site unreachable:
  all still true. `git diff package.json` was empty at commit time.

#### Fixed this run

All executed in Chromium against a local build, 50 assertions, before and after.

- ~~**A finished report survived any change to the input that produced it.**~~
  Executed at HEAD: run protocol ALPHA, replace the whole textarea with protocol
  BRAVO, and the report still read "23 of 23 assessable items met" with ALPHA's
  evidence, both download buttons live, nothing on screen to say so — and the
  downloaded Markdown was dated today, described ALPHA, and **named no source
  document at all**. Two protocols checked the same day produced two files
  called `HARPER-report-2026-08-23.md` whose contents were also
  indistinguishable. `runCheck` now stamps what the check was run ON — the exact
  text posted, the filename, the framework, the extractor's notes, the run date
  — **before** the round trip, and `staleReasons()` compares the live input
  against it. An amber bar sits at the top of the results card (193px above the
  Word button at 1280, 350px at 390), and **the report is not hidden**: it is a
  real report of a real run, and hiding it reads as data loss.
- ~~**The framework picker and the report could disagree silently.**~~ Moving
  the radio to TARGET after a HARPER run left `#confhead` reading "HARPER
  conformance" and the download named `HARPER-report-…` while the picker said
  TARGET. Same channel now reports it.
- ~~**Every export left the browser with no idea what it was about.**~~ Both now
  open with `Checked: text extracted from <file> — N characters`, carry the
  staleness warning when stale, use the **run** date rather than the download
  date, and slug the source into the filename.
- ~~**The stale warning first described the screen.**~~ Caught in this run's own
  draft. A `.docx` is read somewhere else, months later, by someone who never
  saw the page: it has no "above" to point at and no "now" to be true in. Each
  reason now carries two registers, `screen` and `file`, from one computation.
- ~~**`loadedNotes` was read at render time, 10-20s after the text was frozen.~~
  Uploading a file while the model was thinking pushed **that** file's caveats
  ("2 embedded images were found and could NOT be read") into a report on pasted
  text that had none; clicking Remove during the wait **deleted** the caveats of
  the document actually being scored, so a report on a .docx with three
  unreadable figures exported with no "What this check could not do" section at
  all. Caveats come from the run record now. Both directions executed.
- ~~**"Check protocol" was live during a file read, and sent the PREVIOUS
  file.**~~ `loadedText` is only assigned on success, so while BRAVO.docx was
  being read the chip named BRAVO and `getInputText()` still returned ALPHA. The
  button is held for the duration of any read (`readsPending`), and the previous
  file is dropped at the TOP of `handleFile`, not on success.
- ~~**TARGET item 7 was scored alongside its own sub-elements 7a-7h.**~~ Item 7
  is *"Describe how each target-trial component is emulated (elements a-h
  below)"* — by construction the conjunction of its children. Scoring it as a
  peer counted the same content nine times (9 of 31 rows for one published
  item) and could render **"7 … Missing" directly above eight consecutive "Met"
  chips**. The model usually omits item 7, which by luck produced the right
  denominator; when it answered, the score silently inflated. `reconcile` now
  derives heading rows from the ids themselves and excludes a heading whose
  sub-rows were actually judged. **The derivation is `c.indexOf(p) === 0 &&
  /^[a-z.]/i.test(c.slice(p.length))` — the letter-or-dot test is load-bearing,
  because a bare prefix test makes HARPER item 1 the parent of item 10.**
  Executed both ways.
- ~~**The demoted heading was first bucketed as "Not assessed".**~~ Caught by
  reading the rendered page, not the diff. `#howtoread` defines that as "the AI
  returned no usable verdict" — but the AI *did* answer; the tool excluded it.
  That is the same conflation the sixth run fixed when `unclear` was aliased to
  `partial`. It has its own status now, **"Not scored"**, with its own legend
  line, its own tally chip and its own clause in the summary sentence.
- ~~**"Of this checklist's 31 TARGET items".**~~ TARGET is published as a
  **21-item** checklist in 6 sections (confirmed by search snippet from three
  independent sources, and `target.ts:1` already said 21). The page asserted a
  false fact about a JAMA reporting guideline and carried it verbatim into both
  exports. The summary says "the 31 rows this tool scores for TARGET" now, and a
  new `rowsNote` field on each framework states the relationship on screen and
  travels into both exports through `frameText()`.
- ~~**`#onesample` hardcoded "19, 20, 21 and 22 of 23" and was shown on TARGET
  runs**~~, citing a 23-item denominator four lines under a summary reading "of
  31" — and contradicting the live HARPER denominator too whenever any item was
  `na`. It names the testing as HARPER's now.
- ~~**`#howtoread` said the denominator "is smaller than the checklist"**~~
  unconditionally; on any run with no N/A and no Not-assessed it equals it.
- ~~**`HARPER_CITATION` printed a title that appears in no record.**~~ It read
  "…Enhance Reproducibility **(HARPER)**: a good practices report…", inserting an
  acronym the published title does not contain and dropping the clause that says
  what the template is for. **The file's own header comment had it right.** This
  is the user-facing string — it renders into `#cite` and the last line of both
  exports. No volume/pages/DOI were added: still snippet-only.
- Smaller, same species: the `Checked:` line this run added would have implied a
  143,220-character protocol was assessed in full when the worker cuts at 60,000
  — it names the cut now, and says "text extracted from X" rather than "X",
  because a PDF's figures were never read. `#dlerr` (a failed Word download)
  outlived its report and survived Clear. `refreshInputNote` warned only when
  BOTH a file and pasted text were present, so after a failed upload the page
  showed an empty drop zone, a red error, and silently queued 40 pages of an
  older protocol hidden in a collapsed `<details>` — it names the single source
  now, with its character count.
- **Closed the fifteenth run's clearest hand-off**: `interrupted-time-series.astro`
  stated "aim for ≥ 8 (ideally ≥ 12)" unattributed on both warnings while the hub
  had already been corrected to call it a convention. Both messages now say so.
  **No citation was asserted** — Penfold & Zhang remains a lead, not a finding.

#### What the reviewers disagreed about, and who was right

- **The applied analyst's whole top finding was a defect the methodologist's
  brief could not see, and vice versa. The disjoint split paid off a second
  time and should be kept.** The methodologist's #1 was a false claim about a
  published guideline; the analyst's #1 was that no report identifies the
  document it scored. Neither could have found the other's.
- **The analyst won the argument about how to fix staleness — by agreeing with
  the sixth run's brief against its own first proposal.** It had proposed hiding
  or overlaying `#results` on input change. The methodologist rejected that,
  and its reason is the one to keep: **hiding solves the problem only for the
  person sitting in front of the tab, and the failure that actually hurts is a
  `.docx` forwarded to a co-author.** Annotate and let the annotation survive
  the download.
- **The methodologist argued for merely DISCLOSING the item-7 double count
  (because the worker cannot be redeployed from here); the analyst argued it
  was fixable client-side and executed the evidence.** The analyst won. It
  showed that in the branch the code documents as routine — the model omitting
  item 7 — `reconcile` already excludes the parent and names it in a caveat, so
  the fix only had to make the lucky branch deterministic. **Disclose the
  structure; fix the arithmetic.** Both were done.
- **The analyst overturned one of the methodologist's findings outright.** The
  methodologist called "1 of 1 assessable items met" a "100% headline built on
  one verdict" and wanted a refusal floor. The analyst executed it: **no
  percentage is printed anywhere**, the shrinkage is named in the same sentence,
  the chips read "1 Met · 30 N/A" and the bar is 97% grey. Dropped — refusing
  would have been *less* informative than 30 inspectable N/A verdicts.
- **The methodologist read the working tree while the orchestrator was editing
  it** and reported that the analyst's F1 was "a review of superseded code". It
  was not: the analyst reviewed HEAD, as instructed. **When you send reviewers at
  each other's lists mid-edit, tell them which tree each list was written
  against** — otherwise you get a confident, wrong critique of a correct finding.
- **The sharpest single moment: the methodologist found a falsehood in the
  orchestrator's own in-progress fix.** The new `Checked: … — N characters`
  provenance line ignored the 60,000-character truncation, so the most
  authoritative-looking line in the report would have overstated what was
  assessed. **Two runs running, the best methodological finding has been against
  the run's own new code.**

#### Round two: the reviewer was pointed at this run's own commits

**Eight for eight.** Twelve findings, of which the top three were executed
damage, and every one reproduced against the build that had already shipped
(nine assertions failing on the old build and passing on the new). **This is a
required step and it has never once come back empty.**

**Its sharpest finding was a REGRESSION this run introduced, not an omission**
— the fourth run running where the diff's own new machinery was the defect.
The `readsPending` counter added to hold "Check protocol" during a file read
wrote `checkBtn.disabled` **unconditionally**, with no knowledge that
`runCheck` had disabled the same button for its own reasons. Choosing a file
while a check was in flight released the run's grip: two requests spent against
the free daily quota, and **the screen settled on the older run's verdicts**.
`handleFile`'s `setStatus("")` also wiped the "Checking against HARPER…" line,
so the page showed an idle status over an outstanding request. **When two
different things can disable one control, neither may write the property
directly — make them both vote.**

Two more executed, both created by this diff:

- **A third `dropParts` clause met a two-part join**, so the headline sentence
  beside the score read "1 was judged not applicable **and** 3 were not
  assessed **and** 1 is a heading…". Two clauses read fine, which is why it
  survived; three did not exist before this run. It goes verbatim into both
  exports. **Adding an item to a list means re-reading the joiner.**
- **The screen and the exports disagreed about staleness for the whole duration
  of a file read.** The clear happens at the top of `handleFile`, the refresh
  only in the `finally`, and both exporters recompute staleness at click time —
  so a download taken mid-read said the input "had been removed from the tool"
  about a file that was being *loaded*, was named on screen at that moment, and
  went on to read fine. **The two registers are only one computation if they
  are computed over the same state.**

Also fixed from its list: the heading demotion fired when **one** sub-item had
been judged, throwing away the model's only verdict covering the other seven
and claiming "the sub-items carry the verdict" of rows that carried nothing (it
requires all of them now); **the `rowsNote` arithmetic did not work** — "items 1
and 7 are expanded into their sub-elements" gives 30 or 32, not 31, because
item 1 is *replaced* by 1a-1c while item 7 is *kept* beside 7a-7h, and that
retained row is exactly the one the demotion neutralises, so a note written to
correct a false claim about a guideline carried a second one; the stale bar was
headed "no longer matches the **input** above" when only the framework radio
had moved, contradicting its own bullet; the file register said an input "had
been **edited** in the tool" in the branch that fires when a different document
is uploaded under the same name, which this tool has no editor to do; HARPER's
`rowsNote` called it "not a numbered checklist" then said the rows follow the
template's own item numbering; and **the new "Not scored" verdict was drawn in
exactly the grey of the "Not assessed" one it had just been split from**, on
the bar and in the `.docx` — the diff separated the two categories everywhere
except where colour does the work.

**One finding rejected.** The restored HARPER title mixes Title Case with a
lower-case clause and the reviewer read that as an inconsistency. It matches
the published title and the file's own header comment. **Matching the record
beats internal tidiness.**

**Process lesson, and it cost this run real reviewer effort: the working tree
moved under the round-two reviewer four times while it worked**, and it was
pointed at a snapshot diff that went stale. Three defects it found had already
been self-fixed before it could report them. Worse, the *first* pair of
reviewers were sent at each other's lists mid-edit, and the methodologist
concluded the analyst had reviewed "superseded code" — it had not; it reviewed
HEAD, as instructed. **Freeze the tree, or tell every reviewer exactly which
revision its target was written against.**

Separately, the orchestrator attacked its own diff by
**dumping every string it had written as RENDERED text and reading it cold** —
and that alone found three defects invisible in the diff:

- `"The " + s.label` rendered as **"The the pasted text this report was
  generated from…"** — a doubled article.
- The demoted heading landing in **"Not assessed"**, whose on-screen definition
  it contradicted (this became the "Not scored" status above — the run's second
  most substantive change, found by reading the page rather than the code).
- A generated `.docx` showed the export **Tally** line omitting the new bucket,
  so it no longer summed to the checklist size.

**The lesson is now three runs old and should be treated as standing procedure:
render the strings and read them; do not read the diff.**

#### Open in the Protocol Checker, examined this run, deliberately left

- **The worker still cannot be reached or redeployed from this sandbox**, so
  everything in `workers/target-checker/worker.js` remains unverifiable here.
  Three findings sit behind that wall and are worth doing when it is reachable:
  - **`Prefer "missing" over "na"` (worker prompt) swings the same conformant
    protocol from 74.2% to 100%.** TARGET items 8-15 cannot be reported before a
    study runs; whether the model marks them `missing` or `na` moves the score
    25.8 points — and the *lower* number is the one that prints with **no
    explanatory sentence at all**, because `dropParts` is empty. The prompt's own
    canonical `na` example is the case it then instructs against. Arithmetic
    executed; model compliance reasoned.
  - **Deliverables have no `na` verdict.** The enum is
    `present|partial|absent` while the item checklist has `na`, and the prompt
    tells the model to record genuinely-inapplicable outputs as "absent". An SCCS
    or ITS protocol — which this site's own generator produces — draws red
    "Absent" chips for non-defects. Client aliases alone are inert.
  - **`RESPONSE_SCHEMA` lacks `propertyOrdering`** while the worker's other two
    modes carry it with a comment recording that `required` alone made Gemini
    omit the field on every item.
- **TARGET's target-trial SPECIFICATION items (6a-6h) still appear to be
  missing**, and **HARPER's Table 1-13 mapping and its top-level section number
  are still unverified.** Unchanged from the sixth run: these need a source this
  sandbox cannot reach. **Do not act on them from memory or a search snippet.**
- **`target.ts:6` claims CC BY-ND 4.0 while the repo ships two different
  paraphrases of the checklist wording** (`target.ts:56` and `worker.js:37`
  differ from each other, so at least one is an adaptation), plus newly authored
  `hint` text, redistributed through both exporters. ND would not permit that.
  The licence itself is snippet-only and was not verified; the internal
  inconsistency is executed. Worth settling, because it is the one open item
  with a legal rather than a statistical answer.
- **`HARPER_CITATION`/`TARGET_CITATION` still omit volume, issue, pages and
  DOI**, and HARPER was co-published in *Value in Health* with only one journal
  cited. Two runs have now recorded the same snippet values (HARPER PDS
  2023;32(1):44-55, doi 10.1002/pds.5507; TARGET JAMA 2025;334(12):1084-1093,
  doi 10.1001/jama.2025.13350) — **still snippet-only, still not asserted.**
- **`target.ts:19-21` says the `hint` field steers "both the reader and the AI
  checker".** The client posts only `{text, framework}` and the worker has no
  hint column, so hints reach the reader and never the model. Half of a doc
  comment is stale. One-line fix, left because it is a comment and this run's
  budget went to the score.
- **Staleness is binary on `now !== s.text`**, so a one-character typo raises
  the same bar as swapping the whole document. That is the right default (fail
  loud), but it means users may learn to ignore the bar. Not worth changing
  without evidence.
- **`src/pages/tools/target-checker.astro`'s comment claims it redirects "with
  ?framework=target intent noted in copy".** `protocol-checker.astro` has no
  `?framework=` handling at all, and the redirect is instant so the body copy is
  never read. Harmless — HARPER is the right default for a protocol — but the
  comment describes behaviour that does not exist.
- **The exports assemble from several clocks.** `#howtoread`/`#notascore`/
  `#onesample`/`#rowsnote` are read out of the live DOM by `frameText()`,
  `summaryEl.textContent` at click time, the rest from `lastReport`. This run
  moved the date onto the run record; the DOM reads are deliberate (so an export
  cannot word things differently from the screen) and no reachable divergence
  was found. Recorded because it is the one remaining place export content is
  not derived from the run record.
- **`PC.mountAmendments` is still never called in seven of nine builders.**
  Unchanged since the third run.
