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
