/**
 * Financial data tools — TypeScript port of the Python MCP tools.
 *
 * Uses yahoo-finance2 for market data and the Finnhub API for news.
 * Each function returns a JSON string matching the Python tools' output
 * so Claude generates the same quality analysis.
 */

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

// ──────────────────────────────────────────────
// Tool 1: Market Data & Technical Indicators
// ──────────────────────────────────────────────

export async function getMarketData(ticker: string): Promise<string> {
  try {
    const [quoteResult, chartResult] = await Promise.all([
      yf.quote(ticker),
      yf.chart(ticker, { period1: daysAgo(365), period2: new Date(), interval: "1d" }),
    ]);

    const closes = chartResult.quotes
      .map((q) => q.close)
      .filter((c): c is number => c != null);

    if (closes.length === 0) {
      return `No market data found for ticker '${ticker}'.`;
    }

    const currentPrice = closes[closes.length - 1];
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
    const dayChange = currentPrice - prevClose;
    const dayChangePct = (dayChange / prevClose) * 100;

    const high52w = Math.max(...closes);
    const low52w = Math.min(...closes);

    // Moving averages
    const sma20 = avg(closes.slice(-20));
    const sma50 = avg(closes.slice(-50));
    const sma200 = closes.length >= 200 ? avg(closes.slice(-200)) : null;
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);

    // RSI (14-day)
    const rsi = calcRSI(closes, 14);

    // MACD
    const macdLine = ema12 - ema26;
    const macdSeries = closes.map((_, i) => {
      const slice = closes.slice(0, i + 1);
      return ema(slice, 12) - ema(slice, 26);
    });
    const signalLine = ema(macdSeries, 9);
    const macdHistogram = macdLine - signalLine;

    const result = {
      ticker,
      company_name: quoteResult.longName ?? quoteResult.shortName ?? ticker,
      sector: (quoteResult as Record<string, unknown>).sector ?? "N/A",
      industry: (quoteResult as Record<string, unknown>).industry ?? "N/A",
      current_price: round(currentPrice),
      day_change: round(dayChange),
      day_change_pct: round(dayChangePct),
      volume: quoteResult.regularMarketVolume ?? 0,
      market_cap: quoteResult.marketCap ?? "N/A",
      beta: (quoteResult as Record<string, unknown>).beta ?? "N/A",
      pe_ratio: quoteResult.trailingPE ?? "N/A",
      forward_pe: quoteResult.forwardPE ?? "N/A",
      "52_week_high": round(high52w),
      "52_week_low": round(low52w),
      technical_indicators: {
        sma_20: round(sma20),
        sma_50: round(sma50),
        sma_200: sma200 != null ? round(sma200) : "Insufficient data",
        ema_12: round(ema12),
        ema_26: round(ema26),
        rsi_14: rsi != null ? round(rsi) : "N/A",
        macd_line: round(macdLine),
        macd_signal: round(signalLine),
        macd_histogram: round(macdHistogram),
      },
      patterns: {
        above_sma_20: currentPrice > sma20,
        above_sma_50: currentPrice > sma50,
        above_sma_200: sma200 != null ? currentPrice > sma200 : null,
        golden_cross: sma200 != null ? sma50 > sma200 : null,
        rsi_overbought: rsi != null ? rsi > 70 : null,
        rsi_oversold: rsi != null ? rsi < 30 : null,
        macd_bullish: macdLine > signalLine,
      },
      data_timestamp: new Date().toISOString(),
    };

    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error fetching market data for ${ticker}: ${e instanceof Error ? e.message : e}`;
  }
}

// ──────────────────────────────────────────────
// Tool 2: Earnings Information
// ──────────────────────────────────────────────

export async function getEarningsInfo(ticker: string): Promise<string> {
  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["earnings", "earningsTrend", "earningsHistory", "financialData", "defaultKeyStatistics"],
    });

    const earningsChart = summary.earnings?.earningsChart;
    const quarterlyEarnings = (earningsChart?.quarterly ?? []).map((q) => ({
      quarter: q.date,
      eps_estimate: q.estimate ?? "N/A",
      eps_actual: q.actual ?? "N/A",
      eps_surprise_pct:
        q.actual != null && q.estimate != null && q.estimate !== 0
          ? round(((q.actual - q.estimate) / Math.abs(q.estimate)) * 100, 4)
          : "N/A",
    }));

    // Revenue from financials chart
    const financialsChart = summary.earnings?.financialsChart;
    const revenueData = (financialsChart?.quarterly ?? []).map((q) => ({
      quarter: q.date,
      revenue: q.revenue ?? "N/A",
    }));

    // Next earnings date
    const earningsDates = earningsChart?.earningsDate;
    const nextEarnings =
      earningsDates && earningsDates.length > 0
        ? earningsDates[0].toISOString().split("T")[0]
        : "Not available";

    const result = {
      ticker,
      company_name: summary.financialData?.currentPrice != null ? ticker : ticker,
      quarterly_earnings: quarterlyEarnings,
      quarterly_revenue: revenueData,
      next_earnings_date: nextEarnings,
      trailing_eps: summary.defaultKeyStatistics?.trailingEps ?? "N/A",
      forward_eps: summary.defaultKeyStatistics?.forwardEps ?? "N/A",
      peg_ratio: summary.defaultKeyStatistics?.pegRatio ?? "N/A",
      data_timestamp: new Date().toISOString(),
    };

    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error fetching earnings data for ${ticker}: ${e instanceof Error ? e.message : e}`;
  }
}

