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
