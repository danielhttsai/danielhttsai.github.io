// Vocabulary and helpers behind the publication filters, the "do it yourself"
// links on each paper, and the research map. The per-paper tags live in
// publication-tags.json (keyed by DOI, safe from the weekly sync); this file
// only says what each id means and where it points.
import tagFile from "./publication-tags.json";
import pubs from "./publications.json";

export interface L { en: string; zh: string }
export interface PaperTags { design: string[]; data: string[]; countries: string[]; links: string[]; source?: string }

const TAGS = tagFile.tags as Record<string, PaperTags>;
const EMPTY: PaperTags = { design: [], data: [], countries: [], links: [] };
export const tagsOf = (doi: string): PaperTags => TAGS[(doi || "").toLowerCase()] ?? EMPTY;

// ── Study designs ────────────────────────────────────────────────────────
// Order = order in the filter. Method names Taiwanese researchers say in
// English stay in English in the Chinese label.
export const DESIGNS: Record<string, L> = {
  tte: { en: "Target trial emulation", zh: "Target trial emulation" },
  acnu: { en: "Active-comparator new-user", zh: "Active-comparator new-user" },
  ccw: { en: "Clone-censor-weight", zh: "Clone-censor-weight" },
  cohort: { en: "Cohort study", zh: "世代研究" },
  cctc: { en: "Case-case-time-control", zh: "Case-case-time-control" },
  cco: { en: "Case-crossover", zh: "病例交叉設計" },
  ncc: { en: "Nested case-control", zh: "巢式病例對照" },
  descriptive: { en: "Descriptive / drug utilisation", zh: "描述性／藥物使用研究" },
  review: { en: "Review", zh: "文獻回顧" },
  resource: { en: "Data resource profile", zh: "資料庫介紹" },
  prediction: { en: "Prediction model", zh: "預測模型" },
  commentary: { en: "Letter / reply", zh: "評論與回覆" },
};
// "Cohort study" is tagged on every cohort-based paper so the filter finds them
// all, but as a chip it only adds noise next to a more specific design.
export const designChips = (t: PaperTags) => {
  const specific = t.design.filter((d) => d !== "cohort");
  return specific.length ? specific : t.design;
};

