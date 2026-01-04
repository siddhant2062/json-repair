import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Button,
  Textarea,
  Group,
  Stack,
  Text,
  Code,
  Alert,
  CopyButton,
  Tooltip,
  ActionIcon,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { VscCopy, VscCheck, VscWand } from "react-icons/vsc";
import useFile from "../../../store/useFile";

interface ExtractedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  queryParams: Record<string, string>;
  confidence: "high" | "medium" | "low";
  source: string;
}

/**
 * Analyze JSON/text and extract HTTP request information
 */
function analyzeAndExtract(input: string): ExtractedRequest | null {
  const result: ExtractedRequest = {
    url: "",
    method: "GET",
    headers: {},
    body: null,
    queryParams: {},
    confidence: "low",
    source: "",
  };

  // Try to parse as JSON first
  let jsonData: any = null;
  try {
    jsonData = JSON.parse(input);
  } catch {
    // Not JSON, try to extract from text
  }

  if (jsonData && typeof jsonData === "object") {
    // Strategy 1: Look for common API log patterns
    const extracted = extractFromJsonObject(jsonData, result);
    if (extracted.url) {
      return extracted;
    }
  }

  // Strategy 2: Extract from plain text
  const textExtracted = extractFromText(input, result);
  if (textExtracted.url) {
    return textExtracted;
  }

  return null;
}

/**
 * Check if URL is truncated (contains ellipsis or unusual characters)
 */
function isUrlTruncated(url: string): boolean {
  return /…|\.\.\./.test(url) || url.includes("…");
}

/**
 * Reconstruct URL from base URL and query param string
 */
function reconstructUrl(baseUrl: string, queryParamString: string): string {
  if (!baseUrl || !queryParamString) return baseUrl;

  // Remove existing query params from base URL if truncated
  const baseWithoutQuery = baseUrl.split("?")[0];
  return `${baseWithoutQuery}?${queryParamString}`;
}

/**
 * Special handler for API log format with req object
 * Format: { req: { url, requestType, headers, queryParam }, requestBody, headers }
 */
function extractFromApiLogFormat(obj: any): ExtractedRequest | null {
  // Check if this matches the API log format
  const req = obj.req;
  if (!req || typeof req !== "object") return null;

  const result: ExtractedRequest = {
    url: "",
    method: "GET",
    headers: {},
    body: null,
    queryParams: {},
    confidence: "high",
    source: "API Log Format (req object)",
  };

  // Extract URL from req.url
  if (req.url && typeof req.url === "string") {
    result.url = req.url;

    // Check if URL is truncated and reconstruct from queryParam
    if (isUrlTruncated(result.url) && req.queryParam) {
      result.url = reconstructUrl(result.url, req.queryParam);
      result.source = "API Log Format (URL reconstructed from queryParam)";
    }
  }

  // Extract method from req.requestType
  if (req.requestType && typeof req.requestType === "string") {
    const method = req.requestType.toUpperCase();
    if (
      ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
        method,
      )
    ) {
      result.method = method;
    }
  }

  // Extract headers - prefer req.headers, fallback to root headers
  if (req.headers && typeof req.headers === "object") {
    result.headers = { ...req.headers };
  } else if (obj.headers && typeof obj.headers === "object") {
    result.headers = { ...obj.headers };
  }

  // Extract body from requestBody at root level
  if (obj.requestBody !== undefined && obj.requestBody !== null) {
    if (typeof obj.requestBody === "object") {
      result.body = JSON.stringify(obj.requestBody, null, 2);
    } else if (
      typeof obj.requestBody === "string" &&
      obj.requestBody !== "null"
    ) {
      result.body = obj.requestBody;
    }
  }

  // Parse queryParam string into object
  if (req.queryParam && typeof req.queryParam === "string") {
    try {
      const params = new URLSearchParams(req.queryParam);
      params.forEach((value, key) => {
        result.queryParams[key] = value;
      });
    } catch {
      // Ignore parsing errors
    }
  }

  // Add Content-Type header if body exists and no content-type set
  if (
    result.body &&
    !Object.keys(result.headers).some((k) => k.toLowerCase() === "content-type")
  ) {
    result.headers = { "Content-Type": "application/json", ...result.headers };
  }

  return result.url ? result : null;
}

/**
 * Extract request info from JSON object
 */
