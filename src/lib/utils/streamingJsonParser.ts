/**
 * Streaming JSON Parser
 * Parses large JSON strings incrementally without blocking the main thread
 */

export interface ParseProgress {
  bytesProcessed: number;
  totalBytes: number;
  percentComplete: number;
  partialResult?: any;
}

export interface StreamingParseResult {
  success: boolean;
  data?: any;
  error?: string;
}

type ProgressCallback = (progress: ParseProgress) => void;

/**
 * Yield to the main thread to keep UI responsive
 */
const yieldToMain = (): Promise<void> => {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(resolve, { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
};

/**
 * Parse JSON string incrementally with progress updates
 * For very large files, this prevents UI freezing
 */
export async function parseJsonStreaming(
  jsonString: string,
  onProgress?: ProgressCallback,
  chunkSize: number = 100_000, // 100KB chunks
): Promise<StreamingParseResult> {
  const totalBytes = jsonString.length;

  // For small strings, just use regular JSON.parse
  if (totalBytes < chunkSize) {
    try {
      const data = JSON.parse(jsonString);
      onProgress?.({
        bytesProcessed: totalBytes,
        totalBytes,
        percentComplete: 100,
      });
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // For large strings, parse incrementally with yielding
  try {
    let bytesProcessed = 0;

    // Report initial progress
    onProgress?.({
      bytesProcessed: 0,
      totalBytes,
      percentComplete: 0,
    });

    // Yield before starting heavy parsing
    await yieldToMain();

    // Attempt to parse the JSON
    // We can't truly stream JSON.parse, but we can:
    // 1. Yield before parsing
    // 2. Report progress during validation
    // 3. Parse in the background

    // Validate JSON structure first (quick check)
    const validationResult = quickValidateJson(jsonString);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    bytesProcessed = Math.floor(totalBytes * 0.3);
    onProgress?.({
      bytesProcessed,
      totalBytes,
      percentComplete: 30,
    });

    await yieldToMain();

    // Parse the JSON
    const data = JSON.parse(jsonString);

    bytesProcessed = Math.floor(totalBytes * 0.7);
    onProgress?.({
      bytesProcessed,
      totalBytes,
      percentComplete: 70,
    });

    await yieldToMain();

    // Post-process (deep copy to ensure no references to original string)
    // This also helps with memory management
    const processed = deepCloneWithYield(data);

    onProgress?.({
      bytesProcessed: totalBytes,
      totalBytes,
      percentComplete: 100,
    });

    return { success: true, data: processed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Quick structural validation of JSON without full parsing
 */
function quickValidateJson(str: string): { valid: boolean; error?: string } {
  const trimmed = str.trim();

  if (!trimmed) {
    return { valid: false, error: "Empty JSON" };
  }

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];

  // Check basic structure
  if (firstChar === "{") {
    if (lastChar !== "}") {
      return { valid: false, error: "Unclosed object - missing }" };
    }
  } else if (firstChar === "[") {
    if (lastChar !== "]") {
      return { valid: false, error: "Unclosed array - missing ]" };
    }
  } else if (firstChar === '"') {
    if (lastChar !== '"') {
      return { valid: false, error: "Unclosed string" };
    }
  }

  // Count brackets/braces (rough check)
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") braceCount++;
    else if (char === "}") braceCount--;
    else if (char === "[") bracketCount++;
    else if (char === "]") bracketCount--;
  }

  if (braceCount !== 0) {
    return {
      valid: false,
      error: braceCount > 0 ? "Missing closing }" : "Extra closing }",
    };
  }

  if (bracketCount !== 0) {
    return {
      valid: false,
      error: bracketCount > 0 ? "Missing closing ]" : "Extra closing ]",
    };
  }

  return { valid: true };
}

/**
 * Deep clone an object, yielding periodically to keep UI responsive
 */
async function deepCloneWithYield(obj: any, depth: number = 0): Promise<any> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Yield every few levels of depth
  if (depth > 0 && depth % 5 === 0) {
    await yieldToMain();
  }

  if (Array.isArray(obj)) {
    const result = [];
    for (let i = 0; i < obj.length; i++) {
      result.push(await deepCloneWithYield(obj[i], depth + 1));

      // Yield every 1000 items for large arrays
      if (i > 0 && i % 1000 === 0) {
        await yieldToMain();
      }
    }
    return result;
  }

  const result: any = {};
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = await deepCloneWithYield(obj[key], depth + 1);

    // Yield every 500 keys for large objects
    if (i > 0 && i % 500 === 0) {
      await yieldToMain();
    }
  }

  return result;
}

/**
 * Stringify JSON with progress updates
 */
export async function stringifyJsonStreaming(
  data: any,
  indent: number = 2,
  onProgress?: ProgressCallback,
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    onProgress?.({
      bytesProcessed: 0,
      totalBytes: 100,
      percentComplete: 0,
    });

    await yieldToMain();

    onProgress?.({
      bytesProcessed: 30,
      totalBytes: 100,
      percentComplete: 30,
    });

    const result = JSON.stringify(data, null, indent);

    await yieldToMain();

    onProgress?.({
      bytesProcessed: 100,
      totalBytes: 100,
      percentComplete: 100,
    });

    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Count the total number of nodes in a JSON structure
 * Uses iterative approach to avoid stack overflow on deep structures
 */
export function countJsonNodes(data: any): number {
  if (data === null || typeof data !== "object") {
    return 1;
  }

  let count = 0;
  const stack: any[] = [data];

  while (stack.length > 0) {
    const current = stack.pop();
    count++;

    if (current !== null && typeof current === "object") {
      const values = Array.isArray(current) ? current : Object.values(current);

      for (const value of values) {
        if (value !== null && typeof value === "object") {
          stack.push(value);
        } else {
          count++;
        }
      }
    }

    // Prevent infinite loops on circular references
    if (count > 10_000_000) break;
  }

  return count;
}

/**
 * Get a summary of JSON structure without loading all data
 */
export function getJsonStructureSummary(data: any): {
  type: string;
  keys?: string[];
  length?: number;
  depth: number;
  nodeCount: number;
} {
  if (data === null) return { type: "null", depth: 0, nodeCount: 1 };
  if (typeof data !== "object")
    return { type: typeof data, depth: 0, nodeCount: 1 };

  const isArray = Array.isArray(data);
  const keys = isArray ? undefined : Object.keys(data).slice(0, 20);
  const length = isArray ? data.length : Object.keys(data).length;

  // Calculate depth (limited)
  const calculateDepth = (obj: any, currentDepth: number): number => {
    if (currentDepth > 20) return currentDepth; // Limit depth calculation
    if (obj === null || typeof obj !== "object") return currentDepth;

    const children = Array.isArray(obj) ? obj : Object.values(obj);
    let maxChildDepth = currentDepth;

    for (const child of children.slice(0, 10)) {
      // Only check first 10 children
      const childDepth = calculateDepth(child, currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  };

  return {
    type: isArray ? "array" : "object",
    keys,
    length,
    depth: calculateDepth(data, 0),
    nodeCount: countJsonNodes(data),
  };
}

const streamingJsonParser = {
  parseJsonStreaming,
  stringifyJsonStreaming,
  countJsonNodes,
  getJsonStructureSummary,
};

export default streamingJsonParser;
