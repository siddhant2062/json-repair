import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  CSSProperties,
} from "react";
import { List, useListRef } from "react-window";
import styled from "styled-components";
import { ActionIcon, Text, Tooltip, CopyButton } from "@mantine/core";
import { MdExpandMore, MdChevronRight, MdContentCopy } from "react-icons/md";

// Types for flattened tree structure
interface FlattenedNode {
  id: string;
  key: string | number;
  value: any;
  depth: number;
  path: (string | number)[];
  type: "object" | "array" | "primitive";
  isExpanded: boolean;
  hasChildren: boolean;
  childCount: number;
  isLastChild: boolean;
}

interface VirtualizedTreeProps {
  data: any;
  height: number;
  width: number;
  searchText?: string;
  onPathSelect?: (path: string) => void;
  isLargeFile?: boolean; // Start collapsed for large files (like jsonEditorOnline)
}

// Row height for each tree node
const ROW_HEIGHT = 24;

// Maximum depth for initial auto-expansion
// For large files, start fully collapsed (like jsonEditorOnline's expandMinimal)
const getMaxAutoExpandDepth = (isLargeFile?: boolean): number => {
  return isLargeFile ? 0 : 2; // Start collapsed for large files
};

// Colors for different value types
const VALUE_COLORS = {
  string: "#a5d6ff",
  number: "#79c0ff",
  boolean: "#ff7b72",
  null: "#8b949e",
  key: "#7ee787",
};

/**
 * Flatten JSON tree into array for virtualization
 */
function flattenTree(
  data: any,
  expandedPaths: Set<string>,
  searchText?: string,
  path: (string | number)[] = [],
  depth: number = 0,
  maxAutoExpandDepth: number = 2,
): FlattenedNode[] {
  const nodes: FlattenedNode[] = [];

  if (data === null || data === undefined) {
    return nodes;
  }

  if (typeof data !== "object") {
    // Primitive value at root (unusual but possible)
    const pathStr = path.join(".") || "root";
    nodes.push({
      id: pathStr,
      key: path[path.length - 1] ?? "root",
      value: data,
      depth,
      path,
      type: "primitive",
      isExpanded: false,
      hasChildren: false,
      childCount: 0,
      isLastChild: true,
    });
    return nodes;
  }

  const isArray = Array.isArray(data);
  const keys = Object.keys(data);

  keys.forEach((key, index) => {
    const childPath = [...path, isArray ? parseInt(key, 10) : key];
    const childPathStr = childPath.join(".");
    const childValue = data[key];
    const isChildObject = childValue !== null && typeof childValue === "object";
    const childKeys = isChildObject ? Object.keys(childValue) : [];
    const isChildExpanded =
      expandedPaths.has(childPathStr) || depth + 1 < maxAutoExpandDepth;
    const isLastChild = index === keys.length - 1;

    // Add current node
    nodes.push({
      id: childPathStr,
      key: isArray ? parseInt(key, 10) : key,
      value: childValue,
      depth: depth + 1,
      path: childPath,
      type: isChildObject
        ? Array.isArray(childValue)
          ? "array"
          : "object"
        : "primitive",
      isExpanded: isChildExpanded,
      hasChildren: isChildObject && childKeys.length > 0,
      childCount: childKeys.length,
      isLastChild,
    });

    // Recursively add children if expanded
    if (isChildObject && isChildExpanded) {
      const childNodes = flattenTree(
        childValue,
        expandedPaths,
        searchText,
        childPath,
        depth + 1,
        maxAutoExpandDepth,
      );
      nodes.push(...childNodes);
    }
  });

  return nodes;
}

/**
 * Get display value for a node
 */
function getDisplayValue(value: any): { text: string; color: string } {
  if (value === null) return { text: "null", color: VALUE_COLORS.null };
  if (value === undefined)
    return { text: "undefined", color: VALUE_COLORS.null };

  const type = typeof value;

  switch (type) {
    case "string":
      // Truncate long strings
      const displayStr =
        value.length > 100 ? `"${value.substring(0, 100)}..."` : `"${value}"`;
      return { text: displayStr, color: VALUE_COLORS.string };
    case "number":
      return { text: String(value), color: VALUE_COLORS.number };
    case "boolean":
      return { text: String(value), color: VALUE_COLORS.boolean };
    case "object":
      if (Array.isArray(value)) {
        return { text: `Array(${value.length})`, color: VALUE_COLORS.null };
      }
      const keyCount = Object.keys(value).length;
      return { text: `Object {${keyCount}}`, color: VALUE_COLORS.null };
    default:
      return { text: String(value), color: VALUE_COLORS.null };
  }
}