function extractFromJsonObject(
  obj: any,
  result: ExtractedRequest,
  path: string = "",
): ExtractedRequest {
  // Strategy 1: Try API log format first (most specific)
  const apiLogResult = extractFromApiLogFormat(obj);
  if (apiLogResult) {
    return apiLogResult;
  }

  // Common field names for URL
  const urlFields = [
    "url",
    "uri",
    "endpoint",
    "href",
    "path",
    "api_url",
    "request_url",
    "baseUrl",
    "base_url",
  ];
  // Common field names for method
  const methodFields = [
    "method",
    "http_method",
    "httpMethod",
    "request_method",
    "type",
    "requestType",
  ];
  // Common field names for headers
  const headerFields = [
    "headers",
    "header",
    "requestHeaders",
    "request_headers",
    "httpHeaders",
  ];
  // Common field names for body
  const bodyFields = [
    "body",
    "data",
    "payload",
    "requestBody",
    "request_body",
    "params",
    "json",
  ];
  // Common field names for nested request object
  const requestFields = [
    "request",
    "req",
    "httpRequest",
    "http_request",
    "apiRequest",
  ];
  // Common field names for query params
  const queryParamFields = [
    "queryParam",
    "queryParams",
    "query",
    "searchParams",
    "params",
  ];

  // Check for nested request object first
  for (const field of requestFields) {
    if (obj[field] && typeof obj[field] === "object") {
      const nested = extractFromJsonObject(
        obj[field],
        { ...result },
        `${path}.${field}`,
      );
      if (nested.url) {
        nested.source = `Found in ${field} object`;
        return nested;
      }
    }
  }

  // Extract URL
  for (const field of urlFields) {
    if (obj[field] && typeof obj[field] === "string") {
      const url = obj[field];
      if (url.startsWith("http") || url.startsWith("/")) {
        result.url = url;
        result.confidence = "high";
        result.source = `URL from "${field}" field`;
        break;
      }
    }
  }

  // Extract method
  for (const field of methodFields) {
    if (obj[field] && typeof obj[field] === "string") {
      const method = obj[field].toUpperCase();
      if (
        ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
          method,
        )
      ) {
        result.method = method;
        break;
      }
    }
  }

  // Extract headers
  for (const field of headerFields) {
    if (
      obj[field] &&
      typeof obj[field] === "object" &&
      !Array.isArray(obj[field])
    ) {
      result.headers = { ...result.headers, ...obj[field] };
      break;
    }
  }

  // Extract query params
  for (const field of queryParamFields) {
    if (obj[field]) {
      if (typeof obj[field] === "string") {
        // Parse query string
        try {
          const params = new URLSearchParams(obj[field]);
          params.forEach((value, key) => {
            result.queryParams[key] = value;
          });
        } catch {
          // Ignore
        }
      } else if (typeof obj[field] === "object" && !Array.isArray(obj[field])) {
        result.queryParams = { ...result.queryParams, ...obj[field] };
      }
      break;
    }
  }

  // Reconstruct URL if truncated
  if (
    result.url &&
    isUrlTruncated(result.url) &&
    Object.keys(result.queryParams).length > 0
  ) {
    const baseUrl = result.url.split("?")[0];
    const queryString = new URLSearchParams(result.queryParams).toString();
    result.url = `${baseUrl}?${queryString}`;
    result.source += " (URL reconstructed)";
  }

  // Extract body
  for (const field of bodyFields) {
    if (
      obj[field] !== undefined &&
      obj[field] !== null &&
      obj[field] !== "null"
    ) {
      if (typeof obj[field] === "object") {
        result.body = JSON.stringify(obj[field], null, 2);
      } else if (typeof obj[field] === "string" && obj[field] !== "null") {
        result.body = obj[field];
      }
      // If we have a body, likely it's not a GET
      if (result.body && result.method === "GET") {
        result.method = "POST";
      }
      break;
    }
  }

  // Extract query params if present
  if (
    obj.params &&
    typeof obj.params === "object" &&
    !Array.isArray(obj.params)
  ) {
    result.queryParams = obj.params;
  }
  if (obj.query && typeof obj.query === "object" && !Array.isArray(obj.query)) {
    result.queryParams = { ...result.queryParams, ...obj.query };
  }
  if (obj.queryParams && typeof obj.queryParams === "object") {
    result.queryParams = { ...result.queryParams, ...obj.queryParams };
  }

  // Deep search for URL if not found at top level
  if (!result.url) {
    for (const key in obj) {
      const value = obj[key];
      if (
        typeof value === "string" &&
        (value.startsWith("http://") || value.startsWith("https://"))
      ) {
        result.url = value;
        result.confidence = "medium";
        result.source = `URL found in "${key}" field`;
        break;
      }
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const nested = extractFromJsonObject(
          value,
          { ...result },
          `${path}.${key}`,
        );
        if (nested.url && !result.url) {
          return nested;
        }
      }
    }
  }

  return result;
}

/**
 * Extract request info from plain text
 */