// ──────────────────────────────────────────────
// Tool 3: News & Sentiment
// ──────────────────────────────────────────────

export async function getNewsSentiment(ticker: string): Promise<string> {
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (finnhubKey) {
    return fetchFinnhubNews(ticker, finnhubKey);
  }
  return fetchYahooNews(ticker);
}

async function fetchFinnhubNews(ticker: string, apiKey: string): Promise<string> {
  try {
    const today = new Date();
    const fromDate = new Date(today.getTime() - 30 * 86400000).toISOString().split("T")[0];
    const toDate = today.toISOString().split("T")[0];

    const [newsResp, sentResp] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${apiKey}`,
      ),
      fetch(`https://finnhub.io/api/v1/news-sentiment?symbol=${ticker}&token=${apiKey}`),
    ]);

    const articles = (await newsResp.json()) as Array<Record<string, unknown>>;
    const sentimentData = sentResp.ok ? ((await sentResp.json()) as Record<string, unknown>) : {};

    const newsItems = articles.slice(0, 15).map((a) => ({
      headline: a.headline ?? "",
      source: a.source ?? "",
      url: a.url ?? "",
      datetime: new Date(((a.datetime as number) ?? 0) * 1000).toISOString(),
      summary: String(a.summary ?? "").slice(0, 200),
    }));

    return JSON.stringify(
      {
        ticker,
        source: "Finnhub",
        news_count: newsItems.length,
        articles: newsItems,
        overall_sentiment: sentimentData.sentiment ?? {},
        buzz: sentimentData.buzz ?? {},
        data_timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  } catch (e) {
    return `Error fetching Finnhub news for ${ticker}: ${e instanceof Error ? e.message : e}`;
  }
}

