/**
 * Rebuild the CV publication whitelist — run locally, on demand.
 *
 *   node scripts/cv-publications.mjs ["D:/Drive/CV/20260711 CV.docx"]
 *
 * The CV is the source of truth for WHICH papers appear on the site. It lives on
 * a local drive, so the weekly GitHub Actions sync cannot read it; instead this
 * script extracts every DOI from the CV into src/data/publications-cv.json, which
 * IS committed, and the sync only appends a paper whose DOI is on that list.
 *
 * Re-run this whenever the CV gains a paper, then commit the JSON. Without it the
 * site's list drifts toward ORCID, which carries things the CV never had (an SSRN
 * working paper reached the site that way on 2026-07-06).
 *
 * With no argument, the newest .docx in the CV folder is used. Node built-ins
 * only — the .docx is unzipped with zlib rather than adding a dependency.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const p = (rel) => join(ROOT, rel);
const CV_DIR = "D:/Drive/CV";

/** Read one file out of a zip (a .docx is a zip) via its central directory. */
function readZipEntry(buf, wanted) {
  // End of central directory: signature 0x06054b50, scanned from the tail.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip file (no end-of-central-directory record)");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("bad central directory entry");
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString("utf8");

    if (name === wanted) {
      // Local header: name/extra lengths differ from the central copy.
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 0 ? raw : inflateRawSync(raw);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in the .docx`);
}

function newestCv(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error(`no .docx found in ${dir}`);
  return join(dir, files[0].f);
}

const cvPath = process.argv[2] || newestCv(CV_DIR);
const xml = readZipEntry(readFileSync(cvPath), "word/document.xml").toString("utf8");

// Strip tags to plain text first, so a DOI split across runs by Word's spell-check
// or formatting boundaries still comes out in one piece.
const text = xml
  .replace(/<w:p[ >]/g, "\n<w:p ")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const dois = [...new Set(
  (text.match(/10\.\d{4,9}\/[^\s"'<>,;)\]]+/g) || []).map((d) => d.toLowerCase().replace(/[.,;]+$/, ""))
)].sort();

if (!dois.length) throw new Error("no DOIs found in the CV — refusing to write an empty whitelist");

const ssrn = dois.filter((d) => d.startsWith("10.2139/ssrn"));
const kept = dois.filter((d) => !d.startsWith("10.2139/ssrn"));

writeFileSync(p("src/data/publications-cv.json"), JSON.stringify({
  _comment: "DOIs listed in Daniel's CV — the source of truth for which papers appear on the site. Regenerate with: node scripts/cv-publications.mjs",
  source: cvPath.split(/[\\/]/).pop(),
  count: kept.length,
  dois: kept,
}, null, 2) + "\n");

console.log(`CV: ${cvPath}`);
console.log(`Wrote src/data/publications-cv.json — ${kept.length} DOIs${ssrn.length ? ` (skipped ${ssrn.length} SSRN)` : ""}.`);

// Report drift both ways so a stale CV extract is obvious.
const site = JSON.parse(readFileSync(p("src/data/publications.json"), "utf8")).map((e) => e.doi.toLowerCase());
const missing = kept.filter((d) => !site.includes(d));
const extra = site.filter((d) => !kept.includes(d));
if (missing.length) console.log(`  In the CV but not yet on the site (${missing.length}): ${missing.join(", ")}`);
if (extra.length) console.log(`  On the site but not in the CV (${extra.length}): ${extra.join(", ")}`);
if (!missing.length && !extra.length) console.log("  Site list matches the CV exactly.");