function extractFromText(
  text: string,
  result: ExtractedRequest,
): ExtractedRequest {
  // Find URLs
  const urlPattern = /(https?:\/\/[^\s"'<>]+)/gi;
  const urlMatches = text.match(urlPattern);

  if (urlMatches && urlMatches.length > 0) {
    result.url = urlMatches[0];
    result.confidence = "medium";
    result.source = "URL extracted from text";
  }

  // Find HTTP methods
  const methodPattern = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gi;
  const methodMatches = text.match(methodPattern);

  if (methodMatches && methodMatches.length > 0) {
    result.method = methodMatches[0].toUpperCase();
  }

  // Find JSON-like body in text
  const jsonPattern = /\{[\s\S]*?\}/g;
  const jsonMatches = text.match(jsonPattern);

  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        JSON.parse(match);
        result.body = match;
        if (result.method === "GET") {
          result.method = "POST";
        }
        break;
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  return result;
}

/**
 * Generate cURL command from extracted request
 */
function generateCurl(request: ExtractedRequest): string {
  if (!request.url) return "";

  let curl = "curl";

  // Add method if not GET
  if (request.method !== "GET") {
    curl += ` -X ${request.method}`;
  }

  // Build URL with query params
  let fullUrl = request.url;
  if (Object.keys(request.queryParams).length > 0) {
    const params = new URLSearchParams(request.queryParams);
    const separator = fullUrl.includes("?") ? "&" : "?";
    fullUrl += separator + params.toString();
  }

  curl += ` '${fullUrl}'`;

  // Add headers
  for (const [key, value] of Object.entries(request.headers)) {
    curl += ` \\\n  -H '${key}: ${value}'`;
  }

  // Add body
  if (request.body) {
    const escapedBody = request.body.replace(/'/g, "'\\''");
    curl += ` \\\n  -d '${escapedBody}'`;
  }

  return curl;
}

export const GenerateCurlModal = ({ opened, onClose }: ModalProps) => {
  const contents = useFile((state) => state.contents);
  const [input, setInput] = React.useState("");
  const [extracted, setExtracted] = React.useState<ExtractedRequest | null>(
    null,
  );
  const [generatedCurl, setGeneratedCurl] = React.useState("");

  // Load current editor content when modal opens
  React.useEffect(() => {
    if (opened && contents) {
      setInput(contents);
      analyzeInput(contents);
    }
  }, [opened, contents]);

  const analyzeInput = (text: string) => {
    if (!text.trim()) {
      setExtracted(null);
      setGeneratedCurl("");
      return;
    }

    const result = analyzeAndExtract(text);
    setExtracted(result);

    if (result && result.url) {
      const curl = generateCurl(result);
      setGeneratedCurl(curl);
    } else {
      setGeneratedCurl("");
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    analyzeInput(value);
  };

  const handleAnalyze = () => {
    analyzeInput(input);
    if (extracted?.url) {
      toast.success("cURL generated successfully!");
      gaEvent("generate_curl_success");
    } else {
      toast.error(
        "Could not extract request information. Try adding URL, method, headers, or body fields.",
      );
    }
  };

  const handleClose = () => {
    setInput("");
    setExtracted(null);
    setGeneratedCurl("");
    onClose();
  };

  const confidenceColor = {
    high: "green",
    medium: "yellow",
    low: "red",
  };

  return (
    <Modal
      title="Generate cURL from JSON"
      size="xl"
      opened={opened}
      onClose={handleClose}
      centered
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Paste JSON or text containing API request details. The tool will
          automatically extract URL, method, headers, and body to generate a
          cURL command.
        </Text>

        <Textarea
          placeholder={`Paste JSON like:
{
  "url": "https://api.example.com/users",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  "body": {
    "name": "John"
  }
}`}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          minRows={8}
          maxRows={12}
          autosize
          styles={{
            input: { fontFamily: "monospace", fontSize: "12px" },
          }}
        />

        <Button
          leftSection={<VscWand size={16} />}
          onClick={handleAnalyze}
          disabled={!input.trim()}
        >
          Analyze & Generate cURL
        </Button>

        {extracted && (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={500} fz="sm">
                Extracted Information
              </Text>
              <Badge color={confidenceColor[extracted.confidence]} size="sm">
                {extracted.confidence} confidence
              </Badge>
            </Group>

            {extracted.source && (
              <Text fz="xs" c="dimmed">
                {extracted.source}
              </Text>
            )}

            <Group gap="xs" wrap="wrap">
              {extracted.url && (
                <Badge variant="light" color="blue">
                  URL: {extracted.url.substring(0, 50)}
                  {extracted.url.length > 50 ? "..." : ""}
                </Badge>
              )}
              <Badge variant="light" color="grape">
                Method: {extracted.method}
              </Badge>
              {Object.keys(extracted.headers).length > 0 && (
                <Badge variant="light" color="orange">
                  {Object.keys(extracted.headers).length} headers
                </Badge>
              )}
              {extracted.body && (
                <Badge variant="light" color="green">
                  Body: {extracted.body.length} chars
                </Badge>
              )}
            </Group>
          </Stack>
        )}

        {generatedCurl && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={500} fz="sm">
                Generated cURL
              </Text>
              <CopyButton value={generatedCurl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy cURL"}>
                    <ActionIcon
                      variant="subtle"
                      color={copied ? "green" : "gray"}
                      onClick={copy}
                    >
                      {copied ? <VscCheck size={16} /> : <VscCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
            <ScrollArea.Autosize mah={200}>
              <Code
                block
                fz="xs"
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {generatedCurl}
              </Code>
            </ScrollArea.Autosize>
          </Stack>
        )}

        {!extracted?.url && input.trim() && (
          <Alert color="yellow" variant="light">
            <Text fz="xs">
              Could not find URL. Make sure your JSON has a &quot;url&quot;,
              &quot;uri&quot;, or &quot;endpoint&quot; field, or contains a
              valid HTTP URL.
            </Text>
          </Alert>
        )}

        <Group justify="right">
          <Button variant="default" onClick={handleClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