async function fetchYahooNews(ticker: string): Promise<string> {
  try {
    const searchResult = await yf.search(ticker, { newsCount: 15 });
    const newsItems = (searchResult.news ?? []).map((n) => ({
      headline: n.title ?? "",
      source: n.publisher ?? "Unknown",
      url: n.link ?? "",
      datetime: n.providerPublishTime
        ? new Date(
            typeof n.providerPublishTime === "number"
              ? n.providerPublishTime * 1000
              : n.providerPublishTime,
          ).toISOString()
        : "",
    }));

    return JSON.stringify(
      {
        ticker,
        source: "Yahoo Finance",
        news_count: newsItems.length,
        articles: newsItems,
        note: "Set FINNHUB_API_KEY for sentiment scoring and richer news data.",
        data_timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  } catch (e) {
    return `Error fetching Yahoo Finance news for ${ticker}: ${e instanceof Error ? e.message : e}`;
  }
}

// ──────────────────────────────────────────────
// Tool 4: Sector Context
// ──────────────────────────────────────────────

const SECTOR_ETFS: Record<string, string> = {
  Technology: "XLK",
  Financials: "XLF",
  Healthcare: "XLV",
  Energy: "XLE",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  Industrials: "XLI",
  Materials: "XLB",
  "Real Estate": "XLRE",
  Utilities: "XLU",
  "Communication Services": "XLC",
};

export async function getSectorContext(ticker: string): Promise<string> {
  try {
    const quoteResult = await yf.quote(ticker);
    const sector = String((quoteResult as Record<string, unknown>).sector ?? "Unknown");
    const industry = String((quoteResult as Record<string, unknown>).industry ?? "Unknown");
    const sectorEtfSymbol = SECTOR_ETFS[sector];

    // Fetch 3-month charts for stock and sector ETF
    const period1 = daysAgo(90);
    const chartOpts = { period1, period2: new Date(), interval: "1d" as const };
    const stockChart = await yf.chart(ticker, chartOpts);
    const etfChart = sectorEtfSymbol ? await yf.chart(sectorEtfSymbol, chartOpts) : null;

    const stockCloses = stockChart.quotes.map((q) => q.close).filter((c): c is number => c != null);
    const stockPerf = calcPerformance(stockCloses);

    let sectorPerf: Record<string, unknown> = {};
    if (etfChart) {
      const etfCloses = etfChart.quotes.map((q) => q.close).filter((c): c is number => c != null);
      const perf = calcPerformance(etfCloses);
      sectorPerf = {
        etf_symbol: sectorEtfSymbol,
        etf_price: perf.current != null ? round(perf.current) : "N/A",
        "1_month_return_pct": perf.oneMonth,
        "3_month_return_pct": perf.threeMonth,
      };
    }

    // Relative performance
    let relativePerf: Record<string, unknown> = {};
    if (sectorPerf["1_month_return_pct"] != null && stockPerf.oneMonth != null) {
      relativePerf = {
        "1_month_vs_sector": round(
          (stockPerf.oneMonth as number) - (sectorPerf["1_month_return_pct"] as number),
        ),
        "3_month_vs_sector": round(
          (stockPerf.threeMonth as number) - (sectorPerf["3_month_return_pct"] as number),
        ),
        outperforming_sector_1m:
          (stockPerf.oneMonth as number) > (sectorPerf["1_month_return_pct"] as number),
        outperforming_sector_3m:
          (stockPerf.threeMonth as number) > (sectorPerf["3_month_return_pct"] as number),
      };
    }

    // Fetch all sector ETF quotes for broad context
    const allSectorSymbols = Object.values(SECTOR_ETFS);
    const allSectorQuotes = await yf.quote(allSectorSymbols);
    const allSectors: Record<string, number> = {};
    const quotesArray = Array.isArray(allSectorQuotes) ? allSectorQuotes : [allSectorQuotes];
    for (const q of quotesArray) {
      const symbol = q.symbol;
      const name = Object.entries(SECTOR_ETFS).find(([, v]) => v === symbol)?.[0];
      if (name && q.regularMarketChangePercent != null) {
        allSectors[name] = round(q.regularMarketChangePercent);
      }
    }
    // Sort by performance descending
    const sortedSectors = Object.fromEntries(
      Object.entries(allSectors).sort(([, a], [, b]) => b - a),
    );

    const result = {
      ticker,
      company_name: quoteResult.longName ?? quoteResult.shortName ?? ticker,
      sector,
      industry,
      sector_etf_performance: sectorPerf,
      stock_performance: {
        "1_month_return_pct": stockPerf.oneMonth,
        "3_month_return_pct": stockPerf.threeMonth,
      },
      relative_performance: relativePerf,
      all_sectors_daily_change_pct: sortedSectors,
      key_metrics_vs_sector: {
        pe_ratio: quoteResult.trailingPE ?? "N/A",
        forward_pe: quoteResult.forwardPE ?? "N/A",
        price_to_book: quoteResult.priceToBook ?? "N/A",
        dividend_yield: (quoteResult as Record<string, unknown>).dividendYield ?? "N/A",
        market_cap: quoteResult.marketCap ?? "N/A",
      },
      data_timestamp: new Date().toISOString(),
    };

    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error fetching sector context for ${ticker}: ${e instanceof Error ? e.message : e}`;
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(data: number[], span: number): number {
  if (data.length === 0) return 0;
  const k = 2 / (span + 1);
  let result = data[0];
  for (let i = 1; i < data.length; i++) {
    result = data[i] * k + result * (1 - k);
  }
  return result;
}

function calcRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const recent = deltas.slice(-period);
  const gains = recent.filter((d) => d > 0);
  const losses = recent.filter((d) => d < 0).map((d) => -d);
  const avgGain = gains.length > 0 ? avg(gains) : 0;
  const avgLoss = losses.length > 0 ? avg(losses) : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

function calcPerformance(closes: number[]) {
  if (closes.length < 2)
    return { current: null, oneMonth: null, threeMonth: null };
  const current = closes[closes.length - 1];
  const oneMonthAgo = closes.length >= 22 ? closes[closes.length - 22] : closes[0];
  const threeMonthAgo = closes[0];
  return {
    current,
    oneMonth: round(((current - oneMonthAgo) / oneMonthAgo) * 100),
    threeMonth: round(((current - threeMonthAgo) / threeMonthAgo) * 100),
  };
}
