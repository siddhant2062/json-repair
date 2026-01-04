import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useMantineColorScheme } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import "@mantine/dropzone/styles.css";
import styled, { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
// import Cookie from "js-cookie";
import { NextSeo } from "next-seo";
import { SEO } from "../constants/seo";
import { darkTheme, lightTheme } from "../constants/theme";
import { ViewMode } from "../enums/viewMode.enum";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import useConfig from "../store/useConfig";
import useFile from "../store/useFile";

// Lazy load all heavy components for faster initial load
const ModalController = dynamic(
  () => import("../features/modals/ModalController"),
  {
    ssr: false,
  },
);
const ExternalMode = dynamic(() => import("../features/editor/ExternalMode"), {
  ssr: false,
});
const Banner = dynamic(
  () => import("../features/Banner").then((mod) => ({ default: mod.Banner })),
  {
    ssr: false,
  },
);
const Toolbar = dynamic(
  () =>
    import("../features/editor/Toolbar").then((mod) => ({
      default: mod.Toolbar,
    })),
  {
    ssr: false,
  },
);
const BottomBar = dynamic(
  () =>
    import("../features/editor/BottomBar").then((mod) => ({
      default: mod.BottomBar,
    })),
  {
    ssr: false,
  },
);
const FullscreenDropzone = dynamic(
  () =>
    import("../features/editor/FullscreenDropzone").then((mod) => ({
      default: mod.FullscreenDropzone,
    })),
  {
    ssr: false,
  },
);

// Create QueryClient outside component to avoid recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const StyledPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;

  @media only screen and (max-width: 320px) {
    height: 100vh;
  }
`;

export const StyledEditorWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

export const StyledEditor = styled(Allotment)`
  position: relative !important;
  display: flex;
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};

  @media only screen and (max-width: 320px) {
    height: 100vh;
  }
`;

const StyledTextEditor = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

const TextEditor = dynamic(() => import("../features/editor/TextEditor"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", background: "#1e1e1e" }} />,
});

const LiveEditor = dynamic(() => import("../features/editor/LiveEditor"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", background: "#1e1e1e" }} />,
});

const EditorPage = () => {
  const { query, isReady } = useRouter();
  const { setColorScheme } = useMantineColorScheme();
  const checkEditorSession = useFile((state) => state.checkEditorSession);
  const darkmodeEnabled = useConfig((state) => state.darkmodeEnabled);
  const fullscreen = useGraph((state) => state.fullscreen);
  const [viewMode] = useSessionStorage({
    key: "viewMode",
    defaultValue: ViewMode.Editor, // Default to editor-only view
  });

  // For Tree View and Viewer, use equal width (50/50 split)
  const isTreeView = viewMode === ViewMode.Tree;
  const isViewerMode = viewMode === ViewMode.Viewer;
  const useEqualSplit = isTreeView || isViewerMode;
  // Editor-only mode hides the secondary pane
  const isEditorOnly = viewMode === ViewMode.Editor;

  useEffect(() => {
    if (isReady) checkEditorSession(query?.json);
  }, [checkEditorSession, isReady, query]);

  useEffect(() => {
    setColorScheme(darkmodeEnabled ? "dark" : "light");
  }, [darkmodeEnabled, setColorScheme]);

  return (
    <>
      <NextSeo
        {...SEO}
        title="Editor | JSON Repair"
        description="JSON Repair is a tool for visualizing into graphs, analyzing, editing, formatting, querying, transforming and validating JSON, CSV, YAML, XML, and more."
      />
      <ThemeProvider theme={darkmodeEnabled ? darkTheme : lightTheme}>
        <QueryClientProvider client={queryClient}>
          <ExternalMode />
          <ModalController />
          <StyledEditorWrapper>
            <StyledPageWrapper>
              {process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_MODE ===
              "true" ? null : (
                <Banner />
              )}
              <Toolbar />
              <StyledEditorWrapper>
                <StyledEditor
                  key={
                    isEditorOnly
                      ? "editor-only"
                      : useEqualSplit
                        ? "split-layout"
                        : "default-layout"
                  }
                  proportionalLayout={useEqualSplit}
                  defaultSizes={useEqualSplit ? [50, 50] : undefined}
                >
                  <Allotment.Pane
                    preferredSize={
                      isEditorOnly ? undefined : useEqualSplit ? undefined : 450
                    }
                    minSize={fullscreen ? 0 : isEditorOnly ? undefined : 300}
                    maxSize={
                      isEditorOnly ? undefined : useEqualSplit ? undefined : 800
                    }
                    visible={!fullscreen}
                  >
                    <StyledTextEditor>
                      <TextEditor />
                      <BottomBar />
                    </StyledTextEditor>
                  </Allotment.Pane>
                  <Allotment.Pane minSize={0} visible={!isEditorOnly}>
                    <LiveEditor />
                  </Allotment.Pane>
                </StyledEditor>
                <FullscreenDropzone />
              </StyledEditorWrapper>
            </StyledPageWrapper>
          </StyledEditorWrapper>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
};

export default EditorPage;
