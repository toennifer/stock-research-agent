"""Custom MCP tools for financial data collection.

Each tool fetches a specific category of financial data and returns
formatted text that Claude can analyze and synthesize into reports.
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Any

import requests
import yfinance as yf
from claude_agent_sdk import tool


# ──────────────────────────────────────────────
# Tool 1: Market Data & Technical Indicators
# ──────────────────────────────────────────────

@tool(
    "get_market_data",
    "Fetch current market data, price history, and technical indicators (SMA, EMA, RSI, MACD) for a given stock ticker.",
    {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL, MSFT)"},
        },
        "required": ["ticker"],
    },
)
async def get_market_data(args: dict[str, Any]) -> dict[str, Any]:
    ticker = args["ticker"].upper().strip()
    return await asyncio.to_thread(_get_market_data_sync, ticker)


def _get_market_data_sync(ticker: str) -> dict[str, Any]:
    """Synchronous market data fetch — runs in a thread pool."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Fetch 1 year of daily history for technical indicators
        hist = stock.history(period="1y")
        if hist.empty:
            return _text_result(f"No market data found for ticker '{ticker}'. Verify the symbol is correct.")

        latest = hist.iloc[-1]
        close_prices = hist["Close"]

        # Basic price data
        current_price = float(latest["Close"])
        volume = int(latest["Volume"])
        high_52w = float(close_prices.max())
        low_52w = float(close_prices.min())

        # Moving averages
        sma_20 = float(close_prices.tail(20).mean())
        sma_50 = float(close_prices.tail(50).mean())
        sma_200 = float(close_prices.tail(200).mean()) if len(close_prices) >= 200 else None

        ema_12 = float(close_prices.ewm(span=12, adjust=False).mean().iloc[-1])
        ema_26 = float(close_prices.ewm(span=26, adjust=False).mean().iloc[-1])

        # RSI (14-day)
        delta = close_prices.diff()
        gain = delta.where(delta > 0, 0.0).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0.0)).rolling(window=14).mean()
        rs = gain / loss
        rsi_series = 100 - (100 / (1 + rs))
        rsi = float(rsi_series.iloc[-1]) if not rsi_series.empty else None

        # MACD
        macd_line = ema_12 - ema_26
        signal_series = close_prices.ewm(span=12, adjust=False).mean() - close_prices.ewm(span=26, adjust=False).mean()
        signal_line = float(signal_series.ewm(span=9, adjust=False).mean().iloc[-1])
        macd_histogram = macd_line - signal_line

        # Price change
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current_price
        day_change = current_price - prev_close
        day_change_pct = (day_change / prev_close) * 100

        result = {
            "ticker": ticker,
            "company_name": info.get("longName", ticker),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "current_price": round(current_price, 2),
            "day_change": round(day_change, 2),
            "day_change_pct": round(day_change_pct, 2),
            "volume": volume,
            "market_cap": info.get("marketCap", "N/A"),
            "beta": info.get("beta", "N/A"),
            "pe_ratio": info.get("trailingPE", "N/A"),
            "forward_pe": info.get("forwardPE", "N/A"),
            "52_week_high": round(high_52w, 2),
            "52_week_low": round(low_52w, 2),
            "technical_indicators": {
                "sma_20": round(sma_20, 2),
                "sma_50": round(sma_50, 2),
                "sma_200": round(sma_200, 2) if sma_200 else "Insufficient data",
                "ema_12": round(ema_12, 2),
                "ema_26": round(ema_26, 2),
                "rsi_14": round(rsi, 2) if rsi else "N/A",
                "macd_line": round(macd_line, 2),
                "macd_signal": round(signal_line, 2),
                "macd_histogram": round(macd_histogram, 2),
            },
            "patterns": {
                "above_sma_20": current_price > sma_20,
                "above_sma_50": current_price > sma_50,
                "above_sma_200": current_price > sma_200 if sma_200 else None,
                "golden_cross": sma_50 > sma_200 if sma_200 else None,
                "rsi_overbought": rsi > 70 if rsi else None,
                "rsi_oversold": rsi < 30 if rsi else None,
                "macd_bullish": macd_line > signal_line,
            },
            "data_timestamp": datetime.now().isoformat(),
        }

        return _text_result(json.dumps(result, indent=2))

    except Exception as e:
        return _text_result(f"Error fetching market data for {ticker}: {e}")