// Custom row props passed to rowComponent
interface TreeRowCustomProps {
  nodes: FlattenedNode[];
  onToggle: (path: string) => void;
  onPathSelect?: (path: string) => void;
  searchText?: string;
}

// Props that react-window injects into rowComponent
interface TreeRowComponentProps extends TreeRowCustomProps {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
}

/**
 * Single row component for virtualized list
 */
const TreeRowComponent = ({
  index,
  style,
  nodes,
  onToggle,
  onPathSelect,
  searchText,
}: TreeRowComponentProps): React.ReactElement => {
  const node = nodes[index];

  if (!node) {
    return <div style={style} />;
  }

  const { text: displayValue, color: valueColor } = getDisplayValue(node.value);
  const isPrimitive = node.type === "primitive";

  // Convert path to JSON path string
  const pathString = node.path
    .map((p, i) => (typeof p === "number" ? `[${p}]` : i === 0 ? p : `.${p}`))
    .join("");

  // Highlight search matches
  const highlightText = (
    text: string,
    search: string | undefined,
  ): React.ReactNode => {
    if (!search) return text;
    const lowerText = text.toLowerCase();
    const lowerSearch = search.toLowerCase();
    const idx = lowerText.indexOf(lowerSearch);
    if (idx === -1) return text;

    return (
      <>
        {text.substring(0, idx)}
        <HighlightMark>
          {text.substring(idx, idx + search.length)}
        </HighlightMark>
        {text.substring(idx + search.length)}
      </>
    );
  };

  return (
    <StyledRow
      style={style}
      $depth={node.depth}
      onClick={() => onPathSelect?.(pathString)}
    >
      <RowContent>
        {/* Expand/Collapse button */}
        {node.hasChildren ? (
          <ExpandButton
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {node.isExpanded ? (
              <MdExpandMore size={16} />
            ) : (
              <MdChevronRight size={16} />
            )}
          </ExpandButton>
        ) : (
          <ExpandPlaceholder />
        )}

        {/* Key */}
        <KeyText>
          {typeof node.key === "number" ? (
            <IndexKey>{node.key}</IndexKey>
          ) : (
            highlightText(String(node.key), searchText)
          )}
        </KeyText>

        <Colon>:</Colon>

        {/* Value */}
        {isPrimitive ? (
          <ValueText $color={valueColor}>
            {highlightText(displayValue, searchText)}
          </ValueText>
        ) : (
          <CollapsedValue>
            {node.isExpanded
              ? node.type === "array"
                ? "["
                : "{"
              : displayValue}
          </CollapsedValue>
        )}

        {/* Copy button (shown on hover) */}
        <CopyButtonWrapper className="copy-btn">
          <CopyButton value={JSON.stringify(node.value, null, 2)}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied!" : "Copy value"}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    copy();
                  }}
                >
                  <MdContentCopy size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </CopyButtonWrapper>
      </RowContent>
    </StyledRow>
  );
};

/**
 * Main virtualized tree component
 */
