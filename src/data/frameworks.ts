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
  },
  target: {
    key: "target",
    name: "TARGET",
    tagline: "for target-trial emulations",
    kind: "reporting guideline",
    checklist: TARGET_CHECKLIST,
    citation: TARGET_CITATION,
    url: TARGET_URL,
  },
};

export const DEFAULT_FRAMEWORK = "harper";
