import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import styled from "styled-components";
import {
  Button,
  Text,
  Tooltip,
  ScrollArea,
  ActionIcon,
  Badge,
  Group,
  SegmentedControl,
  TextInput,
  Menu,
  Divider,
} from "@mantine/core";
import {
  VscArrowSwap,
  VscCopy,
  VscChevronUp,
  VscChevronDown,
  VscCheck,
  VscClose,
  VscDiffAdded,
  VscDiffRemoved,
  VscDiffModified,
  VscListTree,
  VscSplitHorizontal,
  VscSplitVertical,
  VscSearch,
  VscFilter,
  VscExport,
  VscListOrdered,
  VscCode,
} from "react-icons/vsc";
import Editor from "@monaco-editor/react";
import useConfig from "../../../../store/useConfig";
import useFile from "../../../../store/useFile";
import toast from "react-hot-toast";
import { getMonacoEditorOptions } from "../../../../lib/utils/monacoEditorOptions";

// Types
interface DiffItem {
  path: string;
  type: "added" | "removed" | "modified";
  leftValue?: any;
  rightValue?: any;
  accepted?: boolean;
}

type ViewLayout = "sideBySide" | "inline";

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.GRID_BG_COLOR};

  /* Line diff decorations - More visible colors */
  .line-removed {
    background-color: rgba(239, 68, 68, 0.18) !important;
  }

  .line-added {
    background-color: rgba(34, 197, 94, 0.18) !important;
  }

  .line-modified {
    background-color: rgba(245, 158, 11, 0.18) !important;
  }

  .margin-removed {
    background-color: rgba(239, 68, 68, 0.5) !important;
    width: 4px !important;
  }

  .margin-added {
    background-color: rgba(34, 197, 94, 0.5) !important;
    width: 4px !important;
  }

  .margin-modified {
    background-color: rgba(245, 158, 11, 0.5) !important;
    width: 4px !important;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: ${({ theme }) => theme.TOOLBAR_BG};
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  gap: 12px;
  flex-shrink: 0;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EditorLabel = styled(Text)`
  font-weight: 600;
  font-size: 12px;
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const EditorsContainer = styled.div<{ $layout: ViewLayout }>`
  flex: 1;
  display: flex;
  flex-direction: ${({ $layout }) =>
    $layout === "sideBySide" ? "row" : "column"};
  overflow: hidden;
`;

const EditorPane = styled.div<{ $side: "left" | "right" }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: ${({ $side, theme }) =>
    $side === "left" ? `1px solid ${theme.SILVER_DARK}` : "none"};
`;

const EditorHeader = styled.div<{ $side: "left" | "right" }>`
  padding: 6px 12px;
  background: ${({ $side }) =>
    $side === "left"
      ? "rgba(248, 113, 113, 0.08)"
      : "rgba(74, 222, 128, 0.08)"};
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const EditorWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

const StatsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 16px;
  background: ${({ theme }) => theme.TOOLBAR_BG};
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  font-size: 12px;
  flex-shrink: 0;
`;

const Stat = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ $color }) => $color};
  font-weight: 600;
`;

const NavButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`;

const SidePanel = styled.div<{ $visible: boolean }>`
  width: ${({ $visible }) => ($visible ? "300px" : "0")};
  min-width: ${({ $visible }) => ($visible ? "300px" : "0")};
  border-left: ${({ $visible, theme }) =>
    $visible ? `1px solid ${theme.SILVER_DARK}` : "none"};
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
`;

const PanelHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  background: ${({ theme }) => theme.TOOLBAR_BG};
  flex-shrink: 0;
`;

const DiffList = styled.div`
  flex: 1;
  overflow: auto;
`;

const DiffItemRow = styled.div<{
  $type: "added" | "removed" | "modified";
  $selected?: boolean;
  $accepted?: boolean;
}>`
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  cursor: pointer;
  background: ${({ $selected, $accepted, theme }) =>
    $accepted
      ? "rgba(74, 222, 128, 0.08)"
      : $selected
        ? theme.BACKGROUND_MODIFIER_ACCENT
        : "transparent"};
  opacity: ${({ $accepted }) => ($accepted ? 0.6 : 1)};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme, $accepted }) =>
      $accepted
        ? "rgba(74, 222, 128, 0.12)"
        : theme.BACKGROUND_MODIFIER_ACCENT};
  }
`;

const DiffPath = styled.div`
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  margin-bottom: 6px;
  word-break: break-all;
`;

const DiffValue = styled.div<{ $type: "old" | "new" }>`
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  background: ${({ $type }) =>
    $type === "old" ? "rgba(248, 113, 113, 0.12)" : "rgba(74, 222, 128, 0.12)"};
  color: ${({ $type }) => ($type === "old" ? "#ef4444" : "#22c55e")};
  max-height: 80px;
  overflow: auto;
  word-break: break-all;
`;

const MergeActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  opacity: 0.5;
  padding: 20px;
  text-align: center;
`;

// Utility functions
const getValueAtPath = (obj: any, path: string): any => {
  if (!path || path === "$") return obj;
  const parts = path
    .replace(/^\$\.?/, "")
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
};

