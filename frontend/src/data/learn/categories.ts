import { Category } from "./types";

export const categories: Category[] = [
  {
    slug: "fundamental-analysis",
    name: "Fundamental Analysis",
    description:
      "Learn to evaluate stocks using financial statements, ratios like P/E and EPS, revenue growth, and profit margins.",
    icon: "📊",
    color: "blue",
  },
  {
    slug: "technical-analysis",
    name: "Technical Analysis",
    description:
      "Master chart patterns, moving averages, RSI, MACD, and other indicators for timing entries and exits.",
    icon: "📈",
    color: "green",
  },
  {
    slug: "options-derivatives",
    name: "Options & Derivatives",
    description:
      "Understand calls, puts, options pricing, the Greeks, and basic derivatives strategies.",
    icon: "🎯",
    color: "purple",
  },
  {
    slug: "macroeconomics",
    name: "Macroeconomics & Market Cycles",
    description:
      "Explore economic indicators, interest rates, inflation, GDP, and how market cycles affect investments.",
    icon: "🌍",
    color: "amber",
  },
  {
    slug: "portfolio-risk-management",
    name: "Portfolio Construction & Risk Management",
    description:
      "Build diversified portfolios, understand asset allocation, modern portfolio theory, and risk mitigation.",
    icon: "🛡️",
    color: "teal",
  },
  {
    slug: "sec-filings",
    name: "Reading SEC Filings",
    description:
      "Navigate 10-K, 10-Q, and 8-K filings on EDGAR to extract actionable insights from company disclosures.",
    icon: "📄",
    color: "slate",
  },
];
