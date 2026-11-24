// The RWE tools listed on /tools. The page renders this list, and the home
// page's stats count it, so a tool added here shows up in both.
export const toolsList = (base: string) => [
  {
    name: "Protocol Generator",
    blurb:
      "Nine pharmacoepidemiology designs — active-comparator new-user, clone-censor-weight, sequential trial emulation, SCCS, case-crossover, case-control, interrupted time series, trend-in-trend and descriptive analysis. Start with six questions that narrow the choice, then a guided form drafts a multi-country protocol with a phenotype library flagging which definitions are validated, feasibility checks across Asian databases, and one-click Word / Markdown export.",
    note: "9 designs · what each assumes and when it breaks · runs entirely in your browser",
    href: `${base}/tools/protocol-generator`,
    cta: "Open the generator",
    blurbZh:
      "九種藥物流行病學設計：active-comparator new-user、clone-censor-weight、sequential trial emulation、SCCS、case-crossover、case-control、interrupted time series、trend-in-trend 與描述性分析。先用六個問題縮小選擇，再由表單帶你草擬可跨國執行的研究計畫書；phenotype library 會標出哪些定義經過驗證，並檢查亞洲各資料庫是否做得到，最後一鍵匯出 Word 或 Markdown。",
    noteZh: "9 種設計 · 每種的假設與失效情境 · 完全在瀏覽器裡執行",
    ctaZh: "打開 Generator",
  },
  {
    name: "Protocol Checker",
    blurb:
      "The flip side of the generator: upload an existing protocol and get an AI-assisted, item-by-item read on whether it conforms to HARPER (the ISPE/ISPOR protocol template) or TARGET — with an auto-drawn study-design scheme, a planned-outputs review, and fixes for anything missing.",
    note: "AI-assisted (free) · HARPER & TARGET · self-audit a protocol",
    href: `${base}/tools/protocol-checker`,
    cta: "Open the checker",
    blurbZh:
      "Generator 的反面：上傳一份現成的計畫書，由 AI 協助逐項檢查是否符合 HARPER（ISPE／ISPOR 的計畫書範本）或 TARGET，並自動畫出 study design 示意圖、檢視預定產出，缺什麼就告訴你怎麼補。",
    noteZh: "AI 輔助（免費）· HARPER 與 TARGET · 自己檢核計畫書",
    ctaZh: "打開 Checker",
  },
  {
    name: "PHDc RWE Toolbox",
    blurb:
      "A real-world-evidence utility from the Population Health Data Center for exploring and operationalising claims-based study designs.",
    note: "From PHDc, NCKU · embedded here, no install",
    href: `${base}/tools/phdc-rwe-tool`,
    cta: "Launch the toolbox",
    blurbZh:
      "PHDc 開發的 real-world evidence 工具，用來了解並實際操作以健保申報資料為基礎的研究設計。",
    noteZh: "來自成大群體健康數據中心（PHDc） · 直接嵌在本站，不用安裝",
    ctaZh: "打開工具箱",
  },
  {
    name: "NHIRD Data Dictionary",
    blurb:
      "A searchable codebook for Taiwan's National Health Insurance Research Database (NHIRD) and Health & Welfare Data Center datasets — variables, formats, and cross-dataset linkages across claims, mortality, cancer registry, and more.",
    note: "Structured on the DIVERSE data-source framework",
    href: "https://danielhttsai.github.io/nhird-data-dictionary/",
    cta: "Open the dictionary",
    blurbZh:
      "可搜尋的 codebook，涵蓋台灣全民健康保險研究資料庫（NHIRD）與衛生福利資料科學中心的資料檔：變項、格式，以及申報、死因、癌症登記等檔案之間怎麼串聯。",
    noteZh: "依 DIVERSE 資料來源架構整理",
    ctaZh: "打開資料字典",
  },
  {
    name: "RWE Studio",
    blurb:
      "Upload a small, messy hospital dataset and — entirely in your browser — profile and flag its dirtiness, clean it into a tidy master file, then map your columns to a study design and run the analysis in real R (via WebR). Currently runs four designs: active-comparator new-user, SCCS, case-crossover and interrupted time series. Nothing is uploaded.",
    note: "Experimental · runs real R in your browser · no data leaves your device",
    href: `${base}/tools/rwe-studio`,
    cta: "Open RWE Studio",
    blurbZh:
      "上傳一份小而亂的醫院資料，全程在瀏覽器裡完成：先盤點並標出資料問題，清理成整齊的主檔，再把欄位對應到研究設計，用真正的 R（透過 WebR）執行分析。目前支援四種設計：active-comparator new-user、SCCS、case-crossover 與 interrupted time series。資料不會上傳。",
    noteZh: "實驗性功能 · 在瀏覽器裡跑真正的 R · 資料不離開你的裝置",
    ctaZh: "打開 RWE Studio",
  },
  {
    name: "ACB Calculator",
    blurb:
      "Score a patient's total anticholinergic burden across 6 international scales and quantify 30-day risk of cardiovascular events, pneumonia, and out-of-hospital cardiac arrest — with OCR drug-history capture and printable reports.",
    note: "Built on 3 Taiwan NHI studies (BMJ, Clin Epidemiol, Eur Heart J)",
    href: `${base}/tools/acb-calculator`,
    cta: "Open the calculator",
    blurbZh:
      "用六種國際量表計算病人的 anticholinergic burden 總分，並量化 30 天內發生心血管事件、肺炎與到院前心跳停止的風險；可用 OCR 擷取用藥紀錄，也能列印報告。",
    noteZh: "根據三篇台灣健保研究（BMJ、Clin Epidemiol、Eur Heart J）",
    ctaZh: "打開計算機",
  },
  {
    name: "Phenotype library",
    blurb:
      "Code sets for populations, drugs and outcomes, the same ones the protocol builders offer, searchable on one page. Each entry says whether a validation study exists and cites it when it does.",
    note: "One source with the builders · link straight to an entry",
    href: `${base}/tools/phenotypes`,
    cta: "Open the library",
    blurbZh:
      "族群、藥品與 outcome 的代碼定義，和 protocol builder 提供的是同一份，集中在一頁可以搜尋。每一筆都標明是否有 validation study，有的話附上出處。",
    noteZh: "與 builder 共用同一份資料 · 可以直接連到單一項目",
    ctaZh: "打開 phenotype library",
  },
];
