import React from "react";
import { useTheme } from "styled-components";
import { useHotkeys, useClipboard } from "@mantine/hooks";
import { JSONTree } from "react-json-tree";
import type { KeyPath } from "react-json-tree";
import styled from "styled-components";
import { Text, Button, Group, SegmentedControl } from "@mantine/core";
import toast from "react-hot-toast";
import useJson from "../../../../store/useJson";
import useFile from "../../../../store/useFile";
import { Label } from "./Label";
import { Value } from "./Value";
import { PathBar } from "./PathBar";
import { TreeSearchWidget } from "./TreeSearchWidget";
import { TreeToolbar } from "./TreeToolbar";
import { TreeContextMenu, useTreeContextMenu } from "./TreeContextMenu";
import { ViewMode } from "../../../../enums/viewMode.enum";
import { useSessionStorage } from "@mantine/hooks";
import { VirtualizedTree } from "./VirtualizedTree";
import { parseAndRepair } from "../../../../lib/utils/jsonAdapter";

// Size thresholds for tree view performance
const TREE_THRESHOLDS = {
  WARN_SIZE: 500_000, // 500KB - show warning
  VIRTUALIZE_SIZE: 100_000, // 100KB - use virtualized tree
  LIMIT_SIZE: 1_000_000, // 1MB - limit initial expansion
  DISABLE_SIZE: 5_000_000, // 5MB - disable tree view
  MAX_VISIBLE_KEYS: 1000, // Max keys to show in initial render
  MAX_DEPTH: 10, // Max depth for initial expansion
};

// Count total nodes in JSON
const countNodes = (obj: any, depth: number = 0): number => {
  if (depth > TREE_THRESHOLDS.MAX_DEPTH) return 1;
  if (obj === null || obj === undefined) return 1;
  if (typeof obj !== "object") return 1;

  let count = 1;
  const keys = Object.keys(obj);

  // Limit counting for very large objects
  if (keys.length > TREE_THRESHOLDS.MAX_VISIBLE_KEYS) {
    return TREE_THRESHOLDS.MAX_VISIBLE_KEYS + 1;
  }

  for (const key of keys) {
    count += countNodes(obj[key], depth + 1);
    if (count > TREE_THRESHOLDS.MAX_VISIBLE_KEYS) break;
  }

  return count;
};

// Get a limited subset of large objects/arrays
const getLimitedData = (obj: any, maxKeys: number = 100): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    if (obj.length <= maxKeys) return obj;
    const limited = obj.slice(0, maxKeys);
    return [...limited, `... ${obj.length - maxKeys} more items`];
  }

  const keys = Object.keys(obj);
  if (keys.length <= maxKeys) return obj;

  const limited: any = {};
  keys.slice(0, maxKeys).forEach((key) => {
    limited[key] = obj[key];
  });
  limited[`__more_${keys.length - maxKeys}_keys__`] =
    `${keys.length - maxKeys} more keys hidden`;

  return limited;
};

