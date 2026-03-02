# Stock Research Agent — Project Guide

## Project Overview

An automatic research agent for stock market analysis. The system combines financial data aggregation, AI-generated reports, sector analysis, and personal portfolio tracking into a unified research platform.

---

## Architecture

```
stock-research-agent/
├── frontend/               # UI (React or Next.js)
│   ├── pages/
│   │   ├── learn/          # Educational materials hub
│   │   ├── research/       # Ticker research & report generation
│   │   ├── sectors/        # Sector & top movers dashboard
│   │   └── portfolio/      # Personal investment tracker
│   └── components/
├── backend/                # API layer (Python/FastAPI or Node.js)
│   ├── data/               # Data fetching modules
│   │   ├── financials.py   # Financial statements, ratios
│   │   ├── news.py         # News aggregation
│   │   ├── earnings.py     # Earnings data & calendar
│   │   └── sectors.py      # Sector performance & movers
│   ├── reports/            # AI report generation
│   └── portfolio/          # Portfolio tracking logic
├── db/                     # Database (PostgreSQL or SQLite)
└── CLAUDE.md
```

---

## Components

### 1. Educational Materials Hub (`/learn`)

A curated, browsable library of learning resources organized by topic.

**Categories to cover:**
- Fundamental analysis (P/E, EPS, revenue growth, margins)
- Technical analysis (moving averages, RSI, MACD, chart patterns)
- Macroeconomics & market cycles
- Options & derivatives basics
- Portfolio construction & risk management
- Reading SEC filings (10-K, 10-Q, 8-K)

**Implementation notes:**
- Resources stored as structured data (title, URL, type, difficulty, topic tags)
- Filter/search by topic and difficulty level
- Mark resources as read/bookmarked per user
- Consider embedding YouTube videos and linking to investopedia, SEC EDGAR, and free course platforms

**Key resource types to include:**
- Articles and guides
- Video tutorials
- Interactive tools (e.g., DCF calculators)
- Official documentation (SEC EDGAR, Fed data)

---

### 2. Ticker Research Page (`/research`)

Core feature. User inputs a ticker symbol and the system pulls all relevant data and generates a structured AI report.

**Data to fetch per ticker:**
- **Financial data:** Income statement, balance sheet, cash flow (annual + quarterly), key ratios (P/E, P/B, EV/EBITDA, debt/equity, ROE, FCF yield)
- **Recent news:** Last 30 days of headlines with sentiment tagging
- **Earnings info:** Last 4 quarters (EPS actual vs. estimate, revenue actual vs. estimate, surprise %), next earnings date
- **Price data:** Current price, 52-week high/low, volume, market cap, beta

**Suggested data sources (free tiers available):**
- `yfinance` (Python) — price, financials, basic info
- Alpha Vantage API — financials, earnings
- Finnhub API — news, earnings calendar, sentiment
- Polygon.io — price data, news
- SEC EDGAR API — raw filings

**Structured report output:**
```
Report for: {TICKER} — {Company Name}
Generated: {date}

## Summary
One-paragraph overview of the business and current market position.

## Financial Health
- Revenue trend (YoY growth)
- Profitability (margins, EPS trend)
- Balance sheet strength (debt levels, cash)
- Key ratios vs. sector averages

## Recent News & Sentiment
- Bullish signals
- Bearish signals / risks
- Analyst actions

## Earnings Analysis
- Last quarter performance vs. estimates
- Guidance (if provided)
- Earnings trend over last 4 quarters

## Investment Considerations
- Bull case
- Bear case
- Key risks to monitor

## Verdict / Rating
[Buy / Hold / Watch / Avoid] with brief rationale
```

**AI report generation:**
- Use Claude API (claude-sonnet-4-6 or claude-opus-4-6) with structured prompt
- Pass fetched data as context; instruct model to analyze, not just summarize
- Cache reports with timestamps; allow user to regenerate

---

### 3. Sectors & Top Movers Dashboard (`/sectors`)

A live overview of market activity organized by sector.

**Features:**
- List all 11 GICS sectors with daily % change
- Top 5 gainers and top 5 losers per sector
- Overall market movers (top 10 gainers / losers by % across all sectors)
- Sector rotation heatmap (weekly/monthly performance)

**Data sources:**
- `yfinance` sector ETFs (XLK, XLF, XLV, XLE, etc.) for sector-level data
- Screener endpoints from Finviz, Polygon, or Yahoo Finance for top movers

**Suggested sector ETF mapping:**
| Sector | ETF |
|---|---|
| Technology | XLK |
| Financials | XLF |
| Healthcare | XLV |
| Energy | XLE |
| Consumer Discretionary | XLY |
| Consumer Staples | XLP |
| Industrials | XLI |
| Materials | XLB |
| Real Estate | XLRE |
| Utilities | XLU |
| Communication Services | XLC |

**Refresh rate:** Data should update every 15 minutes during market hours (9:30am–4pm ET).

---

### 4. Personal Portfolio Tracker (`/portfolio`)

Track personal stock holdings and monitor performance over time.

**Features:**
- Add/edit/remove positions (ticker, shares, average cost basis, date purchased)
- Real-time market value and unrealized gain/loss ($ and %)
- Portfolio allocation breakdown (by sector, position size)
- Performance chart (portfolio value over time vs. S&P 500 benchmark)
- Dividend tracking (yield, upcoming ex-dividend dates)
- Watchlist for stocks not yet owned

**Data model (per position):**
```
Position {
  ticker: string
  shares: float
  avg_cost: float
  date_opened: date
  notes: string (optional)
}
```

**Derived fields (calculated at runtime):**
- current_price (live)
- market_value = shares × current_price
- cost_basis = shares × avg_cost
- unrealized_pnl = market_value - cost_basis
- pnl_percent = unrealized_pnl / cost_basis × 100

**Storage:** Local database (SQLite for simplicity, PostgreSQL for production). No brokerage API integration required — manual entry only.

---

## Tech Stack Recommendations

| Layer | Recommended |
|---|---|
| Frontend | Next.js (React) + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI Reports | Anthropic Claude API |
| Data fetching | yfinance, Alpha Vantage, Finnhub |
| Charts | Recharts or Chart.js |
| Scheduling | APScheduler (sector data refresh) |

---

## Environment Variables

```
ANTHROPIC_API_KEY=
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
POLYGON_API_KEY=        # optional
DATABASE_URL=
```

---

## Development Priorities

Build in this order:

1. **Backend data layer** — get ticker data fetching working reliably before building UI
2. **Ticker research page** — core value of the project
3. **AI report generation** — wire Claude API into research page
4. **Portfolio tracker** — CRUD operations + live price overlay
5. **Sectors dashboard** — market overview with scheduled refresh
6. **Educational hub** — content curation, lower technical complexity

---

## Key Constraints & Notes

- Respect API rate limits on free tiers (Alpha Vantage: 25 calls/day on free plan; yfinance has no official limit but should be cached)
- Cache all fetched data with TTL to avoid redundant API calls
- Financial data is for personal research only — do not display investment advice without appropriate disclaimers
- Market data is delayed 15 minutes on most free sources; make this clear in the UI
- Reports generated by AI should include a disclaimer that they are AI-generated and not professional financial advice
