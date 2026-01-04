/**
 * Wrapper Detection Utilities
 * Shared utilities for detecting JSON wrappers and NDJSON patterns
 * Used by both OnPaste auto-repair and Repair Button
 */

/**
 * Detects if content is already wrapped in {} or []
 * This prevents double-wrapping when user manually creates wrappers
 */
export function isAlreadyWrapped(content: string): {
  wrapped: boolean;
  type: "object" | "array" | null;
} {
  const trimmed = content.trim();

  // Check if content is wrapped in object braces
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return { wrapped: true, type: "object" };
  }

  // Check if content is wrapped in array brackets
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return { wrapped: true, type: "array" };
  }

  return { wrapped: false, type: null };
}

/**
 * Detects NDJSON pattern (multiple concatenated objects) at TOP LEVEL only
 * This checks for } followed by { OUTSIDE of strings
 *
 * Example: {a:1}{b:2} → true (NDJSON)
 * Example: "ra": "{'content': {...}}" → false (} and { are inside string)
 */
export function hasNDJSONPatternAtTopLevel(content: string): boolean {
  const trimmed = content.trim();
  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let lastBraceWasClosing = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = !inString;
      continue;
    }

    // Only check for NDJSON pattern when we're OUTSIDE strings and at top level (braceDepth === 0)
    if (!inString) {
      if (char === "{") {
        // If we just saw a closing brace at top level, this is NDJSON pattern
        if (braceDepth === 0 && lastBraceWasClosing) {
          return true;
        }
        braceDepth++;
        lastBraceWasClosing = false;
      } else if (char === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          lastBraceWasClosing = true;
        } else {
          lastBraceWasClosing = false;
        }
      } else if (braceDepth > 0) {
        // Reset flag if we're inside braces
        lastBraceWasClosing = false;
      }
    }
  }

  return false;
}

/**
 * Detects what type of wrapper should be used for unwrapped JSON content
 * (like jsonEditorOnline's auto-repair logic, matching jsonrepair expectations)
 *
 * Based on jsonrepair library behavior and JSON Editor Online patterns:
 * - jsonrepair works best when content is properly wrapped
 * - Objects: content with key-value pairs (key: value pattern)
 * - Arrays: content with comma-separated items (no key-value pairs)
 *
 * Rules (in priority order):
 * 1. If content starts with "key": or key: pattern, wrap in {} (highest priority)
 * 2. If content has key-value pairs (contains : outside strings with key pattern), wrap in {}
 * 3. If content is array-like (contains , but no key-value pairs), wrap in []
 * 4. If content starts with { or [, it's already wrapped (return null)
 * 5. Default: try object first (more common for JSON)
 */
