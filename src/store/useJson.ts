import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import { parseAndRepair } from "../lib/utils/jsonAdapter";

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  getParsedJson: () => any; // Get cached parsed JSON (like jsonEditorOnline)
  clear: () => void;
}

const initialStates = {
  json: "{}",
  parsedJson: null as any, // Cached parsed JSON object (like jsonEditorOnline)
  jsonHash: "", // Hash of JSON string to detect changes
  loading: true,
};

export type JsonStates = typeof initialStates;

// Simple hash function for JSON string
const hashString = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  getJson: () => get().json,
  getParsedJson: () => {
    const state = get();
    const currentHash = hashString(state.json);

    // If JSON hasn't changed, return cached parsed object
    if (state.parsedJson && state.jsonHash === currentHash) {
      return state.parsedJson;
    }

    // Parse and cache (like jsonEditorOnline - instant view switching)
    try {
      const parsed = parseAndRepair(state.json);
      set({
        parsedJson: parsed,
        jsonHash: currentHash,
        loading: false,
      });
      return parsed;
    } catch (error) {
      console.error("[useJson] Parse failed:", error);
      set({ loading: false });
      return null;
    }
  },
  setJson: (json) => {
    const currentHash = hashString(json);
    const state = get();

    // Only re-parse if JSON actually changed (like jsonEditorOnline)
    if (state.jsonHash === currentHash && state.parsedJson) {
      // JSON unchanged, just update string
      set({ json, loading: false });
    } else {
      // JSON changed, parse and cache
      try {
        const parsed = parseAndRepair(json);
        set({
          json,
          parsedJson: parsed,
          jsonHash: currentHash,
          loading: false,
        });
      } catch (error) {
        console.error("[useJson] Parse failed:", error);
        set({ json, parsedJson: null, jsonHash: currentHash, loading: false });
      }
    }

    useGraph.getState().setGraph(json);
  },
  clear: () => {
    set({ json: "", parsedJson: null, jsonHash: "", loading: false });
    useGraph.getState().clearGraph();
  },
}));

export default useJson;