export const VirtualizedTree: React.FC<VirtualizedTreeProps> = ({
  data,
  height,
  width,
  searchText,
  onPathSelect,
  isLargeFile = false,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const listRef = useListRef();

  // Get max auto-expand depth (0 for large files = start collapsed, like jsonEditorOnline)
  const maxAutoExpandDepth = getMaxAutoExpandDepth(isLargeFile);

  // Flatten tree data for virtualization
  const flattenedNodes = useMemo(() => {
    if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
      return [];
    }
    return flattenTree(
      data,
      expandedPaths,
      searchText,
      [],
      0,
      maxAutoExpandDepth,
    );
  }, [data, expandedPaths, searchText, maxAutoExpandDepth]);

  // Toggle expand/collapse
  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Expand all nodes up to a certain depth
  const expandAll = useCallback(
    (maxDepth: number = 5) => {
      const pathsToExpand = new Set<string>();

      const collectPaths = (
        obj: any,
        path: string[] = [],
        depth: number = 0,
      ) => {
        if (depth >= maxDepth) return;
        if (obj === null || typeof obj !== "object") return;

        const pathStr = path.join(".");
        if (pathStr) pathsToExpand.add(pathStr);

        Object.keys(obj).forEach((key) => {
          const childPath = [...path, key];
          collectPaths(obj[key], childPath, depth + 1);
        });
      };

      collectPaths(data);
      setExpandedPaths(pathsToExpand);
    },
    [data],
  );

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  // Scroll to search match
  useEffect(() => {
    if (searchText && flattenedNodes.length > 0 && listRef.current) {
      const matchIndex = flattenedNodes.findIndex(
        (node) =>
          String(node.key).toLowerCase().includes(searchText.toLowerCase()) ||
          String(node.value).toLowerCase().includes(searchText.toLowerCase()),
      );
      if (matchIndex !== -1) {
        listRef.current.scrollToRow({ index: matchIndex, align: "center" });
      }
    }
  }, [searchText, flattenedNodes, listRef]);

  // Row props for react-window
  const rowProps: TreeRowCustomProps = useMemo(
    () => ({
      nodes: flattenedNodes,
      onToggle: handleToggle,
      onPathSelect,
      searchText,
    }),
    [flattenedNodes, handleToggle, onPathSelect, searchText],
  );

  if (flattenedNodes.length === 0) {
    return (
      <EmptyState>
        <Text c="dimmed">No data to display</Text>
      </EmptyState>
    );
  }

  return (
    <TreeContainer>
      <TreeControls>
        <ControlButton onClick={() => expandAll(5)}>Expand All</ControlButton>
        <ControlButton onClick={collapseAll}>Collapse All</ControlButton>
        <NodeCount>{flattenedNodes.length.toLocaleString()} nodes</NodeCount>
      </TreeControls>
      <List<TreeRowCustomProps>
        listRef={listRef}
        rowCount={flattenedNodes.length}
        rowHeight={ROW_HEIGHT}
        defaultHeight={height - 36}
        overscanCount={20}
        rowComponent={TreeRowComponent}
        rowProps={rowProps}
        style={{ width: width || "100%" }}
      />
    </TreeContainer>
  );
};

// Styled components
const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Mono", monospace;
  font-size: 13px;
`;

const TreeControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.GRID_BG_COLOR};
  background: ${({ theme }) => theme.BACKGROUND_PRIMARY};
`;

const ControlButton = styled.button`
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid ${({ theme }) => theme.GRID_BG_COLOR};
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) => theme.GRID_BG_COLOR};
  }
`;

const NodeCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: ${({ theme }) => theme.TEXT_POSITIVE};
`;

const StyledRow = styled.div<{ $depth: number }>`
  display: flex;
  flex-direction: column;
  padding-left: ${({ $depth }) => $depth * 16}px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);

    .copy-btn {
      opacity: 1;
    }
  }
`;

const RowContent = styled.div`
  display: flex;
  align-items: center;
  height: ${ROW_HEIGHT}px;
  white-space: nowrap;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.TEXT_NORMAL};
  cursor: pointer;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const ExpandPlaceholder = styled.div`
  width: 16px;
`;

const KeyText = styled.span`
  color: ${VALUE_COLORS.key};
  margin-right: 2px;
`;

const IndexKey = styled.span`
  color: ${VALUE_COLORS.number};
`;

const Colon = styled.span`
  color: ${({ theme }) => theme.TEXT_NORMAL};
  margin-right: 6px;
`;

const ValueText = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
`;

const CollapsedValue = styled.span`
  color: ${VALUE_COLORS.null};
  font-style: italic;
`;

const CopyButtonWrapper = styled.div`
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.15s;
`;

const HighlightMark = styled.mark`
  background: rgba(255, 200, 0, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0 2px;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

export default VirtualizedTree;
