---
title: "Target trial emulation: writing the protocol of the trial you can't run"
date: 2026-06-27
excerpt: "Most “observational vs RCT” arguments aren't about the data — they're about a vague question. Target trial emulation forces you to specify the randomised trial you wish you could run, then emulate it component by component. Here's the protocol I write before touching the data."
tags: ["target trial emulation", "causal inference", "study design"]
---

When an observational study and a randomised trial disagree, the reflex is to blame confounding. More often, the observational study simply answered a *different, fuzzier* question. Target trial emulation (TTE), formalised by Hernán and Robins, is a discipline for fixing that: before you analyse anything, you write the protocol of the **target trial** — the hypothetical randomised experiment that would answer your question — and then emulate each component in your real-world data.

It sounds almost too simple. Its power is that it makes your assumptions explicit and catches the classic biases *before* they happen.

## The seven components

A target trial protocol has seven parts. Write them as a table; emulate them one by one.

1. **Eligibility criteria** — who would enter the trial, using only information available *at baseline*.
2. **Treatment strategies** — the interventions compared, specified precisely enough that two people would classify the same patient identically.
3. **Assignment** — in the trial, randomisation; in the emulation, the baseline covariates you'll adjust for to mimic it (the "no unmeasured confounding at baseline" assumption, made visible).
4. **Outcome** — defined identically across arms.
5. **Follow-up** — when the clock starts (**time zero**) and when it stops.
6. **Causal contrast (estimand)** — the intention-to-treat analogue vs per-protocol; which one your question actually needs.
7. **Analysis plan** — the estimator that delivers that estimand under the stated assumptions.

## The one rule that prevents most disasters

Almost every notorious real-world-evidence failure — the "drug that prevents death" that merely marks survivors — comes from letting three things drift apart: eligibility, treatment assignment, and the start of follow-up.

If patients become **eligible** at one moment, get **classified** by treatment at another, and start **follow-up** at a third, you have created **immortal time**: a stretch where, by construction, treated patients had to survive long enough to get treated.

The fix is to define a single **time zero** at which eligibility is met, treatment is assigned, and follow-up begins — exactly as randomisation does in a trial. In drug studies this usually means a **new-user, active-comparator** design: enrol people *as they start* therapy A versus an active comparator B, not prevalent users (who are survivors and responders). The active comparator also balances confounding by indication.

## ITT vs per-protocol — pick the question, then the method

- The **intention-to-treat** analogue compares strategies as assigned at time zero and ignores later deviations. It's robust and simple, but in observational data "assignment" is just initiation, so it answers "the effect of *starting* A vs B".
- Many clinical questions are really **per-protocol**: "what if patients *sustained* the strategy?" That re-introduces selection over time — people who tolerate a drug keep taking it — which a naive per-protocol analysis can't handle. The principled fix is to clone, censor at deviation, and re-weight (**clone-censor-weight**), which I'll cover in a separate post.

## A worked example

In a recent study I emulated a target trial of augmentation strategies for **treatment-resistant depression** and the risk of suicide-related outcomes (*British Journal of Psychiatry*, 2026). Writing the protocol first did the heavy lifting:

- **Eligibility** and **time zero** were both set at the point of meeting the treatment-resistant definition and initiating the augmentation strategy — so no immortal time could creep in between "resistant" and "treated".
- **Treatment strategies** were active comparators — one augmentation approach versus another — avoiding the survivor bias of comparing against untreated prevalent patients.
- The **estimand** was specified up front, so it dictated the analysis rather than the other way round.

None of that is exotic. It's just the protocol you'd have written for a trial, applied honestly to data you didn't randomise.

## Why bother

Two reasons. First, **most biases are design problems, not analysis problems** — the target-trial table catches them on paper, for free. Second, it makes a study **legible**: reviewers, clinicians, and your future self can read the protocol and see exactly what was compared and under what assumptions. That legibility is, in the end, the whole point of building good real-world-evidence infrastructure.

---

*Want the slides, or a protocol template? [Get in touch](mailto:danielhttsai@gmail.com?subject=Target%20trial%20emulation) — and try the [Protocol Generator](/tools), which walks you through these components for several study designs.*
