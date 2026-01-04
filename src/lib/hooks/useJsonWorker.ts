import { useCallback, useEffect, useRef } from "react";

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

type PendingPromise = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

// Size threshold for using worker (use worker for files > 100KB)
const WORKER_THRESHOLD = 100_000;

// Timeout for worker operations (30 seconds)
const WORKER_TIMEOUT = 30_000;

/**
 * Hook to manage JSON processing via Web Worker
 * Falls back to main thread for small files or if worker is unavailable
 */
export function useJsonWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingPromise>>(new Map());
  const idCounterRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    // Create worker using dynamic import
    if (typeof window !== "undefined" && window.Worker) {
      try {
        // Create inline worker from the jsonWorker module
        const workerCode = `
          // Inline JSONFixer for worker
          ${getJSONFixerCode()}
          
          self.onmessage = async (event) => {
            const { id, type, payload } = event.data;
            const startTime = performance.now();
            
            try {
              let result;
              
              switch (type) {
                case 'parse':
                  result = JSON.parse(payload.content);
                  break;
                  
                case 'stringify':
                  result = JSON.stringify(payload.data, null, payload.indent || 2);
                  break;
                  
                case 'repair':
                  const fixer = new JSONFixer();
                  result = fixer.fix(payload.content);
                  break;
                  
                case 'validate':
                  try {
                    JSON.parse(payload.content);
                    result = { valid: true };
                  } catch (e) {
                    result = { valid: false, error: e.message };
                  }
                  break;
                  
                case 'format':
                  const parsed = JSON.parse(payload.content);
                  result = JSON.stringify(parsed, null, payload.indent || 2);
                  break;
                  
                default:
                  throw new Error('Unknown operation: ' + type);
              }
              
              self.postMessage({
                id,
                success: true,
                result,
                timing: performance.now() - startTime
              });
            } catch (error) {
              self.postMessage({
                id,
                success: false,
                error: error.message || 'Unknown error',
                timing: performance.now() - startTime
              });
            }
          };
        `;

        const blob = new Blob([workerCode], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(blob);
        workerRef.current = new Worker(workerUrl);

        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, success, result, error } = event.data;
          const pending = pendingRef.current.get(id);

          if (pending) {
            clearTimeout(pending.timeout);
            pendingRef.current.delete(id);

            if (success) {
              pending.resolve(result);
            } else {
              pending.reject(new Error(error || "Worker operation failed"));
            }
          }
        };

        workerRef.current.onerror = (error) => {
          console.error("Worker error:", error);
          // Reject all pending operations
          pendingRef.current.forEach((pending) => {
            clearTimeout(pending.timeout);
            pending.reject(new Error("Worker crashed"));
          });
          pendingRef.current.clear();
        };

        // Cleanup worker URL
        URL.revokeObjectURL(workerUrl);
      } catch (error) {
        console.warn("Failed to create worker:", error);
        workerRef.current = null;
      }
    }

    // Copy refs for cleanup
    const worker = workerRef.current;
    const pending = pendingRef.current;

    return () => {
      if (worker) {
        worker.terminate();
        workerRef.current = null;
      }
      // Clean up pending promises
      pending.forEach((p) => {
        clearTimeout(p.timeout);
      });
      pending.clear();
    };
  }, []);

  // Send message to worker
  const sendToWorker = useCallback(
    <T>(type: WorkerMessage["type"], payload: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Worker not available"));
          return;
        }

        const id = `msg_${++idCounterRef.current}`;

        // Set timeout
        const timeout = setTimeout(() => {
          pendingRef.current.delete(id);
          reject(new Error("Worker operation timed out"));
        }, WORKER_TIMEOUT);

        pendingRef.current.set(id, { resolve, reject, timeout });

        workerRef.current.postMessage({ id, type, payload });
      });
    },
    [],
  );

  // Parse JSON using worker for large content
  const parse = useCallback(
    async (content: string): Promise<any> => {
      if (!content || content.length < WORKER_THRESHOLD || !workerRef.current) {
        // Use main thread for small content
        return JSON.parse(content);
      }
      return sendToWorker("parse", { content });
    },
    [sendToWorker],
  );

  // Stringify JSON using worker for large objects
  const stringify = useCallback(
    async (data: any, indent: number = 2): Promise<string> => {
      // Estimate size - if object is large, use worker
      const estimatedSize = JSON.stringify(data).length;

      if (estimatedSize < WORKER_THRESHOLD || !workerRef.current) {
        return JSON.stringify(data, null, indent);
      }
      return sendToWorker("stringify", { data, indent });
    },
    [sendToWorker],
  );

  // Repair JSON using worker
  const repair = useCallback(
    async (
      content: string,
    ): Promise<{ output: string; fixes: string[]; success?: boolean }> => {
      if (!content) {
        return { output: "", fixes: [], success: false };
      }

      // Always use worker for repair if available (it's expensive)
      if (workerRef.current && content.length > WORKER_THRESHOLD / 2) {
        return sendToWorker("repair", { content });
      }

      // Fall back to main thread with yielding
      return new Promise((resolve) => {
        // Use requestIdleCallback or setTimeout for main thread processing
        const run = async () => {
          try {
            // Dynamic import to avoid bundling in main chunk
            const { default: JSONFixer } = await import("../utils/jsonFixer");
            const fixer = new JSONFixer();
            const result = fixer.fix(content);
            resolve(result);
          } catch (error: any) {
            resolve({
              output: content,
              fixes: [],
              success: false,
            });
          }
        };

        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(run, { timeout: 5000 });
        } else {
          setTimeout(run, 0);
        }
      });
    },
    [sendToWorker],
  );

  // Validate JSON
  const validate = useCallback(
    async (
      content: string,
    ): Promise<{ valid: boolean; error?: string; position?: number }> => {
      if (!content) {
        return { valid: false, error: "Empty content" };
      }

      if (content.length < WORKER_THRESHOLD || !workerRef.current) {
        try {
          JSON.parse(content);
          return { valid: true };
        } catch (error: any) {
          const posMatch = error.message.match(/position (\d+)/);
          return {
            valid: false,
            error: error.message,
            position: posMatch ? parseInt(posMatch[1], 10) : undefined,
          };
        }
      }

      return sendToWorker("validate", { content });
    },
    [sendToWorker],
  );

  // Format JSON
  const format = useCallback(
    async (content: string, indent: number = 2): Promise<string> => {
      if (!content) return "";

      if (content.length < WORKER_THRESHOLD || !workerRef.current) {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, indent);
      }

      return sendToWorker("format", { content, indent });
    },
    [sendToWorker],
  );

  // Check if worker is available
  const isWorkerAvailable = workerRef.current !== null;

  return {
    parse,
    stringify,
    repair,
    validate,
    format,
    isWorkerAvailable,
  };
}

