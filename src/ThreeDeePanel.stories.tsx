import React from "react";

import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ThreeDeePanel } from "./ThreeDeePanel";
import { PanelExtensionContext, RenderState } from "@foxglove/studio";
import { Marker, MarkerAction, MarkerType, TF } from "./ros";

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
    const tf: { transforms: TF[] } = {
      transforms: [
        {
          header: {
            stamp: { sec: 0, nsec: 0 },
            frame_id: "base_link",
          },
          child_frame_id: "sensor_link",
          transform: {
            translation: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          },
        },
      ],
    };
    const markers: { markers: Marker[] } = {
      markers: [
        {
          header: {
            stamp: { sec: 0, nsec: 0 },
            frame_id: "base_link",
          },
          ns: "",
          id: 0,
          type: MarkerType.CUBE,
          action: MarkerAction.ADD,
          pose: {
            position: { x: 0, y: 0, z: -0.2 },
            orientation: { x: 0, y: 0, z: 0.383, w: 0.924 },
          },
          scale: { x: 1, y: 1, z: 0.1 },
          color: { r: 111 / 255, g: 59 / 255, b: 232 / 255, a: 1 },
          lifetime: { sec: 0, nsec: 0 },
          frame_locked: false,
          points: [],
          colors: [],
          text: "",
          mesh_resource: "",
          mesh_use_embedded_materials: false,
        },
      ]
    };
    const renderState: RenderState = {
      topics: [
        { name: "/tf", datatype: "tf2_msgs/TFMessage" },
        { name: "/markers", datatype: "visualization_msgs/MarkerArray" },
      ],
      currentFrame: [
        {
          topic: "/tf",
          receiveTime: { sec: 0, nsec: 0 },
          message: tf,
          sizeInBytes: 0,
        },
        {
          topic: "/markers",
          receiveTime: { sec: 0, nsec: 0 },
          message: markers,
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