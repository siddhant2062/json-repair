import React from "react";
import { ActionIcon, TextInput, Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { VscCopy, VscEdit, VscHome, VscChevronRight } from "react-icons/vsc";
import styled from "styled-components";

const StyledPathBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  border-bottom: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
`;

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const BreadcrumbItem = styled.span<{ $clickable?: boolean; $isLast?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: nowrap;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  color: ${({ theme, $isLast }) =>
    $isLast ? theme.NODE_COLORS?.NODE_KEY || "#59b8ff" : theme.TEXT_NORMAL};
  background: ${({ $isLast, theme }) =>
    $isLast ? theme.BACKGROUND_MODIFIER_ACCENT : "transparent"};

  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable ? theme.BACKGROUND_MODIFIER_ACCENT : "transparent"};
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  display: flex;
  align-items: center;
`;

const PlaceholderText = styled.span`
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  font-size: 12px;
  font-style: italic;
`;

interface PathBarProps {
  path: string;
  onPathChange: (path: string) => void;
  onNavigateToPath?: (path: string) => void;
}

// Parse a path string into segments
const parsePathToSegments = (path: string): string[] => {
  if (!path) return [];

  const segments: string[] = [];
  let current = "";
  let inBracket = false;
  let inQuote = false;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (char === '"' && !inQuote) {
      inQuote = true;
      current += char;
    } else if (char === '"' && inQuote) {
      inQuote = false;
      current += char;
    } else if (char === "[" && !inQuote) {
      if (current) {
        segments.push(current);
        current = "";
      }
      inBracket = true;
      current += char;
    } else if (char === "]" && !inQuote) {
      current += char;
      segments.push(current);
      current = "";
      inBracket = false;
    } else if (char === "." && !inBracket && !inQuote) {
      if (current) {
        segments.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
};

// Build path from segments up to index
const buildPathFromSegments = (
  segments: string[],
  upToIndex: number,
): string => {
  let path = "";
  for (let i = 0; i <= upToIndex && i < segments.length; i++) {
    const segment = segments[i];
    if (segment.startsWith("[")) {
      path += segment;
    } else if (path) {
      path += "." + segment;
    } else {
      path = segment;
    }
  }
  return path;
};

export const PathBar = ({
  path,
  onPathChange,
  onNavigateToPath,
}: PathBarProps) => {
  const clipboard = useClipboard({ timeout: 2000 });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(path);

  React.useEffect(() => {
    setEditValue(path);
  }, [path]);

  const handleCopy = () => {
    clipboard.copy(path || "$");
  };

  const handleEdit = () => {
    if (isEditing) {
      onPathChange(editValue);
    }
    setIsEditing(!isEditing);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEdit();
    } else if (e.key === "Escape") {
      setEditValue(path);
      setIsEditing(false);
    }
  };

  const handleSegmentClick = (index: number) => {
    const segments = parsePathToSegments(path);
    const newPath = buildPathFromSegments(segments, index);
    onPathChange(newPath);
    onNavigateToPath?.(newPath);
  };

  const handleRootClick = () => {
    onPathChange("");
    onNavigateToPath?.("");
  };

  const segments = parsePathToSegments(path);

  return (
    <StyledPathBar>
      <Tooltip label="Root">
        <ActionIcon size="sm" variant="subtle" onClick={handleRootClick}>
          <VscHome size={14} />
        </ActionIcon>
      </Tooltip>

      {isEditing ? (
        <TextInput
          size="xs"
          value={editValue}
          onChange={(e) => setEditValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleEdit}
          style={{ flex: 1 }}
          placeholder="Enter JSON path (e.g., data.users[0].name)"
          autoFocus
        />
      ) : (
        <BreadcrumbContainer>
          {!path ? (
            <PlaceholderText>Click on a node to see its path</PlaceholderText>
          ) : (
            segments.map((segment, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <Separator>
                    <VscChevronRight size={12} />
                  </Separator>
                )}
                <BreadcrumbItem
                  $clickable={index < segments.length - 1}
                  $isLast={index === segments.length - 1}
                  onClick={() =>
                    index < segments.length - 1 && handleSegmentClick(index)
                  }
                  title={`Navigate to ${buildPathFromSegments(segments, index)}`}
                >
                  {segment}
                </BreadcrumbItem>
              </React.Fragment>
            ))
          )}
        </BreadcrumbContainer>
      )}

      <Tooltip label={clipboard.copied ? "Copied!" : "Copy path"}>
        <ActionIcon size="sm" variant="subtle" onClick={handleCopy}>
          <VscCopy size={14} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={isEditing ? "Save" : "Edit path"}>
        <ActionIcon size="sm" variant="subtle" onClick={handleEdit}>
          <VscEdit size={14} />
        </ActionIcon>
      </Tooltip>
    </StyledPathBar>
  );
};
