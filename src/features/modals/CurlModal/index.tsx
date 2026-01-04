import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Button,
  Textarea,
  Group,
  Stack,
  Text,
  SegmentedControl,
  Badge,
  Code,
  Alert,
  Loader,
  TextInput,
  Select,
  ActionIcon,
  Table,
  Tabs,
  ScrollArea,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { VscAdd, VscTrash, VscCopy, VscCheck } from "react-icons/vsc";
import useFile from "../../../store/useFile";

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  isValid: boolean;
  error?: string;
}

/**
 * Parse a cURL command string into its components
 */
function parseCurlCommand(curlString: string): ParsedCurl {
  const result: ParsedCurl = {
    url: "",
    method: "GET",
    headers: {},
    body: null,
    isValid: false,
  };

  try {
    // IMPORTANT: Extract body data FIRST before any whitespace normalization
    // This preserves data that may contain newlines/whitespace
    const originalInput = curlString;

    // Extract body data (-d, --data, --data-raw, --data-binary) from ORIGINAL input
    // Use [\s\S]*? to match ANY character including newlines (non-greedy)
    const dataPatterns = [
      /(?:--data-raw|--data-binary|-d|--data)\s+'([\s\S]*?)'/gi,
      /(?:--data-raw|--data-binary|-d|--data)\s+"([\s\S]*?)"/gi,
      /(?:--data-raw|--data-binary|-d|--data)\s+\$'([\s\S]*?)'/gi, // $'...' syntax
    ];

    for (const pattern of dataPatterns) {
      const dataMatch = pattern.exec(originalInput);
      if (dataMatch) {
        // Trim only leading/trailing whitespace from the body, preserve internal content
        result.body = dataMatch[1].trim();
        break;
      }
    }

    // Now clean up for other parsing (URL, method, headers)
    let cleaned = curlString
      .replace(/\\\n/g, " ") // Remove line continuations
      .replace(/\\\r\n/g, " ")
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Check if it starts with curl
    if (!cleaned.toLowerCase().startsWith("curl")) {
      // Maybe it's just JSON data - try to detect
      const trimmed = cleaned.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        result.body = trimmed;
        result.isValid = true;
        return result;
      }
      result.error = "Input doesn't appear to be a cURL command";
      return result;
    }

    // Remove 'curl' prefix
    cleaned = cleaned.substring(4).trim();

    // Extract URL (can be quoted or unquoted)
    const urlPatterns = [
      /['"]([^'"]+)['"]/g, // Quoted URLs
      /(https?:\/\/[^\s]+)/g, // Unquoted URLs
    ];

    // Find all potential URLs
    const urls: string[] = [];
    for (const pattern of urlPatterns) {
      const matches = cleaned.matchAll(pattern);
      for (const match of matches) {
        const potential = match[1];
        if (potential.startsWith("http")) {
          urls.push(potential);
        }
      }
    }

    if (urls.length > 0) {
      result.url = urls[0];
    }

    // Extract method (-X or --request)
    const methodMatch = cleaned.match(
      /-X\s+['"]?(\w+)['"]?|--request\s+['"]?(\w+)['"]?/i,
    );
    if (methodMatch) {
      result.method = (methodMatch[1] || methodMatch[2]).toUpperCase();
    }

    // Extract headers (-H or --header)
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cleaned)) !== null) {
      const headerStr = headerMatch[1];
      const colonIndex = headerStr.indexOf(":");
      if (colonIndex > 0) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        result.headers[key] = value;
      }
    }

    // If body wasn't found with patterns, try to find JSON body
    if (!result.body) {
      const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[1]);
          result.body = jsonMatch[1];
        } catch {
          // Not valid JSON, ignore
        }
      }
    }

    // If method wasn't explicitly set and we have body, default to POST
    if (result.body && !methodMatch) {
      result.method = "POST";
    }

    result.isValid = result.url.length > 0 || result.body !== null;

    if (!result.isValid) {
      result.error = "Could not extract URL or JSON body from cURL command";
    }
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : "Failed to parse cURL command";
  }

  return result;
}

