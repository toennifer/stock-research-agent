# Research Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the financial data collector MCP agent to a `/research` page so users can enter a ticker and receive a streaming AI-generated stock analysis.

**Architecture:** FastAPI server wraps the existing agent tools and exposes a `POST /api/analyze` SSE endpoint. Next.js frontend has a `/research` page that calls the endpoint via `fetch()`, reads the stream, and renders progressive markdown with `react-markdown`.

**Tech Stack:** FastAPI + uvicorn + sse-starlette (backend), Next.js + react-markdown + remark-gfm (frontend), Claude Agent SDK with in-process MCP tools.

---

### Task 1: FastAPI Server — Project Setup

**Files:**
- Create: `backend/api/server.py`
- Create: `backend/api/requirements.txt`
- Create: `backend/api/.env.example`
- Create: `backend/api/.gitignore`

**Step 1: Create requirements.txt**

Create `backend/api/requirements.txt`:
```
fastapi>=0.115.0
uvicorn>=0.34.0
sse-starlette>=2.2.0
claude-agent-sdk>=0.1.45
yfinance>=1.2.0
requests>=2.32.0
python-dotenv>=1.2.0
```

**Step 2: Create .env.example**

Create `backend/api/.env.example`:
```
ANTHROPIC_API_KEY=your_api_key_here
FINNHUB_API_KEY=
CORS_ORIGINS=http://localhost:3000
```

**Step 3: Create .gitignore**

Create `backend/api/.gitignore`:
```
.venv/
__pycache__/
*.pyc
.env
.env.local
.DS_Store
```

**Step 4: Create venv and install deps**

```bash
cd backend/api
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Step 5: Copy .env from financial_data_collector**

```bash
cp ../financial_data_collector/.env .env
echo "CORS_ORIGINS=http://localhost:3000" >> .env
```

**Step 6: Commit**

```bash
git add backend/api/requirements.txt backend/api/.env.example backend/api/.gitignore
git commit -m "feat: scaffold FastAPI server for research endpoint"
```

---

### Task 2: FastAPI Server — SSE Endpoint

**Files:**
- Create: `backend/api/server.py`

**Step 1: Write server.py**

This is the full FastAPI server. It imports the agent tools from the sibling `financial_data_collector` package, creates the MCP server, and exposes one SSE endpoint.

```python
"""FastAPI server that wraps the financial data collector agent.

Exposes a POST /api/analyze endpoint that streams the agent's analysis
as Server-Sent Events (SSE).
"""

import json
import os
import re
import sys
from collections.abc import AsyncIterator
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

load_dotenv(override=True)

# Add financial_data_collector to Python path so we can import its tools
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "financial_data_collector"))

from claude_agent_sdk import ClaudeAgentOptions, create_sdk_mcp_server, query
from claude_agent_sdk.types import AssistantMessage, ResultMessage, TextBlock
from tools import ALL_TOOLS

# Create in-process MCP server (shared across requests)
financial_server = create_sdk_mcp_server(
    name="financial_tools",
    version="1.0.0",
    tools=ALL_TOOLS,
)

SYSTEM_PROMPT = """\
You are a financial data research assistant. Your job is to collect and analyze \
stock market data for the tickers the user provides.

You have access to four specialized tools:
1. **get_market_data** — Current price, volume, 52-week range, moving averages, RSI, MACD, and pattern signals.
2. **get_earnings_info** — Last 4 quarters of EPS/revenue data, earnings surprises, and next earnings date.
3. **get_news_sentiment** — Recent news headlines with sentiment analysis.
4. **get_sector_context** — Sector ETF performance, peer comparison, and relative performance.

When the user asks about a stock:
- Call ALL FOUR tools to gather comprehensive data.
- Synthesize the results into a structured analysis covering:
  - Current market position (price, volume, key levels)
  - Technical outlook (trend, momentum, support/resistance)
  - Earnings trajectory (beats/misses, growth trend)
  - News sentiment (bullish/bearish signals)
  - Sector positioning (outperforming or underperforming)
- End with a brief overall assessment.

Keep your analysis factual and data-driven. Always note that this is AI-generated \
analysis for educational purposes only, not investment advice. Market data may be \
delayed up to 15 minutes on free data sources.\
"""

