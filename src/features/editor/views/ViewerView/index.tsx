import React from "react";
import styled from "styled-components";
import {
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  TextInput,
  Kbd,
  ScrollArea,
  SegmentedControl,
} from "@mantine/core";
import {
  VscChevronRight,
  VscChevronDown,
  VscChevronUp,
  VscCopy,
  VscSearch,
  VscClose,
} from "react-icons/vsc";
import { List, useListRef, useDynamicRowHeight } from "react-window";
import toast from "react-hot-toast";
import useJson from "../../../../store/useJson";

interface JsonNode {
  key: string;
  value: any;
  path: string;
  depth: number;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  childCount?: number;
  isExpanded?: boolean;
  index: number;
}

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  color: ${({ theme }) => theme.TEXT_NORMAL};
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 13px;
`;

const Toolbar = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.GRID_BG_COLOR};
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const Breadcrumb = styled.div`
  padding: 6px 12px;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  border-bottom: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  font-size: 11px;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  white-space: nowrap;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const BreadcrumbItem = styled.span<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  padding: 2px 4px;
  border-radius: 3px;

  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable ? theme.GRID_BG_COLOR : "transparent"};
  }
`;

const NodeList = styled.div`
  flex: 1;
  overflow: auto;
  padding: 4px 0;
`;

const NodeRow = styled.div<{
  $selected: boolean;
  $depth: number;
}>`
  display: flex;
  align-items: flex-start;
  padding: 4px 12px 4px ${({ $depth }) => 12 + $depth * 16}px;
  cursor: pointer;
  background: ${({ $selected }) =>
    $selected ? "rgba(59, 130, 246, 0.2)" : "transparent"};
  border-left: 3px solid
    ${({ $selected }) => ($selected ? "#3b82f6" : "transparent")};
  min-height: 24px;

  &:hover {
    background: ${({ $selected }) =>
      $selected ? "rgba(59, 130, 246, 0.25)" : "rgba(128, 128, 128, 0.1)"};
  }
`;

const ExpandIcon = styled.span<{ $visible: boolean }>`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  color: ${({ theme }) => theme.TEXT_NORMAL};
`;

const KeyName = styled.span`
  color: #9d4edd;
  margin-right: 4px;
`;

const Colon = styled.span`
  color: ${({ theme }) => theme.TEXT_NORMAL};
  opacity: 0.5;
  margin-right: 8px;
`;

const Value = styled.span<{ $type: string }>`
  color: ${({ $type }) => {
    switch ($type) {
      case "string":
        return "#22c55e";
      case "number":
        return "#3b82f6";
      case "boolean":
        return "#f59e0b";
      case "null":
        return "#ef4444";
      default:
        return "#888";
    }
  }};
  word-break: break-all;
`;

const HighlightMatch = styled.mark`
  background-color: rgba(250, 204, 21, 0.5);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
`;

// Helper function to highlight matching text
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query || query.length === 0) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);
  let keyCounter = 0;

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    // Add highlighted match
    parts.push(
      <HighlightMatch key={keyCounter++}>
        {text.slice(index, index + query.length)}
      </HighlightMatch>,
    );
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const TypeBadge = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 8px;
  background: rgba(128, 128, 128, 0.2);
  color: ${({ theme }) => theme.TEXT_NORMAL};
  opacity: 0.7;
`;

const HelpBar = styled.div`
  padding: 4px 8px;
  border-top: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 10px;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  opacity: 0.65;
  flex-wrap: nowrap;
  min-height: 28px;
`;

const HelpItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const SearchOverlay = styled.div`
  position: absolute;
  top: 50px;
  right: 12px;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  border: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
`;

