/** @jsxImportSource @emotion/react */
import { jsx } from '@emotion/react';

import { PanelExtensionContext, RenderState, Topic, MessageEvent } from "@foxglove/studio";
import React from "react";
import { useLayoutEffect, useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { DebugGui } from "./DebugGui";
import { Renderer } from "./Renderer";
import { RendererContext, useRendererEvent } from "./RendererContext";
import { Stats } from "./Stats";
import { TRANSFORM_STAMPED_DATATYPES, TF_DATATYPES } from "./ros";
import { TF } from "./transforms";
import { rosTimeToNanoSec } from "./transforms/time";

const SHOW_STATS = true;
const SHOW_DEBUG = false;

const EMPTY_LIST: string[] = [];

function RendererOverlay(): JSX.Element {
  const [selectedRenderable, setSelectedRenderable] = useState<THREE.Object3D | null>(null);
  useRendererEvent("renderableSelected", (renderable) => setSelectedRenderable(renderable));

  const stats = SHOW_STATS ? (
    <div css={{ position: "absolute", top: 0 }}>
      <Stats />
    </div>
  ) : undefined;

  const debug = SHOW_DEBUG ? (
    <div css={{ position: "absolute", top: 60 }}>
      <DebugGui />
    </div>
  ) : undefined;

  return (
    <React.Fragment>
      {stats}
      {debug}
      {selectedRenderable?.name ?? "no selected renderable"}
    </React.Fragment>
  );
}

export function ThreeDeePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderer = useMemo(() => (canvas ? new Renderer(canvas) : null), [canvas]);

  const [topics, setTopics] = useState<ReadonlyArray<Topic> | undefined>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageEvent<unknown>> | undefined>();
  const [currentTime, setCurrentTime] = useState<bigint | undefined>();

  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // We use a layout effect to setup render handling for our panel. We also setup some topic subscriptions.
  useLayoutEffect(() => {
    // The render handler is run by the broader studio system during playback when your panel
    // needs to render because the fields it is watching have changed. How you handle rendering depends on your framework.
    // You can only setup one render handler - usually early on in setting up your panel.
    //
    // Without a render handler your panel will never receive updates.
    //
    // The render handler could be invoked as often as 60hz during playback if fields are changing often.
    context.onRender = (renderState: RenderState, done) => {
      // This is a hack to extract the current time from the render state, until
      // <https://github.com/foxglove/studio/issues/1248> is implemented
      if (renderState.currentFrame) {
        const latest = getCurrentTime(renderState.currentFrame);
        if (latest != undefined) {
          setCurrentTime(latest);
        }
      }

      // render functions receive a _done_ callback. You MUST call this callback to indicate your panel has finished rendering.
      // Your panel will not receive another render callback until _done_ is called from a prior render. If your panel is not done
      // rendering before the next render call, studio shows a notification to the user that your panel is delayed.
      //
      // Set the done callback into a state variable to trigger a re-render.
      setRenderDone(done);

      // We may have new topics - since we are also watching for messages in the current frame, topics may not have changed
      // It is up to you to determine the correct action when state has not changed.
      setTopics(renderState.topics);

      // currentFrame has messages on subscribed topics since the last render call
      setMessages(renderState.currentFrame);
    };

    // After adding a render handler, you must indicate which fields from RenderState will trigger updates.
    // If you do not watch any fields then your panel will never render since the panel context will assume you do not want any updates.

    // Tell the panel context that we care about any update to the _topic_ field of RenderState
    context.watch("topics");

    // Tell the panel context we want messages for the current frame for topics we've subscribed to
    // This corresponds to the _currentFrame_ field of render state.
    context.watch("currentFrame");
  }, []);

  // Build a map from topic name to datatype
  const topicsToDatatypes = useMemo(() => {
    const map = new Map<string, string>();
    if (!topics) return map;
    for (const topic of topics) {
      map.set(topic.name, topic.datatype);
    }
    return map;
  }, [topics]);

  // Build a list of topics to subscribe to
  const topicsToSubscribe = useMemo(() => {
    const subscriptionList: string[] = [];
    if (!topics) {
      return EMPTY_LIST;
    }

    // Subscribe to all transform topics
    for (const topic of topics) {
      if (TF_DATATYPES.has(topic.datatype) || TRANSFORM_STAMPED_DATATYPES.has(topic.datatype)) {
        subscriptionList.push(topic.name);
      }
    }

    return subscriptionList;
  }, [topics]);

  // Notify the extension context when our subscription list changes
  useEffect(() => {
    console.info(`[ThreeDeePanel] Subscribing to [${topicsToSubscribe.join(", ")}]`);
    context.subscribe(topicsToSubscribe);
  }, [topicsToSubscribe]);

  // Keep the renderer currentTime up to date
  useEffect(() => {
    if (renderer && currentTime != undefined) {
      renderer.currentTime = currentTime;
    }
  }, [currentTime, renderer]);

  // Handle messages
  useEffect(() => {
    if (!messages || !renderer) return;

    for (const message of messages) {
      const datatype = topicsToDatatypes.get(message.topic);
      if (!datatype) continue;

      if (TF_DATATYPES.has(datatype)) {
        // tf2_msgs/TFMessage - Ingest the list of transforms into our TF tree
        const tfMessage = message.message as { transforms: TF[] };
        for (const tf of tfMessage.transforms) {
          renderer.addTransformMessage(tf);
        }
      } else if (TRANSFORM_STAMPED_DATATYPES.has(datatype)) {
        // geometry_msgs/TransformStamped - Ingest this single transform into our TF tree
        const tf = message.message as TF;
        renderer.addTransformMessage(tf);
      }
    }
  }, [messages, topicsToDatatypes]);

  // Invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <React.Fragment>
      <canvas ref={setCanvas} />
      <RendererContext.Provider value={renderer}>
        <RendererOverlay />
      </RendererContext.Provider>
    </React.Fragment>
  );
}

export function initThreeDeePanel(context: PanelExtensionContext) {
  ReactDOM.render(<ThreeDeePanel context={context} />, context.panelElement);
}

function getCurrentTime(currentFrame: readonly MessageEvent<unknown>[]): bigint | undefined {
  if (currentFrame.length === 0) return undefined;

  let maxTime = rosTimeToNanoSec(currentFrame[0]!.receiveTime);
  for (let i = 1; i < currentFrame.length; i++) {
    const message = currentFrame[i]!;
    const curTime = rosTimeToNanoSec(message.receiveTime);
    if (curTime > maxTime) maxTime = curTime;
  }
  return maxTime;
}
