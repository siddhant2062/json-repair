/**
 * Web Worker for JSON processing operations
 * Handles parsing, formatting, and repair operations off the main thread
 */

// Import the JSONFixer class (will be bundled with worker)
import JSONFixer from "../utils/jsonFixer";

export interface WorkerMessage {
  id: string;
  type: "parse" | "stringify" | "repair" | "validate" | "format";
  payload: any;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  timing?: number;
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  const startTime = performance.now();

  try {
    let result: any;

    switch (type) {
      case "parse":
        result = parseJSON(payload.content);
        break;

      case "stringify":
        result = stringifyJSON(payload.data, payload.indent);
        break;

      case "repair":
        result = repairJSON(payload.content);
        break;

      case "validate":
        result = validateJSON(payload.content);
        break;

      case "format":
        result = formatJSON(payload.content, payload.indent);
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    const timing = performance.now() - startTime;

    self.postMessage({
      id,
      success: true,
      result,
      timing,
    } as WorkerResponse);
  } catch (error: any) {
    self.postMessage({
      id,
      success: false,
      error: error.message || "Unknown error",
      timing: performance.now() - startTime,
    } as WorkerResponse);
  }
};

/**
 * Parse JSON string to object
 */
function parseJSON(content: string): any {
  if (!content || content.trim() === "") {
    return null;
  }
  return JSON.parse(content);
}

/**
 * Stringify object to JSON
 */
function stringifyJSON(data: any, indent: number = 2): string {
  return JSON.stringify(data, null, indent);
}

/**
 * Repair malformed JSON
 */
function repairJSON(content: string): {
  output: string;
  fixes: string[];
  success?: boolean;
} {
  if (!content || content.trim() === "") {
    return { output: "", fixes: [], success: false };
  }

  const fixer = new JSONFixer();
  return fixer.fix(content);
}

/**
 * Validate JSON and return detailed errors
 */
function validateJSON(content: string): {
  valid: boolean;
  error?: string;
  position?: number;
} {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (error: any) {
    // Extract position from error message
    const posMatch = error.message.match(/position (\d+)/);
    const position = posMatch ? parseInt(posMatch[1], 10) : undefined;

    return {
      valid: false,
      error: error.message,
      position,
    };
  }
}

/**
 * Format JSON with proper indentation
 */
function formatJSON(content: string, indent: number = 2): string {
  const parsed = JSON.parse(content);
  return JSON.stringify(parsed, null, indent);
}

// Export for type checking (won't be used at runtime in worker)
export {};
