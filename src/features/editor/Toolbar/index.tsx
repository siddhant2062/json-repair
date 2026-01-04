import React from "react";
import { Group, Loader, Tooltip, SegmentedControl } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import styled, { useTheme } from "styled-components";
import toast from "react-hot-toast";
import { event as gaEvent } from "nextjs-google-analytics";
import { AiOutlineFullscreen } from "react-icons/ai";
import {
  VscTools,
  VscSplitHorizontal,
  VscJson,
  VscCode,
  VscListTree,
  VscSymbolStructure,
  VscGraph,
  VscDiff,
  VscScreenFull,
  VscWordWrap,
  VscTable,
} from "react-icons/vsc";
import { MdLightMode, MdDarkMode, MdFilterListAlt } from "react-icons/md";
import { JSONRepairLogo } from "../../../layout/JSONRepairLogo";
import { FileMenu } from "./FileMenu";
import { ToolsMenu } from "./ToolsMenu";
import useFile from "../../../store/useFile";
import useConfig from "../../../store/useConfig";
import { FileFormat } from "../../../enums/file.enum";
import { ViewMode } from "../../../enums/viewMode.enum";
import { StyledToolElement } from "./styles";
import { isJsonArray } from "../../../lib/utils/filterEngine";
import { useModal } from "../../../store/useModal";
import useGraph from "../views/GraphView/stores/useGraph";

const StyledTools = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
  height: 44px;
  padding: 4px 12px;
  background: ${({ theme }) => theme.TOOLBAR_BG};
  color: ${({ theme }) => theme.SILVER};
  z-index: 36;
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};

  @media only screen and (max-width: 320px) {
    display: none;
  }
`;

const StyledDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${({ theme }) =>
    theme.TOOLBAR_BG === "#1E1E1E"
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(0, 0, 0, 0.12)"};
  margin: 0 4px;
`;

const StyledViewModeControl = styled.div`
  .mantine-SegmentedControl-root {
    background: ${({ theme }) =>
      theme.TOOLBAR_BG === "#1E1E1E"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.04)"};
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .mantine-SegmentedControl-label {
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mantine-SegmentedControl-indicator {
    background: ${({ theme }) =>
      theme.TOOLBAR_BG === "#1E1E1E"
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)"};
    border-radius: 4px;
    box-shadow: none;
  }

  .mantine-SegmentedControl-control[data-active]
    .mantine-SegmentedControl-label {
    color: ${({ theme }) => theme.INTERACTIVE_HOVER};
  }
`;

const StyledIconButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) =>
    $active
      ? theme.TOOLBAR_BG === "#1E1E1E"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.1)"
      : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.INTERACTIVE_HOVER : theme.INTERACTIVE_NORMAL};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.TOOLBAR_BG === "#1E1E1E"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.06)"};
    color: ${({ theme }) => theme.INTERACTIVE_HOVER};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const StyledActionButton = styled.button<{ $variant?: "primary" | "success" }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 5px;
  background: ${({ theme, $variant }) => {
    if ($variant === "success") return "rgba(34, 139, 34, 0.15)";
    return theme.TOOLBAR_BG === "#1E1E1E"
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.05)";
  }};
  color: ${({ theme, $variant }) => {
    if ($variant === "success") return "#228B22";
    return theme.INTERACTIVE_NORMAL;
  }};
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) => {
      if ($variant === "success") return "rgba(34, 139, 34, 0.25)";
      return theme.TOOLBAR_BG === "#1E1E1E"
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.08)";
    }};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

