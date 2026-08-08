#!/usr/bin/env python3
"""
Simulations behind the propensity-score-calibration section of
src/pages/tools/active-comparator-new-user.astro (protocol Section 7b).

Every number the generated protocol attributes to "our own simulation" is
produced here. Run it to reproduce them:

    pip install numpy statsmodels
    python scripts/psc-simulations.py

Method under test — propensity score calibration:
  Sturmer T, Schneeweiss S, Avorn J, Glynn RJ. Adjusting effect estimates for
  unmeasured confounding with validation data using propensity score
  calibration. Am J Epidemiol 2005;162(3):279-289. doi:10.1093/aje/kwi192
  Sturmer T, Schneeweiss S, Rothman KJ, Avorn J, Glynn RJ. Performance of
  propensity score calibration - a simulation study. Am J Epidemiol
  2007;165(10):1110-1118. doi:10.1093/aje/kwm074
  Lunt M, Glynn RJ, Rothman KJ, Avorn J, Sturmer T. Propensity score
  calibration in the absence of surrogacy. Am J Epidemiol
  2012;175(12):1294-1302. doi:10.1093/aje/kwr463
  Wan F. A cautionary note on using propensity score calibration ... when the
  surrogacy assumption is absent. Am J Epidemiol 2024;193(2):360-369.
  doi:10.1093/aje/kwad189

Three experiments:
  A. Does the correction algebra recover the treatment effect when surrogacy
     holds, and is the first-order delta-method interval trustworthy?
  B. Wan's proportionality condition: sweep the angle between the outcome-model
     and treatment-model coefficient vectors and watch calibration go from
     removing the bias to adding more than it removes.
  C. Lunt's graded surrogacy measure S (2012, Table 2 footnote g) against that
     same sweep, compared with the p-value the page used to rely on.

These are unpublished in-house simulations, not the published ones. They are
seeded, so the printed figures are reproducible run to run.
"""

import numpy as np
import statsmodels.api as sm
import statistics as st

SEED_A, SEED_B, SEED_C = 7, 23, 31


def expit(x):
    return 1.0 / (1.0 + np.exp(-x))


def ols(y, X):
    return sm.OLS(y, sm.add_constant(X)).fit()


def logit(y, X):
    return sm.Logit(y, sm.add_constant(X)).fit(disp=0)


# ---------------------------------------------------------------- experiment A
# Outcome generated FROM the gold-standard-PS model, so surrogacy holds by
# construction and the correction should recover the treatment coefficient.
B_T, B_PS = np.log(1.4), 2.0


def gen_a(n, rng):
    C = rng.normal(size=(n, 3))
    U = 0.5 * C[:, [0]] + rng.normal(size=(n, 2))
    lp = 0.7 * C[:, 0] - 0.5 * C[:, 1] + 0.4 * C[:, 2] + 0.9 * U[:, 0] - 0.6 * U[:, 1]
    T = (rng.random(n) < expit(lp)).astype(float)
    return C, U, T


def rep_a(rng, violate=0.0, n_main=200_000, n_val=5_000):
    C, U, T = gen_a(n_val, rng)
    ep = logit(T, C)
    gs = logit(T, np.hstack([C, U]))
    ps_ep = ep.predict(sm.add_constant(C))
    ps_gs = gs.predict(sm.add_constant(np.hstack([C, U])))
    cal = ols(ps_gs, np.column_stack([ps_ep, T]))
    a0, a1, a2 = cal.params
    a1se, a2se = cal.bse[1], cal.bse[2]

    Cm, Um, Tm = gen_a(n_main, rng)
    ps_gs_m = gs.predict(sm.add_constant(np.hstack([Cm, Um])))
    Y = 1.0 + B_T * Tm + B_PS * ps_gs_m + violate * Cm[:, 0] + rng.normal(size=n_main)
    ps_ep_m = logit(Tm, Cm).predict(sm.add_constant(Cm))
    naive = ols(Y, np.column_stack([Tm, ps_ep_m]))
    bT, bP = naive.params[1], naive.params[2]
    bTse, bPse = naive.bse[1], naive.bse[2]

    k = a2 / a1
    bC = bT - k * bP
    var_k = a2se**2 / a1**2 + a2**2 * a1se**2 / a1**4
    se = np.sqrt(bTse**2 + k**2 * bPse**2 + bP**2 * var_k)
    return bT, bC, se


def experiment_a():
    print("=" * 78)
    print("A. Correction algebra, and the delta-method interval")
    print("   Outcome generated from the gold-standard-PS model; surrogacy holds.")
    print("   True treatment log-effect = %+.4f" % B_T)
    rng = np.random.default_rng(SEED_A)
    reps = [rep_a(rng) for _ in range(40)]
    bt = np.array([r[0] for r in reps])
    bc = np.array([r[1] for r in reps])
    se = np.array([r[2] for r in reps])
    print("   40 replicates, surrogacy HOLDS:")
    print("     naive       bias %+.4f" % (bt.mean() - B_T))
    print("     calibrated  bias %+.4f      <- the correction works" % (bc.mean() - B_T))
    print("     mean delta-method SE %.4f vs empirical SD %.4f" % (se.mean(), bc.std(ddof=1)))
    print("     -> the closed-form interval understates the width; the page shows none.")
    reps2 = [rep_a(rng, violate=0.6) for _ in range(20)]
    bt2 = np.array([r[0] for r in reps2])
    bc2 = np.array([r[1] for r in reps2])
    print("   20 replicates, surrogacy VIOLATED (a claims covariate acts on Y directly):")
    print("     naive       bias %+.4f" % (bt2.mean() - B_T))
    print("     calibrated  bias %+.4f      <- worse than doing nothing" % (bc2.mean() - B_T))


