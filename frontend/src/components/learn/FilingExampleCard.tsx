import { FilingExample, FilingSection, SectionImportance } from "@/data/learn/types";

const importanceStyles: Record<SectionImportance, { border: string; badge: string; label: string }> = {
  critical: {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-800",
    label: "Critical",
  },
  important: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "Important",
  },
  useful: {
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-800",
    label: "Useful",
  },
};

const filingTypeColors: Record<string, string> = {
  "10-K": "bg-emerald-600",
  "10-Q": "bg-violet-600",
  "8-K": "bg-rose-600",
};

function SectionItem({ section }: { section: FilingSection }) {
  const style = importanceStyles[section.importance];

  return (
    <div className={`border-l-4 ${style.border} bg-gray-50 rounded-r-lg py-3 px-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{section.name}</p>
          <p className="mt-1 text-sm text-gray-600">{section.description}</p>
          <p className="mt-1.5 text-xs text-gray-500 italic">
            Why it matters: {section.whyItMatters}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
        >
          {style.label}
        </span>
      </div>
    </div>
  );
}

export function FilingExampleCard({
  example,
  expanded,
  onToggle,
}: {
  example: FilingExample;
  expanded: boolean;
  onToggle: () => void;
}) {
  const typeColor = filingTypeColors[example.filingType] ?? "bg-gray-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold text-white ${typeColor}`}
            >
              {example.filingType}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {example.company}{" "}
                <span className="text-gray-400 font-normal">({example.ticker})</span>
              </h3>
              <p className="text-xs text-gray-500">
                Filed {new Date(example.filingDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <a
            href={example.edgarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600"
          >
            View on EDGAR
            <span className="text-gray-400">&#8599;</span>
          </a>
        </div>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{example.summary}</p>
      </div>

      {/* Sections toggle */}
      <div className="border-t border-gray-100">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Key Sections ({example.sections.length})
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expanded && (
          <div className="px-5 pb-5">
            {/* Legend */}
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
                Critical — Must read
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                Important — Highly recommended
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
                Useful — Good to know
              </span>
            </div>

            {/* Section list */}
            <div className="space-y-2">
              {example.sections.map((section, idx) => (
                <SectionItem key={idx} section={section} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