interface CurlValidationIssue {
  type: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

/**
 * Validate a cURL command and return any issues found
 */
function validateCurlCommand(curlString: string): CurlValidationIssue[] {
  const issues: CurlValidationIssue[] = [];

  if (!curlString.trim()) {
    return issues;
  }

  const cleaned = curlString
    .replace(/\\\n/g, " ")
    .replace(/\\\r\n/g, " ")
    .trim();

  // Check 1: Doesn't start with curl
  if (!cleaned.toLowerCase().startsWith("curl")) {
    issues.push({
      type: "warning",
      message: "Command doesn't start with 'curl'",
      suggestion: "Add 'curl' at the beginning of your command",
    });
  }

  // Check 2: Escaped quotes inside URL
  if (/['"][^'"]*\\['"][^'"]*['"]/.test(cleaned)) {
    issues.push({
      type: "error",
      message: "Escaped quote (\\' or \\\") found inside URL",
      suggestion: "Remove the backslash before quotes in the URL",
    });
  }

  // Check 3: Truncated URL (ellipsis)
  if (/…|\.\.\./.test(cleaned)) {
    issues.push({
      type: "error",
      message: "URL appears to be truncated (contains '…' or '...')",
      suggestion: "Paste the complete URL without truncation",
    });
  }

  // Check 4: Stray backslash at end of URL before quote
  if (/\\['"]/.test(cleaned) && !/\\\\['"]/.test(cleaned)) {
    issues.push({
      type: "error",
      message: "Stray backslash before quote detected",
      suggestion: "Remove the backslash before the closing quote",
    });
  }

  // Check 5: Missing Content-Type for POST/PUT/PATCH with body
  const hasBody = /-d\s|--data/.test(cleaned);
  const hasContentType = /content-type/i.test(cleaned);
  const method =
    cleaned.match(/-X\s+['"]?(\w+)['"]?/i)?.[1]?.toUpperCase() ||
    (hasBody ? "POST" : "GET");

  if (hasBody && !hasContentType && ["POST", "PUT", "PATCH"].includes(method)) {
    issues.push({
      type: "warning",
      message: `Missing Content-Type header for ${method} request with body`,
      suggestion: "Add -H 'Content-Type: application/json' for JSON data",
    });
  }

  // Check 6: Unclosed quotes
  const singleQuotes = (cleaned.match(/'/g) || []).length;
  const doubleQuotes = (cleaned.match(/"/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    issues.push({
      type: "error",
      message: "Unclosed single quote detected",
      suggestion: "Check that all single quotes are properly paired",
    });
  }

  if (doubleQuotes % 2 !== 0) {
    issues.push({
      type: "error",
      message: "Unclosed double quote detected",
      suggestion: "Check that all double quotes are properly paired",
    });
  }

  // Check 7: No URL found
  const hasUrl = /https?:\/\//.test(cleaned);
  if (!hasUrl && cleaned.toLowerCase().startsWith("curl")) {
    issues.push({
      type: "error",
      message: "No URL found in cURL command",
      suggestion: "Add the target URL (must start with http:// or https://)",
    });
  }

  // Check 8: Invalid HTTP method
  const methodMatch = cleaned.match(/-X\s+['"]?(\w+)['"]?/i);
  if (methodMatch) {
    const specifiedMethod = methodMatch[1].toUpperCase();
    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
      "CONNECT",
      "TRACE",
    ];
    if (!validMethods.includes(specifiedMethod)) {
      issues.push({
        type: "error",
        message: `Invalid HTTP method: ${specifiedMethod}`,
        suggestion: `Use a valid method: ${validMethods.slice(0, 5).join(", ")}`,
      });
    }
  }

  // Check 9: Malformed header (missing colon)
  const headerMatches = cleaned.matchAll(
    /(?:-H|--header)\s+['"]([^'"]+)['"]/gi,
  );
  for (const match of headerMatches) {
    const header = match[1];
    if (!header.includes(":")) {
      issues.push({
        type: "error",
        message: `Malformed header: "${header}"`,
        suggestion: "Headers must be in 'Key: Value' format",
      });
    }
  }

  // Check 10: Body is not valid JSON (if it looks like JSON)
  const bodyMatch = cleaned.match(
    /(?:--data-raw|--data-binary|-d|--data)\s+['"](\{[\s\S]*?\}|\[[\s\S]*?\])['"]/,
  );
  if (bodyMatch) {
    try {
      JSON.parse(bodyMatch[1]);
    } catch {
      issues.push({
        type: "warning",
        message: "Request body appears to be JSON but is malformed",
        suggestion: "Use the Repair JSON feature to fix the body",
      });
    }
  }

  // Check 11: Using deprecated --data-urlencode with JSON
  if (/--data-urlencode/.test(cleaned) && /application\/json/i.test(cleaned)) {
    issues.push({
      type: "warning",
      message: "--data-urlencode is typically for form data, not JSON",
      suggestion: "Use -d or --data-raw for JSON payloads",
    });
  }

  // Check 12: Multiple body flags
  const bodyFlags = (
    cleaned.match(/-d\s|--data\s|--data-raw\s|--data-binary\s/g) || []
  ).length;
  if (bodyFlags > 1) {
    issues.push({
      type: "info",
      message: "Multiple data flags detected",
      suggestion: "This will concatenate all data - is this intentional?",
    });
  }

  return issues;
}

type ImportMode = "extract" | "execute";
type TabMode = "curl" | "builder";

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export const CurlModal = ({ opened, onClose }: ModalProps) => {
  const setContents = useFile((state) => state.setContents);

  // cURL paste mode state
  const [curlInput, setCurlInput] = React.useState("");
  const [mode, setMode] = React.useState<ImportMode>("extract");
  const [loading, setLoading] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedCurl | null>(null);
  const [validationIssues, setValidationIssues] = React.useState<
    CurlValidationIssue[]
  >([]);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<TabMode>("curl");

  // Request Builder state
  const [builderUrl, setBuilderUrl] = React.useState("");
  const [builderMethod, setBuilderMethod] = React.useState("GET");
  const [builderHeaders, setBuilderHeaders] = React.useState<HeaderRow[]>([
    {
      id: generateId(),
      key: "Content-Type",
      value: "application/json",
      enabled: true,
    },
    {
      id: generateId(),
      key: "Accept",
      value: "application/json",
      enabled: true,
    },
  ]);
  const [builderParams, setBuilderParams] = React.useState<QueryParam[]>([
    { id: generateId(), key: "", value: "", enabled: true },
  ]);
  const [builderBody, setBuilderBody] = React.useState("");
  const [responseTime, setResponseTime] = React.useState<number | null>(null);
  const [responseSize, setResponseSize] = React.useState<number | null>(null);

  // Parse curl as user types
  React.useEffect(() => {
    if (curlInput.trim()) {
      const result = parseCurlCommand(curlInput);
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [curlInput]);

  // Build URL with query params
  const getFullUrl = React.useCallback(() => {
    if (!builderUrl) return "";

    const enabledParams = builderParams.filter(
      (p) => p.enabled && p.key.trim(),
    );
    if (enabledParams.length === 0) return builderUrl;

    const url = new URL(
      builderUrl.startsWith("http") ? builderUrl : `http://${builderUrl}`,
    );
    enabledParams.forEach((p) => {
      url.searchParams.append(p.key, p.value);
    });

    return url.toString();
  }, [builderUrl, builderParams]);

  // Generate cURL command from builder
  const generateCurlFromBuilder = React.useCallback(() => {
    if (!builderUrl) return "";

    let curl = "curl";

    // Add method if not GET
    if (builderMethod !== "GET") {
      curl += ` -X ${builderMethod}`;
    }

    // Add URL
    const fullUrl = getFullUrl();
    curl += ` '${fullUrl}'`;

    // Add headers
    const enabledHeaders = builderHeaders.filter(
      (h) => h.enabled && h.key.trim(),
    );
    enabledHeaders.forEach((h) => {
      curl += ` \\\n  -H '${h.key}: ${h.value}'`;
    });

    // Add body for non-GET requests
    if (builderBody.trim() && builderMethod !== "GET") {
      // Escape single quotes in body
      const escapedBody = builderBody.replace(/'/g, "'\\''");
      curl += ` \\\n  -d '${escapedBody}'`;
    }

    return curl;
  }, [builderUrl, builderMethod, builderHeaders, builderBody, getFullUrl]);

  // Header management
  const addHeader = () => {
    setBuilderHeaders([
      ...builderHeaders,
      { id: generateId(), key: "", value: "", enabled: true },
    ]);
  };

  const removeHeader = (id: string) => {
    setBuilderHeaders(builderHeaders.filter((h) => h.id !== id));
  };

  const updateHeader = (
    id: string,
    field: "key" | "value" | "enabled",
    value: string | boolean,
  ) => {
    setBuilderHeaders(
      builderHeaders.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    );
  };

  // Query param management
  const addParam = () => {
    setBuilderParams([
      ...builderParams,
      { id: generateId(), key: "", value: "", enabled: true },
    ]);
  };

  const removeParam = (id: string) => {
    setBuilderParams(builderParams.filter((p) => p.id !== id));
  };

  const updateParam = (
    id: string,
    field: "key" | "value" | "enabled",
    value: string | boolean,
  ) => {
    setBuilderParams(
      builderParams.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  // Execute request from builder
  const executeFromBuilder = async () => {
    if (!builderUrl) {
      toast.error("URL is required");
      return;
    }

    setLoading(true);
    setResponseTime(null);
    setResponseSize(null);
    const startTime = performance.now();

    try {
      const fullUrl = getFullUrl();
      const enabledHeaders = builderHeaders.filter(
        (h) => h.enabled && h.key.trim(),
      );
      const headersObj: Record<string, string> = {};
      enabledHeaders.forEach((h) => {
        headersObj[h.key] = h.value;
      });

      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fullUrl,
          method: builderMethod,
          headers: headersObj,
          body: builderBody.trim() || undefined,
        }),
      });

      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));

      const proxyResult = await proxyResponse.json();

      if (!proxyResponse.ok) {
        throw new Error(
          proxyResult.error || `Proxy error: ${proxyResponse.status}`,
        );
      }

      const responseBody = proxyResult.body;
      let formatted: string;

      if (typeof responseBody === "object") {
        formatted = JSON.stringify(responseBody, null, 2);
      } else if (typeof responseBody === "string") {
        try {
          const json = JSON.parse(responseBody);
          formatted = JSON.stringify(json, null, 2);
        } catch {
          formatted = responseBody;
        }
      } else {
        formatted = String(responseBody);
      }

      setResponseSize(new Blob([formatted]).size);
      setContents({ contents: formatted });
      toast.success(
        `Response loaded (${proxyResult.status}) - ${Math.round(endTime - startTime)}ms`,
      );
      gaEvent("curl_builder_execute");

      handleClose();
    } catch (error) {
      console.error("Builder execute error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to execute request",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = () => {
    if (!parsed) return;

    // If we have a body, use that
    if (parsed.body) {
      try {
        // Try to format the JSON
        const formatted = JSON.stringify(JSON.parse(parsed.body), null, 2);
        setContents({ contents: formatted });
        toast.success("JSON extracted from cURL command");
        gaEvent("curl_extract_body");
      } catch {
        // Not valid JSON, but still set it
        setContents({ contents: parsed.body });
        toast.success("Body extracted (may need repair)");
      }
      handleClose();
      return;
    }

    // If no body but we have URL, show info
    if (parsed.url) {
      toast.error("No JSON body found. Try 'Execute' mode to fetch from URL.");
      return;
    }

    toast.error("No JSON data found in cURL command");
  };

  const handleExecute = async () => {
    if (!parsed || !parsed.url) {
      toast.error("No valid URL found in cURL command");
      return;
    }

    setLoading(true);

    try {
      // Use our proxy endpoint to bypass CORS
      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: parsed.url,
          method: parsed.method,
          headers: parsed.headers,
          body: parsed.body,
        }),
      });

      const proxyResult = await proxyResponse.json();

      if (!proxyResponse.ok) {
        throw new Error(
          proxyResult.error || `Proxy error: ${proxyResponse.status}`,
        );
      }

      // Format the response body
      const responseBody = proxyResult.body;
      let formatted: string;

      if (typeof responseBody === "object") {
        // Already parsed JSON object
        formatted = JSON.stringify(responseBody, null, 2);
      } else if (typeof responseBody === "string") {
        // String response - check if it's JSON or plain text
        const trimmed = responseBody.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          // Looks like JSON, try to parse and format
          try {
            const json = JSON.parse(responseBody);
            formatted = JSON.stringify(json, null, 2);
          } catch {
            // Failed to parse as JSON - just use as-is
            // This might be partially valid JSON or text that looks like JSON
            formatted = responseBody;
          }
        } else {
          // Plain text response
          formatted = responseBody;
        }
      } else {
        formatted = String(responseBody);
      }

      setContents({ contents: formatted });
      toast.success(`Response loaded (HTTP ${proxyResult.status})`);
      gaEvent("curl_execute_success");

      handleClose();
    } catch (error) {
      console.error("cURL execute error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to execute request",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (mode === "extract") {
      handleExtract();
    } else {
      handleExecute();
    }
  };

  const handleClose = () => {
    setCurlInput("");
    setParsed(null);
    setValidationIssues([]);
    setLoading(false);
    setResponseTime(null);
    setResponseSize(null);
    onClose();
  };

  // Import cURL into builder
  const importCurlToBuilder = () => {
    if (!parsed || !parsed.isValid) return;

    setBuilderUrl(parsed.url);
    setBuilderMethod(parsed.method);

    // Convert headers
    const headerRows: HeaderRow[] = Object.entries(parsed.headers).map(
      ([key, value]) => ({
        id: generateId(),
        key,
        value,
        enabled: true,
      }),
    );
    if (headerRows.length === 0) {
      headerRows.push({ id: generateId(), key: "", value: "", enabled: true });
    }
    setBuilderHeaders(headerRows);

    // Set body
    if (parsed.body) {
      setBuilderBody(parsed.body);
    }

    // Switch to builder tab
    setActiveTab("builder");
    toast.success("cURL imported to builder");
  };

  return (
    <Modal
      title="HTTP Request"
      size="xl"
      opened={opened}
      onClose={handleClose}
      centered
    >
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabMode)}>
        <Tabs.List mb="md">
          <Tabs.Tab value="curl">Paste cURL</Tabs.Tab>
          <Tabs.Tab value="builder">Request Builder</Tabs.Tab>
        </Tabs.List>

        {/* cURL Paste Tab */}
        <Tabs.Panel value="curl">
          <Stack gap="md">
            <Text fz="sm" c="dimmed">
              Paste a cURL command to extract JSON body or execute the request.
              Supports Chrome DevTools &quot;Copy as cURL&quot; format.
            </Text>

            <SegmentedControl
              value={mode}
              onChange={(v) => setMode(v as ImportMode)}
              data={[
                { label: "Extract Body", value: "extract" },
                { label: "Execute Request", value: "execute" },
              ]}
              fullWidth
            />

            <Textarea
              placeholder={`curl 'https://api.example.com/data' \\
  -H 'Content-Type: application/json' \\
  -d '{"key": "value"}'`}
              value={curlInput}
              onChange={(e) => {
                setCurlInput(e.target.value);
                setValidationIssues(validateCurlCommand(e.target.value));
              }}
              autosize
              minRows={6}
              maxRows={12}
              data-autofocus
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "12px",
                },
              }}
            />

            {/* Validation Issues */}
            {validationIssues.length > 0 && (
              <Stack gap="xs">
                <Text fw={500} fz="sm">
                  Validation Issues (
                  {validationIssues.filter((i) => i.type === "error").length}{" "}
                  errors,{" "}
                  {validationIssues.filter((i) => i.type === "warning").length}{" "}
                  warnings)
                </Text>
                <ScrollArea.Autosize mah={150}>
                  <Stack gap={4}>
                    {validationIssues.map((issue, idx) => (
                      <Alert
                        key={idx}
                        color={
                          issue.type === "error"
                            ? "red"
                            : issue.type === "warning"
                              ? "yellow"
                              : "blue"
                        }
                        variant="light"
                        p="xs"
                        styles={{ message: { fontSize: "12px" } }}
                      >
                        <Text fz="xs" fw={500}>
                          {issue.message}
                        </Text>
                        {issue.suggestion && (
                          <Text fz="xs" c="dimmed">
                            💡 {issue.suggestion}
                          </Text>
                        )}
                      </Alert>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            )}

            {parsed && (
              <Stack gap="xs">
                {parsed.isValid ? (
                  <>
                    {parsed.url && (
                      <Group gap="xs">
                        <Badge color="blue" variant="light">
                          {parsed.method}
                        </Badge>
                        <Code
                          fz="xs"
                          style={{
                            maxWidth: "350px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {parsed.url}
                        </Code>
                        <Button
                          size="xs"
                          variant="light"
                          onClick={importCurlToBuilder}
                        >
                          Edit in Builder
                        </Button>
                      </Group>
                    )}
                    {Object.keys(parsed.headers).length > 0 && (
                      <Text fz="xs" c="dimmed">
                        {Object.keys(parsed.headers).length} header(s) detected
                      </Text>
                    )}
                    {parsed.body && (
                      <Text fz="xs" c="green">
                        ✓ JSON body detected ({parsed.body.length} chars)
                      </Text>
                    )}
                    {!parsed.body && mode === "extract" && parsed.url && (
                      <Text fz="xs" c="orange">
                        No body found. Switch to &quot;Execute&quot; to fetch
                        from URL.
                      </Text>
                    )}
                  </>
                ) : (
                  <Alert color="red" variant="light" title="Parse Error">
                    {parsed.error}
                  </Alert>
                )}
              </Stack>
            )}

            {mode === "execute" && (
              <Alert color="blue" variant="light">
                <Text fz="xs">
                  Requests are proxied through the server to bypass CORS
                  restrictions. Works with any URL including internal APIs.
                </Text>
              </Alert>
            )}

            <Group justify="right">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parsed?.isValid || loading}
                leftSection={loading ? <Loader size="xs" /> : null}
              >
                {loading
                  ? "Executing..."
                  : mode === "extract"
                    ? "Extract JSON"
                    : "Execute & Import"}
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* Request Builder Tab */}
        <Tabs.Panel value="builder">
          <Stack gap="md">
            {/* Method + URL */}
            <Group gap="xs" align="flex-end">
              <Select
                label="Method"
                value={builderMethod}
                onChange={(v) => setBuilderMethod(v || "GET")}
                data={HTTP_METHODS}
                w={120}
                styles={{
                  input: { fontWeight: 600 },
                }}
              />
              <TextInput
                label="URL"
                placeholder="https://api.example.com/endpoint"
                value={builderUrl}
                onChange={(e) => setBuilderUrl(e.target.value)}
                style={{ flex: 1 }}
                styles={{
                  input: { fontFamily: "monospace", fontSize: "13px" },
                }}
              />
            </Group>

            {/* Query Params */}
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500} fz="sm">
                  Query Parameters
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<VscAdd size={12} />}
                  onClick={addParam}
                >
                  Add
                </Button>
              </Group>
              <ScrollArea.Autosize mah={120}>
                <Table fz="xs" style={{ tableLayout: "fixed" }}>
                  <Table.Tbody>
                    {builderParams.map((param) => (
                      <Table.Tr key={param.id}>
                        <Table.Td w={180}>
                          <TextInput
                            placeholder="key"
                            size="xs"
                            value={param.key}
                            onChange={(e) =>
                              updateParam(param.id, "key", e.target.value)
                            }
                            styles={{ input: { fontFamily: "monospace" } }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="value"
                            size="xs"
                            value={param.value}
                            onChange={(e) =>
                              updateParam(param.id, "value", e.target.value)
                            }
                            styles={{ input: { fontFamily: "monospace" } }}
                          />
                        </Table.Td>
                        <Table.Td w={40}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeParam(param.id)}
                          >
                            <VscTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Stack>

            {/* Headers */}
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500} fz="sm">
                  Headers
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<VscAdd size={12} />}
                  onClick={addHeader}
                >
                  Add
                </Button>
              </Group>
              <ScrollArea.Autosize mah={150}>
                <Table fz="xs" style={{ tableLayout: "fixed" }}>
                  <Table.Tbody>
                    {builderHeaders.map((header) => (
                      <Table.Tr key={header.id}>
                        <Table.Td w={180}>
                          <TextInput
                            placeholder="Header-Name"
                            size="xs"
                            value={header.key}
                            onChange={(e) =>
                              updateHeader(header.id, "key", e.target.value)
                            }
                            styles={{ input: { fontFamily: "monospace" } }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="value"
                            size="xs"
                            value={header.value}
                            onChange={(e) =>
                              updateHeader(header.id, "value", e.target.value)
                            }
                            styles={{ input: { fontFamily: "monospace" } }}
                          />
                        </Table.Td>
                        <Table.Td w={40}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeHeader(header.id)}
                          >
                            <VscTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </Stack>

            {/* Body (only for non-GET methods) */}
            {builderMethod !== "GET" && (
              <Stack gap="xs">
                <Text fw={500} fz="sm">
                  Request Body (JSON)
                </Text>
                <Textarea
                  placeholder='{"key": "value"}'
                  value={builderBody}
                  onChange={(e) => setBuilderBody(e.target.value)}
                  minRows={4}
                  maxRows={8}
                  autosize
                  styles={{
                    input: { fontFamily: "monospace", fontSize: "12px" },
                  }}
                />
              </Stack>
            )}

            {/* Generated cURL preview */}
            {builderUrl && (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={500} fz="sm">
                    Generated cURL
                  </Text>
                  <CopyButton value={generateCurlFromBuilder()}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied!" : "Copy cURL"}>
                        <ActionIcon
                          variant="subtle"
                          color={copied ? "green" : "gray"}
                          onClick={copy}
                        >
                          {copied ? (
                            <VscCheck size={14} />
                          ) : (
                            <VscCopy size={14} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Code
                  block
                  fz="xs"
                  style={{
                    maxHeight: "100px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {generateCurlFromBuilder()}
                </Code>
              </Stack>
            )}

            <Alert color="blue" variant="light">
              <Text fz="xs">
                Requests are proxied through the server to bypass CORS
                restrictions.
              </Text>
            </Alert>

            <Group justify="right">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={executeFromBuilder}
                disabled={!builderUrl || loading}
                leftSection={loading ? <Loader size="xs" /> : null}
              >
                {loading ? "Executing..." : "Send Request"}
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
