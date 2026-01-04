import React, { useCallback, useMemo, useEffect, useRef } from "react";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import toast from "react-hot-toast";
import Editor, {
  type EditorProps,
  loader,
  type OnMount,
  useMonaco,
} from "@monaco-editor/react";

// Get Monaco instance from loader (only on client side)
let monacoGlobal: any = null;
if (typeof window !== "undefined") {
  // Configure Monaco loader paths (client-side only)
  loader.config({
    paths: {
      vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
    },
  });
  
  // Initialize Monaco loader (client-side only)
  loader.init().then((monaco) => {
    monacoGlobal = monaco;
  });
}
import { jsonrepair } from "jsonrepair";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";
import { ViewMode } from "../../enums/viewMode.enum";
import { useSessionStorage } from "@mantine/hooks";
import {
  isAlreadyWrapped,
  hasNDJSONPatternAtTopLevel,
  detectWrapperType,
} from "../../lib/utils/wrapperDetection";
import { getMonacoEditorOptions } from "../../lib/utils/monacoEditorOptions";

// Editor options for TextEditor (main editor)
const getEditorOptions = (wordWrapEnabled: boolean): EditorProps["options"] => {
  return getMonacoEditorOptions(wordWrapEnabled, {
    formatOnPaste: true,
    tabSize: 2,
    formatOnType: true,
    minimap: { enabled: false },
    stickyScroll: { enabled: false },
    scrollBeyondLastLine: false,
    placeholder: "Start typing...",
  });
};

// Global editor ref to access from other components
let globalEditorRef: any = null;

export const getEditorRef = () => globalEditorRef;
export const scrollEditorToLeft = () => {
  if (globalEditorRef) {
    try {
      globalEditorRef.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
      globalEditorRef.layout();
      globalEditorRef.getAction("editor.action.formatDocument")?.run();
    } catch (error) {
      const editorContainer = document.querySelector(".monaco-editor");
      if (editorContainer) {
        const scrollableElement = editorContainer.querySelector(
          ".monaco-scrollable-element",
        );
        if (scrollableElement) {
          (scrollableElement as HTMLElement).scrollLeft = 0;
        }
      }
    }
  } else {
    const editorContainer = document.querySelector(".monaco-editor");
    if (editorContainer) {
      const scrollableElement = editorContainer.querySelector(
        ".monaco-scrollable-element",
      );
      if (scrollableElement) {
        (scrollableElement as HTMLElement).scrollLeft = 0;
      }
    }
  }
};

/**
 * Note: Wrapper detection utilities have been moved to:
 * src/lib/utils/wrapperDetection.ts
 * They are now imported and used from there.
 */

/**
 * Helper function to set editor value with undo/redo support
 * Uses executeEdits instead of setValue to preserve undo history
 */
const setEditorValueWithUndo = (
  editor: any,
  newValue: string,
  source: string = "auto",
) => {
  const model = editor.getModel();
  if (!model) return;

  const fullRange = model.getFullModelRange();
  editor.executeEdits(source, [
    {
      range: fullRange,
      text: newValue,
    },
  ]);
};