const setValueAtPath = (obj: any, path: string, value: any): any => {
  const result = JSON.parse(JSON.stringify(obj));
  if (!path || path === "$") return value;
  const parts = path
    .replace(/^\$\.?/, "")
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      current[parts[i]] = isNaN(Number(parts[i + 1])) ? {} : [];
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  return result;
};

const deleteAtPath = (obj: any, path: string): any => {
  const result = JSON.parse(JSON.stringify(obj));
  if (!path || path === "$") return undefined;
  const parts = path
    .replace(/^\$\.?/, "")
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) return result;
    current = current[parts[i]];
  }
  const lastPart = parts[parts.length - 1];
  if (Array.isArray(current)) {
    current.splice(Number(lastPart), 1);
  } else {
    delete current[lastPart];
  }
  return result;
};

const formatValue = (value: any): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return str.length > 60 ? str.substring(0, 60) + "..." : str;
  }
  return String(value);
};

// Main Component
export const CompareView = () => {
  const darkmodeEnabled = useConfig((state) => state.darkmodeEnabled);
  const wordWrapEnabled = useConfig((state) => state.wordWrapEnabled);
  const currentContents = useFile((state) => state.contents);

  // State
  const [leftJson, setLeftJson] = useState(
    '{\n  "name": "Apple",\n  "color": "red"\n}',
  );
  const [rightJson, setRightJson] = useState(
    '{\n  "name": "Orange",\n  "color": "orange",\n  "citrus": true\n}',
  );
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0);
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [showDiffPanel, setShowDiffPanel] = useState(true);
  const [layout, setLayout] = useState<ViewLayout>("sideBySide");
  const [syncScroll, setSyncScroll] = useState(true);

  // NEW: High-priority feature states
  const [ignoreArrayOrder, setIgnoreArrayOrder] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "added" | "removed" | "modified"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Refs
  const leftEditorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const isScrolling = useRef(false);
  const leftDecorationsRef = useRef<string[]>([]);
  const rightDecorationsRef = useRef<string[]>([]);

  // Cache parsed JSON objects to avoid re-parsing on every render (instant view switching!)
  const parsedJsonCacheRef = useRef<{
    leftHash: string;
    rightHash: string;
    leftObj: any;
    rightObj: any;
  } | null>(null);

  // Simple hash for cache key
  const hashString = useCallback((str: string): string => {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < Math.min(str.length, 1000); i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }, []);

  // Load content from main editor (only on mount)
  useEffect(() => {
    if (currentContents?.trim()) {
      try {
        JSON.parse(currentContents);
        setLeftJson(currentContents);
      } catch {
        // Keep default if invalid
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize JSON by parsing and re-stringifying (removes formatting differences)
  // Cached to avoid re-parsing
  const normalizeJson = useCallback((jsonStr: string): string => {
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj);
    } catch {
      return jsonStr; // Return original if invalid
    }
  }, []);

  // Get parsed JSON with caching (instant - no parsing on view switch!)
  const getParsedJson = useCallback(
    (jsonStr: string, isLeft: boolean): any => {
      const hash = hashString(jsonStr);
      const cache = parsedJsonCacheRef.current;

      if (isLeft) {
        if (cache && cache.leftHash === hash && cache.leftObj) {
          return cache.leftObj;
        }
      } else {
        if (cache && cache.rightHash === hash && cache.rightObj) {
          return cache.rightObj;
        }
      }

      // Parse and cache
      try {
        const obj = JSON.parse(jsonStr);
        if (!parsedJsonCacheRef.current) {
          parsedJsonCacheRef.current = {
            leftHash: isLeft ? hash : "",
            rightHash: !isLeft ? hash : "",
            leftObj: isLeft ? obj : null,
            rightObj: !isLeft ? obj : null,
          };
        } else {
          if (isLeft) {
            parsedJsonCacheRef.current.leftHash = hash;
            parsedJsonCacheRef.current.leftObj = obj;
          } else {
            parsedJsonCacheRef.current.rightHash = hash;
            parsedJsonCacheRef.current.rightObj = obj;
          }
        }
        return obj;
      } catch {
        return null;
      }
    },
    [hashString],
  );

  // Calculate semantic diff with optional ignore array order and whitespace
  // Memoized with caching for instant view switching
  const calculateDiff = useCallback(
    (
      left: string,
      right: string,
      ignoreOrder: boolean,
      ignoreWhitespace: boolean,
    ): DiffItem[] => {
      const items: DiffItem[] = [];
      try {
        // Normalize JSON strings if ignoring whitespace
        const leftNormalized = ignoreWhitespace ? normalizeJson(left) : left;
        const rightNormalized = ignoreWhitespace ? normalizeJson(right) : right;

        // Use cached parsed JSON (instant - no parsing!)
        const leftObj = getParsedJson(leftNormalized, true);
        const rightObj = getParsedJson(rightNormalized, false);

        if (!leftObj || !rightObj) {
          return items;
        }

        // Helper to create a hash for array element matching
        const hashValue = (val: any): string => {
          if (val === null || val === undefined) return String(val);
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        };

        const compare = (leftVal: any, rightVal: any, path: string = "$") => {
          if (leftVal === null && rightVal === null) return;
          if (leftVal === undefined && rightVal === undefined) return;

          if (leftVal === undefined && rightVal !== undefined) {
            items.push({ path, type: "added", rightValue: rightVal });
            return;
          }
          if (leftVal !== undefined && rightVal === undefined) {
            items.push({ path, type: "removed", leftValue: leftVal });
            return;
          }
          if (typeof leftVal !== typeof rightVal) {
            items.push({
              path,
              type: "modified",
              leftValue: leftVal,
              rightValue: rightVal,
            });
            return;
          }

          if (Array.isArray(leftVal) && Array.isArray(rightVal)) {
            if (ignoreOrder) {
              // Compare arrays ignoring order - match by content
              const leftHashes = leftVal.map((v, i) => ({
                hash: hashValue(v),
                index: i,
                value: v,
              }));
              const rightHashes = rightVal.map((v, i) => ({
                hash: hashValue(v),
                index: i,
                value: v,
              }));

              const matchedRight = new Set<number>();

              // Find matches and modifications
              for (const left of leftHashes) {
                const matchIdx = rightHashes.findIndex(
                  (r, i) => !matchedRight.has(i) && r.hash === left.hash,
                );

                if (matchIdx >= 0) {
                  matchedRight.add(matchIdx);
                  // Exact match - no diff needed
                } else {
                  // Check for similar object (same structure, different values)
                  const similarIdx = rightHashes.findIndex(
                    (r, i) =>
                      !matchedRight.has(i) &&
                      typeof left.value === "object" &&
                      typeof r.value === "object" &&
                      JSON.stringify(Object.keys(left.value || {}).sort()) ===
                        JSON.stringify(Object.keys(r.value || {}).sort()),
                  );

                  if (similarIdx >= 0) {
                    matchedRight.add(similarIdx);
                    compare(
                      left.value,
                      rightHashes[similarIdx].value,
                      `${path}[${left.index}]`,
                    );
                  } else {
                    items.push({
                      path: `${path}[${left.index}]`,
                      type: "removed",
                      leftValue: left.value,
                    });
                  }
                }
              }

              // Find additions (unmatched right items)
              rightHashes.forEach((right, i) => {
                if (!matchedRight.has(i)) {
                  items.push({
                    path: `${path}[${right.index}]`,
                    type: "added",
                    rightValue: right.value,
                  });
                }
              });
            } else {
              // Original index-based comparison
              const maxLen = Math.max(leftVal.length, rightVal.length);
              for (let i = 0; i < maxLen; i++) {
                compare(leftVal[i], rightVal[i], `${path}[${i}]`);
              }
            }
            return;
          }

          if (typeof leftVal === "object" && leftVal !== null) {
            const allKeys = new Set([
              ...Object.keys(leftVal),
              ...Object.keys(rightVal),
            ]);
            allKeys.forEach((key) => {
              compare(leftVal[key], rightVal[key], `${path}.${key}`);
            });
            return;
          }

          if (leftVal !== rightVal) {
            items.push({
              path,
              type: "modified",
              leftValue: leftVal,
              rightValue: rightVal,
            });
          }
        };

        compare(leftObj, rightObj);
      } catch {
        // Return empty on parse error
      }
      return items;
    },
    [normalizeJson],
  );

  // Find line RANGE for a JSON path (start and end lines)
  const findLineRangeForPath = useCallback(
    (jsonStr: string, path: string): { start: number; end: number } | null => {
      try {
        const lines = jsonStr.split("\n");
        const pathParts = path
          .replace(/^\$\.?/, "")
          .split(/\.|\[|\]/)
          .filter(Boolean);

        if (pathParts.length === 0) return { start: 1, end: lines.length }; // Root path

        const targetKey = pathParts[pathParts.length - 1];

        // Find the start line containing this key
        let startLine: number | null = null;

        for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
          const line = lines[lineNum - 1];
          const trimmed = line.trim();

          // Check if this line contains our target key
          const keyMatch = trimmed.match(/^"([^"]+)":/);
          if (keyMatch && keyMatch[1] === targetKey) {
            startLine = lineNum;
            break;
          }
        }

        if (!startLine) return null;

        // Now find the end line by counting brackets/braces
        const startTrimmed = lines[startLine - 1].trim();

        // Check if value is on same line (simple value like string, number, boolean)
        if (
          startTrimmed.match(
            /"[^"]+"\s*:\s*("[^"]*"|true|false|null|\d+\.?\d*)\s*,?\s*$/,
          )
        ) {
          return { start: startLine, end: startLine };
        }

        // Value is object or array - find matching closing bracket
        let depth = 0;
        let foundStart = false;

        for (let lineNum = startLine; lineNum <= lines.length; lineNum++) {
          const line = lines[lineNum - 1];

          for (const char of line) {
            if (char === "{" || char === "[") {
              depth++;
              foundStart = true;
            } else if (char === "}" || char === "]") {
              depth--;
              if (foundStart && depth === 0) {
                return { start: startLine, end: lineNum };
              }
            }
          }
        }

        // Fallback - just return single line
        return { start: startLine, end: startLine };
      } catch {
        // Ignore errors
      }
      return null;
    },
    [],
  );

  // Semantic path-based line diff (like JSON Editor Online)
  // Highlights ENTIRE range of lines for each property
  const calculateSemanticLineDiffs = useCallback(
    (left: string, right: string, semanticDiff: DiffItem[]) => {
      const leftDiff: { line: number; type: "removed" | "modified" }[] = [];
      const rightDiff: { line: number; type: "added" | "modified" }[] = [];

      // For each semantic diff item, find ALL lines in the range
      for (const item of semanticDiff) {
        if (item.type === "removed") {
          // Property exists only in left - highlight ALL lines of this property
          const range = findLineRangeForPath(left, item.path);
          if (range) {
            for (let line = range.start; line <= range.end; line++) {
              leftDiff.push({ line, type: "removed" });
            }
          }
        } else if (item.type === "added") {
          // Property exists only in right - highlight ALL lines
          const range = findLineRangeForPath(right, item.path);
          if (range) {
            for (let line = range.start; line <= range.end; line++) {
              rightDiff.push({ line, type: "added" });
            }
          }
        } else if (item.type === "modified") {
          // Property exists in both with different values - YELLOW on both sides
          const leftRange = findLineRangeForPath(left, item.path);
          const rightRange = findLineRangeForPath(right, item.path);

          if (leftRange) {
            for (let line = leftRange.start; line <= leftRange.end; line++) {
              leftDiff.push({ line, type: "modified" });
            }
          }
          if (rightRange) {
            for (let line = rightRange.start; line <= rightRange.end; line++) {
              rightDiff.push({ line, type: "modified" });
            }
          }
        }
      }

      return { leftDiff, rightDiff };
    },
    [findLineRangeForPath],
  );

  // Store latest JSON refs to avoid stale closures
  const leftJsonRef = useRef(leftJson);
  const rightJsonRef = useRef(rightJson);

  useEffect(() => {
    leftJsonRef.current = leftJson;
    rightJsonRef.current = rightJson;
  }, [leftJson, rightJson]);

  // Memoize diff calculation for instant view switching (only recalculate when inputs change)
  const diffItemsMemoized = useMemo(() => {
    return calculateDiff(
      leftJson,
      rightJson,
      ignoreArrayOrder,
      ignoreWhitespace,
    );
  }, [leftJson, rightJson, ignoreArrayOrder, ignoreWhitespace, calculateDiff]);

  // Clear cache when JSON changes (to ensure fresh parsing)
  useEffect(() => {
    parsedJsonCacheRef.current = null;
  }, [leftJson, rightJson]);

  // Update diff when content changes - instant with memoization!
  useEffect(() => {
    setDiffItems(diffItemsMemoized);

    // Apply line decorations after editors are ready, using semantic diff
    const timeoutId = setTimeout(() => {
      if (!leftEditorRef.current || !rightEditorRef.current) return;

      const currentLeft = leftJsonRef.current;
      const currentRight = rightJsonRef.current;

      // Use SEMANTIC diff (path-based) for line highlighting
      const { leftDiff, rightDiff } = calculateSemanticLineDiffs(
        currentLeft,
        currentRight,
        diffItemsMemoized,
      );

      console.log(
        "[Compare] Semantic decoration apply:",
        leftDiff.length,
        "left,",
        rightDiff.length,
        "right",
      );

      // Apply left decorations (removed = red, modified = yellow)
      const leftDecorations = leftDiff.map(({ line, type }) => ({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: Number.MAX_SAFE_INTEGER,
        },
        options: {
          isWholeLine: true,
          className: type === "removed" ? "line-removed" : "line-modified",
          linesDecorationsClassName:
            type === "removed" ? "margin-removed" : "margin-modified",
          overviewRuler: {
            color: type === "removed" ? "#ef4444" : "#f59e0b",
            position: 1,
          },
          marginClassName:
            type === "removed" ? "margin-removed" : "margin-modified",
        },
      }));

      // Apply right decorations (added = green, modified = yellow)
      const rightDecorations = rightDiff.map(({ line, type }) => ({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: Number.MAX_SAFE_INTEGER,
        },
        options: {
          isWholeLine: true,
          className: type === "added" ? "line-added" : "line-modified",
          linesDecorationsClassName:
            type === "added" ? "margin-added" : "margin-modified",
          overviewRuler: {
            color: type === "added" ? "#22c55e" : "#f59e0b",
            position: 1,
          },
          marginClassName:
            type === "added" ? "margin-added" : "margin-modified",
        },
      }));

      leftDecorationsRef.current = leftEditorRef.current.deltaDecorations(
        leftDecorationsRef.current,
        leftDecorations,
      );
      rightDecorationsRef.current = rightEditorRef.current.deltaDecorations(
        rightDecorationsRef.current,
        rightDecorations,
      );
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    leftJson,
    rightJson,
    ignoreArrayOrder,
    ignoreWhitespace,
    calculateDiff,
    calculateSemanticLineDiffs,
  ]);

  // Filtered and searched diff items
  const filteredDiffItems = useMemo(() => {
    let items = diffItems;

    // Apply type filter
    if (filterType !== "all") {
      items = items.filter((item) => item.type === filterType);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.path.toLowerCase().includes(query) ||
          formatValue(item.leftValue).toLowerCase().includes(query) ||
          formatValue(item.rightValue).toLowerCase().includes(query),
      );
    }

    return items;
  }, [diffItems, filterType, searchQuery]);

  // Diff stats
  const stats = useMemo(
    () => ({
      added: diffItems.filter((i) => i.type === "added").length,
      removed: diffItems.filter((i) => i.type === "removed").length,
      modified: diffItems.filter((i) => i.type === "modified").length,
      pending: diffItems.filter((i) => !i.accepted).length,
    }),
    [diffItems],
  );

  // Export diff functionality
  const exportDiff = useCallback(
    (format: "json" | "csv" | "markdown") => {
      const data = diffItems.map((item) => ({
        path: item.path,
        type: item.type,
        oldValue:
          item.leftValue !== undefined ? formatValue(item.leftValue) : "",
        newValue:
          item.rightValue !== undefined ? formatValue(item.rightValue) : "",
        status: item.accepted ? "resolved" : "pending",
      }));

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "json":
          content = JSON.stringify(
            {
              summary: {
                added: stats.added,
                removed: stats.removed,
                modified: stats.modified,
              },
              differences: data,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          );
          filename = "diff-report.json";
          mimeType = "application/json";
          break;

        case "csv":
          const headers = "Path,Type,Old Value,New Value,Status";
          const rows = data.map(
            (d) =>
              `"${d.path}","${d.type}","${d.oldValue.replace(/"/g, '""')}","${d.newValue.replace(/"/g, '""')}","${d.status}"`,
          );
          content = [headers, ...rows].join("\n");
          filename = "diff-report.csv";
          mimeType = "text/csv";
          break;

        case "markdown":
          content = `# JSON Diff Report\n\n`;
          content += `**Generated:** ${new Date().toLocaleString()}\n\n`;
          content += `## Summary\n`;
          content += `- ✅ Added: ${stats.added}\n`;
          content += `- ❌ Removed: ${stats.removed}\n`;
          content += `- 🔄 Modified: ${stats.modified}\n\n`;
          content += `## Differences\n\n`;
          content += `| Path | Type | Old Value | New Value |\n`;
          content += `|------|------|-----------|----------|\n`;
          data.forEach((d) => {
            content += `| \`${d.path}\` | ${d.type} | ${d.oldValue || "-"} | ${d.newValue || "-"} |\n`;
          });
          filename = "diff-report.md";
          mimeType = "text/markdown";
          break;
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    },
    [diffItems, stats],
  );

  // Editor options - using universal word wrap function
  const editorOptions = useMemo(
    () =>
      getMonacoEditorOptions(wordWrapEnabled, {
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on" as const,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: "line" as const,
        folding: true,
        foldingHighlight: true,
      }),
    [wordWrapEnabled],
  );

  // Synchronized scrolling
  const handleEditorScroll = useCallback(
    (editor: any, isLeft: boolean) => {
      if (!syncScroll || isScrolling.current) return;

      isScrolling.current = true;
      const scrollTop = editor.getScrollTop();
      const targetEditor = isLeft
        ? rightEditorRef.current
        : leftEditorRef.current;

      if (targetEditor) {
        targetEditor.setScrollTop(scrollTop);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 50);
    },
    [syncScroll],
  );

  // Find line number for a path in JSON (uses cached parsed JSON for instant lookup)
  const findLineForPath = useCallback(
    (json: string, path: string): number | null => {
      try {
        // Use cached parsed JSON (instant!)
        const obj = getParsedJson(json, json === leftJson) || JSON.parse(json);
        const value = getValueAtPath(obj, path);
        if (value === undefined) return null;

        const jsonStr = JSON.stringify(obj, null, 2);
        const lines = jsonStr.split("\n");
        const searchStr = JSON.stringify(value);

        // Find the line containing this value
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(searchStr.substring(0, 20))) {
            return i + 1;
          }
        }
      } catch {
        return null;
      }
      return null;
    },
    [],
  );

  // Navigate to specific diff and highlight line
  const navigateToDiff = useCallback(
    (item: DiffItem, index: number) => {
      setCurrentDiffIndex(index);
      setSelectedDiffPath(item.path);

      // Scroll to the line in both editors
      if (
        leftEditorRef.current &&
        (item.type === "removed" || item.type === "modified")
      ) {
        const line = findLineForPath(leftJson, item.path);
        if (line) {
          leftEditorRef.current.revealLineInCenter(line);
          leftEditorRef.current.setPosition({ lineNumber: line, column: 1 });
        }
      }

      if (
        rightEditorRef.current &&
        (item.type === "added" || item.type === "modified")
      ) {
        const line = findLineForPath(rightJson, item.path);
        if (line) {
          rightEditorRef.current.revealLineInCenter(line);
          rightEditorRef.current.setPosition({ lineNumber: line, column: 1 });
        }
      }
    },
    [leftJson, rightJson, findLineForPath],
  );

  // Navigation
  const navigateToNext = useCallback(() => {
    if (diffItems.length === 0) return;
    const nextIndex = (currentDiffIndex + 1) % diffItems.length;
    navigateToDiff(diffItems[nextIndex], nextIndex);
  }, [currentDiffIndex, diffItems, navigateToDiff]);

  const navigateToPrev = useCallback(() => {
    if (diffItems.length === 0) return;
    const prevIndex =
      (currentDiffIndex - 1 + diffItems.length) % diffItems.length;
    navigateToDiff(diffItems[prevIndex], prevIndex);
  }, [currentDiffIndex, diffItems, navigateToDiff]);

  // Merge actions
  const acceptChange = useCallback(
    (item: DiffItem) => {
      try {
        // Use cached parsed JSON (instant!)
        let leftObj = getParsedJson(leftJson, true);
        if (!leftObj) {
          leftObj = JSON.parse(leftJson);
        }
        if (item.type === "added") {
          leftObj = setValueAtPath(leftObj, item.path, item.rightValue);
        } else if (item.type === "removed") {
          leftObj = deleteAtPath(leftObj, item.path);
        } else {
          leftObj = setValueAtPath(leftObj, item.path, item.rightValue);
        }
        setLeftJson(JSON.stringify(leftObj, null, 2));
        setDiffItems((prev) =>
          prev.map((i) =>
            i.path === item.path ? { ...i, accepted: true } : i,
          ),
        );
        toast.success(`Accepted: ${item.path}`);
      } catch {
        toast.error("Failed to apply change");
      }
    },
    [leftJson],
  );

  const rejectChange = useCallback(
    (item: DiffItem) => {
      try {
        // Use cached parsed JSON (instant!)
        let rightObj = getParsedJson(rightJson, false);
        if (!rightObj) {
          rightObj = JSON.parse(rightJson);
        }
        if (item.type === "added") {
          rightObj = deleteAtPath(rightObj, item.path);
        } else if (item.type === "removed") {
          const leftObj = getParsedJson(leftJson, true) || JSON.parse(leftJson);
          rightObj = setValueAtPath(
            rightObj,
            item.path,
            getValueAtPath(leftObj, item.path),
          );
        } else {
          rightObj = setValueAtPath(rightObj, item.path, item.leftValue);
        }
        setRightJson(JSON.stringify(rightObj, null, 2));
        setDiffItems((prev) =>
          prev.map((i) =>
            i.path === item.path ? { ...i, accepted: true } : i,
          ),
        );
        toast.success(`Rejected: ${item.path}`);
      } catch {
        toast.error("Failed to reject change");
      }
    },
    [leftJson, rightJson],
  );

  const acceptAll = useCallback(() => {
    setLeftJson(rightJson);
    setDiffItems((prev) => prev.map((i) => ({ ...i, accepted: true })));
    toast.success("Accepted all changes");
  }, [rightJson]);

  const rejectAll = useCallback(() => {
    setRightJson(leftJson);
    setDiffItems((prev) => prev.map((i) => ({ ...i, accepted: true })));
    toast.success("Rejected all changes");
  }, [leftJson]);

  // Actions
  const handleSwap = () => {
    setLeftJson(rightJson);
    setRightJson(leftJson);
  };

  const handleLoad = () => {
    if (currentContents?.trim()) {
      try {
        JSON.parse(currentContents);
        setLeftJson(currentContents);
        toast.success("Loaded from editor");
      } catch {
        toast.error("Invalid JSON in editor");
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(leftJson);
    toast.success("Copied merged result");
  };

  return (
    <Container>
      {/* Header */}
      <Header>
        <HeaderSection>
          <Tooltip label="Load from main editor">
            <Button
              size="xs"
              variant="subtle"
              leftSection={<VscCopy size={14} />}
              onClick={handleLoad}
            >
              Load
            </Button>
          </Tooltip>
          <Button
            size="xs"
            variant="light"
            leftSection={<VscArrowSwap size={14} />}
            onClick={handleSwap}
          >
            Swap
          </Button>
          <Divider orientation="vertical" />

          {/* Ignore Array Order Toggle */}
          <Tooltip label="When enabled, arrays are compared by content, not by index position">
            <Button
              size="xs"
              variant={ignoreArrayOrder ? "filled" : "subtle"}
              leftSection={<VscListOrdered size={14} />}
              onClick={() => setIgnoreArrayOrder(!ignoreArrayOrder)}
              color={ignoreArrayOrder ? "blue" : "gray"}
            >
              Ignore Order
            </Button>
          </Tooltip>

          {/* Ignore Whitespace Toggle */}
          <Tooltip label="When enabled, formatting differences (indentation, spacing) are ignored">
            <Button
              size="xs"
              variant={ignoreWhitespace ? "filled" : "subtle"}
              leftSection={<VscCode size={14} />}
              onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
              color={ignoreWhitespace ? "blue" : "gray"}
            >
              Ignore Whitespace
            </Button>
          </Tooltip>
        </HeaderSection>

        <HeaderSection>
          {/* Filter by Type */}
          <Menu shadow="md" width={140}>
            <Menu.Target>
              <Tooltip label="Filter by change type">
                <ActionIcon
                  variant={filterType !== "all" ? "filled" : "subtle"}
                  size="sm"
                  color={filterType !== "all" ? "blue" : "gray"}
                >
                  <VscFilter size={14} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Filter Changes</Menu.Label>
              <Menu.Item
                leftSection={
                  filterType === "all" ? <VscCheck size={12} /> : null
                }
                onClick={() => setFilterType("all")}
              >
                All Changes
              </Menu.Item>
              <Menu.Item
                leftSection={
                  filterType === "added" ? (
                    <VscCheck size={12} />
                  ) : (
                    <VscDiffAdded size={12} color="#22c55e" />
                  )
                }
                onClick={() => setFilterType("added")}
              >
                Added Only
              </Menu.Item>
              <Menu.Item
                leftSection={
                  filterType === "removed" ? (
                    <VscCheck size={12} />
                  ) : (
                    <VscDiffRemoved size={12} color="#ef4444" />
                  )
                }
                onClick={() => setFilterType("removed")}
              >
                Removed Only
              </Menu.Item>
              <Menu.Item
                leftSection={
                  filterType === "modified" ? (
                    <VscCheck size={12} />
                  ) : (
                    <VscDiffModified size={12} color="#f59e0b" />
                  )
                }
                onClick={() => setFilterType("modified")}
              >
                Modified Only
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          {/* Export Menu */}
          <Menu shadow="md" width={160}>
            <Menu.Target>
              <Tooltip label="Export diff report">
                <ActionIcon variant="subtle" size="sm">
                  <VscExport size={14} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Export As</Menu.Label>
              <Menu.Item onClick={() => exportDiff("json")}>
                JSON Report
              </Menu.Item>
              <Menu.Item onClick={() => exportDiff("csv")}>
                CSV Spreadsheet
              </Menu.Item>
              <Menu.Item onClick={() => exportDiff("markdown")}>
                Markdown Table
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Divider orientation="vertical" />

          <SegmentedControl
            size="xs"
            value={layout}
            onChange={(v) => setLayout(v as ViewLayout)}
            data={[
              { value: "sideBySide", label: <VscSplitHorizontal size={14} /> },
              { value: "inline", label: <VscSplitVertical size={14} /> },
            ]}
          />
          <Tooltip label={syncScroll ? "Sync scroll ON" : "Sync scroll OFF"}>
            <ActionIcon
              variant={syncScroll ? "filled" : "subtle"}
              size="sm"
              onClick={() => setSyncScroll(!syncScroll)}
            >
              <VscArrowSwap size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Toggle diff panel">
            <ActionIcon
              variant={showDiffPanel ? "filled" : "subtle"}
              size="sm"
              onClick={() => setShowDiffPanel(!showDiffPanel)}
            >
              <VscListTree size={14} />
            </ActionIcon>
          </Tooltip>
        </HeaderSection>
      </Header>

      {/* Stats Bar */}
      <StatsBar>
        <Stat $color="#22c55e">
          <VscDiffAdded size={14} /> +{stats.added}
        </Stat>
        <Stat $color="#ef4444">
          <VscDiffRemoved size={14} /> -{stats.removed}
        </Stat>
        <Stat $color="#f59e0b">
          <VscDiffModified size={14} /> ~{stats.modified}
        </Stat>

        <NavButtons>
          <Tooltip label="Previous (↑)">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={navigateToPrev}
              disabled={diffItems.length === 0}
            >
              <VscChevronUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Text
            fz="xs"
            c="dimmed"
            style={{ minWidth: 50, textAlign: "center" }}
          >
            {diffItems.length > 0
              ? `${currentDiffIndex + 1} / ${diffItems.length}`
              : "0 / 0"}
          </Text>
          <Tooltip label="Next (↓)">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={navigateToNext}
              disabled={diffItems.length === 0}
            >
              <VscChevronDown size={14} />
            </ActionIcon>
          </Tooltip>
        </NavButtons>
      </StatsBar>

      {/* Main Content */}
      <MainContent>
        <EditorsContainer $layout={layout}>
          {/* Left Editor (Original) */}
          <EditorPane $side="left">
            <EditorHeader $side="left">
              <EditorLabel>Original</EditorLabel>
              <Badge size="xs" color="red" variant="light">
                -{stats.removed}
              </Badge>
            </EditorHeader>
            <EditorWrapper>
              <Editor
                height="100%"
                language="json"
                value={leftJson}
                onChange={(v) => setLeftJson(v || "")}
                theme={darkmodeEnabled ? "vs-dark" : "light"}
                options={editorOptions}
                onMount={(editor) => {
                  leftEditorRef.current = editor;
                  editor.onDidScrollChange(() =>
                    handleEditorScroll(editor, true),
                  );
                }}
              />
            </EditorWrapper>
          </EditorPane>

          {/* Right Editor (Modified) */}
          <EditorPane $side="right">
            <EditorHeader $side="right">
              <EditorLabel>Modified</EditorLabel>
              <Badge size="xs" color="green" variant="light">
                +{stats.added}
              </Badge>
            </EditorHeader>
            <EditorWrapper>
              <Editor
                height="100%"
                language="json"
                value={rightJson}
                onChange={(v) => setRightJson(v || "")}
                theme={darkmodeEnabled ? "vs-dark" : "light"}
                options={editorOptions}
                onMount={(editor) => {
                  rightEditorRef.current = editor;
                  editor.onDidScrollChange(() =>
                    handleEditorScroll(editor, false),
                  );
                }}
              />
            </EditorWrapper>
          </EditorPane>
        </EditorsContainer>

        {/* Diff Panel */}
        <SidePanel $visible={showDiffPanel}>
          <PanelHeader>
            <Group justify="space-between" mb="xs">
              <Text fw={600} fz="sm">
                Diff Report
              </Text>
              <Badge size="sm" color={stats.pending > 0 ? "orange" : "green"}>
                {stats.pending} pending
              </Badge>
            </Group>

            {/* Search Input */}
            <TextInput
              size="xs"
              placeholder="Search paths or values..."
              leftSection={<VscSearch size={12} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              mb="xs"
              styles={{ input: { fontSize: 11 } }}
            />

            {/* Filter indicator */}
            {(filterType !== "all" || searchQuery) && (
              <Group gap={4} mb="xs">
                {filterType !== "all" && (
                  <Badge
                    size="xs"
                    color="blue"
                    variant="light"
                    rightSection={
                      <ActionIcon
                        size={12}
                        variant="transparent"
                        onClick={() => setFilterType("all")}
                      >
                        <VscClose size={10} />
                      </ActionIcon>
                    }
                  >
                    {filterType}
                  </Badge>
                )}
                {searchQuery && (
                  <Badge
                    size="xs"
                    color="gray"
                    variant="light"
                    rightSection={
                      <ActionIcon
                        size={12}
                        variant="transparent"
                        onClick={() => setSearchQuery("")}
                      >
                        <VscClose size={10} />
                      </ActionIcon>
                    }
                  >
                    &quot;
                    {searchQuery.length > 10
                      ? searchQuery.slice(0, 10) + "..."
                      : searchQuery}
                    &quot;
                  </Badge>
                )}
                <Text fz={10} c="dimmed">
                  {filteredDiffItems.length} of {diffItems.length}
                </Text>
              </Group>
            )}

            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<VscCheck size={12} />}
                onClick={acceptAll}
                disabled={stats.pending === 0}
              >
                Accept All
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<VscClose size={12} />}
                onClick={rejectAll}
                disabled={stats.pending === 0}
              >
                Reject All
              </Button>
              <Tooltip label="Copy merged">
                <ActionIcon variant="subtle" size="sm" onClick={handleCopy}>
                  <VscCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </PanelHeader>

          <ScrollArea style={{ flex: 1 }}>
            <DiffList>
              {filteredDiffItems.length === 0 ? (
                <EmptyState>
                  <VscCheck size={32} />
                  <Text fz="sm" mt="sm">
                    {diffItems.length === 0
                      ? "No differences"
                      : "No matching results"}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {diffItems.length === 0
                      ? "Both JSONs are identical"
                      : "Try adjusting your filter or search"}
                  </Text>
                </EmptyState>
              ) : (
                filteredDiffItems.map((item, idx) => (
                  <DiffItemRow
                    key={item.path}
                    $type={item.type}
                    $selected={selectedDiffPath === item.path}
                    $accepted={item.accepted}
                    onClick={() => navigateToDiff(item, idx)}
                  >
                    <Group gap="xs" mb={4}>
                      {item.type === "added" && (
                        <VscDiffAdded size={14} color="#22c55e" />
                      )}
                      {item.type === "removed" && (
                        <VscDiffRemoved size={14} color="#ef4444" />
                      )}
                      {item.type === "modified" && (
                        <VscDiffModified size={14} color="#f59e0b" />
                      )}
                      <Badge
                        size="xs"
                        color={
                          item.type === "added"
                            ? "green"
                            : item.type === "removed"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {item.type}
                      </Badge>
                      {item.accepted && (
                        <Badge size="xs" color="gray">
                          resolved
                        </Badge>
                      )}
                    </Group>

                    <DiffPath>{item.path}</DiffPath>

                    {(item.type === "removed" || item.type === "modified") && (
                      <DiffValue $type="old">
                        - {formatValue(item.leftValue)}
                      </DiffValue>
                    )}
                    {(item.type === "added" || item.type === "modified") && (
                      <DiffValue $type="new">
                        + {formatValue(item.rightValue)}
                      </DiffValue>
                    )}

                    {!item.accepted && (
                      <MergeActions>
                        <Tooltip label="Accept">
                          <ActionIcon
                            size="xs"
                            variant="light"
                            color="green"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptChange(item);
                            }}
                          >
                            <VscCheck size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Reject">
                          <ActionIcon
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectChange(item);
                            }}
                          >
                            <VscClose size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </MergeActions>
                    )}
                  </DiffItemRow>
                ))
              )}
            </DiffList>
          </ScrollArea>
        </SidePanel>
      </MainContent>
    </Container>
  );
};