// ── Databases ────────────────────────────────────────────────────────────
export interface Db { short: string; name: L; country: string; type: L }
const CLAIMS = { en: "Claims", zh: "健保／保險申報資料" };
const EHR = { en: "Electronic health records", zh: "電子病歷" };
const BIO = { en: "Biobank", zh: "生物資料庫" };
export const DATABASES: Record<string, Db> = {
  nhird: { short: "NHIRD", name: { en: "National Health Insurance Research Database", zh: "全民健康保險研究資料庫" }, country: "TW", type: CLAIMS },
  cgrd: { short: "CGRD", name: { en: "Chang Gung Research Database", zh: "長庚研究資料庫" }, country: "TW", type: EHR },
  cmuh: { short: "CMUH", name: { en: "China Medical University Hospital records", zh: "中國醫藥大學附設醫院病歷資料" }, country: "TW", type: EHR },
  tidid: { short: "TIDID", name: { en: "Taiwan Illicit Drug Issue Database", zh: "Taiwan Illicit Drug Issue Database" }, country: "TW", type: { en: "Registry", zh: "登錄資料" } },
  twb: { short: "TWB", name: { en: "Taiwan Biobank", zh: "臺灣人體生物資料庫" }, country: "TW", type: BIO },
  "nhis-nhid": { short: "NHIS-NHID", name: { en: "National Health Insurance Service – National Health Insurance Database", zh: "韓國國民健康保險公團資料庫" }, country: "KR", type: CLAIMS },
  cdars: { short: "HA CDARS", name: { en: "Hospital Authority electronic health records (CDARS)", zh: "香港醫院管理局電子病歷（CDARS）" }, country: "HK", type: EHR },
  nzmidp: { short: "NZMIDP", name: { en: "Medicines Intelligence Data Platform", zh: "紐西蘭 Medicines Intelligence 資料平台" }, country: "NZ", type: { en: "Linked national data", zh: "全國串聯資料" } },
  pbs: { short: "PBS 10%", name: { en: "Pharmaceutical Benefits Scheme 10% sample", zh: "澳洲藥品給付計畫 10% 抽樣檔" }, country: "AU", type: CLAIMS },
  vlhd: { short: "VLHD", name: { en: "Victorian Linked Health Data", zh: "維多利亞州串聯健康資料" }, country: "AU", type: CLAIMS },
  medicaid: { short: "Medicaid", name: { en: "Medicaid", zh: "美國 Medicaid" }, country: "US", type: CLAIMS },
  medicare: { short: "Medicare 20%", name: { en: "Medicare 20% sample", zh: "美國 Medicare 20% 抽樣檔" }, country: "US", type: CLAIMS },
  finreg: { short: "FinReg", name: { en: "Finnish healthcare registers", zh: "芬蘭全國健康登錄資料" }, country: "FI", type: CLAIMS },
  phs: { short: "PHS", name: { en: "Public Health Scotland", zh: "蘇格蘭公共衛生署資料" }, country: "GB", type: EHR },
  pharmo: { short: "PHARMO", name: { en: "PHARMO Database Network", zh: "荷蘭 PHARMO 資料庫網絡" }, country: "NL", type: EHR },
  cprd: { short: "CPRD", name: { en: "Clinical Practice Research Datalink", zh: "英國 CPRD 基層醫療資料庫" }, country: "GB", type: EHR },
  thin: { short: "THIN", name: { en: "The Health Improvement Network", zh: "英國 THIN 基層醫療資料庫" }, country: "GB", type: EHR },
  ukb: { short: "UK Biobank", name: { en: "UK Biobank", zh: "英國人體生物資料庫" }, country: "GB", type: BIO },
  trinetx: { short: "TriNetX", name: { en: "TriNetX federated network", zh: "TriNetX 跨機構電子病歷網絡" }, country: "GLOBAL", type: EHR },
  "iqvia-midas": { short: "IQVIA MIDAS", name: { en: "IQVIA MIDAS pharmaceutical sales data", zh: "IQVIA MIDAS 藥品銷售資料" }, country: "MIDAS65", type: { en: "Sales data", zh: "銷售資料" } },
};

