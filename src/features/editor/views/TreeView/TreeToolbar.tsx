import React from "react";
import { ActionIcon, Group, Tooltip, Text, Menu } from "@mantine/core";
import {
  VscExpandAll,
  VscCollapseAll,
  VscListTree,
  VscChevronDown,
} from "react-icons/vsc";
import styled from "styled-components";

const StyledToolbar = styled.div`
  padding: 6px 12px;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  border-bottom: 1px solid ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const LevelButton = styled.button<{ $active?: boolean }>`
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.BLURPLE : theme.BACKGROUND_MODIFIER_ACCENT};
  border-radius: 4px;
  background: ${({ theme, $active }) =>
    $active ? theme.BLURPLE : "transparent"};
  color: ${({ theme, $active }) => ($active ? "#fff" : theme.TEXT_NORMAL)};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.BLURPLE : theme.BACKGROUND_MODIFIER_ACCENT};
  }
`;

const LevelButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

interface TreeToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
  currentLevel?: number;
  maxDepth?: number;
  nodeCount?: number;
}

export const TreeToolbar = ({
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
  currentLevel,
  maxDepth = 5,
  nodeCount,
}: TreeToolbarProps) => {
  const levels = Array.from({ length: Math.min(maxDepth, 5) }, (_, i) => i + 1);

  return (
    <StyledToolbar>
      <Group gap="xs">
        <Tooltip label="Expand All">
          <ActionIcon size="sm" variant="subtle" onClick={onExpandAll}>
            <VscExpandAll size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Collapse All">
          <ActionIcon size="sm" variant="subtle" onClick={onCollapseAll}>
            <VscCollapseAll size={16} />
          </ActionIcon>
        </Tooltip>

        <Text size="xs" c="dimmed" mx="xs">
          |
        </Text>

        <Text size="xs" c="dimmed">
          Level:
        </Text>
        <LevelButtonGroup>
          {levels.map((level) => (
            <Tooltip key={level} label={`Expand to level ${level}`}>
              <LevelButton
                $active={currentLevel === level}
                onClick={() => onExpandToLevel(level)}
              >
                {level}
              </LevelButton>
            </Tooltip>
          ))}
        </LevelButtonGroup>

        <Menu shadow="md" width={150}>
          <Menu.Target>
            <ActionIcon size="sm" variant="subtle">
              <VscChevronDown size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Expand to Level</Menu.Label>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <Menu.Item
                key={level}
                onClick={() => onExpandToLevel(level)}
                leftSection={<VscListTree size={14} />}
              >
                Level {level}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item
              onClick={onExpandAll}
              leftSection={<VscExpandAll size={14} />}
            >
              Expand All
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {nodeCount !== undefined && (
        <Text size="xs" c="dimmed">
          {nodeCount.toLocaleString()} nodes
        </Text>
      )}
    </StyledToolbar>
  );
};