const StyledTreeWrapper = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
`;

// Depth line colors - gradient from blue to purple to pink (with transparency)
const DEPTH_COLORS = [
  "rgba(59, 130, 246, 0.35)", // Level 1 - Blue
  "rgba(99, 102, 241, 0.35)", // Level 2 - Indigo
  "rgba(139, 92, 246, 0.35)", // Level 3 - Violet
  "rgba(168, 85, 247, 0.35)", // Level 4 - Purple
  "rgba(217, 70, 239, 0.35)", // Level 5 - Fuchsia
  "rgba(236, 72, 153, 0.35)", // Level 6 - Pink
  "rgba(244, 63, 94, 0.35)", // Level 7 - Rose
  "rgba(249, 115, 22, 0.35)", // Level 8 - Orange
  "rgba(234, 179, 8, 0.35)", // Level 9 - Yellow
  "rgba(34, 197, 94, 0.35)", // Level 10 - Green
];

const StyledTreeContainer = styled.div`
  flex: 1;
  overflow: auto;
  position: relative;
  -webkit-user-select: text;
  user-select: text;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  color: ${({ theme }) => theme.TEXT_NORMAL};

  /* Keep keys and values on the same line */
  ul {
    list-style: none;
    margin: 0;
    padding-left: 1.5em;
    position: relative;
  }

  li {
    display: block;
    white-space: nowrap;
    position: relative;
    padding: 1px 0;

    /* Animated expand/collapse */
    animation: fadeSlideIn 0.15s ease-out;
  }

  /* Allow values to wrap while keeping keys on one line */
  li > span:last-child {
    white-space: normal;
    word-break: break-word;
    display: inline;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Smooth horizontal scrolling */
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;

  &::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(155, 155, 155, 0.7);
  }

  /* Color-coded depth lines */
  ul ul {
    border-left: 2px solid ${DEPTH_COLORS[0]};
    margin-left: 4px;
    padding-left: 12px;
    transition: border-color 0.2s ease;
  }

  ul ul ul {
    border-left-color: ${DEPTH_COLORS[1]};
  }

  ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[2]};
  }

  ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[3]};
  }

  ul ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[4]};
  }

  ul ul ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[5]};
  }

  ul ul ul ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[6]};
  }

  ul ul ul ul ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[7]};
  }

  ul ul ul ul ul ul ul ul ul ul {
    border-left-color: ${DEPTH_COLORS[8]};
  }

  /* Hover effect on depth lines - slightly more visible */
  ul:hover > ul {
    border-left-width: 2px;
    border-left-color: rgba(99, 102, 241, 0.5);
  }

  mark.tree-search-highlight {
    display: inline;
    background: rgba(255, 200, 0, 0.3);
    border-radius: 2px;
    color: inherit;
    padding: 0;
    margin: 0;
    font: inherit;
    line-height: inherit;
  }

  mark.tree-search-current {
    display: inline;
    background: rgba(255, 165, 0, 0.8);
    outline: 1px solid orange;
    color: inherit;
    padding: 0;
    margin: 0;
    font: inherit;
    line-height: inherit;
  }
`;

const StyledTreeContent = styled.div`
  flex: 1;
  overflow: auto;
  min-height: 0;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
`;

const LargeDataWarning = styled.div`
  padding: 16px;
  background: rgba(255, 165, 0, 0.1);
  border-bottom: 1px solid rgba(255, 165, 0, 0.3);
  text-align: center;
`;

const DisabledTreeMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  gap: 16px;
`;

type TreeMode = "classic" | "virtualized";

