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
- **A key absent from a state object read as "the user chose none".**
  `(state[name] || []).includes(el.value)` on a checkbox group cannot tell "the
  sender did not mention this" from "the sender chose nothing", so a partial
  `?seed=` link unticked 67 default-ticked boxes and exported a
  propensity-score-adjusted protocol with no covariates. Whenever an object may
  be *partial*, the test is `Object.prototype.hasOwnProperty.call(o, k)`, never
  a truthiness or `!== undefined` test on the value.
- **A refusal that erases itself before anyone can read it.** A builder's first
  `render()` autosaves the form it just restored, so a value the restore refused
  is gone from the draft within milliseconds: the warning shows on one load and
  the next load has no blank control, no warning, and a document confidently
  asserting the substituted choice. **Any state captured at restore has to be
  carried in the saved draft under a reserved key**, or it is destroyed by the
  render that raised it. Six builders now do; two capture without persisting.

## The bar for "done"

A change is not done because it builds. It is done when you have **observed it
working** and can say what you observed. Report honestly what you could not
verify. Two specific traps:

- **The live site serves stale copies after deploy.** Always cache-bust when
  verifying. Agents have twice nearly reported their own shipped work missing.
- **A finished commit is not a verified one. Send the reviewers back at your own
  diff.** That round is now 4 for 4 at finding real damage in a run's own work:
  the thirty-first run's found eight defects in five commits, two of them sign
  reversals, and both reviewers independently led with the same one. Budget for
  it. **Also build a small regression battery of working cases before the first
  commit and diff its OUTPUT after each one** — it is what makes the claim "these
  lines moved and nothing else did" checkable, and it caught two wording
  regressions that no reviewer looked for.
- **The checker is non-deterministic.** The same protocol scored 19, 20, 21 and 22
  of 23 across four runs. Read the per-item evidence string, never the total, and
  never conclude from a single run.
- **A green `astro build` says nothing about an inline `<script>`.** Astro does
  not parse their contents, so a stray `*/` in `ProtocolCommon.astro` killed
  `window.PC` on all nine builder pages and the build reported success. Load
  every tool page in Chromium and assert zero `pageerror` plus
  `typeof window.PC === "object"` before every commit that touches a script.
- **Diff the OUTPUT, not the expression.** A run replaced
  `=== "HR" || !s.effectMeasure` with `m.ratio && m.measure === "HR"` and said
  the behaviour had changed; `measure` is `em || "HR"`, so the two are the same
  and the generated R was byte-identical. Rendering the four *working* cases and
  finding them unchanged is not confirmation — it is the case you did not render
  that the change was for.

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

- ~~The duplicated planned-analytical-outputs list.~~ **Done 2026-08-23
  (twenty-first run)** — see the section at the bottom of this file.
- ~~The stale-`<select>` refusal path: capture, persistence, and reaching the
  exported document.~~ **Done 2026-08-23 (twenty-second run)** — all seven
  capturing builders now do all three; `case-control` and `clone-censor-weight`
  still capture nothing. (The `"na"` verdict this item also named was done by
  the twenty-third run, and finished on the checklist side by the twenty-sixth.)
- ~~**`PC.mountAmendments` is called in only two of nine builders** — open since
  the third run.~~ **Done 2026-08-23 (twenty-ninth run)** — the longest-standing
  item in this file. All nine now mount the editor and call `PC.syncAmendments`
  in every reset, and all nine `pcOf` pass `amendments`. Do NOT re-derive the
  twenty-fifth run's objection: it was right for its tree and was answered by the
  refusal the twenty-eighth run added. See the twenty-ninth run's section at the
  bottom for the four defects mounting would have shipped had it been done as
  "the three documented lines", and for what its two reviewers disagreed about.
- ~~**A raw `?seed=` payload bypasses the amendment log's pipe escaping
  entirely.**~~ **Done 2026-08-23 (twenty-eighth run)** — a stored line that does
  not hold exactly five unescaped-pipe-separated values is now refused rather
  than split, in the document (so all nine builders show it), with the line
  reproduced verbatim and a numbered placeholder keeping its row in the table.
  See that run's section at the bottom, including the two things this does NOT
  fix and the false-positive class the two reviewers disagreed about.
- SCCS's Farrington event-dependent-exposure sensitivity item is ticked by default
  with no explanation or citation. Daniel said to leave it for now.
- ~~Weight diagnostics in RWE Studio cover IPTW only.~~ **Stale — checked
  2026-08-23 (twenty-sixth run) and no longer true.** `wdiag()` is applied to
  the SMR and overlap weights on their own (`rwe-studio.astro:1452`), each
  estimate is gated on its own diagnostic, and matching and fine stratification
  are correctly excluded *with the reason on screen* (`:3202` — they do not
  weight; their diagnostic is how many patients survived, reported beside each
  estimate). Do not re-derive this.
- ~~No post-matching balance table (the SMD-after column is IPTW-weighted
  only).~~ **Half stale — checked 2026-08-23 (twenty-sixth run).** The SMD-after
  column now follows a scheme that was actually fitted, and when no weighted
  estimator was selected the tool refuses the column and says so in both the R
  output (`:1512`) and the panel (`:3174`). The table itself still is not built
  — but that is now a visible, stated refusal rather than a silent gap, which is
  this file's own standard. Building it would be a feature; treat it as one.
- Nobody has ever opened an exported `.docx` in Microsoft Word — every claim about
  those files is what a parser saw. (2026-08-22: a real `.docx` was generated and
  its `word/document.xml` read, by routing the blocked CDN to an npm copy of the
  same library. Still nobody has opened one in Word.)
- ~~RWE Studio's weight-stability refusal gate (truncation defeats it; pooled Kish
  ESS is blind to a nearly-empty arm; `smrbad` measures prevalence).~~ **Done
  2026-08-23 (twenty-seventh run)** — the three top-ranked items of the twenty-sixth
  run's list. The rule is now read per arm on the untruncated, unstabilised weights;
  truncation cannot move a verdict; SMR is judged on the comparator arm; and a
  weighted estimate is withheld when an arm holds fewer than five effective events.
  **Do not re-propose an unconditional `|SMD| > 0.1` refusal without reading the
  measured blast radius in that section** — both reviewers recommended it and both
  were wrong.
- **Five of the nine builders carry no version identity at all**, and the other
  four default one the user never typed. `clone-censor-weight`, `sequential-trial`,
  `interrupted-time-series`, `trend-in-trend` and `case-control` print only
  `_Study protocol · … · drafted ${today}_`, where `today` is `new Date()` at
  DOWNLOAD time — so the same protocol downloaded twice says it was drafted on
  two different days, and a log recording "amended to v2.0 on 2026-06-01" sits
  under "drafted 2026-08-23". `active-comparator-new-user`, `descriptive-analysis`,
  `case-crossover` and `self-controlled-case-series` have a `name="version"` box
  and print `orFb(s.version, "v0.1 draft · " + today)`, so an untouched box
  asserts a version nobody chose above a table asserting another. This is the
  twenty-ninth run's top-ranked leftover in this area. **It is a report, not a
  request for a control**: adding a Version box to the five, or a reconciliation
  check, is a feature and both of that run's reviewers said not to. The
  in-scope half is the word "drafted", which is not what that date means.
- **`applySeed` still drops an array seeded into a lone `<input>`.** The
  twenty-ninth run fixed the `<textarea>` case (join the lines); a single-line
  input receiving `["a","b"]` still silently keeps `"a"`. There is no honest
  join for it, and no visible surface in `applySeed` to refuse into. Left.
- **A `?seed=` link's leading/trailing whitespace does not survive a reload on
  five builders.** `V()` trims the whole field, so a refused line's outer
  whitespace is gone after one draft round trip on `clone-censor-weight`,
  `sequential-trial`, `interrupted-time-series`, `trend-in-trend` and
  `case-control`; the two FormData builders and the two mounted ones are
  byte-stable. Measured. The exported cells are unaffected and the wording
  ("reproduced exactly as it is stored") stays true — the storage was trimmed.
  Recorded so nobody re-derives it as a freeze violation.
- **`case-crossover` and `active-comparator-new-user` scroll horizontally at a
  320px viewport** — `document.scrollWidth` 359 vs 320, from an `<svg>` in the
  design diagram, nothing to do with any form control. Measured on the tree
  before and after the twenty-ninth run's changes, identically. Invisible to the
  390px assertion earlier runs used.
- **Every keystroke in the amendment panel runs each builder's `render()`
  twice** — `writeRows` dispatches a synthetic form-level `input` while the
  panel input's native one has already bubbled to the same form. Measured: 2
  events per keystroke, 13.6ms vs 7.2ms on ACNU. No re-entrancy, no loop, no
  caret loss. Both reviewers agreed it is not worth changing. Do not "fix" it
  without a reason.
- ~~The Protocol Checker's planned-outputs path: `normName`'s `/` vs `-` gap, a
  deliverable with `name: ""` dropped silently, `skip` as the un-validated twin
  of `skipOutputs`, and the tool quoting itself as "the AI's own words".~~
  **Done 2026-08-23 (thirtieth run)** — all four, plus five more the two
  reviewers found and eight that the round sent back at this run's own diff
  found. See that run's section at the bottom. **Do not re-clear `normName` on
  an en-dash test**: three reviewers have now done exactly that and the fourth
  found six live variants in twenty minutes. The itemised list of what is wrong
  in the worker's seven deliverable descriptions is also there — that is the
  best next target in this tool, and it needs the worker to be reachable.
- **In the Protocol Checker, `"present"` on a planned output is satisfied by a
  promise rather than a shell** — the twenty-third run's own top-ranked open
  item, still the best next target there, with a drafted one-sentence fix in its
  section. It is a `worker.js` prompt edit, so it is **unverifiable from this
  sandbox** and inert until Daniel deploys; weigh that before picking it.
- ~~The fifth run's ranked list of open items in RWE Studio's ITS path.~~
  **Mostly done 2026-08-23 (thirty-first run)** — the control-series wipeout,
  the `dconst` global `all()`, the bare `cat()` sweep and the silently closed-up
  calendar periods, plus eight regressions its own round-3 reviewers found in
  that work. Nine items are still open there and are ranked at the bottom of
  this file; ~~**the end-of-follow-up counterfactual sentence and its chart
  caption is the best next target in the tool**~~ **done 2026-08-24
  (thirty-fifth run)**, and the printed coefficient table's model-based
  p-values is now the best next target there — it is still untouched, still
  reproduces (a coefficient matrix of model-based SEs and p-values printed
  directly under the sentence "Standard errors: the wider of the model-based
  and the Newey-West HAC standard error"), and it is verifiable from this
  sandbox. The **decimal comma** on that list is
  stale — `readWorkbook` now classifies a comma per column. Before proposing a
  remedy in that path, read the "Do NOT re-derive these" list in the
  thirty-first run's section: **two reviewer-proposed fixes were implemented,
  measured, and found worse than the bugs they were meant to fix.**
- ~~**`renderITSChart`'s caption asserts the dashed line "extrapolates the
  pre-intervention trend forward as the counterfactual".**~~ **Done 2026-08-24
  (thirty-fifth run)** — the caption is now three-way (refused / controlled /
  uncontrolled), and so are the estimate label and the note under it. That run
  also found a wrong NUMBER on the same path, which no earlier run had:
  see its section at the bottom before touching this block.

<!-- CLAIM 2026-08-24 (thirty-sixth run, CLAIMED): took the thirty-fourth run's
     ranked item 3 and widened it to the whole area — the phenotype and
     drug-class libraries in `self-controlled-case-series.astro` and
     `case-crossover.astro`, the last two builders still carrying the
     pre-correction ATC strings, examined end to end: the code sets, every
     citation, and the pick → `pickedCitations` → reference-list path in both.
     Deliberately NOT RWE Studio (the run above holds it) and not
     `descriptive-analysis` / `phenotypes.ts` (the run below just did them).
     Retired when this run's section lands at the bottom of this file. -->

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
  Three entries now name their own estimand in prose (overlap → ATO, IPTW →
  ATE, IV → LATE). **Both reviewers of the thirty-second run, on disjoint
  briefs, independently put this in their own top three**, which is the
  strongest evidence this file has that it is worth Daniel's decision. Neither
  proposed auto-stamping the undetermined six; the applied analyst's argument
  is new and is about pooling — the builder prints ticked alternative methods
  as sensitivity analyses and meta-analyses site estimates, so a protocol
  naming no estimand invites a forest plot pooling an ATT from matching against
  an ATO from overlap weighting and calling the gap "robustness".
- **A stale `?seed=` or saved draft blanks a `<select>` silently.** `writeForm`
  assigns `el.value` with no membership check; an unmatched value leaves
  `selectedIndex = -1`, and a select with no selection contributes no entry to
  `FormData`, so `s.psMethod` becomes `undefined` and the export falls through to
  generic prose — while the green "pre-filled from link" banner claims success.
  Not executed (no jsdom here); it is spec behaviour and worth a browser test.
- ~~**`pickedCitations` is never pruned.**~~ **Done 2026-08-23 (thirty-second
  run)** in ACNU, the last builder still carrying it and the one this item was
  written against. It is now closed everywhere. Keyed by the field the pick
  wrote into, with the value it wrote and every other field it touched stored
  beside it; a citation travels only while ALL of those still hold what the
  pick put there. See that run's section at the bottom — including the
  regression the first version of it shipped, which was worse than the bug.
- ~~**Changing `psMethod` by hand does not clear `psMethodDetails`.**~~ **Done
  2026-08-23 (thirty-second run)**, the way this item said to do it: the
  textarea is untouched and the panel raises the disagreement. It also reaches
  the exported Markdown, the `.docx` and the TARGET checklist, because the
  person who receives the document is not the person who saw the panel — the
  argument the comment above `STALE_DOC_HEAD` in that same file already makes.
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

### Found 2026-08-23 by a seventeenth run — RWE Studio's SCCS and case-crossover

**Read the first item below before you plan anything.** This run collided with
another one and roughly half its work was thrown away.

#### THE PROCESS FINDING: two runs took the same target at the same time

This run started from `521e7e9`, read the brief, saw RWE Studio last worked 12
runs earlier and its SCCS / case-crossover paths never reviewed, and took them.
**So did another run, concurrently.** While this one was verifying, `36441e4`
and `6f6f32b` landed on `main` doing substantially the same job: `conv` flag on
`sccsfit`, "Not estimable" refusals, zero-event people counted separately,
hazard-windows-per-case, and its own assumption notes ("What this tool does not
fit" / "What this tool cannot check").

The local commit was rebased away and re-authored as **only what the other run
did not cover**. Nothing of theirs was rewritten or reverted.

**If these runs fire on a schedule, they are not mutually exclusive, and two
concurrent runs will pick the same rotation gap, because the brief is
deterministic about what the gap is.** Mitigations for whoever cares: fetch
`origin/main` *immediately before choosing a target*, not just before pushing,
and re-check it after the reviewers report; or push a cheap claim marker first.
This run lost maybe 40% of its output to the collision.

#### Environment: unchanged, plus one correction to a technique

- Everything the fourth and fifth runs recorded still holds: R 4.3.3 +
  `survival` installs in ~90s, WebR's CDN is 403 so drive `buildMaster()` /
  `analysisCSV()` / `buildScript()` from `page.evaluate` and run the R with
  `Rscript`, `npm i --no-package-lock` for deps, `git push origin HEAD:main`
  because the session starts detached, Crossref/PubMed/live site all blocked.
- **The clone is still shallow (50 commits) and `git log -- <path>` still
  lies.** The brief remains the authority on coverage.
- **A correction worth having: do not test visibility with
  `classList.contains("hidden")`.** This run nearly filed a false finding that
  the export's `Design:` line could disagree with its estimates. It cannot —
  the design radio clears everything at `:2564`. The probe read the class on
  `#anaresults`, which is `false`, because the `hidden` class sits on the
  **parent** `#anacard`. Playwright's `locator.isVisible()` reports it
  correctly. **Check visibility, never a class list, in a file that hides by
  ancestor.**

#### Checked and clean — do not re-derive

- **Both estimators are algebraically correct.** Re-implemented from scratch
  rather than read. SCCS `sccsfit` against an independently written multinomial
  conditional MLE and a fixed-effect Poisson: 2.991 / 2.991141 / 2.991175, SEs
  identical to five figures. Case-crossover `clogit` against a hand-written 1:M
  conditional likelihood: 2.551750 / 2.551837. **Nobody should touch that
  arithmetic.** (`scratchpad/indep_sccs.R`, `indep_cco.R`; a reviewer got the
  same to ten significant figures independently.)
- **The hard-coded `1.96` is CORRECT for both designs, and the fifth run's ITS
  finding does not transfer.** The conditional Poisson and both `glm` contrasts
  have known dispersion, so R itself uses `qnorm`; `clogit`'s interval comes
  from `summary(fit)$conf.int` and is not hard-coded at all. Simulated under the
  null at 10/15/20/30/50/100/300 cases: the Wald interval **over**-covers in
  small samples (rejection 2.3-4.3% against a nominal 5%). One caveat to carry:
  over-coverage under the null does not certify the interval away from it.
- **`buildCco`'s arithmetic comment is true.** `q = (OR*p)/(1-p+OR*p)` gives a
  conditional OR of exactly 2.5000 at all three usage tiers.
- **Every number quoted in `SCCS_STORY` and `CCO_STORY` is what the tool
  prints**, and the tier arithmetic ("about 28x") checks out.
- **A pipe in an ID or a data value cannot reach a pipe-delimited output line**
  in these two designs — the scripts print only counts, and `analysisCSV`
  renames every column to its role key. Safe, but by accident, not construction.
- **`invalidateMaster()` was attacked and held.** No re-entrancy (there is not a
  single `dispatchEvent` in the file), inert during demo load / `ingest` /
  `renderMap` / design switching because of its early return, and ACNU and ITS
  both still work. Changing `its_cut` after a build deliberately does *not*
  invalidate — `itsOpts()` is read live at `buildScript` time.
- **No new guard refuses legitimate data.** Executed against recurrent events
  (8 per case), a single case, two cases, IDs with spaces and unicode
  (`"李 明 #0"`, `"O'Brien, P #2"`), leading-zero IDs, fractional-year
  person-time, counts x100000, 1:1 and 2:3 matching, 500 cases with two hazard
  windows each.

#### Fixed this run (only the half the other run did not cover)

All executed in Chromium against a local build with real R, before and after.
Both demos still reproduce their advertised numbers to the digit.

- ~~**The master file was a snapshot nothing invalidated.**~~ `buildMaster`
  bakes the mapping, the cleaning ticks and — through `toBin` — the "which value
  means yes" vocabulary into `MASTER`, and `runanalysis` rebuilds only when
  `MASTER` is null. The vocabulary lives in a *different card* from the Build
  button, so flipping which value of a flag means yes after building kept
  shipping the old encoding: the case-crossover reported **2.55 where the answer
  just asked for was 0.39** — a protective drug reported as harmful, across the
  null, with nothing on screen different between the two states. Every cleaning
  tick had the same hole. `invalidateMaster()` now also hides `#expcard`,
  because every download button falls back to rebuilding from a null `MASTER`
  and would have shipped an R script describing a cleaning step alongside an
  empty data file.
- ~~**`read.csv` type-guessed an all-numeric case ID to a number.**~~ Leading
  zeros dropped, low-order digits lost past 2^53, distinct patients merged into
  one stratum. It does not add noise — it slides the self-controlled estimate
  monotonically into the confounded pooled estimate printed on the line below:
  **363 strata 2.991, 182: 3.300, 91: 3.355, one: 3.461, against a pooled row of
  3.46.** At full collapse the design's own contrast row IS the headline.
  `colClasses=c(ID='character')` on both designs; verified that leading-zero IDs
  now give 2.99 with 363 cases where they previously gave 3.30 with 182.
- ~~**The numeric roles had no pre-run guard at all.**~~ `binTrouble` has policed
  the 0/1 roles since the fourth run; `INTERVAL` and `EVENTS` went to R
  unchecked, and `chknum` only refuses a column with NO numeric values. The
  stratum skip inside `sccsfit` tests each case's **total** weight, so a few
  negative rows outweighed by positive ones never trigger it: **five negative
  intervals in 907 rows returned 2.831 (2.39-3.35) against a truth of 3.0** —
  fully formed, plausible, flagged by nothing. `numTrouble()` refuses on screen,
  by column name, with examples, before the master file can be built; R
  re-checks the same conditions.
- ~~**Two roles could resolve to one column**~~ — answered with a green tick, and
  the case-crossover then printed an odds ratio of 2,615,842,843.
- ~~**`LAST` was assigned only on success**~~, so after a failed run the screen
  correctly hid its results while the download buttons stayed live and emitted
  the previous run's estimates.
- ~~**The design suggester recommended a case-crossover on the outcome
  alone.**~~ Ticking only "outcome is acute" set the radio to `cco`, whose
  defining premise is a *transient* exposure — the box the user had just
  declined — and the `why` string named only the outcome, so the condition that
  made the claim false was exactly what was missing. Maclure 1991 (AJE
  133(2):144-153, PMID 1985444) confirmed by search snippet this run; the brief
  had recorded it as never separately searched.

#### The two demonstrations that justified the assumption notes

Both runs added assumption text; these are the executed reasons it was needed,
and they are worth keeping because they quantify the damage:

- An SCCS file with a rising baseline hazard and the drug started once the
  patient deteriorates — **true IRR exactly 1.00** — reported **2.07
  (1.84-2.33)** and closed by telling the reader to report that row. Control
  condition (same rising hazard, exposure window moved to the middle of
  follow-up) correctly returns 1.00 (0.87-1.16), which is the rigging check.
  `SPEC.sccs` has `covariates: false` and four role slots, so there is no way to
  enter an age or calendar term — the crudest possible SCCS is the only one
  fittable.
- A case-crossover file with rising uptake — **true OR exactly 1.00** —
  reported **1.70 (1.47-1.97)**. The unmatched contrast row is *also* elevated
  (1.52), which is arithmetically expected under a genuine trend, so a reader
  using it as a sanity check is reassured rather than warned.
- **The mechanism that hid the one warning that existed**: `CCO_STORY` contains
  a correct paragraph about exposure-trend bias, but `#demonote` is its only
  carrier and `ingest()` at `:871` hides it on **any** real upload. The single
  warning in the tool was visible only to people running fabricated data.

#### What the reviewers disagreed about, and who was right

Two reviewers on disjoint briefs (statistics/prose vs adversarial input), then
each sent at the other's list, then a third at this run's own diff.

- **Six defects were found INDEPENDENTLY by both reviewers from non-overlapping
  briefs**, and each reviewer's own top finding was invisible to the other's.
  **Keep the disjoint split — that is four runs in a row.**
- **The methodologist stopped a fix that would have broken valid data.** The
  analyst wanted `stop()` when any stratum lacks exactly one hazard window. A
  case-crossover legitimately has more than one under **recurrent events**, and
  `clogit` handles a k:m stratum correctly — so that refusal would reject a
  valid design. It is a `RESULT_NOTE` reporting the distribution instead.
- **The methodologist conceded the analyst's worst string outranked its own**,
  and the reasoning is the keeper: `1.00 (95% CI NA-NA)` is self-flagging and
  cannot be copied into a paper; **`1.00 (95% CI 1.00-1.00)` is a point estimate
  of exactly no effect with infinite precision — the one wrong output a reader
  trusts MORE than a right one.**
- **The analyst corrected the methodologist's mechanism.** The SCCS pooled row
  is not "fitted on a different set of rows" — both fits get all of `d`; the
  asymmetry is entirely `if(ni==0) next` inside `sccsfit`. And the *direction*
  varies (one reviewer measured the contrast moving 3.46→4.02, the other
  3.46→2.94), so state the defect, never the direction.
- **The analyst scoped two of the methodologist's findings correctly**: they
  fire only with "Drop rows missing a required mapped variable" **unticked**,
  which ships checked.
- **The analyst refuted its own finding**, which is worth recording: European
  decimals do NOT bite the case-crossover, because that design has no numeric
  role and `toBin("3,5")` → `NaN` → refused on screen. Immunity by poverty, not
  by design — the same structural fact (no time column) is why exposure-trend
  bias is undetectable there.
- **A free detector nobody has built yet**: when the self-controlled and pooled
  estimates coincide, the stratification has collapsed. It catches ID merging,
  ID truncation and whole-cohort export at once. **Do not implement it naively —
  a round-two reviewer showed it fires necessarily on a one-case file, where the
  two estimators are mathematically identical, and on any small file with no
  between-person confounding. Gate it on `ncase >= 3` at minimum.**

#### Round two: the reviewer was pointed at this run's own diff

**Nine for nine. It has never come back empty. Its sharpest finding was again a
regression the diff itself introduced.**

The suggester fix added a `cco` branch guarded by `ck("s_acute") && ck("s_transient")`
— **the identical predicate to the `sccs` branch above it**, which therefore
matched first. The new branch was dead code, so the "fix" did not restore the
case-crossover to the recommender: it **removed the design from the recommender
entirely** while adding a branch that looked like it restored it. All 16 tick
combinations were probed and none yielded `cco`. Shipped fix: delete the dead
branch, let acute-alone fall through with a message naming what is missing.
**When you add a branch, prove it is reachable — probe every input combination.**

Two more of its findings were fixed: `mapmsg` appended only `nt[0].fix` to the
end of the whole list, so with two bad columns the reader saw the event-count
remedy attached to the sentence about their person-time column and the
person-time remedy never appeared; and `numTrouble` skipped blanks while R
refuses them, so with the drop-missing box unticked the user got a green
"Mapping complete ✓" and then a hard R stop at the end of the run — the exact
outcome the guard exists to prevent.

**And the orchestrator found a defect in its own prose by dumping the notes as
RENDERED text and reading them cold** — two strings said "the count **above**",
but `buildReport` emits notes *before* Table 1 (confirmed in Markdown, in the
packed `.docx` XML, and on screen). That is the brief's own recorded species,
committed while fixing it elsewhere. **The lesson is now four runs old: render
the strings and read them; do not read the diff.**

#### Deliberately not done, with reasons

- **A `sp<10` guard on the SCCS pooled contrast row.** The case-crossover twin
  already bounds its standard error (`su<10`); the SCCS pooled row checks only
  `is.finite`. A quasi-separated Poisson stops at a large coefficient with an
  enormous but finite SE, and the row **would** print
  `3323303039256.25 (95% CI 0.00-Inf)` — executed directly against `glm`. It was
  written, then **reverted**: in the shipped pipeline the whole pooled block sits
  inside the branch that only runs when the headline is estimable, and the
  pooled fit separates only when every event falls in one exposure category,
  which makes the conditional fit separate too. **The branch is unreachable and
  shipping it would have been unverifiable churn.** If anyone later makes the
  pooled row print independently of the headline, this guard becomes necessary.
- **Findings 2-7 and 11-13 of the round-two review were against this run's own
  R rewrite, which was DISCARDED in favour of the other run's.** They may or may
  not apply to what shipped and were not re-checked against it. Worth a pass:
  the CCO unmatched row vanishing silently while its explanatory note still
  prints; `Events per case, median` printed `%.0f` (rounds 1.5 to 2) while the
  note tests `< 2` on the raw value, so the table can say 2 above a sentence
  saying half the cases contribute one event; and "N of M case(s) carry the
  estimate" printing in runs whose only estimate row says "not estimable".
- **European decimals are still live for SCCS** (`Number("3,5".replace(/,/g,""))`
  = 35 → IRR 3.58 against a truth of 3.0). `numTrouble` was the natural place to
  catch it and copied the lossy parse instead. Inherited, not introduced, and
  recorded by the fourth run too — but now there is a guard that should own it.
- **None of the hard `stop()` refusals are exportable.** They land in `#routput`,
  the black debug `<pre>`, and `LAST` is nulled, so the Markdown and `.docx` say
  nothing. Consistent with the pre-existing `chk01`/`chknum` behaviour, so not a
  regression — but a refusal the reader cannot forward is half a refusal.
- **Neither demo can exercise its own counting bugs.** `buildSccs` drops every
  zero-event person, so the case-count label is *accidentally* correct on the
  demo; `buildCco` gives every case exactly one hazard window, so the
  discordance count is *accidentally* equal to the truth. Every count on this
  page was validated only against inputs constructed so that all of them happen
  to be right — which is why these survived sixteen runs. A second demo per
  design is a feature, so it is Daniel's call.
### Found 2026-08-23 by the OTHER seventeenth run — same target, same day, independently

**Read the section above first.** Two runs took RWE Studio's SCCS and case-crossover
paths concurrently, from the same `521e7e9`, because the brief is deterministic about
where the rotation gap is. This is that other run. Its commits (`6f6f32b`, `36441e4`,
`5eb7898`) landed first; the section above was then re-authored around them. Neither run
rewrote or reverted the other's work, and the one place they overlapped in code — the
guard on impossible person-time — was merged by hand rather than by taking a side (see
the last item under "Fixed this run").

**The two runs corroborate each other on the things that matter, which is worth more
than either alone.** Independently, from scratch, both concluded: the SCCS conditional
likelihood and `clogit` are algebraically correct and must not be touched; the hard-coded
`1.96` is right for both designs and the fifth run's ITS `t`-vs-`z` finding does **not**
transfer; and the demo stories' quoted numbers are what the tool actually prints. Four
reviewers reached that on four separate implementations.


Sixteen runs had worked the nine builders, the hub, the Protocol Checker twice, and
RWE Studio twice — but both RWE Studio runs took the **cohort/ACNU** path (fourth) and
the **ITS** path (fifth). The `sccs` and `cco` estimation paths had never been opened,
and the fourth run's own open list said so ("SCCS and case-crossover state no
assumptions in their output… the case-crossover also never checks that each stratum has
exactly one hazard window"). That was the rotation gap; this run took it.

Two reviewers on disjoint briefs (the statistics; the applied path from a messy file to
a printed number), then each sent at the other's list, then a third sent at this run's
own diff.

#### Environment: nothing new broke, and one thing to plan around

- Everything the fourth and fifth runs recorded still holds: `sudo apt-get install -y
  --no-install-recommends r-base-core r-cran-survival` works; the WebR CDN, cdnjs
  (SheetJS), unpkg (docx), Crossref/PubMed and the live site are all blocked;
  `npm i --no-package-lock --no-audit --fund=false`; build to `--outDir dist-$$`.
- **The container can restart mid-session.** It did here, killing two `http.server`
  processes and an in-flight reviewer. Commits already pushed survived; the subagent did
  not and had to be relaunched. **Push early**, and expect to re-serve builds.
- **`pkill -f "http.server 87"` killed the calling shell** (exit 144). Serve on a fresh
  port instead of trying to clean up old ones.
- The single most valuable technique this run: **generate the R into a standalone `.R`
  file, test it against real `Rscript` until it is right, then mechanically convert it
  to the JS string literal and splice it in — and afterwards diff `SPEC.<d>.rscript()`
  pulled out of the BUILT page against the `.R` file you tested.** Every commit here was
  verified byte-identical that way. Hand-transcribing R into a JS string is how escaping
  bugs ship.
- Ports used: 8701-8720. Reviewers used 8311/8791 and their own build dirs.

#### Fixed this run

All executed against real R 4.3.3 and Chromium on a local build, before and after.

- ~~**"Drop exact duplicate rows" deleted the design.**~~ **The worst defect either
  reviewer found, and it was in a shared cleaning checkbox that is on by default.** It
  keys on every raw column, so in a long format it deletes data rather than tidying it.
  A person-week SCCS extract — what every standard preparation pipeline emits — lost
  **12,219 of 13,000 rows** and turned a true IRR of 3.0 into a significant *protective*
  **0.73 (0.57-0.94)**; from genuinely null data it manufactured **0.57**. The
  methodologist then found a far better reachability path than the analyst's synthetic
  file: **the shipped case-crossover demo, exported with only the three columns the
  design's own hint asks for**, loses 750 of 2000 rows and reports **1.59 (1.27-2.00)**
  against the demo's true 2.5 — an interval excluding the truth. Both demos are immune
  as shipped **only because they carry decorative columns the analysis never reads**,
  which make every row unique. That is why fifteen runs never saw it.
  **The rule was already written correctly one control lower down**: `renderDupUI` hides
  duplicate-ID resolution for exactly these designs and the prose at `:357` says why. It
  had simply never been applied to the more destructive checkbox above it. Now ACNU-only,
  with the reason on screen. **ITS is included** — it aggregates rows into periods, so an
  identical row there is another event in the same period.
- ~~**SCCS printed its own starting value as a null result.**~~ With no within-person
  contrast `sccsfit` breaks on iteration 1 with `b` still 0, and the caller printed
  `exp(0)` as **`1.00 (95% CI NA-NA)`** — bold, in the estimate cell. Reached by
  filtering an extract to on-drug person-time, or by one summary row per case. A cohort
  extract instead of a case series gave **42793666818367.05**; a wide-format
  case-crossover gave **`1.00 (95% CI 1.00-1.00)`**, a zero-width interval, which reads
  as a *precise* null and is more dangerous than the `NA` beside it.
- ~~**Counts were computed with a different predicate from the likelihood.**~~ Table 1
  said "Cases with exposed and unexposed time | 40 (100.0%)" beside "Person-time exposed
  | 0 (0.0%)", because it tested whether the *label* varied. `Cases (people with >=1
  event)` was `length(unique(ID))`, self-refuting two rows under "Events per case, median
  0 (0-3)". The case-crossover claimed "40 of 40 cases carry the estimate" when 20 did.
  There is now one estimability predicate per design, computed once, used everywhere.
- ~~**A case-crossover never checked its own defining structure.**~~ Two hazard windows
  per case — a duplicated event row from a join — gave a perfectly plausible
  **4.14 (2.52-6.79)** for a design that is not a case-crossover.
- ~~**Monotone likelihoods printed where the solver stopped.**~~ Separation gave
  `482631089086999.56` and `OR 3902846758.45`. The MLE exists only if the sufficient
  statistic is strictly inside its range (`0 < sum(y*x) < sum(n)` for SCCS; `0 < S <
  ninf` for 1:M matched sets) — checked directly now, so the refusal is exact rather
  than a magnitude heuristic.
- ~~**Impossible person-time was silent.**~~ An event in zero person-time adds score
  without information: it inflated a true 2.31 to **9.23** with a *bit-identical*
  standard error. Negative person-time gave `54.60 (NA-NA)`.
- ~~**The fixed-effect cross-check misdiagnosed.**~~ It blamed "a numerical problem —
  check for enormous interval lengths or zero person-time" when the real cause was that
  the design had no contrast at all, sending the analyst to clean already-clean data.
- ~~**Neither design stated one assumption.**~~ `grep -c "Farrington\|Maclure\|Suissa\|
  Whitaker\|case-time-control"` was **0**. Each now states, last and once, what *this
  tool* cannot do: SCCS fits no age or calendar-time term and offers no way to add one
  (`covariates: false`), and the case-crossover never sees window dates, so it cannot
  check the exposure-trend assumption the design stands or falls on. The demo narrative
  already said the latter — but only in the demo panel, which nobody analysing their own
  data ever sees.

#### What the reviewers disagreed about, and who was right

- **The disjoint split paid off a third time and should be kept.** Neither reviewer could
  have found the other's top item: the methodologist's was `1.00` printed from an
  unfitted parameter, the analyst's was a cleaning checkbox.
- **The analyst refuted the methodologist's F8 (profile-likelihood interval) — and the
  orchestrator then refuted the refutation.** The methodologist claimed the Wald interval
  is anticonservative below ~25 events, with `6.268 (1.331-29.517)` against a profile of
  `0.95-25.02`. The analyst ran 574 datasets, found the flips bidirectional (4 vs 2, all
  within 2% of 1.0), reported profile-upper > Wald-upper in 574/574, called the
  methodologist's geometry "backwards" and suspected it had profiled a different
  objective. **An independent implementation reproduced the methodologist's numbers
  exactly** — IRR 6.268, Wald 1.331-29.516, profile 0.946-25.015, profile upper *below*
  Wald upper. Both were right about their own computations: the disagreement is about
  **typicality, not arithmetic**. The methodologist's configuration has extreme
  person-time imbalance (14 days against 351) and few events; the analyst subsampled the
  demo, which does not. **Lesson: when a reviewer says another's example "does not
  reproduce", reproduce it yourself before believing either of them.** Nearly dropped a
  correct finding.
- **The analyst overturned the methodologist's F2 as stated, and the methodologist then
  improved on the correction.** At *exactly* zero person-time the run dies in `glm`, and
  because `WebrEngine` has no `catch` the user sees only "Error:" — so the alleged 9.23
  never reaches the screen. But the analyst found the variant that does: a *tiny positive*
  interval prints 9.23 silently, and the fixed-effect cross-check is blind to it because
  it is handed the same offset and agrees. The finding survived, re-scoped from "the
  fitter is wrong" to "the input is never validated".
- **The analyst refuted the methodologist's proposed fix for the assumptions, by
  measuring it.** Six assumption notes per design fill **59% of the panel** and push a
  refusal to position 9 of 9, below the fold, in the same 11px grey as the boilerplate.
  Its argument is the one to keep: **every note that fires today is conditional on the
  data, so a note appearing means something happened; unconditional paragraphs destroy
  that property in the exact channel the refusals need.** One tool-specific note per
  design was shipped instead of twelve.
- **Refusals belong in the estimate cell, not the notes.** Verified end to end: the panel,
  the Markdown table and a real `.docx` all render `not estimable` in the column the
  reader is already looking at. **Do not put the reason in that cell — a literal `|`
  breaks the Markdown table row.** The reason travels as a separate `RESULT_NOTE`.

#### Round two: the reviewer was pointed at this run's own commits

**Nine for nine. This remains a required step and it has never come back empty.**

**Its top finding was a regression the run's two commits created in combination** — the
fifth run in a row where the diff's own new machinery was the defect, and the first where
two separately-sound commits were only dangerous together. Commit 1 stopped removing
duplicate rows and disabled the control that did it; commit 2 then refused the whole
analysis when any case had more than one hazard window, **naming in its own message the
cause commit 1 had stopped fixing**. One duplicated hazard row in 2000 — 0.05% of the
file — left a case-crossover that returned 2.55 at baseline with **no UI path to an
estimate at all**. **When you disable a remedy in one commit, re-read every refusal that
assumes the remedy exists.**

It also showed the refusals were disproportionate on their own terms: a case with *no*
hazard window contributes nothing to a conditional likelihood anyway, so `clogit` already
handles it — the direct fit on the file this tool refused was 2.552 (2.027-3.212),
identical to the intact demo. **A false refusal is as bad as a false number**, and it was
briefed against explicitly. The rule is now: set the bad *cases* aside and name them;
refuse only when nothing estimable is left. That is strictly better — the methodologist's
zero-person-time file, which used to report 9.23, now reports **2.31 (1.08-4.93)** from
its ten clean cases, and 2.3077 is the truth.

Six more, all executed, all created by this run's diff:

- **Table 1 counts regressed into scientific notation.** `%.4g` — reached for so a median
  could be fractional — turns 12345 into `1.234e+04` and makes 99999 and 100000 the same
  number, printed two lines under an exact `%d` row. **Changing a format string to fix
  the rare case broke the common one.**
- **The tiny-interval note counted against one threshold and printed another**, claiming
  three intervals were shorter than the shortest of them.
- **"Which cases carry the estimate" was asserted on runs that had refused** — and
  travelled into the report under the heading "How the model was fitted". The adjacent
  note *was* guarded, which is what made it an oversight rather than a choice.
- **The case-crossover collapsed two independent conditions into one count**, so a file
  whose only fault was duplicated hazard rows was told none of its cases were discordant
  on exposure when 57 of 60 were. Found by the orchestrator rendering the page, not by
  reading the diff.
- **The duplicate count on screen was taken before the drop-missing filter**, reporting
  rows as "KEPT" that the tool had just removed; and **"repeated person-time" was written
  for all three long-format designs** when a case-crossover row is a window and an ITS row
  is a record inside a period. The code's own comment had it right; the user-facing string
  did not.
- **The disabled checkbox still rendered ticked** beside a note saying it was off. Fixing
  that naively introduced a second defect the orchestrator caught by testing the round
  trip: unticking it lost the user's ACNU preference, so a visit to another design left a
  cohort silently un-deduplicated. It remembers now.

**One thing was built, tested and deliberately removed**: a note counting identical rows.
It fires on the shipped case-crossover demo with "750 row(s) are identical", because a
binary case flag and a binary exposure admit only four distinct rows per case — duplicates
there are *structural*, and the same is true of the person-week layout standard for SCCS.
**A warning that cannot tell a join artefact from the ordinary shape of the design is one
people learn to ignore.** The count stays at the cleaning step, where the choice is made.

**Standing procedure, now four runs old and confirmed again: render every new string and
read it cold.** It found the reassurance note ("the design working as intended, **not a
defect**") printing as the *first* note on a run that had just refused to estimate
anything, and the compound-count defect above. Neither is visible in a diff.

#### Open in the sccs/cco paths, examined this run, deliberately left

- **The SCCS Wald interval versus a profile-likelihood interval — the sharpest thing
  left, and the dispute is already adjudicated.** Reproduced independently: 10 cases, 1
  event each, 2 in a 14-day risk window against 351 control days gives **Wald
  `1.331-29.516` (excludes 1) and profile `0.946-25.015` (includes 1)** — a declared
  signal that is not one. It matters in exactly the regime SCCS exists for: signal
  detection on few events with a short risk window. It does **not** extend to the
  case-crossover (`clogit`'s Wald and the exact profile agree, and its lower limit is if
  anything conservative). **No caption drift**: the demo profile is 2.567-3.489, which
  prints as 2.57-3.49, identical to what ships. `uniroot` returned NA on 0 of 574 datasets
  and degrades gracefully on degenerate ones. A working implementation is in this run's
  scratch. Left because changing the headline interval deserves its own run and its own
  review, exactly as the fourth run left the ITS standard errors for the fifth.
  **The other run's simulation is the other half of this picture and does not contradict
  it**: under the null the Wald interval *over*-covers (rejection 2.3-4.3% against a
  nominal 5%) at 10-300 cases, and that run wrote its own caveat that over-coverage under
  the null does not certify the interval away from it. The configuration above is away
  from it. Whoever takes this should simulate coverage at a true IRR of 2-5 with a short
  risk window, not only under the null.
- **Numeric roles still get no pre-flight check while binary roles do.** `binTrouble`
  covers `BIN_ROLES` only; there is no `numTrouble`, and `validateMap` never looks at
  `NUM_ROLES`. Map SCCS's interval to a text column and you get a green "Mapping complete
  ✓", a master file of 907 rows, and `chknum`'s (well-written) refusal only at the end of
  the run, in the black debug pane, never reaching the report. **The fix is one function
  shaped exactly like `binTrouble` and it would close the next item too.**
- **The European decimal comma is still live on the SCCS path.** `Number(s.replace(/,/g,
  ""))` turns `60,5` into `605` for `INTERVAL` and `EVENTS`. Two findings worth keeping
  straight: a **uniform** rescale of `INTERVAL` is **exactly invariant** in the conditional
  likelihood (confirmed to 12 decimal places — only Table 1's absolute person-time is
  wrong, and even the percentage is right), but a fixed integer risk window against a
  computed fractional baseline inflates the IRR **tenfold** (4.118 → 41.184); and a
  uniform comma in **`EVENTS`** leaves the point estimate exact while dividing the standard
  error by √k (se 0.0797 → 0.0252). That last one is the only silent statistical failure in
  the family and it is the one to fix first.
- **Role dropdowns ignore their own declared `types`.** `opts()` lists every column;
  `types` is used only to pick a default. Mapping SCCS's ID to a *date* column completes
  with no complaint and reports **2.88 (2.14-3.88)** from 261 strata that are calendar
  dates. Enforce the declared types; **do not** try to catch events/interval swapped —
  both are numbers and both are plausible, and that is user error the tool cannot see.
- **`MASTER` and `LAST` are stale for these designs too.** Change a role select after
  building and the panel still shows the old estimates and the exported `.md` carries
  them. `MASTER` also keeps the previous `roleCol`'s coercion. Switching *design* nulls
  both but does not hide `#anaresults`/`#table1`, so SCCS estimates sit under a
  case-crossover heading. Same family as the fourth run's entry; still live.
- **The exports never record the mapping or the cleaning options.** The generated script
  names only `ID`/`EXPOSED`/`EVENTS`/`INTERVAL`, so no source column name appears anywhere
  in the `.md` or `.docx`. This is what makes the de-duplication finding unauditable after
  the fact.
- **`WebrEngine.astro:33` may be discarding every R warning in the whole tool.** It filters
  `o.type === "stdout" || "stderr"`, and `captureR` is called without `captureConditions`,
  which defaults to true — so warnings arrive as condition objects of a *third* type and
  would be dropped. If so, `clogit`'s "Ran out of iterations and did not converge" reaches
  **nothing**, not merely the debug pane. **Unverifiable here** (the WebR CDN is blocked
  and an `Rscript 2>&1` harness shows warnings only because Rscript writes them to stderr),
  and a one-line fix if true. **Highest value per character on either list; check it the
  moment WebR is reachable.** Not shipped, because a change to the shared engine that
  affects all four designs must not go in unobserved.
- **A tiny positive interval still prints a confident number** (9.23 for a true 2.31). It
  is *not* refused, deliberately: person-time in years makes 0.001 legitimate. It carries a
  note naming the rows now. A real fix needs the units, which the tool never asks for.
- **Neither design's demo can make a refusal fire**, and the case-crossover script now has
  conditional diagnostics but no demo that reaches them. The ACNU path ships `buildOverlap`
  + `OVL_STORY` precisely so its diagnostics can be seen firing. **A second demo per design
  is a feature, so it is Daniel's call** — but it is the same gap the fifth run recorded for
  ITS, now true of three designs.
- **`clogit` warnings still do not become `RESULT_NOTE`s**, so they never reach the panel or
  the exports. Partly moot if the item above is true.
- Citations: **still none anywhere in these two paths**, and none were added. Snippet-only
  leads, unverified and **not asserted**: Suissa (case-time-control) PubMed 8728434; Wang
  et al., *Epidemiology* 2011, PubMed 21577117. Crossref/PubMed remain blocked.

### Found 2026-08-23 — clone-censor-weight, second pass (concurrent with the SCCS run above)

**Stop numbering runs; label them by target.** This run and the SCCS /
case-crossover run above were in flight simultaneously, both called themselves
the seventeenth, and by push time that run had also claimed "eighteenth" for its
next piece of work. Ordinals are now actively misleading. The code changes never
overlapped and rebased cleanly — **only this file conflicted, twice.**

Two things follow, both of which cost this run time:

- **`git fetch origin main` and re-read the tail of this file immediately before
  you choose a target**, not at the start of your run. A claim marker may have
  appeared in between.
- **The ship loop at the top of this brief does not survive a conflict.** Its
  `for i in 1 2 3 4 5; … git rebase --autostash -q … || sleep` retries blindly,
  and once a rebase has stopped on a conflict every later iteration dies on
  "there is already a rebase-merge directory" — five wasted attempts and no
  push. Resolve the conflict, `git rebase --continue`, then re-enter the loop.
  Appending a section to the end of this file conflicts with any other run doing
  the same, so expect it.

Sixteen runs had worked the nine builders, RWE Studio twice, the hub twice and
the Protocol Checker twice. CCW was last opened by the **eighth** run, and the
fifteenth run had left an explicitly unresolved item in it: `:501` asserted
"Every clone deviates immediately", copied there from a hub card the fifteenth
run had corrected without fixing the builder it came from. That made the choice.

Two reviewers on disjoint briefs (methodologist: estimands, assumptions,
citations, prose; applied analyst: form plumbing, selects, parsers, refusal
surfaces, exports), both against a frozen `b8fe5b3`, then sent at each other's
lists, then a third sent at this run's own diff.

#### Environment: nothing new broke, and one thing to stop re-deriving

Every trap in the sixteenth run's list still holds exactly as written: `npm i
--no-package-lock --no-audit --fund=false`; `npm pack docx@8.5.0` + `page.route`
for a real `.docx`; Crossref/PubMed/doi.org/WebFetch blocked with `WebSearch`
the only survivor; the live site unreachable; the repo a shallow clone whose
`git log -- <path>` lies about coverage. **The brief remains the authority on
coverage.** Detached HEAD again — `git push origin HEAD:main`. Ports 8611-8729.

- The brief is now over 256KB and **exceeds the Read tool's file-size limit.**
  Read it with `offset`/`limit` — the non-negotiables at the top and the last
  ~400 lines for recent hand-offs. Do not try to read it whole.
- **Splitting one file's coordinated rewrite into topic commits does not work
  here** and cost this run real effort. Four shared constants land in a single
  `-U3` hunk, so hunk-classification produces commits whose messages do not
  match their contents. Commit by file boundary with a complete message instead.

#### Fixed this run

Executed in Chromium against local builds: 31 assertions for the first two
commits (2/31 on the old build, 31/31 on the new) and 30 more for the third.
Word claims were read out of a real generated `word/document.xml`.

- ~~**A time-fixed weight model prescribed for the arm the builder ships.**~~
  Both exports said "a clone in the initiate arm can only deviate at one time".
  Discontinuation, switch and add-on ship **ticked**, and each is a continuing
  requirement, so that arm deviates throughout follow-up and a time-fixed
  censoring model ignores all of it. **This was the only finding on either
  reviewer's list that changes a number rather than a document.** The paragraph
  also named which arm was which although both strategy boxes are free text —
  executed with "Continue statin therapy" vs "Discontinue within the grace
  period", which swaps the roles, in a real `.docx`. One shared string now
  states the rule, lets both strategies land on the same side, and leaves the
  mapping to the deviation rule. The Maringe attribution was **dropped, not
  moved**: it could not be checked from here.
- ~~**The stabilised weight was defined by the unstabilised formula.**~~ Both
  protocols: "a stabilised IPCW — the inverse of its estimated probability of
  remaining uncensored". That is the unstabilised weight. It matters because
  `truncText` commits the primary analysis to untruncated weights, and because
  the mean-range-percentiles diagnostic demanded in the next paragraph is only
  interpretable against a mean near 1.
- ~~**Positivity was the wrong probability over the wrong interval.**~~ Now
  correct under both readings (complementary and non-complementary strategy
  pairs), scoped to wherever artificial censoring can occur, and it records that
  the grace period trades one arm's positivity against the other's — so
  "shorten the grace period" is not a fix.
- ~~**The balance diagnostic named no time.**~~ A weighted between-arm SMD is
  zero at time zero however broken the weights are. Now time-indexed, and
  conditional: with grace blank, invalid or zero it names a defined time instead.
- ~~**`plannedOutputs` ignored the effect measure.**~~ Effect = HR with a
  complete, valid form produced a document naming a hazard ratio in one section
  and commissioning a survival difference and an RMST in another, with **zero
  blockers**. Executed by both the analyst and the round-three reviewer.
- ~~**Three refusal messages.**~~ Grace 0 ("every clone deviates immediately");
  the blank-grace branch three lines above saying the arms "are the same arm"
  while the other said no person-time is shared between them — one state, two
  opposite descriptions, both printed at the top of the Word file and TARGET
  item 1a; and grace ≥ follow-up, whose stated reason was the opposite of the
  failure. It does not leave "no contrast to estimate"; it leaves one strategy
  unenforced, so the contrast is confidently confounded rather than null.
- ~~**The false hazards mechanism, in nine places across three files.**~~ "The
  two arms contain the same people during the grace period, so their hazards are
  equal by construction" is true at time zero and nowhere after. Five sites in
  CCW, `protocol-generator.astro:124` verbatim, and **three in
  `sequential-trial.astro` plus a code comment**, where it appeared in a
  stronger form as a favourable contrast ("forces the two hazards equal until
  the grace period ends"). Correcting CCW alone would have left the site
  contradicting itself across linked pages.
- Smaller: truncation reached the Markdown and not the Word file, so two
  documents from one form disagreed about untruncated weights; the hard-coded
  "Section 13" it carried does not exist in the Word file; Word built its own
  RMST horizon and printed "the horizon ((not specified))"; the exported figure
  description told a protocol reader to "drag" something; the diagram paragraph
  promised follow-up "under each strategy" from a timeline that draws no arms;
  Markdown and Word reported success in green over a document whose first page
  says it cannot be analysed; a seeded amendments log was dropped by the first
  autosave because `readForm` never read it.

#### What the reviewers disagreed about, and who was right

- **The disjoint split paid off a fourth time — one overlap out of ~20.** Both
  found the truncation defect independently, which is why it shipped without
  further argument.
- **The analyst overturned the methodologist's SMD finding.** The methodologist
  called the between-arm SMD "zero by construction"; the analyst pointed out
  every site says **weighted**, and a weighted between-arm SMD among the clones
  still uncensored is zero only at t = 0. It also read "before the primary
  analysis is run" correctly, as a workflow clause rather than a claim about
  baseline. Only the time-indexing shipped.
- **The methodologist retracted its own prescription** after searching the
  literature: a between-arm weighted SMD **is** the check CCW papers report, at
  the end of the grace period, and it withdrew its round-one proposal to
  substitute a within-arm-over-time diagnostic — *"prescribing a diagnostic no
  one uses, in a document an analyst will implement, is a worse error than the
  one I was fixing."* **Both reviewers changed their own answer under pressure;
  that is what round two is for.**
- **The methodologist killed the analyst's biggest finding using the shared
  component's own documentation.** `ProtocolCommon.astro:25-29` states that
  HARPER item 3 "IS SATISFIED WITH NO BUILDER CHANGE AT ALL" and that "no
  amendments have been made" is "the correct claim for a first draft, not a
  placeholder" — verified before acting. A user on their third revision is not
  editing a stored v2, they are generating a fresh v1 from changed inputs, so
  the export is not lying. **`mountAmendments` stays uncalled: mounting it is a
  feature.** Only the `readForm` one-liner shipped.
- **The methodologist's supporting evidence was wrong twice while its
  conclusions held** — the standing pattern. It attributed "per-protocol
  analogue" to a copy-paste from `active-comparator-new-user.astro:826`, which
  reads "On-treatment (per-protocol)"; and its clincher for the hazards finding
  ("the estimate would be identically zero for any τ ≤ grace") does not follow,
  as the analyst showed. **Check the quote, not just the claim.**
- **The analyst withdrew its own weakest finding** (shipped defaults exporting
  as authored decisions) rather than defend it, and salvaged the one defensible
  residue: the defaults are a *configuration*, and two of them are mutually
  incoherent.

#### Round three: the reviewer was pointed at this run's own commits

**Nine for nine.** The sharpest finding was again **damage the run had just
done**, and twice it was the same error class the run had set out to delete:

- **Builder-UI register shipped into both protocols.** The paragraph written to
  stop the exports naming arms ended "three of the censoring events THIS BUILDER
  offers … THIS TOOL cannot tell … because both are FREE TEXT". Before this run
  no exported string on the page contained that vocabulary. `truncText`, moved
  into Word to fix a real defect, took "the sensitivity analyses YOU wrote" with
  it. **When you move a string to a new surface, re-read it in that surface's
  register — a document has no "tool" and no text boxes.**
- **The HR caveat reintroduced the deleted error in softer clothing**, claiming
  a single HR "averages a stretch in which the effect is null by construction".
  There is no such stretch. The run's own sequential-trial comment said so.
- **The sequential-trial rewrite made its own contrast vacuous**: "there the
  curves are pinned together at time zero" is true of every design including
  that one, so it distinguished nothing. What is specific to cloning is that
  both arms hold the **same patients**, so the hazards coincide at the origin.
  **Replacing a wrong mechanism with an empty one is not a fix.**
- Two new blocker messages assumed the deadline is the only way to deviate,
  contradicting the deviation-schedule string sixty lines above them **in the
  same commit** — the "new shared machinery and a new caller written without
  reference to each other" shape the brief warns about.
- Sharing two strings with Word silently stripped the Markdown's bold from the
  assumptions lead and the entire HR blockquote. **The Markdown-markers trap
  runs in this direction too.**
- `groupBy` became a 216-character sentence in a field the shared component
  documents as a Table 1 *column label*, and its em-dash aside attached
  "identical across arms" to the wrong noun.
- The checks panel printed "You have chosen the hazard ratio. Caveat on the
  hazard ratio." — a heading baked into a string for two other surfaces.
- Two comma splices and a dangling "it" in new on-screen prose. **All four of
  the last items were invisible in the diff and obvious on the page.**

#### Open in CCW, examined this run, deliberately left

- **`SENSITIVITY[0]` pre-specifies "censor at discontinuation (>90-day gap)"
  while `fudays` ships at 90**, so the default protocol commits to a sensitivity
  analysis that cannot occur under its own default design. Both reviewers
  confirmed the arithmetic. **Not fixed, and the reason is a trap worth
  recording: these checkbox values are the strings stored in saved drafts and
  matched on restore (`val.includes(n.value)`). Changing the text would silently
  untick that analysis in every existing draft** — the "saved draft carrying a
  removed value" bug class this brief hunts. `IPCW_REASONS` already solves this
  with a stable `v` and a separate display `l`; `SUBGROUPS` and `SENSITIVITY` do
  not. Giving them the same treatment is the prerequisite for ever editing one.
- **`PC.mountAmendments` still uncalled here and in six other builders** —
  examined properly this run and **judged correct, not outstanding**, per
  `ProtocolCommon.astro:25-29`. It should stop being listed as a defect.
- **Shipped defaults export as authored decisions** (grace 14, look-back 365,
  follow-up 90, pre-ticked subgroups/sensitivity/IPCW events). Raised by the
  analyst, withdrawn by it, and left: blanking them destroys the starter
  template, and tracking "untouched" is a feature.
- **Tap targets**: the two `📚 Library` buttons are 17px and the fifteen `+`
  quick-add chips 23px, against a WCAG minimum of 24. Measured, not fixed.
- **Row look-backs are rounded silently** — `rnd` in `computeChecks` covers the
  three numeric boxes but not `covlist`/`excllist` rows, so `365.7` becomes 366
  with no "Rounded to whole days" line, and the next chip click writes it back
  over the user's text. Real, worth ~0.7 of a day.
- **The Maringe 2020 attributions remain unverified from this sandbox** — that
  the paper advises against a simple Cox model *for the reasons now given*, and
  that its worked example reports the survival and RMST differences at one year.
  Unchanged, not asserted anew, and one attribution was deleted rather than kept
  on faith. `REFS` itself was re-checked entry by entry and is sound
  (snippet-only). **Gaber 2024 and Gran 2010 are still cited nowhere in the
  text** — the analyst argued that is normal for a bibliography and it was left.
- **Nothing was verified against the live site**, which is unreachable from
  here, and nobody has still ever opened one of these `.docx` files in Word.
### Found 2026-08-23 by an eighteenth run — the SCCS interval, the item the seventeenth run reserved

The seventeenth run's open list called the Wald-versus-profile question "the sharpest thing
left" and left it for a run of its own, "exactly as the fourth run left the ITS standard
errors for the fifth". This is that run. It also took the decimal comma, which the same list
called "the only silent statistical failure in the family and the one to fix first".

**Eight commits, and three of them fix defects this run itself created.** Read the
self-inflicted section — it is the most useful part.

#### The collision mitigation works and costs thirty seconds

The seventeenth run lost ~40% of its output to a concurrent run picking the same gap, and
suggested staking a claim first. This run pushed a one-line claim marker into this file
**before doing any work** (`9d00f3e`, removed at the end). A concurrent run did fire, and it
took clone-censor-weight instead. **Do this every time.**

#### The adjudication the seventeenth run asked for: both prior runs were right

Reproduced independently: 10 cases, 1 event each, 2 in a 14-day risk window against 351
control days gives **IRR 6.268, Wald 1.331–29.517, profile 0.946–25.015** — the seventeenth
run's numbers to the digit.

**The variable that separates the two prior runs' opposite conclusions is person-time
imbalance, not sample size.** With a 14-day window and few cases the Wald interval is
anticonservative; with a 90-day window it is fine at every size (2.5–4.9% against a nominal
5%), which is why a simulation using a wider window found it over-covering. Away from the
null (IRR 2/3/5, 20 000 reps, MC se 0.0015) the likelihood-ratio interval covers 0.946–0.977
and the Wald 0.935–0.968.

**A 4000-rep run showed a 0.938 coverage dip for the profile interval that did not survive
20 000 reps (0.947). Do not chase small-n coverage dips without replicates.**

#### Shipped

- **The SCCS headline interval is a profile-likelihood (likelihood-ratio) interval**, and so
  is the pooled contrast row. Profiling the intercept out of a log-link Poisson with an
  offset leaves `Sx*b - N*log(sum(tau*exp(b*x)))`, which is **the same function over a single
  stratum** — one implementation serves both. Checked against re-fitting the glm with the
  coefficient held fixed in the offset: identical to 8 decimals.
- `sccsll()` uses `rowsum()`, not `split()`, so the interval costs about what the fit costs.
  `profl()` brackets outward in units of the Wald SE, so it is scale-free — days, years and
  seconds give identical limits.
- **The estimability guard already makes the limits finite.** `0 < Sobs < Stot` rules out a
  monotone likelihood before `profl` is called. A reviewer found `pok` TRUE in 3280/3280
  files and argued the Wald-fallback branch is **unreachable**; it is kept, and announces
  itself if it ever fires.
- **The decimal comma is refused on screen** — see the self-inflicted section for how badly
  the first attempt failed. Western (`1,234`) and Indian (`1,23,456`) grouping still build.
- **`%.2f` on the estimate row is gone.** It printed a strongly protective rate ratio and
  both its limits as `0.00 (95% CI 0.00-0.00)`, and rounded a lower limit of 0.00568 to 0.01.
  Now `%.2f` above 0.1 and three significant figures below.
- **The `factor(ID)` cross-check is bounded at 300 people.** It costs rows × people²:
  0.73s at 250 cases, 4.9s at 500, 40.7s at 1000, **336s at 2000** in native R, against 0.1s
  for the estimator it checks — and it sits *before* Table 1, in an engine with no timeout.
  Above the threshold the same likelihood is re-maximised with a different optimiser (O(rows)).
  A 1500-case file went **45.2s → 0.5s**, identical estimate.
- **Stale results no longer come back from the dead.** `invalidateMaster` hides eight panes;
  the design radio and `setData` hid only the containing card, and `buildMaster` re-opens it.
  All three now call one `hideResults()`.
- **Table 1's person-time rows are computed over the cases**, so the note claiming they are
  is true. On a cohort extract: `Person-time exposed 27360 (62.5%)` → `960 (8.2%)`.

#### The three defects this run created, and how each was caught

**This is the fifth run running where the diff's own new machinery was the worst finding.**

1. **The comma guard could not fire on a CSV — the only format it was written for.** Found
   independently by *two* reviewers. It read `DATA.rows`, but every file enters through
   SheetJS, which resolves `"14,0"` to the number `140` at parse time; the guard's first
   line skips numbers. **The commit message's own verification did not reproduce**, because
   it drove the page with `setData(DATA.columns, DATA.rows.map(f))` — injecting strings and
   bypassing the parse every real upload takes. **A guard on uploaded data must be tested by
   uploading a file through `#file`, not by calling `setData`.** The text survives on the
   cell as `.w`; `sheet_to_json` exposes it with `raw:false`.
2. **A sentence generalised from one file.** The note claimed that with a longer risk window
   or a few hundred cases the two intervals "agree to two decimal places" — from watching the
   demo print 2.57–3.49 either way. Measured: identical to 2dp in **0.0%** of 3000 files at
   300 cases, and they still disagree about excluding 1 for **1.02%** of files at a thousand.
3. **A simulated percentage no one could reproduce.** The note quoted "11.2 percent at 10
   cases". Three independent re-implementations got **6.5, 7.0 and 14.1**. The spread was the
   finding: this run's generator drew 10 *people* (≈7 cases) while the prose said 10 *cases*,
   and the figure swings 15%→4.5% with the baseline rate alone. **A number that cannot be
   reproduced from its own description does not belong in a document a reviewer may quote.**
   Replaced by the exact worked example (10 cases → 6.27, Wald 1.33–29.52, LR 0.95–25.02).

Also caught by **rendering the panel and reading it cold**: "The interval above" was singular
above a two-row table, and a companion note quoted Wald limits without saying which row.
**That procedure is now five runs old and has never failed.**

#### Method notes worth keeping

- **Three reviewers on disjoint briefs, then one at this run's own diff. Ten for ten.**
- **Reproduce a reviewer's challenge yourself before believing either side.** Reviewer A said
  this run's percentage was wrong; running it directly showed *why* (people vs cases), which
  neither the reviewer's number nor this run's original had isolated.
- **Test visibility by forcing the ancestor open.** Both stale-panel paths read `hidden`
  while `#anacard` is closed and only misbehave once `buildMaster` opens it.
- Verification loop: extract `SPEC.sccs.rscript()` / `buildScript()` from the **built** page
  with Playwright, run under real `Rscript`. A real `.docx` was generated via
  `npm pack docx@8.5.0` routed over the blocked unpkg CDN. SheetJS was likewise served from
  `npm pack xlsx@0.18.5`. **Building the pre-change commit in a git worktree and diffing the
  generated R per design is a cheap, strong regression proof** — cco/ITS/ACNU came back
  byte-identical.
- The live site was **not** checked; `danielhttsai.github.io` is blocked.

#### Open, examined this run, deliberately left — ranked

- **The interval is not a 95% interval under recurrent events.** A reviewer measured coverage
  falling from 95.2% to **70.8%** (intervals 42% too narrow) when a case's repeat events are
  clustered. The tool takes an event *count* per interval, prints `Events per case` up to 8 on
  its own demo, and offers no first-event-only option, no cluster-robust SE and no
  overdispersion check. **This is the largest remaining statistical defect and it is not an
  approximation issue — the Wald→profile change does not touch it.**
- **The closing assumption note misattributes the tool's limitation to the design.** It says a
  self-controlled series "assumes each person's underlying rate is constant across their
  observation period". Standard SCCS does not — age and calendar effects are handled by
  splitting person-time, which the sibling builder
  `src/pages/tools/self-controlled-case-series.astro:200` states correctly. **Two pages of
  this site give contradictory accounts of the method.** That builder also lists recurrent-event
  independence as assumption 3, cited to Whitaker 2006.
- **The differential-missingness warning is unreachable by default.** `c_dropmiss` ships
  ticked and deletes the rows in JS before R can count them, so `ndropna` is 0. A reviewer
  blanked the exposure on the exposed interval of 120 cases: **2.99 → 3.28 (2.71–3.98)**, the
  interval excluding the truth, with nothing on screen.
- **Role dropdowns still ignore their declared `types`** — `types` is referenced once, in
  `suggestCol`, for a default. Mapping the case ID to a *date* column on a file with a true
  IRR of **1.00** gives **2.45 (2.26–2.65)** from 36 strata; to a binary column, 2.52. A
  one-line change in `opts()` closes it, **but it is global and was not checked against the
  other three designs.**
- **The self-controlled/pooled collapse detector is still unbuilt**, and the mis-map above is
  exactly what it catches (the two rows agree to 2dp on a 600-case file, far above the
  `ncase>=3` gate). It is now *more* visible: on a sparse file both rows print the same number
  **and** the same interval.
- **Hard `stop()` refusals still cannot be exported** — `LAST` is nulled, `#expcard` stays
  visible, and the `.md` says "(run the analysis first)". Reachable from a default-on
  checkbox: untick "Standardise coded flags" on a `Y`/`N` column and `chk01` stops. The *soft*
  refusals travel correctly.
- **The two "reproducible" exports do not run together.** `analysis.R` reads `/data.csv`
  (WebR's VFS root) and the master-file button emits *source* column names, while the script
  expects role keys. Both break; there is no download for the CSV the script actually reads.
- **No export records which column filled which role, or which cleaning options were on**,
  while the page claims at `:343` that each fix "is logged and re-emitted into the exported R
  script". **This is what makes every parsing defect above unauditable after the fact.**
- **The tiny-interval guard cannot fire on the error it names.** `thr <- max(INTERVAL)/1e4` is
  52 minutes on a 365-day file; a 1-day interval among 30/60/120-day ones moved the demo from
  2.99 to **7.59**, interval excluding the truth, silently. **Examined and left deliberately:
  every threshold that would catch it also fires on a legitimate short risk window, which is
  the design's normal shape. A false refusal here is as bad as a false number.**
- **The refusals are a conditioning event.** At 50 cases and a 7-day window under a true null a
  reviewer measured **35% of files refused** and a mean log-IRR bias of **+0.32** among the
  survivors. In a signal-detection screen the reported IRRs are systematically inflated. The
  tool also tells the user to "report an upper bound instead" and computes none — `profl` is
  now right there and a one-sided LR bound is a two-line change.
- **`Sobs` is never reported.** It is the sufficient statistic, it governs the two refusals,
  and how far the Wald and LR limits diverge is essentially a function of it (median
  discrepancy 143% at 1–2 exposed events, 2.5% at 21–50).
- **`%.2f` is still live on the case-crossover and ACNU estimate rows** (`:1783`, `:1429`,
  `:1449`, `:1458`). Same defect, out of this run's scope.
- **`profileColumn` prints `min Infinity · max -Infinity`** for every text-coded binary
  column, beside a green tick, in the first panel the user sees.
- **`WebrEngine.astro:33` may discard every R warning** — still unverified, still the highest
  value per character. WebR's CDN is blocked.
- **Apostrophes are stripped from every note** ("each person s underlying rate") to dodge
  quote-escaping, and travel that way into the `.docx`. `qraw` at `:1270` already exists.
- Citations: **still none in this path.** A `WebSearch` corroborates the mechanism in general
  ("the larger the imbalance in the expected numbers of events in risk and control periods,
  the worse the small sample bias") but nothing states a head-to-head recommendation for LR
  over Wald intervals in SCCS, so **none was asserted** — the note reports this run's own
  worked example instead. Snippet-only leads: Farrington, *Biometrics* 1995;51(1):228-235,
  PMID 7766778; Whitaker et al., *Stat Med* 2006;25(10):1768-1797, doi 10.1002/sim.2302.

### Found 2026-08-23 — the draft-restore and `?seed=` hand-off path (shared code + six builders)

**Chosen by rotation.** Every builder and both other tools had had a dedicated
run; the path that puts values *into* a form never had. It is one shared
implementation plus six hand-written copies of the same loop, and the copies had
drifted from the shared one in the usual direction. It held the worst defect
this run found — one that needs nothing to be stale, malformed or unusual, and
that fires when the feature is used exactly as designed.

Two reviewers on disjoint briefs (methodologist: estimands, refusal prose,
citations; applied analyst: form plumbing, parsers, silent drops, exports), both
against a frozen `cbb1290`; then a fourth agent sent to adjudicate where they
disagreed, and a third sent at this run's own diff.

#### Environment: three new traps, all of which cost this run real time

Every trap in the previous runs' lists still holds exactly as written. Three
additions, in order of how much they will cost you:

- **`astro build` does not parse the contents of an inline `<script>`.** A stray
  `*/` left mid-comment in `ProtocolCommon.astro` killed `window.PC` on all nine
  builder pages and the build reported success in green. **A clean build proves
  nothing about these files.** The gate takes nine seconds: load every tool page
  in Chromium, assert zero `pageerror` and `typeof window.PC === "object"`. Write
  it once and run it before every commit that touches a `<script>` — it caught
  this within a minute of the edit, and nothing else would have.
- **`[data-preview]` is not the export node on every builder.** **CORRECTED
  2026-08-23: the split is 4 / 5, not 7 / 2 — the list below was wrong when it
  was written, and a reviewer following it lost a sweep to it.** Verified by
  grepping all nine files: **`[data-preview]`** on ACNU, case-crossover,
  descriptive-analysis and SCCS; **`#preview`** on case-control,
  clone-censor-weight, **interrupted-time-series, sequential-trial and
  trend-in-trend**. Prefer
  `document.querySelector('[data-preview]') || document.querySelector('#preview')`
  and never hard-code either. A test
  reading the wrong one gets `""`, so every "is the bad string present?"
  assertion passes — *in both directions*, giving you a clean "before" and a
  clean "after" and an entirely fictional result. This produced a false negative
  in one reviewer's first cross-builder sweep and again in this run's own merge
  test. **Assert the preview length is non-zero before believing any export
  claim.**
- `git add <file>` stages the whole file, so two topics in one file become one
  commit whose message describes one of them. Splitting afterwards worked and is
  cheap: `git reset --soft HEAD~1 && git reset`, split the diff by hunk with a
  five-line Python script, `git apply --cached` the first commit's hunks, commit,
  then `git add` the rest.

#### Fixed this run

- ~~**A `?seed=` link unticked every default-ticked box on the page.**~~ The
  worst thing found this run, and the one that needed nothing to go wrong first.
  `el.checked = (state[name] || []).includes(el.value)` ran unconditionally in
  ACNU, case-crossover, SCCS and descriptive-analysis, so a key **absent** from
  the state object was read as "the empty set" rather than as "not mentioned".
  Opening a link carrying the three fields a colleague had actually written down
  unticked **67 of 67** boxes on ACNU — all 41 covariates, the censoring rules,
  the inclusion and exclusion criteria, the subgroups and the sensitivity
  analyses — and 9, 9 and 11 on the other three. The exported protocol then read
  "**Baseline covariates** _(none specified)_" with the next sentence promising
  SMDs "across all covariates", and an on-treatment analysis with no censoring
  rules; seven empty `_(none specified)_` blocks and **no warning anywhere**.
  Seeding a proposal from elsewhere is what `?seed=` is *for*, and a seed will
  never carry 67 ticks, so the feature deleted the page's starter template every
  time it was used as designed. The five builders delegating to `PC.applySeed`
  were always right — it skips keys the seed does not carry. Fixed with
  `Object.prototype.hasOwnProperty.call(state, name)`, **not** `!== undefined`:
  `readForm()` pre-seeds every multi key with `[]`, so a saved draft always owns
  the key and a deliberate untick still restores as unticked. The `multi` Set in
  `writeForm` and the one in `readForm` were checked against each other in all
  four files and match exactly — that is the precondition, so re-check it if you
  add a group. Measured on all nine builders before and after; the untick and
  the explicit-empty-seed cases were re-measured on both builds and are unchanged.
- ~~**ACNU: a saved choice the page no longer offers, erased by the render that
  hid it.**~~ Assigning a `<select>` a value matching no `<option>` leaves
  `selectedIndex = -1`: the box renders empty, the control contributes nothing to
  FormData, and each export's `|| "…"` fallback names a definite choice. A draft
  carrying `effectMeasure "OR"`, `indexDateChoice "first-dispensing"`,
  `metaMethod "random"` and `sex "F"` blanked eight of the thirteen selects and
  the protocol asserted an index date, a sex eligibility criterion, a five-year
  follow-up cap and DerSimonian-Laird pooling nobody had chosen. **The reason it
  survived seventeen runs is that it erases itself**: `render()` runs immediately
  after restore and saves `readForm()` — which omits every blank select — back
  over the draft, so on the next load the keys are absent, the selects show
  their authored defaults, and the export reads "Effect estimate: Hazard ratio
  (95% CI) from Cox proportional-hazards models" where the draft said OR. One
  reload and there is no blank box and no refusal left to notice. ACNU now keeps
  the markup default, carries the report under a reserved `__staleSelects` key
  `readForm` cannot see, and prints a red blocker naming the field, the dead
  value and what the field now says — **in the words shown in the box, not the
  raw option value**, because nobody can confirm a choice called "re" or
  "federated". Answering retires it; a Keep button retires one the user is happy
  with, since re-picking the option a select already shows fires no `change`.
- ~~**ACNU: four readings of one dropdown, disagreeing about whether it had an
  answer.**~~ The PS-calibration section read `s.effectMeasure` as `!== "RD"`, as
  a four-entry lookup with `|| "HR"`, as `=== "HR"`, and as `=== "HR" ||
  !s.effectMeasure`. Unset, those go four ways at once: the lookup substituted
  "HR" while `=== "HR"` stayed false, so the collapsible branch ran with measure
  "HR" and indexed a three-entry map that has no HR key. The document printed
  "**4. Your effect measure is collapsible…** undefined is collapsible — it is
  the odds ratio and the hazard ratio that are not — so Wan's non-collapsibility
  bias does not apply": a literal `undefined`, a heading asserting a property of
  a measure the same document calls unspecified, and a false all-clear retiring a
  bias source for the one measure it applies to. The fourth reading shipped five
  `coxph()` lines in the generated R under a Section 8 reading "(effect measure
  not specified)". One resolved measure drives every branch now, and `em` — null
  exactly when the value is not one of the four offered — is the only thing
  allowed to answer "do we know?". All five states rendered and read on the page.
  **Reach is narrow** (the whole block is gated on the optional `pscEnable`
  checkbox) and the adjudicator was right to say so; it was fixed because a
  literal `undefined` in a protocol is indefensible at any reach, and because
  ruling one option out is never a way to assert a positive fact about a dropdown.
- ~~**`?seed=paste` destroyed the saved draft while the panel promised it
  wouldn't.**~~ `restore()` returned "paste" without loading the draft, and the
  caller's first `render()` autosaved the default form over it — so merely
  *opening* a hand-off link, pasting nothing, emptied the form and storage on the
  four builders with no inline second restore loop. The panel on screen at that
  moment said 你目前的草稿在套用前不會被改動 — your current draft will not be
  modified before you apply. **The first fix for this was wrong and worth
  recording**: taking a `.before-seed` copy on arrival meant a second visit
  overwrote the copy with the wreckage the first visit left, so the recovery
  button restored an empty form while a green notice promised otherwise.
  Backing up on arrival cannot work, because nothing distinguishes a real draft
  from the defaults a previous visit saved. The shipped fix loads the draft on
  the paste path, so the autosave writes back what it read, nothing is displaced,
  and the panel's original promise is true as written. The copy is taken in
  `pastePanel` at the moment something is actually pasted — once. A paste now
  also `form.reset()`s first, which fixes the merge below.
- ~~**A paste merged into whatever the reader was already writing.**~~ On the
  five builders whose own restore loop loads the draft when `seeded === false`,
  pasting a colleague's protocol over an open draft produced one document naming
  two studies: title "COLLEAGUE STUDY SGLT2i" with population "MY OWN POPULATION
  T2DM adults", with nothing to say so. A paste resets to the markup defaults
  before applying, which is where a `?seed=` link lands too, so both hand-off
  routes now agree that an unmentioned field means the page's default rather than
  the last reader's text. Verified on case-control and clone-censor-weight:
  the population survived the paste before, and is gone after.
- ~~**Case-control checked seven things for completeness and not the one its own
  comment names.**~~ The comment above `missing()` says a protocol without a case
  definition, an index date or a control-sampling rule is not a protocol; the
  list had no entry for the sampling rule. With a stale scheme, three sentences
  refused correctly while the document carried no incompleteness banner and
  section 8 still named conditional logistic regression. `missing()` is the one
  place that reaches the preview, the Markdown and the Word file together.

#### What the reviewers disagreed about, and who was right

- **Ranking.** The methodologist put the ACNU blank-select assertions at the top
  and the `undefined` sentence with them; the analyst put the checkbox wipe
  joint-top. **The analyst was right, on reachability**: the wipe needs one click
  on an ordinary, correct link and has no downstream guard at all, while the
  `undefined` sentence additionally needs an opt-in section to be ticked. Rank by
  what a user actually hits, not by how bad the sentence reads.
- **`case-control`'s sampling select.** The methodologist filed it as a *negative*
  finding — already fully defended at export level, and warned that a fixer would
  add a contradictory second refusal. **That was wrong**, and a wrong "nothing to
  see here" is the expensive kind: three consumers refuse, the fourth
  (`analysisText`) names a definite analysis, and `missing()` omitted the field
  entirely. Fixed above.
- **`ProtocolCommon`'s shared defaults.** The methodologist said they can never
  fire because each builder's `pcOf()` always supplies non-empty strings. **Also
  wrong**: five builders pass `data: s.data` raw, so `nz(s.data, "(data source)")`
  really does print "**Data source(s).** (data source)."; and `studySize`,
  `dataMeta`, `ethics` and `registration` are absent from every `pcOf()`.
  Left deliberately — see below.
- **The re-save trap after this run's fix.** The adjudicator claimed all four
  landed fixes leave it intact. **Half right.** Re-measured on both builds and
  both entry paths: before, three selects blank on load 1 with nothing said, and
  by load 2 the draft silently reads `{sex:"both", effectMeasure:"HR",
  arch:"federated"}` with no trace; after, no select is blank, three red lines
  appear on load 1 **and are still there on load 2**, and `__staleSelects` is
  carried in the draft. The draft does still end up holding the substituted
  values — that is unavoidable, since the form must hold something and
  `readForm` is FormData-derived — but it is now recorded and reported instead of
  silent, which is the whole of the fix and what the on-screen line says.
- **Raw option values in refusal prose.** The methodologist found ITS,
  sequential-trial and trend-in-trend printing `"RDRMST"`, `"poisson"`, `"ITT"`
  where SCCS and case-crossover print labels. Correct about the *substituted*
  half and it was applied to this run's own new ACNU strings. The adjudicator's
  qualification is right and worth keeping: the **saved** half must stay raw in
  all five, because there is no label for an option the page no longer has.

#### Round two: a reviewer sent at this run's own diff

Seven for seven now. It found three real defects, all invisible in the diff:

- **The `surv` fix was a no-op and the commit message said otherwise.**
  `m.ratio && m.measure === "HR"` is the same expression as the
  `=== "HR" || !s.effectMeasure` it replaced, because `measure` is `em || "HR"`.
  The generated R was byte-identical before and after while the commit claimed
  the contradiction was gone. **Diff the OUTPUT, not the expression** — this run
  had already diffed the exported Markdown for all four measures and found it
  identical, and read that as confirmation rather than as the warning it was.
- **Retiring a blocker on a `change` event misses everything the page writes to
  itself.** The library picker (`el.value = …; render()`) and the diagram's
  follow-up drag both set selects without firing `change`, so the red line
  survived and then called the option the user had just picked "a specification
  nobody chose". Retire by value, not by event.
- **One button at the foot of the panel, four lines each calling it "the button
  below to confirm the one it was left at".**

It also found four defects in the *first* version of the paste fix, which this
run had already replaced before the review landed (the arrival-backup design).
Worth knowing the review was right about all four.

#### Open, examined this run, deliberately left

- ~~**Five builders still ship a cohort-flavoured power paragraph.**~~ **DONE
  2026-08-23 — see the run at the end of this file.** All five now supply their
  own, and the citation worry recorded below turned out to be surmountable:
  most of what needed saying follows from the structure of the design and needs
  no source at all. Original note kept below for the reasoning. `tailSections`
  in `ProtocolCommon.astro` defaults `studySize` to "Power is assessed per data
  source from observed exposure and outcome frequencies in a pilot extraction;
  the study targets ≥ 80% power to detect the smallest clinically important
  effect at a two-sided α = 0.05." No builder has a control for it. ACNU skips
  the section; ITS, trend-in-trend and descriptive-analysis supply their own
  design-specific text (earlier runs did that work, which is the precedent);
  **SCCS, case-crossover, case-control, clone-censor-weight and sequential-trial
  print the generic sentence** — measured on all nine. It is wrong in the same
  way it was wrong for ITS: an SCCS is powered by the number of exposed cases and
  the ratio of risk to control person-time, not by exposure and outcome
  frequencies per data source. **Not written, deliberately**: five design-specific
  power paragraphs need citations, and Crossref/PubMed/doi.org are blocked from
  this sandbox, so writing them here would mean writing them from memory. This is
  the sharpest well-scoped piece of work left, and the pattern to copy is already
  in `interrupted-time-series.astro:471` and `trend-in-trend.astro:382`.
- **`case-control` and `clone-censor-weight` still have no stale-select capture.**
  Both have exactly one `<select>`, and both already refuse downstream, so the
  damage is limited to the user not being told which dead value was dropped —
  much less than ACNU's thirteen. `clone-censor-weight.astro:615` has a genuinely
  dead branch because of it: `blank(s.effect) ? "empty" : "…" + s.effect + "…"`
  can never take its second arm, since a blanked select is omitted by FormData
  and `s.effect` is always `""`. Capturing at restore is what makes that branch
  reachable.
- **SCCS and descriptive-analysis never persist their `staleSelects`.** They have
  the capture but no `__staleSelects` round-trip, so the warning appears once and
  is gone after one reload while the protocol keeps describing the substituted
  choice. case-crossover, ITS, sequential-trial and trend-in-trend all persist it;
  ACNU does now. Measured across three consecutive loads on all six.
- **descriptive-analysis's stale warning never reaches its exports.** Its
  `computeChecks` is consumed at exactly one site (the on-screen panel) while the
  documents read `blockers()`, which never mentions `staleSelects`. Confirmed
  against the rendered export. Its neighbours all carry it into the document.
- **`applySeed`'s silent-drop inventory**, executed against synthetic forms and
  ranked by whether anything today can reach it. Reachable: an unparseable
  `type=number` becomes `""` while `checkValidity()` returns true; an object
  value writes the literal `[object Object]`; a radio group given an unknown
  value leaves every radio unchecked with not even an empty box as a cue (one
  group exists, `sccsAnchor`). **Not reachable today**: `<select multiple>` and
  `type=date` exist in none of the nine forms, and the `"1"/"on"/"true"`
  over-checking only bites a multi-box group, while the two colliding values
  (`pscEnable`, ITS's `controlled`) are single boxes. Also silent and currently
  unreachable: a field named `length`, `elements`, `item` or `namedItem`
  resolves through `form.elements[k]` to a Number or a Function and is skipped.
- **ITS, sequential-trial and trend-in-trend name raw option values** ("RDRMST",
  "poisson", "ITT") where SCCS and case-crossover name labels. The *substituted*
  half should be the label — that is what the user can read, and it was applied
  to this run's new ACNU strings. The *saved* half must stay raw in all five,
  because there is no label for an option the page no longer has.
- **`case-control`'s `analysisText` names a definite analysis with the sampling
  scheme unset**, and the two reviewers split on it. The methodologist: it is
  statistically right, because conditional logistic is the correct fit under both
  risk-set and cumulative sampling given individual matching, and what the scheme
  determines is what the odds ratio *estimates* — which is already refused, so
  refusing the analysis too would delete a true statement. The adjudicator: it is
  wrong outright if the intended scheme was case-cohort, which needs Prentice
  weighting. **Both are right, and the disagreement is only about the unchosen
  case.** Resolved for now by making the document say it is incomplete, so nobody
  reads the sentence as settled; whoever revisits it should decide whether the
  case-cohort branch deserves its own refusal.
- **`nz(s.data, "(data source)")` really does fire.** Five builders pass
  `data: s.data` raw to `pcOf()`, so a protocol can export "**Data source(s).**
  (data source)." and "**Design.** matched case-control study using data from
  (data source)." A visible placeholder rather than a confident wrong claim, so
  it ranks below everything above, but the methodologist's confident "these
  defaults can never fire" was wrong and should not be trusted a second time.
- **`missing()` on ACNU has no equivalent of case-control's.** The exports refuse
  field by field; there is no single "this draft is incomplete" line naming what
  is still unset. Worth considering, not attempted.
- Citations: **none were added and none asserted.** Wan 2024, Lunt 2012 and
  Stürmer 2005 are cited in the ACNU PS-calibration text this run edited; they
  were not re-verified, because Crossref, PubMed, doi.org and WebFetch are all
  blocked here and `WebSearch` returns snippets. Nothing this run wrote depends
  on a citation it did not already find in the file.
- **Nothing was checked against the live site**, which is unreachable from this
  sandbox, and nobody has still ever opened one of these `.docx` files in Word.
  The `.docx` half of the ACNU changes was read, not executed — `pscValidity`
  feeds the on-screen card, the Markdown and the Word file from one source, so
  the three cannot drift, but only the first two were rendered.

### Found 2026-08-23 by a twentieth run — the "Study size and feasibility" section

**Chosen by rotation and by the brief's own ranking**: the previous run named
the cohort-flavoured power paragraph "the sharpest well-scoped piece of work
left" and deliberately left it, on the grounds that five design-specific power
paragraphs would need citations and Crossref/PubMed are blocked here. That
worry was half right and worth recording as resolved: **most of what a power
paragraph has to say follows from the structure of the design and needs no
source at all** — that only cases enter an SCCS likelihood, that a concordant
case-crossover case drops out of the conditional likelihood, that cloning
multiplies rows and not people. Only two citations were wanted, and both were
corroborated well enough to ship. If you meet a "cannot be done here, needs
citations" note again, check first how much of it is structural.

Two reviewers on disjoint briefs against a frozen `3fabc7c` — a methodologist
(what actually determines power per design, what the precedents get wrong,
which citations are real) and an applied analyst (does the text reach preview /
Markdown / .docx, what breaks it, what is fine). The analyst's tree moved under
it mid-review because this run was landing fixes; it rebuilt and re-verified,
and its review of this run's own diff is folded in below.

#### Environment: one correction and one addition

Every earlier trap still holds. Two changes:

- **The `[data-preview]` / `#preview` note in the traps section was WRONG** and
  has been corrected in place. The split is 4 / 5, not 7 / 2: ITS,
  sequential-trial and trend-in-trend use `#preview`, not `[data-preview]`. A
  reviewer following the old list got `""` on three builders and a clean sweep
  that meant nothing. Corrected against a grep of all nine files. **The lesson
  generalises past this one fact: a trap note in this file is a claim like any
  other, and this one had been repeated across runs without being re-checked.**
- **The ship loop's `git push -q origin main` fails in this sandbox.** The
  session starts on a **detached HEAD**, with a stale local `main` pointing
  somewhere else entirely, so `git push origin main` pushes that stale branch
  and is rejected as non-fast-forward — five times, with a hint about pulling
  that is not the problem. `git fetch && git rebase --autostash origin/main`
  then **`git push origin HEAD:main`** works. Check `git status -sb` for
  `## HEAD (no branch)` before believing any push error.
- **The blocked-CDN `.docx` route works and is cheap — use it.** `npm pack
  docx@8.5.0`, untar, then in Playwright
  `page.route('**/unpkg.com/**', r => r.fulfill({ path: '…/package/build/index.umd.js' }))`,
  click the Word button, `unzip word/document.xml`. Six real `.docx` files in
  about ninety seconds, and it is the only way to turn "tailDocx reads the same
  array, so it cannot drift" from something you read into something you saw.

#### Fixed this run

- ~~**Five builders sized by a paragraph written for a cohort.**~~ Measured on a
  real build: the shared default ("power ... from observed exposure and outcome
  frequencies", feasibility as "available person-time and event counts") was the
  ONLY thing SCCS, case-crossover, case-control, clone-censor-weight and
  sequential-trial said about study size anywhere — grep confirmed none of the
  five mentions power, sample size, 80% or α = 0.05 in any other section. Each
  now supplies its own through `nz(s.studySize, …)`, the route ITS and
  trend-in-trend already use. Everything conditional reads the file's own
  helpers (`ccoGeom`, `orMeansPlain`, `readCount`, `isMatched`, `effectText`,
  `daysTxt`), so no paragraph can name a scheme, estimand or window count that
  the analysis section contradicts. Every branch refuses rather than guesses,
  and all eleven were rendered: case-crossover declines to state a referent
  count when the scheme is unreadable **and** when the variant is
  time-stratified or symmetric, whose referent scheme `VARIANT_CAVEAT` already
  says the builder does not draw; case-control declines to name a feasibility
  unit until a sampling scheme is chosen; clone-censor-weight declines to say
  what to power until an effect measure is set. Variant and scheme clauses are
  whitelists over the option values, never a not-equal.
- ~~**descriptive-analysis asserted "There is no effect size to detect" above a
  permutation test.**~~ True of the occurrence, mortality and utilisation
  metrics — and the precision framing there is better than the power sentence it
  replaces, so it was kept nearly verbatim. False of `joinpoint`, which SELECTS
  the number of joinpoints by a rule that section 9 offers to make a permutation
  test, and false of `trendInTrend`, which reports an odds ratio. Ticking either
  box is what puts it in the protocol. Both clauses are conditional and
  self-contained. The enumeration now covers standardised ratios, since indirect
  standardisation reports an SMR.
- ~~**ITS printed `1e+21` pre-intervention points, and `9007199254740993` as
  …992.**~~ `readPts` accepts exponential notation on purpose ("1e3" is 1000)
  but stopped checking there; above 2^53 `String(n)` goes back to exponential
  and `Number()` rounds. Nothing objected — `computeChecks` only speaks below 8
  points, `missing()` only refuses blank/bad/zero — so both reached the
  design-summary table, the series-length line, the study-size paragraph and the
  Word file. **trend-in-trend's `readNum` has refused exactly this for some
  time and names 1e21 in a comment.** Two copies of one reader, one hardened,
  one not: the second time this repo has produced that. `missing()` got the
  reason too, since "1e21" is a whole number and refusing it as "not a whole
  number" is a false reason for a true refusal.
- ~~**ITS: autocorrelation reduces the effective sample size "below the nominal
  count", flat.**~~ True of positive autocorrelation, backwards for negative —
  and Zhang 2011, cited two clauses later in the same sentence, simulates both
  signs precisely because the sign decides the direction.
- ~~**ACNU's section 9 existed as two identical literals.**~~ Byte-identical
  today, so nothing was wrong yet; hoisted to one const. ACNU is the one builder
  the shared default actually fits, and skipping `studySize` for its own
  numbered section is right — that stays.

#### What the reviewers disagreed about, and who was right

- **Whether ACNU should skip the section.** Both ended up agreeing it should,
  which is worth recording as a *negative* finding since it is the obvious
  target: ACNU is a new-user active-comparator cohort and the generic sentence
  is written for exactly that design. Do not "fix" it.
- **The dynamic ITS / trend-in-trend interpolation.** This run went in expecting
  it to be the weak point and **the analyst was right that the brief overstated
  it**: blank, `1e3`, `12,000`, `-5`, `2.5` and `0` are all handled, most with
  the correct *reason*, and `inParens` does not double-parenthesise a refusal.
  These two readers are the best-hardened code in the repo. The one crack was
  the missing safe-integer guard above — found by comparing the twins, not by
  fuzzing either one alone.
- **The methodologist's read of `trend-in-trend.astro:382`.** It flagged the
  *paraphrase* of Ertefaie 2018 ("report that where the exposure-prevalence
  trend is strong, the design retains reasonable power across a range of outcome
  rates, stage-1 c-statistics and numbers of strata") as unverifiable from
  snippets, while the citation itself checks out. **Left deliberately**, and
  this run thinks that was the right call rather than a dodge: deleting a
  possibly-accurate substantive statement is also a loss, and nobody here can
  read the three-page letter to settle it. Whoever can read it should.
- **Ranking of what remains.** The methodologist put sequential-trial's
  self-contradiction top; the analyst put the planned-outputs duplication below
  top on the grounds that it is the bigger one and touches eight builders.
  **The analyst was right about size** — but it is a different section, and
  taking it on unreviewed at the end of a run is how churn gets made. Left, in
  full, at the top of the open list.

#### Round two: the analyst sent at this run's own diff

It could not break the five new paragraphs — it re-drove every branch in a real
`.docx`, checked `SCCS_POWER_VARIANT` and case-control's scheme whitelist
character-for-character against the `<select>` option values, and confirmed the
gate on `ccoGeom` matches `VARIANT_CAVEAT`. Two defects were caught earlier, by
this run reading the *rendered page* rather than the diff, and both are the
house species:

- **A bare lookup printing `undefined` into a sentence.** The joinpoint clause's
  first draft was `({grid:…, permutation:…})[s.trendMethod]` with no fallback.
- **`effectText()` is several sentences long and ends without a full stop**, so
  the clone-censor-weight clause originally ran on into the middle of one of
  them — "…the worked example of Maringe et al. (2020), so the quantity to
  establish is…", attaching this run's claim to that citation. Close the
  sentence, then start a new one. **Assume any `*Text(s)` helper here is
  multi-sentence and unterminated until you have rendered it.**

#### Open, examined this run, deliberately left

- **THE BIG ONE: every builder except descriptive-analysis prints its planned
  analytical outputs twice, and on five designs the shared half is the wrong
  half.** `defaultOutputs` in `ProtocolCommon.astro:94-105` hard-codes three
  `base` bullets and does `base.concat(s.plannedOutputs)`, while every builder's
  own `plannedOutputs` is a design-specific rewrite of those same three items.
  Nothing de-duplicates. Confirmed by reading a rendered ITS export: it
  commissions "Participant-flow diagram (source population → analytic cohort,
  with exclusions and counts)" and "Table 1 — baseline characteristics by period"
  for a design analysing aggregate period counts with no person-level cohort at
  all — and the same document says so three pages earlier ("this design is not
  anchored to a person-level day 0"). case-control gets two shell tables both
  called Table 1, two flow diagrams and two results tables; ACNU commissions a
  Table 1 without SMDs directly above its own Table 1 with them.
  **`descriptive-analysis.astro` already carries a comment saying this was found
  and fixed — in that one file only.** Note the fix is not "delete your
  duplicates" everywhere: for ITS, trend-in-trend, case-control, case-crossover
  and SCCS the *shared* half is what has to go, which needs a per-design
  judgement. A clean mechanism would be an opt-out flag on `pcOf` (the `skip`
  list is per-section, not per-bullet). **This is the sharpest well-scoped work
  left and it is bigger than what this run did.**
- **No builder has a form field that feeds `studySize`.** Grepped every
  `name="…"` on all nine: nothing for study size, power, alpha, MCID or event
  counts. The section HARPER item 7.9 exists for is, everywhere, code-authored
  prose promising a calculation *will* be done — so a researcher who has
  actually run `ttpower()` or a Musonda formula has nowhere to put the number.
  Not attempted: a textarea is a new control, and "do not add features" is
  explicit. But `nz(s.studySize, …)` already supports it and this is now the
  only section of these protocols that a user cannot write.
- **The Markdown and Word exports of ITS are not the same document.** The
  Markdown §3 header carries a "Series length: … pre-intervention and …
  post-intervention points" line with no counterpart in the `.docx`, which
  states the same counts in a design-summary table row instead. Same numbers,
  different documents. Cosmetic; noted because nobody had compared them.
- **Section numbering runs 1…11, then eight unnumbered tail sections, then 12.**
  On ACNU, SCCS, case-crossover and descriptive-analysis the shared tail block
  sits between the last numbered section and "## N. Key references". Cosmetic.
- **`nz(s.data, "(data source)")` still fires** on five builders, as the
  previous run recorded. Unchanged this run.
- Citations: **two added, neither verifiable against Crossref or PubMed**, which
  this sandbox still blocks (curl returns a 403 CONNECT tunnel failure for
  Crossref, PubMed, doi.org). Musonda P, Farrington CP, Whitaker HJ. Stat Med
  2006;25(15):2618-31, doi:10.1002/sim.2477 — title, all three authors, journal,
  volume and pages agreed across a PubMed record, the Wiley DOI landing page and
  a Google Scholar lookup URL. Dharmarajan S, Lee JY, Izem R. Stat Med
  2019;38:956-968, doi:10.1002/sim.8030 — same standard; **the issue number is
  deliberately omitted** because only the volume, page range and DOI could be
  confirmed. Mittleman 1995 and Hernán 2018 were already in their builders' own
  reference lists. **clone-censor-weight cites nothing**: a search for a CCW
  power or sample-size paper turned up only applied papers, and attributing one
  to Hernán 2018 or Maringe 2020 would be inventing it.
- **Nothing was checked against the live site**, which is still unreachable from
  this sandbox. Nobody has still opened one of these `.docx` files in Word —
  six were generated and their `word/document.xml` read, which is not the same
  thing.

### Found 2026-08-23 by a twenty-first run — the duplicated planned-outputs list

**The item the twentieth run put at the top of the open list and called "the
sharpest well-scoped work left". It was, and it was also the trap it warned
about**: the fix is not "delete your duplicates" anywhere. Which half of each
duplicate is wrong differs by design, and on two builders the answer is
"neither — leave it alone".

Two reviewers on disjoint briefs, run against a frozen tree, plus a claim
marker pushed before either started (`07327bf`..): a methodologist on which of
the three shared bullets each design can actually produce, and an applied
analyst on what silently breaks in the mechanism and the export path. The
analyst's report did not arrive; its half was written by the orchestrator
before any builder was touched, and where the two disagreed it is recorded
below. Do not read that as the subagent route failing — the methodologist's
report was worth the wait and overruled the orchestrator three times.

#### What the defect was

`defaultOutputs` (`ProtocolCommon.astro`) did `base.concat(s.plannedOutputs)`
with nothing de-duplicating, and every builder's own `plannedOutputs` is a
design-specific rewrite of the same three items. Eight of nine protocols
commissioned a flow diagram, a Table 1 and a results table twice. Verified in
the rendered preview of all nine pages and in real `.docx` files, before and
after.

#### The mechanism

The three shared bullets are keyed `flow` / `table1` / `results`, and a builder
says one of **two different things** about one of them. The distinction is the
whole design and the first version of this got it wrong:

- **"I print this better myself"** → give the bullet the slot it fills:
  `plannedOutputs: [{ key: "flow", text: "Case-selection flow diagram …" }, …]`.
  It renders **in that slot's position**, and the bullet's identity is written
  in exactly one place.
- **"this design cannot produce this at all"** → `skipOutputs: ["flow", …]`.
  After the correction below this is **interrupted-time-series alone**.

Guards, all driven through `PC.tailMd` and observed firing:

- An **unrecognised key prints a `⚠ PROTOCOL-GENERATOR DEFECT` bullet into the
  document** naming itself — for a bad `skipOutputs` key, a bad slot `key`, and
  a `skipOutputs` that is not a list. `"table-1"` for `"table1"` is one
  keystroke, and without this it omits nothing and says nothing — the exact
  species this file has recorded three times (the three-entry map behind a
  four-option select; the `/negative control/` regex that never matched
  `Negative-control outcome`). A `console.warn` would not have been enough.
- An **empty list refuses in words** rather than leaving `tailMd` printing a
  bare heading, and **that sentence is pushed before the defect notice**, since
  the two co-occur and the notice would otherwise crowd out the one line
  telling the researcher the section is unfinished.
- Order is flow, table1, the design's own, **results last whatever is dropped**.

**Read the correction below before trusting any of this: the first three
commits shipped `skipOutputs` for six builders and it was the wrong shape.**

#### Per design — the table a future run should not have to re-derive

| builder | what it does now | why |
|---|---|---|
| case-control | **fills** all three slots | its own three are strictly better; the generic results bullet lost the sampling-scheme naming, which is the one discipline this design cannot do without |
| SCCS | **fills** `flow` | case-only: nobody is followed, cases are ascertained. Table 1 and results **kept** — nothing duplicates them |
| case-crossover | **fills** `flow` | same |
| ITS | **skips** all three | the unit is a calendar period; there is no cohort and no day 0. Replaced with a per-period numerator/denominator table and a period-composition figure. **The only builder that genuinely skips.** |
| sequential-trial | **fills** `table1`; **fills** `results` only when `estimand === "both"` | a patient enters a trial at every origin, so a pooled by-arm table double-counts with person-varying multiplicity **and its two columns share people**. With both estimands chosen, the study-size section says "Two figures are needed, not one" while the shared results bullet commissioned "THE effect estimate" |
| ACNU | **fills** `table1` on the PS branch only; deleted its own weaker flow bullet | the shared flow text says more; under the four non-PS methods its own bullet is a balance table, not a Table 1, so it stays a plain string and the shared Table 1 survives beside it |
| trend-in-trend | deleted its own last bullet | person-level at stage 1, so the shared flow and Table 1 are right; the bare "Effect estimate with 95% CI." was the duplicate |
| clone-censor-weight | **nothing** | the one builder the shared default fits |
| descriptive-analysis | **nothing** | already fixed in a previous run |

**The two `nothing` rows are the point.** A run trying to be thorough would
have "fixed" CCW and made it worse: it commissions no table of numbers
anywhere else, so the shared results bullet is its only numeric shell.

#### Where the two reviewers disagreed, and who was right

- **ACNU's results bullet.** The orchestrator's analyst wanted it dropped for
  symmetry with the other seven. **The methodologist was right to keep it**:
  ACNU's own list is a forest plot and KM curves, and a forest plot carries no
  denominators — no n per arm, no events, no person-time. With RD and IRR among
  the effect measures, dropping it would have removed the flagship builder's
  only numeric result. *Symmetry is not an argument.*
- **The direction of the ACNU and trend-in-trend deletions.** The orchestrator
  assumed the shared half always goes. The methodologist showed the shared text
  is the better one in both, so the **builder's** bullet is what goes. Check
  which text says more before deleting either.
- **SCCS / case-crossover Table 1.** Methodologist: KEEP; analyst: DROP,
  because "baseline characteristics" imports a cohort framing. Kept — the
  objection is to wording, and the fix for wording is not deletion. **Still
  open** (below).
- **How loud the bad-key notice should be.** A thrown error would be caught by
  the `pageerror` assertion every run already runs, but breaking the page for a
  developer's typo punishes the user. Visible bullet instead.

#### Also fixed, found by reading the pcOf rather than the diff

**ITS `plannedOutputs` was unconditional while everything else in that pcOf
branches on `s.controlled`** — abstract, groupBy, limitations, studySize. With
a control series the primary estimate is the *difference* in the level and
slope changes, and the outputs went on commissioning the single-series
coefficients and a one-series figure. A controlled ITS named one primary
quantity in its abstract and another in its outputs. Both bullets conditional
now, driven with the box ticked and unticked.

#### Verified, and how

- Preview rendered on all nine builders before and after; every duplicate gone,
  zero `pageerror`, `typeof window.PC === "object"` on all nine.
- Six real `.docx` files generated through the blocked-CDN route and
  `word/document.xml` read — identical to the preview, bullet for bullet.
- All **fourteen** states of ACNU's `psMethod` select driven, including the
  select blanked as a stale draft leaves it: exactly one Table 1 in every one.
- Both guards driven directly through `PC.tailMd(...)` with a bad key, an empty
  list, empty strings in `plannedOutputs`, an absent `skipOutputs` and a
  non-array `skipOutputs`. All six behaved as designed.

#### Checked and found NOT to be a problem — do not re-derive these

- **Markdown and Word cannot drift on this section.** `tailMd` and `tailDocx`
  both call `tailSections(s)` and consume the same array with the same
  `kind === "bullets"` test.
- **The existing `skip` arrays have not drifted.** Every entry in every
  builder's `skip` checked character-for-character against the nine
  `tailSections` keys. All valid. No builder skips `"outputs"`.
- **`groupBy` cannot come out blank or stale.** Eight of nine pass a string
  literal; only ITS computes it, from a checkbox, which has no third state. The
  `nz(s.groupBy, "exposure group")` fallback is unreachable from the UI.
- **The checker does not key on these strings.** `DELIVERABLE_NAMES` in
  `protocol-checker.astro` is mirrored only to tell "judged absent" from "never
  answered"; the judging is a model told to judge substance not keywords, and
  the page already says "Absent is not automatically a fault". Dropping a
  bullet cannot mechanically lower a score. **But see the open item below.**

#### Open, examined this run, deliberately left

- **"Baseline characteristics" on SCCS and case-crossover.** In SCCS, *baseline
  period* is a technical term for the unexposed reference person-time, and the
  same document says "risk period vs baseline period" in §6 and "baseline
  characteristics" in the outputs. That is a vocabulary collision inside one
  protocol. The right fix is a case-series description (n cases, n informative,
  age at event, observation length, events per case, proportion ever exposed),
  not a deletion. Left because the two reviewers split on it and rewording two
  builders' Table 1 was not what this run had verified.
- **The checker's deliverables rubric has no "not applicable" verdict.** Now
  that ITS correctly declines to commission a participant-flow diagram, this
  repo's own checker will mark an ITS protocol absent for lacking it. The page
  frames absent as "not automatically a fault", so it is not a wrong score —
  but the toolchain now visibly disagrees with itself on one design, and the
  honest fix is an `"na"` verdict in `workers/target-checker/worker.js`. **This
  is the sharpest well-scoped work left, and it is small.**
- **The methodologist's HARPER "Table 1" collision.** `src/data/harper.ts:42`
  maps HARPER item 4 to "Milestones and timeline (Table 1)". If that mapping is
  right, every export asserts "follows the HARPER template" and then commissions
  a *different* Table 1. This file already records the Table 1-13 mapping as
  unverified against the template, and the template is unreachable from this
  sandbox, so **verify the mapping before acting on it**. Not touched.
- **No citations were added or changed this run**, so nothing here needed
  Crossref or PubMed. The methodologist independently corroborated HARPER as
  *Pharmacoepidemiol Drug Saf* 2023;32(1):44-55, doi:10.1002/pds.5507, PMID
  36215113 against three index records — and flagged that it is **not** *Ann
  Intern Med* and **not** *BMJ*, which is worth knowing before anyone cites it
  from memory.
- **The live site was not checked** — still blocked from this sandbox. Verified
  against a local `astro build` + `http-server` throughout. Nobody has still
  opened one of these `.docx` files in Word.

#### One environment note

The ship loop's detached-HEAD correction from the twentieth run is right and
was needed again: `git push origin HEAD:main`. Also, **a subagent may overwrite
your scratch files** — one reviewer rewrote a script of the orchestrator's that
happened to share a name. Give scratch scripts distinct names per role.

#### Correction — the second reviewer arrived late and broke this run's own diff

The applied analyst reported **after** the first three commits had shipped. It
re-verified against the committed code and found four defects in them. All four
are fixed in the follow-up commit; they are recorded because the *shape* of
each is more instructive than the fix.

1. **The fix for an inversion introduced an inversion.** The ordering rule
   anchored `results` last so it could not float above a dropped Table 1 — and
   anchored nothing at the front, so dropping `flow` sank the replacement into
   the trailing block. SCCS and case-crossover tabulated the baseline
   characteristics of a population one bullet *before* saying how it was
   ascertained. **Anchoring one end of a list is half a rule.**
2. **The cause was saying one thing in two places** — `skipOutputs` deleting
   the slot here, the replacement text appended over there, nothing connecting
   them. Hence the `{ key, text }` slot form. This also deleted the ACNU
   comment claiming "one boolean, read twice" that sat above *two copies* of
   `NO_PS_METHODS.indexOf(...)`: harmless at runtime, but a guarantee the next
   editor would have believed. **A comment asserting an invariant the code does
   not enforce is worse than no comment.**
3. **`skipOutputs: "flow"` without the brackets was silently ignored** — the
   likeliest authoring slip of all, and the *only* malformed input that landed
   back in the do-nothing-say-nothing behaviour the mechanism exists to
   abolish. A guard that catches misspelled keys but not the wrong *type* is
   not a guard. Now reported like a bad key.
4. **The defect notice was pushed before the empty-list check**, so a builder
   that dropped every slot AND misspelled a key produced a section whose only
   content was the bug report — the refusal telling the researcher the section
   was unfinished crowded out by the notice. **Order your guards so the one
   addressed to the user wins.**

**The lesson for future runs is the method, not the four bugs**: three commits
had been rendered, `.docx`-checked, driven through fourteen select states and
pushed, and a reviewer sent at *that diff* still found four defects — one of
them the same species as the bug being fixed. Send the second reviewer at your
own diff, and do it before pushing if you can.

#### Still open after the correction — ranked, all reproducible

- ~~**The checker's deliverables rubric has no `"na"` verdict.**~~ **Done
  2026-08-23 (twenty-third run) — but its stated motivation was WRONG; read
  the section at the bottom of this file before trusting the description below.**
  `workers/target-checker/worker.js:95-103,130-132` sends seven fixed
  deliverable names to the model and asks present/partial/absent. ITS now
  correctly commissions no flow diagram, no Table 1 and no results shell, so an
  ITS protocol *this tool generated* will read absent on three of seven in
  *this tool's own checker*. `protocol-checker.astro:229` mitigates exactly
  this but names only the Love plot and the Kaplan–Meier curve. **Small,
  well-scoped, and the toolchain now visibly disagrees with itself on one
  design — the best next target.** Fix by extending that sentence to aggregate
  designs and/or adding an `"na"` verdict; the two files are already documented
  as needing to stay in lock-step.
- **`skip` (the per-SECTION list) is the un-validated twin of `skipOutputs`.**
  `ProtocolCommon.astro` filters `tailSections` on it with no key check.
  Verified: appending `"output"` (for `"outputs"`) to any builder's `skip`
  leaves the section fully present, silently. Nothing has drifted yet — every
  current entry was checked character-for-character — but `skip` **fails open
  into duplication with different headings**: ACNU prints its own
  `## 9. Sample size and power`, so one slip yields a protocol with two
  sample-size sections under two headings. The notice machinery now exists;
  reusing it is a few lines.
- **ACNU and descriptive-analysis do not carry their stale-select refusal into
  the exported document.** Only ITS, sequential-trial and trend-in-trend define
  `staleMsgsDoc`. Reproduced: a `?seed=` carrying `psMethod: "tmle-super-learner"`
  silently becomes `iptw`; the checks panel says so, and the Markdown and Word
  say "Stabilised IPTW with weight truncation" and commission the Love-plot
  Table 1 — a PS method and a Table 1 nobody chose, in a file a co-investigator
  receives with no trace of the substitution. ACNU is the busiest builder on the
  site with thirteen selects. **This is the largest of the three.**
- **CCW's section now ends on the generic "the effect estimate"** because
  results-last moved it there, immediately after four bullets that carefully
  name the RMST / risk-difference contrast — in the one file whose whole design
  is refusing to name an unnamed measure. Pre-existing text, newly positioned.
  Cosmetic, but CCW is exactly the builder where it grates.
- The HARPER "Table 1 = milestones table" numbering question, unchanged from
  above: verify `src/data/harper.ts:42` against the template first.

#### Verified in the correction pass, and how

Nine states driven through `PC.tailMd` (bare-string `skipOutputs`, misspelled
skip key, misspelled slot key, all-dropped-plus-typo, all-dropped-clean, slot
fills rendering in position regardless of array order, blank slot text, plain
strings only, `null`); all fourteen ACNU `psMethod` states re-checked; all four
sequential-trial `estimand` states including the select blanked; nine builders
re-rendered with zero `pageerror`; five `.docx` regenerated and read. The
analyst separately proved Markdown and Word cannot diverge here by capturing
the real `pcOf(s)` off each live page and feeding the identical object to
`tailMd` and `tailDocx` — byte-identical on all nine.

<!-- CLAIM 2026-08-23 (twenty-second run): DONE — the stale-select refusal path.
     See the section at the end of this file. The claim's own parenthetical was
     wrong about case-crossover, which turned out to be the reference
     implementation on this path; corrected there. -->



### Found 2026-08-23 by a twenty-second run — the stale-select refusal path, end to end

**Chosen from the open list**, and it turned out to be one path with four
distinct failures on it, not the two the twenty-first run had recorded. The
path: a saved draft or a `?seed=` link carries a value a `<select>` no longer
offers (or blank, or `null`); the page substitutes a default; and the question
is what the user *and the exported document* are then told.

Two reviewers on disjoint briefs (methodologist: which substitutions change the
estimand, whether each refusal states a true thing, citations; applied analyst:
execute everything, hostile seed values, three consecutive loads, forgery),
plus a third sent at this run's own diff. **Both of the first two overruled the
orchestrator's reading of the brief, and the analyst found four defects in the
run's own shipped commits.** Send the second reviewer at your diff. It is the
single highest-yield thing in this file.

*(The third review was still running when this was written. If it reported
anything, it is in a correction section below this one; if there is no such
section, it did not report before the run ended and its brief is worth
re-issuing — the diff it was sent at is `e5f4244..85f88b6`.)*

#### The map, so a future run does not re-derive it

Nine builders. Two (`case-control`, `clone-censor-weight`) have one `<select>`
each and no capture at all — and they are the two that **refuse hardest**: the
select blanks, and every surface declines to name a scheme, a measure, a
horizon or a contrast. Seven capture. Before this run:

| builder | captured | persisted a reload | reached the document |
|---|---|---|---|
| ACNU | yes | yes | **no** |
| descriptive-analysis | yes | **no** | **no** |
| SCCS | yes | **no** | yes, on load 0 only |
| case-crossover | yes | yes | yes |
| ITS / sequential-trial / trend-in-trend | yes | yes | yes |

All seven now capture, persist and reach every export surface.

#### What was fixed, in order of damage

- **ACNU said the documents carried the refusal, and they did not.** The panel
  line reads, in those words, "that is what this protocol and the exported
  documents say — a specification nobody chose". True of the *value*; the
  documents said nothing about the substitution. A link carrying
  `psMethod "tmle-super-learner"` and `effectMeasure "OR"` produced a real
  `.docx` whose abstract reads "Stabilised IPTW with weight truncation … 
  reporting a hazard ratio". Thirteen dropdowns, the busiest builder on the
  site, and the person who receives the Word file is not the person who saw the
  panel. The notice now prints above the abstract in the protocol and above the
  item-7 table in the TARGET checklist — the two places the substituted value
  is asserted.
- **descriptive-analysis lost the warning after one load and never exported
  it.** `computeChecks` had exactly one consumer (the panel) while the
  documents read `blockers()`. `metaMethod "fe"` — a value two sibling builders
  on this site offer, so an ordinary copy between designs reaches it — left the
  study at "Descriptive only; no pooled estimate", which does not perturb the
  cross-site estimand, it **deletes** it. Now an error (not a warning), in the
  Markdown, the Word file and STROBE item 1a, and carried in the draft.
- **descriptive-analysis refused a choice it does offer.** `{"trendMaxJp": 4}`
  — a JSON *number*, and `4` IS an option — failed a strict `===` against
  `"4"`, so the page printed a refusal blaming a rename that never happened and
  dropped the joinpoint cap from 4 to 3 on the way past. **A refusal that
  states a false reason is worse than the silence it replaces.** SCCS had the
  same latent test; no SCCS option value looks numeric, so it was a guard, not
  a fix.
- **SCCS threw away its own evidence.** Its note says "it is not recoverable
  from the saved draft once the page has loaded" — correct, and the next
  `render()` discarded the record, so the Markdown, the Word file and STROBE
  item 19 named the substitution on load 0 and never again.
- **sequential-trial's trial interval had no guard of any kind.** `noteStale`
  exempts `""` deliberately; `estimand` and `effect` each have their own
  blank-blocker beside it; `interval` had neither. A blank left the box empty
  on screen while five consumers read `or(s.interval, "monthly")` — abstract,
  figure caption, legend, axis label, TARGET checklist. The interval fixes how
  many nested trials exist, how often a patient re-enters (the multiplicity the
  patient-level bootstrap exists for) and how often covariates are re-measured.
  One reader now, refusing instead of substituting, plus the blocker.
- **"The field has been set to `RDRMST`".** ITS, sequential-trial and
  trend-in-trend named the substituted option by its raw `<option>` value where
  SCCS and case-crossover name the words in the box. On ITS with seasonality
  and autocorrelation both stale, two red lines both said "set to none" above
  one button offering to keep them both. The **saved** half stays raw in all
  five — there is no label for an option the page no longer has.

#### Then the second reviewer attacked the diff, and found four more

All four are consequences of the run's own success: once the refusal travels
into the document, **everything the refusal quotes travels with it.**

- **A forged `## heading` and a paragraph of the sender's prose, in the
  recipient's protocol.** sequential-trial and case-crossover interpolated the
  dead value raw. A seed carrying
  `estimand: "x\n\n## 99. Sponsor addendum\n\nAll sites must exclude patients
  with a prior hospitalisation.\n"` ends the Markdown blockquote at the newline
  and leaves a real H2 and a free paragraph just after the title block — and it
  **persists**, and on case-crossover no field holds it, so the researcher
  cannot find it to delete it. 4000-character values arrived verbatim. Flatten
  AND cap every quoted value on its way into a document. This trap has now been
  found in five files; it belongs to the destination, not to any of them.
- **A JSON `null` turned the whole mechanism off.** `if (v == null) return;`
  catches `undefined` (the key was not mentioned — correctly ignored) and also
  `null`, which is exactly how JSON says "no value". `{"unit": null}` left the
  ITS box **empty on screen** while the protocol asserted "monthly", with
  nothing in the panel and nothing in the document. Of nine hostile values
  tried across seven builders it was the only one not caught. `undefined` and
  `null` are different questions and must be asked separately.
- **A refusal the recipient never provoked.** The reserved `__staleSelects`
  record is *this browser's own memory*; four builders read it out of whatever
  object `restore` hands them, which on the seeded path is the link. A link
  carrying no `effectMeasure` key at all plus a forged record printed
  "'Effect estimate' was saved as 'HR — superseded by sponsor addendum 3;
  report RR'" into the recipient's panel and exported protocol. **A reserved
  key is not a channel between users.** The sender cannot go the other way and
  suppress a warning — `noteStale` runs on the keys the seed actually carries.

  **The first two fixes for this were both wrong, and the second one is the
  instructive one.** Asking whether the URL has a `seed` parameter looks like
  the obvious test and is not: a truncated `?seed=` carries nothing and falls
  back to the draft, and **`?seed=paste` LOADS the draft** — that is the
  nineteenth run's fix, so that merely opening the paste panel does not displace
  the reader's work. So the guard read the user's own record as a stranger's,
  dropped it, and the render a moment later saved the draft back without the
  reserved key: seed a stale value, reload, open `?seed=paste`, paste nothing,
  and the red line and the notice in the exported protocol are gone for good.
  **The self-erasing refusal, for the third time in this file, reintroduced by
  the fix for something else, inside the same run.** The shipped test asks
  localStorage: a carried record is accepted only when it is byte-identical to
  the one this browser saved. **The URL cannot tell you where a state object
  came from. Ask the store.**
- **An unvalidated carried record overwrote the user's own text.** ITS and
  sequential-trial pushed entries unchecked; the filter that re-shows a
  substituted select finds no `selectedIndex` on a `<textarea>` and falls
  through to assigning it, and the autosave a second later destroys what was
  there. A record naming `population` replaced "Adults aged 65+ in NHIRD".
  Only reachable by writing the draft directly, not from a link.
  trend-in-trend has validated since this was found there; its two siblings
  copied the loop without the check.

#### Where the reviewers disagreed, and who was right

- **Severity.** The methodologist argued a substituted `<select>` is a
  **blocker in every builder**, and for a reason worth keeping: the dead value
  is unrecoverable by construction, so at the moment of the refusal the tool
  cannot know whether the sender meant `quarterly` instead of `monthly` or
  per-protocol instead of ITT. Under this file's own rule — refuse rather than
  guess — an unresolvable ambiguity about the specification is a stop.
  descriptive-analysis's `warn` was the outlier and is now an error.
- **Ranking.** The methodologist put sequential-trial's silent `interval` first
  because nothing anywhere said a word; the analyst put ACNU's document silence
  first because ACNU has thirteen selects and is the flagship. Both shipped;
  the disagreement did not need resolving.
- **The brief's own claim marker was wrong.** It said case-crossover "carries
  it nowhere or loses it on reload". Case-crossover is the **reference
  implementation** on this path — capture, carried round-trip, human label,
  per-note dismiss, and it reaches Markdown, Word and STROBE. Only its wording
  needed fixing. Check before you repeat a claim from this file.
- **The methodologist's "SCCS carries it nowhere" was also half wrong**: SCCS
  carries it, it just could not keep it. Half-wrong negative findings are the
  expensive kind.

#### A rule this run would state for the next one

**A refusal has four surfaces, and they fail independently:** the panel, the
Markdown, the Word file, and the reporting checklist (TARGET/STROBE). Whenever
you add or change one, drive all four. Two of this run's six defects were a
message that existed on exactly one of them.

And: **a message written for the screen is wrong in a document.** "Press the
button below", "check that setting before you export", "choose the option you
want" — all three were printed *inside* exported protocols. Split the sentence:
one body, two tails.

#### Verified, and how

- Every finding reproduced in Chromium against a local `astro build` +
  `http-server`, before and after, on both trees.
- Real `.docx` files generated through the blocked-CDN route (`npm pack
  docx@8.5.0` + a Playwright route on `**/unpkg.com/**`) and
  `word/document.xml` read, for ACNU (protocol + TARGET checklist),
  descriptive-analysis (protocol + STROBE), SCCS, sequential-trial (protocol +
  TARGET) and case-crossover.
- Three consecutive loads on all seven capturing builders, with and without the
  seed in the URL: the notice is in the document on every load, on every one.
- **A hostile-value matrix**: eleven values (`""`, `null`, `0`, `false`, a
  number, an array, an object, wrong case, a trailing space, 4000 characters,
  and an embedded `\n\n## 99. FORGED\n`) × seven builders × two different
  selects each. Every one is flagged, none blanks a select, none forges a
  heading, none arrives unbounded — **and the valid value for each select is
  still applied with no refusal**, which is the half of the test that catches a
  guard that fires too often. Two apparent failures were the probe's own regex
  missing sequential-trial's dedicated blank-blocker wording; checked by hand.
- Keep button, retire-by-value and "Clear all" driven on ACNU,
  descriptive-analysis and SCCS: the record dies exactly when it should and the
  reserved key leaves the draft with it.
- **A real `?seed=paste` paste driven end to end**, which the previous run and
  this run's analyst both had to leave unexecuted (the headless clipboard is
  denied — dispatch a `paste` event on `#pc-paste-in` after clicking
  `#pc-paste-manual` and the handler runs). Before pasting, the reader's own
  draft and their stale warning are intact; after pasting a colleague's
  protocol the form is replaced and the warning is correctly gone, because it
  belonged to the draft that was replaced.
- **Every one of the seven exports byte-identically to before on a clean form.**
  That check caught nothing, which is the point of it.
- Nine builder pages plus the three tools loaded with zero `pageerror` and
  `typeof window.PC === "object"` before every commit.

#### Open, examined this run, deliberately left

- **`case-control` and `clone-censor-weight` still capture nothing.** Both
  refuse correctly everywhere — the document says "(not chosen) sampling" and
  "No effect measure is set… a saved draft or a ?seed= link can leave the
  dropdown with nothing selected" — so nothing false is asserted. What is lost
  is the ability to name the value that was dropped. Driven across 8 value
  types × 2 restore paths on CCW: all 16 produce `select.value === ""` and the
  identical sentence, so **`clone-censor-weight.astro:615`'s second arm is
  confirmed dead by execution**. Capturing at restore is what makes it
  reachable. `case-control.astro:606` guesses — "(If you arrived by a saved
  draft or a shared link, it may have carried a scheme this page no longer
  offers.)" — where the value was in hand a moment earlier.
- **A blanked select in `case-control` never recovers.** `sampling: ""` is
  saved back into the draft, so `applySeed` re-blanks it on every subsequent
  load: the box stays empty for ever with no way to learn why. The refusals
  hold, so it ranks below everything above.
- **trend-in-trend's estimator message may misstate what was removed.** It says
  the dropped option "described a logistic-regression approximation that
  appears neither in Ji et al (2017) nor in the TrendInTrend package". Stage 1
  of the Ji method *is* a logistic regression of exposure on covariates — this
  page says so itself — so a reader who knows the design reads the sentence as
  denying something the paper contains. The methodologist proposed "an
  approximation that replaced the trend-in-trend likelihood with a logistic
  outcome model". **Left, because neither reviewer nor this run knows what the
  removed option actually did**, and rewriting it would assert something else
  unverified. Whoever knows the history should fix the sentence.
- **ACNU's `pscSurroTestable` is read as `!== "no"`** (`active-comparator-new-user.astro`),
  and that flips `releaseLevel` off `"withheld"` — i.e. it decides whether a
  PS-calibrated estimate is released at all. This is the "positive fact
  asserted about a `<select>` by ruling one value out" antipattern this file
  already records. It is not reachable through the stale path any more
  (writeForm never leaves an ACNU select blank, and a substitution is now
  reported in every export), so it was left; it is worth a whitelist anyway.
- **`applySeed`'s remaining silent drops** (from the twentieth run's list, all
  re-confirmed): an unparseable `type=number` becomes `""` while
  `checkValidity()` returns true; an object value writes `[object Object]`; a
  radio group given an unknown value leaves every radio unchecked (one group
  exists, `sccsAnchor`).
- **ITS re-reports substituted values as facts about the design.** With
  `autocorr` substituted, the panel prints "⚠ No autocorrelation handling…" as
  an unconditional property of the protocol, directly under the red line saying
  the value was substituted. Milder than the rest because the two sit together.
- **Citations.** None added, none changed. The methodologist confirmed
  **Ji X, Small DS, Leonard CE, Hennessy S. Epidemiology 2017;28(4):529-536,
  doi:10.1097/EDE.0000000000000579, PMID 27775954** and the `TrendInTrend` CRAN
  package's exported functions **from WebSearch snippets only** — Crossref,
  PubMed, doi.org and WebFetch are all blocked here, so that is a snippet
  confirmation, not a record check.
- **The live site was not checked** — still unreachable from this sandbox.
  Everything was verified against a local build. **Nobody has still opened one
  of these `.docx` files in Microsoft Word.**

#### Correction — the third reviewer, sent at this run's own diff, found six more

It reported after the section above was written, which is why this is a
correction rather than part of it. **Seven runs out of seven now: a reviewer
sent at a finished, verified, pushed diff finds real defects in it.** All six
below are fixed. Every one is the species this run set out to delete,
introduced or left standing by the fix for it — which is the point, and the
reason to keep doing this.

1. **A refusal that says nothing can be recovered, in the sentence that
   recovers it.** SCCS's note ends "the dead value is not recoverable from the
   saved draft once the page has loaded". True when written; **this run made it
   false** by putting the record in the draft — which is the only reason the
   sentence prints at all, and the dead value is quoted three words earlier. It
   reached the panel, the Markdown, the Word file and STROBE item 19. **When
   you make something possible, grep for the sentences that say it is not.**
2. **The new document banner was false for a blank.** "A value this page no
   longer offers was replaced before this document was written" — of a blank,
   nothing was offered and nothing was replaced. Three commits in this run
   argue that exact point about the *body* sentences and left it standing in
   the *heading above them*. A heading is a claim.
3. **Messages naming a button that does not exist.** ITS, sequential-trial and
   trend-in-trend append "press “Keep “<option>”” to confirm it" once per
   substitution, while the panel renders one button reading "Keep all N
   substituted choices". With three stale selects: three messages, three named
   buttons, none of them on the page, each implying it confirms one thing when
   it confirms three. **And the commit that rewrote those lines claimed to have
   verified message and button agreeing in exactly that configuration** — it
   had driven the single-substitution case and generalised. That is this file's
   own "diff the OUTPUT" trap wearing a different hat: *render the case the
   claim is about, not the case next to it.*
4. **SCCS's screen tail was singular after a list of three** — the very defect
   its own commit message objects to in the text it replaced.
5. **sequential-trial's interval blocker named the abstract**, which has no
   interval field (the consumer is §3); and its axis label said "not set" where
   every other surface says "not specified".
6. **descriptive-analysis's stale error never named the Keep button** mounted
   at the foot of its own panel — the button whose stated reason for existing
   is that a stop nobody can answer teaches people to ignore the panel.

Plus one structural note it made and this run acted on: **sequential-trial's
`noteStale` still lumps `null` in with `undefined`.** Nothing is silent today
because all three of its selects have their own blank-blocker, but the coverage
is incidental — a fourth `<select>` added to that page inherits silence.

**What the third reviewer attacked and could not break**, so a future run need
not re-derive it: the byte-identity guard on the carried record (both sides come
from `JSON.parse` of the same stored string in every legitimate path, and
`writeForm` has no call site outside `PC.restore`'s closure); clean-form byte
identity on all seven; every select seeded with a *valid* non-default option on
all seven, with no false refusal; `undefined` still silent; checkbox, radio and
number fields unaffected by the `null` change; retire-by-value, Keep and
"Clear all" on four builders; the Markdown-injection cap; the ordering of the
new notices relative to the abstract in preview and `.docx`; and no duplication
of a notice in any document. It also independently found the `?seed=paste`
regression this run had already found and fixed.
### Found 2026-08-23 by a twenty-third run — the deliverables rubric's missing "na" verdict

**The item the twenty-first and twenty-second runs both left at the top of the
open list, called "the sharpest well-scoped work left". It was — but its stated
motivation was wrong, and a run that had implemented what those notes described
would have shipped a false statement about every ITS protocol.**

Three reviewers on disjoint briefs against a frozen tree: a methodologist, an
applied analyst, and — following the twenty-first run's own hardest-won lesson —
a third sent at this run's uncommitted diff before it was pushed.

#### What the defect actually was

`workers/target-checker/worker.js` sends `RESPONSE_SCHEMA` to Gemini as a
`responseSchema`, so the deliverables enum `["present","partial","absent"]` is
**enforced at generation** — the model could not say "not applicable" even if it
wanted to. And the prompt did not merely leave the gap; it *instructed* the
model to fill it wrongly:

> If an item is genuinely not applicable to the design (e.g. a Kaplan-Meier
> curve for a cross-sectional descriptive study), mark it "absent" and say so
> in the evidence.

Two sentences earlier it asks for "a concrete suggestion for partial/absent
items". So the **documented happy path** for an inapplicable output was: a red
chip, a count in the "Absent" tally, and a suggestion line. Observed end to
end, in a real `.docx` with the PHDc logo on it:

```
Love plot / covariate balance — [DC2626] Absent
Evidence: Not applicable — unadjusted descriptive study, no propensity score.
Suggestion: Add a Love plot of standardized mean differences before and after matching.
```

That is the tool telling a researcher to add a propensity-score balance plot to
a design that has no propensity score — in a file they email to a supervisor.
It is not a mislabelled chip; it is a wrong instruction, and it fires for most
descriptive, cross-sectional, SCCS and case-crossover protocols.

#### The correction to the previous two runs' framing — read this before trusting the old note

The open item said: ITS now correctly commissions no flow diagram, no Table 1
and no results shell, so an ITS protocol will read "absent" on three of seven in
its own checker; fix with an `"na"` verdict.

**The premise is true and the conclusion does not follow.** The methodologist
checked the builder and the orchestrator confirmed it independently:
`interrupted-time-series.astro:530` does skip all three, but the four bullets
that replace them at `:537-546` **contain the analogues** — level-change and
slope-change estimates with CIs (the results shell), a per-period composition
table (the Table 1), and a per-period numerator/denominator accounting
including the periods the phase-in window removed (the flow). Marking those
three `na` would have been a **false statement about the document**, and less
accurate than the "absent" the three-value scale already produced.

The real defect the ITS case exposes is that the seven deliverable names are
written in the vocabulary of one design — the person-level, PS-adjusted,
time-to-event cohort — and the other eight are judged against it. `na` is not a
fix for that; it is a bucket for judgements the rubric should not be forcing.
The rubric now says so explicitly, and that clause, not the new verdict, is what
addresses ITS.

**`na` still ships**, for a reason the old note missed and the methodologist
found: `protocol-checker.astro:733-747` spends two paragraphs insisting that
"missing" (a claim about the protocol), "not assessed" (a claim about the run)
and "not scored" (a claim about the tool) must never be folded together — while
`absent`, in the same file, meant both "you failed to plan this" and "your
design cannot produce this", in red. And unlike the checklist, **the
deliverables panel has no denominator** (`renderDeliverables` computes chip
counts only), so the abuse channel that made `na` dangerous on the checklist
side — where the file already carries a disclosure sentence because "a run where
the model marked everything 'na' reads '12 of 12 met'" — is closed by
construction here.

#### What shipped

`workers/target-checker/worker.js`

- `"na"` added to the deliverables status enum, with a comment saying why the
  enum is the enforcement point and naming its two client-side twins.
- The rubric paragraph rewritten. Three things in it, in order of importance:
  1. **"JUDGE EACH ITEM AS THIS DESIGN OWES IT"**, with the three concrete
     substitutions spelled out (case-selection flow for cohort flow;
     case-series or period-composition description for a baseline table by
     group; IRR-by-risk-window profile for a survival curve), and the model
     told to say in the evidence *which version it judged*.
  2. **A burden of proof on `na`**: the evidence must name the design and the
     structural feature of its **estimator** — "estimator", not "design",
     because "the design" invites the editorial reading ("an ITS isn't that
     kind of study") and "the estimator" forces a structural one ("there is no
     risk set"). The document's silence is never grounds: "not needed here",
     "not usual for this design" and "the authors did not plan one" all mean
     absent. **When torn, choose absent.**
  3. **Two rows barred from `na` outright** — "Primary results table (shell)"
     and "Sensitivity-analysis outputs". Every design has a primary estimate
     and identifying assumptions to probe. A verdict that is unavailable on
     some rows is a verdict with a spine, and those two are precisely the rows
     a weak protocol most benefits from escaping.
- The worked example was deliberately changed from the old one (a KM curve for a
  cross-sectional study — the easiest possible instance) to the SCCS
  within-person balance case. **Models anchor on examples; give a rubric its
  hardest legitimate case, not its softest, or the verdict over-applies.**

`src/pages/tools/protocol-checker.astro`

- `DELIV_META.na` — "N/A", slate, distinct from both red "Absent" and dashed
  "Not assessed".
- `DELIV_ALIASES` gains `na` / `n/a` / `not applicable` / `notapplicable` /
  `inapplicable`, mirroring `STATUS_ALIASES`, and is now built on
  `Object.create(null)`: as a plain literal, `DELIV_ALIASES["constructor"]` is
  truthy, so a status of `constructor` or `__proto__` set the status to a
  *function*, skipped the unrecognised-verdict branch, and was counted under a
  key the tally never prints — **seven rows above a tally of five, with no
  caveat at all**. Unreachable while the enum holds, which is exactly the kind
  of guarantee that stops holding.
- **One suggestion rule, `delivShowSuggestion`, replacing three byte-identical
  copies** (screen, Markdown, Word) that would each have needed extending for
  `na`. This is the copy-pasted-lookup species this file records four times.
- **The false caveat.** `nUn` counted volunteered extras against a denominator
  of seven: all seven standard checks answered plus two unusable extras printed
  *"2 of the 7 planned-output checks came back without a usable verdict"* — and
  with eight extras, *"8 of the 7"*. Now computed over the canonical rows only.
  The absurd version was harmless because it was visibly broken; the "2 of the
  7" version is the dangerous one because it is plausible.
- **Extras are tagged and labelled in all three surfaces** and left out of the
  tally. Previously a volunteered row sat unmarked among the seven in the
  `.docx` and read as part of the checklist this tool claims to apply.
  *H3, M5 and M6 were one bug — "extras are treated as part of the standard
  seven" — and fixing only the caveat would have been half a rule.*
- **A verdict with no evidence now says so.** A red "Absent" with `evidence: ""`
  rendered a bare chip and nothing else, directly under a paragraph telling the
  reader to read the evidence line before treating a red chip as a gap.
- **An unrecognised verdict keeps the model's words**, the way `reconcile` at
  `:1077-1081` already does for the identical framework case. Discarding them
  told the researcher the check had failed when it had answered.
- **The four verdicts are defined once, in the markup** (`#delivnote`), and both
  exports quote it via `delivNoteText()` — the same trick `frameText()` already
  uses. The exports previously carried their own shorter sentence that defined
  "Absent" one way while the screen defined it another.

#### The method, and what it cost — the part worth copying

Three reviewers, disjoint briefs, frozen tree. The methodologist and the
applied analyst independently reached the same top finding by opposite routes
(one from "which of the 63 design × deliverable cells are genuinely
inapplicable", one from "drive the panel and see what the .docx says"), and
each found things the other never looked for. **The third reviewer, sent at
this run's own uncommitted diff, is the one that paid for itself**: it found
that the fix had inverted the failure mode, plus six more defects in a diff
that had already been driven through seven scenarios, exported to `.docx`, and
regression-tested on twelve pages. The twenty-first run's lesson holds and
should now be treated as standing practice: **send a reviewer at your own diff
before you push.**

The finding that mattered, in one line, because it generalises far beyond this
panel: **a rule that lives only in the prompt is not a rule.** The rubric said
"NEVER mark these two rows na" and nothing on the page enforced it, so the
model's disobedience produced a *grey chip with the advice deleted* — the
failure moved from the visible half of the axis to the invisible half. When
you add a permissive verdict, ask what it looks like when the model overuses
it, and make that visible on screen. Over-flagging costs a reader a minute;
under-flagging costs them the analysis.

#### Verified this run, and how

- The Cloudflare Worker **cannot be executed from this sandbox** — no Gemini
  key, and it deploys separately via `wrangler deploy` (see its README), so
  `worker.js` changes are inert until Daniel deploys. **Every claim about the
  new rubric's effect on model behaviour is unverified and unverifiable here.**
  What was verified is that the file parses (`node --check`) and that the
  client half handles both the old and the new worker, in either deploy order.
- Everything client-side was driven in Chromium against a local
  `astro build` + `http-server`, with the POST to the worker intercepted by
  `page.route` and fulfilled with crafted JSON. That is the technique to reuse:
  the page has **no Turnstile** and `WORKER_URL` is hard-coded non-empty, so the
  real `render()` path runs end to end. `#text` lives inside
  `<details id="pastewrap">` — open it first. The response needs at least one
  valid `items` id (from `src/data/harper.ts`) or the page refuses to render at
  all, which is correct behaviour and will otherwise waste you ten minutes.
- Real `.docx` files generated through the blocked-CDN route and
  `word/document.xml` read **with the `w:color` values kept**, which is how the
  chip colours were checked: N/A `64748B`, Absent `DC2626`, Not assessed
  `94A3B8`.
- States driven: `na` and its four prose spellings; both barred rows marked
  `na` with real suggestions; all seven `na`; a bare `absent` with no evidence
  and with `evidence: ""`; `"—"`, `"-"`, whitespace, an object and a number as
  `suggestion`; unrecognised verdicts on canonical rows and on extras; a
  missing `status` field; `constructor` and `__proto__` as statuses on both a
  deliverable and a framework item; seven good answers plus two and plus eight
  volunteered extras. Twelve tool pages re-loaded with zero `pageerror` and
  `typeof window.PC === "object"` on all nine builders.
- **The live site was not checked** — still blocked from this sandbox. Nobody
  has still opened one of these `.docx` files in Microsoft Word.
- No citations were added or changed in the shipped code. The methodologist
  corroborated ten methodological sources by WebSearch snippets only (Crossref,
  PubMed and the publishers remain blocked) and found one error worth
  recording: **the quantitative-bias-analysis good-practices paper is Lash,
  Fox, MacLehose, Maldonado, McCandless, Greenland, *IJE* 2014;43(6):1969-85 —
  McCandless, not Poole.** Nothing in the repo cites it; this is a landmine
  removed in advance.

#### Still open, ranked — all examined this run, none manufactured

- **The bar for `"present"` is a promise, not a shell.** `worker.js`, the
  deliverables paragraph: `"present"` is defined as satisfied by *"a clear
  statement it will be produced"*. So a protocol containing only "Baseline
  characteristics will be presented by treatment group, and a participant flow
  diagram will be provided" scores **Present on two rows having mocked up
  nothing** — in a panel whose entire stated purpose is "does this protocol
  mock these up in advance". The checklist half of the *same prompt* guards
  against exactly this ("Mark an item 'partial' if the topic is discussed but
  the operational definition / code list / table is missing. Weigh these
  structured artifacts heavily") and the deliverables half has no equivalent.
  The methodologist called this larger than the `na` question and may be right;
  it was left because it changes what a verdict *means*, it is unverifiable
  from this sandbox, and shipping two independent changes to model behaviour in
  one unexecutable prompt edit is how the twenty-first run shipped an
  inversion. **Drafted fix, one sentence:** `"present"` = *specified well
  enough to build empty — for a table its rows, columns and cell statistic; for
  a figure its axes, strata and what is plotted. A sentence promising the
  output without those is "partial", not "present."* **This is the best next
  target in the checker.**
- **The seven deliverable descriptions are methodologically wrong in five
  places**, all argued in full by the methodologist and none acted on:
  (a) `Love plot / covariate balance` conflates matched with weighted SMDs —
  Austin's 2009 paper is specific to *matched samples*, IPTW needs the
  **weighted** standardized difference (Austin & Stuart 2015), and the item
  omits the weight distribution, effective sample size and overlap that this
  site's own builders already commission; (b) `Cumulative incidence /
  Kaplan-Meier` conflates 1−KM with Aalen-Johansen under competing risks, which
  `sequential-trial.astro:634` already gets right; (c) the sensitivity set is
  confounding-only and wrong for five of nine designs (an E-value on an SCCS
  bounds a threat the design has already removed) and omits negative-control
  *exposures* and empirical calibration; (d) `Forest plot` checks a display
  format rather than a method; (e) the results-shell measure list omits OR,
  rate, RMST and level-change, and is **weaker than TARGET item 13 in the same
  prompt**, so one report can score the shell Present and TARGET 13 Partial for
  the same document. **Trap:** renaming any of them silently desynchronises the
  client mirror `DELIVERABLE_NAMES`, and a renamed item then renders as a
  *skipped* one. Change both files or neither.
- **The deliverable descriptions never reach the screen.** `worker.js` holds
  names *and* descriptions; the client mirrors names only. A reader sees
  "Sensitivity-analysis outputs — Absent" and is never told what would have
  counted. Checklist items have `it.hint` rendered for exactly this reason.
  This becomes essential if the items are ever re-worded.
- **`skip` (the per-SECTION list) is still the un-validated twin of
  `skipOutputs`** — unchanged from the twenty-second run's list. Appending
  `"output"` for `"outputs"` leaves the section fully present, silently, and
  `skip` fails open into duplication with different headings. The notice
  machinery exists; reusing it is a few lines.
- **The framework suggestion rule is still written out three times**
  (screen, Markdown, Word) and, unlike the deliverables one this run extracted,
  **does not exclude `na`** — so a checklist item marked N/A still prints a
  suggestion telling the author to satisfy it. Same extraction, one panel over.
- **The Markdown export writes model text raw** — a newline inside `evidence`
  promotes itself to a sibling bullet, so model text becomes report structure.
  Site-wide in that export, not specific to this panel. The screen and the
  `.docx` are both correctly escaped (verified).
- **A deliverable entry with `name: ""` is dropped with no caveat**, and a
  whitespace-only name becomes an unnamed "extra" row with a red chip.
- The HARPER "Table 1 = milestones table" numbering question, unchanged:
  verify `src/data/harper.ts:42` against the template before acting on it. The
  template is unreachable from this sandbox.

#### Checked and found NOT to be a problem — do not re-derive these

- **`normName` is genuinely robust.** En dash, em dash, slash spacing, trailing
  period, trailing space and case were all driven and all matched their
  canonical row. Only genuinely *different* names ("Table 1", "KM curve") miss,
  and those surface as labelled extras plus a caveat.
- **Every degenerate `deliverables` fails safe**: `null`, absent, `[]`, an
  object, and an array of strings each produce seven honest "Not assessed" rows
  with an accurate caveat and no console error.
- **`STCOL` covers every status the deliverables path can produce**, confirmed
  by reading `w:color` out of a real `.docx`, including the new `na`.
- **Deliverables never touch the conformance score.** The headline number, the
  bar and the framework tally are built only from `byId`. A wrong deliverables
  verdict cannot move the score — which is *why* `na` is safe here and was not
  safe on the checklist side, where the file already carries a disclosure
  sentence about a run that marked everything `na`.
- **`DELIVERABLE_NAMES` is in exact character-for-character lock-step** with
  the worker's `DELIVERABLES`.
- **The panel never carries over a previous run's rows.**
- `if (!rows.length)` in `renderDeliverables` is dead code — `rows` is seeded
  from `DELIVERABLE_NAMES`, so it is never shorter than seven.

#### Two environment notes

`git push origin HEAD:main` again — the detached-HEAD correction still applies.
And give scratch files a per-role prefix: three agents wrote into one scratch
directory this run and nothing collided only because every file was prefixed.


### Found 2026-08-23 by a twenty-fourth run — RWE Studio's numeric-role gate

**Chosen by rotation**: the three runs before this one took the builders twice and
the checker once, and RWE Studio had had nothing since the SCCS pass. Two reviewers
on disjoint briefs against a frozen tree, then made to argue with each other, then
a third sent at this run's own uncommitted diff.

#### What the defect was

`numTrouble()` iterated `spec.roles.filter(r => NUM_RULES[r.k] && MAP[r.k])`, and
`NUM_RULES` held two entries — `INTERVAL` and `EVENTS`, both SCCS roles — while
`NUM_ROLES` lists six. **The decimal-comma refusal sat inside that loop**, so on
the ITS and ACNU paths the whole function body never ran. The refusal itself has
been right since the eighteenth run wrote it; it was wired to the wrong thing.

Driven end to end: a de-DE ITS export reported "Mapping complete ✓" and built a
master file holding `125` where the sheet said `0,125` and `10.5755` where it said
`10.575,5` — a modelled rate ~10⁶ too large. `RAWTXT` **already held the evidence**
at that moment (`commaExamples` computes it for every column at ingest). Nothing
read it.

Measured consequences elsewhere on the same entry point, by re-implementing the
estimators in Python (no R in this sandbox):

- **ACNU `TIME`, the sharpest.** A comma correlated with treatment arm — two linked
  data sources recording tenths of a day and whole days — took the hazard ratio
  from **1.4473 (1.113–1.882) to 0.2002 (0.137–0.293)**. Cox is invariant to a
  *monotone* transform of time; this one is not monotone, so it re-ranks the risk
  sets. Direction reversed, both intervals tight, nothing on screen different.
- **A ticked covariate.** Mixed comma (Excel "General" dropping trailing zeros):
  max ΔPS **0.679**, and the SMD *falls* from 1.115 to 0.419 — the balance table
  under-reports the imbalance by 2.7×.
- **ITS `DENOM`, linear branch.** Scaling `N` by *k* scales the coefficient **and**
  its standard error by 1/k, so the t-statistic is invariant to 6 dp (−8.839635 at
  k = 1, 10, 1000). Nothing rescues it. In the **Poisson** branch the same comma is
  exactly invariant (log offset; only the intercept moves by ln k).
- **`DISC`.** A comma scaling it up makes `pmin(TIME, disc)` a no-op, so the
  per-protocol row becomes the ITT row (127 → 224 events against an ITT of 227) and
  reads as "adherence made no difference".

#### What shipped

`src/pages/tools/rwe-studio.astro`, three commits.

- **The comma check is no longer a per-role rule.** It runs over every mapped
  `NUM_ROLES` role and every ticked covariate that `classifyCov` reads as a number.
  Range rules stay per-role, and **two roles correctly have none**: `YCOUNT` is
  "Event count, rate, or level" and a negative or fractional value there *selects
  the linear branch* rather than being an error; `DENOM` because R drops a
  non-positive denominator **per period, after aggregation**, so a rule on raw rows
  would refuse a file whose zero-denominator patient rows aggregate to a positive
  period total.
- **`commaExamples` decides per COLUMN, not per cell.** A cell often cannot say
  which convention it is under (`1,234` is 1234 in Chicago and 1.234 in Berlin);
  the column can. One unambiguous witness settles it, and the ambiguous `1,250` in
  that column is then read as decimal too. A column proving both conventions is
  refused under its own wording.
- **`TIME` and `DISC` gain rules; `INTERVAL` and `TIME` are pair-aware** —
  `n < 0 || (n <= 0 && paired-count > 0)`.
- `profileColumn`'s range no longer prints `min Infinity · max -Infinity` for a
  text-coded binary (`Math.min()` of an empty list) beside a green "✓ clean" — a
  string `#dldict` was writing into the shareable data dictionary.

#### The three arguments that changed the code — this is the part worth copying

1. **Reviewer A reversed a fix the other two were converging on.** `INTERVAL`'s
   shipped rule was `!(n > 0)`, refusing *every* zero-length interval. The R it
   exists to pre-empt does not: `badrow` catches a negative interval and an event
   inside a zero-length one, but a zero-length interval carrying **no** events is
   counted into `ndrop0`, dropped, and reported as "they carry no information
   either way". One such row in eighty-one blocked a file R would have analysed.
   Reviewer B had proposed copying that prose onto `TIME`, which would have
   propagated it. **The guard was stricter than the thing it guards.** Worth asking
   of every new guard: what does the layer below already do with this input?
2. **Neither reviewer's comma fix was right alone.** B proposed routing
   both-predicate matches to the refuse bucket — but `COMMA_DECIMAL`'s first
   alternative matches *every* single-group Western number, so that refuses
   `1,234`. The orchestrator's counter (reject a leading-zero first group) is safe
   but only catches values **below 1**: B then built `1,250 … 8,000` and drove it
   silently through. The column-level decision, which A and B reached
   independently, is what handles both. **A rule that is undecidable per item is
   often decidable per group — look one level up before accepting "genuinely
   ambiguous".**
3. **A rejected rule.** B also proposed "a bare value under 1000 settles the column
   grouped". Unsound — a German column writes 875 as `875` too — and it errs by
   *silencing* the guard, which is the dangerous direction. Not adopted.

#### The diff reviewer found six more, two of them regressions this run introduced

The twenty-third run's lesson held again, and harder: **the ten scenarios this run
had already driven all happened to miss both regressions.**

- **`DEC_ONLY` was enumerated by hand and left out `1234,567`** (four or more
  integer digits, exactly three decimals). The old per-cell code always refused
  those; the new code read the column as grouping. Person-time of 1000.1 days
  analysed as 1,000,100 — *worse than the code being replaced*. Fixed by
  **deriving** `DEC_ONLY`/`GRP_ONLY` from `COMMA_DECIMAL`/`COMMA_GROUPED` instead:
  a value matching one predicate and not the other can only be read one way by
  construction, with a hand-written rule only for the overlap. **If you find
  yourself re-enumerating the cases another predicate already covers, derive
  instead — the enumeration will be incomplete.**
- **`toBin` was applied to the paired `EVENTS` value**, on the reasoning that "the
  roles that pair here are the 0/1 ones". `INTERVAL` pairs with `EVENTS`, a
  **count**. And `yesMap` is keyed by value across the whole file with no column
  scoping, so **one unrelated column coded 1/2 teaches `toBin` that "2" means 0** —
  and two events inside a zero-length interval read as no events. A file that
  blocked before the diff passed after it. `yesMap`'s global scope is worth
  remembering: it is a file-wide vocabulary, not a per-column one.
- Three **false refusals** the diff introduced: a factor covariate (`site` =
  "Boston, MA") is never handed to `Number()` at all, so the check must apply only
  to covariates `classifyCov` reads as numeric; `DISC` is optional and R reads a
  blank as "never discontinued" (`ifelse(is.na(DISC), Inf, ...)`), so the shared
  blank branch is now for required roles only; and **`COVS` is never pruned** when
  a role is mapped onto an already-ticked column, so the panel blamed "a baseline
  covariate" with no checkbox on screen and — because `validateMap` tests
  `numTrouble` before `binTrouble` — *replaced* the accurate 0/1-role message.
- Two screen defects: the contradictory-column refusal printed the generic wording,
  which reads "this tool reads 1,234 as a grouped whole number" directly under a
  list naming 1,234 as unreadable; and examples were joined with `", "` while being
  values that contain commas, so two site names read as four.
- **`commaExamples` scanned each column twice**, doubling ingest cost on a large
  file with nothing on screen to explain the pause (2.3s vs 1.0s on 200,000 × 30,
  main thread). One pass now.

#### Verified this run, and how

- **Zero silent regressions, proved not sampled.** 644 comma-bearing strings, each
  placed **alone** in a column so no witness can help it, graded through the real
  `commaExamples` on both trees. Every value the old code refused is still refused;
  fifteen it passed are now caught. Reuse `scratchpad/ORCH_exhaust.js` — this is the
  right shape of test for any change to these predicates.
- Ten scenarios plus the diff reviewer's seven counter-cases driven in Chromium on
  both trees. Four silent holes closed (ITS de-DE, ACNU negative follow-up, ACNU
  zero follow-up carrying an event, comma'd covariate), one false refusal removed
  (SCCS zero interval with zero events), one new catch (contradictory column, green
  before), and the correct behaviours preserved (US grouped `10,575`, clean ACNU,
  text covariate, optional blank `DISC`, SCCS negative and event-in-zero).
- Seventeen tool pages reload with zero `pageerror` and `typeof window.PC ===
  "object"` on all nine builders.
- Performance measured as median of five: **1.25s against a baseline of 0.87s** on
  200,000 × 30. The residual 1.4× is the price of classifying every comma-bearing
  cell instead of skipping grouped ones. Not recovered.
- **Nothing downstream of WebR was executed** — its CDN is blocked, so the R never
  runs. Every claim about estimator behaviour above is from a Python
  re-implementation, not from this tool's own R. **`Rscript` is NOT installed in
  this sandbox** (nor numpy/scipy); the brief previously implied otherwise.
- **The live site was not checked** — still blocked. Nobody has still opened an
  exported `.docx` in Word.

#### A correction to this file, measured

The comment at `numTrouble` used to say SheetJS resolves `"14,0"` to `140` "while
parsing, so by the time any code here runs the cell is a number" — offered as the
reason a `DATA.rows` check is a no-op **on XLSX**. Driven with the same value in
three containers, it is the other way round:

| input | `DATA.rows[0]` | `RAWTXT` |
|---|---|---|
| `.csv` | `305` (comma gone) | populated |
| `.xlsx`, text cells | `"30,5"` (comma survives) | populated |
| `.xlsx`, real number + de-DE display format | `30.5` (correct) | **empty** |

The eighteenth run's *fix* was right and its stated *reason* was inverted. The
operative conclusion is unchanged and now stronger: **build on `RAWTXT`, never on
`DATA.rows`** — it is the only source covering both broken containers, and it
correctly stays empty for a well-formed numeric XLSX, so a correct file is not
falsely refused.

#### Open, examined this run, deliberately left — ranked

- **The ITS family choice fires on a CLEAN file, which nothing else on this list
  does.** `counts <- all(abs(a$Y-round(a$Y))<1e-8) && all(a$Y>=0)` then
  `fam <- ... if(counts) 'poisson' else 'linear'` (`:2030-2031`). Integer-ness is
  not count-ness. A correctly-parsed **integer rate per 100,000** — the commonest
  way an ITS outcome is reported in this field — gets a count likelihood it never
  asked for, a **rate-ratio estimand in place of the absolute one**, and an SE of
  `1/sqrt(sum Y)` computed from the units the number happens to be written in
  (measured 2.24× too small, exactly `sqrt(215/43)`). Reviewer A asked for this to
  be recorded as *"fires on a clean file"* so it is not triaged alongside the parse
  bugs, and scheduled ahead of everything below. **This is the best next target in
  RWE Studio.** It changes what the tool estimates, so it wants its own run and its
  own review.
- **The comma is one entry point, not the bug.** Shipping this closed the *comma*
  route into `TIME`, `DENOM`, `DISC` and the covariates — it did not close the
  class. A `TIME` column mixing months and days across two sources re-ranks the
  risk sets with no comma anywhere; a `DENOM` in thousands vs units, or a
  per-100,000/per-1,000 mix-up mid-series, reproduces the linear-branch result
  exactly. **Do not read the fix as retiring those findings.**
- **An all-ambiguous comma column is still read as grouping, silently.** Every
  value one group of exactly three digits, no witness either way (`1,250 … 8,000`).
  Genuinely undecidable per column — that column is character-identical to an
  ordinary US grouped one — so refusing it would refuse real US files. The honest
  fix is a **non-blocking** notice in the profile table, which needs `RAWTXT` at
  profile-render time. **Ordering trap, measured:** `rebuildFromSheet` calls
  `setData` (which builds `DATA.profile` **and clears `RAWTXT`**) and only then
  computes `RAWTXT`, so `profileColumn` has never seen it — instrumented, `RAWTXT`
  was empty on all four calls. Recomputing `DATA.profile` and re-calling `render()`
  at the end of that `try` is enough; `render()` is idempotent. Consider whether an
  `info`-level flag is loud enough, and whether it is noise on ordinary US files —
  that is a judgement for Daniel.
- **`profileColumn`'s range still prints the comma-mangled number.** `30,5` shows
  as `min 305 · max 3355` under a green "✓ clean" — the last place a human could
  catch the mangling by eye. Same `RAWTXT` ordering problem; fix it with the item
  above.
- **`tableFromAOA:559` has the prototype bug one layer up.** `seen = {}` keyed by
  header text, so a column named `constructor` becomes **`constructor_NaN`** and
  `__proto__` becomes `__proto___[object Object]` — and that mangled name reaches
  the dropdowns, the data dictionary and the exported master CSV header. Confirmed
  by upload. `commaCols` and `RAWTXT` are `Object.create(null)` now; this one is
  pre-existing and was left because it is not this diff's, but it is the same
  species the checker's `DELIV_ALIASES` needed fixing for.
- **`opts()` still offers every column for every role** while `suggestCol` enforces
  `role.types` and its comment says why. Both reviewers confirmed it independently;
  the eighteenth run flagged it as "a one-line change, **but global and not checked
  against the other three designs**", and that judgement still stands. Mapping
  SCCS's case ID to a *date* column gives 2.45 (2.26–2.65) from a true IRR of 1.00.
- **Two buttons write different files under one filename.** `:1206` (`#dlmaster`,
  in the Step-2 profile card) exports `DATA.rows` — the raw upload, pre-clean,
  pre-mapping, with mixed date formats — while `:3282` (`#dlmaster2`) exports
  `MASTER`. Both name it `<dataset>-master.csv`, so downloading both silently
  overwrites one with the other. Driven: 24 lines vs 22, different content.
- **The page's logging claim at `:343` is false.** "Apply the fixes you want; each
  is logged and re-emitted into the exported R script." **None of the five Step-4
  checkboxes is recorded in any export** — turning them all off produces a
  byte-identical script — and no export says which column filled which role.
  Worse, `analysisCSV()` renames columns to role keys for WebR but **neither
  download button exports that file**, so the exported script `stop()`s on the
  exported master immediately. This is what makes every parsing defect unauditable
  after the fact, and it contradicts `:400` ("The R script is exactly what ran").
- **`DISC` permits `n === 0`**, giving `pmin(TIME,0) = 0` — a subject with zero
  person-time in the per-protocol arm, unflagged. ARGUED, not driven.
- **ACNU has no R-side `okrow`.** A `TIME = 0` row is dropped nowhere, so it still
  enters `n`, the `N = %d; exposure = %d` line, Table 1's denominators, the
  propensity model, the ESS and max-weight diagnostics, the trimming quantiles and
  the SMDs — contributing nothing to the estimate while inflating the cohort it is
  reported as describing. Reviewer A's recommendation: drop `TIME <= 0` before the
  propensity model with a `RESULT_NOTE`, the pattern ACNU already uses at `:1341`.
  **Not shipped because it cannot be executed here** (no WebR, no `Rscript`), and
  an unverifiable change to the analysis path of the most-used design is exactly
  what this file says not to ship.
- **`:2024`'s period-drop message is a bare `cat()`, not `RESULT_NOTE|`**, so a
  drop that removes whole periods is less visible than ACNU's row drop. One-word
  change, not made — same unverifiability.
- Everything on the eighteenth run's SCCS list is unchanged: the recurrent-event
  interval, `WebrEngine.astro:33` possibly discarding every R warning, `%.2f` on
  the case-crossover and ACNU estimate rows.

#### Citations

No citation was added or changed in shipped code. Corroborated **by WebSearch
snippets only** (Crossref, PubMed, doi.org and the publishers are all blocked —
this is not verification against a record): Wagner AK, Soumerai SB, Zhang F,
Ross-Degnan D, *J Clin Pharm Ther* 2002;27(4):299–309, doi
10.1046/j.1365-2710.2002.00430.x, whose convention (time-since-intervention = 0 at
the first affected period) is the one `:1993` implements; Yang & Dalton, SAS Global
Forum 2012, paper 335-2012 (`:1428`); Stürmer et al., *Am J Epidemiol*
2005;162(3):279–89 (`:1500`).

One to record precisely rather than as "needs checking": **Lunt M, Glynn RJ,
Rothman KJ, Avorn J, Stürmer T, *Propensity score calibration in the absence of
surrogacy*, Am J Epidemiol 2012;175(12):1294–1302** is corroborated on author list,
title, journal, year, volume, issue and pages. The **pin-cite at `:1517` — "Lunt
2012, Table 2 footnote g" — and the formula attributed to it are NOT corroborated**;
snippets do not reach table footnotes. Full text at
`pmc.ncbi.nlm.nih.gov/articles/PMC3491974/`, blocked here, trivial for a human.

#### Checked and found sound — do not re-derive

- **`EVENTS`' rule is correct.** The conditional likelihood conditions on each
  case's total event count, so a fractional count has no meaning in it, and R's own
  `nfrac` agrees. Guard and analysis do not disagree here.
- **The ITS denominator aggregation** (`dmode='auto'` → `'first'` when constant
  within a period) is right, and the comment explaining why summing a repeated
  population figure leaks `log(rows per period)` into the offset is right.
- **Non-positive/missing denominators are dropped before `npre`/`npost` and before
  `a$Y/a$N`** — correct ordering.
- **Uniform rescaling is exactly invariant** for: ACNU `TIME` in Cox (HR and SE
  bit-identical), a covariate in the PS (ΔPS 5.6e-16; only Table 1's mean/SD is
  wrong), and ITS `DENOM` in the Poisson branch. Only the **non-uniform** case
  moves the estimate — which is the ordinary case, since the number of decimal
  places varies row to row.
- **Quasi-Poisson accidentally rescues a uniform comma in ITS `YCOUNT`**: Pearson
  dispersion scales by exactly *k* and quasi-Poisson SEs are exactly
  scale-invariant, so for `k·disp₀ > 1.5` the interval is restored. Reviewer A
  raised this against his own case and declined to claim the stronger version: on a
  flat series the mixed-comma path **widened** intervals rather than manufacturing
  significance. The ITS damage is a distorted point estimate plus a substituted
  estimand, not a false narrow interval.
- **`p = NaN` from an unmapped pair is unreachable** — `EVENTS` and `EVENT` are
  both `req: true`, and `numTrouble` short-circuits to `[]` while anything required
  is missing.
- **`esc()` covers every interpolated value** in the new `innerHTML`; no injection
  via column name or cell value.
- **`normName`, the duplicate-role guard, `binTrouble`, `suggestCol`'s
  conservatism, `renderDedupeUI`'s preference memory, the harmonic-constancy guard
  and the cycle-length guard** were all driven and are all correct.
- **Ordinary US grouped data is untouched**, including `1,234` alone, `12,345,678`,
  `1,23,456`, `1,234.56`, and a column mixing `1,234` with `10.5`.
### Found 2026-08-23 by a twenty-fifth run — HARPER item 3, the amendments log, end to end

**The longest-standing open item in this file — "`PC.mountAmendments` is still never
called in seven of nine builders", open since the third run — was examined in
full and deliberately NOT done. What was done instead is six defects in the
amendment path that all nine builders already ship.**

Two reviewers on disjoint briefs against a frozen tree (a methodologist and an
applied analyst), then a third sent at this run's own uncommitted diff.

#### Why the mounting item was left, after being the reason this run picked the area

The obvious move is to add the three documented lines to the seven builders that
lack them. Two independent facts killed it:

- **Four of the seven could not have kept what the user typed.** `sequential-trial`,
  `interrupted-time-series`, `trend-in-trend` and `case-control` build `readForm()`
  as a fixed object literal that never mentioned `amendments`, so the autosave
  dropped it. Mounting an editor there would have shipped a control that loses
  the user's work on reload — a *new* silent-data-loss bug, in the name of
  closing an old item. (That hole is now fixed on its own merits; see below. It
  is the precondition for mounting, not a substitute for it.)
- **The methodologist's argument, which held up:** mounting is seven file edits
  and fixes none of the six defects found this run, *all six of which reproduce
  on the two builders that already have the editor*. Mounting the editor
  everywhere makes the tool more capable and no more honest.

So the item stays open, and it is now unblocked rather than merely unstarted.

#### What shipped

`src/components/ProtocolCommon.astro`

- **A sentence that printed its own refutation.** `amendmentIntro` appended the
  version string as a parenthetical, so the four builders with a Version box
  exported *"This is the original version of the protocol (v2.0 · 2026-08-01);
  no amendments have been made."* No seed, no draft, no trickery — type a
  version and download. On two of those four (ACNU, descriptive-analysis) there
  is no editor with which to make the claim true. The parenthetical was pure
  duplication: every builder with a version field already prints it in the
  document header. Deleted.
- **A count of rows asserted as a count of amendments.** *"The protocol has been
  amended 3 times since its original version"* is not something the tool can
  know. Recording the original version as row 1 — ordinary practice — made the
  prose say "amended 1 time" about a table whose only row *was* the original;
  and a hand-off payload with a newline inside its Reason cell splits into three
  rows, so **one amendment was reported as three**. It now describes the table
  it stands above. The empty-case sentence is **unchanged and deliberately so** —
  see the argument below.
- **One exploratory click asserting an amendment.** `writeRows` states in its own
  comment that "an accidental '+ Add' never becomes an empty amendment"; the add
  handler defeated it by prefilling today's date, which made the row non-blank
  and so survived the filter. One click on "+ Add an amendment" — what a
  first-time visitor does to see what the panel is for — put *"The protocol has
  been amended 1 time"* and a row of four em dashes into the exported protocol.
  The new row is now empty.
- **A panel that read out the DOM instead of the document.** `writeRows` drops
  blank rows but does not repaint, so a row emptied by hand stayed on screen
  with the "no amendments" line gone: the panel showed a pending amendment while
  the document denied any existed. The status line is now derived from the rows
  that will actually export.
- **An empty date box above a Word file printing the date.** `<input type="date">`
  discards any value that is not `yyyy-mm-dd` and reads back `""`. Nothing ever
  copies the DOM back into the row array, so the original string **survived and
  exported**: a draft or `?seed=` link carrying `04/03/2026` showed a blank
  Version date — sitting between two dated rows, reading as one the sender
  forgot to date — while the `.docx` printed `04/03/2026`. Confirmed in a real
  Word file. The control now falls back to a text box carrying the real value,
  amber, with a counted panel-level warning. **Nothing was ever lost and nothing
  errored; the screen and the document simply disagreed.**
- **The pipe the comment promised would survive.** The block comment claims a
  typed pipe round-trips end to end. It does through the *field*, and not through
  the *Markdown emitter*, which escaped `|` but not `\`: a cell holding `a\|b`
  was emitted as `a\\|b`, which GFM reads as an escaped backslash followed by a
  **live** delimiter. Parsed against the real rule the row went from 6 cells to
  7, the cell truncated to `a\`, and `b` became its own column before the
  renderer truncated to the header width. The `.docx` printed it correctly, so
  the two exports of one protocol disagreed about the table's shape.

`src/pages/tools/{sequential-trial,interrupted-time-series,trend-in-trend,case-control}.astro`

- **The same draft, two exports, opposite answers.** `PC.restore` creates the
  hidden `amendments` textarea on all nine builders, so all nine accept and
  export a seeded amendments log. These four never persisted it. Seed a link,
  download Word — *"amended 1 time"* plus the table. Reload with no query string,
  download again — *"no amendments have been made"*. Two Word files, same study,
  same browser, no user action in between. One key each.

`src/pages/tools/active-comparator-new-user.astro`

- **The study design diagram, filed under "Amendments and updates".**
  `abstractMd`/`abstractDocx` end at the amendments section, not at the abstract,
  so whatever a builder appends lands under that heading. Eight builders open a
  `## 1. …` heading immediately after the call; ACNU appends the HARPER 7.2
  figure. In Word's navigation pane and any generated TOC the diagram was a
  child of the amendment log, and with amendments recorded it printed directly
  beneath the amendment table, reading as an illustration of the amendment
  history. It now has its own Heading 1 (verified as `pStyle=Heading1` in a real
  `.docx`).

#### What the two reviewers disagreed about, and who was right

The methodologist argued the tool is not entitled to assert *"no amendments have
been made"* — a claim about the world, from a tool that can only observe a field,
and one that **no user action on seven of nine builders can falsify** — and
proposed "no amendments are recorded in this protocol".

The applied analyst rebutted: that reintroduces exactly the ambiguity the feature
exists to kill ("no log" vs "no changes yet"), a reader holding the softened
sentence learns nothing because the investigator may keep a log elsewhere, and —
decisively — **the edit touches none of the eight findings**, every one of which
is the tool asserting a *positive* count from content the user never entered.

**The analyst won on the sentence and the methodologist won on the cause.** The
self-contradiction the methodologist correctly identified is produced by the
*parenthetical*, not by the sentence: delete `(v2.0 · 2026-08-01)` and the
contradiction is gone with the claim intact. The empty-case sentence ships
unchanged. Both reviewers independently converged on the *positive* branch being
the over-claim, and that is what was rewritten.

**Do not re-open the "no amendments have been made" wording** without reading
both arguments; two reviewers on opposite briefs have now been over it.

#### The third reviewer, sent at this run's own diff — now 8 for 8

**It found executed damage again, and the sharpest finding was that this run's
fix had inverted the very failure it was written to remove.** Do not skip this
step, and do not trust a diff because you drove seven scenarios through it.

- **The status line was recomputed once per repaint, and typing does not
  repaint.** So the commonest path of all — click "+ Add an amendment", type
  into the row — left *"This row is still empty, so the protocol states that
  this is the original version"* on screen above a document that already
  carried the row. Before the diff there was no line at all in that state: the
  false sentence existed **only** because of the fix, and it was reached by
  every user's first amendment. Fixed by moving the notes into their own
  container and recomputing them on every keystroke.
- **The empty starting row made "+ Add" non-additive.** The handler re-read the
  field, which had just correctly dropped the blank row, so pressing the button
  twice before typing left one row. Fixed by giving the panel a row model that
  is rebuilt from the field only in `sync`.
- **The new ACNU heading could be emitted with nothing under it.** It was pushed
  above the `try` whose `catch` pushes nothing, so a throw from
  `designDiagramFigure` produced a table-of-contents entry promising a figure
  that was not there. Moved inside the `try`.

The generalisable lesson, and it is the same one in a new costume: **a panel
that describes a document must be recomputed on every event that changes the
document, not on the subset of events that happen to redraw it.** When you add
a sentence that reports state, enumerate every path that mutates that state and
check the sentence is refreshed on each one.

The reviewer also confirmed, by reverting to a control build and by parsing the
real Markdown with micromark, that the escaping fix is correct and that the old
code genuinely lost content — and noted one thing left untouched: the *other*
tables in `case-crossover`, `self-controlled-case-series` and
`descriptive-analysis` still escape pipes only, the same latent hole one panel
over.

#### Deliberately left, argued, not manufactured

- **A raw `?seed=` payload bypasses the pipe escaping entirely.** `amEsc` is
  applied only in `writeRows`, i.e. only to text typed into the mounted editor.
  A seed carrying `2026-03-04 | v2.0 | 7 | 8 | Sections 7 and 8 harmonised |
  Reviewer comment` — "7 | 8" meaning sections 7 and 8 — exports **verbatim the
  "complete, plausible, wrong row"** this file's own comment says was fixed:
  Section = "7", Amendment = "8", the description shoved into Reason. Reproduced
  on trend-in-trend, which has no editor to show anything. **Left because the
  storage format is genuinely ambiguous for raw input** — nothing distinguishes
  "a cell containing a pipe" from "an extra column" — so the honest fix is a
  visible warning on an ambiguous row, and seven of nine builders have no panel
  to put one in. **This is the best next target here, and it wants the mounting
  item done first.** The count claim it used to inflate is already fixed.
- **A newline inside a cell still splits one amendment into several rows**, with
  the continuation text landing in the Version date column. Same root cause, same
  reason for leaving. The false *count* is fixed; the row splitting is not.
- **A seeded amendments log persists invisibly into the user's own draft** on
  ACNU, descriptive-analysis and clone-censor-weight, and the only removal is
  "Clear all", which destroys the whole draft. The analyst ranked this first; the
  methodologist argued it is the seed trust model, identical to population,
  comparator and outcome, all silently overwritten and more consequential.
  **Checked, and the analyst's framing overstates it: the text IS on screen** —
  the live `#preview` pane renders the amendment table — and Clear all does
  remove it (verified on all seven). Real but ranked below what shipped.
- **HARPER's Reason column carries an instruction the tool drops**: note whether
  the amendment occurred after registration / finalization / approval — the one
  distinction item 3 exists for. **Corroborated by search snippet only.** Not
  acted on because the template is unreachable from this sandbox and the change
  would put words in HARPER's mouth. Verify against the template before acting.
- The two amendment statements (front matter, and the `"registration"` tail
  section) were examined by both reviewers: they do **not** contradict in any
  reachable state — one is a state claim, one a process claim — and no builder
  skips `"registration"`. Both reviewers said leave it. Left.

#### Checked and found NOT to be a problem — do not re-derive these

- **`AM_COLS` matches HARPER.** Columns 1, 2, 3 and 5 directly corroborated from
  a snippet quoting the template's own column instructions; the 4th inferred.
  Right count, right order, right labels. **Do not "fix" it** — and note the
  analyst's argument that changing it at all is a silent data migration on an
  unversioned format whose overflow rule (`amSplit`: everything past the fourth
  pipe is Reason) would re-split every existing draft and every link already sent.
- **Every one of the nine "Clear all" paths really does clear the textarea.**
  Four different idioms, all bottoming out at `""`. Verified on all seven.
- **`fromForm`'s fallback picks the right form on all nine pages** — each has
  exactly one `<form>`, and no shared component or layout emits one.
- **`mountAmendments` lands inside the form on all nine** (tested by mounting at
  runtime on the seven that do not): inside the form, before the download
  buttons, visible, and the editor's row inputs carry no `name` so they never
  leak into `FormData` or any export.
- **`amEsc`/`amSplit`/`amUnesc` round-trip correctly for everything typed through
  the editor**, including `7 | 8`, lone and doubled backslashes, and 5+ pipes.
- **Every degenerate seeded `amendments` fails safe** — array, object, number,
  boolean, null, whitespace — with no console error.
- **The non-ISO date was never deleted.** Both reviewers and the orchestrator
  traced every `writeRows` and `paint` call site independently: nothing copies
  the DOM back into the row array. The hypothesis that it silently destroyed the
  user's date is **wrong**; it was a display divergence only.
- **The HARPER citation**, corroborated by search snippet only, never against
  Crossref (blocked): Wang SV, Pottegård A, … Schneeweiss S, … *Pharmacoepidemiol
  Drug Saf.* 2023 Jan;32(1):44-55, doi:10.1002/pds.5507; co-published in *Value in
  Health*. Item 3 is front matter, immediately after the abstract, and is a table.
  Nothing in the repo cites it; no citation was added or changed this run.

#### Verified this run, and how

- Everything was driven in Chromium against a local `astro build` + a static
  server. Both `?seed=` and typed-into-the-editor paths.
- **Real `.docx` files generated** through the blocked-CDN route (`npm pack
  docx@8.5.0` + `page.route`) and `word/document.xml` read — including
  `w:pStyle`, which is how the new ACNU heading was confirmed to be a genuine
  Heading 1 rather than bold text.
- The Markdown escaping fix was checked against a **GFM-faithful scanner**
  (backslash escapes the next character), not by eyeballing the string: the old
  escaper yields 7 cells for a 6-column header and eats `b`; the new one yields 6
  and round-trips `a\|b`. Diffing the expression would have shown nothing.
- States driven: nine date spellings (`2026-3-4`, `04/03/2026`, `March 2026`,
  `2026-03-04T00:00:00`, `4 March 2026`, `2026/03/04`, `2026-13-45`, `not a
  date`, empty); one "+ Add" click with nothing typed; add-then-clear; multi-row
  with one bad date among good ones; row deletion; degenerate seeds; the
  persistence round trip on all nine builders.
- **All twelve tool pages re-loaded with zero `pageerror` and
  `typeof window.PC === "object"` on all nine builders**, before and after.
- **The live site was not checked** — `danielhttsai.github.io` is still blocked
  from this sandbox. Still nobody has opened one of these `.docx` files in
  Microsoft Word.

<!-- CLAIM 2026-08-23 (twenty-sixth run): DONE — RWE Studio's ACNU
     propensity-score estimation path. Seven commits; see the section at the
     bottom of this file for what shipped, what was deliberately left, and the
     ranked list of what the two reviewers found and nobody has acted on yet. -->

### Found 2026-08-23 by the OTHER twenty-sixth run — the Protocol Checker's Markdown export, where the model's words became the report's structure

**Chosen by rotation** (the three runs before this took the builders, RWE Studio and
the builders again; the checker had had nothing since the `na` run) **and from that
run's own ranked open list.** A concurrent run claimed RWE Studio's ACNU
propensity-score path on the same day — its marker is directly above — so there are
two twenty-sixth runs and they do not overlap. Two reviewers on disjoint briefs against a frozen tree,
then a third sent at this run's uncommitted diff — twice, because the first pass at
the diff found two must-fixes and the fixes needed reviewing in their turn.

#### The finding, in one sentence

The screen escapes model text into HTML and the Word export gives every model string
its own `TextRun`; the **Markdown** export concatenated it into a line-oriented format,
so the AI wrote the report's structure and, once, its voice. Nothing errored. The
`.docx` and the `.md` of the same run disagreed about how many verdicts the report
contained.

Worst observed, all reproduced by parsing the emitted file with micromark + GFM rather
than by reading the string:

- **A blank line inside `summary` ends the blockquote it is quoted in.** The rest became
  an unattributed paragraph in the report's own voice, stating a rival total ("Overall
  21 of the 23 HARPER elements are addressed") eight paragraphs under the tool's
  computed 16 of 23 — defeating the exact guarantee the comment above that line exists
  to make. `summary` is `required` by the worker's schema and is mentioned **nowhere**
  in its prompt: no length, no format, no instruction. It is the one field with no
  guard-rail at all.
- **A closing ``` at column 0 OPENS a fence.** One `evidence` string carrying quoted
  code buried **eighteen verdicts, two section headings and the framework citation**
  inside a single code block, in a file that still looked complete. Row count in the
  parsed report: 41 where it should have been 76.
- A line beginning `- ` in `evidence` became a **sibling of the HARPER items** and
  re-parented the real row's Suggestion under it. A line beginning `#` became a report
  heading, a peer of "What this check could not do". A criterion with a newline forged
  an `<h2>Exclusion</h2>` **directly above the tool's own contradicting "Exclusion: none
  stated"** — the "complete, plausible, wrong row" species, one panel over.

None of this needs a hostile document: `worker.js` tells the model to *"quote or closely
paraphrase the part of the text that addresses the item"*, and protocols are full of
headings and numbered lists.

#### What shipped — `src/pages/tools/protocol-checker.astro` only

1. **`mdText()`** — collapse every whitespace run to one space (after stripping U+FEFF),
   applied at all ~13 model-derived interpolations in `downloadReport()`, plus
   **`mdField(v, dash)`** for the six design fields, where the tool prints an em dash to
   mean "the AI gave us nothing". **Collapse, not escape**, and the reason is the reason:
   the screen and the `.docx` already collapse, so an escaper that preserved the model's
   paragraphing would have been a *fourth* behaviour for one report. Verified: across 31
   crafted responses on **both** frameworks, every exported report is `hr=1 pre=0
   table=0` with no escaped summary, and every heading appearing anywhere in any of them
   is either the report title or a real section of `harper.ts` / `target.ts`.
2. **One suggestion rule for both panels** (`NO_SUGGESTION` / `suggestionText` /
   `showSuggestion`). The planned-outputs panel's rule had been extracted by the
   twenty-third run; the checklist's three copies were left behind, still spelled as a
   not-equal blacklist, so they never learned about `na` — and the worker's prompt
   *requires* a suggestion for every checklist item, carving out only `met`. Result, in
   all three surfaces: "10. Reporting of adverse events — N/A" with "Suggestion: State
   how adverse events will be handled" under it.
3. **`evidenceText()` hoisted out of `renderDeliverables`** and applied once in
   `reconcile`, so a checklist verdict the model returned with blank evidence says so
   instead of exporting a red label and a bare instruction.
4. **A caveat naming the checklist ids the model marked N/A.** Every other status that
   leaves the score is already named by id; N/A left it as a bare count, and N/A is the
   one verdict here whose basis the tool cannot inspect.
5. **The dead `SCORED` constant deleted** — nothing read it, and it listed `na` as
   scored while the live `assessable` excludes it. A landmine, not a bug.

#### The reviewers' argument, and who was right

The methodologist proposed demoting `na` → `missing` on protocol templates, on the
snippet-corroborated reading that HARPER's own "n/a" is *content the author writes*
(which should score **met**), while this tool's `na` deletes the row from the score.
**The applied analyst refuted the prescription and the methodologist withdrew it**: the
model's `na` cannot distinguish "the author wrote n/a" from "the author was silent", so
demotion prints a false red for a claims study on HARPER item 10 — whose own hint says
an n/a answer is correct there. It re-commits the twenty-third run's inversion. The
diagnosis survived, the fix did not, and what shipped is the residue both agreed on:
name the rows. **Do not re-open the demotion** without reading both arguments.

They also disagreed about the fix for the export itself. The analyst argued a collapse
was "over-broad and destructive" and wanted a line-leading-marker escaper; the
methodologist argued for the collapse on three-surfaces-agree grounds. **The
methodologist won**, and the analyst's own corrected rule is why: the escaper would have
needed to handle blank lines, seven line-leading markers, HTML block starts and a
per-context continuation prefix — while the collapse removes every vector by removing
every line ending, in one expression, with nothing to get wrong.

#### The reviewer sent at this run's own diff — now 9 for 9, and it took two passes, the second of which found a regression in the first pass's own fixes

**It found that the fix left the run's number-one finding alive behind a one-character
hole, under a comment asserting the hole was closed.** `mdText` was written
`.replace(/\s*\r?\n\s*/g, " ")`. **CommonMark counts a lone CR as a line ending** — and
a lone CR is what this tool's own `.docx`/PDF extraction produces, handed to a prompt
that asks the model to quote the text back. On the built, "fixed" site an `evidence`
string with CR paragraph marks still forged an `<h1>`, still opened a code fence, and
still walked the AI's summary out of its blockquote. Now `/\s+/g`.

It also found:

- **The new caveat asserted a cause it had not caused.** "…which removed them from the
  score's denominator — it is out of 1 rather than out of 23" is true only when N/A is
  the *sole* reason rows left the score, which is exactly the state it was tested in.
  Ordinarily rows also leave as Not assessed, so two N/A verdicts were credited with a
  collapse that twenty omitted rows had done — **directly below the bullet naming those
  twenty**, and contradicting the tool's own correct summary sentence. It now says what
  N/A removed and points at the score line for the arithmetic.
- **`mdText(v) || "—"` defeated the em-dash refusal for falsy non-strings**: `0` and
  `false` printed as "0" and "false" in the Markdown where the screen and the `.docx`
  both printed "—". A three-surface divergence *created* by the fix for three-surface
  divergences. Now `mdField(v, dash)`.
- **`mdField`'s first form inverted the very divergence it was written to remove.** A
  `typeof v === "string"` gate sent *every* non-string to the em dash, not only the
  falsy ones — so a `population` returned as `["Adults with T2D", "aged 40 or older"]`
  exported as "Population: —", the tool asserting a refusal about a field the model had
  filled, beside a screen reading "Adults with T2D,aged 40 or older". The test has to be
  on the value's truthiness, not its type: `(v ? mdText(v) : "") || dash` is exact parity
  with the `v || "—"` the other two surfaces already use. **Two successive fixes for one
  three-surface divergence each created a new one, in opposite directions.**
- **`\s+` turned a zero-width character into a visible one.** JS's `\s` includes U+FEFF,
  so a quoted Japanese sentence exported with a word gap in a script that has none —
  BOM debris being routine in `.docx`/PDF extraction, which is the text the model is
  asked to quote back. U+FEFF is now stripped first. U+200C/U+200D are deliberately NOT
  stripped: they are meaningful in Arabic, Indic and emoji sequences, and are not `\s`.
- **Suppressing the suggestion on an N/A row deleted the reader's best evidence that the
  N/A was wrong** — in the same commit as a caveat telling them to audit those rows. The
  model marks HARPER item 3 (amendments) N/A on a v1.0 protocol and then writes "Add an
  amendments table with version, date and rationale": its own words contradicting its own
  verdict, and the evidence line on an N/A row is the model's justification *for* the
  N/A, self-serving by construction. **So the text is no longer deleted, it is
  relabelled** — `"The AI called this row N/A and still wrote:"`, on all six surfaces.
  This file's own idiom (`unrec`, the `DELIV_NEVER_NA` demotion) is to keep the model's
  words and relabel them, and a silent deletion is not a visible refusal.

The generalisable lessons, both new costumes on old ones:

- **A "nothing can" claim is a whitelist claim.** `\r?\n` is a not-equal against one
  spelling of a line ending, and the comment above it said "nothing the AI writes can
  create a row, a heading, a rule, a table or a code block". Same species as
  `if (s.effect !== "HR")`. When you write an absolute in a comment, enumerate the
  spellings the code actually matches.
- **A sentence that reports a number must be true in every state that produces the
  number, not in the state you drove.** The caveat was correct in both scenarios its
  author tested and wrong in the ordinary one.

#### Deliberately left, argued, not manufactured

- **`"present"` in the worker's deliverables rubric is a promise, not a shell** — the
  twenty-third run's own top-ranked open item, unchanged. Still the best next target in
  the checker, and still unverifiable from this sandbox (no Gemini key; `worker.js`
  deploys separately). Its drafted one-sentence fix is in that run's section.
- **The seven deliverable descriptions are methodologically wrong in five places** —
  unchanged, and the rename trap with `DELIVERABLE_NAMES` still applies.
- **`skip` is still the un-validated twin of `skipOutputs`.**
- **The tool quotes itself as "the AI's own words"**: a `DELIV_NEVER_NA`-demoted row
  whose evidence was blank renders "…the AI's own words are kept here so you can judge
  them — it said: The AI returned this verdict with no evidence…". Pre-existing (`ev`
  was byte-identical before this run's hoist), one-line fix, out of this run's scope.
- **`Suggestion: [object Object]` / `Evidence: a,b`** for non-string fields. Both
  reviewers rated it adversarial (the worker's `responseSchema` types both `string`) and
  `suggestionText`/`evidenceText` `String()` them exactly as the old code did.
  Deliberately unchanged — the twenty-third run drove this and shipped `String()`.
- **`normName` does NOT normalise `/` ↔ `-`.** A deliverable name re-typeset with a dash
  *replacing the slash* ("Love plot - covariate balance") misses its canonical row and
  becomes a labelled extra. **This falsifies the "normName is genuinely robust" entry in
  the twenty-third run's do-not-re-derive list** — that entry drove dashes replacing
  *dashes*, not dashes replacing the *slash*. Real, visible (labelled + caveated), left.
- A deliverable with `name: ""` is still dropped with no caveat.

#### Verified this run, and how

- Everything driven in Chromium against a local `astro build` + a static server, with
  the POST to the worker intercepted by `page.route` and fulfilled with crafted JSON —
  the technique the twenty-third run documented, and it still works exactly as described.
- **Every Markdown claim in this section is a parse, not an eyeball.** `micromark` +
  `micromark-extension-gfm` install offline here (`npm i --no-save`); the harness is
  `O-audit.mjs` — a structural census (headings, `<hr>`, `<pre>`, `<table>`, top-level
  `<li>`, and whether anything escaped the AI-summary blockquote) run over the *same*
  crafted response before and after, so any heading present in both is the tool's own.
  **Use this: diffing the expression shows nothing; diffing the census shows everything.**
- **31 crafted responses** driven end to end after the fix, across both frameworks: zero
  page errors, zero run errors, `hr=1 pre=0 table=0` in every one, no escaped summary in
  any, and no forged heading anywhere.
- **A harness trap worth an hour to the next run:** `drive.mjs` leaves the framework radio
  on HARPER, so a crafted response carrying `"framework":"target"` is **correctly refused
  by the page** before `render()` runs — the report is empty and `runerror.txt` explains
  why. A 27-run "all clean" battery had therefore exercised the TARGET path zero times,
  which is the path where the N/A caveat's arithmetic had been most wrong. Move the radio
  with `page.$eval` + a `change` event before clicking Check.
- **Content preservation was measured, not assumed**: every model-supplied string in
  three of the worst cases was checked to appear verbatim (whitespace-normalised) in the
  exported `.md`. The only two omissions in the whole set were the two deliberate ones.
- **Real `.docx` files** generated through the blocked-CDN route (`npm pack docx@8.5.0`
  + `page.route`) and `word/document.xml` read, including the new N/A note paragraphs
  and the new evidence sentences.
- **All twelve tool pages** re-loaded with zero `pageerror` and `typeof window.PC ===
  "object"` on all nine builders, before and after.
- **The live site was not checked** — `danielhttsai.github.io` is still blocked from this
  sandbox. Nobody has still opened one of these `.docx` files in Microsoft Word, and this
  run's comment about how Word treats a line ending inside `<w:t>` is scoped to structure
  for exactly that reason.
- **No citation was added or changed.** The methodologist's HARPER readings (that it is a
  pre-study template, and that its own guidance is to enter "n/a" in a section that does
  not apply) are **snippet-corroborated only** — Crossref, PubMed, doi.org and the
  publishers are all blocked here — and the second one is load-bearing for a fix that was
  withdrawn, so nothing rests on it in shipped code.

### Found 2026-08-23 by a twenty-sixth run — RWE Studio's ACNU propensity-score path, end to end

**Chosen by rotation** (the twenty-fifth run took the amendments log across the
builders, the twenty-fourth took RWE Studio's ingestion gate) and because RWE Studio
is the only tool on the site that computes a number from the user's own patients.
Target: `SPEC.acnu.rscript` and everything that feeds or reads it — the covariate
plan, the propensity fit, common support and trimming, the weight families and their
refusal gates, the balance table, matching, fine stratification, the per-protocol
estimand, the `PSDIAG`/`PSW`/`PSBAL` panel and the exports.

Two reviewers on disjoint briefs (a methodologist and an applied analyst) against a
tree that kept moving under them, plus the orchestrator working a third seam.
**Everything below was executed** — Chromium against a local `astro build`, real
`Rscript` (R 4.3.3, survival 3.5.8) on the page's own generated scripts, and real R
output fed back through `window.RWEngine` so the actual parsers and renderers ran.

#### The environment recipe, which is now cheap — reuse it

Three scratch scripts made everything else possible, and cost about twenty minutes:

- `harness.mjs` — Playwright loads the built page, clicks a demo *or injects arbitrary
  rows through the demo code path*, sets the design, roles, covariate ticks and all
  twelve analysis options, clicks Build master file, then `page.evaluate`s the page's
  own `analysisCSV()` and `buildScript()` and writes `data.csv` + `analysis.R` with
  the `/data.csv` path rewritten absolute. `Rscript` then runs it.
- `panel.mjs` — runs `Rscript` for real, feeds the output back with
  `page.evaluate(o => { window.RWEngine = { run: async () => o } }, rout)`, clicks Run,
  and dumps `#psdiag` / `#anaresults` / `#table1` as rendered text. This is how every
  panel claim here was checked.
- `matrix.mjs` — snapshots the generated R **and its real output** across fifteen
  option combinations into a directory, so a change is diffed on OUTPUT.

**To inject rows you must use the bare `DEMOS` binding, not `window.DEMOS`.** The whole
script block is `is:inline`, so a top-level `const` is script-scoped and never lands on
`window`; `window.DEMOS.cohort.build = …` throws. Bare `DEMOS` works.

#### What shipped, in order of damage

**1 · The demo the page teaches from could not be run at all.** Click
`cohort (ACNU · ITS)`, choose the active-comparator design, map the three roles, press
Quick pick — the steps the caption itself gives — and the mapping never validated.
Step 4 never appeared, and none of the four numbers the caption advertises was
reachable. One row in six hundred: `buildCohort` draws a survival time from an
exponential (strictly positive) and rounds it to a tenth of a day (not), so patient
D10495's draw of ~0.02 days with the outcome occurring became **an event at zero days
of follow-up**. The `TIME` rule in `NUM_RULES` refuses exactly that and is right to —
`coxph` does *not* object, it puts that subject in a risk set containing everybody.
The gate the twenty-fourth run added is correct; the demo data was wrong, and had been
since it was written. Floored at the rounding grain: exactly one row changes, in two
fields, and the caption's numbers come back to the digit (565 analysed, crude 1.04,
IPTW 0.70, 2:1 matching 0.77). **Nobody had run the flagship demo through ACNU since
the gate landed.** Run the demos after touching a gate.

**2 · The per-protocol rows report a confident effect for a drug that does nothing.**
The whole PP analysis is one line: censor at the mapped discontinuation time, reuse the
baseline treatment weights. There are no IPCW anywhere in the file and nothing said so.
Executed on a simulated cohort of 4000 with **no treatment term anywhere in the
hazard**, where only the treated discontinue and the sicker ones stop sooner: ITT
returned 1.05 (0.97–1.13), correctly, and all three weighted PP rows returned **0.84
with intervals excluding 1**. Both reviewers reached this independently with different
generators. Worse, every PP row wore a marginal estimand badge — `IPTW (ATE) - PP HR`
— inherited verbatim because the label is built once with `est` interpolated. Badges
now appear on ITT rows only; a note over the PP rows says what was and was not done.
The rows stay: refusing to compute a per-protocol contrast would be worse than naming
its assumption.

**3 · The one green tick in the diagnostics panel was the only cell that could not
fail.** On the demo the page calls "a cohort that should not be analysed" — 30.6% with
no counterpart, IPTW and SMR both withheld — the panel closed with a green dot reading
*"Balance after overlap weighting — largest |SMD| 0.000 … Weighting did its job."*
Overlap weights have an **exact** small-sample balance property: with a logistic
propensity score, the overlap-weighted means of every covariate *in that model* are
identical between arms by construction (Li, Morgan & Zaslavsky, *JASA*
2018;113(521):390–400 — **search snippet only**, Crossref blocked; the same citation is
already in `active-comparator-new-user.astro:184`). Executed: overlap 0.000000 for
continuous and binary, 4.5e-10 through the multinomial form, on data whose unweighted
|SMD| is 1.01, against 0.016–0.073 for IPTW on the identical data. And the `pick` chain
makes overlap the balance scheme *exactly when IPTW and SMR are unticked or withheld*
— the worst data the tool ever sees. **The identity belongs to the sample the model
was fitted to**: trimming happens after the fit and keeps the original scores, so it
degrades — 0.000 untrimmed, 0.000 after a 2% percentile trim, 0.055 after a 31%
common-support restriction. So "exact by construction" is asserted only where it is
exactly true; trimmed runs get their own sentence; neither gets a green dot.

**4 · Twelve switches a user could change with no effect at all.** `invalidateMaster`
was wired to the mapping, the covariates and the cleaning ticks, and to **none** of the
analysis options. Run the demo, then set Positivity to "restrict to common support" —
which is what the refusal box tells you to do — and the status still read `Done ✓`, the
six estimates were still on screen, the panel still said "the inverse-probability
weights are stabilised", and **"⬇ R script (.R)" still shipped `LAST.script` carrying
`trimmode<-'none'`** while the control beside the button said `cs`. The nine ITS option
boxes had a listener that only re-validated the mapping, so they were as stale.

**5 · `NA (95% CI NA-NA)`, in bold, in the estimate column.** `not estimable` was
reached only when `coxph` *threw*. It does not throw on a cohort with no events or one
arm — it returns a fit with an NA coefficient, and `sprintf('%.2f', NA)` is the string
`NA`. All six rows printed it, under `Done ✓`, a complete Table 1 and three green dots.
Every row now produces three finite numbers or says it could not; the check is shared
with the matching and fine-stratification rows, which print their own `sprintf` and had
the identical hole. A one-arm cohort is refused at the mapping step (naming which arm
everything reads as, and pointing at the Coded flags vocabulary — a misread treatment
column is the likelier cause) and in the generated R, for anyone running the download.

**6 · "Fine stratification (50 strata …)" when 2 were fitted.** The count was the
number *asked for*, interpolated by the browser. Ties collapse the quantile breaks —
one binary covariate gives two distinct scores — and the label travels verbatim into
both exports. It now reports what was fitted.

**7 · Four sentences the run's own output refutes.** *"so all rows are comparable"*
after a restriction (the `PSDIAG` line two lines later disagreed: percentile trimming
on the no-overlap demo removes 16 rows and leaves **229 of the 784 kept** outside
common support). *"Every weighted estimate above extrapolates for them"* printed with
only matching and fine stratification ticked, which do the opposite — they exclude
those patients. *"Restrict to common support first"* said to someone who just did,
contradicting section 1 two paragraphs above. And, in the calibration panel,
*"further from the gold standard than doing nothing"* asserted with no comparison, with
the three numbers needed printed in the same sentence — false in **90% of withheld runs**
over 400 replicates. All four now check before they claim.

Also: the `overlap` demo caption said the crude comparison gives "HR ≈ 1.7". It gives
**1.95 (1.58–2.39)**, and the interval does not contain 1.7. Corrected.

#### Where the two reviewers disagreed, and who was right

- **The balance column.** The methodologist put `pick`/`wBAL` in his *checked and found
  correct* list ("the chain is sound … `balHeld` fires correctly"). The analyst filed
  the unconditional fallback as a defect. **Both missed the thing that mattered** — that
  for overlap weights the column is an arithmetic identity — which the orchestrator
  found by running the demo rather than reading the chain. On the narrow question the
  methodologist was right (the `balHeld` caveat does fire and does say the right thing),
  so nothing changed there. **Lesson: "I verified the warning fires" is not the same as
  "the number the warning is about means anything."**
- **Truncation.** Both independently found that it defeats the refusal gate, and
  disagreed only on framing — the analyst called it a misleading remedy, the
  methodologist called the accompanying note false. Both are right and neither fix
  shipped; see below.
- **A claim that did not survive.** The orchestrator first reported that invalidating a
  mapping after a run left the previous estimates on screen. **It does not.**
  `invalidateMaster` fires, `LAST` is cleared and `hideResults()` runs.
  **The trap: `innerText` in Chromium degrades to `textContent` for a non-rendered
  element, so a hidden panel still returns its old text.** The giveaway was that the
  second dump had lost every tab and newline the first had. Assert visibility with
  `isVisible()` or the `hidden` class, never by reading text back.
- **A bug this run introduced and caught in its own diff.** The first version of the
  fine-stratification note keyed "the score takes too few distinct values" on the
  post-drop stratum count, and so told a reader of the no-overlap demo that their
  propensity score was degenerate when the real cause was two strata holding one arm
  each. **Found by diffing the R output of fifteen option combinations, not by reading
  the change.** Build `matrix.mjs` before you edit generated R.

#### Deliberately left — ranked, all reproduced, none acted on

The next run on this file should start here. Every item below has a reproduction.

1. **Truncation switches the refusal off, and the note about it is false twice over.**
   `unstable` is evaluated on `dF`, the *post-truncation* weights, and truncation caps
   the weights by construction — so the gate can always be defeated by the control the
   refusal box itself points at. On the "should not be analysed" demo (true HR exactly
   1.00): `none` → withheld; `p1` → **1.12 (0.85–1.49)**; `p5` → **1.47 (1.18–1.84)**,
   excluding the null in the harmful direction. Balance is *destroyed* by the same
   truncation (|SMD| 0.178 → 1.424) and balance is never a gate. The note then calls a
   39% move across the null "a little bias", and tells the reader to "report the
   untruncated estimate alongside it" — the estimate the tool refuses to print as a row,
   which it then prints inline to three decimals. **This is the single biggest thing
   left.** Gating on the untruncated weights is one option; the design comment at the
   `unstable` line deliberately chose the other, so read it before changing it.
2. **The stability gate cannot see a nearly-empty arm, and the shipped default blinds
   it.** `wdiag` computes Kish ESS over the **pooled** weight vector. With stabilised
   weights (the default) and rare exposure every weight is ≈1, so with **3 exposed of
   400** the panel prints *"Effective sample size 400 of 400 (100%) — Comfortable"*,
   three green dots, and releases a significant HR (reproduced at 6.32 (1.79–22.33) and,
   on the reviewer's seed, 1.00 (0.29–3.47)). The **unstabilised** column immediately
   above shows what the data really is (ESS 2.8%, top 1% holding 49%) under a sentence
   reassuring the reader the difference is cosmetic. An arm-stratified ESS is the
   obvious fix; nobody has shown it is the right one.
3. **`smrbad` applies a pooled threshold to SMR weights, where it measures the
   arm-size ratio.** SMR weights are 1 for every treated patient and `ps/(1-ps)` for
   comparators — different scales by construction. With 10 treated of 1000 the tool
   **refuses** an estimate whose largest weight is 1.0 and whose comparator arm has an
   effective sample of 933 of 990, saying "a weighted hazard ratio here would be an
   artefact of a few patients" three lines above "Largest single weight 1.0×". The
   mirror also holds: a file where **10 comparators of 10,990 move the ATT from 1.02 to
   0.80 across the null** passes the gate, because 5,990 treated at weight 1 dilute the
   denominator. And the remedy it offers ("restrict to common support") provably does
   not move it: 4.0% → 4.0%.
4. **Complete separation produces four confident, identical hazard ratios.** With a
   covariate that perfectly separates the arms, `csLo > csHi` (the common-support
   interval is *empty*), every estimand is unidentified — and the panel prints IPTW ESS
   "300 of 300 (100%) · Comfortable" with a largest weight of 0.5×, beside four
   estimates equal to the crude one. The red common-support box at the top is correct;
   nothing downstream acts on it. In the same run **matching and fine stratification
   were both ticked and produced neither a row nor a note** (`length(mi)>2` and
   `length(br)>=3` both false — the fine-stratification silent case is now fixed, the
   matching one is not).
5. **The weighted intervals are 24–46% too wide**, and the crude, matched and stratified
   rows in the same table are correctly sized. Bootstrap with the propensity model refit
   (B=600) and simulation (B=1500) agree: reported-SE ÷ empirical-SD is 1.46 for IPTW,
   1.31 SMR, 1.26 overlap at a strong confounder, against 0.97 crude and 0.99 fine
   stratification; coverage 99.4% / 98.7% / 98.7% against a nominal 95%. The
   conservatism grows with how prognostic the confounder is — worst exactly where
   propensity methods are used. The fix is bootstrap SEs, which is a real piece of work.
   Note two things established and not to be re-derived: `robust=TRUE` is a **no-op** on
   the crude row (SE 0.04057 vs 0.04058) and **redundant** on the weighted ones (`coxph`
   auto-enables the sandwich for non-integer weights), so the flag is not the cause.
6. **A covariate the tool says it "left out" still deletes most of the cohort.**
   `c_dropmiss` builds its required-column list from raw `COVS`, not from
   `covPlan().info`, so a covariate `covPlan` has already excluded as unusable still
   drops every row where it is blank. A `biopsy` field recorded for 1 patient in 5 —
   what a hospital extract always looks like — moved the crude HR from 0.97 to **0.58**
   and the analysed population from 400 to 80, with the screen saying *"Left out:
   biopsy (constant — it carries no information)"*. R's own missingness note never
   fires, because the browser deleted the rows before R saw them. **The exported report
   carries no row count at all**, so it cannot be audited for this.
7. **The surrogacy statistic has no sampling-variability accounting.** Under the exact
   null `S = LR1/LR2 ~ Beta(½,½)`, so `P(S ≥ 0.9) ≈ 0.205` analytically; simulated at
   17.5% over 400 replicates, where applying the released correction inflated mean
   absolute bias 2.5×. Also: the comment attributes `S` to "Lunt 2012, Table 2 footnote
   g" and **search snippets do not corroborate any likelihood-ratio-ratio statistic in
   that paper** — what they describe is a DAG-derived bias formula, and Lunt's setting
   is a validation study *without* outcome data, in which a Cox-likelihood surrogacy
   statistic could not be computed at all. The `"s-low"` text's claim that "in Lunt's
   scenarios at this level calibration roughly doubled the error" is **uncorroborated**;
   the nearest reachable figures (Stürmer, *Med Care* 2007;45(10 Suppl 2):S158–65) report
   32–106% bias *reduction* when surrogacy holds. **Unverified, not wrong** — the papers
   are unreachable from here. Verify against full text before acting.
8. **"Fine stratification" names a method the code does not implement.** Desai/Rothman
   *Epidemiology* 2017 takes stratum boundaries from the **exposed** group's propensity
   distribution and assigns **stratum weights**; this code cuts pooled quantiles and
   **drops** every patient in a single-arm stratum (70% of the cohort in one reproduced
   run). It implements the comparator the paper argues against, keeps the failure mode
   the paper exists to fix, and uses the paper's name. **Method characterisation is
   snippet-only.**
9. **`NA`/`NULL`/`.`/`-`/`Unknown` become legitimate factor levels**, and the profiler
   reports the column `0%` missing and `✓ clean`. A numeric `age` with 57 such cells
   became a 37-level factor, folded to 25 dummies in a 400-row propensity model, with
   `-` and `.` printed in Table 1 as patient characteristics.
10. **The fold-rare default can collapse a factor to one level** and then kill the run
    with `contrasts can be applied only to factors with 2 or more levels`. The covariate
    note announces "site, 200 levels → 1 after folding" and gives a green tick. Unticking
    the box refuses it correctly — so the *default* is the broken path.
11. **The exported report drops the entire diagnostics panel.** `PSDIAG`/`PSW`/`PSBAL`/
    `PSHIST` are stripped from `display` and rendered only by `renderPsDiag`, so the Word
    or Markdown file a supervisor receives shows "withheld — weights unstable" beside a
    comfortable-looking `SMD after IPTW = 0.178` with **no ESS, no top-1% share, no
    common-support verdict, and not the on-screen sentence that reconciles them**.
12. **"⬇ Report (Word)" is a dead button when `unpkg.com` is unreachable** — no file, no
    error, no message — i.e. on exactly the hospital networks this tool is built for.
13. **Range checks on follow-up time exist only in the browser.** The download header
    says the script "reproduces the on-screen result in desktop R"; pointed at a file
    with 40 negative follow-up times it prints a full plausible table with no warning.
    `chk01`/`chknum` have R-side twins precisely so guards survive export; the range rule
    never got one.
14. Smaller: the balance row renders *inside* the last scheme's block while labelled with
    a different scheme's name; the collinearity note names the internal column (`COV4`),
    which appears nowhere on screen; `PIPE_SAFE` silently rewrites covariate labels, so
    two columns differing only in a `|` collide into one Table 1 row; a leading-zero
    department code (`"01".."04"`) is modelled as a linear quantity; `mxof` skips a
    covariate whose SMD is `NA` (complete separation), so `PSBAL` reports `ncov=2` about
    a summary one covariate contributed to.

#### Checked and found NOT to be a problem — do not re-derive

- **Per-scheme weight diagnostics exist.** `PSW` carries each scheme's own ESS / max
  weight / top-1% share and the panel prints a block per scheme. **The "Known open
  items" entry saying weight diagnostics cover IPTW only is stale** for SMR and overlap;
  fine stratification does not weight, and its own diagnostic (patients retained) travels
  with its estimate. What remains true from that entry is only that there is still **no
  post-matching balance table** — and when a weighted estimator is selected alongside
  matching, nothing says the matched cohort's balance is unreported.
- **`smdcat` is a correct Yang & Dalton multinomial SMD** — invariant to which level is
  dropped, and its `k==2` branch agrees exactly with `wsmd` on the same 0/1 variable.
  `wsmd` is correct for continuous and binary.
- **The matching caliper is the Austin standard** (`0.2 × sd(logit(PS))`), the greedy
  note's causal claim is true (matched exposed mean PS 0.483 vs dropped 0.751), and the
  ratio-impossibility note is right including operator precedence.
- **"Stabilising changes the estimand not at all" holds numerically** — stabilised and
  unstabilised IPTW agree to four significant figures in point and interval.
- **The PSC correction algebra is right**: `β_T = β*_T − (α₂/α₁)β*_PS` matches the
  calibration model, the `lm` runs in the correct direction, both scores are on the
  probability scale, and the bootstrap refits **both** propensity models per replicate.
- **Thousands separators in a covariate do not reach R**: cleaning normalises them, and
  the hypothesis that `complete.cases` running on raw strings before the covariate
  `as.numeric` could leave `length(ps) < nrow(d)` **does not reproduce** through that route.
- **`m_ratio` and `m_nstrata` are `<select>`s with fixed options** — no `1e3` route.
- **Hostile column names and non-ASCII factor levels** survive `analysisCSV` → `read.csv`
  → `TABLE1` → panel → report without shifting a cell; every rendered cell goes through
  `esc()`.
- **The SCCS, case-crossover and overlap demos all still map cleanly**, and the ITS half
  of the cohort demo was never blocked (it reads `index_date` and `outcome`).
- **Citations touched this run**: Li/Morgan/Zaslavsky *JASA* 2018;113(521):390–400 —
  **corroborated from a search snippet only**, Crossref/PubMed/doi.org all blocked. It
  was already in the repo verbatim; the exact-balance property it is cited for was
  additionally **verified by executing it in R**, which is the stronger evidence.

#### Verified this run, and how — and what was not

- Six of the seven fixes were confirmed by **diffing the real R output of fifteen option
  combinations** before and after; the fifteen ITT-only cases are byte-identical across
  the per-protocol change, and the cohort demo's advertised numbers are unmoved.
- Every panel claim was rendered from **real `Rscript` output** fed back through
  `window.RWEngine`, with **zero `pageerror`s**, and all thirteen tool pages reload clean
  with `typeof window.PC === "object"` after every commit.
- The overlap exact-balance property, the per-protocol censoring bias and the strata-tie
  collapse were each **executed in R**, not reasoned about.
- **Not verified: the live site.** `danielhttsai.github.io` is still blocked from this
  sandbox; everything was checked against a local build and a static server.
- **Not verified: WebR.** Its CDN is blocked, so every R result here comes from desktop
  R 4.3.3. Message text for degenerate fits could differ; the numbers should not.
- **Not verified: the real upload path.** Everything went through the demo-injection
  code path, so `RAWTXT` was empty in every run and **the decimal-comma / grouped-
  thousands guard in `numTrouble` was never exercised**. Treat it as untested, along with
  sheet selection, header detection, Excel serial dates and the codebook matcher.
- **Not verified: the `.docx` export.** `unpkg.com` is blocked, so the Word claims here
  are from reading `buildReportDocx`, not from a generated file. Still nobody has opened
  one in Microsoft Word.


### Found 2026-08-23 by a twenty-seventh run — the weight-stability refusal gate, end to end

**Chosen by the previous run's own ranked hand-off** rather than by rotation: its
section ends "the next run on this file should start here", and its items 1, 2 and 3
were all defects in one mechanism — the rule that decides whether RWE Studio prints
a weighted hazard ratio or withholds it. Rotation would have sent this run to the
generator hub; the hub's open items are editorial and this one releases wrong numbers.

Two reviewers on disjoint briefs (a methodologist and an applied analyst) against a
tree that kept moving under them, then a third sent at this run's own diff. **The
orchestrator also found a defect in its own finished work before that reviewer
reported, by asking one question of its own fix: does this refuse anything it
shouldn't?** Ask it. It cost one R script and caught a regression.

Everything below was executed: Chromium against a local `astro build`, real `Rscript`
(R 4.3.3, survival 3.5.8) on the page's own generated scripts, and real R output fed
back through `window.RWEngine` so the actual parsers and renderers ran.

#### Environment — R is not installed, and the recipe is cheap

- **`Rscript` is absent from a fresh sandbox.** `apt-get install -y --no-install-recommends
  r-base-core r-cran-survival` gets R 4.3.3 + survival 3.5.8 in about a minute. A bare
  `apt-get install r-base-core` **fails** on a stale index — run `apt-get update -qq` first.
- Everything else in "Environment traps" still holds: unpkg blocked, Crossref/PubMed/
  doi.org blocked, `danielhttsai.github.io` blocked, `npm i --no-package-lock`.
- **Build to a FIXED directory and leave it there.** `--outDir "dist-$$"` plus
  `rm -rf dist-*` between builds leaves the static server bound to a deleted directory,
  serving 404s — and `pagecheck` will report "all pages clean" because a 404 page has
  no JavaScript errors either. Two reproductions were lost to this. Use one name
  (`dist-run27`), and have any page check assert on page *content*, not just `pageerror`.
- **`pkill -f serve.mjs` kills the agent's own shell here** (exit 144, the command chain
  dies mid-way and any heredoc after it never runs). Kill by PID.

#### What shipped, in order of damage

**1 · The safety rule read whichever weight scale the user picked.** `d0 <- if(wtmode==
'unstab') dU else dS`. Stabilising multiplies each *arm's* weights by a constant, and
Kish's effective sample size is scale-free within an arm but not across two, so an
arm-wise rescale moves the pooled figure without moving anything real. On a 400-row
extract with 10 exposed patients the pooled figure reads **0.5% of the cohort
unstabilised and 34.0% stabilised** — same patients, same propensity model, same
estimand — and the shipped default released **HR 0.06 (95% CI 0.01-0.47)** for a drug
generated with no treatment term in its hazard at all, while the other setting refused
it. Five separate safeguards sat downstream of that one line. **Verified that the
per-arm figures are identical between the two scales to ten decimal places
(97.2278806168 either way) while the pooled figure crossed the threshold.**

**2 · The pooled figure is blind to an arm that has collapsed, on any scale.** In that
same extract the exposure arm was worth **1.08 effective patients of 10**, one of them
holding **96% of the arm's weight**, identically under both settings. The rule is now
read **per arm**, at the same thresholds as before (ESS < 10% of that arm, heaviest 1%
> 25% of that arm's weight). Applied where they mean something, those thresholds catch
every case here under every setting.

**3 · Truncation switched the refusal off — the control the refusal box recommended.**
The rule read the post-truncation weights, and truncation caps weights by construction:
it raises the effective sample size and lowers the top-1% share on any data at all. On
the demo the page calls "a cohort that should not be analysed" (true HR exactly 1.00):
no truncation withheld; 1/99 released **1.12 (0.85-1.49)**; 5/95 released **1.47
(1.18-1.84)**, excluding the null in the harmful direction. What truncation cannot fake
is balance: across those three runs the largest |SMD| went **0.178 → 0.903 → 1.424**
against a crude 2.183 — *the one configuration whose weights did the job was the one
being refused.* Truncation no longer moves the verdict at all, and `balfail` (truncation
+ |SMD| > 0.1) withholds on top of it. **The whole eighteen-cell sweep of
weights x truncation x trimming on that demo now refuses; before this run exactly one
cell released a number, and the number was 0.72 (0.52-1.01).**

A claim this run made and then had to withdraw: a 264-cohort search found no case where
truncation both passed the stability rule and balanced the arms, and the first commit's
comment concluded the rescue "does not appear to exist". **A counter-example turned up
in this run's own sweep** — on that demo restricted to common support, 1/99 truncation
moves the largest |SMD| from 0.566 to 0.080. It is still refused (the untruncated
comparator arm is worth 14 effective patients of 250, one weighted 165x, and the cell
returns 0.72 where the truth is 1.00), so the code is right and the comment was not.
Corrected in place. **A truncated weight profile that looks balanced is not evidence
that the cohort carried the information** — that is the sentence to keep.

**4 · `smrbad` measured exposure prevalence.** SMR weights are **exactly 1** for every
treated patient by construction, so with clean overlap `sum(w) ≈ 2·nT` and
`sum(w²) ≈ nT`: pooled `essPct ≈ 400 × prevalence` and `top1 ≈ 0.5 / prevalence`, both
functions of prevalence alone. Executed: at 1.3%, 1.9% and 2.4% exposure the pooled
figure came out 4.9, 7.4 and 9.3 against a closed form of 5.0, 7.6 and 9.6, and a
perfectly clean cohort was refused as "an artefact of a few patients" while its
comparator arm was 91-95% effective and every treated weight was 1.0. Blind the other
way too: a cohort with a real ATT positivity failure — comparator arm **6.1% effective,
largest comparator weight 22.6** — passed. Now judged on the comparator arm alone,
against `nC`, and the panel says which arm the figure belongs to and why.

**5 · A hazard ratio from one event.** 3 exposed of 400 with **1 exposed event**
released **3.20 (95% CI 1.56-6.58)** beside a crude **0.73 (0.10-5.42)** — the honest
width — under "Effective sample size 385 of 400 (96%) · Comfortable". Weighted
estimates are now withheld when either arm holds fewer than **five effective events**.
That five is **this tool's own rule of thumb and the panel says so**; it applies to
overlap weighting too, which is otherwise never gated, because the cause is missing
data rather than unstable weights.

**6 · The refusal never left the browser.** `PSDIAG`/`PSW`/`PSBAL` are stripped before
the R output reaches the report, and the explaining panel is rendered client-side only,
so the file a supervisor receives carried the whole refusal as one table cell reading
"withheld - weights unstable" — no figures, no reason, and no record of which weight
setting produced it. Each withheld scheme now emits a `RESULT_NOTE`, the one channel
that already reaches both exports. **Verified by reading the generated Markdown.**

**7 · Sentences the run's own numbers refuted.** "Stabilising took the effective sample
from 5% to 57%… only the arithmetic" presented an arm-wise rescale as a precision gain
(the released estimate was 3.8% *less* precise than the refused one). "Truncation trades
a little bias for precision" stood above a measured **4965% change that crossed the
null**, and told the reader to report alongside it an estimate the tool refuses to print.
"Add the unbalanced covariates to the model" was printed about a single-covariate model
whose one covariate *is* the unbalanced one. "Top 1% of patients hold X%" is the heaviest
*single* patient whenever n < 100, because `k = max(1, ceiling(0.01n))`.

**8 · `ciok` passed a boundary fit.** One exposed patient with no exposed events:
`coxph` warns "coefficient may be infinite" and returns `exp(coef)` = 8.3e-07 with an
interval of 1.2e-07 to 5.9e-06 — strictly positive, finite, three numbers — printed by
this tool's own two-decimal format as **"0.00 (95% CI 0.00-0.00)"**. The test is now the
display's own: a row whose printed figures are not the figures is not a row.

#### The defect this run put into its own diff, and how it was caught

**The first fix for the pooled gate kept the pooled gate.** Moving the rule to the
unstabilised weights removed the dropdown dependence — the point — and left the shape
wrong: pooled decays with exposure prevalence on *either* scale, for the same reason
`smrbad` did, which this run had just finished proving one estimator over. Executed on
a **randomised** exposure with no confounding, where no weight is doing any work: 3%
exposure reads 12.4%, 2% reads 9.3% and is **refused**, 1% reads 4.8% and is **refused**,
while both arms sit at 97-100%. A rare exposure is not an unstable one, and it is the
ordinary setting for this design.

Found by the orchestrator asking one question of its own finished fix — *does this
refuse anything it should not?* — and answering it with twenty lines of R. **Add that
question to the review of every gate.** Over-refusal is not the safe direction: a tool
that refuses ordinary studies teaches people to click past refusals.

A second one, caught by the first reviewer: the balance guard was gated behind
`truncmask`, requiring the untruncated weights to have failed *first*. When they passed,
truncation was free to unbalance the arms unwatched — **1.33 (1.15-1.54) released for a
drug whose true hazard ratio is 0.75**, reproduced independently by the orchestrator
with its own generator before the change was made.

#### The third reviewer, sent at this run's own diff — now 9 for 9

**Do not skip this step.** It found nine things, one a straight regression, and the
pattern in most of them is the same: *a new rule was added and the sentences explaining
it were written for the case that motivated it, not for every case that reaches it.*

- **The estimability test discarded ordinary results.** Testing all three figures for
  rounding to 0.00 refused **HR 0.0129 (95% CI 0.0018-0.0941)** from 1 exposed event
  against 45 — finite, significant, entirely estimable — because a small hazard ratio
  has a smaller lower bound. It emptied the whole table *including the crude row this
  run's own refusal boxes tell readers to fall back on*. The test belongs to the point
  estimate. **Regression, shipped for about forty minutes.**
- **An effective event count is a weighted quantity, so it collapses when the weights
  collapse.** The thin-arm test was therefore reached on runs whose weights
  independently failed the stability rule, and its box — written for the missing-data
  case — asserted "the weight diagnostics below are healthy" four rows above an
  effective sample of 5% and a largest weight of 163.8x. **Instability is now tested
  first in all three places** (estimate row, panel box, exported note). Generalisable:
  when you add a second refusal reason, decide its priority against every existing one
  and apply that order everywhere the reason is printed.
- **The thin-arm refusal reported raw event counts as its reason**, so the no-overlap
  demo withheld SMR saying "226 event(s) in the exposure arm and 156 in the comparator
  arm" about a cohort with 382 events. The operative figure was 4.0 *effective*
  comparator events and appeared nowhere.
- **The per-protocol rows were not gated at all** — the event vector was the ITT one,
  built once outside the estimand loop. A PP row with three events printed **2.19 (95%
  CI 0.22-22.12)** on a cohort whose ITT counts were 190 and 139, while an ITT arm with
  three events is refused everywhere.
- **A thin-arm SMR refusal reached no export**: the note ran before the flag it reads
  was updated — the exact failure the note had just been added to remove, skipping its
  own new path.
- **The exported note quoted the pooled figures, both of which had passed**, as the
  reason for a refusal the arms caused: screen and file gave incompatible reasons for
  one verdict.
- **The masked rows fired on a condition the masked box did not** (rows blaming
  truncation, box blaming a collapsed arm, same panel), and that branch **deleted the
  per-arm row the paragraph above it says to read**.
- **IPTW's thin flag was applied to every scheme's block**, red-dotting a reported
  overlap row and labelling a comparator-arm figure "pooled across both arms". And
  making overlap's `gated` flag non-constant silently stripped its own explanations —
  "overlap weights cannot exceed 1 by construction" — exactly when the panel was
  claiming the problem was not weight instability. **`soft` meant "cannot explode" and
  was keyed on "was not withheld"; those came apart the moment overlap could be
  withheld.**
- **"Set truncation back to no restriction and this estimate is released" was false in
  43% of the runs that showed it.** The untruncated balance is computed (`mx0`) and was
  never consulted before promising it.

It also confirmed, with a 45-cell option sweep, **0 Rscript failures and 0 page errors**,
that no other design is touched, and that `essOf`/`armdiag` are arithmetically right.

#### Where the two reviewers disagreed, and who was right

- **What the gate should read.** The methodologist wanted per-arm Kish ESS and said so
  with a proof that stabilisation is an arm-wise rescale; the analyst wanted the gate
  pinned to the unstabilised weights. **The analyst's fix was simpler and wrong** — it
  fixes the dropdown dependence and keeps the prevalence artefact — and the
  methodologist's was right but incomplete: he flagged, against his own recommendation,
  that arm-stratified ESS is *necessary and not sufficient*, with a case at 14 events
  where every per-arm figure is green. **Both were needed**: the per-arm rule plus an
  effective-event floor. Neither reviewer proposed the pair; each proposed the half that
  the other's counter-example broke.
- **Whether the released estimates were wrong or merely different.** The analyst named
  this as his own least-confident finding and he was right to: after a common-support
  restriction the estimand is no longer the ATE on the uploaded cohort. His other
  findings compare two configurations of the *same* estimand on the *same* rows, where
  no causal argument is needed at all — which is why they survived and that one is
  recorded here rather than acted on.
- **A claim that did not survive.** The methodologist reported that "top 1%" is
  mislabelled below n=100 and suggested refusing the statistic there. Refusing it is
  wrong — on a 10-patient arm "one patient holds 96% of the weight" is the single most
  informative number on the page. The label was fixed instead.

#### Deliberately left — ranked, all reproduced, none acted on

1. **Balance is a gate only when truncation caused the failure.** Untruncated, |SMD|
   0.292 after weighting releases **1.08 (0.90-1.30)** on a cohort whose true HR is 0.75.
   Both reviewers wanted `mxI > 0.1` to withhold unconditionally, and the standard
   (Austin, *Stat Med* 2009;28(25):3083-3107 — **search snippet only**) is already used
   by this file for `nbad`. **Both reviewers were wrong, and the blast radius is now
   measured** — do not re-propose this without reading the table. Well-specified
   logistic PS, moderate confounding, no positivity problem, 200 replicates per cell;
   the figure is the share of runs an unconditional 0.1 rule would refuse:

   | covariates | n=400 | n=1000 | n=5000 |
   |---|---|---|---|
   | 4  | 1%   | 0%   | 0%  |
   | 10 | 27%  | 4%   | 0%  |
   | 20 | 96%  | 62%  | 4%  |
   | 41 | 100% | 100% | 65% |

   The maximum of k noisy standardised differences grows with k, so at realistic
   covariate counts `max|SMD| > 0.1` is a multiple-comparisons artefact rather than
   evidence that the weighting failed. An unconditional gate would refuse **every**
   twenty-covariate study of 400 patients. That is the failure mode this run spent a
   commit removing, at ten times the scale.
   **If it is done at all it needs a statistic that does not scale with k** — the share
   of covariates above 0.1, or the mean, or a bound that widens with k — and that is a
   new diagnostic, so it is Daniel's call. Note the same arithmetic already applies to
   the balance row's red dot and its `nbad` count, which will be red on most
   many-covariate runs today; nobody has looked at whether that has quietly trained
   readers to ignore it.
2. **The 10% and 25% thresholds have no source.** Searched for and not found; the
   general apparatus (Kish's design effect, ESS = (Σw)²/Σw²) is standard, but no
   published cut-point at 10% and **no top-1%-share diagnostic at all**. Nor is 10%
   conservative: over 400 replicates the untruncated estimator averages ESS 33% and
   still carries +5.8% bias with 90.3% coverage. The file names Li/Morgan/Zaslavsky and
   Yang & Dalton scrupulously, so two unsourced cut-points that decide whether a number
   is printed stand out. Either cite them or say on screen they are the tool's own — the
   `MINEV` rule of thumb added this run does say so, and is the pattern to copy.
3. **The refusal box's advice is still a state machine, not a prediction.** It offers
   the remedy the user has not tried yet, never one it has checked would work. On the
   no-overlap demo, following it to its end was the **only cell in an eighteen-
   combination sweep that produced a number at all**, and the number was wrong. The
   truncation half of that funnel is closed; restriction is still offered without
   checking. The honest version fits the candidate remedy in R and names it only if the
   estimate would actually be released.
4. **`balfail` makes the 5/95 truncation option nearly unusable on confounded data.**
   Measured by the third reviewer over 1500-patient cohorts with one confounder and a
   true HR of 0.80: at confounder strength 1.0 log-OR/SD, 0/60 refused at 1/99 and
   **60/60 at 5/95**; at 1.5, 53/60 and 60/60. `armbad` fires in at most 1/60 of these,
   so the untruncated weights are fine — it is truncation genuinely breaking balance
   each time. **Left deliberately**: the refusal is true, the remedy (turn truncation
   off) is actionable and correct, and the honest reading is that 5/95 truncation on
   confounded data is a bad idea rather than that the gate is wrong. But a control that
   is refused essentially always may be better removed than offered, and that is
   Daniel's call.
5. **The weighted intervals are 24-46% too wide** (twenty-sixth run, item 5) — untouched,
   and now sitting under a gate that is stricter about which of them get printed.
6. Everything else in the twenty-sixth run's ranked list: `c_dropmiss` deleting rows for
   a covariate the tool says it left out (item 6), the surrogacy statistic's sampling
   variability (7), "fine stratification" naming a method the code does not implement
   (8), `NA`/`.`/`-` becoming factor levels (9), the fold-rare default collapsing a
   factor to one level (10), the exported report dropping the diagnostics panel (11 —
   **partly closed this run**: the refusals now travel, the panel still does not), the
   dead Word button (12), browser-only range checks (13), and the smaller five (14).

#### Checked and found NOT to be a problem — do not re-derive

- **The flagship `cohort` demo is untouched by all of this.** Its gate never fires, its
  balance is 0.035-0.040, and it returns 0.70 (0.53-0.92) identically across all three
  truncation settings before and after every commit. Diffed on full R output.
- **The `smdvec()` refactor is behaviour-preserving.** Every TABLE1 SMD, both columns,
  is byte-identical on the flagship demo across all three truncation settings; only the
  intended note text changed. Diffed on output, not on the expression.
- **Per-arm effective size is invariant to stabilisation** — proved algebraically by both
  reviewers and measured at ten decimal places here. Do not "fix" a per-arm figure that
  fails to move when the dropdown changes.
- **Citations touched this run**: none added or changed. Austin 2009 and the several
  references the methodologist assembled (Cole & Hernán 2008, Crump 2009, Stürmer 2010,
  Lee/Lessler/Stuart 2011) are **bibliographically cross-checked across index records
  but content-verified from search snippets only**, and none of them was put into the
  page. The 0.10 balance bar appears on screen as "the usual bar" without attribution,
  which is the status quo, not a new claim.

#### Verified this run, and how — and what was not

- Six scenarios were driven end to end through the built page with real `Rscript`
  output fed back through `window.RWEngine`, before and after every commit: the flagship
  cohort demo × 3 truncation settings, the no-overlap demo × 3, a 3-exposed-of-400 rare
  cohort, a 10-exposed-of-400 cohort under 4 weight/truncation combinations, a
  protective-drug cohort where the untruncated weights pass, and a one-exposed-patient
  degenerate fit. All thirteen tool pages reload with **zero `pageerror` and
  `typeof window.PC === "object"`** after every commit.
- Each reviewer finding was **reproduced independently by the orchestrator with its own
  generator** before being acted on — the truncation defeat, the untruncated hole, the
  stabilisation identity, the `smrbad` prevalence closed form in both directions, and
  the over-refusal.
- **Not verified: the live site.** `danielhttsai.github.io` is blocked from this sandbox.
- **Not verified: WebR.** Its CDN is blocked; every R result here is desktop R 4.3.3.
- **Not verified: the `.docx` export.** unpkg is blocked. The Markdown report was
  generated and read; the Word claims are from reading `buildReportDocx`. Still nobody
  has opened one in Microsoft Word.
- **Not verified: the real upload path.** Everything went through the demo-injection
  code path, so `RAWTXT` was empty in every run.

<!-- CLAIM 2026-08-23 (twenty-seventh run): DONE — RWE Studio's weight-stability
     refusal gate. Six commits; see the section at the bottom of this file for what
     shipped, the two defects this run put into its own diff, and the ranked list of
     what is left. -->


### Found 2026-08-23 by a twenty-eighth run — the amendment log's raw-input path

**The twenty-fifth run's top-ranked leftover — "a raw `?seed=` payload bypasses
the pipe escaping entirely" — is done, and the blocker it cited was not real.**
It left the item because "the honest fix is a visible warning and seven of nine
builders have no panel to put one in". That reasoning narrows this file's own
standard — *make every refusal visible on screen* — to *visible in a form panel*.
**The exported protocol is a screen too.** It is the only surface all nine
builders have, it is where the damage lands (a reviewer holding the `.docx` never
sees the form), and the live preview pane renders it, so a refusal emitted into
`amendmentsMd`/`amendmentsDocx` is on screen on all nine builders today with no
mounting work. If you find yourself blocked on "there is nowhere to put the
warning", check whether the document is the right place before you conclude that.

Two reviewers on disjoint briefs against a frozen tree (a methodologist and an
applied analyst), each then sent at the other's list, then a third at this run's
own committed diff.

#### The invariant everything rests on

`writeRows` joins exactly five cells with `" | "`, each through `amEsc`, so
**every line the editor writes has exactly five unescaped-pipe segments** —
blank cells included, because a blank cell still contributes its separators.
Verified two ways: by construction, and by mounting the panel at runtime on a
builder that does not have it and counting. A line with any other count was not
written by the current editor, and the tool does not know which value belongs in
which column. That is the whole basis of the fix. **The counter must reuse
`amSplit`'s scanning loop, not a regex** — `7 \| 8` has five raw pipes and four
unescaped ones.

#### What shipped

`src/components/ProtocolCommon.astro`

- **The complete, plausible, wrong row, still reachable on every builder.** The
  block comment above this code describes the row it claims to have fixed —
  `"7 | 8"` in Section of protocol, meaning sections 7 and 8, exported as Section
  7, Amendment 8, with the description of the change filed under Reason. The
  escaping it describes covers exactly one of the four ways text reaches this
  field. `?seed=`, a saved draft and `?seed=paste` all write it raw (all three
  run and confirmed to carry the payload verbatim), and `amEsc` is called in
  exactly one place, inside an editor two of nine builders mount. So the row was
  reachable verbatim on every builder, in the preview, the Markdown **and a real
  `.docx`**, all three agreeing with each other and all three wrong — which is
  strictly harder to notice than the export divergence the twenty-fifth run
  fixed. A line that does not hold exactly five values is now **refused**: it
  keeps a numbered placeholder row in the table and is reproduced verbatim
  beneath it, under a heading saying so, with a lead naming the three things that
  actually cause a refusal. The same change catches the short row that shifted
  every value one column left, the Markdown-style leading pipe, the seven-bare-
  pipes payload that used to export a row of four em dashes as a real amendment,
  and the wrapped line that became a second amendment dated with its own
  continuation prose.
- **"; a cell the author left blank is shown as an em dash" — deleted.** One
  glyph carried three states: the author left the cell blank, the parser
  manufactured the cell by padding a short line, and the author typed an em dash
  meaning *not applicable*. The sentence asserted the first, unconditionally, in
  the one HARPER item that exists to attribute changes to people. A seed of
  `2026-03-04 | v2.0 | Section 7 updated` — or of a plain sentence with no pipes
  at all — made the protocol tell a regulator that a named human deliberately
  left cells blank that the parser invented. Refusing short lines removes the
  second state; the third is byte-identical to the first in storage, so no parser
  work can rescue the sentence. **No legend replaces it** — every legend either
  reviewer proposed is false in the third state too.
- **Zero readable entries no longer falls through to "no amendments have been
  made".** Both emitters short-circuited on `!rows.length` into the empty-case
  sentence, so the naive "refuse everything" implementation would have converted
  a log the tool could not read into an **affirmative denial that any amendment
  exists** — strictly worse than the bug being fixed. This is the first thing to
  run against any change in this area.
- **One click on "+ Add an amendment" destroyed the sender's text.** It touches
  no existing row, and it rewrote the misparse over the raw line in the field,
  in `localStorage`, surviving a reload with no query string: the pipe between
  `7` and `8` promoted to a hard column boundary, permanently. The trigger is
  not the add handler — `writeRows` fires on every keystroke and every delete
  too; mounting alone writes nothing. The editor's model now distinguishes an
  editable row from a refused raw line and re-emits refused lines byte-for-byte.
  Readable rows are still re-serialised — whitespace normalised (`  7  ` → `7`)
  **and backslashes re-escaped**, so a stored `C:\temp` becomes `C:\\temp` in the
  field; the exported cell value is unchanged. **The byte-for-byte freeze holds
  only for refused lines**, which is what it is claimed for.
- **Numbering is positional over the whole log, and both exports run one pass
  over one ordered list.** The natural implementation — emit the readable rows,
  then append the refused lines — silently **re-orders the log and renumbers the
  survivors**: with an unreadable entry chronologically in the middle, the
  sender's third amendment prints as No. 2. In a numbered amendment table that is
  a new wrong-document defect in the shape of the one being fixed, and the
  numbers are how amendments get cited.
- **The refused entry keeps a row inside the table**, not only a block beneath
  it, because amendment tables get lifted out of protocols — into a submission
  package, a change-control form, a reviewer's summary — and a block beneath does
  not travel with the table. Without the stub row a three-entry log with one
  refusal becomes a two-entry table the moment anyone selects it.
- **`mdFence`, not a code span.** A refused line is reproduced verbatim, so one
  backtick in the sender's text would end a code span and the rest would be read
  as Markdown. The fence is sized to the longest backtick run in the content.
- **The refusal lead is spelled out in words, deliberately.** Writing the escape
  as `\|` is correct in the stored field and wrong on the page: a Markdown reader
  renders `\|` as a bare pipe, so the instruction would have printed as "write it
  as |". Caught by reading the rendered output, not the string.

`src/pages/tools/{case-crossover,self-controlled-case-series,descriptive-analysis}.astro`

- **The escaper that stopped one character short.** All three escape `|` and
  leave `\` alone, which is not a smaller version of the fix but a different bug:
  a cell holding `\|` is emitted as `\\|`, which GFM reads as an escaped
  backslash followed by a **live** delimiter. Parsed with micromark's real table
  extension, `"ATC N05A* \| excluding N05AN01"` renders as `ATC N05A* \` — the
  second half of the code set gone, the row still carrying the header's cell
  count, and the `.docx` keeping the whole string. `\|` is R's regex alternation
  and is what a Markdown-literate author types for a literal pipe. **SCCS had the
  most to lose**: its entire risk/reference strip is one cell, so the truncation
  deleted every period after the first — a protocol specifying a self-controlled
  design with no exposure risk window. descriptive-analysis has the widest
  surface (the outcome name feeds the numerator of every ticked metric).
  Now one `PC.mdCell`, because three copies had already drifted (one omitted the
  newline collapse the other two had).

#### What the two reviewers disagreed about, and who was right

- **Which finding is top.** The analyst ranked the "+ Add" destruction first; the
  methodologist ranked the em-dash sentence first and argued the analyst's is a
  *recoverability* defect, not a *document-correctness* one — the wrong `.docx`
  ships identically on all nine builders either way, and what mounting destroys
  is a future fix's ability to reconstruct intent from the draft. **The
  methodologist won on the ranking**; the analyst won a sequencing constraint
  that is now recorded against the mounting item. The analyst's counter — that
  the methodologist ranked first a finding its own remedy deletes for free — is
  also fair, and both are in the diff.
- **Refuse the row, or print it with a marker?** The analyst attacked refusal as
  risking a reader concluding there were fewer amendments. It was right about the
  mechanism (lifted tables) and the fix is the stub row, not the marker: a marked
  row still asserts a specific wrong section number, and the footnote does not
  tell the reader the true value because the tool does not know it.
- **The Markdown-fence false positive — unresolved, and the one live
  disagreement.** A sender who writes the row the way Markdown tables are written
  (leading pipe, or leading and trailing) gets six or seven segments and is
  refused, although a human reads the intent instantly. The analyst proposed
  stripping at most one leading and one trailing empty segment before counting.
  The methodologist opposed it: a full Markdown row has both delimiters and this
  one has only the leading pipe, so the convention is not self-consistent enough
  to strip, and unconditional stripping of a trailing pipe destroys the one
  unambiguous way to say "Reason is deliberately empty". **Shipped as a refusal**,
  because conditional stripping still guesses: ` | v2 | 7 | 8 | x | y` (blank date
  intended, six values) strips to a row whose Version date reads `v2`. The
  refusal lead names the fix — *"remove the | at the start and end of the line"* —
  which is the actionable half. A future run may take the other side with an
  argument; it should not take it silently.

#### Deliberately left, argued, not manufactured

- **A five-segment raw line is undetectable and still exports as a clean wrong
  row.** `2026-03-04 | v2.0 | 7 | 8 | Sections 7 and 8 harmonised`, where the
  sender meant Section = `7 | 8`, is byte-identical to a legitimate editor row.
  No check can ever catch it. This is why nothing in the new wording says the
  printed rows were validated — "could not be read", never "the remaining
  entries were checked". **Do not report this as fixed.**
- **The newline case is contained, not repaired.** The field is
  newline-separated, so a newline inside a cell is indistinguishable from a row
  separator at rest. Both fragments are now refused and reproduced verbatim
  instead of becoming a fabricated dated row, which is the right outcome, but the
  amendment is not reassembled.
- **A raw doubled backslash is silently halved before any of this runs.**
  `C:\\rx\\codes` in the field parses to `C:\rx\codes`, because `amSplit`
  consumes `\\` as an escape pair on text `amEsc` never wrote. Four unescaped
  pipes, so the line is readable and the loss is already done. Low consequence,
  genuinely hard to fix (you would have to know whether the line was
  `amEsc`-written), accepted. Note the acceptance criterion this defeats:
  `CHANGED: false` on a re-serialise is **necessary and not sufficient** — the
  canonicalisation here is idempotent and wrong, so pair it with an assertion on
  `PC.amendmentRows()`'s cell values.
- **A pre-escaping saved draft in which the user typed a bare pipe is now
  refused** — a line the editor did write. `amEsc` landed 2026-08-23, so the
  affected corpus is at most one day of drafts, and those lines are *already*
  mis-columned today, so the refusal replaces a silent wrong row with a loud
  legible one. Accepted rather than migrated. The wording never calls such a line
  invalid, which is the condition the analyst attached to accepting it.
- **On seven builders a refused entry is legible and uncorrectable.** There is
  still no control and the only removal is "Clear all". Both reviewers reached
  this from opposite directions and both now treat it as the argument for the
  mounting item — which the `writeRows` fix has unblocked.
- **HARPER's Reason column carries an instruction the tool drops** (note whether
  the amendment occurred after registration / finalization / approval). Still
  **corroborated by search snippet only**; the template is unreachable from this
  sandbox. Unchanged from the twenty-fifth run's note.

#### Checked and found NOT to be a problem — do not re-derive these

- **`AM_COLS` is right and must not be changed.** Re-corroborated, search snippet
  only. Changing it is a silent data migration on an unversioned format.
- **The preview reaches the amendments section on all nine builders** — but by
  **two different selectors**: `<pre id="preview">` on five, `<pre data-preview>`
  on four (`active-comparator-new-user`, `descriptive-analysis`, `case-crossover`,
  `self-controlled-case-series`). A check using only `#preview` silently covers
  five of nine. Anything added to the *page* has to be added in two places.
- **All nine "Clear all" paths empty the field**, re-verified after the change.
- **An unrelated edit plus autosave leaves the raw text byte-identical**, on both
  a panel and a panel-less builder. `syncAmendments` only reads; that asymmetry
  is deliberate and load-bearing.
- **No XSS**; the preview writes with `textContent` and the `.docx` writer
  escapes (`&apos;` observed in a real `word/document.xml`).
- **`docxKit`'s `text()` spreads its options after `font`**, so
  `{ font: "Courier New" }` works — confirmed as `w:ascii="Courier New"` in a
  generated `word/document.xml`. One reviewer asserted the Word path had no way
  to distinguish the refused line from prose; it does.

#### Six defects a reviewer found, three of them in this run's own diff

The third reviewer, sent at the two shipped commits, found three real ones. All
three are fixed in the third commit; they are recorded because each is a trap.

- **A lone carriage return.** The new shared escaper collapses newlines with
  `/\r?\n/`, which is two of the three line endings GFM recognises. A cell
  holding `Section 6\rand 7` kept its CR, ended the Markdown row there, and the
  remainder became an **unnumbered** row with every value shifted one column
  left — while the `.docx` printed the cell whole. The defect class the whole
  diff is about, reintroduced by the fix for it, on its first day. Fixed in
  `amSplit` so both exports see the same cell, not in one emitter.
- **The refusal heading was not a heading.** With no readable entry there is no
  table above it, so the Markdown ended mid-paragraph and the single newline
  before the bold heading was a soft break: a real GFM parse put the heading
  *inside* the intro sentence, while the `.docx` made it its own paragraph. The
  commit had named the all-refused case as verified — as a **string**, not as a
  rendered document.
- **A trade reversed silently.** `amSplit`'s overflow join protected the trailing
  column deliberately, and a six-segment raw line whose sixth value belonged to
  Reason used to produce a *correct* row. The five-value gate refuses it. This is
  the one input where the new code produces a worse document than the old, it is
  defensible (that line is indistinguishable from the `7 | 8` case), and it is
  now written down where the gate is.
- **And one false sentence in a commit message**, uncorrectable in place:
  "readable rows are still normalised, which is whitespace only". They are also
  re-escaped — a stored `C:\temp` becomes `C:\\temp` in the field after any
  panel interaction. The exported cell is unchanged, so it is a false sentence
  rather than data loss, but **the byte-for-byte freeze holds only for refused
  lines**, which is what it was claimed for.

The reviewer could **not** break the editor's typed model: delete-by-index with a
refused entry first, in the middle and last; add/delete/add-two/delete-middle in
all three placements; "Clear all" on both panel builders; `paintNotes` on every
mixture. It also settled that `window.PC.mdCell`'s availability is a non-issue —
`ProtocolCommon` is script #5 and each builder script #7, both synchronous, and
the same function already calls `PC.abstractMd` unguarded.

Two low-severity notes it left, both pre-existing: a stored line of nothing but
separators is dropped before it becomes an entry, so a non-empty field can still
produce "no amendments have been made"; and `amRefuseLabel` reports the segment
count, so a Markdown-pasted `| a | b | c | d | e |` is announced as "7 values"
when the sender wrote five.

#### Verified this run, and how

- Everything driven in headless Chromium against a local `astro build` + a static
  server. **`scratch/amendments-probe.mjs` is the harness** — rebuild it with
  `npm pack docx@8.5.0` in `scratch/` and run
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratch/amendments-probe.mjs assert`.
  It is not committed (`scratch/` is ignored); its scenarios are `shifted`,
  `newline`, `paths`, `roundtrip`, `freeze`, `degenerate`, `visibility`,
  `clearall`, `health`, `pcount`, `emdash`, `denial`, `remedyb` and `assert`.
- **51 assertions pass**, before and after the third commit,: the freeze (`CHANGED: false` on both panel builders for
  both hostile payloads), a visible refusal reproduced on its own line in the
  preview, the `.md` **and a real `.docx`** for four hostile payloads with no
  fabricated five-column row, the all-refused case not printing a denial, the
  empty log keeping the settled sentence byte-for-byte, editor round trips
  including a typed pipe surviving as one Markdown cell, and every fail-safe
  established in round one.
- **Real `.docx` files generated** through the blocked-CDN route and
  `word/document.xml` read — the ordering case shows rows 1, 2 (placeholder) and
  3 in log order with the raw line in Courier New.
- **GFM claims were parsed with micromark + the real table extension**, before
  and after, never by reading the expression. The old escaper yields
  `ATC N05A* \`; the new one round-trips.
- **All nine builders: zero `pageerror` and `typeof window.PC === "object"`**,
  before and after, plain and under every payload.
- **The live site was not checked** — `danielhttsai.github.io` is blocked from
  this sandbox. **Nobody has opened one of these `.docx` files in Microsoft
  Word**; every Word claim here is what a `word/document.xml` parse saw.
- **Not verified: the `?seed=paste` clipboard auto-read branch** (it shares
  `applyText` with the manual textarea, which was run) and the seed banner's
  "Restore my previous draft" button as a raw-input path.

<!-- CLAIM 2026-08-23 (twenty-eighth run): DONE — the amendment log's raw-input path
     and the three sibling Markdown escapers. Three commits; see the section
     immediately above for what shipped, the one live disagreement between the two
     reviewers (whether to strip Markdown fences before counting), and the three
     things this deliberately does not fix. -->

### Found 2026-08-23 by a twenty-ninth run — the amendments-editor mounting item, end to end

**The longest-standing open item in this file — "`PC.mountAmendments` is called
in only two of nine builders", open since the third run and deliberately left by
the twenty-fifth — is done.** All nine mount the editor, call `PC.syncAmendments`
in every reset path, and pass `amendments` through `pcOf`.

Two reviewers on disjoint briefs against a frozen tree (a methodologist and an
applied analyst), each then sent at the other's list AND at this run's own
committed diff. **That second pass paid for itself twice**: the analyst found a
regression this run had introduced in its own fix, and the methodologist found
that this run's headline sentence fix had corrected one clause and left its twin.

#### Why the twenty-fifth run's refusal was right then and wrong now

Its argument was that mounting "makes the tool more capable and no more honest",
because all six of its findings reproduced on the two builders that already had
the editor. That was true of its tree. What changed the answer is the refusal the
twenty-eighth run added: a stored line that does not hold five values is now
reproduced verbatim under a heading saying so, and when every line is like that
the front matter states that **what this protocol's amendments were cannot be
established from the entries as they stand**. `?seed=`, `?seed=paste` and a saved
draft all write that field on all nine pages. So seven builders could print an
unrepairable defect notice into a regulatory document — nothing to retype the
entry into, nothing to delete it with, and the only removal on the page a "Clear
all" that forgets the whole draft. **Do not re-open the twenty-fifth run's
objection; it has been answered on its own terms.**

#### Mounting is NOT "the three documented lines"

Four defects would have shipped, seven times over, from following the recipe.
All four were measured in Chromium by mounting the panel at runtime on the seven
builders before any file was changed.

- **"Clear all" did not clear the amendment log, if the next thing you touched
  was the amendment log.** The panel's `model` is rebuilt from the field only in
  `sync()`, and `sync()` runs on the form's `change` event — which no reset
  fires, because every one of the nine assigns `.value` in script and `render()`
  dispatches nothing. So after a reset the field was empty and the model still
  held the deleted rows. One click on **"+ Add an amendment"** — which touches no
  existing row — put the cleared amendment back in the field, in the saved draft
  and in the exported protocol, under a sentence counting it as an amendment the
  investigator had made. It survived a reload. **The two builders that already
  called `PC.syncAmendments` after their reset were immune**, which is exactly
  what step 3 is for and exactly why it is easy to skip. Step 3 is now marked
  REQUIRED in the recipe, and `mountAmendments` carries a `stale()` guard on
  every path that writes the model, so a builder that forgets it degrades
  instead of fabricating.
- **The refusal was invisible.** The panel is a `<details>` that ships closed,
  with a summary reading "Amendments and updates · HARPER front matter" and
  nothing else. A seeded unreadable entry painted its amber warning, its verbatim
  line and its ✕ **behind a click on a collapsed section nobody has a reason to
  expand**. The whole case for mounting is that a recipient can repair a refused
  entry; they will not if nothing says there is one. The summary now carries a
  count and `sync()` opens the panel when a refusal arrives — never on a
  keystroke, so a panel the user closes stays closed.
- **The Reason column and the delete button were painted outside the panel, on
  the two builders that ship this editor today.** The row is a six-track grid
  whose text tracks hold `<input>`s; a grid item's default `min-width: auto` is
  its min-content width, so each input held its track open at ~177px and the
  row's intrinsic width was a fixed **784px at every viewport**. At 1024, 1280
  and 1440 the Reason box and the ✕ were painted past the panel's right edge and
  under the preview `<aside>`, which comes later in DOM order and covers them; at
  640-768 the page grew a horizontal scrollbar (829 vs 640). So the user could
  fill four of HARPER's five columns and not reach the fifth — **every exported
  amendment printed an em dash under Reason** — and could not delete a row at
  all. `globals.css` has recorded this exact mechanism since the day it was found
  on `select`; the rule was never extended to `input`.
  - **Two earlier runs measured this row and cleared it.** Line 371 called it
    "37/52/52px, cosmetic" — which would require the `min-width: 0` that was
    absent. Line 1918 asserted "390px and 1024px: no horizontal overflow", which
    is reproducible and **blind**: at 1024px the 362px of overflow lands inside
    the viewport, on top of the preview, rather than past its edge. **A
    page-level `document.scrollWidth` assertion cannot see this class of bug.**
    Measure the ROW's `scrollWidth - clientWidth` and each control's rect against
    the panel's rect, at 640/700/768/900/1024/1280/1440.
  - The breakpoint was also the wrong instrument. What decides whether five
    inputs and a button fit is the width of the PANEL, and the panel sits in the
    form column of a two-column layout: 422px at a 1024px viewport, 852px at
    900px where the layout collapses to one column. `sm:` therefore turned the
    wide layout ON at 640px in a 550px column and OFF at 900px in an 852px one.
    It is now a container query (`@container` on the rows container, `@[36rem]:`
    on the row), which Tailwind 4 does extract from a class string inside an
    inline `<script>` — verified in the built CSS, which is worth doing because
    an unextracted class fails silently.
- **A five-column row was never the desktop layout.** The form column is
  422-550px on every desktop viewport this site has a layout for, so after the
  container-query fix the wide row is reached only between roughly 700px and
  900px. That is the right outcome for a 550px column and it means **the stacked
  state is the normal one** — which the first version of the fix had not built
  for: ten identical boxes in one column with no row number, no separator, and
  placeholders that vanish the moment anything is typed into them, above a
  550px-wide borderless delete button sitting 8px over the next amendment's date
  box. Found by a reviewer sent at this run's own diff. Each box now carries a
  visible caption (sr-only in the wide state, so what a screen reader announces
  does not depend on the viewport), each row a heading and a border, and the ✕ is
  right-aligned, bordered and labelled.

#### What else shipped, none of it about the editor

- **The tail certified what the table above it refutes.** `tailSections`'s
  registration entry said, in all nine protocols, *"Amendments are
  version-controlled and logged with date and rationale."* `amLog` admits a row
  on ONE non-empty cell and both emitters print an empty cell as an em dash, so
  filling in only "Amendment or update" exported
  `| 1 | — | — | — | Washout window widened to 90 days | — |` under a sentence
  certifying that the date and the reason were logged — reproduced in a real
  `.md` and a real `word/document.xml`. In the all-refused case the same file
  says both "cannot be established from the entries as they stand" and "logged
  with date and rationale". The twenty-fifth run deliberately weakened the FRONT
  MATTER so it "names the columns rather than promising every row has filled
  them"; **the promise it removed was still being made two pages later, by a
  section neither that run nor the next two ever opened.** The sentence is now
  purely locative. "version-controlled" went too, one round later than it should
  have — see the reviewer disagreements below.
- **A hand-off link could drop half an amendment log and print a confident count
  of the rest.** A payload may write a multi-line field as a JSON array of lines;
  nothing joined them. On the five builders that route through `applySeed`, its
  array branch indexes a list of ONE textarea, so line 2 was **dropped without a
  word** and the protocol read "The amendment table below records 1 entry". On
  the four that pass their own `writeForm`, the array reached `el.value` and
  JavaScript's default array-to-string put a COMMA between two amendments, which
  the parser then refused as one nine-value line — lossless and visible, but two
  good amendments refused as one bad one. Joining with a newline is not a guess:
  the storage format IS one record per line. Lone `<textarea>` only, and in
  `restore()` as well as `applySeed`, because the four `writeForm` builders never
  reach `applySeed`.
- **The seed banner took the form's column.** `banner()` and `pastePanel()`
  insert their notice as a sibling of the `<form>`, and the form is a child of a
  `grid lg:grid-cols-[1fr_1fr]` — so the notice became a **grid item**. Measured
  at 1280px on all nine: banner in column 1, form pushed into column 2, live
  preview dropped to the next row; at 1024px the page overflowed by 61px.
  Arriving from a colleague's link rearranged the page, on the one path such a
  link always follows. `grid-column: 1 / -1` fixes both, and is ignored where the
  parent is not a grid. **Verified pre-existing** by building the pre-run commit
  in a separate worktree and measuring both.
- **The refusal stub now spans the Word table's five data columns.** It was
  written into the cell under "Version date", 1180 DXA ≈ 0.82 inch, with the
  other four empty — an 88-character sentence wrapping down a date column.
  Confirmed as `gridSpan=5` in a generated `word/document.xml`. The Markdown
  keeps five cells; GFM cannot merge them.
- **`version` is gone from the `pc` contract**, and from the two `pcOf` that
  copied it. Its only consumer was deleted by the twenty-fifth run; the key
  survived four runs, documented, implying that this component reconciles a
  builder's version box against the log's Version-number column. It does not.
- **`amRefuseLabel`** said "where this table has 5 columns" above a table with
  SIX headed cells, because both emitters prepend a `No.`. It counts the values
  on the line now, which is what the sender controls.

#### What the two reviewers disagreed about, and who was right

- **The ranking, and both were half right.** The analyst ranked the layout first;
  the methodologist ranked the false tail sentence first and had missed the
  layout entirely. On seeing it the methodologist conceded and put it right: the
  layout **guaranteed** a blank Reason cell on every amendment anyone entered,
  and the tail sentence then certified that the Reason had been logged. They are
  one defect seen from two ends, and the mechanism outranks the sentence.
- **The analyst's three findings were one.** It reported the resurrection, the
  stale refused `<pre>` and the "+ Add" resurrection as three, and gave the
  `<pre>` a different cause ("the reset loops only touch input/textarea/select").
  The methodologist was right that this is a red herring: the editable rows are
  equally stale after a reset, and the single cause is that nothing repaints.
  Getting the cause wrong would have pointed at making the `<pre>` blankable
  instead of at `syncAmendments`.
- **Whether to add a count of empty cells to `amendmentIntro`** — proposed by
  this run, argued down by the methodologist, and **it was right**. `—`, `-`,
  `n/a`, `TBD` and a bare space are all non-empty, so every one would be counted
  as a filled Reason: a reader told "1 of 3 entries has no reason recorded"
  infers the other two have reasons. **A number that is silently wrong in the
  direction that makes the document look more complete** is this file's own bug
  class, and worse than no number. It is also redundant against em dashes
  visible in the row itself, and it lands in the recipient's `.docx` rather than
  in front of the author who could act on it. `amendmentIntro` has now been
  rewritten twice and contested by four reviewers; leave it.
- **The adverse-event sentence for descriptive designs — unresolved, and the one
  live disagreement.** `tailSections`'s `ae` entry says "safety is addressed
  through the pre-specified outcome analyses" and is the fourth shared string
  that never got the `s.descriptive` branch the other three got. The
  methodologist calls it design-level wrong in a study whose own limitations say
  no causal contrast is estimated; the analyst calls it overstated — for a
  drug-utilisation or occurrence study the sentence is right, and the defensible
  complaint is only that "outcome" is the wrong noun when `pcOf` sets
  `exposure: ""`. **Deliberately left unchanged.** A future run may take either
  side with an argument; it should not take one silently.
- **"HARPER conformance asserted above an all-refused log"** (methodologist) was
  wrong, and the analyst's rebuttal is worth keeping: HARPER is a REPORTING
  template, so a protocol that prints item 3 and honestly states that its stored
  entries could not be read *is* following it. The version that would violate it
  is the one that suppresses the refusal. Acting on this would push toward
  hiding a refusal.
- **Two Heading 1s in Word's navigation pane** ("Amendments and updates" and
  "Registration and amendments") is not a defect — every section here is `h1()`.

#### Deliberately left, argued, not manufactured

- **The version-identity problem is the top leftover in this area** and is now an
  open item at the top of this file. Both reviewers agreed the remedy — a Version
  box on the five builders that lack one, or a reconciliation check — is a
  feature. The in-scope half is the word "drafted", which is not what that date
  means.
- **A single-line `<input>` seeded with an array still silently keeps element 0.**
  No honest join exists for it and `applySeed` has no visible surface to refuse
  into.
- **The panel's double `render()` per keystroke.** Both reviewers measured it and
  both said leave it.
- **A five-segment raw line is still undetectable**, exactly as the twenty-eighth
  run recorded. Nothing here changes that. Do not report it as fixed.

#### Verified this run, and how

- Everything driven in headless Chromium against a local `astro build` + a static
  server. Harness (not committed, `scratch/` is ignored): `r29-probe.mjs`
  (scenarios `health`, `clearall`, `live`, `place`, `seed`, `persist`,
  `resurrect`), `r29-native.mjs` and `r29-native2.mjs` (assertions against the
  SHIPPED pages, with no runtime mounting), `r29-stack.mjs` (layout at eight
  viewports), `r29-geom.mjs`, `r29-banner.mjs`, `r29-array.mjs`,
  `r29-bannerall.mjs`, `r29-export.mjs` and `r29-cells.mjs` (real `.docx`, via
  `npm pack docx@8.5.0` in `scratch/` and a Playwright route for the blocked CDN).
- **All nine builders, editor mounted by the page rather than by the harness**:
  five boxes paint; a typed row reaches all six columns of the preview and a real
  `.docx`; it survives a reload with its date picker intact; its ✕ empties the log
  and the document returns to the original-version sentence; "Clear all" empties
  both field and panel; one "+ Add" afterwards does not resurrect the cleared row;
  a seeded refusal opens the panel, badges the summary and is held byte-for-byte;
  both reset buttons on the four builders that have two share one `doReset`.
- **The seed banner's "Restore my previous draft" button, end to end** — one of
  the twenty-eighth run's explicitly unverified items. The user's own amendment
  comes back, the seeded log is gone, the panel repaints and closes. It works
  because that button reloads.
- **Layout at 320/375/700/900/1024/1280/1440/1920**: zero row overflow, zero
  controls painted outside the panel, captions and row heading present in every
  stacked state, delete button never a full-width strip. With three editable rows
  and a refused entry mixed.
- **Zero `pageerror` and `typeof window.PC === "object"` on all nine**, before
  every commit. This caught a broken inline `<script>` mid-run that
  `astro build` reported as a clean success — the trap this file documents,
  hit and caught in the same hour.
- **`confirm()` is the trap in this area.** Playwright auto-DISMISSES dialogs, so
  every "Clear all" silently returns early and a probe reports that the reset
  changed nothing. The first reproduction this run made was wrong for that
  reason. `page.on("dialog", d => d.accept())` on every context.
- **Blocked-resource console errors are not page errors.** Filter
  `Failed to load resource` / `ERR_TUNNEL_CONNECTION_FAILED` before asserting
  zero errors, or all nine builders fail a health check that is measuring the
  sandbox proxy.
- **The live site was not checked** — `danielhttsai.github.io` is blocked from
  this sandbox. **Nobody has opened one of these `.docx` files in Microsoft
  Word**; every Word claim here is what a `word/document.xml` parse saw, and the
  `gridSpan=5` cell in particular is unverified as RENDERED.
- **The `?seed=paste` clipboard branch was verified**, and this paragraph first
  said the opposite. Reading `pastePanel`'s `write(obj)` suggested the paste
  route bypassed the new array normalisation; it does not — `restore` passes its
  own `write` wrapper, which normalises. Driven for real with
  `grantPermissions(["clipboard-read","clipboard-write"])` and
  `navigator.clipboard.writeText` from the same origin: both amendments arrive
  and the document counts two, on `case-control`, `case-crossover` and
  `descriptive-analysis`. This closes the twenty-eighth run's second explicitly
  unverified item. **Recorded as a wrong turn on purpose**: the claim was drawn
  from reading one call site, and one probe settled it.

<!-- CLAIM 2026-08-23 (twenty-ninth run): the amendments-editor mounting item —
     PC.mountAmendments / PC.syncAmendments on the seven builders that lack it
     (active-comparator-new-user, clone-censor-weight, sequential-trial,
     descriptive-analysis, interrupted-time-series, trend-in-trend,
     case-control), plus whatever mounting exposes in their reset / restore /
     autosave paths and in src/components/ProtocolCommon.astro's editor.
     This is the longest-standing open item in this file, unblocked by the
     twenty-fifth and twenty-eighth runs.
     NOT the checker, NOT RWE Studio, NOT the protocol-generator hub.
     If you are a concurrent run reading this, take something else. -->

<!-- DONE 2026-08-23 (thirtieth run) — claim retired, see the section above.
     CLAIM WAS: the Protocol Checker's planned-outputs
     (deliverables) path in src/pages/tools/protocol-checker.astro — the
     DELIVERABLE_NAMES reconciliation, DELIV_ALIASES / DELIV_NEVER_NA, the
     caveat sentences the panel pushes, and the three surfaces those rows reach
     (screen, Markdown, Word). Named leftovers being taken: the self-quoted
     "AI's own words" on a demoted row with no evidence, a deliverable with
     name: "" dropped silently, normName's / vs - gap, and `skip` as the
     un-validated twin of skipOutputs.
     NOT RWE Studio, NOT the nine builders, NOT the protocol-generator hub.
     If you are a concurrent run reading this, take something else. -->

### Found 2026-08-23 by a thirtieth run — the Protocol Checker's planned-outputs path

Five consecutive runs had worked the nine builders and the amendments editor.
This one rotated to `src/pages/tools/protocol-checker.astro` and took the
planned-outputs (deliverables) panel end to end: the name reconciliation, the
`DELIV_NEVER_NA` demotion, every caveat sentence the panel pushes, and the
three surfaces those rows reach. Two reviewers on disjoint briefs (a
methodologist on the statistics and the truth of the sentences; an applied
analyst on the mechanics and the exports), then both sent back at this run's
own committed diff.

**That second pass is the single most valuable thing in this run's process and
it is now 3 for 3 across runs. Both reviewers independently led with the same
regression this run had introduced.** Keep doing it, and keep the briefs
disjoint — neither reviewer's first-round list overlapped the other's by more
than one finding.

#### The headline: `normName` has now been cleared by three reviewers and was wrong every time

The seven planned outputs are matched by name. Two earlier reviews cleared that
matcher; both drove a dash that had replaced a **dash** ("Kaplan–Meier" with an
en dash), which it has always folded. Neither drove a dash replacing the
**slash**, a dropped parenthetical, or a plural — and each of those cost the row
its verdict twice over: the canonical row printed "The AI returned no verdict
for this planned output", the same answer reappeared at the bottom as something
the AI had "volunteered … not on the list it was asked about", and a caveat
counted the tool's own miss against the model. "Forest plot" and "Forest-plot"
in one answer printed Present and Absent four rows apart, which is the exact
shape the duplicate rule exists to prevent — it only ever guarded names that had
already matched.

**Worst of all, it walked past a safety rule.** `DELIV_NEVER_NA` matches on the
canonical name, so `"Primary results table"` without `"(shell)"` kept its `na`,
as a volunteered extra, in a document whose own definition paragraph says three
inches above that this row can never be N/A.

**If you test a name matcher, test the separator and the SHAPE of the name, not
the characters inside one word.** That is the lesson, and it is cheap: this run
found six live variants in twenty minutes.

#### What shipped

Three commits, all in `protocol-checker.astro` except the second.

- **`normName` now NFKC-normalises, strips invisible characters, folds space /
  hyphen / slash into one separator, and trims leading and trailing separators.**
  All lossless: two names differing only by these are the same name to every
  reader of both. Verified the seven strict keys stay distinct, with a runtime
  caveat that fires if a future rename breaks that.
- **A second, deliberately LOSSY `looseName`** — trailing parenthetical and a
  plural — tried only where the strict key found nothing. Every row it matches
  is named in a caveat AND carries an inline marker on the row itself in all
  three surfaces ("matched to this row by this tool — the AI wrote …"). An
  exact match always wins: strict matching finishes for every entry before the
  lossy key is tried.
- **An entry with no usable name is no longer dropped.** `if (!d || !d.name)
  continue` discarded a verdict, its evidence and its suggestion silently while
  the row it was about said the AI had returned nothing and the caveat counted
  it as a check that never answered. `reconcile` meets the same shape on the
  checklist side and reports it — two panels, one standard.
- **The demotion no longer quotes this tool as the AI.** `evidence` had already
  been through `evidenceText`, so a blank-evidence `na` exported "the AI's own
  words are kept here so you can judge them — it said: The AI returned this
  verdict with no evidence…". No words were kept, ours were attributed to the
  model, and the model was made to narrate its own silence.
- **Duplicate volunteered rows** are de-duplicated with a caveat naming the
  dropped spelling; the **tally** says what it counts ("Over the 7 standard
  outputs, not the 9 volunteered below").
- **`pc.skip` is validated the way `pc.skipOutputs` already was**
  (`ProtocolCommon.astro`, so all nine builders). `skip: ["ethic"]` — one
  keystroke — silently omitted nothing, so the shared "Human subjects…" section
  stood beside the builder's own ethics paragraph and the protocol carried the
  section TWICE. `skip: "ethics"` worked only by the accident that
  `String.prototype.includes` exists, with substring semantics. `skip: 5` or
  `skip: {…}` threw out of `tailSections` and killed the whole export. The valid
  keys are derived from the section list itself, which is the drift
  `skipOutputs`'s hand-written `OUTPUT_KEYS` is one edit away from. All four
  builders that use `skip` pass a correct array, so the notice fires on none of
  them today.

#### What the two reviewers disagreed about, and who was right

- **The analyst overturned the methodologist's "checked and clean" entry
  outright, and this is the run's sharpest moment.** The methodologist listed
  "`normName` correctly folds U+2010–U+2015 and U+2212, so 'Kaplan–Meier' with
  an en dash matches; no phantom volunteered row" under *things I expected to be
  broken and are not*. The analyst then demonstrated eight name variants that
  each produced the double-listing. Both were describing the same function and
  only one had tested the axis that mattered. **A "checked and clean" entry is
  only as good as the axis it was tested on — say which axis, in the entry.**
- **The same fact, opposite verdicts.** The methodologist filed "extras are
  excluded from the tally, never '8 of the 7'" as *working correctly*; the
  analyst filed the identical mechanism as a defect, because the tally is
  unlabelled and the only sentence reconciling it lives two cards up. Both were
  right about the mechanism. The analyst was right about the consequence.
- **On this run's own diff they converged**, which is why the regression is
  certain rather than plausible. They differed on remedy: the analyst wanted the
  colliding entry routed to `extras` (what it had been before), the methodologist
  wanted a dedicated caveat naming what was nearly done. **Both shipped** — they
  are complementary, not alternatives, and neither alone is honest.
- **The methodologist's least-confident finding was accepted anyway.** It argued
  that "every design has … assumptions worth probing" is true of every empirical
  claim ever made and therefore no longer explains why *these two* rows are barred
  from N/A when the Love plot is not. It flagged this as a judgement rather than
  a demonstrable falsehood. It is right, and naming the class (measurement
  assumptions — outcome and denominator misclassification) costs one clause.

#### Deliberately left, argued, not manufactured

- **The seven deliverable descriptions in `worker.js:96-102`, now ITEMISED.**
  The twenty-sixth run recorded "methodologically wrong in five places" without
  saying which. They are, with what each should say:
  - `:100` **"Cumulative incidence / Kaplan-Meier curve"** conflates two
    non-equivalent estimators. 1−KM estimates the CIF only without competing
    risks; with them it overestimates risk and Aalen–Johansen is required. A
    protocol planning 1−KM for a cardiovascular outcome in an elderly cohort is
    scored Present. (Snippet-corroborated via WebSearch by two independent
    searches; Crossref/PubMed blocked.)
  - `:99` **"Primary results table (shell) — effect estimates (HR/RR/RD/IRR)
    with 95% CIs, events, and person-time"** is a person-level rate-denominator
    template asserted as universal. Wrong for ITS (level and slope change, no
    person-time), case-crossover and case-control (discordant sets / sampled
    controls), and descriptive (no effect estimate at all). This repo's own
    `interrupted-time-series.astro:544` deletes the shared results bullet for
    exactly this reason.
  - `:102` **"Sensitivity-analysis outputs — negative-control outcomes, E-value,
    or quantitative bias analysis"** lists only unmeasured-confounding
    diagnostics and omits the ordinary meaning (varying exposure and outcome
    definitions, grace period, ITT vs as-treated, PS specification) — which
    HARPER item 7.5 **in the same prompt** asks for. A protocol with a complete
    Table 11 and no E-value can be met on 7.5 and absent on the deliverable.
  - `:96` **"(CONSORT-style)"** is the wrong reporting guideline; the
    observational analogue is STROBE (RECORD/RECORD-PE for routine data).
    Snippet-corroborated.
  - `:98` **"Love plot"** restricts covariate balance to PS methods, leaving
    disease-risk scores, entropy balancing, standardisation and g-computation in
    a gap the `na` rubric then treats as structural.
  - `:97` **"ideally with standardized mean differences"** — in a PS-adjusted
    study the SMD is required, not ideal, and the table must be in the analytic
    (matched/weighted) sample.
  **Not shipped because a prompt edit is unverifiable from this sandbox and
  inert until Daniel redeploys the worker.** Weigh that before picking it up;
  but the list above is now specific enough to act on in one sitting when it is
  reachable. Note the coupling: the page now says a descriptive design has
  measurement assumptions worth probing, and the prompt still names two
  exemplars that are undefined without a causal contrast, so `:102` is the one
  to do first.
- **The worker asks for a "brief refinement or confirmation" on every `present`
  row and the page never prints it.** `NO_SUGGESTION` contains `"present"`, and
  the comment justifying that says "None of the five is something the author can
  act on" — true of `na`/`unassessed`/`notscored`, false of `present` by the
  worker's own prompt. Printing it is a new line on three surfaces, so it is a
  feature; the honest alternative is to stop asking for it. Left.
- **Non-string `evidence` / `suggestion` still render as `[object Object]` and
  `a,b`.** Re-derived by this run's analyst; the twenty-sixth run drove this and
  explicitly decided to keep `String()`. That decision stands. A non-string
  **name** was NOT covered by it and is now an unusable-name case — it used to
  reach the panel as a planned output titled "[object Object]".
- **Markdown emphasis injection in a volunteered name.** `mdText` collapses
  whitespace but does not escape `**`, so a name like ``Forest plot** — _Present_
  · **x`` can render a second, contradictory verdict in the report's own
  typography — a surface where the `.md` alone shows something the screen does
  not. **Not verified** (the analyst's probe did not complete) and adversarial-
  only. The twenty-sixth run chose "collapse rather than escape" deliberately for
  *structure*; inline emphasis is a different axis it may not have weighed.
- **A zero-width space REPLACING a space still glues two words** ("Forest␈plot" →
  `forestplot`). Measured. Deleting invisibles and folding them to a separator
  are opposite guesses, and deletion is right for a soft hyphen inside a word,
  which is commoner. Do not "fix" one without breaking the other.
- **`normName` does not fold "and" ↔ "/"**, so "Love plot and covariate balance"
  is still a volunteered extra. Left as a bigger semantic leap than the
  separator fold.

#### Verified this run, and how

- Everything driven in headless Chromium against a local `astro build` + a
  static server, with the POST to the worker intercepted by `page.route` and
  fulfilled with crafted JSON. Harness in `scratch/` (gitignored):
  `orch/battery.mjs` (22 named scenarios), `orch/exports.mjs` (real `.md` and
  real `.docx`), `orch/health.mjs`, `orch/skip.mjs`, `orch/skipdocx.mjs`.
- **22 crafted responses, zero page errors in any**, covering: both demotion
  branches, six name-paraphrase classes, loose collisions in both array orders,
  five nameless shapes, duplicate canonical and duplicate volunteered rows, nine
  volunteered extras, an unrecognised status, and a missing `deliverables` field.
- **A real `.md` and a real `word/document.xml`** carrying every new path — the
  guessed-row marker, the loose-collision caveat, the bare-value caveat, the
  rewritten definition paragraph and the preserved suggestion. Both reviewers
  independently confirmed screen / Markdown / Word agree row-for-row.
- **`pc.skip` through `window.PC.tailMd` on the built page**, seven shapes: the
  valid array still omits its section with no notice, absent `skip` still returns
  all nine sections, and each of the five broken shapes returns ten sections with
  the notice and none throws. The notice confirmed in the Word path through
  `window.PC.tailDocx` with the real `docx` library loaded via `addScriptTag`.
- **All twelve tool pages, zero `pageerror`, `typeof window.PC === "object"` on
  all nine builders**, before each of the three commits.
- **`node_modules` broke mid-run exactly as the fifteenth run documented** —
  `ERR_MODULE_NOT_FOUND` on `package-manager-detector` after a reviewer ran
  `npm i --no-save`. `rm -rf node_modules && npm i --no-package-lock --no-audit
  --fund=false` fixed it in seconds. `git diff package.json` was clean. **If two
  agents share a tree, expect this; check `package.json` before you stage.**
- **The live site was not checked** — `danielhttsai.github.io` is still blocked
  from this sandbox. **Nobody has still opened one of these `.docx` files in
  Microsoft Word.**
- **No citation was added or changed.** The two methodological claims recorded
  above (Aalen–Johansen vs 1−KM; STROBE vs CONSORT) are corroborated by search
  snippets only and are recorded as leads for a worker edit, not asserted in
  shipped code.

<!-- CLAIM 2026-08-23 (thirty-first run, CLAIMED): took option (c), the RWE
     Studio ITS path, narrowed to what the tool silently DISCARDS or TRANSFORMS
     between the uploaded CSV and the fitted model, and what it tells the user
     about it — the control-series wipeout, the denominator combine rule, the
     decimal comma in `buildMaster`, and the five bare `cat()` warnings the
     fifth run listed as "a cheap, high-value sweep". A concurrent run should
     take (a) or (b), both worker-side, or the Protocol Generator hub, which
     no run has opened since the fifteenth. -->

<!-- The thirty-second run's claim marker; its section is at the bottom of this file. -->

### Found 2026-08-23 by a thirty-first run — the ITS path in RWE Studio, from the CSV to the model

The thirtieth run's marker named the RWE Studio ITS path as the oldest untouched
surface in the tree: the fifth run worked it on 2026-08-22 and nobody since.
This run took the half of it that is about **what happens to the data between
the uploaded file and the fitted model, and what the user is told about it** —
the discards, the transformations, and the channel the warnings travel on.
Two reviewers on disjoint briefs, then both against each other's lists, then
both against this run's own committed diff.

**The two later rounds are the whole value of the method and both earned it
outright.** Round 2 **overturned both reviewers' proposed remedies** for the two
highest-damage findings, in each case by implementing the proposal and measuring
it. Round 3 found **eight defects in this run's own diff**, two of them sign
reversals, and both reviewers independently led with the same one. Keep doing
both rounds. Do not treat a first-round list as a work order.

#### The premise correction, established and now uncontested

**A bare `cat()` in an ITS script is not invisible — it is DEMOTED.**
`runanalysis` strips only the prefixed streams to build `display`, and
`buildReport`/`buildReportDocx` paste `LAST.out` verbatim under a heading
"R output". So a bare `cat` reaches every surface, but below the estimates,
below the notes, below Table 1, below the fitted series, inside a monospace dump
whose other content is a coefficient matrix — 8pt Consolas in Word. Both
reviewers verified this at the export end. Earlier runs (including the fifth,
and this file's own text before today) said "invisible". Say "demoted".

#### What shipped — seven commits, all in `rwe-studio.astro`

1. **`86bee1e`** Five warnings about the data moved from `cat()` to
   `RESULT_NOTE|`: rows dropped for an unreadable time or outcome, the
   aggregation into periods, the time column not parsing as dates, and a Poisson
   family fitted to a non-count outcome. The linear-with-denominator one was
   **deleted rather than promoted** — the `ratemode` note already says it. Also
   the first version of the branched collinearity note.
2. **`f0f3feb`** `HASG` ("a SERIES column was mapped") had been standing in for
   "a controlled analysis was fitted" everywhere. `ctrl` re-derives it after the
   drops and drives `rhs`, the labels, `ITSMETA`, `nser` and the seasonality
   guard; the surviving series is NAMED in every row; the denominator drop moved
   before the seasonality guards and says which arm lost periods; a blank
   `SERIES` cell is dropped and named; a constant `SERIES` column is refused in
   the browser.
3. **`b100802`** `SERIES` is never auto-mapped; `suggestCol` skips columns an
   earlier role claimed; a `SERIES` column not coded 0/1 states its recode.
4. **`6f6e0d4`** The denominator combine rule decides on the majority of periods
   with a refusal band, announces an automatic choice on both branches, and
   warns when an explicit Sum contradicts the evidence.
5. **`7bb1cb1`** `a$t` is a calendar position, not a rank; empty calendar periods
   are named and never filled.
6. **`3b68647`** Eight defects round 3 found in commits 1–5. See below.
7. **`7a230a9`** The implausible-span note also fires when the absolute cap trips.

#### The four findings worth carrying forward as facts

- **A controlled run whose control series vanishes printed the intervention's
  own drop under the word "control".** Four reachable triggers: the control rows
  carry a blank denominator (you know your own catchment, not the comparator's);
  the mirror, where the INTERVENTION arm loses its denominator and every number
  reported is the comparator's under labels that are technically correct — which
  is what makes it a trap; a constant `SERIES` column; and a control that exists
  but does not span the interruption. `TABLE1|Control-series periods|0|0` was
  the only trace, and it prints `0|0` in both directions so it cannot say which
  arm was lost.
- **The worst result in the run was in neither reviewer's list — it is the
  product of two of them.** A file `month, cases, catchment_pop, site_code`,
  two sites coded 1 and 2, the intervention at site 2, a real 30% fall. The
  analyst maps three roles and touches nothing else. The page had already
  auto-filled `site_code` into the control-series slot (score 5 against a
  threshold of 4) while leaving the denominator empty (score 2), and `toBin`
  guessed "1 means yes" at low confidence. Reported: **Difference in level
  change 1.429 (1.166–1.750)** — a significant 43% increase, in a
  difference-in-differences design nobody selected. **Cross-critique the lists
  for compounds; neither reviewer alone would have found this.**
- **One denominator cell in six hundred made the effect exactly null.** `dconst`
  was a global `all()`, so a single population cell reading 50001 instead of
  50000 switched the whole series from `first` to `sum`; the offset became
  log(population × rows) and absorbed the outcome. 0.700 (p = 9e-8) → **1.000
  (0.877–1.140)**, with Table 1 showing a mean denominator of 1,000,000 for a
  catchment of 50,000 and the degenerate fit triggering the sandwich-collapse
  note, which reads as a compliment.
- **Calendar periods with no rows did not become zeros — they ceased to exist.**
  `a$t` was a rank over the periods present, so a per-admission extract (the
  design's own advertised input) closed up every empty month and the next month
  became t+1. March was drawn adjacent to January under real date labels, and
  "per period" was per surviving period.

#### Do NOT re-derive these — each was implemented and measured, and each is worse

- **A per-period `first`/`sum` mix for the denominator.** One reviewer proposed
  it; the other implemented it on the same file and got **level 0.320,
  end-of-follow-up 0.053** against a truth of 0.700. An offset has to be on one
  scale across a series: the single mixed period carries a 123× offset, becomes a
  colossal pre-intervention outlier and drags the intercept and baseline trend
  with it. It also quiets the one signal that worked (Table 1's absurd
  denominator goes from 127× wrong to 4.4× wrong — quiet enough to pass). It
  trades a conspicuous 1.000 for a spectacular success nobody would question.
  **The majority rule is the answer, and it must score only periods that hold
  more than one denominator value.**
- **Automatic `Y = 0` zero-filling of empty periods.** Undefined without
  inventing a denominator, and the estimate is badly sensitive to the invention
  (N = 25000/50000/100000 → 0.1286/0.1033/0.0743 on one file). With a
  person-time denominator the invented row has N = 0, `log(0)` is −Inf, and the
  bad-denominator drop deletes it again — silently back to the status quo under
  a note claiming the periods were restored. Above all, **nothing in a CSV
  distinguishes "no events occurred" from "nothing was recorded"**, and the
  ward-closure case depends on that ambiguity being kept open. Offering it as a
  ticked control is a feature; ask Daniel.
- **Calendar re-indexing is not a bias fix and must not be sold as one.**
  Measured: 0.1697 → 0.1704, where the zeros-explicit answer is 0.1033. It fixes
  the time metric and the chart, which is worth doing on its own merits. The
  attenuation is the missing OBSERVATIONS.
- **Restricting the Durbin–Watson to consecutive-`t` pairs, without a
  not-computable branch.** On a series where no pair is adjacent the numerator
  is zero over a positive denominator: DW exactly 0.0000, autocorrelation
  exactly +1.0000, and the "these intervals are too narrow" warning fires off
  nothing.
- **Moving the bad-denominator drop earlier than its current position.**
  Measured: `np` 36→33, `t0` 19→18, `max(tsince)` 17→15 (so "per period" stops
  meaning per month and the estimate moves 7%), the HAC's period matching goes
  vacuous, and with a blank denominator on the interruption month the cut label
  slides a month and prints a note misdescribing why. It sits after `a$level`
  and before the seasonality block, and that is the only safe place.
- **Re-adding the `SERIES` suggestion.** One reviewer measured the cost of
  removing it — a genuine two-site file now runs pooled, 0.875 (0.777–0.985)
  where the controlled answer is 0.751 (0.597–0.946) — and still says do not
  restore it, because the `ward_group` result above is worse. Recorded as an
  accepted trade, not an oversight. The shape IS detectable (every period holds
  exactly two rows); detecting it and *offering* the role is the open idea.

#### What the reviewers disagreed about, and who was right

- **Refuse or relabel, when the control series is gone.** The methodologist
  wanted an uncontrolled fallback; the analyst wanted a refusal. The analyst then
  built the **mirror case** — the intervention arm is the one that loses its
  denominator — and showed the methodologist's fallback *as written* would make
  it strictly worse, because relabelling to bare "Level change, immediate step"
  deletes the only word saying whose hospital the number is about. **Both
  half-won: fall back, and name the surviving series in every row.** The analyst
  then held out on one point and was right there too — a column that never
  varied has no fact about which series survived, so that case is refused in the
  browser rather than named.
- **A "checked and clean" entry is only as good as the axis it was tested on**,
  again. The methodologist cleared all six controlled labels in round 1 on files
  whose control series was flat; round 2 it rebuilt the check so **no two
  coefficients shared a value** and said plainly that the first clearance had
  been worthless, because `tsince` and `g:tsince` both sat at their null. Copy
  that habit: state the axis inside the entry.
- **The analyst's "the bias grows with the effect size" was asserted, not
  measured.** The methodologist measured it (300 replicates a cell) and confirmed
  the direction while **scoping it more tightly than the analyst had**: nil until
  the post-intervention count is low enough to empty a period. This run then
  measured it independently again (400 replicates) before quoting any figure on
  screen. Three independent measurements, same answer.
- **Damage framing.** On the end-of-follow-up counterfactual the methodologist
  called 0.400 "the honest ratio"; the analyst pointed out 0.400 is the honest
  *uncontrolled* ratio and 0.800 is the correct controlled estimate, so it is a
  wording defect on a correct number rather than a wrong number. The analyst was
  right, and it is why that item is still open rather than shipped.
- **The `<5` suppression consequence was overstated.** The analyst said the slope
  change "flips sign"; the methodologist showed 1.020 (0.829–1.254) against
  0.999 (0.923–1.082) — neither excludes 1. The drop is real and the note is
  warranted; the conclusion does not move.
- **On this run's own diff they converged**, which is why round 3's headline
  regression is certain rather than plausible: both led with the denominator
  predicate counting absence of evidence as a vote, one via a sign reversal
  (end-of-follow-up 1.568 where the truth is 0.584) and one via a hard refusal of
  an ordinary per-event file.

#### Still open in the ITS path — argued, ranked, deliberately left

Ranked by damage. Everything here was executed by one or both reviewers.

- **The end-of-follow-up counterfactual is the DiD counterfactual, and both the
  note and the CHART CAPTION say it is a pre-trend projection.** `Xc` zeroes only
  `g:level`/`g:tsince`, so in a controlled run the counterfactual keeps the
  control's own level and slope change. On a co-intervention file: fitted 80,
  counterfactual 100, pre-intervention level 200 — the tool prints 0.800 under a
  sentence defining 0.400. **The caption at `renderITSChart` says the same thing
  and the picture contradicts it**: the dashed counterfactual is drawn stepping
  from 200 to 100 under the words "extrapolates the pre-intervention trend
  forward". A drawn contradiction is worse than a sentence. Two strings and a
  branch on `ctrl`. ~~**Best next target in this file.**~~ **DONE 2026-08-24
  (thirty-fifth run)** — and "two strings and a branch" was a bad estimate:
  the same path held a wrong NUMBER neither this entry nor its reviewers had
  seen. See that run's section at the bottom.
- **The printed coefficient table contradicts the estimate table above it.**
  **This is now the best next target in this file** — untouched, reproduced
  again by the thirty-fifth run on its own baseline, and verifiable here.
  `print(summary(fit)$coefficients)` always prints model-based SEs and p-values
  whatever `semode` chose. On a 36-period AR(0.8) series with the shipped default
  `auto`: headline `Slope change +1.420 (−0.250 to +3.089)` sits directly above
  `tsince 1.4197 0.5562 2.5526 1.567e-02`. Two coefficients declared significant
  in the table and non-significant by the tool's own intervals — and that table
  is the only source of p-values in the `.md` and `.docx`. Both reviewers
  top-five'd it.
- **Table 1's "Total outcome" is not the total outcome whenever `a$Y` was
  rescaled.** `ratemode` (linear + denominator) gives `Total outcome|0.02544`
  for a series totalling 1272; mean-combine gives 1836 for 9180. The
  `Denominator per period` row is gated on `useoff` so it does not print in
  ratemode, leaving nothing to recover the scale from, and the exported `FITTED`
  table has an `observed` column holding 0.00201 where the observed is 100.5.
  In a controlled run every Table 1 row but the control one is intervention-only,
  unlabelled. **Do not "fix" the mean-combine case by rescaling** — under
  mean-combine the analysed series IS the period means, so the sum is meaningless
  either way; suppress the row instead.
- **"End of follow-up" can name a date that is not the end of follow-up.**
  **Half done 2026-08-24 (thirty-fifth run).** The ARM-ASYMMETRY half is
  closed: when the intervention arm's extract ends before the file does, the
  row now reads "(last period of the intervention series)" and a note says the
  comparator and the chart run on past it. The half in this entry — trailing
  periods DROPPED for a blank denominator — is **still open and still reads
  "(end of follow-up)"**, because `tn` is `max(a$t)` over what survived and
  nothing downstream remembers what was dropped. Do not read the `eflab` line
  as covering it: that run shipped an unreachable branch which looked as
  though it did, had it pointed out, and deleted it. Closing this one needs a
  pre-drop bound carried forward.
- **The Durbin–Watson disclaimer is hard-coded to the GLM case** and prints on
  OLS fits, where both its clauses are false. Inert (DW drives nothing), so ride
  it along with anything else in that sentence.
- **The parallel-pre-trends note quotes a ratio and compares it to zero** — "the
  difference in pre-intervention slope is 0.971 per period, 8.4 standard errors
  from zero". 0.971 is `exp(g:t)`, whose null is 1.
- **`(rate ratio)` on the difference rows** — a ratio of rate ratios. Wording;
  six call sites; both reviewers said leave it unless that sentence is touched.
- **The empty-period note does not fire on a controlled run when the other
  series covers the gap.** `gapmiss` is computed against the union of both
  series' periods, so a control series that is complete hides an intervention
  series that is not — the commit's own headline case.
- **A genuine two-site file now runs pooled** because `SERIES` is no longer
  suggested. Accepted trade, see above.
- **The ITS demo exercises no ITS diagnostic** — the fifth run's item, still
  true, still the highest-leverage feature request in this design.

#### Verified this run, and how

- Chromium against a local `astro build` + `http-server`, with the page's own
  `buildScript()` output run under **real R 4.3.3** (`apt-get install -y
  --no-install-recommends r-base-core` works in this sandbox — 4.3.3, same
  version the fifth run had; `apt-get update` first or one dependency 404s).
- **An eighteen-case regression battery run before and after every commit**
  (`scratch/orch/battery.mjs`, output diffed as `battery-before.txt` →
  `after1..9`). This is the single most useful thing built this run: it made
  every commit's claim "these lines moved and nothing else did" checkable, and
  it caught two of my own wording regressions.
- **The full three-surface path** — on-screen panel, real `.md`, real
  `word/document.xml` — by stubbing `window.RWEngine.run` with the output real
  Rscript produced for the very script the page generated
  (`scratch/orch/exports2.mjs`). Everything after the stub is the page's own
  code. **WebR's CDN is blocked here, so this is the only way to drive the
  render and export path; it works well.** SheetJS (`cdnjs`) is blocked too and
  no upload can be exercised without routing it — `npm pack xlsx@0.18.5` and
  `page.route`.
- Every finding **reproduced before it was fixed and observed fixed after**, on
  the input that produced it. The one-cell denominator case was re-checked by
  hand-patching the generated script back to the old rule: 1.000 (0.726–1.378)
  against 0.700 (0.508–0.964).
- **All twelve tool pages, zero `pageerror`, `typeof window.PC === "object"` on
  all nine builders, before every commit.**
- **The live site was not checked** — `danielhttsai.github.io` is still blocked.
  **Nobody has still opened one of these `.docx` files in Microsoft Word.**
- **No citation was added or changed.** The `Wagner 2002` attribution on the
  segmented-regression parameterisation was flagged as **unverified and
  contested** — the coding the tool uses is what Xiao, Augusto & Wagenaar (IJE
  2021;50(3):1011) prescribe, while snippets describing Wagner's own variable say
  it counts from 1, the convention that note calls a common error. Every primary
  source is egress-blocked. **Do not rewrite that citation from this sandbox** —
  both reviewers said so independently, and it is exactly the error the citation
  rule exists to prevent. It needs someone with library access.
- **The decimal-comma item the fifth run left open is stale** — `readWorkbook`
  now classifies a comma per COLUMN (`COMMA_GROUPED`/`COMMA_DECIMAL`/`LEAD0`) and
  refuses a column proving both conventions. Do not re-derive it.

<!-- CLAIM 2026-08-23 (thirty-first run, RELEASED): finished. The best next
     targets in this file are the end-of-follow-up counterfactual sentence and
     its chart caption, then the coefficient table's model-based p-values —
     both are named above with the input that shows them, and both are
     verifiable from this sandbox. The Protocol Generator hub is still the
     tool nobody has opened since the fifteenth run. -->

### Found 2026-08-23 by a thirty-second run — the ACNU library-pick path, end to end

The thirty-first run was still committing in `rwe-studio.astro` four minutes
before this one started, so this run took a file that run could not be in:
`active-comparator-new-user.astro`, and inside it the **phenotype/method
library pick path** — what a pick writes, what it leaves behind, and what
reaches the exported protocol. That closes two of this file's oldest standing
items (`pickedCitations` never pruned, live since the first run and fixed in
three sibling builders but never in the flagship; and the stale
`psMethodDetails`), and it turned into a much larger content finding than
either reviewer expected.

Two reviewers on disjoint briefs — a methodologist on the library's CONTENT and
citations, an applied analyst on the MECHANICS — then each critiquing the
other's list, then a third reviewer sent back at this run's own committed diff.

**Eight commits. The own-diff round is now 8 for 8: it found five executed
defects in this run's work, two of which this run's own commit messages had
declared it was fixing.** Keep doing it, keep the briefs disjoint, and **send
the reviewers at each other's lists** — that step is new this run and it
produced the sharpest moment below.

#### The headline: two reviewers gave opposite readings of the same ICD-10 code

The methodologist reported that `G40.812` in the Lennox-Gastaut entry is the
**not-intractable** leaf and therefore the least characteristic code for a
syndrome that is drug-resistant by definition. The analyst, critiquing that
list, said it was **inverted** — that `.812` is the intractable-without-status
leaf and that acting on the finding "makes the phenotype worse in exactly the
way A says it is broken", and told the orchestrator not to ship it.

The methodologist was right. `G40.812` is *Lennox-Gastaut syndrome, not
intractable, without status epilepticus*; `G40.814` is the intractable one.
Checked independently here against four ICD-10-CM code references after they
disagreed.

**The lesson is not that one reviewer was careless — it is that a confident,
specific, well-argued correction from a reviewer who has been right about
everything else is still a claim that needs a source.** The analyst had been
right about almost everything, including things the methodologist got wrong.
**When two reviewers disagree on a fact, do not adjudicate on their track
records; go and look.** It cost one search.

The code was **not changed** — it is Daniel's own published algorithm and the
tool disagreeing with the paper is his to resolve. The code set now states what
`G40.812` is and what it excludes, and asks the reader to confirm against the
algorithm before locking. **That is the open item for Daniel.**

#### What shipped

1. **`pickedCitations` keyed by name and never evicted.** Pick MI, then pick
   Ischemic stroke, and both validation studies were in the exported reference
   list — Markdown and Word — for a one-outcome protocol. Reproduced end to end
   before it was touched. Now keyed by the field the pick wrote into, with what
   it wrote; second pick evicts first; legacy entries pruned on load by a key
   set derived from the same expression the pick handler uses. The reference
   list was two copies of one expression; it is `refsOf` now.
2. **The indication code set was dropped on the floor.** The indications
   trigger is the one of four with no code-set field, so `fill()` returned
   early: the modal showed `ICD-10 E11.* …`, the click wrote `Type 2 diabetes
   (T2DM)`, and the protocol's cohort-entry criterion contained no criterion.
   All thirteen were unreachable. Where there is nowhere else for a code set to
   go it now goes into the one field there is.
3. **The modal never said whether an entry was validated**, under a header
   reading "Validated phenotype library" over four lists including thirteen
   statistical methods. Every row now says which it is, at the moment of
   picking.
4. **Sixteen of eighteen "validation" strings did not validate anything.**
   Split into `validation` (a specific accuracy study; the only thing that
   reaches the reference list) and `provenance` (a note, shown, never numbered)
   — the structural fix three sibling builders already had. Three of forty-nine
   entries keep a validation study. Six strings asserted a paper that does not
   support them; each is now a note saying what the paper actually is.
5. **Four code sets whose wildcard and exemplar list disagree** (GI bleeding's
   `K27.*`/`K28.*`; tirzepatide's `A10BX16` outside `A10BJ*`; atomoxetine
   inside `N06BA`; lithium inside `N05A*`), plus the NSAID exclusion whose
   justification said the opposite of what M01AX is.
6. **A pick destroying hand-typed text in silence**, a `<select>` assignment
   with no membership check, a targeted field skipped rather than cleared, and
   a greedy-matching entry that matched on the PS while applying a logit-scale
   caliper.
7. **The method/details mismatch and every withheld citation now reach the
   exported document**, not only the panel.

#### What the two reviewers disagreed about, and who was right

- **The LGS code, above.** Methodologist right, analyst confidently wrong,
  settled by looking.
- **"Validated phenotype library" as an overclaim.** The methodologist led with
  it. The analyst overturned the headline: the word "validated" appeared on
  exactly one button — the outcomes one — and all eighteen outcomes did carry a
  string, so the label was not the defect; the *quality of those strings* was.
  **The analyst was right, and this run then proved it the hard way** by
  splitting validation from provenance and leaving that same button standing
  over a list that had become 89% unvalidated. The own-diff reviewer caught it.
- **Counting.** The methodologist said 31 of 49 entries lacked a validation and
  this run repeated it in a commit message ("Thirty-one … sixty-three per
  cent"). The analyst's count was right: **30 of 49, 61%** (18 exposures + 12
  indications). The same commit message also says the hint span promising a
  citation "was true of eighteen outcomes, one indication and no exposure at
  all" — **that span sits under the outcomes button and only ever spoke about
  outcomes, where it was true**. Both are errors in a pushed commit message;
  recorded here rather than rewritten, because a concurrent run was building on
  the same branch.
- **Ranking, and it was the useful disagreement.** The methodologist ranked by
  *is this defensible in print*; the analyst re-ranked by *does a wrong answer
  arrive without anyone noticing*, and inverted the list: an ICD-10-CM code that
  does not exist at a site (`E14`, `E10.1` as a header) **fails loudly and
  self-reports**, so it ranks below `K27.*`, which returns a confident,
  plausible, inflated event count. **That is this file's own bug class applied
  to a review, and it is the right axis.**
- **The methodologist's own least-confident finding was promoted by the
  analyst.** Variable-ratio matching analysed with cluster-robust variance and
  no matching-ratio weights: the methodologist flagged it as a judgement call it
  could not source; the analyst argued it biases the *point estimate*, not the
  variance, because matched-set size correlates with PS density. **Left
  unshipped** — neither could source it, and the entry is otherwise correct —
  but it is the best-argued open content item in this file.
- **The analyst caught what the methodologist could not have known**: three of
  its findings had already shipped while it was writing, and one of those
  commits *promoted* two of its remaining findings from modal-only cosmetics to
  document-carrying defects (the indication code set now travels, so the
  hypertension `C02-C09` wildcard and the uncited "PPV ~90%" on atrial
  fibrillation now print into protocols). **If you ship mid-review, re-rank the
  reviewer's list yourself afterwards.**

#### What the own-diff round found, all five executed

- **`"…was filled with X, and now reads X"`.** The lapsed-citation notice
  clipped both values at 60 characters from the start, and appending is how
  people edit library text — so it printed two identical quotations while
  claiming a change. **This was manufactured across two of this run's own
  commits**: the indication append made the stored value 205 characters where
  it had been 30, and the next commit widened the check to the long fields.
  Clip around the first differing character, not from the start.
- The outcomes button still said "validated" (above).
- The unvalidated-row sentence called a drug class "the condition" and asked
  for its positive predictive value, on all eighteen drug classes.
- "Used in" as the label for a field mostly not about use; the same instruction
  twice in two colours on one row; "the References box" for a field called
  "Key references (one per line)".
- **The exported document said none of it.**

It also **verified and confirmed** a long list, which is the counterweight:
eviction by field with independent records per trigger, `refsOf` genuinely one
function with Markdown and a real `.docx` matching exactly, legacy pruning
dropping only legacy entries across reload / Clear all / `?seed=`, `fields`
surviving a reload byte-identical, the overwrite confirm firing only on
hand-typed text and leaving the form genuinely untouched on decline, trailing
whitespace not lapsing while a case change does, the indication append reaching
both exports intact with no double-append on a second pick, and the
"clear rather than skip" branch being genuinely dead code today.

#### Deliberately left, argued, not manufactured

Ranked by the applied analyst's axis — silently wrong beats loudly broken.

- **Name the estimand in the method definitions.** Both reviewers' top three,
  from disjoint briefs. See the updated standing item above; it remains
  Daniel's call, and the six undetermined entries must not be auto-stamped.
- **"Which ICD-10?"** — the analyst's own escalation of the methodologist's
  code-flavour findings, and it is bigger than any individual code: **no entry
  in the library says which ICD-10 it means.** Taiwan runs ICD-10-CM, Japan a
  WHO-based system, Korea KCD, Australia ICD-10-AM. The export instructs five
  sites to implement "ICD-10 I21.*" and each resolves it differently and
  silently. Mixing systems in one entry (dementia's WHO `F00` beside CM's
  `G31.83`) is **not** the defect a multi-national library should fix; naming
  the system is. **This is the best next content target in this file.**
- **Individual code sets left**: ischemic stroke includes `I64` ("stroke, not
  specified as haemorrhage or infarction"), which in a DOAC-vs-warfarin study
  lets haemorrhagic strokes count toward the efficacy endpoint while the ICH
  entry is the safety endpoint — a bias with a direction, but visible to an
  experienced reader; hypertension's `C02-C09` includes C04 peripheral
  vasodilators and C05 vasoprotectives; pregnancy's `Z3*` includes Z30
  contraceptive and Z31 procreative management; DKA's `E14` is WHO-only and
  `E10.1`/`E11.1` are non-billable headers in ICD-10-CM; falls uses `R29.6`
  ("repeated falls") for what the label calls "history of falling" (`Z91.81`).
  The last two **fail loudly at the site** and rank lowest for that reason.
- **Atrial fibrillation asserts "PPV ~90% in claims" with no citation**, inside
  the `codes` string, so it now prints into protocols as an unattributed
  performance claim. Cheap to fix; nobody found a source for the number.
- **Exposure and comparator can be the same drug.** The analyst argued the
  useful version is not name-identity (self-announcing in the abstract) but
  **code-set containment** — `A10B*` against `A10BK*` — and that the check
  should gate the export's unconditional "the active comparator … has no known
  a priori association with the outcome" sentence, which is the design's whole
  validity argument asserted as fact. Not built; it is the same shape as the
  work this run did and would fit the checks panel it now uses.
- **The `<select>` refusal writes to `[data-action-msg]`**, at the bottom of a
  5,000-line form, and does not scroll. Unreachable with shipped data, so it
  was left, but it is not "a refusal the user can read" as its commit claims.
- **The overwrite confirm lists fields in plan order**, which for outcomes is
  "Code set, Operational definition" — the reverse of their on-screen order —
  and joins with a bare comma.
- **A non-string `codes`/`definition`** would reach the form as `[object
  Object]`; the same decision the twenty-sixth run made about `String()`
  elsewhere applies and was not revisited.

#### Verified this run, and how

- Everything driven in headless Chromium against a local `astro build` + a
  static server. Harnesses in `scratch/orch/` (gitignored), worth rebuilding:
  `cites.mjs` (15-assertion citation-lifecycle battery — eviction, lapse,
  reload, legacy pruning, indication codes, modal badges), `regress.mjs` (the
  own-diff regression and its converse, plus the edit-freely exemption),
  `r2fix.mjs` (the five own-diff defects), `notes.mjs`, `docbanner.mjs` (real
  `.docx`, unpkg routed to a locally-packed `docx@8.5.0`), `health.mjs` (all
  twelve tool pages, zero `pageerror`, `typeof window.PC === "object"`).
- **Baseline first: 6 pass / 9 fail before any change, 15 / 0 after** — the
  failures were reproduced before they were fixed, and the fix observed.
- **A real `word/document.xml`** carrying the new document banner, with the
  withheld citation present in the banner and absent from the numbered list.
- All twelve pages clean before every commit.
- **Citations: three PMIDs checked independently here** (39241791 → Luo H et
  al, Lancet Psychiatry 2024;11(10):807-17, psychotropic prescribing, no
  self-harm outcome; 40437158 → Communications Medicine 2025, dementia
  survival, not CNS Drugs; 39772758 → Baxter SM et al, Thyroid
  2025;35(1):69-78, not Shao/Lai), plus Rosenbaum & Rubin 1985 Biometrics and
  the G40.812 leaf. **Snippet evidence via WebSearch only — Crossref, PubMed
  and doi.org are all still blocked.** **No replacement citation was asserted
  anywhere**: every wrong one was withdrawn and the note says what the record
  shows and stops. Austin 2011 Pharm Stat 10:150-61 (caliper) and Abadie &
  Imbens Econometrica 2006 (with-replacement variance) are recorded as leads,
  deliberately not written in.
- **A near-miss worth recording: this run expanded two author lists from
  memory** ("Cheng CL, Kao YH, Lin SJ, Lee CH, Lai ML") while rewriting the
  stroke entry, caught it in its own next command, and reverted to the `et al.`
  form the file already had. **The instinct to "tidy up" an abbreviated citation
  is exactly how this repo got its fabricated reference.** Do not expand an
  author list you have not read.
- **The live site was not checked** — `danielhttsai.github.io` is still blocked.
  **Nobody has still opened one of these `.docx` files in Microsoft Word.**
- **Process note: `git add <file>` stages everything in that file.** This run
  twice swept uncommitted work into a commit whose message described half of
  it, and twice unpicked it (save a copy, `reset --soft`, `restore`, re-apply
  in groups, `diff` against the copy to prove the end state is identical).
  Cheap to avoid: commit before you start the next thing.

### Found 2026-08-24 by a thirty-third run — the Protocol Generator hub, second pass, and the claim it advertises

The thirty-first run's released marker ended by naming the hub as "still the
tool nobody has opened since the fifteenth run". That was seventeen runs and one
drive-by commit ago, so this run took it.

Two reviewers on disjoint briefs — a methodologist on the nine cards, the five
family ledes and the citations; an applied analyst on the six routing questions,
the prose boxes and the guard — then **each sent at the other's list**, then a
third sent at this run's own committed diff. **The cross-critique round changed
the most, and it changed it by subtraction**: it killed two of the analyst's
five findings outright and re-aimed a third at a different part of the page.

#### The thread that ran through the whole run

Nearly every real finding had one shape: **a claim this repo had already
adjudicated somewhere else, still live on the hub or in a shared component.**
The hub is downstream of nine builders and a data file, and nothing checks it
when one of them changes its mind. Three instances, all found this run:

- "Validated" over the phenotype library — withdrawn by the thirty-second run
  inside ACNU, still live in the shared component, the hub blurb, the hub's meta
  description, the tools index, the homepage and four builders.
- The amber box's "only for what you actually measured" — withdrawn from Q4 by
  the fifteenth run's own round-two reviewer, still live four inches away.
- The sequential-trial card's unconditional multi-trial-entry claim — withdrawn
  from that card's `assumes` by the fifteenth run, still live in the `when`
  directly above it.

**If you fix a claim in a builder, grep the hub, `src/pages/tools/index.astro`
and `src/pages/index.astro` for it before you finish.** Cheapest lesson here.

#### The biggest thing found, and it was not on the hub

Following "a library of validated phenotypes" to its source found
`src/components/PhenotypeLibrary.astro`, mounted by **five builders**
(`case-control`, `clone-censor-weight`, `interrupted-time-series`,
`sequential-trial`, `trend-in-trend`).

- Header read **"Validated phenotype library"**. Of the 49 entries in
  `src/data/phenotypes.ts`, **19 carry a `validation` study and 30 do not** —
  indications 1/13, exposures **0/18**, outcomes 18/18. Same list and same
  numbers the thirty-second run measured inside ACNU.
- **`renderList` never rendered `validation` at all**, so even the 19 that have
  one were invisible and a user could not tell which was which — under chrome
  saying all 49 were validated. `notes` went the same way, which is how "Exclude
  T1DM (E10.*) separately in the exclusion section" reached nobody.

Fixed: header, validation on the row, notes on the row, an amber **No validation
study** refusal where there is none, and the search box taught to search the two
fields that had just become visible. One deliberate difference from the ACNU
precedent: **these five builders have no `pickedCitations` mechanism** (grep
returns 0 in all five), so the modal says the citation is *not* added to the
reference list rather than borrowing a promise it cannot keep.

#### Checked and clean — do not re-derive

- **The fifteenth run's "clearest hand-off" is stale and done.**
  `interrupted-time-series.astro:798-799` both now end "Both figures are
  conventional minima, not thresholds taken from any source cited below."
- **The "every clone deviates immediately" line the fifteenth run flagged as
  "still live" at `clone-censor-weight.astro:501` is gone.** Don't hunt it.
- The case-crossover and descriptive-analysis cards and families 2-5 were
  checked clause by clause against their builders and are faithful.
- All nine citations resolve, and five were additionally checked for whether the
  paper supports the *specific claim* the card attaches to it. **Snippet
  evidence only — Crossref, PubMed and doi.org are all still 403.**
- Rendered battery after every commit: chip anchors resolve, no duplicate ids,
  9 cards reachable, no overflow at **320**/390/768/1024/1440px, zero
  `pageerror` on twelve tool pages, `window.PC` an object on all nine builders.
- **Chips were never moved. 21 chips before and after; route branches 13 → 15.**

#### What the reviewers disagreed about, and who was right

- **The analyst wanted CCW and ST chipped onto Q1's "if no" branch**, since
  their worked examples are "statin vs no statin" and "benzodiazepine vs no
  use". **The methodologist refuted it and won.** What licenses those designs is
  a grace period or time-varying eligibility, not the absence of a comparator
  drug, so chipping them tells the plain drug-vs-nothing reader with
  point-in-time initiation that cloning is available — which
  `clone-censor-weight.astro:600` and ST's own `fails` both refuse. **Third time
  this page has been asked to make that misroute, second time it was talked out
  of it.** Only prose changed.
- **The analyst wanted Q3 re-cut** from "how much observation can you
  reconstruct" onto event-dependent exposure and fatality. **Refuted, and the
  refutation is worth keeping**: fatality does not license the case-crossover,
  it removes the bidirectional variant (`case-crossover.astro:1300`); immunity
  to *post-event* exposure is not immunity to pre-event reverse causation, which
  is why case-case-time-control exists; and the look-back split is a real
  estimand split. **The fix was additive — a note — not a re-cut.**
- **The analyst filed the g-method contradiction against Q4, the one place on
  the page that has it exactly right.** The methodologist re-aimed it at the
  amber box, where the withdrawn version actually was. Implementing it as filed
  would have made the page worse. All three of us reached the amber box
  independently — the only three-way convergence of the run.
- **The methodologist's "pseudo-period" finding was reversed by the analyst,
  correctly.** The TIT card names a falsification check absent from
  `trend-in-trend.astro`. A wanted it deleted from the card; B pointed out that
  if the card correctly states what defending the design requires, **the gap is
  the builder's**. Not deleted.
- **A reviewer's verification was circular and it said so when challenged.** The
  analyst reported "the header blurb is accurate" about the validated-phenotype
  claim, having grepped the built HTML for the string `"Validated phenotype
  library"`, found it everywhere, and treated its presence as evidence of its
  truth. Its own metric had the tell — five pages scored 3 and four scored
  14-21, and the 3s were the component's own strings. **Checking that a disputed
  label exists is not checking that it is true.**
- **A reviewer's least-confident inference was settleable in one grep and held.**
  B guessed ST's trial-interval control is a constrained `<select>` (which is
  why "once at every date a patient becomes eligible" cannot seed a build
  error) but had inferred it from A's description. `sequential-trial.astro:114`
  is a `<select>`; the finding was dropped on that basis. **Name your
  uncertainty precisely enough that someone can settle it in one command.**

#### Round three: nine for nine, and it found five executed defects

A third reviewer was given only this run's commits and told to break them. **All
five of its executed findings reproduced.** Worth reading in full in
`git show` for the two that are new species:

- **This run rewrote the ST `when` and duplicated a passage already in the same
  card's `assumes`, nearly verbatim, five lines apart** — invisible in the diff,
  unmissable on the page. And this run's *own fix commit* had added "or have the
  outcome" to the `when` copy only, leaving the entry rule stated twice with the
  surviving copy being the one the run had just declared wrong. **A fix that
  half-applies is worse than one that does not apply: it certifies the version
  it left behind.**
- **A new note promised a route that did not exist.** Q1's prose said "question
  2 is where that is decided" and named sequential trial emulation. Walked with
  ST's own example, the reader answers Q2 *yes* (initiators and the
  not-yet-treated are perfectly distinguishable at each origin), lands on Q2's
  yes-note, and is told an ordinary cohort needs the comparator Q1 just denied
  them. Nothing on the page routed anyone to ST on the ground ST's card gives.
  **When you write a note that delegates to another question, go and read that
  question's branches.**
- **A new dead-end branch swallowed the reader it was meant to help.** Q5's new
  third branch and the branch above it were both cut on "uptake" while the TIT
  card says "rises **or falls** markedly", so a drug whose use collapsed after a
  safety warning matched "no marked trend in uptake" and was authoritatively
  routed nowhere. Before the branch existed that reader would have approximated
  onto TIT. **A dead-end branch is a positive claim; check it against the card
  it is denying.**
- The library rows: an amber warning about "a drug class" and "a wildcard's
  membership" rendered on the four exposures that are a single fully-specified
  ATC code (Metformin is A10BA02). Now keyed on whether `codes` contains `*`.
- The library rows again: two sentences invariant across all 49 entries were
  put on every row, costing the picker half its visible height — measured
  64→124px per row, 6 visible entries down to 3. Both invariants now sit once,
  above the list; re-measured at 106px and 4.7 visible.

#### Four more this run found in its own diff before round three arrived

Method worth copying: render the strings, read them cold, then attack your own
new absolute claims the way you spent the day attacking the page's.

- Q3's new note said event-dependent exposure "rules SCCS out however complete
  your data are" — but `self-controlled-case-series.astro` offers a **Farrington
  SCCS-EDE** extension and says "do not silently keep the standard model". The
  note contradicted the page its own chip routes to.
- Q4's new note said a recorded fixed confounder is "handled **perfectly well**".
  Measurement error and positivity do not go away because a confounder is fixed.
- The ST `when` sentence this run wrote dropped the builder's "or have the
  outcome". A had raised it against `assumes` and B had talked me out of it as
  fair hub compression — which it was, **until I authored a new sentence
  carrying the same phrase.**
- The library search filter still searched only name/codes/definition after
  `notes` and `validation` became visible: "Cheng" returned 0 rows of text the
  user could see. Now 4.

Also caught mid-edit by reading rendered strings: a `that` breaking the ACNU
assumption list's parallel; "twice the rows and the same people"; a TIT sentence
my own parenthetical pushed to three clauses; a Q6 branch worded on "comparing
treatments" while the branch above had just been re-cut on "causal contrast".

#### Open, examined, deliberately left — ranked

1. ~~**`descriptive-analysis.astro` has its own local phenotype library (23
   `validation:` fields) and its renderer at `:2260` shows no validation status
   at all.** Its heading is now honest; its rows are not. This is the same
   defect the shared component had, in the last library still carrying it, and
   it is the **best next target in this area**. `case-crossover` and
   `self-controlled-case-series` already render a refusal; ACNU does; the shared
   component now does.~~ **Done 2026-08-24 (thirty-fourth run)** — see that
   run's section at the bottom of this file. Two of the 23 were validation
   studies; the field is now split `validation` / `provenance` and only the
   former reaches the reference list.
2. **CCW and ST sit in a family called "Cohort designs with a comparator" and
   both worked examples are drug-versus-nothing studies.** The fifteenth run
   logged this for CCW alone as editorial; it is **two of three cards**, which
   makes it Q1 gating a family whose majority do not need what Q1 asks. Both
   reviewers agreed the remedy is **not** to move chips. Changing the two
   examples or renaming the family are visible choices — **Daniel's call.**
3. **`trend-in-trend.astro` has no pseudo-period falsification check** though
   the hub card correctly names it. The gap is the builder's; adding it is a
   feature.
4. **`PhenotypeLibrary.astro` has no `provenance` field**, so it cannot make the
   split `case-crossover.astro:65-89` and `self-controlled-case-series.astro:66-97`
   document — "a study that used an outcome has not validated it". **If a future
   run audits the 19 `validation` strings in `phenotypes.ts` for that
   distinction, expect some to be provenance wearing a validation label**: the
   thirty-second run found sixteen of eighteen such in ACNU's list, and two
   fabricated references among them.
5. **The Prentice clause on the case-control card is an unverified attribution,
   not a known-wrong one.** Snippet evidence supports Vandenbroucke & Pearce
   2012 for the risk-set and cumulative clauses; none was found for case-cohort
   with Prentice weighting, and the builder is more careful than the hub.
   **No replacement citation was proposed and none should be** without a record.
6. **The five builders' library still cannot carry a citation into the exported
   protocol.** ACNU can. The row now says so honestly; building it is a feature.
7. **A duplicate-suffix typo between `CC`, `CCO` and `CCW` still passes the
   guards** — all three exist, so an existence check cannot catch a route
   pointing at the wrong one. A reviewer proposed a per-question expected-count
   assertion; **rejected as brittle.** The browser battery's chip dump is what
   would show it.
8. The amber box still says nothing about trend-in-trend although Q4's fixed
   branch chips it. Small; the box is already long.

Unchanged and still as previously described: the `applySeed` lone-`<input>`
array item, the `?seed=` whitespace trim on five builders, the 320px SVG
overflow on two builders, the double `render()` per amendment keystroke.

#### Verification and its limits

- Everything above was observed in Chromium against a local `astro build` +
  `http-server`. A regression battery (`reg/dump.mjs`) dumped the rendered text
  of every card, route, chip and box plus anchor/reachability/overflow/pageerror,
  and **its output was diffed after every commit** — which is what let each
  commit message say "these lines moved and nothing else did". It caught nothing
  unintended, which is itself the useful result.
- The **three build guards were each tested by planting the defect** (a second
  `CC`, a family of `"cohorts"`, a route to `"CCX"`) and confirming the build
  fails naming it, then restoring.
- **The live site was not checked** — `danielhttsai.github.io` is still blocked
  from this sandbox. **Nobody has still opened one of these `.docx` files in
  Microsoft Word.**
- **No citation was added, changed or expanded anywhere in this run.**
- `package.json` was untouched; `git diff package.json` checked before staging.
- One process note: **backticks in a `git commit -m` string are shell command
  substitution.** A commit message here silently lost the word `renderList` to
  it. Use `git commit -F <file>` with a quoted heredoc for anything containing
  code identifiers.

### Found 2026-08-24 by a thirty-fourth run — the descriptive-analysis phenotype library, end to end

The thirty-third run ranked this first and called it the best next target in
the area. Two reviewers on disjoint briefs — a methodologist on the 42 entries'
epidemiology and every citation, an applied analyst on the interaction and the
data flow — then **each sent at the other's list**, then a third sent at this
run's own committed diff and found nine defects in three commits.

#### The mechanism that was wrong, and it was one mechanism

Picking a phenotype appended its `validation` string **verbatim** to the
exported protocol's numbered "Key references" list (`:2279` → `activeCitations`
→ `:1525`/`:2071`). The modal rendered name, codes and definition only, so
**that string was never on screen at any point** — and the "Key references"
textarea the user edits held nine lines while the exported file held twelve.
Reproduced; a protocol whose only library actions were three picks shipped:

```
10. Requires mortality linkage; see /databases feature matrix for sites with `mortality` flag.
11. WHO standard cause-of-death grouping.
12. AsPEN hip-fracture multi-country work; Lai EC et al, BMJ Open 2021/2023.
```

**Of the 23 `validation` strings, two were validation studies.** Both reviewers
and the orchestrator classified independently and agreed. The other 21 were
provenance ("Used in …"), a claim about a classification ("WHO standard."), an
instruction to the author ("cite Wong MCS et al where applicable"), or a
surname with no year, journal or title.

Fixed by adopting the split `self-controlled-case-series.astro:66-99` already
settled: `validation` = a study that measured the definition and the ONLY thing
reaching the reference list; `provenance` = everything else worth knowing,
shown and never numbered; an entry with neither says so on the row. Measured
after: **reference lines a pick can inject fell from 23 to 2** (populations
0/10, exposures 0/19, mortality causes 0/6, outcomes 2/7); all 42 rows show a
validation study or a visible refusal.

#### The lesson, which is the thirty-third run's own, repeating twice in one run

**A claim this repo already adjudicated, still live in a copy nobody diffed.**

`descriptive-analysis.astro:174` carried `"Man KKC et al Lancet Psychiatry 2024
(PMID 39241791)."` on Suicide / self-harm. That PMID is **Luo H, Chai Y, Li S,
et al**, Lancet Psychiatry 2024;11(10):807-817, a psychotropic-prescribing
paper with no self-harm outcome. `sccs:66-99` and `case-crossover:77-79` already
record this; confirmed independently again here, making it the **third**
confirmation. It was live in two more places — here, reaching exported
reference lists unseen, and `src/data/phenotypes.ts:149`, where the
thirty-third run had just made `validation` visible on the row under the label
"Validation study", **promoting the false attribution from invisible to
advertised** across five builders.

**Then this run did the same thing to itself.** Its first commit withdrew a
false hip-fracture attribution from `descriptive-analysis` and left the same
claim in `phenotypes.ts:113`, green, on five pages — while writing the
withdrawal record. It also declared PMID 38146486 non-validating in one library
while the other labelled it a validation study: **one identifier, opposite
verdicts, both on screen in one site.** And its ATC commit said "this ports
them" having ported four of five. All three were found only by the third
reviewer. **Grep for the string you are withdrawing. Every time.**

#### One list, five copies, three defects already fixed in one of them

The methodologist's grep across `src/` was the highest-leverage act of the run.
The drug-exposure list is copy-pasted into **five files**, and
`active-comparator-new-user.astro` had **already corrected three of the defects
found here, in prose, in this repository**:

| defect | already correct at |
|---|---|
| tirzepatide A10BX16 asserted inside `A10BJ*`, which excludes it | ACNU:303 |
| `N05A*` sweeps in N05AN01 lithium; atypicals are not a contiguous range | ACNU:310 |
| `N06BA` sweeps in atomoxetine N06BA09 and modafinil N06BA07 | ACNU:311 |

The tirzepatide one is not cosmetic: the string lands in the exported DDD
metric's **numerator** as an executable instruction, so every site runs
`A10BJ%`, returns no tirzepatide, and the sites agree with each other.

Also fixed, no in-repo precedent: **"Cholinesterase inhibitors" listed
memantine**, an NMDA antagonist. N06DX01 is the correct ATC *for memantine*,
which is why it survived — the damage is in the **name**, because downstream
prose carries the name and not the codes ("New users of Cholinesterase
inhibitors" over a cohort containing memantine initiators). Renamed to
"Anti-dementia drugs", listed by molecule since `N06D*` also holds ginkgo
(N06DX02) and the anti-amyloid antibodies (N06DX03-05).

**Ported to `descriptive-analysis.astro` and `src/data/phenotypes.ts` only.
`self-controlled-case-series.astro:55-57,64` and `case-crossover.astro:53-55`
still carry the old strings** — ranked below.

#### What the reviewers disagreed about, and who was right

- **The analyst reported both the incidence and initiation checks as disarmed;
  the methodologist showed only one is, and the distinction decides the fix.**
  `:1709` (initiation) asks an **availability** question that `indexDateRule`
  genuinely answers. `:1707` (incidence) asks a **selection** question and is
  satisfied by a string about enrolment duration. Availability is necessary for
  exclusion and nowhere near sufficient.
- **The orchestrator measured the wrong artefact and had to be corrected by the
  analyst.** Checking whether these warnings fire, it grepped the exported
  Markdown, found nothing in any condition, and briefly concluded the analyst
  had overstated it. **These checks render to an on-screen panel and never
  reach the Markdown at all.** Confirm which artefact carries a thing before
  concluding it is absent from it.
- **The analyst framed the 19 unvalidated exposures as missing evidentiary
  fields; the methodologist pointed out three of the nineteen carry wrong
  codes.** Adding nineteen empty provenance fields would have shipped the wrong
  codes with a tidier UI.
- **The analyst called the six mortality definitions "dead content"; executing
  it refuted the framing.** All six render and are what a user reads to choose.
  They are *unexported*: no `mortCauseDef` control exists. Right conclusion,
  wrong diagnosis, and the wrong one sends a fixer to the wrong place.
- **The methodologist wanted `mortalityCauses` to carry no citation field at
  all, against the run's plan to demote all six to `provenance`. It was right.**
  "WHO standard." is a claim about the classification — true of three groups,
  **false as labelled for one** (WHO's I00-I99 is the circulatory-system
  chapter; WHO defines no category called "cardiovascular death"), and
  meaningless for the ad-hoc union. Filing it as provenance would have
  laundered it. The true half moved into `codes`; the field is gone.
- **A reviewer's proposed regression metric would have passed the worst string
  in the file.** "15 of 23 contain no four-digit year" scores PMID 39241791
  clean: it has a year, a journal, an author and a resolving identifier.
  **Useful as triage, never as the acceptance test.**

#### New: a field's audience decides where a caveat can live

The run moved the I22 and I64 caveats out of `definition` into a note, to stop
`definition` tripping the site-feasibility engine's `imaging` scan. The third
reviewer caught what that cost: **`definition` travels into the exported
Section 4 table; `notes` and `provenance` are modal-only.** The caveats a site
most needs in order to execute the definition stopped reaching the document
while the codes cell still exported `I21.*, I22.*`. Worse, both ICD-9-CM-era
qualifications sat in `provenance` — so the run found a real mismatch and
routed the disclosure to the one place it could never reach the citation it
qualified. **Before moving a string between fields, ask which of them reaches
the artefact.** Now: caveats are back in `definition`, each validation string
carries its own caveat inside it, and only the clause with the word "imaging"
stays behind, with the reason recorded beside it.

#### Open, examined, deliberately left — ranked

1. **The incidence check is disarmed in the default configuration and cannot
   be re-armed by a user who writes the truth.** `popBlob` (`:1665`) includes
   `indexDateRule`, whose shipped default (`:422`) contains "washout" and
   "365", and `:1707` suppresses on `/washout|prior|history|…/`. Measured
   against the `#checks` panel, population = Hypertension, default metrics:

   | indexDateRule | incidence | initiation |
   |---|---|---|
   | shipped default | suppressed | suppressed |
   | same, without "washout"/"365" | FIRES | FIRES |
   | "index = date of cohort entry; **no washout applied**" | suppressed | suppressed |
   | "…after a 365 d washout with no prior outcome" | suppressed | suppressed (correct) |

   **The methodologist's ruling, which is the point:** a continuous-enrolment
   washout is a *data-availability* condition and prevalent-case exclusion is a
   *cohort-selection* condition; the first never licenses the second. So the
   incidence suppression is wrong **on the epidemiology**, not merely on the
   string matching — and `:1709` (initiation) is NOT broken, because it asks an
   availability question. Ranked remedy: **(a) drop `indexDateRule` from the
   incidence test only** (after which the warning correctly fires on a default
   page — expect that, it is a true positive), **plus (c) make suppression
   visible**, quoting the phrase that silenced it, through the escaper and
   length-capped, and following `:1688-1693`'s precedent so it reaches the
   export too. **(b) "treat an untouched default as empty" and (d) negation
   handling were both examined and rejected** — (b) creates a false positive on
   the check that works and needs a second copy of the default string; (d) is
   unbounded in free text and would make a known-unreliable check look reliable.
   Deferred deliberately: all three shipped commits withdrew a false assertion,
   and this is a missing warning; folding an engine change into a library run is
   how a run ships eight defects in five commits.
2. **`FEATURE_TRIGGERS` reads the library's hedges as requirements — six
   instances, five still live.** `:802-812` is a bare substring scan with no
   negation or scope handling. Measured hits where the entry's own text marks
   the data optional: COVID "**lab**-confirmed … where linkage available",
   AKI "pair with **creatinine** criteria where lab linkage exists", CKD
   "**eGFR** … where labs available" → all force **labs**; "Cancer-survivor
   cohort for … **mortality** … studies" (a menu of example uses) forces
   **mortality-linkage**; "Cancer death" forces **cancer-registry linkage** for
   a study needing only cause-of-death coding. The stroke/`imaging` instance is
   worked around, not fixed. This is one bug in six places and it names specific
   sites as unable to run studies they can run.
3. **`sccs:55-57,64` and `case-crossover:53-55` still carry the pre-correction
   ATC strings** (tirzepatide inside `A10BJ*`, bare `N05A*`, `N06BA`,
   cholinesterase-inhibitors-with-memantine). ACNU's corrected text is at
   `:303,310,311`; this run's is in `descriptive-analysis` and `phenotypes.ts`.
   **Copy, do not paraphrase.** Check each file's renderer shows `notes` first.
4. **A citation survives the edit that invalidates it.** Pick MI, then rewrite
   `outcomeCodes` to I21-only and rewrite `outcomeDef` — Cheng CL is still
   cited. `activeCitations` (`:1386`) keys on the four *name* fields only. The
   modal now says so honestly ("it stays for as long as this entry's *name* is
   the one in the form"), but the mechanism is still wrong. **ACNU already
   solved this** at `:4814`: `libraryPicks[k] = {wrote, cite, fields, check}`,
   where the citation holds only while every field the pick wrote is unchanged.
   Port it. Related: `pickedCitations` has its own localStorage key, so typing
   a library name by hand into a fresh protocol attaches a citation the user
   never picked (reproduced), and any of the four name fields matches any
   stored key regardless of category.
5. **`mortCauseDef` does not exist**, so six carefully written cause-of-death
   definitions are read in the modal and never reach the protocol; the exported
   document gets a bare ICD range. **If you add the field, do NOT add it to
   `FEATURE_TEXT_FIELDS`** — the analyst's sweep found seven inert regex hits
   that would go live at once, including `cancer` matching "Death from any
   malignant neoplasm", which would demand cancer-registry linkage from every
   site. Fix the export path only.
6. **Code-set defects examined and deliberately NOT changed**, because the codes
   are not wrong so much as wrong *for an unstated classification*, and this
   builder is explicitly multi-country: `E14` is valid WHO ICD-10 and absent
   from ICD-10-CM while `E08`/`E09` are the reverse (`:71`); `X60-X84` likewise
   (ICD-10-CM uses X71-X83 with poisonings in T36-T65); `F00` in the dementia
   list. **A single harmonised list across WHO ICD-10, ICD-10-CM, KCD and
   ICD-10-AM does not exist, and manufacturing one is the guess this file
   forbids** — state the classification the list assumes instead. Also left:
   `N18.3` is not a leaf code in ICD-10-CM (expanded to N18.30/.31/.32 in FY2021)
   and `N18.6` is missing from a "stage ≥3" cohort; `A10BD*` fixed-dose
   combinations are missed by every antidiabetic wildcard, biased differently by
   country. The HF-cohort circularity and the CKD lab-OR-claims split are now
   *stated on the row* rather than fixed, because which arm to keep is Daniel's
   call.
7. **Rows are taller.** Median row height, baseline → now: populations 93→172,
   exposures 70→91, outcomes 93→172, mortality 93→172; fully-visible entries at
   1440px fell from ~4/5/3/4 to 2/3/2/2, and at 320-390px three of four pickers
   show one entry. Two drafts were worse and were measured back down (see
   below). Judged worth it — the rows now carry the validation status, which is
   the most important fact about a definition — but if a future run wants the
   density back, the lever is a collapsed "About this entry" disclosure.

#### Caught in this run's own diff, before the third reviewer arrived

- **The first draft of the field split made the picker unusable** — provenance
  strings narrating withdrawal history took outcome rows to 175-250px, **one
  entry visible**, down from three. The history moved to a comment; the refusal
  explanation, the same sentence on 40 of 42 rows, was hoisted above the list.
  **This is the regression the thirty-third run undid in the shared component,
  re-committed by the run that had just read about it.** The third reviewer then
  found five rows still narrating their history anyway.

#### Verification and its limits

- Observed in Chromium against a local `astro build` + `http-server`.
  `reg/dump-lib.mjs` dumps every row's rendered text in all four categories, row
  heights, search probes, a fixture's form fields and exported reference
  section, overflow at five viewports and pageerrors; **diffed after every
  commit.** After the ATC commit it showed exactly five rows changed.
- All twelve tool pages: zero pageerrors, `window.PC` an object on all nine
  builders. The 320px `scrollWidth` 359 overflow is the pre-existing SVG one,
  measured identically before and after.
- **Citations were checked by `WebSearch` snippets only** — Crossref, PubMed and
  doi.org are all still blocked. Two were confirmed to resolve *and* to support
  the claim attached to them (Cheng CL, J Epidemiol 2014;24(6):500-7, PMID
  25174915, chart-review PPV 0.88; Hsieh CY, J Formos Med Assoc 2015;114(3):254-9,
  PMID 24140108). Their titles and PMIDs were expanded in the data from those
  same snippets. **No new citation was added anywhere.** One new factual claim
  the run *did* write from a reviewer's snippet — that PMID 38589601's sites are
  "Nordic, not AsPEN" — was wrong, and was caught by the third reviewer and
  withdrawn. That is the species this run existed to remove, authored by the run.
- **The live site was not checked** — `danielhttsai.github.io` is still blocked.
  **Nobody has still opened one of these `.docx` files in Microsoft Word**;
  `buildDocx` throws on both builds because the UMD bundle is CDN-hosted.
- `package.json` untouched; checked before staging.

#### Process trap, new

**The sandbox starts in detached HEAD.** The ship loop's `git push -q origin main`
pushes the stale local `main` ref and is rejected as non-fast-forward five times
in a row — with `&& break`, the loop exits silently having pushed nothing. Run
`git checkout -B main` before the first push, and check the loop actually
printed a success.

### Found 2026-08-24 by a thirty-fifth run — RWE Studio's controlled-ITS counterfactual, from the coefficient to the CSV

The thirty-first run named this as the best next target and sized it at "two
strings and a branch on `ctrl`". That estimate was wrong in the most useful
way: the same path held **a wrong number** that three previous reviewers had
walked past, and the wording defect turned out to reach six surfaces rather
than two. Two reviewers on disjoint briefs, then each against the other's list,
then one back at this run's own committed diff.

#### The premise, established and not to be re-argued

`Xc` (`:2810`) zeroes only the two `g:` columns, and `L0` (`:2789`) builds the
end-of-follow-up contrast out of `g:level` and `g:tsince` alone. So in a
controlled run the counterfactual is the **difference-in-differences**
counterfactual — the intervention series changing the way the comparator
changed — and the reported number is **correct**. Everything that was wrong was
what the tool said about it. Written out and checked against real R:

```
uncontrolled  log(reported) = beta_level + s*beta_tsince        (a pre-trend projection)
controlled    log(reported) = beta_{g:level} + s*beta_{g:tsince}  (a DiD contrast at time T)
```

A reviewer also executed the term-by-term question and the answer is that `Xc`
is **right**: `g`, `g:t`, the seasonal terms and the offset are each correctly
RETAINED (each is a baseline property of the arms or is shared by fit and
counterfactual, and each cancels out of `ct`). Verified numerically, including
a harmonic fit where `sin(2*pi*t/12)` carries the largest |z| in the model
(17.08) and contributes exactly nothing to the reported ratio, and a run with
different catchments per arm. **Do not "fix" `Xc`.**

#### The wrong number, which no earlier pass had

**A term R could not estimate is absent from `nmv`, so its slot in `L0` stays
zero and the contrast silently loses that component while the label goes on
promising a quantity accrued to the end of follow-up.** The reachable shape is
ordinary — a comparator hospital whose extract ends at the month the policy
started, which is the case the note at `:2782` was already written for. Then
`g:tsince` aliases and the row prints the level step alone:

```
truth 0.9 * 0.93^17 = 0.262      intact comparator recovers 0.271
printed: Fitted vs counterfactual at 2020-12-01 (end of follow-up) 0.986 (0.764-1.273)
```

"No difference" where there was a 74% reduction. The tell is that 0.986 is
**byte-identical to the "Difference in level change" row two lines above it**,
and that is also the argument that settled refuse-vs-relabel: a relabelled row
would be a verbatim duplicate of a row already in the table, so suppressing it
withholds no answer — only a false claim about what the number accrued to.

Both aliasing states now refuse, visibly. The neighbouring one (BOTH `g:` terms
alias — a comparator whose extract stops *before* the policy) was already
suppressed by `vct == 0` and said nothing at all; a shorter table was the only
signal.

**The refusal is transported on `ITSMETA|cfok=`, not re-derived per surface.**
A reviewer proposed gating the chart on "do not draw a dashed path numerically
equal to the solid one". **That was measured and it fails**: in the single-alias
case the withheld counterfactual sits **1.4% from the fitted value**, so the
test passes and the line is drawn — one curve asserting the model expected the
collapse, beside a note refusing to report that very comparison. A refusal the
picture contradicts is worse than either alone.

#### What each surface now does, and why the CSV forced a decision

Six surfaces carry that number. The trace is worth keeping because it is the
reason a note was not enough:

| surface | before | now |
|---|---|---|
| estimate label | "Fitted vs counterfactual at X (end of follow-up)" — named no comparator, no series, and an endpoint that could be neither arm's | names the DiD contrast, carries `slab`, and names which endpoint |
| note under it | the uncontrolled definition, printed in both branches | one note per branch |
| chart caption | one string, false in controlled runs | three-way: refused / controlled / uncontrolled |
| `report.md` / `.docx` | the false note, verbatim | the branched note, verbatim |
| **fitted-series CSV (`#dlfitted`)** | a column headed `counterfactual`, **no prose anywhere** | `not estimable` in the refused cases |

**`ITSMETA` reaches no export.** `:4316` strips it out of `display` before
`LAST.out` is built and `LAST.meta` is read only by `renderITSChart`; the CSV
button emits rows and nothing else. So a `RESULT_NOTE` — which does reach the
`.md` and the `.docx` — cannot reach the CSV, and the cell value is the only
refusal that can. That is why the R side writes `not estimable` rather than
leaving the chart to decline on its own.

**Three of the four things a reader needs are in the LABEL, not the note**,
because the note does not follow the row onto a slide. The file already knew
this — the comment above `slab` says exactly that — and had appended `slab` to
three of the four surrounding rows and not to this one, which is the row most
likely to be copied.

#### The two files that make the wording defect a sign reversal rather than a magnitude error

Keep both; they are cheap to rebuild and they are what makes this arguable.

- **co-intervention on both arms** (control 200→100, intervention 200→80):
  DiD 0.800, own-pretrend 0.400. The tool printed **0.820** under a sentence
  defining 0.406.
- **co-intervention on the COMPARATOR only** (intervention 200→160, a true 20%
  fall): controlled row **1.637 (1.249–2.147)**; the same series fitted
  uncontrolled gives **0.809 (0.668–0.980)**. Under the old note's own
  definition the reader concludes the arm ended 64% ABOVE its own baseline
  trend, where the described quantity is 19% below. **Pre-trends are exactly
  parallel by construction, so no warning fires.**

#### What the reviewers disagreed about, and who was right

- **Refuse or relabel the incomplete contrast.** The methodologist offered
  relabelling as an available second-best; the analyst killed it with the
  duplicate-row observation above and was right. Recorded because the same
  block *relabels* two rows higher up (the thirty-first run's "fall back and
  name the surviving series") — that precedent does **not** transfer, because
  there the relabelled row carried information no other row did.
- **What the chart-suppression should key on.** The methodologist's numeric
  equality test versus the analyst's flag. The analyst won on a measurement
  (1.4%), and the methodologist then conceded while pointing out the analyst's
  own flag (`all.equal(fv,cv)`) is **false in exactly the state that prints the
  wrong number** — it fires on the both-alias case, where no number is printed,
  and not on the single-alias case, where one is. **The right answer was the
  methodologist's predicate on the analyst's transport**, which is what shipped.
- **Is the "near but not equal" overplot generic?** The analyst said the
  intervention's dashed counterfactual always lands ~2px from the comparator's
  solid line in a controlled ITS. The methodologist built two counter-files:
  on a COUNT scale with differently-sized sites they are 69px apart; matched on
  a RATE scale they collide at 1.2px. So it recurs whenever the arms coincide
  **on the plotted scale**, which the well-matched-comparator case does. Not
  fixed — a redesign — but the caption now tells the reader that closeness
  between the intervention arm's dashed and solid lines means a small effect
  rather than a missing line, which was the actual misreading.
- **A short comparator post-segment.** The methodologist filed this as "wording
  only, ride it along". The analyst measured it and overturned that outright:
  with the comparator's post segment at K periods (truth 0.262), K=2 gives
  **0.071 (0.001–8.444)** and K=4 gives 0.216 excluding 1, with **no alias
  note, no collinearity note and no short-series note** — because `npre`/`npost`
  are counted off `a$g==gref`, the intervention arm, so neither guard can see
  the comparator, and the fit sentence says "18 from 2019-07-01 onward" on a
  file whose comparator has two. The intervals stay honest; the point estimate
  does not. This is now its own note.
- **Damage framing on the last row.** The methodologist argued a reader is
  misled toward the null, since `0.820 (0.620–1.085)` sits under
  `0.821 (0.695–0.971)`. The analyst showed it is **not directional** — on a
  file where the intervention arm ends early the two rows flip the other way
  (0.841 including 1 above 0.789 excluding it) — so there is no heuristic a
  reader could learn. Neither proposed reordering or removing the row; both
  said that is a design change and Daniel's call.

#### The own-diff round, five for five — and this time it found no wrong number

Worth recording as plainly as a wrong number would be: a reviewer sent back at
this run's committed diff ran 13 battery cases and 9 fresh ones and **could not
find a case where the diff produces a wrong output**. What it did find:

- **A dead branch that advertised a gap it could not close.** `eflab` was
  written to name the surviving series when the row's endpoint precedes the
  file's, with an uncontrolled alternative. `!ctrl` means exactly one series
  survives, so `tn == max(a$t)` always and the alternative is unreachable. No
  wrong output was ever possible from it. It was deleted anyway, because it
  told the next reader that the single-series dropped-trailing-periods case was
  handled here when that case still prints "(end of follow-up)". **A branch
  that looks like it covers a known open item is worse than no branch: it stops
  the next person looking.** The proof it was dead is that all 18 battery
  labels were byte-identical after deleting it.
- **A missing mirror**, two unqualified sentences, and one word ("fall" on an
  additive-scale fit). All four fixed in one commit.

#### Verified this run, and how

- Chromium against a local `astro build` + `http-server`, with the page's own
  `buildScript()` output run under **real R 4.3.3** (`apt-get update` then
  `apt-get install -y --no-install-recommends r-base-core`; run as root, no
  `sudo` — `sudo apt-get` exits 100 here).
- **An eighteen-case regression battery run before every commit and diffed
  after it**, and it earned its cost twice: it is what lets the second and
  third commits say "every RESULT_ESTIMATE value and every FITTED numeric cell
  is byte-identical, so nothing here moved a number", and the byte-identical
  LABELS after the third commit are the proof the deleted branch was dead
  rather than believed to be. Eight of the eighteen cases came from the
  reviewers and each is named for what it proves.
- **The harness is cheap; rebuild it rather than working without it.**
  `drive.mjs` runs the page twice: pass 1 stubs `window.RWEngine.run` to capture
  the generated R script and master CSV, pass 2 feeds real Rscript output back
  through the same stub so panel, chart SVG, Table 1 and `buildReport` are all
  the page's own code. SheetJS (`cdnjs`) is blocked and must be `page.route`d to
  an `npm pack xlsx@0.18.5` copy — **CSV upload goes through SheetJS too**, so
  nothing can be uploaded without it. WebR's CDN is blocked; the stub is the
  only way in.
- The ITS role keys are `TIDX`, `YCOUNT`, `DENOM`, `SEAS`, `SERIES` — not the
  obvious names. A mapping with the wrong keys silently falls through to
  `suggestCol` and the run still succeeds, on a different mapping than intended.
- **Zero `pageerror` on all twelve tool pages and `typeof window.PC === "object"`
  on all nine builders, before every commit.**
- **The live site was not checked** — `danielhttsai.github.io` is still blocked.
  **Nobody has still opened one of these `.docx` files in Microsoft Word**; the
  `.docx` was exercised by one reviewer through a routed `docx@8.5.0` and read
  as XML, and was NOT re-exercised against the final diff (inferred from
  `buildReportDocx` being untouched and fed the same arrays).
- **WebR itself was never run**, by any of the three reviewers or by me. Every
  number is Rscript 4.3.3 on the page's own generated script. If WebR's R
  differs in how `glm` reports a rank-deficient fit, the `cfok` predicate could
  behave differently there. Nobody in this sandbox can check that.
- **No citation was read, added, or changed anywhere in this run.**

#### Still open on this path — ranked, all reproduced, deliberately left

1. **The printed coefficient table's model-based p-values.** Now the best next
   target in this tool. Reproduced again on this run's own baseline: the matrix
   from `print(summary(fit)$coefficients)` carries model-based SEs whatever
   `semode` chose, and the very next line printed says "Standard errors: the
   wider of the model-based and the Newey-West HAC standard error". Adjacent
   lines contradicting each other, and that table is the only source of
   p-values in the `.md` and the `.docx`.
2. **The chart is illegible at a 390px viewport.** Measured: the SVG renders
   **274 × 115 CSS px** with every `font-size="10"` label in a **4px line box**
   — axis dates, the interruption annotation, both legend entries. The
   container's `overflow-x-auto` is inert because the SVG is `width:100%`, so
   it shrinks instead of overflowing. A reviewer's proposed remedy (drop
   `max-width`, give it a `min-width` at its natural 760px) was checked for the
   caption regression you would expect and **there isn't one** — container
   scrollWidth 792 / clientWidth 306, caption stays 274px, the page body does
   not scroll horizontally. Left because it is a layout change with nothing to
   do with the counterfactual, not because it is wrong. Same species as the
   1293-character `<option>`.
3. **The line style is keyed nowhere but the caption.** Colour keys series;
   nothing in the figure says what dashed means. With the caption now correct
   this is smaller than it was, but a legend entry would be the real fix and
   that is a design change.
4. **`renderITSChart` is the only one of the three renderers not wrapped in
   `try/catch`** (`:4455` bare, against `:4456`/`:4457` wrapped). No triggering
   input was found and none is claimed. Recorded because the asymmetry is one
   line — but note the trade runs the wrong way for a figure that has just been
   taught to refuse: wrapping it would turn a loud failure into a silently
   missing chart.
5. **`:2890` — "the baseline trend, and therefore the counterfactual, is poorly
   estimated"** is incomplete rather than wrong in a controlled run (the
   comparator's post-intervention segments matter too). The comparator note
   added this run covers the post side; this sentence still names only the pre
   side. Two reviewers split on how bad it is and both agreed it is small.
6. **The parallel-pre-trends note's scope clause says "the
   difference-in-differences rows below".** Nothing is below it: the panel
   collects every `RESULT_NOTE` into one block underneath the whole estimates
   table (`:4319`), so the spatial word is an artefact of `cat()` ordering
   inside the R script. Not acted on — but do not repeat the argument that this
   clause EXCLUDES the end-of-follow-up row. One reviewer led a finding with
   that reading and the other showed it is a coin flip and moot either way.
7. The Table 1 "Total outcome" under `ratemode`, the GLM-hardcoded
   Durbin–Watson disclaimer, `(rate ratio)` on the difference rows, the
   empty-period note on a controlled run, and the ITS demo exercising no ITS
   diagnostic are all unchanged from the thirty-first run's list.

<!-- CLAIM 2026-08-24 (thirty-fifth run, RELEASED): finished. Best next targets:
     the printed coefficient table's model-based p-values (item 1 above, in this
     same file, verifiable from this sandbox), then the 390px chart viewport
     (item 2, measured, with the obvious remedy already checked for regressions).
     Do not re-open the counterfactual wording or `Xc` — both were argued to a
     conclusion this run and the reasoning is above. -->
