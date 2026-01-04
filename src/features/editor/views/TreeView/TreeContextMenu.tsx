import React from "react";
import { Menu } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import toast from "react-hot-toast";
import {
  VscCopy,
  VscSymbolKey,
  VscTrash,
  VscAdd,
  VscExpandAll,
  VscCollapseAll,
  VscJson,
} from "react-icons/vsc";
import styled from "styled-components";

const ContextMenuContainer = styled.div<{
  $x: number;
  $y: number;
  $visible: boolean;
}>`
  position: fixed;
  top: ${({ $y }) => $y}px;
  left: ${({ $x }) => $x}px;
  z-index: 1000;
  display: ${({ $visible }) => ($visible ? "block" : "none")};
`;

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  path: string;
  value: any;
  keyPath: (string | number)[];
  isExpandable: boolean;
}

interface TreeContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onCopyValue: () => void;
  onCopyPath: () => void;
  onCopyAsJson: () => void;
  onDelete?: () => void;
  onAddChild?: (
    type: "object" | "array" | "string" | "number" | "boolean" | "null",
  ) => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export const TreeContextMenu = ({
  state,
  onClose,
  onCopyValue,
  onCopyPath,
  onCopyAsJson,
  onDelete,
  onAddChild,
  onExpand,
  onCollapse,
}: TreeContextMenuProps) => {
  const clipboard = useClipboard();

  // Close on click outside
  React.useEffect(() => {
    const handleClick = () => {
      if (state.visible) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (state.visible) {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  return (
    <ContextMenuContainer $x={state.x} $y={state.y} $visible={state.visible}>
      <Menu opened={state.visible} onChange={() => {}} shadow="md" width={200}>
        <Menu.Dropdown>
          <Menu.Label>
            {state.path ? state.path.split(".").pop() || "root" : "root"}
          </Menu.Label>

          <Menu.Item
            leftSection={<VscCopy size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onCopyValue();
              toast.success("Value copied!");
              onClose();
            }}
          >
            Copy Value
          </Menu.Item>

          <Menu.Item
            leftSection={<VscSymbolKey size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onCopyPath();
              toast.success("Path copied!");
              onClose();
            }}
          >
            Copy Path
          </Menu.Item>

          <Menu.Item
            leftSection={<VscJson size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onCopyAsJson();
              toast.success("JSON copied!");
              onClose();
            }}
          >
            Copy as JSON
          </Menu.Item>

          {state.isExpandable && (
            <>
              <Menu.Divider />
              {onExpand && (
                <Menu.Item
                  leftSection={<VscExpandAll size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand();
                    onClose();
                  }}
                >
                  Expand Children
                </Menu.Item>
              )}
              {onCollapse && (
                <Menu.Item
                  leftSection={<VscCollapseAll size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCollapse();
                    onClose();
                  }}
                >
                  Collapse Children
                </Menu.Item>
              )}
            </>
          )}

          {onAddChild && state.isExpandable && (
            <>
              <Menu.Divider />
              <Menu.Label>Add Child</Menu.Label>
              <Menu.Item
                leftSection={<VscAdd size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild("string");
                  onClose();
                }}
              >
                String
              </Menu.Item>
              <Menu.Item
                leftSection={<VscAdd size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild("number");
                  onClose();
                }}
              >
                Number
              </Menu.Item>
              <Menu.Item
                leftSection={<VscAdd size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild("object");
                  onClose();
                }}
              >
                Object
              </Menu.Item>
              <Menu.Item
                leftSection={<VscAdd size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild("array");
                  onClose();
                }}
              >
                Array
              </Menu.Item>
            </>
          )}

          {onDelete && (
            <>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<VscTrash size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  toast.success("Node deleted");
                  onClose();
                }}
              >
                Delete
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </ContextMenuContainer>
  );
};

// Hook to manage context menu state
export const useTreeContextMenu = () => {
  const [menuState, setMenuState] = React.useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    path: "",
    value: null,
    keyPath: [],
    isExpandable: false,
  });

  const showContextMenu = (
    e: React.MouseEvent,
    path: string,
    value: any,
    keyPath: (string | number)[],
    isExpandable: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setMenuState({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      path,
      value,
      keyPath,
      isExpandable,
    });
  };

  const hideContextMenu = () => {
    setMenuState((prev) => ({ ...prev, visible: false }));
  };

  return {
    menuState,
    showContextMenu,
    hideContextMenu,
  };
};
