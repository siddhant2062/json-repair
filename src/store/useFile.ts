import debounce from "lodash.debounce";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import { create } from "zustand";
import exampleJson from "../data/example.json";
import { FileFormat } from "../enums/file.enum";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import { isIframe } from "../lib/utils/helpers";
import { contentToJson, jsonToContent } from "../lib/utils/jsonAdapter";
import JSONFixer from "../lib/utils/jsonFixer";
import { jsonrepair } from "jsonrepair";
import { getEditorRef } from "../features/editor/TextEditor";
import {
  isAlreadyWrapped,
  hasNDJSONPatternAtTopLevel,
  detectWrapperType,
} from "../lib/utils/wrapperDetection";
import useJson from "./useJson";

const defaultJson = JSON.stringify(exampleJson, null, 2);

// Size thresholds for performance optimization
const SIZE_THRESHOLDS = {
  SMALL: 50_000, // 50KB - immediate processing
  MEDIUM: 200_000, // 200KB - debounced processing
  LARGE: 500_000, // 500KB - chunked processing
  VERY_LARGE: 2_000_000, // 2MB - async only
  SESSION_MAX: 80_000, // Max size to save to session storage
};

type SetContents = {
  contents?: string;
  hasChanges?: boolean;
  skipUpdate?: boolean;
  format?: FileFormat;
};

type Query = string | string[] | undefined;

interface JsonActions {
  getContents: () => string;
  getFormat: () => FileFormat;
  getHasChanges: () => boolean;
  setError: (error: string | null) => void;
  setHasChanges: (hasChanges: boolean) => void;
  setContents: (data: SetContents) => void;
  fetchUrl: (url: string) => void;
  setFormat: (format: FileFormat) => void;
  clear: () => void;
  setFile: (fileData: File) => void;
  setJsonSchema: (jsonSchema: object | null) => void;
  checkEditorSession: (url: Query, widget?: boolean) => void;
  repairJson: () => Promise<void>;
  formatJson: () => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  // Filter state
  originalContents: string | null;
  setOriginalContents: (contents: string | null) => void;
  isFiltered: boolean;
  setIsFiltered: (isFiltered: boolean) => void;
}

export type File = {
  id: string;
  views: number;
  owner_email: string;
  name: string;
  content: string;
  private: boolean;
  format: FileFormat;
  created_at: string;
  updated_at: string;
};

const initialStates = {
  fileData: null as File | null,
  format: FileFormat.JSON,
  contents: defaultJson,
  error: null as any,
  hasChanges: false,
  jsonSchema: null as object | null,
  isProcessing: false,
  originalContents: null as string | null,
  isFiltered: false,
};

export type FileStates = typeof initialStates;

const isURL = (value: string) => {
  return /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi.test(
    value,
  );
};

// Debounced update for graph view - longer delay for large content
const debouncedUpdateJson = debounce((value: unknown) => {
  useGraph.getState().setLoading(true);
  useJson.getState().setJson(JSON.stringify(value, null, 2));
}, 400);

// Longer debounce for very large content
const debouncedUpdateJsonLarge = debounce((value: unknown) => {
  useGraph.getState().setLoading(true);
  useJson.getState().setJson(JSON.stringify(value, null, 2));
}, 1000);

// Yield to browser for responsiveness
const yieldToMain = (): Promise<void> => {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(resolve, { timeout: 100 });
    } else {
      setTimeout(resolve, 0);
    }
  });
};

// Process content in chunks for very large files
const processLargeContent = async (
  content: string,
  format: FileFormat,
): Promise<any> => {
  // For very large content, just try to parse without processing
  if (content.length > SIZE_THRESHOLDS.VERY_LARGE) {
    await yieldToMain();
    try {
      return JSON.parse(content);
    } catch {
      // Return a placeholder for invalid JSON
      return { error: "Content too large to parse in real-time" };
    }
  }

  await yieldToMain();
  return contentToJson(content, format);
};

