# Data Sources Footer — Design

**Date:** 2026-03-04
**Status:** Approved

## Goal

Show clickable links to the actual data sources used at the end of each analysis report, dynamically based on which tools executed.

## Approach

Dynamic via SSE metadata (Option 2). The backend tracks which tools ran, maps them to source metadata, deduplicates, and sends a `sources` SSE event. The frontend captures this and renders a styled footer.

## SSE Event

```json
{
  "type": "sources",
  "sources": [
    {
      "name": "Yahoo Finance",
      "url": "https://finance.yahoo.com/quote/AAPL",
      "tools": ["Market data & technicals", "Earnings data", "Sector context"]
    },
    {
      "name": "Finnhub",
      "url": "https://finnhub.io",
      "tools": ["News & sentiment"]
    },
    {
      "name": "Claude by Anthropic",
      "url": "https://anthropic.com",
      "tools": ["AI analysis & synthesis"]
    }
  ]
}
```

## Key Decisions

- Yahoo Finance used by 3 tools → deduplicated into one entry with sub-list
- News tool resolves to Finnhub or Yahoo Finance based on `FINNHUB_API_KEY`
- Claude always included as AI synthesis source
- Yahoo Finance URL is ticker-specific
- Sources sent before text stream so frontend has them ready
- Renders between markdown and disclaimer, prints cleanly in PDF

## Files

| File | Change |
|---|---|
| `frontend/src/app/api/analyze/route.ts` | Build source metadata, send `sources` SSE event |
| `frontend/src/components/research/ResearchClient.tsx` | Capture `sources` event, pass to `AnalysisReport` |
| `frontend/src/components/research/AnalysisReport.tsx` | New `DataSources` section |