function fullscreenBrowser() {
  try {
    if (!document.fullscreenElement) {
      // Try to enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        // Safari
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        // IE11
        (elem as any).msRequestFullscreen();
      } else {
        toast.error("Fullscreen not supported in this browser");
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  } catch (err) {
    console.error("Fullscreen error:", err);
    toast.error("Unable to toggle fullscreen mode");
  }
}

export const Toolbar = () => {
  const repairJson = useFile((state) => state.repairJson);
  const formatJson = useFile((state) => state.formatJson);
  const getFormat = useFile((state) => state.getFormat);
  const contents = useFile((state) => state.contents);
  const setContents = useFile((state) => state.setContents);
  const darkmodeEnabled = useConfig((state) => state.darkmodeEnabled);
  const toggleDarkMode = useConfig((state) => state.toggleDarkMode);
  const wordWrapEnabled = useConfig((state) => state.wordWrapEnabled);
  const toggleWordWrap = useConfig((state) => state.toggleWordWrap);
  const fullscreen = useGraph((state) => state.fullscreen);
  const toggleFullscreen = useGraph((state) => state.toggleFullscreen);
  const currentFormat = getFormat();
  const theme = useTheme();

  const [viewMode, setViewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor,
  });

  const setVisible = useModal((state) => state.setVisible);
  const isArray = React.useMemo(() => {
    if (currentFormat !== FileFormat.JSON) return false;
    return isJsonArray(contents);
  }, [contents, currentFormat]);

  const handleViewChange = (newView: string) => {
    if (newView === ViewMode.Editor) {
      toggleFullscreen(false);
    }
    setViewMode(newView as ViewMode);
    gaEvent("change_view_mode", { label: newView });
  };

  const handleFormat = async () => {
    if (currentFormat !== FileFormat.JSON) {
      toast.error("Format is only available for JSON format");
      return;
    }
    await formatJson();
    gaEvent("format_json_toolbar");
  };

  const handleRepair = async () => {
    if (currentFormat !== FileFormat.JSON) {
      toast.error("Repair is only available for JSON format");
      return;
    }
    await repairJson();
    gaEvent("repair_json_toolbar");
  };


  const handleToggleDarkMode = () => {
    toggleDarkMode(!darkmodeEnabled);
    gaEvent("toggle_dark_mode", { label: darkmodeEnabled ? "light" : "dark" });
  };

  const handleToggleWordWrap = () => {
    toggleWordWrap(!wordWrapEnabled);
    gaEvent("toggle_word_wrap", { label: wordWrapEnabled ? "off" : "on" });
  };

  // Determine if we're in "Editor only" mode (no split)
  const isEditorOnly = viewMode === ViewMode.Editor;

  // Check if currently showing split view (not fullscreen and not editor-only)
  const isSplitView = !fullscreen && !isEditorOnly;

  const handleToggleSplitView = () => {
    if (isEditorOnly) {
      // If in Editor-only mode, switch to Viewer and show split view
      setViewMode(ViewMode.Viewer);
      toggleFullscreen(false); // Ensure split view
      gaEvent("toggle_split_view", { label: "split_with_viewer" });
    } else if (fullscreen) {
      // If in full view (secondary pane only), switch to split view
      toggleFullscreen(false);
      gaEvent("toggle_split_view", { label: "split" });
    } else {
      // If in split view, switch to full view (secondary pane only)
      toggleFullscreen(true);
      gaEvent("toggle_split_view", { label: "full" });
    }
  };

  const tooltipStyles = {
    tooltip: {
      backgroundColor: theme.BACKGROUND_PRIMARY,
      color: theme.TEXT_NORMAL,
      border: `1px solid ${theme.SILVER_DARK}`,
      fontSize: "11px",
      fontWeight: 500,
      padding: "5px 8px",
      borderRadius: "4px",
      boxShadow:
        theme.TOOLBAR_BG === "#1E1E1E"
          ? "0 2px 8px rgba(0, 0, 0, 0.4)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
    },
  };

  const viewModeData = [
    {
      value: ViewMode.Editor,
      label: (
        <>
          <VscCode size={12} /> Editor
        </>
      ),
    },
    {
      value: ViewMode.Tree,
      label: (
        <>
          <VscListTree size={12} /> Tree
        </>
      ),
    },
    {
      value: ViewMode.Viewer,
      label: (
        <>
          <VscSymbolStructure size={12} /> Viewer
        </>
      ),
    },
    {
      value: ViewMode.Graph,
      label: (
        <>
          <VscGraph size={12} /> Graph
        </>
      ),
    },
    {
      value: ViewMode.Compare,
      label: (
        <>
          <VscDiff size={12} /> Compare
        </>
      ),
    },
    {
      value: ViewMode.Table,
      label: (
        <>
          <VscTable size={12} /> Table
        </>
      ),
    },
  ];

  return (
    <StyledTools>
      {/* Left Section: Logo, File Menu, View Modes */}
      <Group gap={4} style={{ flexWrap: "nowrap" }}>
        <StyledToolElement title="JSON Repair" style={{ padding: "6px 8px" }}>
          <JSONRepairLogo fontSize="0.75rem" hideLogo />
        </StyledToolElement>

        <StyledDivider />

        <FileMenu />

        <StyledDivider />

        {/* View Mode Selector */}
        <StyledViewModeControl>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={handleViewChange}
            data={viewModeData}
          />
        </StyledViewModeControl>

        <StyledDivider />

        {/* Split View / Full View Toggle - Always visible */}
        {/* Icon shows what will happen when clicked */}
        <Tooltip
          label={isSplitView ? "Full View" : "Split View"}
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledIconButton onClick={handleToggleSplitView}>
            {isSplitView ? (
              <VscScreenFull size={16} />
            ) : (
              <VscSplitHorizontal size={16} />
            )}
          </StyledIconButton>
        </Tooltip>

        {/* Word Wrap Toggle */}
        <Tooltip
          label={wordWrapEnabled ? "Word Wrap: On" : "Word Wrap: Off"}
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledIconButton
            onClick={handleToggleWordWrap}
            $active={wordWrapEnabled}
          >
            <VscWordWrap size={16} />
          </StyledIconButton>
        </Tooltip>
      </Group>

      {/* Right Section: Actions */}
      <Group gap={4} style={{ flexWrap: "nowrap" }}>
        {/* Format & Repair */}
        <Tooltip
          label="Format JSON"
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledActionButton
            onClick={handleFormat}
            disabled={currentFormat !== FileFormat.JSON}
          >
            <VscJson size={14} /> Format
          </StyledActionButton>
        </Tooltip>

        <Tooltip
          label="Repair JSON"
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledActionButton
            onClick={handleRepair}
            disabled={currentFormat !== FileFormat.JSON}
          >
            <VscTools size={14} /> Repair
          </StyledActionButton>
        </Tooltip>

        {/* Filter Array Button - Only shows when JSON array is detected */}
        {isArray && (
          <Tooltip
            label="Filter Array"
            {...tooltipStyles}
            position="bottom"
            offset={4}
          >
            <StyledActionButton
              onClick={() => {
                setVisible("FilterModal", true);
                gaEvent("open_filter_modal", { source: "toolbar" });
              }}
            >
              <MdFilterListAlt size={14} /> Filter
            </StyledActionButton>
          </Tooltip>
        )}


        <StyledDivider />

        <ToolsMenu />

        <StyledDivider />

        {/* Theme Toggle */}
        <Tooltip
          label={darkmodeEnabled ? "Light Mode" : "Dark Mode"}
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledIconButton onClick={handleToggleDarkMode}>
            {darkmodeEnabled ? (
              <MdLightMode size={16} />
            ) : (
              <MdDarkMode size={16} />
            )}
          </StyledIconButton>
        </Tooltip>

        {/* Browser Fullscreen */}
        <Tooltip
          label="Fullscreen"
          {...tooltipStyles}
          position="bottom"
          offset={4}
        >
          <StyledIconButton onClick={fullscreenBrowser}>
            <AiOutlineFullscreen size={16} />
          </StyledIconButton>
        </Tooltip>
      </Group>
    </StyledTools>
  );
};