# ──────────────────────────────────────────────
# Tool 2: Earnings Information
# ──────────────────────────────────────────────

@tool(
    "get_earnings_info",
    "Fetch the latest quarterly earnings data for a given stock ticker, including EPS and revenue vs estimates for the last 4 quarters, and the next earnings date.",
    {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL, MSFT)"},
        },
        "required": ["ticker"],
    },
)
async def get_earnings_info(args: dict[str, Any]) -> dict[str, Any]:
    ticker = args["ticker"].upper().strip()
    return await asyncio.to_thread(_get_earnings_info_sync, ticker)


def _get_earnings_info_sync(ticker: str) -> dict[str, Any]:
    """Synchronous earnings fetch — runs in a thread pool."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Earnings history (last 4 quarters)
        earnings_hist = stock.earnings_history
        quarterly_data = []

        if earnings_hist is not None and not earnings_hist.empty:
            for _, row in earnings_hist.iterrows():
                quarter = {
                    "quarter": str(row.name) if hasattr(row, "name") else "N/A",
                    "eps_estimate": _safe_float(row.get("epsEstimate")),
                    "eps_actual": _safe_float(row.get("epsActual")),
                    "eps_surprise_pct": _safe_float(row.get("surprisePercent")),
                }
                quarterly_data.append(quarter)
            quarterly_data = quarterly_data[-4:]  # Last 4 quarters

        # Revenue data from quarterly financials
        quarterly_financials = stock.quarterly_financials
        revenue_data = []
        if quarterly_financials is not None and not quarterly_financials.empty:
            if "Total Revenue" in quarterly_financials.index:
                for col in quarterly_financials.columns[:4]:
                    revenue_data.append({
                        "quarter": str(col.date()) if hasattr(col, "date") else str(col),
                        "revenue": float(quarterly_financials.loc["Total Revenue", col]),
                    })

        # Next earnings date
        try:
            calendar = stock.calendar
            next_earnings = None
            if calendar is not None:
                if isinstance(calendar, dict):
                    earnings_date = calendar.get("Earnings Date")
                    if earnings_date:
                        if isinstance(earnings_date, list) and len(earnings_date) > 0:
                            next_earnings = str(earnings_date[0])
                        else:
                            next_earnings = str(earnings_date)
        except Exception:
            next_earnings = None

        result = {
            "ticker": ticker,
            "company_name": info.get("longName", ticker),
            "quarterly_earnings": quarterly_data,
            "quarterly_revenue": revenue_data,
            "next_earnings_date": next_earnings or "Not available",
            "trailing_eps": info.get("trailingEps", "N/A"),
            "forward_eps": info.get("forwardEps", "N/A"),
            "peg_ratio": info.get("pegRatio", "N/A"),
            "data_timestamp": datetime.now().isoformat(),
        }

        return _text_result(json.dumps(result, indent=2, default=str))

    except Exception as e:
        return _text_result(f"Error fetching earnings data for {ticker}: {e}")


# ──────────────────────────────────────────────
# Tool 3: News & Sentiment
# ──────────────────────────────────────────────

@tool(
    "get_news_sentiment",
    "Fetch recent news headlines and sentiment for a given stock ticker. Uses Finnhub API if FINNHUB_API_KEY is set, otherwise falls back to Yahoo Finance news.",
    {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL, MSFT)"},
        },
        "required": ["ticker"],
    },
)
async def get_news_sentiment(args: dict[str, Any]) -> dict[str, Any]:
    ticker = args["ticker"].upper().strip()
    finnhub_key = os.environ.get("FINNHUB_API_KEY", "")

    if finnhub_key:
        return await asyncio.to_thread(_fetch_finnhub_news_sync, ticker, finnhub_key)
    else:
        return await asyncio.to_thread(_fetch_yfinance_news_sync, ticker)


def _fetch_finnhub_news_sync(ticker: str, api_key: str) -> dict[str, Any]:
    """Fetch news from Finnhub API with sentiment scores — runs in a thread pool."""
    try:
        today = datetime.now()
        from_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")

        url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={from_date}&to={to_date}&token={api_key}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        articles = resp.json()

        # Also fetch overall sentiment
        sentiment_url = f"https://finnhub.io/api/v1/news-sentiment?symbol={ticker}&token={api_key}"
        sent_resp = requests.get(sentiment_url, timeout=10)
        sentiment_data = sent_resp.json() if sent_resp.status_code == 200 else {}

        news_items = []
        for article in articles[:15]:  # Limit to 15 most recent
            news_items.append({
                "headline": article.get("headline", ""),
                "source": article.get("source", ""),
                "url": article.get("url", ""),
                "datetime": datetime.fromtimestamp(article.get("datetime", 0)).isoformat(),
                "summary": article.get("summary", "")[:200],
            })

        result = {
            "ticker": ticker,
            "source": "Finnhub",
            "news_count": len(news_items),
            "articles": news_items,
            "overall_sentiment": sentiment_data.get("sentiment", {}),
            "buzz": sentiment_data.get("buzz", {}),
            "data_timestamp": datetime.now().isoformat(),
        }

        return _text_result(json.dumps(result, indent=2))

    except Exception as e:
        return _text_result(f"Error fetching Finnhub news for {ticker}: {e}. Falling back is not available.")


def _fetch_yfinance_news_sync(ticker: str) -> dict[str, Any]:
    """Fallback: fetch news from yfinance — runs in a thread pool."""
    try:
        stock = yf.Ticker(ticker)
        news = stock.news or []

        news_items = []
        for item in news[:15]:
            content = item.get("content", {})
            news_items.append({
                "headline": content.get("title", ""),
                "source": content.get("provider", {}).get("displayName", "Unknown"),
                "url": content.get("canonicalUrl", {}).get("url", ""),
                "datetime": content.get("pubDate", ""),
            })

        result = {
            "ticker": ticker,
            "source": "Yahoo Finance",
            "news_count": len(news_items),
            "articles": news_items,
            "note": "Set FINNHUB_API_KEY for sentiment scoring and richer news data.",
            "data_timestamp": datetime.now().isoformat(),
        }

        return _text_result(json.dumps(result, indent=2))

    except Exception as e:
        return _text_result(f"Error fetching Yahoo Finance news for {ticker}: {e}")


# ──────────────────────────────────────────────
# Tool 4: Sector Context
# ──────────────────────────────────────────────

# GICS sector ETF mapping
SECTOR_ETFS = {
    "Technology": "XLK",
    "Financials": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Industrials": "XLI",
    "Materials": "XLB",
    "Real Estate": "XLRE",
    "Utilities": "XLU",
    "Communication Services": "XLC",
}


@tool(
    "get_sector_context",
    "Fetch sector-level context for a given stock ticker, including the sector ETF performance, sector peers comparison, and the stock's relative performance within its sector.",
    {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL, MSFT)"},
        },
        "required": ["ticker"],
    },
)
async def get_sector_context(args: dict[str, Any]) -> dict[str, Any]:
    ticker = args["ticker"].upper().strip()
    return await asyncio.to_thread(_get_sector_context_sync, ticker)


def _get_sector_context_sync(ticker: str) -> dict[str, Any]:
    """Synchronous sector context fetch — runs in a thread pool."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")

        # Get sector ETF
        sector_etf_symbol = SECTOR_ETFS.get(sector)
        sector_perf = {}

        if sector_etf_symbol:
            etf = yf.Ticker(sector_etf_symbol)
            etf_hist = etf.history(period="3mo")
            if not etf_hist.empty:
                etf_current = float(etf_hist["Close"].iloc[-1])
                etf_1m_ago = float(etf_hist["Close"].iloc[-22]) if len(etf_hist) >= 22 else float(etf_hist["Close"].iloc[0])
                etf_3m_ago = float(etf_hist["Close"].iloc[0])

                sector_perf = {
                    "etf_symbol": sector_etf_symbol,
                    "etf_price": round(etf_current, 2),
                    "1_month_return_pct": round(((etf_current - etf_1m_ago) / etf_1m_ago) * 100, 2),
                    "3_month_return_pct": round(((etf_current - etf_3m_ago) / etf_3m_ago) * 100, 2),
                }

        # Stock's own performance for comparison
        stock_hist = stock.history(period="3mo")
        stock_perf = {}
        if not stock_hist.empty:
            stock_current = float(stock_hist["Close"].iloc[-1])
            stock_1m_ago = float(stock_hist["Close"].iloc[-22]) if len(stock_hist) >= 22 else float(stock_hist["Close"].iloc[0])
            stock_3m_ago = float(stock_hist["Close"].iloc[0])

            stock_perf = {
                "1_month_return_pct": round(((stock_current - stock_1m_ago) / stock_1m_ago) * 100, 2),
                "3_month_return_pct": round(((stock_current - stock_3m_ago) / stock_3m_ago) * 100, 2),
            }

        # Relative performance (stock vs sector)
        relative_perf = {}
        if sector_perf and stock_perf:
            relative_perf = {
                "1_month_vs_sector": round(stock_perf["1_month_return_pct"] - sector_perf["1_month_return_pct"], 2),
                "3_month_vs_sector": round(stock_perf["3_month_return_pct"] - sector_perf["3_month_return_pct"], 2),
                "outperforming_sector_1m": stock_perf["1_month_return_pct"] > sector_perf["1_month_return_pct"],
                "outperforming_sector_3m": stock_perf["3_month_return_pct"] > sector_perf["3_month_return_pct"],
            }

        # All sector ETF performance for broader context
        all_sectors = {}
        sector_symbols = list(SECTOR_ETFS.values())
        sector_data = yf.download(sector_symbols, period="1mo", progress=False)
        if not sector_data.empty and "Close" in sector_data.columns:
            for s_name, s_etf in SECTOR_ETFS.items():
                try:
                    if s_etf in sector_data["Close"].columns:
                        prices = sector_data["Close"][s_etf].dropna()
                        if len(prices) >= 2:
                            ret = ((float(prices.iloc[-1]) - float(prices.iloc[0])) / float(prices.iloc[0])) * 100
                            all_sectors[s_name] = round(ret, 2)
                except Exception:
                    continue

        result = {
            "ticker": ticker,
            "company_name": info.get("longName", ticker),
            "sector": sector,
            "industry": industry,
            "sector_etf_performance": sector_perf,
            "stock_performance": stock_perf,
            "relative_performance": relative_perf,
            "all_sectors_1_month_pct": dict(sorted(all_sectors.items(), key=lambda x: x[1], reverse=True)),
            "key_metrics_vs_sector": {
                "pe_ratio": info.get("trailingPE", "N/A"),
                "forward_pe": info.get("forwardPE", "N/A"),
                "price_to_book": info.get("priceToBook", "N/A"),
                "dividend_yield": info.get("dividendYield", "N/A"),
                "market_cap": info.get("marketCap", "N/A"),
            },
            "data_timestamp": datetime.now().isoformat(),
        }

        return _text_result(json.dumps(result, indent=2, default=str))

    except Exception as e:
        return _text_result(f"Error fetching sector context for {ticker}: {e}")


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _text_result(text: str) -> dict[str, Any]:
    """Wrap a string into the MCP tool result format."""
    return {"content": [{"type": "text", "text": text}]}


def _safe_float(value: Any) -> float | str:
    """Safely convert a value to float, returning 'N/A' on failure."""
    if value is None:
        return "N/A"
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return "N/A"


# Export all tools as a list for create_sdk_mcp_server()
ALL_TOOLS = [get_market_data, get_earnings_info, get_news_sentiment, get_sector_context]