function flattenJson(
  data: any,
  path: string = "$",
  depth: number = 0,
  expandedPaths: Set<string>,
  startIndex: { value: number },
): JsonNode[] {
  const nodes: JsonNode[] = [];

  if (data === null) {
    return nodes;
  }

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      const itemPath = `${path}[${idx}]`;
      const type = getType(item);
      const isExpandable = type === "object" || type === "array";
      const isExpanded = expandedPaths.has(itemPath);

      nodes.push({
        key: `[${idx}]`,
        value: item,
        path: itemPath,
        depth,
        type,
        childCount: isExpandable
          ? Array.isArray(item)
            ? item.length
            : Object.keys(item || {}).length
          : undefined,
        isExpanded,
        index: startIndex.value++,
      });

      if (isExpanded && isExpandable && item !== null) {
        nodes.push(
          ...flattenJson(item, itemPath, depth + 1, expandedPaths, startIndex),
        );
      }
    });
  } else if (typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      const itemPath = `${path}.${key}`;
      const type = getType(value);
      const isExpandable = type === "object" || type === "array";
      const isExpanded = expandedPaths.has(itemPath);

      nodes.push({
        key,
        value,
        path: itemPath,
        depth,
        type,
        childCount: isExpandable
          ? Array.isArray(value)
            ? value.length
            : Object.keys(value || {}).length
          : undefined,
        isExpanded,
        index: startIndex.value++,
      });

      if (isExpanded && isExpandable && value !== null) {
        nodes.push(
          ...flattenJson(value, itemPath, depth + 1, expandedPaths, startIndex),
        );
      }
    });
  }

  return nodes;
}

function getType(value: any): JsonNode["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonNode["type"];
}

function formatValue(value: any, type: string): string {
  if (type === "string") return `"${value}"`;
  if (type === "null") return "null";
  if (type === "object") return `{ }`;
  if (type === "array") return `[ ]`;
  return String(value);
}

// Row component for virtualized list
interface ViewerRowProps {
  nodes: JsonNode[];
  selectedIndex: number;
  searchMatches: number[];
  searchQuery: string;
  onSelect: (index: number) => void;
  onToggle: (path: string) => void;
}

const ViewerRow = ({
  index,
  style,
  nodes,
  selectedIndex,
  searchMatches,
  searchQuery,
  onSelect,
  onToggle,
}: {
  index: number;
  style: React.CSSProperties;
} & ViewerRowProps) => {
  const node = nodes[index];
  const isExpandable = node.type === "object" || node.type === "array";
  const isMatch = searchMatches.includes(index);
  const isSelected = index === selectedIndex;

  // Format value and highlight if needed
  const displayValue = formatValue(node.value, node.type);
  const highlightedKey =
    isMatch && searchQuery ? highlightText(node.key, searchQuery) : node.key;
  const highlightedValue =
    isMatch && searchQuery && !isExpandable
      ? highlightText(displayValue, searchQuery)
      : displayValue;

  return (
    <NodeRow
      style={{
        ...style,
        background: isSelected ? "rgba(59, 130, 246, 0.2)" : "transparent",
      }}
      $selected={isSelected}
      $depth={node.depth}
      onClick={() => onSelect(index)}
      onDoubleClick={() => isExpandable && onToggle(node.path)}
    >
      <ExpandIcon
        $visible={isExpandable}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(node.path);
        }}
      >
        {node.isExpanded ? (
          <VscChevronDown size={12} />
        ) : (
          <VscChevronRight size={12} />
        )}
      </ExpandIcon>

      <KeyName>{highlightedKey}</KeyName>
      <Colon>:</Colon>

      {isExpandable ? (
        <>
          <Value $type={node.type}>{node.type === "array" ? "[" : "{"}</Value>
          <TypeBadge>
            {node.type === "array"
              ? `${node.childCount} items`
              : `${node.childCount} keys`}
          </TypeBadge>
          {!node.isExpanded && (
            <Value $type={node.type} style={{ marginLeft: 4 }}>
              {node.type === "array" ? "]" : "}"}
            </Value>
          )}
        </>
      ) : (
        <Value $type={node.type}>{highlightedValue}</Value>
      )}
    </NodeRow>
  );
};

// Threshold for auto-enabling virtualization (JSON size in bytes)
const VIRTUALIZE_SIZE_THRESHOLD = 100_000; // 100KB - same as TreeView

