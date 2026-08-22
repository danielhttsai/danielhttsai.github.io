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

## Known open items

- **Layout: the ACNU builder overflows horizontally (~250px).** Reported from a
  real screenshot: in section 1 (Study identification) the SHORT ID and
  VERSION · DATE fields run past the card's right edge. Suspected in that grid.
  The same overflow may affect other builders. Not yet fixed.
- SCCS's Farrington event-dependent-exposure sensitivity item is ticked by default
  with no explanation or citation. Daniel said to leave it for now.
- Weight diagnostics in RWE Studio cover IPTW only; SMR, overlap and
  fine-stratification weights get no equivalent check.
- No post-matching balance table (the SMD-after column is IPTW-weighted only).
- Nobody has ever opened an exported `.docx` in Microsoft Word — every claim about
  those files is what a parser saw.
