import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API Proxy endpoint to bypass CORS restrictions
 * This allows the cURL import feature to execute requests to any URL
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url, method = "GET", headers = {}, body } = req.body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        ...headers,
        // Remove host header as it will be set by fetch
        host: undefined,
      },
    };

    // Add body for non-GET requests
    if (body && method.toUpperCase() !== "GET") {
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }

    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    fetchOptions.signal = controller.signal;

    // Make the request
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get response body as text first
    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    let responseBody: any;
    let isJsonParsed = false;

    // Try to parse as JSON if content-type suggests it or if it looks like JSON
    if (
      contentType.includes("application/json") ||
      rawText.trim().startsWith("{") ||
      rawText.trim().startsWith("[")
    ) {
      try {
        responseBody = JSON.parse(rawText);
        isJsonParsed = true;
      } catch {
        // If JSON parsing fails, return raw text
        responseBody = rawText;
      }
    } else {
      responseBody = rawText;
    }

    // Return the proxied response
    // If response is already parsed JSON, return as object
    // If it's text, return it with a flag so client knows how to handle it
    return res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      isJsonParsed,
      rawLength: rawText.length,
    });
  } catch (error: any) {
    console.error("Proxy error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout (30s)" });
    }

    if (error.code === "ECONNREFUSED") {
      return res
        .status(502)
        .json({ error: "Connection refused - server may be down" });
    }

    if (error.code === "ENOTFOUND") {
      return res.status(502).json({ error: "Host not found - check the URL" });
    }

    return res.status(500).json({
      error: error.message || "Proxy request failed",
      details: error.code || error.name,
    });
  }
}

// Increase body size limit for large payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
