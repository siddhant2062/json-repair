import React from "react";
import type { DefaultTheme } from "styled-components";
import { styled, useTheme } from "styled-components";
import type { KeyPath } from "react-json-tree";
import { TextInput } from "@mantine/core";
import { VscSymbolClass, VscSymbolArray } from "react-icons/vsc";

interface LabelProps {
  keyPath: KeyPath;
  nodeType: string;
  data?: any; // The actual data at this node for preview
  onPathSelect?: (keyPath: KeyPath) => void;
  onKeyChange?: (keyPath: KeyPath, newKey: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function getLabelColor({
  $type,
  theme,
}: {
  $type?: string;
  theme: DefaultTheme;
}) {
  if ($type === "Object") return theme.NODE_COLORS.PARENT_OBJ;
  if ($type === "Array") return theme.NODE_COLORS.PARENT_ARR;
  return theme.NODE_COLORS.PARENT_OBJ;
}

// Generate a preview string for collapsed objects/arrays
function getInlinePreview(data: any, maxLength: number = 60): string {
  if (data === null) return "null";
  if (data === undefined) return "undefined";

  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    const preview = data
      .slice(0, 3)
      .map((item) => {
        if (item === null) return "null";
        if (typeof item === "object")
          return Array.isArray(item) ? "[...]" : "{...}";
        if (typeof item === "string")
          return `"${item.slice(0, 15)}${item.length > 15 ? "..." : ""}"`;
        return String(item);
      })
      .join(", ");
    const more = data.length > 3 ? `, +${data.length - 3} more` : "";
    const result = `[${preview}${more}]`;
    return result.length > maxLength
      ? result.slice(0, maxLength) + "..."
      : result;
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return "{}";
    const preview = keys
      .slice(0, 3)
      .map((key) => {
        const value = data[key];
        let valueStr: string;
        if (value === null) valueStr = "null";
        else if (typeof value === "object")
          valueStr = Array.isArray(value) ? "[...]" : "{...}";
        else if (typeof value === "string")
          valueStr = `"${value.slice(0, 10)}${value.length > 10 ? "..." : ""}"`;
        else valueStr = String(value);
        return `${key}: ${valueStr}`;
      })
      .join(", ");
    const more = keys.length > 3 ? `, +${keys.length - 3} more` : "";
    const result = `{${preview}${more}}`;
    return result.length > maxLength
      ? result.slice(0, maxLength) + "..."
      : result;
  }

  return String(data);
}

const StyledLabel = styled.span<{ $nodeType?: string }>`
  color: ${({ theme, $nodeType }) =>
    getLabelColor({ theme, $type: $nodeType })};
  cursor: pointer;
  user-select: none;
  display: inline-block;
  min-width: 20px;

  &:hover {
    filter: brightness(1.5);
    transition: filter 0.2s ease-in-out;
    text-decoration: underline;
  }
`;

const InlinePreview = styled.span`
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  font-size: 0.9em;
  margin-left: 8px;
  opacity: 0.7;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;

  &:hover {
    opacity: 1;
  }
`;

const ArrayBadge = styled.span`
  background: ${({ theme }) => theme.NODE_COLORS.PARENT_ARR}22;
  color: ${({ theme }) => theme.NODE_COLORS.PARENT_ARR};
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 6px;
`;

const ObjectBadge = styled.span`
  background: ${({ theme }) => theme.NODE_COLORS.PARENT_OBJ}22;
  color: ${({ theme }) => theme.NODE_COLORS.PARENT_OBJ};
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 6px;
`;

const StyledInput = styled(TextInput)`
  display: inline-block;
  min-width: 80px;

  input {
    padding: 2px 4px;
    font-size: inherit;
    font-family: monospace;
    background: ${({ theme }) =>
      theme.BACKGROUND_MODIFIER_ACCENT || "rgba(255, 255, 255, 0.1)"};
    border: 1px solid ${({ theme }) => theme.INTERACTIVE_NORMAL || "#666"};
    border-radius: 3px;
  }
`;

export const Label = ({
  keyPath,
  nodeType,
  data,
  onPathSelect,
  onKeyChange,
  onContextMenu,
}: LabelProps) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPathSelect?.(keyPath);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (keyPath && onKeyChange && typeof keyPath[0] === "string") {
      setEditValue(String(keyPath[0]));
      setIsEditing(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e);
  };

  const handleBlur = () => {
    if (keyPath && onKeyChange && editValue.trim() !== "") {
      onKeyChange(keyPath, editValue.trim());
    }
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      handleBlur();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setIsEditing(false);
      setEditValue("");
    }
  };

  const isExpandable = nodeType === "Object" || nodeType === "Array";
  const itemCount = data
    ? Array.isArray(data)
      ? data.length
      : Object.keys(data).length
    : 0;

  if (isEditing && keyPath && onKeyChange && typeof keyPath[0] === "string") {
    return (
      <>
        <StyledInput
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.currentTarget.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-block",
            width: "auto",
            minWidth: "80px",
          }}
          styles={{
            input: {
              color: getLabelColor({ theme, $type: nodeType }),
              fontSize: "inherit",
              fontFamily: "monospace",
            },
          }}
        />
        <span style={{ color: getLabelColor({ theme, $type: nodeType }) }}>
          :
        </span>
      </>
    );
  }

  // Get icon for node type
  const getNodeIcon = () => {
    if (nodeType === "Array") {
      return (
        <VscSymbolArray
          size={14}
          style={{
            marginRight: 4,
            opacity: 0.7,
            color: theme.NODE_COLORS.PARENT_ARR,
          }}
        />
      );
    }
    if (nodeType === "Object") {
      return (
        <VscSymbolClass
          size={14}
          style={{
            marginRight: 4,
            opacity: 0.7,
            color: theme.NODE_COLORS.PARENT_OBJ,
          }}
        />
      );
    }
    return null;
  };

  return (
    <>
      <StyledLabel
        $nodeType={nodeType}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isExpandable && getNodeIcon()}
        {keyPath[0]}:
      </StyledLabel>
      {isExpandable && itemCount > 0 && (
        <>
          {nodeType === "Array" ? (
            <ArrayBadge>{itemCount} items</ArrayBadge>
          ) : (
            <ObjectBadge>{itemCount} keys</ObjectBadge>
          )}
        </>
      )}
    </>
  );
};

// Export the preview function for use elsewhere
export { getInlinePreview };