export const ViewerView = () => {
  const json = useJson((state) => state.json);

  // Calculate if JSON is large enough to warrant virtualization
  const jsonSize = json?.length || 0;
  const shouldUseVirtualized = jsonSize > VIRTUALIZE_SIZE_THRESHOLD;
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(
    new Set(["$"]),
  );
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchMatches, setSearchMatches] = React.useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectedRowRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = useListRef();
  const nodeListContainerRef = React.useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = React.useState(400);
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 28 });

  // Update list height on resize
  React.useEffect(() => {
    const updateHeight = () => {
      if (nodeListContainerRef.current) {
        setListHeight(nodeListContainerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    // Also observe the container
    const resizeObserver = new ResizeObserver(updateHeight);
    if (nodeListContainerRef.current) {
      resizeObserver.observe(nodeListContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Use cached parsed JSON from store (like jsonEditorOnline - instant view switching)
  const getParsedJson = useJson((state) => state.getParsedJson);
  const parsedJson = React.useMemo(() => {
    // Use cached parsed JSON (instant - no parsing!)
    return getParsedJson();
  }, [json, getParsedJson]);

  // Cache flattened nodes to avoid re-computation on view switch
  const nodesCacheRef = React.useRef<{
    jsonHash: string;
    expandedPathsHash: string;
    nodes: any[];
  } | null>(null);

  // Simple hash for expanded paths
  const expandedPathsHash = React.useMemo(
    () => Array.from(expandedPaths).sort().join(","),
    [expandedPaths],
  );

  // Simple hash for JSON string (for cache key)
  const jsonHash = React.useMemo(() => {
    let hash = 0;
    if (json?.length === 0) return hash.toString();
    for (let i = 0; i < Math.min(json?.length || 0, 1000); i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }, [json]);

  // Flatten JSON into navigable nodes (cached for instant view switching)
  const nodes = React.useMemo(() => {
    if (!parsedJson) return [];

    // Check cache first (instant view switching!)
    if (
      nodesCacheRef.current &&
      nodesCacheRef.current.jsonHash === jsonHash &&
      nodesCacheRef.current.expandedPathsHash === expandedPathsHash
    ) {
      return nodesCacheRef.current.nodes;
    }

    // Flatten JSON (expensive operation - but cached)
    const startIndex = { value: 0 };
    const flattened = flattenJson(
      parsedJson,
      "$",
      0,
      expandedPaths,
      startIndex,
    );

    // Cache the result
    nodesCacheRef.current = {
      jsonHash,
      expandedPathsHash,
      nodes: flattened,
    };

    return flattened;
  }, [parsedJson, expandedPaths, jsonHash, expandedPathsHash]);

  // State for virtualized mode - auto-set based on data size
  const [isVirtualized, setIsVirtualized] =
    React.useState(shouldUseVirtualized);

  // Update virtualization mode when data size changes
  React.useEffect(() => {
    setIsVirtualized(shouldUseVirtualized);
  }, [shouldUseVirtualized]);

  // Reset selectedIndex if it goes out of bounds when nodes change
  React.useEffect(() => {
    if (nodes.length > 0 && selectedIndex >= nodes.length) {
      setSelectedIndex(Math.max(0, nodes.length - 1));
    }
  }, [nodes.length, selectedIndex]);

  // Deep search function - searches ALL nodes including collapsed ones
  const deepSearchPaths = React.useCallback(
    (data: any, path: string, query: string): string[] => {
      const matchingPaths: string[] = [];
      const lowerQuery = query.toLowerCase();

      const searchRecursive = (obj: any, currentPath: string) => {
        if (obj === null || obj === undefined) return;

        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            const itemPath = `${currentPath}[${idx}]`;
            // Check array index
            if (String(idx).includes(lowerQuery)) {
              matchingPaths.push(itemPath);
            }
            // Check value for primitives
            if (
              typeof item === "string" &&
              item.toLowerCase().includes(lowerQuery)
            ) {
              matchingPaths.push(itemPath);
            } else if (
              typeof item === "number" &&
              String(item).includes(lowerQuery)
            ) {
              matchingPaths.push(itemPath);
            }
            // Recurse for objects/arrays
            if (typeof item === "object" && item !== null) {
              searchRecursive(item, itemPath);
            }
          });
        } else if (typeof obj === "object") {
          Object.entries(obj).forEach(([key, value]) => {
            const itemPath = `${currentPath}.${key}`;
            // Check key
            if (key.toLowerCase().includes(lowerQuery)) {
              matchingPaths.push(itemPath);
            }
            // Check value for primitives
            if (
              typeof value === "string" &&
              value.toLowerCase().includes(lowerQuery)
            ) {
              if (!matchingPaths.includes(itemPath))
                matchingPaths.push(itemPath);
            } else if (
              typeof value === "number" &&
              String(value).includes(lowerQuery)
            ) {
              if (!matchingPaths.includes(itemPath))
                matchingPaths.push(itemPath);
            }
            // Recurse for objects/arrays
            if (typeof value === "object" && value !== null) {
              searchRecursive(value, itemPath);
            }
          });
        }
      };

      searchRecursive(data, path);
      return matchingPaths;
    },
    [],
  );

  // Get parent paths from a path
  const getParentPaths = React.useCallback((path: string): string[] => {
    const parents: string[] = ["$"];
    const parts = path.match(/\.[^.[]+|\[\d+\]/g) || [];
    let current = "$";
    for (let i = 0; i < parts.length - 1; i++) {
      current += parts[i];
      parents.push(current);
    }
    return parents;
  }, []);

  // Search functionality - searches ALL nodes and expands to show them
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }

    // Find all matching paths in the entire JSON tree
    const matchingPaths = deepSearchPaths(parsedJson, "$", searchQuery);

    if (matchingPaths.length > 0) {
      // Expand all parent paths to reveal matches
      const pathsToExpand = new Set<string>(["$"]);
      matchingPaths.forEach((matchPath) => {
        getParentPaths(matchPath).forEach((p) => pathsToExpand.add(p));
      });

      setExpandedPaths((prev) => {
        const next = new Set(prev);
        pathsToExpand.forEach((p) => next.add(p));
        return next;
      });
    }
  }, [searchQuery, parsedJson, deepSearchPaths, getParentPaths]);

  // Update search matches after nodes are rebuilt with expanded paths
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches = nodes
      .map((node, idx) => {
        const keyMatch = node.key.toLowerCase().includes(query);
        const valueMatch =
          (node.type === "string" &&
            typeof node.value === "string" &&
            node.value.toLowerCase().includes(query)) ||
          (node.type === "number" && String(node.value).includes(query));
        return keyMatch || valueMatch ? idx : -1;
      })
      .filter((idx) => idx !== -1);

    setSearchMatches(matches);
    if (matches.length > 0 && currentMatchIndex === 0) {
      setSelectedIndex(matches[0]);
    }
  }, [searchQuery, nodes, currentMatchIndex]);

  // Scroll selected row into view
  React.useEffect(() => {
    // Bounds check to prevent RangeError
    if (selectedIndex < 0 || selectedIndex >= nodes.length) return;

    if (isVirtualized && listRef.current) {
      listRef.current.scrollToRow({ index: selectedIndex, align: "smart" });
    } else {
      selectedRowRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, isVirtualized, nodes.length, listRef]);

  // Focus search input when opened
  React.useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const selectedNode = nodes[selectedIndex];

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allPaths = new Set<string>(["$"]);
    const addPaths = (data: any, path: string) => {
      if (Array.isArray(data)) {
        data.forEach((item, idx) => {
          const itemPath = `${path}[${idx}]`;
          if (typeof item === "object" && item !== null) {
            allPaths.add(itemPath);
            addPaths(item, itemPath);
          }
        });
      } else if (typeof data === "object" && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          const itemPath = `${path}.${key}`;
          if (typeof value === "object" && value !== null) {
            allPaths.add(itemPath);
            addPaths(value, itemPath);
          }
        });
      }
    };
    addPaths(parsedJson, "$");
    setExpandedPaths(allPaths);
    toast.success("Expanded all", { duration: 1000 });
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(["$"]));
    toast.success("Collapsed all", { duration: 1000 });
  };

  const copyPath = () => {
    if (selectedNode) {
      navigator.clipboard.writeText(selectedNode.path);
      toast.success("Path copied!");
    }
  };

  const copyValue = () => {
    if (selectedNode) {
      const valueToCopy =
        typeof selectedNode.value === "object"
          ? JSON.stringify(selectedNode.value, null, 2)
          : String(selectedNode.value);
      navigator.clipboard.writeText(valueToCopy);
      toast.success("Value copied!");
    }
  };

  const nextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    setSelectedIndex(searchMatches[next]);
  };

  const prevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev =
      (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    setSelectedIndex(searchMatches[prev]);
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchOpen) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        containerRef.current?.focus();
      } else if (e.key === "Enter") {
        if (e.shiftKey) {
          prevMatch();
        } else {
          nextMatch();
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
      case "j":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, nodes.length - 1));
        break;

      case "ArrowUp":
      case "k":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;

      case "ArrowRight":
      case "l":
        e.preventDefault();
        if (
          selectedNode &&
          (selectedNode.type === "object" || selectedNode.type === "array")
        ) {
          if (!expandedPaths.has(selectedNode.path)) {
            toggleExpand(selectedNode.path);
          }
        }
        break;

      case "ArrowLeft":
      case "h":
        e.preventDefault();
        if (selectedNode) {
          if (expandedPaths.has(selectedNode.path)) {
            toggleExpand(selectedNode.path);
          } else {
            // Go to parent
            const parentPath = selectedNode.path.replace(
              /\.[^.]+$|\[\d+\]$/,
              "",
            );
            const parentIndex = nodes.findIndex((n) => n.path === parentPath);
            if (parentIndex >= 0) {
              setSelectedIndex(parentIndex);
            }
          }
        }
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        if (
          selectedNode &&
          (selectedNode.type === "object" || selectedNode.type === "array")
        ) {
          toggleExpand(selectedNode.path);
        }
        break;

      case "c":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          copyValue();
        }
        break;

      case "p":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          copyPath();
        }
        break;

      case "/":
        e.preventDefault();
        setSearchOpen(true);
        break;

      case "f":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setSearchOpen(true);
        }
        break;

      case "e":
        e.preventDefault();
        expandAll();
        break;

      case "E":
        e.preventDefault();
        collapseAll();
        break;

      case "Home":
        e.preventDefault();
        setSelectedIndex(0);
        break;

      case "End":
        e.preventDefault();
        setSelectedIndex(nodes.length - 1);
        break;
    }
  };

  // Get breadcrumb parts
  const breadcrumbParts = selectedNode?.path
    .split(/(?=\.|\[)/)
    .filter(Boolean) || ["$"];

  if (!parsedJson) {
    return (
      <Container>
        <Stack align="center" justify="center" h="100%">
          <Text c="dimmed">No valid JSON to display</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: "none", position: "relative" }}
    >
      {/* Toolbar */}
      <Toolbar>
        <Group gap="xs">
          <Tooltip label="Expand All (e)">
            <ActionIcon variant="subtle" size="sm" onClick={expandAll}>
              <VscChevronDown size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Collapse All (E)">
            <ActionIcon variant="subtle" size="sm" onClick={collapseAll}>
              <VscChevronRight size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap="xs">
          <Tooltip label="Copy Path (Ctrl+P)">
            <ActionIcon variant="subtle" size="sm" onClick={copyPath}>
              <VscCopy size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Search (/)">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setSearchOpen(true)}
            >
              <VscSearch size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Only show toggle for large data sets */}
        {shouldUseVirtualized && (
          <SegmentedControl
            size="xs"
            value={isVirtualized ? "virtualized" : "classic"}
            onChange={(v) => setIsVirtualized(v === "virtualized")}
            data={[
              { label: "Classic", value: "classic" },
              { label: "Virtualized", value: "virtualized" },
            ]}
          />
        )}

        <Text fz="xs" c="dimmed">
          {nodes.length} nodes
        </Text>
      </Toolbar>

      {/* Search Overlay */}
      {searchOpen && (
        <SearchOverlay>
          <VscSearch size={14} />
          <TextInput
            ref={searchInputRef}
            size="xs"
            placeholder="Search keys/values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200 }}
          />
          {searchMatches.length > 0 && (
            <>
              <Text fz="xs" c="dimmed">
                {currentMatchIndex + 1}/{searchMatches.length}
              </Text>
              <Group gap={2}>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  onClick={prevMatch}
                  title="Previous (Shift+Enter)"
                >
                  <VscChevronUp size={12} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  onClick={nextMatch}
                  title="Next (Enter)"
                >
                  <VscChevronDown size={12} />
                </ActionIcon>
              </Group>
            </>
          )}
          {searchQuery && searchMatches.length === 0 && (
            <Text fz="xs" c="red">
              No matches
            </Text>
          )}
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
          >
            <VscClose size={14} />
          </ActionIcon>
        </SearchOverlay>
      )}

      {/* Breadcrumb */}
      <Breadcrumb>
        <Text fz="xs" fw={500} c="dimmed">
          Path:
        </Text>
        {breadcrumbParts.map((part, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span style={{ opacity: 0.5 }}>›</span>}
            <BreadcrumbItem $clickable={idx < breadcrumbParts.length - 1}>
              {part}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
        <ActionIcon variant="subtle" size="xs" ml="auto" onClick={copyPath}>
          <VscCopy size={12} />
        </ActionIcon>
      </Breadcrumb>

      {/* Node List */}
      <div ref={nodeListContainerRef} style={{ flex: 1, overflow: "hidden" }}>
        {isVirtualized ? (
          <List<ViewerRowProps>
            listRef={listRef}
            rowCount={nodes.length}
            rowHeight={dynamicRowHeight}
            defaultHeight={listHeight}
            overscanCount={10}
            rowComponent={ViewerRow}
            rowProps={{
              nodes,
              selectedIndex,
              searchMatches,
              searchQuery,
              onSelect: setSelectedIndex,
              onToggle: toggleExpand,
            }}
            style={{ width: "100%" }}
          />
        ) : (
          <ScrollArea style={{ height: "100%" }}>
            <NodeList>
              {nodes.map((node, idx) => {
                const isExpandable =
                  node.type === "object" || node.type === "array";
                const isMatch = searchMatches.includes(idx);
                const displayValue = formatValue(node.value, node.type);
                const highlightedKey =
                  isMatch && searchQuery
                    ? highlightText(node.key, searchQuery)
                    : node.key;
                const highlightedValue =
                  isMatch && searchQuery && !isExpandable
                    ? highlightText(displayValue, searchQuery)
                    : displayValue;

                return (
                  <NodeRow
                    key={node.path + idx}
                    ref={idx === selectedIndex ? selectedRowRef : null}
                    $selected={idx === selectedIndex}
                    $depth={node.depth}
                    onClick={() => setSelectedIndex(idx)}
                    onDoubleClick={() =>
                      isExpandable && toggleExpand(node.path)
                    }
                  >
                    <ExpandIcon
                      $visible={isExpandable}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.path);
                      }}
                    >
                      {node.isExpanded ? (
                        <VscChevronDown size={12} />
                      ) : (
                        <VscChevronRight size={12} />
                      )}
                    </ExpandIcon>

                    <KeyName>{highlightedKey}</KeyName>
                    <Colon>:</Colon>

                    {isExpandable ? (
                      <>
                        <Value $type={node.type}>
                          {node.type === "array" ? "[" : "{"}
                        </Value>
                        <TypeBadge>
                          {node.type === "array"
                            ? `${node.childCount} items`
                            : `${node.childCount} keys`}
                        </TypeBadge>
                        {!node.isExpanded && (
                          <Value $type={node.type} style={{ marginLeft: 4 }}>
                            {node.type === "array" ? "]" : "}"}
                          </Value>
                        )}
                      </>
                    ) : (
                      <Value $type={node.type}>{highlightedValue}</Value>
                    )}
                  </NodeRow>
                );
              })}
            </NodeList>
          </ScrollArea>
        )}
      </div>

      {/* Help Bar - Compact keyboard shortcuts */}
      <HelpBar>
        <HelpItem>
          <Kbd size="xs">↑↓</Kbd>Nav
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">←→</Kbd>Fold
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">/</Kbd>
          <Kbd size="xs">⌘F</Kbd>Find
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">⌘C</Kbd>Copy
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">⌘P</Kbd>Path
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">e</Kbd>Expand
        </HelpItem>
        <span style={{ opacity: 0.3 }}>•</span>
        <HelpItem>
          <Kbd size="xs">E</Kbd>Collapse
        </HelpItem>
      </HelpBar>
    </Container>
  );
};

export default ViewerView;
