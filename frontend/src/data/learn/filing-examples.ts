import { FilingExample } from "./types";

export const filingExamples: FilingExample[] = [
  {
    id: "fe-001",
    filingType: "10-K",
    company: "Apple Inc.",
    ticker: "AAPL",
    filingDate: "2024-11-01",
    edgarUrl:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K&dateb=&owner=include&count=10",
    summary:
      "Apple's fiscal year 2024 annual report covering iPhone, Mac, iPad, Services, and wearables segments with full financial statements and risk disclosures.",
    sections: [
      {
        name: "Item 1 — Business",
        description:
          "Overview of Apple's products and services, competitive landscape, seasonality, manufacturing, and intellectual property.",
        whyItMatters:
          "Understand the company's core business model, revenue streams, and how it positions itself against competitors.",
        importance: "critical",
      },
      {
        name: "Item 1A — Risk Factors",
        description:
          "Detailed list of risks including supply chain dependencies, foreign exchange, competition, regulatory, and macroeconomic risks.",
        whyItMatters:
          "Identifies what could go wrong. New or changed risk factors often signal emerging threats the company is worried about.",
        importance: "critical",
      },
      {
        name: "Item 6 — Selected Financial Data",
        description:
          "Five-year summary of revenue, net income, earnings per share, total assets, and long-term debt.",
        whyItMatters:
          "Quick way to spot multi-year trends in growth, profitability, and balance sheet health without reading full statements.",
        importance: "important",
      },
      {
        name: "Item 7 — MD&A (Management Discussion & Analysis)",
        description:
          "Management's narrative explanation of financial results, segment performance, liquidity, and capital resources.",
        whyItMatters:
          "The most valuable section for investors. Management explains WHY numbers changed, not just what they are. Look for candid discussion of challenges.",
        importance: "critical",
      },
      {
        name: "Item 8 — Financial Statements",
        description:
          "Audited income statement, balance sheet, cash flow statement, and statement of stockholders' equity.",
        whyItMatters:
          "The core financial data. Compare revenue growth, margin trends, cash generation, and debt levels year over year.",
        importance: "critical",
      },
      {
        name: "Notes to Financial Statements",
        description:
          "Detailed accounting policies, revenue recognition methods, segment breakdowns, lease obligations, and stock-based compensation details.",
        whyItMatters:
          "Contains crucial details hidden from the main statements, like revenue breakdown by geography, off-balance-sheet obligations, and accounting method changes.",
        importance: "important",
      },
      {
        name: "Item 9A — Controls and Procedures",
        description:
          "Assessment of internal controls over financial reporting, including auditor's opinion on control effectiveness.",
        whyItMatters:
          "Material weaknesses here are a red flag. If controls are ineffective, the financial statements may not be reliable.",
        importance: "useful",
      },
    ],
  },
  {
    id: "fe-002",
    filingType: "10-Q",
    company: "Apple Inc.",
    ticker: "AAPL",
    filingDate: "2025-01-31",
    edgarUrl:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-Q&dateb=&owner=include&count=10",
    summary:
      "Apple's Q1 FY2025 quarterly report with unaudited financial results covering the holiday quarter, typically Apple's strongest.",
    sections: [
      {
        name: "Part I, Item 1 — Financial Statements (Unaudited)",
        description:
          "Condensed income statement, balance sheet, and cash flow for the quarter and year-to-date, with comparative prior-year periods.",
        whyItMatters:
          "Track quarter-over-quarter and year-over-year trends. Compare against analyst estimates for revenue and EPS. Note: 10-Q financials are unaudited.",
        importance: "critical",
      },
      {
        name: "Part I, Item 2 — MD&A",
        description:
          "Management's quarterly discussion of results, segment revenue breakdowns, gross margin changes, and operating expense trends.",
        whyItMatters:
          "Shorter than the 10-K version but captures the most recent quarter's story. Look for mentions of guidance, product launches, or market headwinds.",
        importance: "critical",
      },
      {
        name: "Part I, Item 3 — Quantitative & Qualitative Disclosures About Market Risk",
        description:
          "Exposure to interest rate risk, foreign currency risk, and commodity price fluctuations with sensitivity analysis.",
        whyItMatters:
          "Shows how vulnerable the company is to currency swings or interest rate changes. Important for companies with large international revenue.",
        importance: "important",
      },
      {
        name: "Part I, Item 4 — Controls and Procedures",
        description:
          "CEO/CFO certification that disclosure controls are effective and any changes to internal controls during the quarter.",
        whyItMatters:
          "A change in internal controls or a disclosed material weakness mid-year is a significant warning sign.",
        importance: "useful",
      },
      {
        name: "Part II, Item 2 — Share Repurchases",
        description:
          "Details on stock buyback activity during the quarter, including shares purchased, average price paid, and remaining authorization.",
        whyItMatters:
          "Tracks how aggressively the company is buying back stock. Large buybacks can support EPS growth and signal management confidence.",
        importance: "important",
      },
    ],
  },
  {
    id: "fe-003",
    filingType: "8-K",
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    filingDate: "2024-11-20",
    edgarUrl:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=8-K&dateb=&owner=include&count=10",
    summary:
      "NVIDIA's 8-K filing reporting Q3 FY2025 earnings results, featuring record revenue driven by data center AI chip demand.",
    sections: [
      {
        name: "Item 2.02 — Results of Operations and Financial Condition",
        description:
          "Press release announcing quarterly revenue, earnings per share, and segment performance versus analyst expectations.",
        whyItMatters:
          "This is the earnings announcement. Compare actual results to consensus estimates. The market reacts most to revenue and EPS surprises.",
        importance: "critical",
      },
      {
        name: "Item 9.01 — Financial Statements and Exhibits",
        description:
          "Attached press release with condensed financial tables, revenue by segment (Data Center, Gaming, Professional Visualization, Auto), and forward guidance.",
        whyItMatters:
          "Contains the actual numbers and forward guidance. Guidance for next quarter often moves the stock more than current results.",
        importance: "critical",
      },
      {
        name: "Forward-Looking Statements",
        description:
          "Legal disclaimer covering projections, expectations, and estimates mentioned in the filing.",
        whyItMatters:
          "While mostly legal boilerplate, changes in the specific risks called out here can signal new concerns management wants to highlight.",
        importance: "useful",
      },
    ],
  },
];
