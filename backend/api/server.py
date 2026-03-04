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
