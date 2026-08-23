// Registry of the reporting / protocol frameworks the Protocol Checker can
// audit against. HARPER is the default (a protocol template); TARGET is offered
// for studies that emulate a target trial. The checker's study-design scheme
// and planned-outputs check are framework-agnostic and shared across all.

import { TARGET_CHECKLIST, TARGET_CITATION, TARGET_URL } from "./target";
import { HARPER_CHECKLIST, HARPER_CITATION, HARPER_URL } from "./harper";
import type { TargetSection } from "./target";

export interface Framework {
  key: string;
  name: string;
  tagline: string;
  kind: string;
  checklist: TargetSection[];
  citation: string;
  url: string;
  /** How the rows this tool scores relate to the published guideline. The
   *  checker's denominator is its own row count, and the page used to call that
   *  count "this checklist's N TARGET items" — a false statement about a
   *  published guideline, carried verbatim into the Word and Markdown reports.
   *  Shown beside the score and exported with it. */
  rowsNote: string;
}

export const FRAMEWORKS: Record<string, Framework> = {
  harper: {
    key: "harper",
    name: "HARPER",
    tagline: "RWE protocol template (ISPE/ISPOR)",
    kind: "protocol template",
    checklist: HARPER_CHECKLIST,
    citation: HARPER_CITATION,
    url: HARPER_URL,
    rowsNote:
      "HARPER is a protocol template rather than a numbered checklist. The 23 rows scored here " +
      "follow the template's own item numbering.",
  },
  target: {
    key: "target",
    name: "TARGET",
    tagline: "for target-trial emulations",
    kind: "reporting guideline",
    checklist: TARGET_CHECKLIST,
    citation: TARGET_CITATION,
    url: TARGET_URL,
    rowsNote:
      "TARGET is published as a 21-item checklist. This page lists 31 rows because items 1 and 7 " +
      "are expanded into their sub-elements (1a-1c and 7a-7h) and each is judged separately, so the " +
      "count below is this tool's sub-division and not a fraction of the published statement.",
  },
};

export const DEFAULT_FRAMEWORK = "harper";