const TextEditor = () => {
  const monaco = useMonaco();
  const contents = useFile((state) => state.contents);
  const setContents = useFile((state) => state.setContents);
  const setError = useFile((state) => state.setError);
  const jsonSchema = useFile((state) => state.jsonSchema);
  const getHasChanges = useFile((state) => state.getHasChanges);
  const theme = useConfig((state) =>
    state.darkmodeEnabled ? "vs-dark" : "light",
  );
  const wordWrapEnabled = useConfig((state) => state.wordWrapEnabled);
  const fileType = useFile((state) => state.format);
  const editorRef = React.useRef<any>(null);
  const [viewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor,
  });

  // Static editor options like JSONCrack
  const editorOptions = useMemo(
    () => getEditorOptions(wordWrapEnabled),
    [wordWrapEnabled],
  );

  // Update editor options when word wrap changes
  React.useEffect(() => {
    if (editorRef.current) {
      const wordWrapOptions = getMonacoEditorOptions(wordWrapEnabled);
      editorRef.current.updateOptions(wordWrapOptions);
      if (wordWrapEnabled) {
        editorRef.current.setScrollPosition({ scrollLeft: 0 });
      }
      setTimeout(() => {
        editorRef.current?.layout();
      }, 0);
    }
  }, [wordWrapEnabled]);

  // Configure JSON validation (like JSONCrack)
  React.useEffect(() => {
    if (monaco?.languages?.json) {
      try {
        const shouldValidate = true;

        // @ts-ignore - Monaco editor API compatibility
        monaco.languages.json.jsonDefaults?.setDiagnosticsOptions({
          validate: shouldValidate,
          allowComments: true,
          enableSchemaRequest: shouldValidate,
          ...(shouldValidate &&
            jsonSchema && {
              schemas: [
                {
                  uri: "http://myserver/foo-schema.json",
                  fileMatch: ["*"],
                  schema: jsonSchema,
                },
              ],
            }),
        });
      } catch (e) {
        // Silently handle Monaco API differences
      }
    }
  }, [jsonSchema, monaco, contents]);

  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (getHasChanges()) {
        const confirmationMessage =
          "Unsaved changes, if you leave before saving  your changes will be lost";

        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", beforeunload);

    return () => {
      window.removeEventListener("beforeunload", beforeunload);
    };
  }, [getHasChanges]);

  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      globalEditorRef = editor;

      // Make scroll function available globally
      (window as any).__scrollEditorToLeft = scrollEditorToLeft;

      // Reset horizontal scroll if word wrap is enabled
      if (wordWrapEnabled) {
        editor.setScrollPosition({ scrollLeft: 0 });
      }

      // === PASTE HANDLER === (Auto-format and auto-repair on paste)
      editor.onDidPaste(async () => {
        // Get pasted content immediately
        const currentContent = editor.getValue();

        // Normal flow for content formatting
        // Format like JSONCrack - call formatDocument immediately (exact same code)
        const formatAction = editor.getAction("editor.action.formatDocument");

        if (formatAction) {
          // Call formatDocument immediately (like JSONCrack)
          formatAction.run();

          // Also call it again after a small delay to ensure it runs
          setTimeout(() => {
            formatAction.run();
          }, 10);
        }

        // After formatDocument, check if JSON is valid
        // If not, try jsonrepair (like jsonEditorOnline)
        // Note: jsonEditorOnline doesn't check size limit in tree mode - always tries repair
        setTimeout(() => {
          const contentAfterFormat = editor.getValue();

          if (contentAfterFormat.length > 0) {
            try {
              // Try to parse - if this fails, JSON is invalid
              JSON.parse(contentAfterFormat);
              // If parse succeeds, formatDocument worked - no need for repair
              console.log("[onDidPaste] JSON is valid after formatDocument");
            } catch (parseError) {
              // JSON is invalid - try jsonrepair (like jsonEditorOnline)
              console.log(
                "[onDidPaste] JSON is invalid, attempting auto-repair:",
                parseError instanceof Error
                  ? parseError.message
                  : "Unknown error",
              );

              // Check if content is already wrapped (user manually created {} or [])
              const wrapStatus = isAlreadyWrapped(currentContent);

              // Use same approach as jsonEditorOnline's repairPartialJson
              let repaired: string | null = null;
              let parsed: any = null;

              // If already wrapped, run jsonrepair directly (like jsonEditorOnline)
              // jsonrepair can fix partial JSON inside existing wrappers
              if (wrapStatus.wrapped) {
                console.log(
                  `[onDidPaste] Content is already wrapped in ${wrapStatus.type === "object" ? "{}" : "[]"}, running jsonrepair directly (no double-wrapping)`,
                );
                try {
                  // Run jsonrepair directly on wrapped content - it will fix what's inside
                  repaired = jsonrepair(currentContent);
                  parsed = JSON.parse(repaired);
                  console.log(
                    "[onDidPaste] jsonrepair succeeded on already-wrapped content!",
                  );

                  // Format and update editor
                  const formatted = JSON.stringify(parsed, null, 2);
                  setEditorValueWithUndo(editor, formatted, "auto-repair");
                  editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                  editor.setPosition({ lineNumber: 1, column: 1 });
                  editor.revealLine(1, 0);
                  toast.success("JSON auto-repaired inside wrapper", {
                    duration: 2000,
                  });
                  return;
                } catch (wrappedError) {
                  // jsonrepair failed on wrapped content - try ALL wrapping possibilities
                  console.log(
                    "[onDidPaste] jsonrepair failed on wrapped content, trying all wrapping strategies:",
                    wrappedError instanceof Error
                      ? wrappedError.message
                      : "Unknown",
                  );

                  const trimmed = currentContent.trim();

                  // Try 1: If wrapped in object {}, try wrapping in array []
                  if (wrapStatus.type === "object") {
                    console.log("[onDidPaste] Try 1: Wrapping object in array");
                    try {
                      // Check for NDJSON pattern at top level (outside strings)
                      // This detects cases like {a:1}{b:2} which is actually NDJSON, not a single object
                      const hasNDJSONPattern =
                        hasNDJSONPatternAtTopLevel(trimmed);
                      let arrayWrapped: string;

                      if (hasNDJSONPattern) {
                        // NDJSON detected: add commas between objects before wrapping
                        console.log(
                          "[onDidPaste] NDJSON pattern detected in wrapped object, adding commas",
                        );
                        // Replace } followed by { at top level with },
                        const withCommas = trimmed.replace(/}\s*{/g, "},{");
                        arrayWrapped = "[" + withCommas + "]";
                      } else {
                        // Normal wrapping
                        arrayWrapped = "[" + trimmed + "]";
                      }

                      repaired = jsonrepair(arrayWrapped);
                      parsed = JSON.parse(repaired);
                      console.log("[onDidPaste] Array wrap succeeded!");

                      const formatted = JSON.stringify(parsed, null, 2);
                      setEditorValueWithUndo(editor, formatted, "auto-repair");
                      editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                      editor.setPosition({ lineNumber: 1, column: 1 });
                      editor.revealLine(1, 0);
                      toast.success("JSON auto-repaired (wrapped in array)", {
                        duration: 2000,
                      });
                      return;
                    } catch (arrayWrapError) {
                      console.log(
                        "[onDidPaste] Array wrap failed:",
                        arrayWrapError instanceof Error
                          ? arrayWrapError.message
                          : "Unknown",
                      );
                      // Continue to next strategy
                    }
                  }

                  // Try 2: If wrapped in array [], try wrapping in object {}
                  if (wrapStatus.type === "array") {
                    console.log("[onDidPaste] Try 2: Wrapping array in object");
                    try {
                      const objectWrapped = "{" + trimmed + "}";
                      repaired = jsonrepair(objectWrapped);
                      parsed = JSON.parse(repaired);
                      console.log("[onDidPaste] Object wrap succeeded!");

                      const formatted = JSON.stringify(parsed, null, 2);
                      setEditorValueWithUndo(editor, formatted, "auto-repair");
                      editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                      editor.setPosition({ lineNumber: 1, column: 1 });
                      editor.revealLine(1, 0);
                      toast.success("JSON auto-repaired (wrapped in object)", {
                        duration: 2000,
                      });
                      return;
                    } catch (objectWrapError) {
                      console.log(
                        "[onDidPaste] Object wrap failed:",
                        objectWrapError instanceof Error
                          ? objectWrapError.message
                          : "Unknown",
                      );
                      // Continue to final fallback
                    }
                  }

                  // Final fallback: try formatDocument
                  console.log(
                    "[onDidPaste] All wrapping strategies failed, trying formatDocument as final fallback",
                  );
                  const formatAction = editor.getAction(
                    "editor.action.formatDocument",
                  );
                  if (formatAction) {
                    formatAction.run();
                  }
                  toast(
                    "JSON repair incomplete. Please review and use Repair button if needed.",
                    { duration: 4000, icon: "ℹ️" },
                  );
                  return;
                }
              }

              // Content is NOT wrapped - use multi-strategy approach
              // Try 1: Direct jsonrepair
              try {
                console.log(
                  "[onDidPaste] Try 1: Direct jsonrepair (content not wrapped)",
                );
                repaired = jsonrepair(currentContent);
                parsed = JSON.parse(repaired);
                console.log("[onDidPaste] Try 1 succeeded!");
              } catch (error1) {
                console.log(
                  "[onDidPaste] Try 1 failed:",
                  error1 instanceof Error ? error1.message : "Unknown",
                );

                // Try 2: Auto-detect wrapper type and wrap (like jsonEditorOnline)
                const trimmed = currentContent.trim();
                let wrappedContent: string;

                // Check for NDJSON pattern at TOP LEVEL only (outside of strings)
                // This checks for } followed by { OUTSIDE of strings (not inside string values)
                const hasNDJSONPattern =
                  hasNDJSONPatternAtTopLevel(currentContent);

                // Priority 1: Check for key pattern at start FIRST (highest priority)
                // This handles cases like "ra": "s{'content':..." which should be object, not array
                const wrapperType = detectWrapperType(currentContent);

                if (wrapperType === "object") {
                  // Key pattern detected - wrap in object (even if NDJSON pattern exists)
                  console.log(
                    "[onDidPaste] Try 2: Key pattern detected at start, wrapping in object {}",
                  );
                  wrappedContent = "{" + trimmed + "}";
                } else if (wrapperType === "array") {
                  // Array-like pattern detected
                  console.log(
                    "[onDidPaste] Try 2: Array-like pattern detected, wrapping in array []",
                  );
                  wrappedContent = "[" + trimmed + "]";
                } else if (hasNDJSONPattern) {
                  // NDJSON detected: multiple concatenated objects at top level
                  // Add commas between objects (like jsonrepair does)
                  console.log(
                    "[onDidPaste] Try 2: NDJSON pattern detected at top level (multiple objects), adding commas and wrapping in array",
                  );
                  // Replace } followed by { at top level with },{
                  const withCommas = trimmed.replace(/}\s*{/g, "},{");
                  wrappedContent = "[" + withCommas + "]";
                } else {
                  // Fallback: try object first (more common for JSON)
                  console.log(
                    "[onDidPaste] Try 2: Fallback - wrapping in object",
                  );
                  wrappedContent = "{" + trimmed + "}";
                }

                try {
                  // Auto-repair IS triggered here on wrapped content
                  console.log(
                    "[onDidPaste] Try 2: Running jsonrepair on wrapped content:",
                    wrappedContent.substring(0, 100) + "...",
                  );
                  repaired = jsonrepair(wrappedContent);
                  parsed = JSON.parse(repaired);
                  console.log(
                    "[onDidPaste] Try 2 succeeded! jsonrepair fixed the wrapped content",
                  );

                  // Update editor with repaired and formatted content
                  const formatted = JSON.stringify(parsed, null, 2);
                  setEditorValueWithUndo(editor, formatted, "auto-repair");
                  editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                  editor.setPosition({ lineNumber: 1, column: 1 });
                  editor.revealLine(1, 0);
                  toast.success("JSON auto-repaired", {
                    duration: 2000,
                  });
                  return;
                } catch (error2) {
                  console.log(
                    "[onDidPaste] Try 2 failed - jsonrepair couldn't fix wrapped content:",
                    error2 instanceof Error ? error2.message : "Unknown",
                  );

                  // Try 3: If object wrapper failed, try array wrapper (and vice versa)
                  // This is like jsonEditorOnline's fallback strategy
                  if (!hasNDJSONPattern) {
                    const wrapperType = detectWrapperType(currentContent);
                    let alternativeWrapped: string;

                    if (wrapperType === "object") {
                      // Try array wrapper instead
                      console.log(
                        "[onDidPaste] Try 3: Object wrapper failed, trying array wrapper",
                      );
                      alternativeWrapped = "[" + trimmed + "]";
                    } else {
                      // Try object wrapper instead
                      console.log(
                        "[onDidPaste] Try 3: Array wrapper failed, trying object wrapper",
                      );
                      alternativeWrapped = "{" + trimmed + "}";
                    }

                    try {
                      repaired = jsonrepair(alternativeWrapped);
                      parsed = JSON.parse(repaired);
                      console.log(
                        "[onDidPaste] Try 3 succeeded! Alternative wrapper worked",
                      );

                      const formatted = JSON.stringify(parsed, null, 2);
                      setEditorValueWithUndo(editor, formatted, "auto-repair");
                      editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                      editor.setPosition({ lineNumber: 1, column: 1 });
                      editor.revealLine(1, 0);
                      toast.success(
                        "JSON auto-repaired (alternative wrapper)",
                        {
                          duration: 2000,
                        },
                      );
                      return;
                    } catch (error3) {
                      console.log(
                        "[onDidPaste] Try 3 also failed:",
                        error3 instanceof Error ? error3.message : "Unknown",
                      );
                    }
                  }

                  // All wrapping strategies failed - show wrapped content anyway
                  // Then try one more repair attempt with different strategy
                  console.log(
                    "[onDidPaste] All wrapping strategies failed, showing wrapped content and trying additional repair...",
                  );

                  // Show wrapped content first
                  setEditorValueWithUndo(editor, wrappedContent, "auto-wrap");
                  editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });

                  // Try one more repair attempt after a short delay (like jsonEditorOnline)
                  setTimeout(() => {
                    try {
                      const currentWrapped = editor.getValue();
                      console.log(
                        "[onDidPaste] Additional repair attempt on wrapped content",
                      );
                      const additionalRepaired = jsonrepair(currentWrapped);
                      const additionalParsed = JSON.parse(additionalRepaired);
                      const formatted = JSON.stringify(
                        additionalParsed,
                        null,
                        2,
                      );
                      setEditorValueWithUndo(editor, formatted, "auto-repair");
                      editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
                      editor.setPosition({ lineNumber: 1, column: 1 });
                      editor.revealLine(1, 0);
                      toast.success("JSON auto-repaired after wrapping", {
                        duration: 2000,
                      });
                      console.log("[onDidPaste] Additional repair succeeded!");
                    } catch (additionalError) {
                      // Additional repair also failed, but wrapped content is already shown
                      console.log(
                        "[onDidPaste] Additional repair also failed, wrapped content remains",
                      );
                      // Try Monaco's formatDocument on wrapped content
                      const formatAction = editor.getAction(
                        "editor.action.formatDocument",
                      );
                      if (formatAction) {
                        formatAction.run();
                      }
                      toast(
                        "JSON wrapped but auto-repair incomplete. Please review and use Repair button if needed.",
                        { duration: 4000, icon: "ℹ️" },
                      );
                    }
                  }, 200);

                  return;
                }
              }

              // If we got here, repair succeeded
              const formatted = JSON.stringify(parsed, null, 2);

              // Update editor with repaired and formatted JSON
              setEditorValueWithUndo(editor, formatted, "auto-format");

              // Reset scroll after updating content
              editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
              editor.setPosition({ lineNumber: 1, column: 1 });
              editor.revealLine(1, 0);

              // Show success toast
              toast.success("JSON auto-repaired and formatted", {
                duration: 2000,
              });
              console.log("[onDidPaste] Auto-repair completed successfully");
            }
          }
        }, 150); // Wait for formatDocument to complete (increased from 100ms)

        // Reset scroll AFTER formatDocument to prevent slice-off issue
        const resetScroll = () => {
          editor.setScrollPosition({ scrollLeft: 0, scrollTop: 0 });
          editor.setPosition({ lineNumber: 1, column: 1 });
          editor.revealLine(1, 0);
        };

        // Reset scroll after formatDocument has time to complete
        requestAnimationFrame(() => {
          resetScroll();
          setTimeout(() => {
            resetScroll();
            setTimeout(() => {
              resetScroll();
              setTimeout(() => {
                resetScroll();
              }, 100);
            }, 50);
          }, 10);
        });
      });

    },
    [wordWrapEnabled, monaco],
  );


  // Content change handler (like JSONCrack)
  const handleChange = useCallback(
    (newContents: string | undefined) => {
      if (!newContents) return;
      setContents({ contents: newContents, skipUpdate: true });
    },
    [setContents],
  );

  return (
    <StyledEditorWrapper $wordWrapEnabled={wordWrapEnabled}>
      <StyledWrapper>
        <Editor
          className="sentry-mask"
          data-sentry-mask="true"
          height="100%"
          language={fileType}
          theme={theme}
          value={contents}
          options={editorOptions}
          onMount={handleMount}
          onValidate={(errors) => setError(errors[0]?.message || "")}
          onChange={handleChange}
          loading={<LoadingOverlay visible />}
        />
      </StyledWrapper>
    </StyledEditorWrapper>
  );
};

export default TextEditor;

const StyledEditorWrapper = styled.div<{ $wordWrapEnabled?: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
  position: relative;

  ${({ $wordWrapEnabled }) =>
    $wordWrapEnabled
      ? `
    /* Word wrap ON: Hide horizontal scrollbar, prevent horizontal scrolling */
    .monaco-editor .monaco-scrollable-element > .scrollbar.horizontal {
      display: none !important;
    }
    .monaco-editor .monaco-scrollable-element > .slider.horizontal {
      display: none !important;
    }
    .monaco-editor .overflow-guard {
      overflow-x: hidden !important;
    }
  `
      : `
    /* Word wrap OFF: Ensure horizontal scrollbar is visible and scrolling works */
    .monaco-editor .overflow-guard {
      overflow-x: auto !important;
    }
  `}

`;

const StyledWrapper = styled.div`
  display: grid;
  height: 100%;
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;
