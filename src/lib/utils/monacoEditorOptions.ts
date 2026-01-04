import type { EditorProps } from "@monaco-editor/react";

/**
 * Universal function to get Monaco Editor options with word wrap support
 * This ensures consistent word wrap behavior across all editors:
 * - TextEditor (main editor)
 * - CompareView (left and right editors)
 * - Any other Monaco Editor instances
 * 
 * @param wordWrapEnabled - Whether word wrap is enabled (from useConfig)
 * @param additionalOptions - Optional additional options to merge
 * @returns Monaco Editor options object
 */
export const getMonacoEditorOptions = (
  wordWrapEnabled: boolean,
  additionalOptions?: Partial<EditorProps["options"]>,
): EditorProps["options"] => {
  const baseOptions: EditorProps["options"] = {
    wordWrap: wordWrapEnabled ? "on" : "off",
    wrappingStrategy: wordWrapEnabled ? "advanced" : undefined,
    scrollBeyondLastColumn: wordWrapEnabled ? 0 : 5,
    scrollbar: {
      horizontal: wordWrapEnabled ? "hidden" : "auto",
      vertical: "auto",
      horizontalScrollbarSize: wordWrapEnabled ? 0 : 10,
      useShadows: false,
    },
  };

  return {
    ...baseOptions,
    ...additionalOptions,
    // Ensure word wrap settings override any conflicting options
    wordWrap: wordWrapEnabled ? "on" : "off",
    wrappingStrategy: wordWrapEnabled ? "advanced" : undefined,
    scrollbar: {
      ...baseOptions.scrollbar,
      ...additionalOptions?.scrollbar,
      horizontal: wordWrapEnabled ? "hidden" : "auto",
      horizontalScrollbarSize: wordWrapEnabled ? 0 : 10,
    },
  };
};