const useFile = create<FileStates & JsonActions>()((set, get) => ({
  ...initialStates,
  clear: () => {
    set({ contents: "", isProcessing: false });
    useJson.getState().clear();
  },
  setJsonSchema: (jsonSchema) => set({ jsonSchema }),
  setFile: (fileData) => {
    set({ fileData, format: fileData.format || FileFormat.JSON });
    get().setContents({ contents: fileData.content, hasChanges: false });
    gaEvent("set_content", { label: fileData.format });
  },
  getContents: () => get().contents,
  getFormat: () => get().format,
  getHasChanges: () => get().hasChanges,
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setFormat: async (format) => {
    try {
      const prevFormat = get().format;

      set({ format });
      const contentJson = await contentToJson(get().contents, prevFormat);
      const jsonContent = await jsonToContent(
        JSON.stringify(contentJson, null, 2),
        format,
      );

      get().setContents({ contents: jsonContent });
    } catch (error) {
      get().clear();
      console.warn(
        "The content was unable to be converted, so it was cleared instead.",
      );
    }
  },
  setContents: async ({
    contents,
    hasChanges = true,
    skipUpdate = false,
    format,
  }) => {
    try {
      const contentLength = contents?.length || 0;

      // Immediately update the editor content for responsiveness
      set({
        ...(contents && { contents }),
        error: null,
        hasChanges,
        format: format ?? get().format,
      });

      const isFetchURL = window.location.href.includes("?");
      const currentFormat = get().format;
      const currentContents = get().contents;

      // For very large files with skipUpdate, still process but with longer debounce
      if (skipUpdate && contentLength > SIZE_THRESHOLDS.LARGE) {
        // Parse and update JSON store with longer debounce
        try {
          const json = JSON.parse(contents);
          debouncedUpdateJsonLarge(json);
        } catch {
          // If parsing fails, don't update the tree/graph view
        }
        return;
      }

      // Process content based on size
      let json: any;

      if (contentLength > SIZE_THRESHOLDS.LARGE) {
        // Very large content - async processing with yielding
        set({ isProcessing: true });

        try {
          json = await processLargeContent(currentContents, currentFormat);
        } finally {
          set({ isProcessing: false });
        }
      } else if (contentLength > SIZE_THRESHOLDS.MEDIUM) {
        // Medium content - yield then process
        await yieldToMain();
        json = await contentToJson(currentContents, currentFormat);
      } else {
        // Small content - immediate processing
        json = await contentToJson(currentContents, currentFormat);
      }

      // Skip session storage save if live transform disabled, but still update JSON store
      // (Live transform toggle controls session saving, not tree/graph sync)

      // Save to session storage (only for small files)
      if (
        get().hasChanges &&
        contents &&
        contentLength < SIZE_THRESHOLDS.SESSION_MAX &&
        !isIframe() &&
        !isFetchURL
      ) {
        try {
          sessionStorage.setItem("content", contents);
          sessionStorage.setItem("format", currentFormat);
        } catch (e) {
          // Session storage might be full or unavailable
          console.warn("Could not save to session storage:", e);
        }
        set({ hasChanges: true });
      }

      // Update graph/tree view with appropriate debounce
      if (contentLength > SIZE_THRESHOLDS.MEDIUM) {
        debouncedUpdateJsonLarge(json);
      } else {
        debouncedUpdateJson(json);
      }
    } catch (error: any) {
      if (error?.mark?.snippet) return set({ error: error.mark.snippet });
      if (error?.message) set({ error: error.message });
      useJson.setState({ loading: false });
      useGraph.setState({ loading: false });
    }
  },
  setError: (error) => set({ error }),
  setHasChanges: (hasChanges) => set({ hasChanges }),
  fetchUrl: async (url) => {
    try {
      const res = await fetch(url);
      const json = await res.json();
      const jsonStr = JSON.stringify(json, null, 2);

      get().setContents({ contents: jsonStr });
      return useJson.setState({ json: jsonStr, loading: false });
    } catch (error) {
      get().clear();
      toast.error("Failed to fetch document from URL!");
    }
  },
  checkEditorSession: (url, widget) => {
    if (url && typeof url === "string" && isURL(url)) {
      return get().fetchUrl(url);
    }

    let contents = defaultJson;
    const sessionContent = sessionStorage.getItem("content") as string | null;
    const format = sessionStorage.getItem("format") as FileFormat | null;
    if (sessionContent && !widget) contents = sessionContent;

    if (format) set({ format });
    get().setContents({ contents, hasChanges: false });
  },
  repairJson: async () => {
    console.log("[Repair] Repair button clicked");
    try {
      const contents = get().contents;
      const contentLength = contents?.length || 0;
      console.log("[Repair] Content length:", contentLength);

      if (!contents || contents.trim() === "") {
        console.log("[Repair] Error: No content to repair");
        toast.error("No content to repair");
        return;
      }

      if (get().format !== FileFormat.JSON) {
        console.log("[Repair] Error: Format is not JSON");
        toast.error("Repair is only available for JSON format");
        return;
      }

      // Show loading toast
      const toastId = "repair-json";

      if (contentLength > SIZE_THRESHOLDS.LARGE) {
        toast.loading("Repairing large JSON... This may take a moment.", {
          id: toastId,
        });
      } else {
        toast.loading("Repairing JSON...", { id: toastId });
      }

      set({ isProcessing: true });

      // Yield to browser to show the loading state
      await yieldToMain();

      // Step 1: Wrapper Detection
      console.log("[Repair] Step 1: Checking if content is already wrapped");
      const wrapStatus = isAlreadyWrapped(contents);
      let workingContent = contents.trim();

      if (wrapStatus.wrapped) {
        console.log(
          `[Repair] Content is already wrapped in ${wrapStatus.type === "object" ? "{}" : "[]"}`,
        );
        // Content is already wrapped, use as-is
      } else {
        console.log("[Repair] Content is not wrapped, will handle in pre-processing");
      }

      // Step 2: NDJSON Detection
      console.log("[Repair] Step 2: Checking for NDJSON pattern");
      const hasNDJSON = hasNDJSONPatternAtTopLevel(workingContent);
      if (hasNDJSON) {
        console.log("[Repair] NDJSON pattern detected, adding commas and wrapping in array");
        // Add commas between objects
        workingContent = workingContent.replace(/}\s*{/g, "},{");
        // Wrap in array
        workingContent = "[" + workingContent + "]";
        console.log("[Repair] NDJSON handled, wrapped content length:", workingContent.length);
      }

      // Step 3: Pre-process with jsonrepair
      console.log("[Repair] Step 3: Pre-processing with jsonrepair");
      let preprocessedContent: string = workingContent;
      let jsonrepairSucceeded = false;

      try {
        preprocessedContent = jsonrepair(workingContent);
        jsonrepairSucceeded = true;
        console.log(
          "[Repair] ✅ jsonrepair succeeded - preprocessed content length:",
          preprocessedContent.length,
        );
      } catch (jsonrepairError: any) {
        console.log("[Repair] ⚠️ jsonrepair failed, will use original content for JSONFixer:", jsonrepairError.message);
        // jsonrepair failed, use original content for JSONFixer
        preprocessedContent = workingContent;
      }

      // Step 4: Comprehensive Repair with JSONFixer
      console.log("[Repair] Step 4: Comprehensive repair with JSONFixer");
      let result: { success?: boolean; output: string; fixes: string[] };

      // For large content, process in chunks with yielding
      if (contentLength > SIZE_THRESHOLDS.LARGE) {
        // Use async repair with progress updates
        result = await repairLargeJson(preprocessedContent, (progress) => {
          if (progress < 100) {
            toast.loading(`Repairing JSON... ${progress}%`, { id: toastId });
          }
        });
      } else {
        // Normal repair
        const fixer = new JSONFixer();
        result = fixer.fix(preprocessedContent);
      }

      console.log("[Repair] JSONFixer result - success:", result.success, "fixes:", result.fixes.length);

      set({ isProcessing: false });

      // Check if JSON was already formatted
      const isAlreadyFormatted =
        result.fixes.length === 1 &&
        result.fixes[0] === "JSON is already formatted";

      if (isAlreadyFormatted) {
        console.log("[Repair] JSON is already formatted");
        toast.success("JSON is already formatted", { id: toastId });
        return;
      }

      if (result.success || result.output) {
        const inputTrimmed = contents.trim();
        const outputTrimmed = result.output.trim();

        if (inputTrimmed === outputTrimmed) {
          console.log("[Repair] Content unchanged - already formatted");
          toast.success("JSON is already formatted", { id: toastId });
          return;
        }

        // Step 5: Update Editor with repaired content (preserves undo/redo)
        console.log("[Repair] Step 5: Updating editor with repaired content");
        const editor = getEditorRef();
        if (editor) {
          const model = editor.getModel();
          if (model) {
            // Use executeEdits to preserve undo/redo stack
            const fullRange = model.getFullModelRange();
            editor.executeEdits("repair-json", [
              {
                range: fullRange,
                text: result.output,
              },
            ]);
            console.log("[Repair] Editor updated via executeEdits");
          } else {
            // Fallback: use setContents if model not available
            console.log("[Repair] Warning: Model not available, using setContents fallback");
            get().setContents({ contents: result.output, hasChanges: true });
          }
        } else {
          // Fallback: use setContents if editor not available
          console.log("[Repair] Warning: Editor not available, using setContents fallback");
          // For very large output, update asynchronously
          if (result.output.length > SIZE_THRESHOLDS.MEDIUM) {
            await yieldToMain();
          }
          get().setContents({ contents: result.output, hasChanges: true });
        }

        // Step 6: Final Formatting with Monaco
        if (editor) {
          console.log("[Repair] Step 6: Applying Monaco formatter to repaired JSON");
          await new Promise((resolve) => setTimeout(resolve, 100));

          const formatAction = editor.getAction("editor.action.formatDocument");
          if (formatAction) {
            formatAction.run();
            await new Promise((resolve) => setTimeout(resolve, 100));
            console.log("[Repair] Monaco formatter applied");

            // Get final formatted content
            const finalContent = editor.getValue();
            get().setContents({ contents: finalContent, hasChanges: true });
          }
        }

        console.log("[Repair] ✅ Success: JSON repaired and formatted");
        toast.success(
          `JSON repaired! Applied fixes: ${result.fixes.join(", ")}`,
          { id: toastId },
        );
        gaEvent("repair_json", { fixes: result.fixes.length.toString() });

        // Scroll editor to the left after repair
        scrollEditorToLeftAfterRepair();
      } else {
        console.log("[Repair] ❌ Failed: JSONFixer did not succeed");
        toast.error("Failed to repair JSON", { id: toastId });
      }
    } catch (error: any) {
      set({ isProcessing: false });
      console.error("[Repair] ❌ Unexpected error:", error);
      toast.error(error?.message || "Failed to repair JSON", {
        id: "repair-json",
      });
    }
  },
  formatJson: async () => {
    console.log("[Format] Format button clicked");
    try {
      const contents = get().contents;
      console.log("[Format] Content length:", contents.length);

      if (!contents || contents.trim() === "") {
        console.log("[Format] Error: No content to format");
        toast.error("No content to format");
        return;
      }

      if (get().format !== FileFormat.JSON) {
        console.log("[Format] Error: Format is not JSON");
        toast.error("Format is only available for JSON format");
        return;
      }

      const editor = getEditorRef();
      if (!editor) {
        console.log("[Format] Error: Editor not available");
        toast.error("Editor not available");
        return;
      }
      console.log("[Format] Editor reference obtained");

      // Step 1: Try Monaco formatDocument first (fastest for valid JSON)
      const formatAction = editor.getAction("editor.action.formatDocument");
      if (formatAction) {
        console.log("[Format] Step 1: Trying Monaco formatDocument on original content");
        formatAction.run();
        
        // Wait for Monaco to process
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        const formattedContent = editor.getValue();
        console.log("[Format] Monaco formatted content length:", formattedContent.length);
        
        // Check if Monaco successfully formatted it
        try {
          JSON.parse(formattedContent);
          console.log("[Format] ✅ Monaco succeeded - JSON is valid and formatted!");
          // Monaco succeeded - JSON is valid and formatted!
          if (formattedContent === contents) {
            console.log("[Format] Content unchanged - already formatted");
            toast.success("JSON is already formatted");
          } else {
            console.log("[Format] Content changed - applying formatted content");
            get().setContents({ contents: formattedContent, hasChanges: true });
            toast.success("JSON formatted");
          }
          gaEvent("format_json", { method: "monaco" });
          scrollEditorToLeftAfterRepair();
          return;
        } catch (parseError) {
          console.log("[Format] ❌ Monaco failed - JSON is still invalid:", parseError);
          // Monaco couldn't fix it - proceed to jsonrepair
        }
      } else {
        console.log("[Format] Warning: formatAction not available");
      }

      // Step 2: Monaco failed - use jsonrepair for repairs
      console.log("[Format] Step 2: Using jsonrepair to repair invalid JSON");
      let repaired: string;
      try {
        repaired = jsonrepair(contents);
        console.log("[Format] ✅ jsonrepair succeeded - repaired content length:", repaired.length);
      } catch (error: any) {
        console.log("[Format] ❌ jsonrepair failed:", error);
        toast.error(
          "Cannot format - JSON has complex errors. Use Repair button.",
          { duration: 4000 },
        );
        return;
      }

      // Step 3: Update editor with repaired content (preserves undo/redo)
      console.log("[Format] Step 3: Updating editor with repaired content");
      const model = editor.getModel();
      if (model) {
        const fullRange = model.getFullModelRange();
        editor.executeEdits("format-json", [
          {
            range: fullRange,
            text: repaired,
          },
        ]);
        console.log("[Format] Editor updated via executeEdits");
      } else {
        console.log("[Format] Warning: Model not available, using setContents fallback");
        // Fallback: use setContents if model not available
        get().setContents({ contents: repaired, hasChanges: true });
      }

      // Step 4: Apply Monaco formatter to repaired JSON
      console.log("[Format] Step 4: Applying Monaco formatter to repaired JSON");
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (formatAction) {
        formatAction.run();
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("[Format] Monaco formatter applied to repaired content");
      }

      // Get final formatted content
      const finalContent = editor.getValue();
      console.log("[Format] Final formatted content length:", finalContent.length);
      get().setContents({ contents: finalContent, hasChanges: true });

      console.log("[Format] ✅ Success: Formatted & fixed");
      toast.success("Formatted & fixed");
      gaEvent("format_json", { method: "jsonrepair+monaco" });
      scrollEditorToLeftAfterRepair();
    } catch (error: any) {
      console.error("[Format] ❌ Unexpected error:", error);
      toast.error("Failed to format JSON");
    }
  },
  // Filter state methods
  setOriginalContents: (contents) => set({ originalContents: contents }),
  setIsFiltered: (isFiltered) => set({ isFiltered }),
}));