export const TreeView = () => {
  const theme = useTheme();
  const json = useJson((state) => state.json);
  const getParsedJson = useJson((state) => state.getParsedJson); // Use cached parsed JSON (like jsonEditorOnline)
  const setJson = useJson((state) => state.setJson);
  const setContents = useFile((state) => state.setContents);
  const clipboard = useClipboard();
  const [selectedPath, setSelectedPath] = React.useState("");
  const [viewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor,
  });
  const treeContainerRef = React.useRef<HTMLDivElement>(null);
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [searchMatches, setSearchMatches] = React.useState<Element[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = React.useState(0);
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(
    new Set(),
  );
  const [searchMatchPaths, setSearchMatchPaths] = React.useState<string[]>([]);
  const [showFullTree, setShowFullTree] = React.useState(false);
  const [isLargeData, setIsLargeData] = React.useState(false);
  const [containerDimensions, setContainerDimensions] = React.useState({
    width: 0,
    height: 0,
  });
  const [currentExpandLevel, setCurrentExpandLevel] = React.useState<
    number | undefined
  >(undefined);

  // Context menu
  const { menuState, showContextMenu, hideContextMenu } = useTreeContextMenu();

  // Track container dimensions for virtualized tree
  React.useEffect(() => {
    const container = treeContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setContainerDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Use cached parsed JSON from store (like jsonEditorOnline - instant view switching)
  // No parsing needed here - already cached in useJson store!
  // Cache heavy computations to avoid re-running on every view switch
  const parsedJsonRef = React.useRef<any>(null);
  const computationCacheRef = React.useRef<{
    jsonHash: string;
    treeData: any;
    isVeryLarge: boolean;
    isDisabled: boolean;
    nodeCount: number;
    shouldUseVirtualized: boolean;
  } | null>(null);

  // Simple hash for JSON string (for cache key)
  const jsonHash = React.useMemo(() => {
    let hash = 0;
    if (json.length === 0) return hash.toString();
    for (let i = 0; i < Math.min(json.length, 1000); i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }, [json]);

  const { treeData, isVeryLarge, isDisabled, nodeCount, shouldUseVirtualized } =
    React.useMemo(() => {
      if (!json) {
        return {
          treeData: {},
          isVeryLarge: false,
          isDisabled: false,
          nodeCount: 0,
          shouldUseVirtualized: false,
        };
      }

      // Check cache first (instant view switching!)
      if (
        computationCacheRef.current &&
        computationCacheRef.current.jsonHash === jsonHash
      ) {
        return computationCacheRef.current;
      }

      // Get cached parsed JSON (instant - no parsing!)
      const parsed = getParsedJson();
      parsedJsonRef.current = parsed;

      if (!parsed) {
        return {
          treeData: {},
          isVeryLarge: false,
          isDisabled: false,
          nodeCount: 0,
          shouldUseVirtualized: false,
        };
      }

      const jsonSize = json.length;

      // Check if too large to render
      if (jsonSize > TREE_THRESHOLDS.DISABLE_SIZE) {
        const result = {
          treeData: {},
          isVeryLarge: true,
          isDisabled: true,
          nodeCount: 0,
          shouldUseVirtualized: false,
        };
        computationCacheRef.current = { jsonHash, ...result };
        return result;
      }

      // Defer expensive node counting for large JSON
      const isLarge = jsonSize > TREE_THRESHOLDS.LIMIT_SIZE;
      const useVirtualized = jsonSize > TREE_THRESHOLDS.VIRTUALIZE_SIZE;

      // For small JSON, count immediately
      // For large JSON, use estimated count or defer
      let count: number;
      if (jsonSize < 50_000) {
        // Small JSON - count immediately
        count = countNodes(parsed);
      } else {
        // Large JSON - use estimated count (avoid blocking)
        count = useVirtualized ? 10000 : Math.min(countNodes(parsed), 10000);
      }

      const shouldLimit =
        isLarge &&
        count > TREE_THRESHOLDS.MAX_VISIBLE_KEYS &&
        !showFullTree &&
        !useVirtualized;

      // Return limited data if too large (only for classic tree)
      const data =
        shouldLimit && !useVirtualized
          ? getLimitedData(parsed, TREE_THRESHOLDS.MAX_VISIBLE_KEYS)
          : parsed;

      const result = {
        treeData: data,
        isVeryLarge: isLarge,
        isDisabled: false,
        nodeCount: count,
        shouldUseVirtualized: useVirtualized,
      };

      // Cache the result for instant view switching
      computationCacheRef.current = { jsonHash, ...result };
      return result;
    }, [json, jsonHash, showFullTree, getParsedJson]);

  // Allow manual toggle between classic and virtualized
  const [treeMode, setTreeMode] = React.useState<TreeMode>(
    shouldUseVirtualized ? "virtualized" : "classic",
  );

  // Update tree mode when data size changes
  React.useEffect(() => {
    setTreeMode(shouldUseVirtualized ? "virtualized" : "classic");
  }, [shouldUseVirtualized]);

  // Update large data state
  React.useEffect(() => {
    setIsLargeData(isVeryLarge);
  }, [isVeryLarge]);

  // Function to search through JSON data and find paths (with depth limit)
  const searchInJSON = React.useCallback(
    (obj: any, searchText: string, currentPath: string[] = []): string[] => {
      const matchingPaths: string[] = [];
      const lowerSearch = searchText.toLowerCase();
      const maxResults = 100; // Limit search results

      const search = (value: any, path: string[], depth: number) => {
        if (depth > TREE_THRESHOLDS.MAX_DEPTH) return;
        if (matchingPaths.length >= maxResults) return;
        if (value === null || value === undefined) return;

        // Check if the current key name contains the search text
        if (path.length > 0) {
          const currentKey = path[path.length - 1];
          if (String(currentKey).toLowerCase().includes(lowerSearch)) {
            matchingPaths.push(path.join("."));
          }
        }

        // Check if the value (when converted to string) contains the search text
        const valueStr = String(value).toLowerCase();
        if (valueStr.includes(lowerSearch)) {
          matchingPaths.push(path.join("."));
        }

        // Recursively search in objects and arrays
        if (typeof value === "object") {
          const keys = Object.keys(value);
          // Limit number of keys to search
          const keysToSearch = keys.slice(0, 500);
          keysToSearch.forEach((key) => {
            const newPath = [...path, key];
            search(value[key], newPath, depth + 1);
          });
        }
      };

      search(obj, currentPath, 0);
      // Remove duplicates
      return Array.from(new Set(matchingPaths));
    },
    [],
  );

  // Function to expand all parent paths of search matches
  const expandPathsForMatches = React.useCallback((matchPaths: string[]) => {
    const pathsToExpand = new Set<string>();

    matchPaths.forEach((matchPath) => {
      const parts = matchPath.split(".");
      // Add all parent paths
      for (let i = 0; i < parts.length; i++) {
        const parentPath = parts.slice(0, i + 1).join(".");
        pathsToExpand.add(parentPath);
      }
    });

    setExpandedPaths(pathsToExpand);
  }, []);

  // Handle Cmd+F only when tree view is active
  useHotkeys([
    [
      "mod+f",
      (e) => {
        // Only handle if we're in tree view mode
        if (viewMode === ViewMode.Tree) {
          // Check if Monaco editor has focus
          const activeElement = document.activeElement;
          const isEditorFocused =
            activeElement?.closest(".monaco-editor") !== null;
          const isInputFocused =
            activeElement?.tagName === "INPUT" ||
            activeElement?.tagName === "TEXTAREA";

          // If editor has focus, let Monaco handle it
          if (isEditorFocused) {
            return; // Let Monaco handle Command+F
          }

          // If an input is focused (editing mode) and it's not the search widget, don't interfere
          if (isInputFocused && !searchVisible) {
            return;
          }

          // Show search widget
          e.preventDefault();
          setSearchVisible(true);
        }
      },
    ],
  ]);

  // Helper function to highlight text in a node
  const highlightTextInNode = React.useCallback(
    (node: Node, searchText: string): Element[] => {
      const highlights: Element[] = [];

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerSearch = searchText.toLowerCase();

        if (lowerText.includes(lowerSearch)) {
          const parent = node.parentElement;
          if (!parent) return highlights;

          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let index = lowerText.indexOf(lowerSearch);

          while (index !== -1) {
            // Add text before match
            if (index > lastIndex) {
              fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, index)),
              );
            }

            // Add highlighted match
            const mark = document.createElement("mark");
            mark.className = "tree-search-highlight";
            mark.textContent = text.substring(index, index + searchText.length);
            fragment.appendChild(mark);
            highlights.push(mark);

            lastIndex = index + searchText.length;
            index = lowerText.indexOf(lowerSearch, lastIndex);
          }

          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex)),
            );
          }

          parent.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        // Don't search inside input elements or other interactive elements
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          return highlights;
        }

        const childNodes = Array.from(node.childNodes);
        for (const child of childNodes) {
          highlights.push(...highlightTextInNode(child, searchText));
        }
      }

      return highlights;
    },
    [],
  );

  // Helper function to remove all highlights
  const removeHighlights = React.useCallback((container: HTMLElement) => {
    const marks = container.querySelectorAll("mark.tree-search-highlight");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        const textNode = document.createTextNode(mark.textContent || "");
        parent.replaceChild(textNode, mark);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  }, []);

  // Search functionality - first search in JSON and expand paths
  React.useEffect(() => {
    if (!searchValue.trim()) {
      if (treeContainerRef.current) {
        removeHighlights(treeContainerRef.current);
      }
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      setSearchMatchPaths([]);
      // Don't reset expandedPaths - keep nodes expanded after search closes
      return;
    }

    const searchText = searchValue.trim();

    // Search through JSON data to find matching paths
    const matchPaths = searchInJSON(treeData, searchText);
    setSearchMatchPaths(matchPaths);

    // Expand all paths that contain matches
    if (matchPaths.length > 0) {
      expandPathsForMatches(matchPaths);
    }
  }, [
    searchValue,
    treeData,
    searchInJSON,
    expandPathsForMatches,
    removeHighlights,
  ]);

  // After tree is expanded, highlight the matches in DOM
  React.useEffect(() => {
    if (
      !searchValue.trim() ||
      !treeContainerRef.current ||
      searchMatchPaths.length === 0
    ) {
      return;
    }

    // Wait for tree to render with expanded nodes
    const timer = setTimeout(() => {
      const container = treeContainerRef.current;
      if (!container) return;

      const searchText = searchValue.trim();

      // Remove previous highlights
      removeHighlights(container);

      // Find and highlight all matches in the now-expanded tree
      const highlights = highlightTextInNode(container, searchText);

      setSearchMatches(highlights);
      if (highlights.length > 0) {
        setCurrentMatchIndex(0);
      }
    }, 200); // Give tree time to expand

    return () => clearTimeout(timer);
  }, [searchMatchPaths, searchValue, highlightTextInNode, removeHighlights]);

  // Scroll to current match
  React.useEffect(() => {
    if (searchMatches.length === 0) return;

    // Remove current highlight from all matches
    searchMatches.forEach((el) => {
      el.classList.remove("tree-search-current");
    });

    // Highlight current match
    const currentMatch = searchMatches[currentMatchIndex];
    if (currentMatch) {
      currentMatch.classList.add("tree-search-current");

      // Use setTimeout to ensure DOM has updated before scrolling
      setTimeout(() => {
        // Use scrollIntoView with block: 'nearest' for better scroll behavior
        currentMatch.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);
    }
  }, [currentMatchIndex, searchMatches]);

  const handleNextMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % searchMatches.length);
    }
  };

  const handlePreviousMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(
        (prev) => (prev - 1 + searchMatches.length) % searchMatches.length,
      );
    }
  };

  const handleCloseSearch = () => {
    setSearchVisible(false);
    setSearchValue("");
    if (treeContainerRef.current) {
      removeHighlights(treeContainerRef.current);
    }
    setSearchMatches([]);
    setCurrentMatchIndex(0);
  };

  // Expand all nodes
  const handleExpandAll = React.useCallback(() => {
    const allPaths = new Set<string>();

    const collectPaths = (obj: any, path: string = "") => {
      if (obj === null || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          const newPath = path ? `${path}.${idx}` : `${idx}`;
          allPaths.add(newPath);
          collectPaths(item, newPath);
        });
      } else {
        Object.keys(obj).forEach((key) => {
          const newPath = path ? `${path}.${key}` : key;
          allPaths.add(newPath);
          collectPaths(obj[key], newPath);
        });
      }
    };

    collectPaths(treeData);
    setExpandedPaths(allPaths);
    setCurrentExpandLevel(undefined);
    toast.success("Expanded all nodes");
  }, [treeData]);

  // Collapse all nodes
  const handleCollapseAll = React.useCallback(() => {
    setExpandedPaths(new Set());
    setCurrentExpandLevel(undefined);
    toast.success("Collapsed all nodes");
  }, []);

  // Expand to specific level
  const handleExpandToLevel = React.useCallback(
    (level: number) => {
      const pathsToExpand = new Set<string>();

      const collectPathsToLevel = (
        obj: any,
        path: string = "",
        currentDepth: number = 0,
      ) => {
        if (obj === null || typeof obj !== "object") return;
        if (currentDepth >= level) return;

        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            const newPath = path ? `${path}.${idx}` : `${idx}`;
            pathsToExpand.add(newPath);
            collectPathsToLevel(item, newPath, currentDepth + 1);
          });
        } else {
          Object.keys(obj).forEach((key) => {
            const newPath = path ? `${path}.${key}` : key;
            pathsToExpand.add(newPath);
            collectPathsToLevel(obj[key], newPath, currentDepth + 1);
          });
        }
      };

      collectPathsToLevel(treeData);
      setExpandedPaths(pathsToExpand);
      setCurrentExpandLevel(level);
      toast.success(`Expanded to level ${level}`);
    },
    [treeData],
  );

  // Get value at path for context menu
  const getValueAtPath = React.useCallback(
    (keyPath: (string | number)[]): any => {
      try {
        // Use cached parsed JSON (instant - no parsing!)
        const data = getParsedJson();
        if (!data) return null;

        let current = data;
        const reversedPath = [...keyPath].reverse();

        for (const key of reversedPath) {
          if (current === null || current === undefined) return null;
          current = current[key];
        }

        return current;
      } catch {
        return null;
      }
    },
    [getParsedJson],
  );

  // Context menu handlers
  const handleCopyValue = React.useCallback(() => {
    const value = menuState.value;
    const text =
      typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
    clipboard.copy(text);
  }, [menuState.value, clipboard]);

  const handleCopyPath = React.useCallback(() => {
    clipboard.copy(menuState.path || "$");
  }, [menuState.path, clipboard]);

  const handleCopyAsJson = React.useCallback(() => {
    const value = menuState.value;
    clipboard.copy(JSON.stringify(value, null, 2));
  }, [menuState.value, clipboard]);

  const handleDeleteNode = React.useCallback(() => {
    try {
      // Use cached parsed JSON (instant - no parsing!)
      const currentData = getParsedJson();
      if (!currentData) return;
      const path = [...menuState.keyPath].reverse();

      if (path.length === 0) return;

      // Navigate to parent
      let parent: any = currentData;
      for (let i = 0; i < path.length - 1; i++) {
        parent = parent[path[i]];
      }

      const lastKey = path[path.length - 1];

      if (Array.isArray(parent)) {
        parent.splice(Number(lastKey), 1);
      } else {
        delete parent[lastKey];
      }

      const updatedJson = JSON.stringify(currentData, null, 2);
      setJson(updatedJson);
      setContents({ contents: updatedJson, hasChanges: true });
    } catch (error) {
      console.error("Failed to delete node:", error);
      toast.error("Failed to delete node");
    }
  }, [json, menuState.keyPath, setJson, setContents]);

  // Handle context menu for a node
  const handleNodeContextMenu = React.useCallback(
    (e: React.MouseEvent, keyPath: KeyPath, value: any) => {
      const path = [...keyPath].reverse().join(".");
      const isExpandable = typeof value === "object" && value !== null;
      showContextMenu(
        e,
        path,
        value,
        keyPath as (string | number)[],
        isExpandable,
      );
    },
    [showContextMenu],
  );

  const handlePathSelect = (keyPath: KeyPath) => {
    if (!keyPath || keyPath.length === 0) return;

    // Convert keyPath array to JSON path string
    // keyPath is already in reverse order (root to leaf)
    const pathParts: string[] = [];

    for (let i = keyPath.length - 1; i >= 0; i--) {
      const key = keyPath[i];
      if (typeof key === "number") {
        pathParts.push(`[${key}]`);
      } else {
        const keyStr = String(key);
        // Check if key needs quotes (contains special chars or starts with number)
        if (/^[0-9]/.test(keyStr) || /[^a-zA-Z0-9_]/.test(keyStr)) {
          pathParts.push(`["${keyStr}"]`);
        } else {
          pathParts.push(pathParts.length === 0 ? keyStr : `.${keyStr}`);
        }
      }
    }

    setSelectedPath(pathParts.join(""));
  };

  const handleValueChange = (keyPath: KeyPath, newValue: unknown) => {
    try {
      // Use cached parsed JSON (instant - no parsing!)
      const currentData = getParsedJson();
      if (!currentData) return;

      // Navigate to the path and update the value
      // keyPath is in reverse order (leaf to root), so we need to reverse it
      const path = [...keyPath].reverse();

      if (path.length === 0) return;

      // Navigate to parent of the target
      let target: any = currentData;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (target === null || target === undefined) {
          console.error(
            "Path navigation failed: target is null/undefined at",
            key,
          );
          return;
        }
        target = target[key];
      }

      // Update the value
      const lastKey = path[path.length - 1];
      if (target !== null && target !== undefined) {
        target[lastKey] = newValue;

        // Update JSON
        const updatedJson = JSON.stringify(currentData, null, 2);
        setJson(updatedJson);
        setContents({ contents: updatedJson, hasChanges: true });
      } else {
        console.error("Failed to update value: target is null/undefined");
      }
    } catch (error) {
      console.error("Failed to update value:", error);
    }
  };

  const handleKeyChange = (keyPath: KeyPath, newKey: string) => {
    try {
      // Use cached parsed JSON (instant - no parsing!)
      const currentData = getParsedJson();
      if (!currentData) return;

      // Navigate to the parent of the key we want to rename
      const path = [...keyPath].reverse();

      if (path.length === 0) return;

      // Navigate to parent
      let parent: any = currentData;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (parent === null || parent === undefined) {
          console.error(
            "Path navigation failed: parent is null/undefined at",
            key,
          );
          return;
        }
        parent = parent[key];
      }

      // Get the old key and value
      const oldKey = path[path.length - 1];
      if (typeof oldKey === "number") {
        // Can't rename array indices
        console.error("Cannot rename array indices");
        return;
      }

      if (parent !== null && parent !== undefined && oldKey in parent) {
        const value = parent[oldKey];

        // Delete old key and add new key
        delete parent[oldKey];
        parent[newKey] = value;

        // Update JSON
        const updatedJson = JSON.stringify(currentData, null, 2);
        setJson(updatedJson);
        setContents({ contents: updatedJson, hasChanges: true });
      } else {
        console.error(
          "Failed to rename key: parent is null/undefined or key doesn't exist",
        );
      }
    } catch (error) {
      console.error("Failed to rename key:", error);
    }
  };

  // Show disabled message for very large JSON
  if (isDisabled) {
    return (
      <StyledTreeWrapper>
        <DisabledTreeMessage>
          <Text size="lg" fw={500}>
            Tree View Disabled
          </Text>
          <Text size="sm" c="dimmed">
            JSON is too large ({(json.length / 1_000_000).toFixed(1)}MB) to
            render in Tree View.
          </Text>
          <Text size="sm" c="dimmed">
            Use the Editor view for better performance with large files.
          </Text>
        </DisabledTreeMessage>
      </StyledTreeWrapper>
    );
  }

  return (
    <StyledTreeWrapper>
      {/* Tree Toolbar with expand/collapse controls */}
      <TreeToolbar
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onExpandToLevel={handleExpandToLevel}
        currentLevel={currentExpandLevel}
        nodeCount={nodeCount}
      />

      {/* Show mode toggle and warnings */}
      {(isLargeData || shouldUseVirtualized) && (
        <TreeModeHeader>
          <Group justify="space-between" w="100%" px="sm">
            <Group gap="xs">
              {isLargeData && treeMode === "classic" && !showFullTree && (
                <Text size="xs" c="orange">
                  Large JSON ({nodeCount > 1000 ? "1000+" : nodeCount} nodes)
                </Text>
              )}
              {treeMode === "virtualized" && (
                <Text size="xs" c="teal">
                  Virtualized Mode - Smooth scrolling for large data
                </Text>
              )}
            </Group>
            <Group gap="xs">
              <SegmentedControl
                size="xs"
                value={treeMode}
                onChange={(value) => setTreeMode(value as TreeMode)}
                data={[
                  { label: "Classic", value: "classic" },
                  { label: "Virtualized", value: "virtualized" },
                ]}
              />
              {treeMode === "classic" && isLargeData && !showFullTree && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="orange"
                  onClick={() => setShowFullTree(true)}
                >
                  Show All
                </Button>
              )}
            </Group>
          </Group>
        </TreeModeHeader>
      )}
      <PathBar path={selectedPath} onPathChange={setSelectedPath} />

      {/* Context Menu */}
      <TreeContextMenu
        state={menuState}
        onClose={hideContextMenu}
        onCopyValue={handleCopyValue}
        onCopyPath={handleCopyPath}
        onCopyAsJson={handleCopyAsJson}
        onDelete={handleDeleteNode}
      />
      <StyledTreeContainer tabIndex={0} style={{ outline: "none" }}>
        {searchVisible && (
          <TreeSearchWidget
            value={searchValue}
            onChange={setSearchValue}
            onClose={handleCloseSearch}
            matchCount={searchMatches.length}
            currentMatch={currentMatchIndex}
            onNext={handleNextMatch}
            onPrevious={handlePreviousMatch}
          />
        )}
        <StyledTreeContent ref={treeContainerRef}>
          {treeMode === "virtualized" ? (
            <VirtualizedTree
              data={treeData}
              height={containerDimensions.height}
              width={containerDimensions.width}
              searchText={searchValue}
              onPathSelect={setSelectedPath}
              isLargeFile={isVeryLarge}
            />
          ) : (
            <JSONTree
              key={`tree-${expandedPaths.size}-${searchValue}-${showFullTree}`}
              hideRoot
              data={treeData}
              shouldExpandNodeInitially={(keyPath) => {
                // keyPath is in reverse order (leaf to root)
                if (expandedPaths.size === 0) return false;

                // Convert keyPath to string path
                const path = [...keyPath].reverse().join(".");

                // Check if this path should be expanded
                return expandedPaths.has(path);
              }}
              valueRenderer={(valueAsString, value, ...rest) => {
                // react-json-tree passes: valueAsString, value, ...keyPath, parent
                // keyPath is all args except the last one (parent)
                const keyPath = (
                  rest.length > 0 ? rest.slice(0, -1) : []
                ) as KeyPath;
                return (
                  <Value
                    {...{ valueAsString, value }}
                    keyPath={keyPath}
                    onPathSelect={handlePathSelect}
                    onValueChange={handleValueChange}
                  />
                );
              }}
              labelRenderer={(keyPath, nodeType, expanded, expandable) => {
                // Get the value at this path for preview
                const value = getValueAtPath(keyPath as (string | number)[]);
                return (
                  <Label
                    keyPath={keyPath}
                    nodeType={nodeType}
                    data={value}
                    onPathSelect={handlePathSelect}
                    onKeyChange={handleKeyChange}
                    onContextMenu={(e) =>
                      handleNodeContextMenu(e, keyPath, value)
                    }
                  />
                );
              }}
              theme={{
                extend: {
                  overflow: "scroll",
                  height: "100%",
                  scheme: "monokai",
                  author: "wimer hazenberg (http://www.monokai.nl)",
                  base00: theme.GRID_BG_COLOR,
                },
              }}
            />
          )}
        </StyledTreeContent>
      </StyledTreeContainer>
    </StyledTreeWrapper>
  );
};

const TreeModeHeader = styled.div`
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  background: ${({ theme }) => theme.GRID_BG_COLOR};
`;
