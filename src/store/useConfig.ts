import { create } from "zustand";
import { persist } from "zustand/middleware";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";

const initialStates = {
  darkmodeEnabled: false, // Default to light mode
  imagePreviewEnabled: true,
  liveTransformEnabled: true,
  gesturesEnabled: false,
  rulersEnabled: true,
  wordWrapEnabled: true,
};

export interface ConfigActions {
  toggleDarkMode: (value: boolean) => void;
  toggleImagePreview: (value: boolean) => void;
  toggleLiveTransform: (value: boolean) => void;
  toggleGestures: (value: boolean) => void;
  toggleRulers: (value: boolean) => void;
  toggleWordWrap: (value: boolean) => void;
}

const useConfig = create(
  persist<typeof initialStates & ConfigActions>(
    (set) => ({
      ...initialStates,
      toggleRulers: (rulersEnabled) => set({ rulersEnabled }),
      toggleGestures: (gesturesEnabled) => set({ gesturesEnabled }),
      toggleLiveTransform: (liveTransformEnabled) =>
        set({ liveTransformEnabled }),
      toggleDarkMode: (darkmodeEnabled) => set({ darkmodeEnabled }),
      toggleImagePreview: (imagePreviewEnabled) => {
        set({ imagePreviewEnabled });
        useGraph.getState().setGraph();
      },
      toggleWordWrap: (wordWrapEnabled) => set({ wordWrapEnabled }),
    }),
    {
      name: "config",
    },
  ),
);

export default useConfig;
