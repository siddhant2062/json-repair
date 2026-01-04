import styled from "styled-components";

export const StyledToolElement = styled.button<{
  $hide?: boolean;
  $highlight?: boolean;
}>`
  display: ${({ $hide }) => ($hide ? "none" : "flex")};
  align-items: center;
  gap: 6px;
  place-content: center;
  font-size: 13px;
  font-weight: 500;
  background: ${({ $highlight }) =>
    $highlight ? "linear-gradient(rgba(0, 0, 0, 0.1) 0 0)" : "none"};
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  padding: 8px 12px;
  border-radius: 6px;
  white-space: nowrap;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.TOOLBAR_BG === "#ECECEC"
        ? "rgba(0, 0, 0, 0.06)"
        : "rgba(255, 255, 255, 0.08)"};
    color: ${({ theme }) => theme.INTERACTIVE_HOVER};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