// ── Countries and regions ────────────────────────────────────────────────
// id = ISO 3166-1 numeric, the key world-atlas uses. Hong Kong has no polygon
// at 1:110m, so it is drawn as a marker only.
export interface Country { id?: string; name: L; at?: [number, number] }
export const COUNTRIES: Record<string, Country> = {
  TW: { id: "158", name: { en: "Taiwan", zh: "台灣" }, at: [121, 23.7] },
  KR: { id: "410", name: { en: "South Korea", zh: "南韓" }, at: [127.8, 36.3] },
  HK: { name: { en: "Hong Kong", zh: "香港" }, at: [114.17, 22.32] },
  NZ: { id: "554", name: { en: "New Zealand", zh: "紐西蘭" }, at: [172.5, -42] },
  AU: { id: "036", name: { en: "Australia", zh: "澳洲" }, at: [134, -25] },
  US: { id: "840", name: { en: "United States", zh: "美國" }, at: [-98, 39] },
  GB: { id: "826", name: { en: "United Kingdom", zh: "英國" }, at: [-2, 54] },
  FI: { id: "246", name: { en: "Finland", zh: "芬蘭" }, at: [26, 62.5] },
  NL: { id: "528", name: { en: "Netherlands", zh: "荷蘭" }, at: [5.3, 52.2] },
  DZ: { id: "012", name: { en: "Algeria", zh: "阿爾及利亞" } },
  AR: { id: "032", name: { en: "Argentina", zh: "阿根廷" } },
  AT: { id: "040", name: { en: "Austria", zh: "奧地利" } },
  BY: { id: "112", name: { en: "Belarus", zh: "白俄羅斯" } },
  BE: { id: "056", name: { en: "Belgium", zh: "比利時" } },
  BA: { id: "070", name: { en: "Bosnia and Herzegovina", zh: "波士尼亞與赫塞哥維納" } },
  BR: { id: "076", name: { en: "Brazil", zh: "巴西" } },
  BG: { id: "100", name: { en: "Bulgaria", zh: "保加利亞" } },
  CA: { id: "124", name: { en: "Canada", zh: "加拿大" } },
  CL: { id: "152", name: { en: "Chile", zh: "智利" } },
  CN: { id: "156", name: { en: "China", zh: "中國" } },
  CO: { id: "170", name: { en: "Colombia", zh: "哥倫比亞" } },
  HR: { id: "191", name: { en: "Croatia", zh: "克羅埃西亞" } },
  CZ: { id: "203", name: { en: "Czech Republic", zh: "捷克" } },
  EC: { id: "218", name: { en: "Ecuador", zh: "厄瓜多" } },
  EG: { id: "818", name: { en: "Egypt", zh: "埃及" } },
  EE: { id: "233", name: { en: "Estonia", zh: "愛沙尼亞" } },
  FR: { id: "250", name: { en: "France", zh: "法國" } },
  DE: { id: "276", name: { en: "Germany", zh: "德國" } },
  GR: { id: "300", name: { en: "Greece", zh: "希臘" } },
  HU: { id: "348", name: { en: "Hungary", zh: "匈牙利" } },
  IN: { id: "356", name: { en: "India", zh: "印度" } },
  IE: { id: "372", name: { en: "Ireland", zh: "愛爾蘭" } },
  IT: { id: "380", name: { en: "Italy", zh: "義大利" } },
  JP: { id: "392", name: { en: "Japan", zh: "日本" } },
  JO: { id: "400", name: { en: "Jordan", zh: "約旦" } },
  KZ: { id: "398", name: { en: "Kazakhstan", zh: "哈薩克" } },
  KW: { id: "414", name: { en: "Kuwait", zh: "科威特" } },
  LV: { id: "428", name: { en: "Latvia", zh: "拉脫維亞" } },
  LB: { id: "422", name: { en: "Lebanon", zh: "黎巴嫩" } },
  LT: { id: "440", name: { en: "Lithuania", zh: "立陶宛" } },
  LU: { id: "442", name: { en: "Luxembourg", zh: "盧森堡" } },
  MX: { id: "484", name: { en: "Mexico", zh: "墨西哥" } },
  MA: { id: "504", name: { en: "Morocco", zh: "摩洛哥" } },
  NO: { id: "578", name: { en: "Norway", zh: "挪威" } },
  PK: { id: "586", name: { en: "Pakistan", zh: "巴基斯坦" } },
  PE: { id: "604", name: { en: "Peru", zh: "秘魯" } },
  PH: { id: "608", name: { en: "Philippines", zh: "菲律賓" } },
  PL: { id: "616", name: { en: "Poland", zh: "波蘭" } },
  PT: { id: "620", name: { en: "Portugal", zh: "葡萄牙" } },
  PR: { id: "630", name: { en: "Puerto Rico", zh: "波多黎各" } },
  RO: { id: "642", name: { en: "Romania", zh: "羅馬尼亞" } },
  RU: { id: "643", name: { en: "Russia", zh: "俄羅斯" } },
  SA: { id: "682", name: { en: "Saudi Arabia", zh: "沙烏地阿拉伯" } },
  RS: { id: "688", name: { en: "Serbia", zh: "塞爾維亞" } },
  SK: { id: "703", name: { en: "Slovakia", zh: "斯洛伐克" } },
  SI: { id: "705", name: { en: "Slovenia", zh: "斯洛維尼亞" } },
  ZA: { id: "710", name: { en: "South Africa", zh: "南非" } },
  ES: { id: "724", name: { en: "Spain", zh: "西班牙" } },
  SE: { id: "752", name: { en: "Sweden", zh: "瑞典" } },
  CH: { id: "756", name: { en: "Switzerland", zh: "瑞士" } },
  TH: { id: "764", name: { en: "Thailand", zh: "泰國" } },
  TN: { id: "788", name: { en: "Tunisia", zh: "突尼西亞" } },
  TR: { id: "792", name: { en: "Türkiye", zh: "土耳其" } },
  AE: { id: "784", name: { en: "United Arab Emirates", zh: "阿拉伯聯合大公國" } },
  UY: { id: "858", name: { en: "Uruguay", zh: "烏拉圭" } },
  VE: { id: "862", name: { en: "Venezuela", zh: "委內瑞拉" } },
};
// The 65 countries and regions in the gabapentinoid consumption study, taken
// from the paper's own source data file (Table 1 sheet).
export const MIDAS65 = [
  "DZ", "AR", "AU", "AT", "BY", "BE", "BA", "BR", "BG", "CA", "CL", "CN", "CO", "HR", "CZ", "EC", "EG", "EE", "FI", "FR", "DE", "GR",
  "HU", "IN", "IE", "IT", "JP", "JO", "KZ", "KW", "LV", "LB", "LT", "LU", "MX", "MA", "NL", "NZ", "NO", "PK", "PE", "PH", "PL", "PT",
  "PR", "RO", "RU", "SA", "RS", "SK", "SI", "ZA", "KR", "ES", "SE", "CH", "TW", "TH", "TN", "TR", "AE", "GB", "US", "UY", "VE",
];
// Countries that have a person-level database on the map, in display order.
export const CORE = ["TW", "KR", "HK", "NZ", "AU", "US", "GB", "FI", "NL"];
export const NETWORK: L = { en: "Multinational network or sales data", zh: "跨國網絡或銷售資料" };
// What a paper's country tags mean for the country filter: the pseudo codes
// collapse into one "multinational" bucket.
export const filterCountries = (t: PaperTags) => t.countries.map((c) => (c === "GLOBAL" || c === "MIDAS65" ? "MULTI" : c));
export const countryLabel = (c: string): L => (c === "MULTI" ? NETWORK : COUNTRIES[c].name);

