# Data Sources Footer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show clickable data source links at the end of each analysis report, dynamically based on which tools executed.

**Architecture:** Backend builds source metadata from executed tools, sends a `sources` SSE event before the text stream. Frontend captures this and renders a styled footer between the markdown and the disclaimer.

**Tech Stack:** Next.js API route (TypeScript), React, Tailwind CSS, SSE

---

### Task 1: Add source metadata builder and SSE event to the API route

**Files:**
- Modify: `frontend/src/app/api/analyze/route.ts`

**Step 1: Add the source metadata builder**

After the `executeTool` function (line ~105), add a helper that maps tool names to source metadata:

```typescript
interface DataSource {
  name: string;
  url: string;
  tools: string[];
}

function buildSourceMetadata(
  executedTools: string[],
  ticker: string,
): DataSource[] {
  const hasFinnhub = !!process.env.FINNHUB_API_KEY;

  // Map each tool to its source
  const toolToSource: Record<string, { sourceName: string; label: string }> = {
    get_market_data: { sourceName: "Yahoo Finance", label: "Market data & technicals" },
    get_earnings_info: { sourceName: "Yahoo Finance", label: "Earnings data" },
    get_news_sentiment: {
      sourceName: hasFinnhub ? "Finnhub" : "Yahoo Finance",
      label: "News & sentiment",
    },
    get_sector_context: { sourceName: "Yahoo Finance", label: "Sector context" },
  };

  // Group tools by source, preserving order
  const sourceMap = new Map<string, { url: string; tools: string[] }>();

  for (const tool of executedTools) {
    const mapping = toolToSource[tool];
    if (!mapping) continue;

    const existing = sourceMap.get(mapping.sourceName);
    if (existing) {
      existing.tools.push(mapping.label);
    } else {
      const url =
        mapping.sourceName === "Yahoo Finance"
          ? `https://finance.yahoo.com/quote/${ticker}`
          : "https://finnhub.io";
      sourceMap.set(mapping.sourceName, { url, tools: [mapping.label] });
    }
  }

  // Always add Claude as the AI synthesis source
  sourceMap.set("Claude by Anthropic", {
    url: "https://anthropic.com",
    tools: ["AI analysis & synthesis"],
  });

  return Array.from(sourceMap.entries()).map(([name, { url, tools }]) => ({
    name,
    url,
    tools,
  }));
}
```

**Step 2: Send the sources SSE event after tool execution**

Inside the `start(controller)` callback, after `Promise.all` resolves the tool results (~line 163) and before the streaming step 3, add:

```typescript
// Send source metadata
const executedToolNames = toolUseBlocks.map((b) => b.name);
const sources = buildSourceMetadata(executedToolNames, ticker);
send({ type: "sources", sources });
```

**Step 3: Verify the build compiles**

Run: `cd frontend && npx next build`
Expected: Compiles successfully, no type errors.

**Step 4: Commit**

```bash
git add frontend/src/app/api/analyze/route.ts
git commit -m "feat(api): send data sources metadata via SSE event"
```

---

### Task 2: Capture sources event in ResearchClient and pass to AnalysisReport

**Files:**
- Modify: `frontend/src/components/research/ResearchClient.tsx`

**Step 1: Add DataSource type and sources state**

At the top of the file, after the imports, add:

```typescript
interface DataSource {
  name: string;
  url: string;
  tools: string[];
}
```

Inside the `ResearchClient` component, after the existing `useState` declarations, add:

```typescript
const [sources, setSources] = useState<DataSource[]>([]);
```

**Step 2: Reset sources on new submission**

In `handleSubmit`, right after `setMarkdown("")` (~line 32), add:

```typescript
setSources([]);
```

**Step 3: Handle the sources SSE event**

In the SSE parsing loop, after the `event.type === "text"` check (~line 72), add a new branch:

```typescript
} else if (event.type === "sources") {
  setSources(event.sources);
}
```

**Step 4: Pass sources to AnalysisReport**

Update the `<AnalysisReport>` JSX to pass sources:

```tsx
<AnalysisReport
  ticker={activeTicker}
  markdown={markdown}
  isStreaming={status === "streaming"}
  sources={sources}
/>
```

**Step 5: Verify the build compiles**

Run: `cd frontend && npx next build`
Expected: Compiles successfully (AnalysisReport will warn about unused prop until Task 3).

**Step 6: Commit**

```bash
git add frontend/src/components/research/ResearchClient.tsx
git commit -m "feat(research): capture data sources from SSE and pass to report"
```

---

### Task 3: Render the Data Sources section in AnalysisReport

**Files:**
- Modify: `frontend/src/components/research/AnalysisReport.tsx`

**Step 1: Update the interface and component props**

Add the `DataSource` interface and update `AnalysisReportProps`:

```typescript
interface DataSource {
  name: string;
  url: string;
  tools: string[];
}

interface AnalysisReportProps {
  ticker: string;
  markdown: string;
  isStreaming: boolean;
  sources: DataSource[];
}
```

Update the destructuring:

```typescript
export function AnalysisReport({ ticker, markdown, isStreaming, sources }: AnalysisReportProps) {
```

**Step 2: Add the Data Sources section**

Between the markdown `</div>` and the disclaimer footer, insert:

```tsx
{/* Data Sources */}
{!isStreaming && sources.length > 0 && (
  <div className="border-t border-gray-200 px-6 py-4">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
      Data Sources
    </h3>
    <div className="flex flex-wrap gap-3">
      {sources.map((source) => (
        <a
          key={source.name}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:text-blue-700">
              {source.name}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3 text-gray-400 group-hover:text-blue-500"
              >
                <path
                  fillRule="evenodd"
                  d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span className="text-xs text-gray-500">
              {source.tools.join(" · ")}
            </span>
          </div>
        </a>
      ))}
    </div>
  </div>
)}
```

**Step 3: Verify the full build**

Run: `cd frontend && npx next build`
Expected: Compiles successfully with all pages generated.

**Step 4: Commit**

```bash
git add frontend/src/components/research/AnalysisReport.tsx
git commit -m "feat(research): render data sources footer with tool breakdown"
```

---

### Task 4: Visual verification and deploy

**Step 1: Start dev server and test on /research**

Navigate to `/research`, enter a ticker (e.g., AAPL), and verify:
- Sources section appears after streaming completes
- Links open correct URLs in new tabs
- Yahoo Finance link is ticker-specific
- Save PDF includes the sources section
- Section does not appear during streaming

**Step 2: Squash into single commit, push, and deploy**

```bash
git push origin main
```

Deploy via Vercel (auto-deploy on push, or manual via `vercel --prod`).