app = FastAPI(title="Stock Research API")

# CORS — allow frontend origins
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Ticker validation: 1-5 uppercase alphanumeric chars
TICKER_PATTERN = re.compile(r"^[A-Z]{1,5}$")


class AnalyzeRequest(BaseModel):
    ticker: str


async def _single_prompt(text: str) -> AsyncIterator[dict]:
    """Wrap a string prompt as an async iterator of user message dicts."""
    yield {
        "type": "user",
        "session_id": "",
        "message": {"role": "user", "content": text},
        "parent_tool_use_id": None,
    }


async def _stream_analysis(ticker: str) -> AsyncIterator[dict]:
    """Run the agent and yield SSE events as text chunks arrive."""
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-6",
        system_prompt=SYSTEM_PROMPT,
        mcp_servers={"financial": financial_server},
        allowed_tools=[
            "mcp__financial__get_market_data",
            "mcp__financial__get_earnings_info",
            "mcp__financial__get_news_sentiment",
            "mcp__financial__get_sector_context",
        ],
        permission_mode="bypassPermissions",
        max_turns=10,
    )

    prompt = f"Analyze {ticker} stock — provide market data, earnings, news sentiment, and sector context."

    try:
        async for message in query(prompt=_single_prompt(prompt), options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        yield {
                            "event": "message",
                            "data": json.dumps({"type": "text", "content": block.text}),
                        }
            if isinstance(message, ResultMessage):
                pass  # Final result duplicates assistant text; skip

        yield {"event": "message", "data": json.dumps({"type": "done"})}

    except Exception as e:
        yield {
            "event": "message",
            "data": json.dumps({"type": "error", "message": str(e)}),
        }


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """Stream a stock analysis report for the given ticker."""
    ticker = req.ticker.upper().strip()

    if not TICKER_PATTERN.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker symbol. Use 1-5 letters (e.g., AAPL).")

    return EventSourceResponse(_stream_analysis(ticker))


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 2: Test the server starts**

```bash
cd backend/api
source .venv/bin/activate
unset CLAUDECODE
uvicorn server:app --host 0.0.0.0 --port 8000
```

Expected: Server starts on port 8000. Visit `http://localhost:8000/health` → `{"status": "ok"}`

**Step 3: Test the SSE endpoint with curl**

```bash
curl -N -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL"}'
```

Expected: SSE events stream in with `data: {"type": "text", "content": "..."}` followed by `data: {"type": "done"}`

**Step 4: Commit**

```bash
git add backend/api/server.py
git commit -m "feat: add FastAPI SSE endpoint for stock analysis"
```

---

### Task 3: Frontend — Install Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install react-markdown and remark-gfm**

```bash
cd frontend
npm install react-markdown remark-gfm
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-markdown and remark-gfm for research page"
```

---

### Task 4: Frontend — Research Page (Server Component + Layout)

**Files:**
- Create: `frontend/src/app/research/layout.tsx`
- Create: `frontend/src/app/research/page.tsx`

**Step 1: Create research layout**

Create `frontend/src/app/research/layout.tsx` matching the learn layout pattern:

```tsx
export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {children}
    </main>
  );
}
```

**Step 2: Create research page**

Create `frontend/src/app/research/page.tsx`:

```tsx
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
```

**Step 3: Commit**

```bash
git add frontend/src/app/research/
git commit -m "feat: add research page layout and server component"
```

---

### Task 5: Frontend — ResearchClient Component

**Files:**
- Create: `frontend/src/components/research/ResearchClient.tsx`

**Step 1: Create ResearchClient**

This is the main client component with ticker input, SSE streaming, and state management.

```tsx
"use client";

import { useState, useRef, FormEvent } from "react";
import { AnalysisReport } from "./AnalysisReport";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "idle" | "loading" | "streaming" | "done" | "error";

export function ResearchClient() {
  const [ticker, setTicker] = useState("");
  const [activeTicker, setActiveTicker] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) {
      setError("Please enter a valid ticker symbol (1-5 letters).");
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveTicker(symbol);
    setMarkdown("");
    setError("");
    setStatus("loading");

    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      setStatus("streaming");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const event = JSON.parse(payload);
            if (event.type === "text") {
              setMarkdown((prev) => prev + event.content);
            } else if (event.type === "done") {
              setStatus("done");
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // Skip malformed SSE lines
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      // If we exited the loop without a "done" event
      if (status !== "done") setStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStatus("error");
    }
  }

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter a ticker symbol (e.g., AAPL)"
          maxLength={5}
          disabled={status === "loading" || status === "streaming"}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium uppercase tracking-wider text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "streaming" || !ticker.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {status === "loading" || status === "streaming" ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {status === "loading" && (
        <div className="mt-8 flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          Connecting to analysis engine for {activeTicker}...
        </div>
      )}

      {/* Analysis report */}
      {(status === "streaming" || status === "done") && markdown && (
        <div className="mt-8">
          <AnalysisReport
            ticker={activeTicker}
            markdown={markdown}
            isStreaming={status === "streaming"}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/research/ResearchClient.tsx
git commit -m "feat: add ResearchClient component with SSE streaming"
```

---

### Task 6: Frontend — AnalysisReport Component

**Files:**
- Create: `frontend/src/components/research/AnalysisReport.tsx`

**Step 1: Create AnalysisReport**

Renders streamed markdown with proper styling for tables, headers, and code blocks.

```tsx
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/research/AnalysisReport.tsx
git commit -m "feat: add AnalysisReport markdown renderer component"
```

---

### Task 7: Frontend — Tailwind Typography Plugin

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/app/globals.css`

The `prose` classes used in AnalysisReport require the `@tailwindcss/typography` plugin.

**Step 1: Install typography plugin**

```bash
cd frontend
npm install @tailwindcss/typography
```

**Step 2: Update globals.css to load the plugin**

Update `frontend/src/app/globals.css`:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "feat: add Tailwind typography plugin for prose styles"
```

---

### Task 8: Integration Test — Full End-to-End

**Step 1: Start FastAPI server**

Terminal 1:
```bash
cd backend/api
source .venv/bin/activate
unset CLAUDECODE
uvicorn server:app --host 0.0.0.0 --port 8000
```

**Step 2: Start Next.js dev server**

Terminal 2:
```bash
cd frontend
npm run dev
```

**Step 3: Test in browser**

1. Navigate to `http://localhost:3000/research`
2. Type "AAPL" in the search bar
3. Click "Analyze"
4. Verify: Loading spinner appears, then markdown streams in progressively
5. Verify: Tables render properly (earnings, technicals, sector data)
6. Verify: "Generating..." indicator shows during streaming, disappears when done
7. Verify: Disclaimer footer appears after completion

**Step 4: Test error cases**

1. Submit empty ticker → client-side validation error
2. Submit "123" → server returns 400 error, shown in UI
3. Close FastAPI server, submit ticker → connection error shown in UI

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete research page with FastAPI streaming integration"
```

---

### Task 9: Environment Config for Production

**Files:**
- Create: `frontend/.env.local.example`

**Step 1: Create frontend env example**

Create `frontend/.env.local.example`:
```
# URL of the FastAPI stock analysis server
# For local development: http://localhost:8000
# For production: https://your-api-host.example.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 2: Commit**

```bash
git add frontend/.env.local.example
git commit -m "docs: add frontend env config example for API URL"
```
