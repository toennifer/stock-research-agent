# Financial Data Collector Agent

An AI-powered stock research agent built with the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/python). It uses four custom MCP tools to fetch market data, earnings, news sentiment, and sector context — then synthesizes everything into a structured analysis.

## Prerequisites

- **Python 3.10+** (the Claude Agent SDK requires 3.10 or later)
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com/)

## Setup

1. **Create and activate a virtual environment:**

   ```bash
   cd backend/financial_data_collector
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Anthropic API key:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   Optionally, add a [Finnhub API key](https://finnhub.io/register) for richer news data with sentiment scores. Without it, the agent falls back to Yahoo Finance news (no sentiment scoring).

## Usage

**Default analysis (AAPL):**

```bash
python main.py
```

**Analyze a specific stock:**

```bash
python main.py "Analyze NVDA stock"
```

**Compare multiple tickers:**

```bash
python main.py "Compare MSFT and GOOGL - which has stronger fundamentals?"
```

**Custom research prompts:**

```bash
python main.py "What is the earnings trend for TSLA over the last 4 quarters?"
```

## Tools

The agent has four MCP tools that Claude calls automatically:

| Tool | Description |
|------|-------------|
| `get_market_data` | Current price, volume, 52-week range, SMA (20/50/200), EMA (12/26), RSI (14), MACD, and pattern signals |
| `get_earnings_info` | Last 4 quarters of EPS/revenue data, earnings surprises, and next earnings date |
| `get_news_sentiment` | Recent headlines with sentiment analysis (Finnhub primary, Yahoo Finance fallback) |
| `get_sector_context` | Sector ETF performance, relative performance vs. sector, and all-sector ranking |

## Architecture

```
financial_data_collector/
├── main.py           # Agent entry point — configures Claude SDK and streams output
├── tools.py          # 4 custom MCP tools using @tool decorator
├── requirements.txt  # Python dependencies
├── .env.example      # Environment variable template
└── .gitignore        # Git ignore rules
```

The agent uses an **in-process MCP server** — tools run in the same Python process as the SDK (no subprocess overhead). Blocking I/O from `yfinance` and `requests` is wrapped with `asyncio.to_thread()` so Claude can call multiple tools in parallel.

## Data Sources

- **[yfinance](https://github.com/ranaroussi/yfinance)** — price history, financials, earnings, company info
- **[Finnhub](https://finnhub.io/)** (optional) — news with sentiment scoring
- **Yahoo Finance** (fallback) — news headlines when Finnhub key is not set

## Troubleshooting

**"Claude Code cannot be launched inside another Claude Code session"**
If running from within a Claude Code session, unset the inherited env var first:
```bash
unset CLAUDECODE && python main.py
```

**API key not loading from `.env`**
The agent uses `load_dotenv(override=True)` to handle cases where `ANTHROPIC_API_KEY` is inherited as an empty string from parent processes (common in Claude Code). If you still have issues, export the key directly:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
python main.py
```

## Notes

- Market data may be delayed up to 15 minutes on free data sources
- Analysis is AI-generated and intended for educational purposes only — not investment advice
- The agent uses `claude-sonnet-4-6` by default; change the `model` field in `main.py` to use a different model
- The prompt is sent as an async iterable to keep stdin open for MCP bidirectional communication (required for SDK MCP tools)
