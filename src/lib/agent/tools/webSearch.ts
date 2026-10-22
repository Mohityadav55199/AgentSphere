import { DynamicTool } from "@langchain/core/tools";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Searches DuckDuckGo HTML endpoint without requiring any API keys.
 * Returns structured search results (title, snippet, link).
 */
async function searchDuckDuckGo(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return searchDuckDuckGoInstant(query);
    }

    const html = await res.text();
    const results: SearchResult[] = [];

    // Extract search snippets using regex from DuckDuckGo HTML
    const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
    let match;
    while ((match = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
      const block = match[1];

      // Title & Link
      const titleMatch = /<a class="result__url" href="([^"]+)">/i.exec(block);
      const snippetMatch = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/i.exec(block);
      const titleTextMatch = /<a class="result__title"[^>]*>([\s\S]*?)<\/a>/i.exec(block);

      let link = titleMatch?.[1] || "";
      if (link.startsWith("//")) link = `https:${link}`;
      if (link.includes("uddg=")) {
        const decoded = decodeURIComponent(link.split("uddg=")[1]?.split("&")[0] || "");
        if (decoded) link = decoded;
      }

      const cleanText = (str: string) =>
        str
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();

      const title = cleanText(titleTextMatch?.[1] || "Search Result");
      const snippet = cleanText(snippetMatch?.[1] || "");

      if (title && (snippet || link)) {
        results.push({ title, link, snippet });
      }
    }

    if (results.length > 0) return results;
    return searchDuckDuckGoInstant(query);
  } catch (err) {
    console.warn("DuckDuckGo HTML search failed, falling back to Instant API:", err);
    return searchDuckDuckGoInstant(query);
  }
}

/**
 * Fallback to DuckDuckGo Instant Answer API
 */
async function searchDuckDuckGoInstant(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();

    const results: SearchResult[] = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        link: data.AbstractURL || "https://duckduckgo.com",
        snippet: data.AbstractText,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 60) + "...",
            link: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Creates the built-in web search tool available to Researcher out-of-the-box
 */
export function createWebSearchTool(): DynamicTool {
  return new DynamicTool({
    name: "web_search",
    description:
      "Search the live web for real-time information, documentation, news, or technical references. Input should be a concise search query string.",
    func: async (query: string) => {
      const cleanQuery = typeof query === "string" ? query.trim() : JSON.stringify(query);
      if (!cleanQuery) return "No query provided for search.";

      // Check for Tavily API key if user provided one
      if (process.env.TAVILY_API_KEY) {
        try {
          const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query: cleanQuery,
              max_results: 5,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (tavilyRes.ok) {
            const data = await tavilyRes.json();
            if (data.results?.length) {
              return data.results
                .map(
                  (r: { title: string; url: string; content: string }) =>
                    `Title: ${r.title}\nURL: ${r.url}\nSummary: ${r.content}\n`,
                )
                .join("\n---\n");
            }
          }
        } catch (e) {
          console.warn("Tavily search failed, falling back to DuckDuckGo:", e);
        }
      }

      function extractDomain(link: string): string {
        try {
          const u = new URL(link);
          return u.hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      }

      // Default DuckDuckGo search (zero configuration required)
      const results = await searchDuckDuckGo(cleanQuery);
      if (results.length === 0) {
        return `No live web results found for "${cleanQuery}". You may rely on your internal knowledge.`;
      }

      return results
        .map((r, idx) => {
          const domain = extractDomain(r.link);
          return `[${idx + 1}] ${r.title}${domain ? ` (${domain})` : ""}\nURL: ${r.link}\nSnippet: ${r.snippet}\n`;
        })
        .join("\n---\n");
    },
  });
}
