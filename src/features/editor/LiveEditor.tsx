import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSessionStorage } from "@mantine/hooks";
import styled from "styled-components";
import { ViewMode } from "../../enums/viewMode.enum";
// TreeView is default and lighter, load it immediately
import { TreeView } from "./views/TreeView";
// Lazy load heavy views for faster initial load
const ViewerView = dynamic(
  () =>
    import("./views/ViewerView").then((mod) => ({ default: mod.ViewerView })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        Loading viewer...
      </div>
    ),
  },
);
const GraphView = dynamic(
  () => import("./views/GraphView").then((mod) => ({ default: mod.GraphView })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        Loading graph...
      </div>
    ),
  },
);
const CompareView = dynamic(
  () =>
    import("./views/CompareView").then((mod) => ({ default: mod.CompareView })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        Loading compare view...
      </div>
    ),
  },
);
const TableView = dynamic(
  () => import("./views/TableView").then((mod) => ({ default: mod.TableView })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        Loading table view...
      </div>
    ),
  },
);

const StyledLiveEditor = styled.div`
  position: relative;
  height: 100%;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  overflow: auto;
  cursor: url("/assets/cursor.svg"), auto;

  & > ul {
    margin-top: 0 !important;
    padding: 12px !important;
    font-family: monospace;
    font-size: 14px;
    font-weight: 500;
  }

  .tab-group {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
  }
`;

const View = () => {
  const [viewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor,
  });

  if (viewMode === ViewMode.Graph) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Loading graph...
          </div>
        }
      >
        <GraphView />
      </Suspense>
    );
  }
  if (viewMode === ViewMode.Tree) return <TreeView />;
  if (viewMode === ViewMode.Compare) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Loading compare view...
          </div>
        }
      >
        <CompareView />
      </Suspense>
    );
  }
  if (viewMode === ViewMode.Viewer) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Loading viewer...
          </div>
        }
      >
        <ViewerView />
      </Suspense>
    );
  }
  if (viewMode === ViewMode.Table) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Loading table view...
          </div>
        }
      >
        <TableView />
      </Suspense>
    );
  }
  return null;
};

const LiveEditor = () => {
  return (
    <StyledLiveEditor onContextMenuCapture={(e) => e.preventDefault()}>
      <View />
    </StyledLiveEditor>
  );
};

export default LiveEditor;