/**
 * Get minified JSONFixer code for inline worker
 * This is a simplified version for the worker
 */
function getJSONFixerCode(): string {
  // Return a minimal JSONFixer implementation for the worker
  // The full implementation is too large; this is a simplified version
  return `
class JSONFixer {
  fix(input) {
    const fixes = [];
    let content = input.trim();
    
    if (!content) {
      return { success: false, output: '', fixes: [], error: 'Empty input' };
    }
    
    // Try parsing first
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted === content) {
        return { success: true, output: content, fixes: ['JSON is already formatted'] };
      }
      fixes.push('Formatted JSON');
      return { success: true, output: formatted, fixes };
    } catch (e) {
      // Continue with fixes
    }
    
    // Basic fixes
    try {
      // Fix common issues
      content = this.fixBasicIssues(content);
      fixes.push('Applied basic fixes');
      
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      return { success: true, output: formatted, fixes };
    } catch (e) {
      // Try more aggressive fixes
      try {
        content = this.fixAggressively(content);
        fixes.push('Applied aggressive fixes');
        
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        return { success: true, output: formatted, fixes };
      } catch (e2) {
        return { success: false, output: input, fixes: [], error: e2.message };
      }
    }
  }
  
  fixBasicIssues(str) {
    // Remove trailing commas
    str = str.replace(/,\\s*([\\]\\}])/g, '$1');
    // Fix unquoted keys
    str = str.replace(/([{,]\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\s*:/g, '$1"$2":');
    // Fix single quotes
    str = str.replace(/'([^']*)'/g, '"$1"');
    return str;
  }
  
  fixAggressively(str) {
    str = this.fixBasicIssues(str);
    // Handle Python booleans
    str = str.replace(/:\\s*True\\b/g, ': true');
    str = str.replace(/:\\s*False\\b/g, ': false');
    str = str.replace(/:\\s*None\\b/g, ': null');
    return str;
  }
}
  `;
}

export default useJsonWorker;
