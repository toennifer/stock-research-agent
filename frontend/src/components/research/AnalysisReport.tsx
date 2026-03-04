"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnalysisReportProps {
  ticker: string;
  markdown: string;
  isStreaming: boolean;
}

export function AnalysisReport({ ticker, markdown, isStreaming }: AnalysisReportProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {ticker} Analysis Report
        </h2>
        {isStreaming && (
          <span className="flex items-center gap-2 text-xs font-medium text-blue-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Generating...
          </span>
        )}
      </div>

      {/* Markdown content */}
      <div className="prose prose-sm max-w-none px-6 py-6 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-th:text-left prose-th:text-gray-700 prose-td:text-gray-600">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>

      {/* Disclaimer footer */}
      {!isStreaming && markdown && (
        <div className="border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-400">
            AI-generated analysis for educational purposes only. Not investment
            advice. Market data may be delayed up to 15 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
