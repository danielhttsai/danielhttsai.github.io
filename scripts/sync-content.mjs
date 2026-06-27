/**
 * Weekly content sync — run by .github/workflows/weekly-sync.yml (and locally).
 *
 * Refreshes three things that originate outside this repo, then leaves the
 * working tree dirty so the workflow can commit + redeploy only if something
 * actually changed:
 *
 *   A. Publications  — pulled from ORCID. Existing entries keep their
 *      CV-curated citation verbatim; only genuinely new papers are appended
 *      (auto-formatted in CV style). DOIs in publications-exclude.json are
 *      never added. Open-access links are refreshed from Unpaywall.
 *   B. Protocol tools — the 4 builder templates + databases.json are fetched
 *      from the public PHD-Center/AsPEN repo and the same "open-access"
 *      transform is re-applied. A safety check skips any file that still
 *      contains auth code, so a broken upstream change can never go live.
 *   C. Network logos — copied from PHD-Center/AsPEN.
 *
 * Every section is wrapped in try/catch and the script always exits 0: a
 * failure in one section logs a warning but never blocks the others or the
 * site. Uses only Node built-ins + global fetch (Node 18+).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Repo root (decoded — handles spaces in the path on Windows).
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ORCID = "0000-0003-2841-0338";
const EMAIL = "danielhttsai@gmail.com";
const ASPEN_RAW = "https://raw.githubusercontent.com/PHD-Center/AsPEN/main";

const p = (rel) => ROOT + rel;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const r = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
}
async function fetchJson(url) { return JSON.parse(await fetchText(url)); }
async function fetchBuffer(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

// ───────────────────────── A. Publications ─────────────────────────
function fmtAuthors(authors) {
  if (!authors || !authors.length) return "";
  return authors
    .map((a) => {
      const fam = (a.family || "").trim();
      const giv = (a.given || "").split(/[\s.\-]+/).filter(Boolean).map((s) => s[0].toUpperCase()).join("");
      if (!fam) return (a.name || "").trim();
      return (fam + (giv ? " " + giv : "")).trim();
    })
    .filter(Boolean)
    .join(", ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function crossrefCitation(doi) {
  const m = (await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${EMAIL}`)).message || {};
  const authors = fmtAuthors(m.author);
  const title = m.title?.[0] ? m.title[0].replace(/\s+/g, " ").trim() : "";
  // Full journal name (NOT the abbreviated short-container-title) to match the CV.
  const journal = m["container-title"]?.[0] || m["short-container-title"]?.[0] || "";
  const dp = m.issued?.["date-parts"]?.[0] || m.published?.["date-parts"]?.[0] || [];
  const year = dp[0] ? String(dp[0]) : "";
  const mon = dp[1] ? MONTHS[dp[1] - 1] : "";
  const day = dp[2] || "";
  const vol = m.volume || "";
  const iss = m.issue || "";
  const page = m.page || (m["article-number"] ? "e" + m["article-number"] : "");
  let date = year;
  if (mon) date += " " + mon;
  if (day && !vol) date += " " + day;
  if (vol) date += ";" + vol;
  if (iss) date += "(" + iss + ")";
  if (page) date += ":" + page;
  let citation = [authors ? authors + "." : "", title ? title + "." : "", journal ? journal + "." : "", date ? date + "." : ""]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  // Tidy known CrossRef quirks to match the CV's house style.
  citation = citation
    .replace(/;Volume\s+/g, ";")                            // Dove Press: "Volume 18" → "18"
    .replace(/\bThe British Journal of Psychiatry\b/g, "British Journal of Psychiatry");
  return { citation, year };
}

async function unpaywall(doi) {
  try {
    const j = await fetchJson(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${EMAIL}`);
    const loc = j.best_oa_location || null;
    return { isOA: Boolean(j.is_oa), oaUrl: loc ? (loc.url_for_pdf || loc.url || loc.url_for_landing_page || "") : "" };
  } catch { return { isOA: false, oaUrl: "" }; }
}

async function syncPublications() {
  const existing = JSON.parse(readFileSync(p("src/data/publications.json"), "utf8"));
  const exclude = new Set(JSON.parse(readFileSync(p("src/data/publications-exclude.json"), "utf8")).map((d) => d.toLowerCase()));
  const byDoi = new Map(existing.map((e) => [e.doi.toLowerCase(), e]));

  // All DOIs ORCID knows about.
  const works = (await fetchJson(`https://pub.orcid.org/v3.0/${ORCID}/works`)).group || [];
  const orcidDois = [];
  for (const g of works) {
    const ids = g["external-ids"]?.["external-id"] || [];
    for (const x of ids) if ((x["external-id-type"] || "").toLowerCase() === "doi") orcidDois.push((x["external-id-value"] || "").trim().toLowerCase());
  }

  // Refresh OA on existing entries (citation is preserved verbatim).
  for (const e of existing) {
    const oa = await unpaywall(e.doi);
    e.isOA = oa.isOA; e.oaUrl = oa.oaUrl;
    await sleep(150);
  }

  // Append new papers (in ORCID, not already listed, not excluded, not a dataset).
  let added = 0;
  for (const doi of orcidDois) {
    if (byDoi.has(doi) || exclude.has(doi) || /figshare|\/m9\./.test(doi)) continue;
    try {
      const { citation, year } = await crossrefCitation(doi);
      if (!citation || !year) { console.warn(`  skip new ${doi}: no citation/year`); continue; }
      const oa = await unpaywall(doi);
      const entry = { year, doi, citation, isOA: oa.isOA, oaUrl: oa.oaUrl };
      existing.push(entry);
      byDoi.set(doi, entry);
      added++;
      console.log(`  + new publication ${year}: ${doi}`);
      await sleep(200);
    } catch (e) { console.warn(`  skip new ${doi}: ${e.message}`); }
  }

  // Newest year first; preserve insertion order within a year (CV order).
  existing.sort((a, b) => (b.year || "").localeCompare(a.year || ""));
  writeFileSync(p("src/data/publications.json"), JSON.stringify(existing, null, 2) + "\n", "utf8");
  console.log(`Publications: ${existing.length} total, ${added} new.`);
}

// ───────────────────── B. Protocol tool templates ─────────────────────
// Mirror of the original openize transform: strips auth, retargets routes,
// fixes import depth (members/templates → tools is one level shallower).
function openize(src) {
  let s = src;
  s = s.replaceAll('from "../../../', 'from "../../');
  s = s.replace(/^\s*import \{ WORKER_URL \} from "\.\.\/\.\.\/data\/site-config";\s*\n/m, "");
  s = s.replaceAll("${base}/members/templates/", "${base}/tools/");
  s = s.replaceAll("${base}/members/", "${base}/tools/");
  s = s.replace(/<div data-state="loading"[\s\S]*?<div data-state="ready" class="hidden (grid[^"]*)">/, '<div data-state="ready" class="$1">');
  s = s.replace(/\s*<button type="button" data-action="send-aspen"[\s\S]*?<\/button>/, "");
  s = s.replace(/\s*<!-- Send-to-AsPEN modal[\s\S]*?<\/div>\s*\n(\s*<\/section>)/, "\n$1");
  s = s.replace(/define:vars=\{\{ WORKER_URL, /, "define:vars={{ ");
  s = s.replace(/\s*if \(!WORKER_URL\) return setState\("signed-out"\);/, "");
  s = s.replace(/\s*\/\/ ── Send-to-AsPEN modal[\s\S]*?\.catch\(\(\) => setState\("signed-out"\)\);/, '\n\n      setState("ready");');
  return s;
}

async function syncTemplates() {
  const builders = ["active-comparator-new-user", "case-crossover", "descriptive-analysis", "self-controlled-case-series"];
  for (const name of builders) {
    try {
      const raw = await fetchText(`${ASPEN_RAW}/src/pages/members/templates/${name}.astro`);
      const out = openize(raw);
      // Safety gate: never write a template that still carries auth or the
      // submit flow, or that lost its activation hook.
      if (/WORKER_URL/.test(out) || /Send to AsPEN/.test(out) || !/setState\("ready"\)/.test(out)) {
        console.warn(`  SKIP ${name}: transform left auth/send code or lost setState — keeping existing.`);
        continue;
      }
      writeFileSync(p(`src/pages/tools/${name}.astro`), out, "utf8");
      console.log(`  synced template ${name}`);
    } catch (e) { console.warn(`  template ${name} failed: ${e.message}`); }
  }
  try {
    const db = await fetchText(`${ASPEN_RAW}/src/data/databases.json`);
    JSON.parse(db); // validate
    writeFileSync(p("src/data/databases.json"), db, "utf8");
    console.log("  synced databases.json");
  } catch (e) { console.warn(`  databases.json failed: ${e.message}`); }
}

// ───────────────────────── C. Network logos ─────────────────────────
async function syncLogos() {
  const map = [
    ["images/AsPenLogo.png", "public/images/networks/aspen.png"],
    ["images/websites/phdc-wide.png", "public/images/networks/phdc.png"],
    ["images/websites/darwin-eu.png", "public/images/networks/darwin-eu.png"],
  ];
  for (const [from, to] of map) {
    try {
      const buf = await fetchBuffer(`${ASPEN_RAW}/public/${from}`);
      if (buf.length < 200) throw new Error("suspiciously small");
      writeFileSync(p(to), buf);
      console.log(`  synced logo ${to}`);
    } catch (e) { console.warn(`  logo ${to} failed: ${e.message}`); }
  }
}

// ───────────────────────────── run ─────────────────────────────
console.log("== Weekly content sync ==");
try { await syncPublications(); } catch (e) { console.warn("Publications section failed:", e.message); }
try { await syncTemplates(); } catch (e) { console.warn("Templates section failed:", e.message); }
try { await syncLogos(); } catch (e) { console.warn("Logos section failed:", e.message); }
console.log("Done.");
