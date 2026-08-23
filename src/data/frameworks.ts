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
      "HARPER is a protocol template rather than a scored checklist, so the 23 rows below are this " +
      "tool's own enumeration of it: one row per numbered element of the template, taken at the level " +
      "the template defines an element (7.3.1, 7.4.2, and so on) with no heading rows counted on top " +
      "of them. The count is this tool's, not a figure the guideline publishes.",
  },
  target: {
    key: "target",
    name: "TARGET",
    tagline: "for target-trial emulations",
    kind: "reporting guideline",
    checklist: TARGET_CHECKLIST,
    citation: TARGET_CITATION,
    url: TARGET_URL,
    // The arithmetic here has to be exact, because this note exists to replace a
    // sentence that got it wrong. 21 published items; item 1 is REPLACED by its
    // three sub-elements (there is no bare "1" row) and item 7 is KEPT beside
    // its eight, which is 21 - 1 + 3 + 8 = 31. That retained item 7 is the only
    // asymmetry, and it is exactly the row the checker marks "Not scored".
    rowsNote:
      "TARGET is published as a 21-item checklist. This page lists 31 rows: item 1 is replaced by its " +
      "three sub-elements (1a-1c), and item 7 is kept alongside its eight (7a-7h). Because item 7 is the " +
      "heading for 7a-7h, it is marked “Not scored” and left out of the score whenever all eight were " +
      "judged, so the same content is not counted twice. The count below is this tool's sub-division, " +
      "not a fraction of the published statement.",
  },
};

export const DEFAULT_FRAMEWORK = "harper";
