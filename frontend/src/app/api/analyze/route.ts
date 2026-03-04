/**
 * POST /api/analyze — Stream a stock analysis report for a given ticker.
 *
 * Uses the Anthropic API with tool_use to call 4 financial data tools,
 * then streams Claude's analysis as Server-Sent Events.
 *
 * Flow:
 *   1. Claude decides which tools to call (non-streaming)
 *   2. Execute all tools in parallel via Promise.all()
 *   3. Send tool results back, stream Claude's analysis as SSE
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  getMarketData,
  getEarningsInfo,
  getNewsSentiment,
  getSectorContext,
} from "@/lib/financial-tools";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `\
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
delayed up to 15 minutes on free data sources.`;

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "get_market_data",
    description:
      "Fetch current market data, price history, and technical indicators (SMA, EMA, RSI, MACD) for a given stock ticker.",
    input_schema: {
      type: "object" as const,
      properties: { ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL)" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_earnings_info",
    description:
      "Fetch the latest quarterly earnings data including EPS and revenue vs estimates for the last 4 quarters, and the next earnings date.",
    input_schema: {
      type: "object" as const,
      properties: { ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL)" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_news_sentiment",
    description:
      "Fetch recent news headlines and sentiment for a given stock ticker.",
    input_schema: {
      type: "object" as const,
      properties: { ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL)" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_sector_context",
    description:
      "Fetch sector-level context including sector ETF performance, peer comparison, and relative performance within sector.",
    input_schema: {
      type: "object" as const,
      properties: { ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL)" } },
      required: ["ticker"],
    },
  },
];

// Route tool names to implementations
async function executeTool(name: string, input: { ticker: string }): Promise<string> {
  const ticker = input.ticker.toUpperCase().trim();
  switch (name) {
    case "get_market_data":
      return getMarketData(ticker);
    case "get_earnings_info":
      return getEarningsInfo(ticker);
    case "get_news_sentiment":
      return getNewsSentiment(ticker);
    case "get_sector_context":
      return getSectorContext(ticker);
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Source metadata builder ─────────────────────────────────────────

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

  const toolToSource: Record<string, { sourceName: string; label: string }> = {
    get_market_data: { sourceName: "Yahoo Finance", label: "Market data & technicals" },
    get_earnings_info: { sourceName: "Yahoo Finance", label: "Earnings data" },
    get_news_sentiment: {
      sourceName: hasFinnhub ? "Finnhub" : "Yahoo Finance",
      label: "News & sentiment",
    },
    get_sector_context: { sourceName: "Yahoo Finance", label: "Sector context" },
  };

  // Group tools by source, preserving insertion order
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

  // Always include Claude as the AI synthesis source
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

// ── Route handler ───────────────────────────────────────────────────

const TICKER_PATTERN = /^[A-Z]{1,5}$/;

export async function POST(request: Request) {
  const body = await request.json();
  const ticker = String(body.ticker ?? "")
    .toUpperCase()
    .trim();

  if (!TICKER_PATTERN.test(ticker)) {
    return Response.json(
      { detail: "Invalid ticker symbol. Use 1-5 letters (e.g., AAPL)." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const prompt = `Analyze ${ticker} stock — provide market data, earnings, news sentiment, and sector context.`;
        const messages: Anthropic.Messages.MessageParam[] = [
          { role: "user", content: prompt },
        ];

        // Step 1: Ask Claude which tools to call (non-streaming, fast)
        const toolResponse = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        });

        // Step 2: Execute requested tools in parallel
        const toolUseBlocks = toolResponse.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
        );

        if (toolUseBlocks.length > 0) {
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const result = await executeTool(
                block.name,
                block.input as { ticker: string },
              );
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result,
              };
            }),
          );

          // Send data source metadata to the client
          const executedToolNames = toolUseBlocks.map((b) => b.name);
          const sources = buildSourceMetadata(executedToolNames, ticker);
          send({ type: "sources", sources });

          // Step 3: Send tool results and stream the analysis
          messages.push({ role: "assistant", content: toolResponse.content });
          messages.push({ role: "user", content: toolResults });

          const analysisStream = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
            stream: true,
          });

          for await (const event of analysisStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send({ type: "text", content: event.delta.text });
            }
          }
        } else {
          // Claude responded with text directly (unlikely but handle it)
          for (const block of toolResponse.content) {
            if (block.type === "text") {
              send({ type: "text", content: block.text });
            }
          }
        }

        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "An unexpected error occurred.",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