export function detectWrapperType(content: string): "object" | "array" | null {
  const trimmed = content.trim();

  // If already wrapped, return null (let isAlreadyWrapped handle it)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return null;
  }

  // Priority 1: Check if content starts with a key pattern
  // This handles cases like: "response": "{'content': [...]}" or response: {...}
  // Pattern matches: "key": or 'key': or key: or key=
  const keyPattern = /^["']?[a-zA-Z_][a-zA-Z0-9_]*["']?\s*[:=]/;
  if (keyPattern.test(trimmed)) {
    return "object";
  }

  // Also check for key with trailing comma followed by colon (handles line breaks and malformed JSON)
  // Pattern: "key",\s*": or "key",\s*\n\s*": or "key",\n":
  const keyWithCommaPattern =
    /^["']?[a-zA-Z_][a-zA-Z0-9_]*["']?\s*,\s*["']?\s*:/;
  if (keyWithCommaPattern.test(trimmed)) {
    return "object";
  }

  // Also check if content starts with quoted key followed by comma, then has colon nearby
  // This handles: "ra",\n": "value" or "ra", ":" "value"
  // Check first 100 characters for this pattern
  const firstHundred = trimmed.substring(0, Math.min(100, trimmed.length));
  const quotedKeyWithComma = /^["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*,/;
  const match = firstHundred.match(quotedKeyWithComma);
  if (match) {
    // Check if there's a colon within the next 20 characters (handles line breaks)
    const afterKey = firstHundred.substring(match[0].length);
    if (
      /^\s*["']?\s*:/.test(afterKey) ||
      /^\s*\n\s*["']?\s*:/.test(afterKey) ||
      /^\s*\r\n\s*["']?\s*:/.test(afterKey)
    ) {
      return "object";
    }
  }

  // Very simple check: If content starts with quoted string and has colon in first 50 chars, it's likely an object
  // This catches cases like "ra",\n": "value"
  if (
    /^["'][a-zA-Z_][a-zA-Z0-9_]*["']/.test(trimmed) &&
    trimmed.substring(0, 50).includes(":")
  ) {
    return "object";
  }

  // Priority 2: Check for key-value pairs (contains : outside of strings)
  // This is more reliable than just checking for : - we need to verify it's actually a key-value pair
  let inString = false;
  let escapeNext = false;
  let hasKeyValuePair = false;
  let colonCount = 0;
  let keyValuePatternCount = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = !inString;
      continue;
    }

    if (!inString && char === ":") {
      colonCount++;

      // Found : outside of string - check if it's a key-value pair
      // Look backwards to find the key pattern
      let j = i - 1;
      // Skip whitespace, commas, and newlines (handles cases like "ra",\n":")
      while (
        j >= 0 &&
        (/\s/.test(trimmed[j]) ||
          trimmed[j] === "," ||
          trimmed[j] === "\n" ||
          trimmed[j] === "\r")
      )
        j--;

      if (j >= 0) {
        // Look for key pattern before the colon
        // Key can be: "key", 'key', or unquoted identifier
        let keyStart = j;

        // If we have a quote, find the matching quote
        if (trimmed[j] === '"' || trimmed[j] === "'") {
          const quoteChar = trimmed[j];
          keyStart = j;
          // Look backwards for the opening quote
          while (keyStart > 0 && trimmed[keyStart - 1] !== quoteChar) {
            keyStart--;
            if (keyStart === 0) break;
          }
        } else {
          // Unquoted key - find the start of the identifier
          while (keyStart > 0 && /[a-zA-Z0-9_]/.test(trimmed[keyStart - 1])) {
            keyStart--;
          }
        }

        // Extract the key part
        const keyPart = trimmed.substring(keyStart, j + 1);

        // Verify it looks like a key (quoted string or identifier)
        if (
          /^["'][^"']*["']$/.test(keyPart) || // Quoted key
          /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(keyPart) // Unquoted identifier
        ) {
          keyValuePatternCount++;
        }
      }
    }
  }

  // If we found colons and they match key-value patterns, it's an object
  if (colonCount > 0 && keyValuePatternCount > 0) {
    // More key-value patterns than just colons = likely an object
    // But also check: if we have commas without colons, it might be an array
    const commaCount = (trimmed.match(/,/g) || []).length;

    // If we have more key-value patterns than commas, it's definitely an object
    // If we have both, prefer object (key-value pairs are stronger signal)
    if (keyValuePatternCount >= colonCount * 0.5) {
      return "object";
    }
  }

  // Additional check: If we have a colon early in the content (first 100 chars)
  // and there's a quoted string before it (even with comma), treat as object
  // This handles malformed cases like "ra",\n":
  if (colonCount > 0) {
    const firstHundredChars = trimmed.substring(
      0,
      Math.min(100, trimmed.length),
    );
    const firstColonIndex = firstHundredChars.indexOf(":");
    if (firstColonIndex > 0 && firstColonIndex < 50) {
      // Check if there's a quoted string before the first colon
      const beforeColon = firstHundredChars.substring(0, firstColonIndex);
      // Look for quoted key pattern (with or without comma)
      if (/["'][a-zA-Z_][a-zA-Z0-9_]*["']\s*,?\s*$/.test(beforeColon.trim())) {
        return "object";
      }
    }
  }

  // Priority 3: Check if content looks like an array
  // Array indicators:
  // - Contains commas
  // - No key-value pairs (or very few)
  // - Items might be separated by commas
  // BUT: If we have a colon early in content, it's more likely an object (even if malformed)
  if (trimmed.includes(",")) {
    // Check if there's a colon in the first part of content - if so, prefer object
    const firstPart = trimmed.substring(0, Math.min(200, trimmed.length));
    const hasEarlyColon = firstPart.includes(":");

    // If we have commas but no/few key-value pairs, it's likely an array
    // UNLESS there's a colon early on (which suggests object structure)
    if (
      (keyValuePatternCount === 0 || keyValuePatternCount < colonCount * 0.3) &&
      !hasEarlyColon
    ) {
      return "array";
    } else if (hasEarlyColon && keyValuePatternCount === 0) {
      // We have a colon but didn't detect key-value pairs - might be malformed object
      // Check if there's text before the colon that looks like a key
      const firstColonIndex = firstPart.indexOf(":");
      if (firstColonIndex > 0) {
        const beforeColon = firstPart.substring(0, firstColonIndex);
        // If there's a quoted string or identifier before colon, treat as object
        if (
          /["'][a-zA-Z_][a-zA-Z0-9_]*["']/.test(beforeColon) ||
          /[a-zA-Z_][a-zA-Z0-9_]*/.test(beforeColon.trim())
        ) {
          return "object";
        }
      }
    }
  }

  // Priority 4: Check for other object indicators
  // If content has any colons (even if we couldn't verify key pattern), try object
  if (colonCount > 0) {
    return "object";
  }

  // Default: if we can't determine, try object first (more common for JSON)
  // jsonrepair can handle both, but objects are more common
  return "object";
}

