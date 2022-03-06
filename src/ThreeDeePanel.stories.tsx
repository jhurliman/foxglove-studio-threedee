import React from "react";

import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ThreeDeePanel } from "./ThreeDeePanel";
import { PanelExtensionContext, RenderState } from "@foxglove/studio";
import { TF } from "./transforms/TransformTree";

export default {
  title: "ThreeDeePanel",
  component: ThreeDeePanel,
} as ComponentMeta<typeof ThreeDeePanel>;

export const BasicRender: ComponentStory<typeof ThreeDeePanel> = () => {
  const context: PanelExtensionContext = {
    panelElement: document.createElement("div"),
    initialState: {},
    layout: {
      addPanel: () => {},
    },
    watch: () => {},
    saveState: () => {},
    setParameter: () => {},
    setPreviewTime: () => {},
    subscribe: () => {},
    unsubscribeAll: () => {},
    subscribeAppSettings: () => {},
  };
  setTimeout(() => {
    const message = {
      transforms: [
        {
          header: {
            stamp: { sec: 0, nsec: 0 },
            frame_id: "base_link",
            seq: 0,
          },
          child_frame_id: "sensor_link",
          transform: {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      ],
    };
    const renderState: RenderState = {
      topics: [{ name: "/tf", datatype: "tf2_msgs/TFMessage" }],
      currentFrame: [
        {
          topic: "/tf",
          receiveTime: { sec: 0, nsec: 0 },
          message,
          sizeInBytes: 0,
        },
      ],
      colorScheme: "light",
    };
    const renderDone = () => {
      console.log(`Render done`);
    };
    context.onRender!(renderState, renderDone);
  }, 100);
  return (
    <div style={{ width: "100%", height: "100%", top: 0, left: 0, position: "absolute" }}>
      <ThreeDeePanel context={context} />
    </div>
  );
};