/**
 * Repair large JSON with progress updates
 * Yields to browser periodically to keep UI responsive
 */
async function repairLargeJson(
  content: string,
  onProgress: (progress: number) => void,
): Promise<{ success?: boolean; output: string; fixes: string[] }> {
  onProgress(10);
  await yieldToMain();

  const fixer = new JSONFixer();

  onProgress(30);
  await yieldToMain();

  const result = fixer.fix(content);

  onProgress(80);
  await yieldToMain();

  // Format the output if needed
  if (result.success && result.output) {
    try {
      const parsed = JSON.parse(result.output);
      await yieldToMain();
      result.output = JSON.stringify(parsed, null, 2);
    } catch {
      // Keep original output if formatting fails
    }
  }

  onProgress(100);
  return result;
}

/**
 * Scroll editor to left after repair operation
 */
function scrollEditorToLeftAfterRepair(): void {
  setTimeout(() => {
    try {
      const scrollEditorToLeft = (window as any).__scrollEditorToLeft;
      if (scrollEditorToLeft) {
        scrollEditorToLeft();
      }
    } catch (error) {
      // Continue with DOM approach
    }

    setTimeout(() => {
      const editorContainer = document.querySelector(".monaco-editor");
      if (editorContainer) {
        const scrollableElement = editorContainer.querySelector(
          ".monaco-scrollable-element",
        );
        if (scrollableElement) {
          (scrollableElement as HTMLElement).scrollLeft = 0;
          const resizeEvent = new Event("resize");
          window.dispatchEvent(resizeEvent);
        } else {
          const viewLines = editorContainer.querySelector(".view-lines");
          if (viewLines && viewLines.parentElement) {
            (viewLines.parentElement as HTMLElement).scrollLeft = 0;
          }
        }
      }
    }, 50);
  }, 150);
}

export default useFile;
