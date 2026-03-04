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
      setStatus((prev) => (prev === "streaming" ? "done" : prev));
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
