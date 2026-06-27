---
title: "Clone-censor-weight, explained: per-protocol effects without immortal-time bias"
date: 2026-06-27
excerpt: "Most clinical questions are really about sustaining a treatment strategy, not just starting it — and that's exactly where naive analyses break. Clone-censor-weight is how you answer the per-protocol question honestly. Here's the intuition, in three moves."
tags: ["causal inference", "target trial emulation", "methods"]
---

In the post on [target trial emulation](/writing/target-trial-emulation) I drew a line between two questions: the effect of *starting* a strategy (the intention-to-treat analogue) and the effect of *sustaining* it (the per-protocol effect). The per-protocol question is usually the one clinicians actually mean — "what happens if patients *keep* taking it?" — and it's the one that quietly breaks naive analyses. Clone-censor-weight (CCW) is how you answer it honestly.

## When you need it: sustained strategies

Reach for CCW when the "exposure" isn't a single decision at baseline but a **rule applied over time**: *treat to target for ≥2 years* vs *stop at one year*; *stay on the SGLT2 inhibitor* vs *switch*; *continue augmentation* vs *discontinue*. The thing you're comparing is a strategy sustained through follow-up.

## Why the naive per-protocol analysis fails

The tempting move is to classify people by what they *actually did* over follow-up — "completers" vs "stoppers" — and compare them. But that conditions on the future. Patients who tolerate and respond tend to stay on; those who deteriorate or have side effects stop. So "stayers" look healthier for reasons that have nothing to do with the drug. You've re-introduced exactly the selection that randomisation was meant to prevent — plus **immortal time**, the stretch a patient must survive to be counted as having "sustained" the strategy.

## The three moves

### 1. Clone

At time zero, copy each eligible patient into *every* strategy they're compatible with at baseline. Someone who could plausibly start either arm becomes **two clones** — one assigned "sustain", one "stop" — identical in every baseline covariate. This hard-codes the trial's defining feature: assignment can't depend on anything that happens later.

### 2. Censor

Follow each clone under its assigned rule. The moment a clone's real data **contradict** its rule — the "sustain" clone stops the drug, or the "stop" clone keeps taking it — censor that clone at that time. Now every clone's observed follow-up is consistent with its strategy *by construction*, so no immortal time can accumulate.

### 3. Weight (inverse-probability-of-censoring)

Censoring isn't random: clones that deviate differ from those that don't (side effects, worsening disease). Dropping them naively would re-introduce selection. So at each time you model the probability of *remaining uncensored* given measured, **time-varying** covariates, and weight each surviving clone by the inverse of that probability. The weights rebuild the population the censoring removed. The crucial assumption: **no unmeasured confounders of deviation** — you've measured the things that drive staying versus stopping.

## A worked example

The sustained-strategy question shows up constantly in pharmacoepidemiology. In work on augmentation strategies for treatment-resistant depression, "what if patients *kept* the augmentation?" is a per-protocol question by definition. Cloning at the augmentation start, censoring at deviation, and applying inverse-probability-of-censoring weights lets the **intention-to-treat analogue** (effect of *starting*) and the **per-protocol** estimate (effect of *sustaining*) sit side by side — two genuinely different clinical questions, each answered on its own terms rather than conflated.

## Pitfalls and practical tips

- **Grace period.** Allow a short window to "start" before you censor, or you'll censor almost everyone on day one. Pick it on clinical grounds and report a sensitivity analysis.
- **Positivity.** If some covariate pattern *always* deviates, its weights explode — check for it before trusting the estimate.
- **Stabilise and truncate weights.** Use stabilised weights; truncate extremes (e.g. 1st/99th percentile) and report what you did.
- **Sanity-check.** Stabilised weights should average about 1; inspect the largest few. A big gap between the ITT-analogue and per-protocol results is informative, not embarrassing — but it deserves scrutiny.

## The payoff

Clone-censor-weight lets you ask the *sustained-strategy* question — usually the clinically relevant one — without the immortal-time and selection traps that sink naive per-protocol analyses. It's the natural partner to [target trial emulation](/writing/target-trial-emulation): TTE writes the protocol of the trial you can't run; CCW emulates its per-protocol contrast.

---

*This is the method behind several of my studies and my recurring ACPE educational session. Want the slides or a worked template? [Get in touch](mailto:danielhttsai@gmail.com?subject=Clone-censor-weight).*
