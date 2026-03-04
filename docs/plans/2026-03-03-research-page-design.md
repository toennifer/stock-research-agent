# Research Page Integration Design

**Date**: 2026-03-03
**Status**: Approved

## Goal

Connect the financial data collector MCP agent to the `/research` page so users can enter a ticker symbol and receive a streaming AI-generated stock analysis report.

## Architecture

```
Browser (/research)
  │  fetch() with ReadableStream
  ▼
FastAPI Server (backend/api/)
  POST /api/analyze { "ticker": "AAPL" }
  → SSE stream of markdown text chunks
  │  Claude Agent SDK query()
  ▼
Claude API + MCP Tools (yfinance, Finnhub)
```

The FastAPI server imports the agent's tools directly (same Python process, no subprocess). The frontend consumes the SSE stream and renders markdown progressively.

## Backend: FastAPI Server

**Location**: `backend/api/`

**Files**:
- `server.py` — FastAPI app, single SSE endpoint
- `requirements.txt` — fastapi, uvicorn, sse-starlette, plus agent deps

**Endpoint**:
```
POST /api/analyze
Content-Type: application/json
Body: { "ticker": "AAPL" }
Response: text/event-stream
```

**SSE event format**:
```
data: {"type": "text", "content": "chunk of markdown..."}
data: {"type": "done"}
data: {"type": "error", "message": "description"}
```

**Agent integration**:
- Imports `ALL_TOOLS` from `financial_data_collector.tools`
- Creates in-process MCP server with `create_sdk_mcp_server()`
- Runs `query()` with async iterable prompt (same workaround as CLI agent)
- Iterates over `AssistantMessage` text blocks, yields as SSE events

**Validation**:
- Ticker: uppercase, alphanumeric only, 1-5 characters
- Reject empty/invalid with 400 error before calling agent

**CORS**:
- Allow `http://localhost:3000` (dev)
- Allow Vercel production domain (configurable via env var)

## Frontend: Research Page

**Location**: `frontend/src/app/research/`

**Files**:
- `page.tsx` — Server component with metadata
- `ResearchClient.tsx` → `frontend/src/components/research/ResearchClient.tsx`
- `AnalysisReport.tsx` → `frontend/src/components/research/AnalysisReport.tsx`

**UI flow**:
1. Landing state: search bar with placeholder "Enter a ticker symbol (e.g., AAPL)"
2. Loading state: search bar disabled, pulsing indicator, report area shows streaming text
3. Streaming state: markdown sections appear progressively
4. Complete state: full report rendered with tables, headers, formatting
5. Error state: error message below search bar

**Dependencies**:
- `react-markdown` — render markdown
- `remark-gfm` — GitHub-flavored markdown (tables)

**Styling**: Tailwind, matching existing learn page patterns (white cards, max-w-7xl, gray hierarchy, blue accents).

**API URL config**: Environment variable `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000` for dev.

## Deployment

- **Frontend**: Vercel (existing). `/research` page works but needs API URL pointed at deployed FastAPI.
- **FastAPI**: Deploy separately (Railway, Fly.io, or any Python host). Needs `ANTHROPIC_API_KEY` and optionally `FINNHUB_API_KEY`.
- **Existing pages**: Unaffected. `/learn` continues to work as static pages.

## Not in scope

- Report caching / history
- User accounts or authentication
- Multiple ticker comparison (single ticker per request)
- Portfolio or sectors integration
