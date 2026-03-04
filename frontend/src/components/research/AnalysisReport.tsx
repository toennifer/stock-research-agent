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
    <div id="analysis-report" className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {ticker} Analysis Report
        </h2>
        <div className="flex items-center gap-3">
          {isStreaming && (
            <span className="flex items-center gap-2 text-xs font-medium text-blue-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
              Generating...
            </span>
          )}
          {!isStreaming && markdown && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 print:hidden"
              title="Save as PDF"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Save PDF
            </button>
          )}
        </div>
      </div>

      {/* Print-only header with date */}
      <div className="hidden print:block px-6 pt-4">
        <p className="text-xs text-gray-500">
          Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Markdown content */}
      <div className="prose prose-sm max-w-none px-6 py-6 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-th:text-left prose-th:text-gray-700 prose-td:text-gray-600">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>

      {/* Disclaimer footer */}
      {!isStreaming && markdown && (
        <div className="border-t border-gray-200 px-6 py-3">
          <p className="text-xs text-gray-400 print:text-gray-500">
            AI-generated analysis for educational purposes only. Not investment
            advice. Market data may be delayed up to 15 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