// ── "Do it yourself" links ───────────────────────────────────────────────
// Each id is something on this site that lets a reader do what the paper did.
// A paper lists the ids that really fit it; nothing is derived automatically.
export interface ToolLink { href: string; label: L; external?: boolean }
const TOOLBOX = "/tools/phdc-rwe-tool?m=";
export const LINKS: Record<string, ToolLink> = {
  "builder-acnu": { href: "/tools/active-comparator-new-user", label: { en: "Draft this design: ACNU protocol", zh: "照這個設計寫計畫書：ACNU" } },
  "builder-ccw": { href: "/tools/clone-censor-weight", label: { en: "Draft this design: clone-censor-weight protocol", zh: "照這個設計寫計畫書：clone-censor-weight" } },
  "builder-cco": { href: "/tools/case-crossover", label: { en: "Draft this design: case-crossover / CCTC protocol", zh: "照這個設計寫計畫書：case-crossover／CCTC" } },
  "builder-cc": { href: "/tools/case-control", label: { en: "Draft this design: case-control protocol", zh: "照這個設計寫計畫書：病例對照" } },
  "builder-descriptive": { href: "/tools/descriptive-analysis", label: { en: "Draft this design: descriptive protocol", zh: "照這個設計寫計畫書：描述性分析" } },
  "toolbox-acnu": { href: TOOLBOX + "acnu", label: { en: "Try the method: ACNU in the RWE Toolbox", zh: "動手試：RWE 工具箱的 ACNU" } },
  "toolbox-ccw": { href: TOOLBOX + "ccw", label: { en: "Try the method: CCW in the RWE Toolbox", zh: "動手試：RWE 工具箱的 CCW" } },
  "toolbox-cctc": { href: TOOLBOX + "cctc", label: { en: "Try the method: CCTC in the RWE Toolbox", zh: "動手試：RWE 工具箱的 CCTC" } },
  "toolbox-cc": { href: TOOLBOX + "cc", label: { en: "Try the method: case-control in the RWE Toolbox", zh: "動手試：RWE 工具箱的病例對照" } },
  "toolbox-srma": { href: TOOLBOX + "srma", label: { en: "Try the method: SR/MA in the RWE Toolbox", zh: "動手試：RWE 工具箱的系統性回顧與統合分析" } },
  "note-tte": { href: "/writing/target-trial-emulation", label: { en: "Method note: target trial emulation", zh: "方法筆記：target trial emulation" } },
  "note-ccw": { href: "/writing/clone-censor-weight", label: { en: "Method note: clone-censor-weight", zh: "方法筆記：clone-censor-weight" } },
  "nhird-dict": { href: "https://danielhttsai.github.io/nhird-data-dictionary/", label: { en: "Look up the variables: NHIRD data dictionary", zh: "查變項：NHIRD 資料字典" }, external: true },
  "drug-lookup": { href: "https://danielhttsai.github.io/nhird-data-dictionary/drugs/", label: { en: "Find the drug codes: NHI drug lookup", zh: "查藥品代碼：健保藥品查詢" }, external: true },
  "acb-calc": { href: "/tools/acb-calculator", label: { en: "Score a patient: ACB calculator", zh: "算病人的負荷：ACB 計算機" } },
  "km-guide": { href: "/tools/km-cif-riskset", label: { en: "Read the estimate: TriNetX survival vs cumulative incidence", zh: "讀懂估計值：TriNetX 存活機率與累積發生率" } },
  "phenotype-lgs": { href: "/tools/clone-censor-weight?library=indications&q=Lennox", label: { en: "Reuse the definition: LGS in the phenotype library", zh: "沿用這個定義：phenotype library 的 LGS" } },
  map: { href: "/networks#map", label: { en: "See the databases on the map", zh: "在地圖上看這些資料庫" } },
};

