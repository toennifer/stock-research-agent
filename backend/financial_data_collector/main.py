"""Financial Data Collector Agent

An AI agent powered by Claude that fetches and analyzes stock market data.
Uses the Claude Agent SDK with custom MCP tools for:
  - Market data & technical indicators
  - Quarterly earnings information
  - News aggregation & sentiment
  - Sector context & relative performance
"""

import asyncio
import sys
from collections.abc import AsyncIterator

from dotenv import load_dotenv

from claude_agent_sdk import query, ClaudeAgentOptions, create_sdk_mcp_server
from claude_agent_sdk.types import AssistantMessage, ResultMessage, TextBlock

from tools import ALL_TOOLS

# Load .env file (for ANTHROPIC_API_KEY, FINNHUB_API_KEY, etc.)
# override=True ensures .env values win over inherited empty env vars
# (e.g., Claude Code exports ANTHROPIC_API_KEY="" to child processes)
load_dotenv(override=True)

# Create an in-process MCP server with all financial tools
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


async def _single_prompt(text: str) -> AsyncIterator[dict]:
    """Wrap a string prompt as an async iterator of user message dicts.

    Workaround for an SDK bug where string prompts cause end_input() to close
    stdin before MCP control requests are fully handled. Using an async iterable
    prompt keeps stdin open for the full agent session.
    """
    yield {
        "type": "user",
        "session_id": "",
        "message": {"role": "user", "content": text},
        "parent_tool_use_id": None,
    }


async def run_agent(user_prompt: str) -> None:
    """Run the financial data collector agent with the given prompt."""
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

    print(f"\nResearching: {user_prompt}\n")
    print("-" * 60)

    # Use async iterable prompt to keep stdin open for MCP communication
    async for message in query(prompt=_single_prompt(user_prompt), options=options):
        # Print assistant text responses
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text, end="", flush=True)

        # Print the final result
        if isinstance(message, ResultMessage):
            if message.result:
                print(f"\n\n{'=' * 60}")
                print(message.result)

    print()


def main() -> None:
    """Entry point — accepts a prompt from CLI args or uses a default."""
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = "Analyze AAPL stock - provide market data, earnings, news sentiment, and sector context."

    asyncio.run(run_agent(prompt))


if __name__ == "__main__":
    main()
