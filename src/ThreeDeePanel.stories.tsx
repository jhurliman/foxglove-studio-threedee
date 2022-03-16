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
    const marker0 = createMarker();
    marker0.pose.position.z = -0.2;
    marker0.pose.orientation.z = 0.383;
    marker0.pose.orientation.w = 0.924;
    marker0.scale.z = 0.1;
    marker0.color = { r: 111 / 255, g: 59 / 255, b: 232 / 255, a: 1 };

    const marker1 = createMarker();
    marker1.id = 1;
    5;
    marker1.type = MarkerType.CYLINDER;
    marker1.text = "Cylinder";
    marker1.pose.position.z = 0.1;
    marker1.scale = { x: 0.5, y: 0.5, z: 0.5 };
    marker1.color = { r: 1, g: 0, b: 0, a: 0.25 };

    const marker2 = createMarker();
    marker2.id = 2;
    marker2.type = MarkerType.LINE_STRIP;
    marker2.pose.position.z = 0.4;
    marker2.points = [
      { x: 0, y: 0, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0, y: 0, z: 0.5 },
    ];
    marker2.colors = [
      { r: 1, g: 0, b: 0, a: 0.33 },
      { r: 0, g: 1, b: 0, a: 0.5 },
      { r: 0, g: 0, b: 1, a: 1 },
    ];
    marker2.scale.x = 0.1;

    const marker3 = createMarker();
    marker3.id = 3;
    marker3.type = MarkerType.SPHERE_LIST;
    marker3.pose.position.x = -1;
    marker3.points = [
      { x: 0, y: 0, z: -0.5 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0.5 },
    ];
    marker3.colors = [
      { r: 1, g: 0, b: 0, a: 0.33 },
      { r: 0, g: 1, b: 0, a: 0.5 },
      { r: 0, g: 0, b: 1, a: 1 },
    ];
    marker3.scale = { x: 0.1, y: 0.2, z: 0.3 };

    const marker4 = createMarker();
    marker4.id = 4;
    marker4.type = MarkerType.POINTS;
    marker4.pose.position.x = 1;
    marker4.points = [
      { x: 0, y: 0, z: -0.5 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0.5 },
    ];
    marker4.colors = [
      { r: 1, g: 0, b: 0, a: 0.33 },
      { r: 0, g: 1, b: 0, a: 0.5 },
      { r: 0, g: 0, b: 1, a: 1 },
    ];
    marker4.scale = { x: 0.1, y: 0.2, z: 0.3 };

    const marker5 = createMarker();
    marker5.id = 5;
    marker5.type = MarkerType.MESH_RESOURCE;
    marker5.pose.position = { x: 0.2, y: -0.4, z: -0.025 };
    marker5.mesh_resource =
      "data:model/gltf+json;base64,eyJhc3NldCI6eyJ2ZXJzaW9uIjoiMi4wIn0sInNjZW5lIjowLCJzY2VuZXMiOlt7Im5hbWUiOiJTY2VuZSIsIm5vZGVzIjpbMF19XSwibm9kZXMiOlt7Im1lc2giOjAsIm5hbWUiOiJDdWJlIn1dLCJtYXRlcmlhbHMiOlt7ImRvdWJsZVNpZGVkIjp0cnVlLCJuYW1lIjoiTWF0ZXJpYWwiLCJwYnJNZXRhbGxpY1JvdWdobmVzcyI6eyJiYXNlQ29sb3JUZXh0dXJlIjp7ImluZGV4IjowfSwibWV0YWxsaWNGYWN0b3IiOjAsInJvdWdobmVzc0ZhY3RvciI6MC40MDAwMDAwMDU5NjA0NjQ1fX1dLCJtZXNoZXMiOlt7Im5hbWUiOiJDdWJlIiwicHJpbWl0aXZlcyI6W3siYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MCwiTk9STUFMIjoxLCJURVhDT09SRF8wIjoyfSwiaW5kaWNlcyI6MywibWF0ZXJpYWwiOjB9XX1dLCJ0ZXh0dXJlcyI6W3sic2FtcGxlciI6MCwic291cmNlIjowfV0sImltYWdlcyI6W3siYnVmZmVyVmlldyI6NCwibWltZVR5cGUiOiJpbWFnZS9wbmciLCJuYW1lIjoiTWF0ZXJpYWwgQmFzZSBDb2xvciJ9XSwiYWNjZXNzb3JzIjpbeyJidWZmZXJWaWV3IjowLCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MjQsIm1heCI6WzEsMSwxXSwibWluIjpbLTEsLTEsLTFdLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MSwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6MiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJ0eXBlIjoiVkVDMiJ9LHsiYnVmZmVyVmlldyI6MywiY29tcG9uZW50VHlwZSI6NTEyMywiY291bnQiOjM2LCJ0eXBlIjoiU0NBTEFSIn1dLCJidWZmZXJWaWV3cyI6W3siYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyODgsImJ5dGVPZmZzZXQiOjB9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjoyODgsImJ5dGVPZmZzZXQiOjI4OH0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjE5MiwiYnl0ZU9mZnNldCI6NTc2fSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6NzIsImJ5dGVPZmZzZXQiOjc2OH0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjU1NSwiYnl0ZU9mZnNldCI6ODQwfV0sInNhbXBsZXJzIjpbeyJtYWdGaWx0ZXIiOjk3MjksIm1pbkZpbHRlciI6OTk4N31dLCJidWZmZXJzIjpbeyJieXRlTGVuZ3RoIjoxMzk2LCJ1cmkiOiJkYXRhOmFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbTtiYXNlNjQsQUFDQVB3QUFnRDhBQUlDL0FBQ0FQd0FBZ0Q4QUFJQy9BQUNBUHdBQWdEOEFBSUMvQUFDQVB3QUFnTDhBQUlDL0FBQ0FQd0FBZ0w4QUFJQy9BQUNBUHdBQWdMOEFBSUMvQUFDQVB3QUFnRDhBQUlBL0FBQ0FQd0FBZ0Q4QUFJQS9BQUNBUHdBQWdEOEFBSUEvQUFDQVB3QUFnTDhBQUlBL0FBQ0FQd0FBZ0w4QUFJQS9BQUNBUHdBQWdMOEFBSUEvQUFDQXZ3QUFnRDhBQUlDL0FBQ0F2d0FBZ0Q4QUFJQy9BQUNBdndBQWdEOEFBSUMvQUFDQXZ3QUFnTDhBQUlDL0FBQ0F2d0FBZ0w4QUFJQy9BQUNBdndBQWdMOEFBSUMvQUFDQXZ3QUFnRDhBQUlBL0FBQ0F2d0FBZ0Q4QUFJQS9BQUNBdndBQWdEOEFBSUEvQUFDQXZ3QUFnTDhBQUlBL0FBQ0F2d0FBZ0w4QUFJQS9BQUNBdndBQWdMOEFBSUEvQUFBQUFBQUFBQUFBQUlDL0FBQUFBQUFBZ0Q4QUFBQ0FBQUNBUHdBQUFBQUFBQUNBQUFBQUFBQUFnTDhBQUFDQUFBQUFBQUFBQUFBQUFJQy9BQUNBUHdBQUFBQUFBQUNBQUFBQUFBQUFBQUFBQUlBL0FBQUFBQUFBZ0Q4QUFBQ0FBQUNBUHdBQUFBQUFBQUNBQUFBQUFBQUFnTDhBQUFDQUFBQUFBQUFBQUFBQUFJQS9BQUNBUHdBQUFBQUFBQUNBQUFDQXZ3QUFBQUFBQUFDQUFBQUFBQUFBQUFBQUFJQy9BQUFBQUFBQWdEOEFBQUNBQUFDQXZ3QUFBQUFBQUFDQUFBQUFBQUFBZ0w4QUFBQ0FBQUFBQUFBQUFBQUFBSUMvQUFDQXZ3QUFBQUFBQUFDQUFBQUFBQUFBQUFBQUFJQS9BQUFBQUFBQWdEOEFBQUNBQUFDQXZ3QUFBQUFBQUFDQUFBQUFBQUFBZ0w4QUFBQ0FBQUFBQUFBQUFBQUFBSUEvQUFBZ1B3QUFBRDhBQUNBL0FBQUFQd0FBSUQ4QUFBQS9BQURBUGdBQUFEOEFBTUErQUFBQVB3QUF3RDRBQUFBL0FBQWdQd0FBZ0Q0QUFDQS9BQUNBUGdBQUlEOEFBSUErQUFEQVBnQUFnRDRBQU1BK0FBQ0FQZ0FBd0Q0QUFJQStBQUFnUHdBQVFEOEFBQ0EvQUFCQVB3QUFZRDhBQUFBL0FBREFQZ0FBUUQ4QUFBQStBQUFBUHdBQXdENEFBRUEvQUFBZ1B3QUFnRDhBQUNBL0FBQUFBQUFBWUQ4QUFJQStBQURBUGdBQWdEOEFBQUErQUFDQVBnQUF3RDRBQUFBQUFRQU9BQlFBQVFBVUFBY0FDZ0FHQUJNQUNnQVRBQmNBRlFBU0FBd0FGUUFNQUE4QUVBQURBQWtBRUFBSkFCWUFCUUFDQUFnQUJRQUlBQXNBRVFBTkFBQUFFUUFBQUFRQWlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFDQUFBQUFnQ0FZQUFBQnplbnIwQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUIzVWxFUVZSWUNXTThjK2JNZndZaXdPSjhHYmdxUmlZR0JtM256d3o2bnA4WW1KaUowZzdYaTg0QUdrVTYrUCtQZ2VIYVBoNkdPeWU0R0Jnb3M1K0JMQWVBblB6dkx5UEQyWTBDRE05dmNaRHVBeVFkWkRzQVpNYWZuNHdNUjVjS01ueCt3NEprSkdsTWlod0FzdXI3UjJhR0k0dUV3STRoeldxSWFvb2RBRExtelVNMmhqUHJCUmorazVFZXFPSUFrQ051bitCbXVIdVNHOFFrQ1JEdGdOaUpUL0FiRFBUOXFkVUNETSt1azVZb2lYWUF5SFpDanZqN2g1SGgwRUloaG1jM2lIY0VTUTRBT1lLUkVVVGlCcisvTXpFY21pZE10Q05JZG9DNDZrL2N0a05sZmdPejU3NFpJZ3hYOS9JU1RKZ2tPOERBK3lNRE15dmg1QTdLRWVjMjhZTWQ4dk1yYm10d3krRHdwNGpjTHdZRm8yODRaREdGUWVsaFc2OFl3L3VuckppU1FCR1NIUUNxaURUdHYyQldRbmpTeHBlM0xBeDdwb2t5dkxqRmpsRjNrT3dBa0RjRUpIOHpTR21pcGdWbUZ2elI4dU1MTUhFdUVHWjRDc3lteUFVV1dRNEFoWUt1NnllVUhBSEtnanhDZjdBR00wd1FsQmFPcnhCa2VIa2JHQkpRd0Voc2V3Q21nUkM5c2xLSzRkYzMvUDRTa1ByTjRGditFbXdVZnBXRWJNTWlIOTcraklHTC95OFdHWVFRekhLUUNOVkRBR0VOY1N5cWh3QngxaUpValRwZ05BUkdRMkEwQkVaRFlPaUVBSEwzSEZHU1U4NENBTjdWZ2lRODgySkZBQUFBQUVsRlRrU3VRbUNDQUE9PSJ9XX0=";
    marker5.mesh_use_embedded_materials = true;
    marker5.scale = { x: 0.1, y: 0.1, z: 0.1 };
    marker5.color = { r: 243 / 255, g: 175 / 255, b: 86 / 255, a: 0.5 };

    const marker6 = createMarker();
    marker6.id = 6;
    marker6.type = MarkerType.LINE_LIST;
    marker6.pose.position.z = 0.4;
    marker6.points = [
      { x: -1.2, y: -1.2, z: 0 },
      { x: 1.2, y: -1.2, z: 0 },
      { x: 1.2, y: -1.2, z: 0 },
      { x: 1.2, y: 1.2, z: 0 },
    ];
    marker6.colors = [
      { r: 1, g: 0, b: 0, a: 1 },
      { r: 0, g: 1, b: 0, a: 1 },
      { r: 0, g: 1, b: 0, a: 1 },
      { r: 0, g: 0, b: 1, a: 1 },
    ];
    marker6.scale.x = 0.05;

    const markers: { markers: Marker[] } = {
      markers: [marker0, marker1, marker2, marker3, marker4, marker5, marker6],
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
      console.log(`[ThreeDeePanel.stories] Render done`);
    };
    context.onRender!(renderState, renderDone);
  }, 100);
  return (
    <div style={{ width: "100%", height: "100%", top: 0, left: 0, position: "absolute" }}>
      <ThreeDeePanel context={context} />
    </div>
  );
};

function createMarker(): Marker {
  return {
    header: {
      stamp: { sec: 0, nsec: 0 },
      frame_id: "base_link",
    },
    ns: "",
    id: 0,
    type: MarkerType.CUBE,
    action: MarkerAction.ADD,
    pose: {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    scale: { x: 1, y: 1, z: 1 },
    color: { r: 1, g: 1, b: 1, a: 1 },
    lifetime: { sec: 0, nsec: 0 },
    frame_locked: false,
    points: [],
    colors: [],
    text: "",
    mesh_resource: "",
    mesh_use_embedded_materials: false,
  };
}
