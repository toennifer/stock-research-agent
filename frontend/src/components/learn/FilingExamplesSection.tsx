"use client";

import { useState } from "react";
import { FilingExample } from "@/data/learn/types";
import { FilingExampleCard } from "./FilingExampleCard";

const filingTypes = ["All", "10-K", "10-Q", "8-K"] as const;

export function FilingExamplesSection({
  examples,
}: {
  examples: FilingExample[];
}) {
  const [activeType, setActiveType] = useState<string>("All");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered =
    activeType === "All"
      ? examples
      : examples.filter((e) => e.filingType === activeType);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>Real Filing Examples</span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Explore actual SEC filings with annotated section breakdowns. Expand
          each filing to see what critical components to look for.
        </p>
      </div>

      {/* Filing type tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filingTypes.map((type) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Filing example cards */}
      <div className="space-y-4">
        {filtered.map((example) => (
          <FilingExampleCard
            key={example.id}
            example={example}
            expanded={expandedIds.has(example.id)}
            onToggle={() => toggleExpanded(example.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
          <p className="text-gray-500 text-sm">
            No filing examples for this type.
          </p>
        </div>
      )}

      {/* Divider before resources */}
      <div className="mt-10 mb-2 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-bold text-gray-900">Learning Resources</h2>
        <p className="mt-1 text-sm text-gray-500">
          Guides, tools, and reference materials for understanding SEC filings.
        </p>
      </div>
    </div>
  );
}