// ── Paper helpers ────────────────────────────────────────────────────────
export interface PubRow { year: string; doi: string; citation: string; ris?: string; date?: number }
const unesc = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const risField = (p: PubRow, f: string) => {
  const m = (p.ris || "").match(new RegExp(`^${f}  - (.+?)\\r?$`, "m"));
  return m ? unesc(m[1].trim()) : "";
};
export const paperTitle = (p: PubRow) => risField(p, "TI").replace(/[\s.]+$/, "") || p.citation;
export const paperJournal = (p: PubRow) => (risField(p, "JO") || risField(p, "T2")).replace(/^[\s.]+|[\s.]+$/g, "");
// "Tsai DHT et al." from the formatted citation.
export const paperLead = (p: PubRow) => {
  const authors = p.citation.split(". ")[0].split(", ");
  const first = authors[0].replace(/\*/g, "");
  return authors.length > 1 ? `${first} et al.` : first;
};

export const ALL_PUBS = (pubs as PubRow[]).slice().sort((a, b) => (b.date || 0) - (a.date || 0));
// Papers per tag value, for filter counts and the home page.
export const countBy = (pick: (t: PaperTags) => string[]) => {
  const n: Record<string, number> = {};
  for (const p of ALL_PUBS) for (const v of new Set(pick(tagsOf(p.doi)))) n[v] = (n[v] || 0) + 1;
  return n;
};

// Headline numbers for the map, shared by the Networks page and the home page.
export const MAP_STATS = (() => {
  const tagged = ALL_PUBS.map((p) => tagsOf(p.doi));
  return {
    countries: CORE.length,
    databases: new Set(tagged.flatMap((t) => t.data)).size,
    papers: tagged.filter((t) => t.data.length).length,
    multi: tagged.filter((t) => t.countries.length > 1 || t.countries.includes("GLOBAL") || t.countries.includes("MIDAS65")).length,
  };
})();
// Papers whose data comes from more than one named country.
export const MULTI_COUNTRY = ALL_PUBS.filter((p) => {
  const t = tagsOf(p.doi);
  return t.countries.length > 1 || t.countries.includes("MIDAS65");
});
