import type { Metadata } from "next";
import { ResearchClient } from "@/components/research/ResearchClient";

export const metadata: Metadata = {
  title: "Ticker Research | Stock Research Agent",
  description:
    "Enter a stock ticker to generate an AI-powered analysis report with market data, earnings, news sentiment, and sector context.",
};

export default function ResearchPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ticker Research</h1>
        <p className="mt-2 text-gray-600">
          Enter a stock ticker to generate a comprehensive AI analysis report.
        </p>
      </div>
      <ResearchClient />
    </div>
  );
}
