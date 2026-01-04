import React from "react";
import type { DefaultTheme } from "styled-components";
import { useTheme } from "styled-components";
import type { KeyPath } from "react-json-tree";
import { TextRenderer } from "../GraphView/CustomNode/TextRenderer";
import styled from "styled-components";
import { TextInput } from "@mantine/core";

type TextColorFn = {
  theme: DefaultTheme;
  $value?: string | unknown;
};

function getValueColor({ $value, theme }: TextColorFn) {
  if ($value && !Number.isNaN(+$value)) return theme.NODE_COLORS.INTEGER;
  if ($value === "true") return theme.NODE_COLORS.BOOL.TRUE;
  if ($value === "false") return theme.NODE_COLORS.BOOL.FALSE;
  if ($value === "null") return theme.NODE_COLORS.NULL;

  // default
  return theme.NODE_COLORS.NODE_VALUE;
}

const StyledValue = styled.span`
  cursor: pointer;
  user-select: none;
  display: inline;
  min-width: 20px;
  word-break: break-word;
  overflow-wrap: anywhere;

  &:hover {
    filter: brightness(1.2);
    transition: filter 0.2s ease-in-out;
    text-decoration: underline;
  }
`;

const StyledInput = styled(TextInput)`
  display: inline-block;
  min-width: 100px;

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

interface ValueProps {
  valueAsString: unknown;
  value: unknown;
  keyPath?: KeyPath;
  onPathSelect?: (keyPath: KeyPath) => void;
  onValueChange?: (keyPath: KeyPath, newValue: unknown) => void;
}

export const Value = (props: ValueProps) => {
  const theme = useTheme();
  const { valueAsString, value, keyPath, onPathSelect, onValueChange } = props;
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
    if (keyPath && onPathSelect) {
      onPathSelect(keyPath);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (keyPath && onValueChange) {
      setEditValue(JSON.stringify(value));
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (keyPath && onValueChange) {
      try {
        // Try to parse the edited value
        let parsedValue: unknown;
        const trimmed = editValue.trim();

        // Handle different value types
        if (trimmed === "true") parsedValue = true;
        else if (trimmed === "false") parsedValue = false;
        else if (trimmed === "null") parsedValue = null;
        else if (trimmed === "") parsedValue = "";
        else if (!isNaN(Number(trimmed)) && trimmed !== "") {
          // Number
          parsedValue = Number(trimmed);
        } else {
          // Try JSON parse, if fails treat as string
          try {
            parsedValue = JSON.parse(trimmed);
          } catch {
            // Remove quotes if user added them, otherwise keep as string
            parsedValue = trimmed.replace(/^["']|["']$/g, "");
          }
        }

        onValueChange(keyPath, parsedValue);
      } catch (error) {
        // If parsing fails, revert
        console.error("Failed to parse value:", error);
      }
    }
    setIsEditing(false);
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

  if (isEditing && keyPath && onValueChange) {
    return (
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
          minWidth: "100px",
        }}
        styles={{
          input: {
            color: getValueColor({ theme, $value: valueAsString }),
            fontSize: "inherit",
            fontFamily: "monospace",
          },
        }}
      />
    );
  }

  return (
    <StyledValue
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        color: getValueColor({
          theme,
          $value: valueAsString,
        }),
      }}
    >
      <TextRenderer>{JSON.stringify(value)}</TextRenderer>
    </StyledValue>
  );
};
