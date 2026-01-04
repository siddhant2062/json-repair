import React from "react";
import { Menu, Flex, SegmentedControl } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import { event as gaEvent } from "nextjs-google-analytics";
import { CgChevronDown } from "react-icons/cg";
import { ViewMode } from "../../../enums/viewMode.enum";
import { StyledToolElement } from "./styles";
import useGraph from "../views/GraphView/stores/useGraph";

export const ViewMenu = () => {
  const [viewMode, setViewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor,
  });
  const toggleFullscreen = useGraph((state) => state.toggleFullscreen);

  const handleViewChange = (newView: string) => {
    // If switching to Editor view, exit fullscreen mode
    // This ensures the Monaco editor is visible and interactive
    if (newView === ViewMode.Editor) {
      toggleFullscreen(false);
    }
    setViewMode(newView as ViewMode);
    gaEvent("change_view_mode", { label: newView });
  };

  return (
    <Menu shadow="md" closeOnItemClick={false} withArrow>
      <Menu.Target>
        <StyledToolElement onClick={() => gaEvent("show_view_menu")}>
          <Flex align="center" gap={3}>
            View <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <SegmentedControl
          size="xs"
          miw="120"
          w="100%"
          value={viewMode}
          onChange={handleViewChange}
          data={[
            { value: ViewMode.Editor, label: "Editor" },
            { value: ViewMode.Tree, label: "Tree" },
            { value: ViewMode.Viewer, label: "Viewer" },
            { value: ViewMode.Graph, label: "Graph" },
            { value: ViewMode.Compare, label: "Compare" },
            { value: ViewMode.Table, label: "Table" },
          ]}
          fullWidth
        />
      </Menu.Dropdown>
    </Menu>
  );
};