# ------------------------------------------------------------ experiments B, C
# Wan (2024): PSC is unbiased only when the covariates' effects on the outcome
# are proportional to their effects on treatment. Sweep the angle between the
# two coefficient vectors; sin(angle) = 0 is exact proportionality.
BETA = np.array([0.7, -0.5, 0.4, 0.9, -0.6])
BETA = BETA / np.linalg.norm(BETA)
ORTH = np.array([0.3, 0.9, 0.2, -0.4, 0.5])
ORTH = ORTH - (ORTH @ BETA) * BETA
ORTH = ORTH / np.linalg.norm(ORTH)
THETA = np.log(1.4)


def gen_bc(n, rng, gam, link, intercept=-1.0):
    X = rng.normal(size=(n, 5))
    X[:, 3:] += 0.5 * X[:, [0]]
    T = (rng.random(n) < expit(2.0 * (X @ BETA))).astype(float)
    lp = intercept + THETA * T + X @ gam
    Y = (rng.random(n) < expit(lp)).astype(float) if link == "logit" else lp + rng.normal(size=n)
    return X, T, Y


def gamma_at(w):
    g = 1.2 * ((1 - w) * BETA + w * ORTH)
    g = 1.2 * g / np.linalg.norm(g)
    return g, np.linalg.norm(g - (g @ BETA) * BETA) / np.linalg.norm(g)


def rep_bc(rng, gam, link, n_main=300_000, n_val=8_000):
    Xv, Tv, Yv = gen_bc(n_val, rng, gam, link)
    ep = logit(Tv, Xv[:, :3])
    gs = logit(Tv, Xv)
    pe = ep.predict(sm.add_constant(Xv[:, :3]))
    pg = gs.predict(sm.add_constant(Xv))
    a0, a1, a2 = ols(pg, np.column_stack([pe, Tv])).params

    M = logit if link == "logit" else ols
    # Lunt 2012 Table 2 footnote (g): of the outcome information carried by both
    # propensity scores, the share carried by the gold-standard score alone.
    # The factor 2 in each likelihood-ratio statistic cancels in the ratio.
    l0 = M(Yv, Tv[:, None]).llf
    l1 = M(Yv, np.column_stack([Tv, pg])).llf
    l2 = M(Yv, np.column_stack([Tv, pg, pe])).llf
    S = 100.0 * (l1 - l0) / (l2 - l0) if (l2 - l0) != 0 else float("nan")
    p = M(Yv, np.column_stack([Tv, pg, pe])).pvalues[3]

    Xm, Tm, Ym = gen_bc(n_main, rng, gam, link)
    pm = logit(Tm, Xm[:, :3]).predict(sm.add_constant(Xm[:, :3]))
    nv = M(Ym, np.column_stack([Tm, pm]))
    bT, bP = nv.params[1], nv.params[2]
    return S, p, bT - THETA, (bT - (a2 / a1) * bP) - THETA


def experiment_b():
    print()
    print("=" * 78)
    print("B. Wan's proportionality condition (angle sweep)")
    print("   sin(angle) = 0 means the outcome and treatment coefficient vectors")
    print("   are proportional, which is exactly when PSC is unbiased.")
    rng = np.random.default_rng(SEED_B)
    for link in ("identity", "logit"):
        print("   outcome model: %s (%s)"
              % (link, "collapsible" if link == "identity" else "NON-collapsible"))
        print("     sin(angle)   naive bias   PSC bias    surrogacy p")
        for w in (0.0, 0.25, 0.5, 0.75, 1.0):
            gam, s = gamma_at(w)
            S, p, bn, bc = rep_bc(rng, gam, link)
            print("       %.2f        %+.4f      %+.4f      %.3f" % (s, bn, bc, p))


def experiment_c():
    print()
    print("=" * 78)
    print("C. Lunt's S against the same sweep, 5 replicates a point")
    print("   S is the graded measure the page uses; the p-value is not.")
    rng = np.random.default_rng(SEED_C)
    print("     sin(angle)   Lunt S%             naive bias        PSC bias         PSC better")
    for w in (0.0, 0.32, 0.5, 0.71):
        gam, s = gamma_at(w)
        R = [rep_bc(rng, gam, "logit") for _ in range(5)]
        S = [r[0] for r in R]
        bn = [r[2] for r in R]
        bc = [r[3] for r in R]
        better = sum(1 for a, b in zip(bn, bc) if abs(b) < abs(a))
        print("       %.2f      %5.1f (%5.1f..%5.1f)  %+.3f (%+.3f..%+.3f)  %+.3f   %d/5"
              % (s, st.median(S), min(S), max(S), st.median(bn), min(bn), max(bn),
                 st.median(bc), better))
    print()
    print("   Reading: PSC helps while S is high and hurts once S falls, and the")
    print("   turn happens well above 50%. The p-value rejects far earlier than")
    print("   that, which is why the page judges on S and treats p as secondary.")


if __name__ == "__main__":
    experiment_a()
    experiment_b()
    experiment_c()
