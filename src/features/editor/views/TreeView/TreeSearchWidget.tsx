import React from "react";
import { TextInput, Flex, Text, ActionIcon } from "@mantine/core";
import styled from "styled-components";
import { AiOutlineClose } from "react-icons/ai";
import { BiChevronUp, BiChevronDown } from "react-icons/bi";
import { VscCaseSensitive, VscWholeWord, VscRegex } from "react-icons/vsc";

const StyledSearchWidget = styled.div`
  position: sticky;
  top: 0;
  right: 12px;
  margin-left: auto;
  z-index: 100;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  border: 1px solid
    ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT || "#3c3c3c"};
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 400px;
  max-width: 400px;
`;

const StyledSearchInput = styled(TextInput)`
  flex: 1;

  input {
    background: ${({ theme }) =>
      theme.BACKGROUND_MODIFIER_ACCENT || "rgba(255, 255, 255, 0.05)"};
    border: 1px solid ${({ theme }) => theme.SILVER_DARK || "#3c3c3c"};
    color: ${({ theme }) => theme.INTERACTIVE_NORMAL || "#fff"};
    font-size: 13px;
    padding: 4px 8px;
    height: 26px;

    &:focus {
      border-color: ${({ theme }) => theme.INTERACTIVE_HOVER || "#0066ff"};
    }
  }
`;

const StyledOptionButton = styled(ActionIcon as any)<{ $active?: boolean }>`
  background: ${({ $active, theme }) =>
    $active ? theme.BACKGROUND_MODIFIER_ACCENT : "transparent"};
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL || "#fff"};

  &:hover {
    background: ${({ theme }) =>
      theme.BACKGROUND_MODIFIER_ACCENT || "rgba(255, 255, 255, 0.1)"};
  }
`;

interface TreeSearchWidgetProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  matchCount: number;
  currentMatch: number;
  onNext: () => void;
  onPrevious: () => void;
}

export const TreeSearchWidget = ({
  value,
  onChange,
  onClose,
  matchCount,
  currentMatch,
  onNext,
  onPrevious,
}: TreeSearchWidgetProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(false);
  const [useRegex, setUseRegex] = React.useState(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    }
  };

  return (
    <StyledSearchWidget>
      <StyledSearchInput
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="Find"
        onKeyDown={handleKeyDown}
        styles={{
          input: {
            fontSize: "13px",
          },
        }}
      />

      <Flex align="center" gap={4}>
        <StyledOptionButton
          size="xs"
          variant="subtle"
          $active={caseSensitive}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match Case (⌥⌘C)"
        >
          <VscCaseSensitive size={16} />
        </StyledOptionButton>

        <StyledOptionButton
          size="xs"
          variant="subtle"
          $active={wholeWord}
          onClick={() => setWholeWord(!wholeWord)}
          title="Match Whole Word (⌥⌘W)"
        >
          <VscWholeWord size={16} />
        </StyledOptionButton>

        <StyledOptionButton
          size="xs"
          variant="subtle"
          $active={useRegex}
          onClick={() => setUseRegex(!useRegex)}
          title="Use Regular Expression (⌥⌘R)"
        >
          <VscRegex size={16} />
        </StyledOptionButton>
      </Flex>

      <Text
        size="xs"
        c="dimmed"
        style={{ minWidth: "50px", textAlign: "center" }}
      >
        {value && matchCount > 0
          ? `${currentMatch + 1} of ${matchCount}`
          : value && matchCount === 0
            ? "No results"
            : ""}
      </Text>

      <Flex align="center" gap={2}>
        <ActionIcon
          size="xs"
          variant="subtle"
          onClick={onPrevious}
          disabled={matchCount === 0}
          title="Previous Match (⇧Enter)"
        >
          <BiChevronUp size={16} />
        </ActionIcon>

        <ActionIcon
          size="xs"
          variant="subtle"
          onClick={onNext}
          disabled={matchCount === 0}
          title="Next Match (Enter)"
        >
          <BiChevronDown size={16} />
        </ActionIcon>
      </Flex>

      <ActionIcon
        size="xs"
        variant="subtle"
        onClick={onClose}
        title="Close (Escape)"
      >
        <AiOutlineClose size={14} />
      </ActionIcon>
    </StyledSearchWidget>
  );
};
