import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow/dist/layout/elkLayout";
import { create } from "zustand";
import { SUPPORTED_LIMIT } from "../../../../../constants/graph";
import useJson from "../../../../../store/useJson";
import type { EdgeData, NodeData } from "../../../../../types/graph";
import { parser } from "../lib/jsonParser";

export interface Graph {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  fullscreen: boolean;
  nodes: NodeData[];
  edges: EdgeData[];
  selectedNode: NodeData | null;
  path: string;
  aboveSupportedLimit: boolean;
}

const initialStates: Graph = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  fullscreen: false,
  nodes: [],
  edges: [],
  selectedNode: null,
  path: "",
  aboveSupportedLimit: false,
};

interface GraphActions {
  setGraph: (json?: string, options?: Partial<Graph>[]) => void;
  setLoading: (loading: boolean) => void;
  setDirection: (direction: CanvasDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setSelectedNode: (nodeData: NodeData) => void;
  focusFirstNode: () => void;
  toggleFullscreen: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  clearGraph: () => void;
  setZoomFactor: (zoomFactor: number) => void;
}

// Cache graph computation to avoid re-parsing on view switch
let graphCache: {
  jsonHash: string;
  nodes: NodeData[];
  edges: EdgeData[];
} | null = null;

// Simple hash function for JSON string
const hashJson = (json: string): string => {
  let hash = 0;
  if (json.length === 0) return hash.toString();
  for (let i = 0; i < Math.min(json.length, 1000); i++) {
    const char = json.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const useGraph = create<Graph & GraphActions>((set, get) => ({
  ...initialStates,
  clearGraph: () => {
    graphCache = null;
    set({ nodes: [], edges: [], loading: false });
  },
  setSelectedNode: (nodeData) => set({ selectedNode: nodeData }),
  setGraph: (data, options) => {
    const json = data ?? useJson.getState().json;
    const jsonHash = hashJson(json);

    // Check cache first (instant view switching!)
    if (graphCache && graphCache.jsonHash === jsonHash) {
      const { nodes, edges } = graphCache;
      if (nodes.length > SUPPORTED_LIMIT) {
        return set({
          aboveSupportedLimit: true,
          ...options,
          loading: false,
        });
      }
      set({
        nodes,
        edges,
        aboveSupportedLimit: false,
        ...options,
      });
      return;
    }

    // Compute graph (only if not cached)
    const { nodes, edges } = parser(json);

    // Cache the result for instant view switching
    graphCache = { jsonHash, nodes, edges };

    if (nodes.length > SUPPORTED_LIMIT) {
      return set({
        aboveSupportedLimit: true,
        ...options,
        loading: false,
      });
    }

    set({
      nodes,
      edges,
      aboveSupportedLimit: false,
      ...options,
    });
  },
  setDirection: (direction = "RIGHT") => {
    set({ direction });
    setTimeout(() => get().centerView(), 200);
  },
  setLoading: (loading) => set({ loading }),
  focusFirstNode: () => {
    const rootNode = document.querySelector("g[id$='node-1']");
    get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },
  setZoomFactor: (zoomFactor) => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },
  zoomIn: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(
      viewPort.centerX,
      viewPort.centerY,
      viewPort.zoomFactor + 0.1,
    );
  },
  zoomOut: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(
      viewPort.centerX,
      viewPort.centerY,
      viewPort.zoomFactor - 0.1,
    );
  },
  centerView: () => {
    const viewPort = get().viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(
      ".editor-canvas",
    ) as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },
  toggleFullscreen: (fullscreen) => set({ fullscreen }),
  setViewPort: (viewPort) => set({ viewPort }),
}));

export default useGraph;
