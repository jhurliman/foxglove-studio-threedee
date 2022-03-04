/** @jsx jsx */
import { jsx } from "@emotion/react";
import { useEffect, useState } from "react";
import THREEStats from "three/examples/jsm/libs/stats.module";

import { Renderer } from "./Renderer";
import { useRenderer, useRendererEvent } from "./RendererContext";

let stats: THREEStats | undefined;
let drawCallsPanel: THREEStats.Panel | undefined;
let trianglesPanel: THREEStats.Panel | undefined;
let maxDrawCalls = 0;
let maxTriangles = 0;

function update(renderer: Renderer) {
  maxDrawCalls = Math.max(maxDrawCalls, renderer.gl.info.render.calls);
  maxTriangles = Math.max(maxTriangles, renderer.gl.info.render.triangles);
  drawCallsPanel?.update(renderer.gl.info.render.calls, maxDrawCalls);
  trianglesPanel?.update(renderer.gl.info.render.triangles, maxTriangles);
  stats?.update();
}

export function Stats(): JSX.Element {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const renderer = useRenderer();

  useRendererEvent("endFrame", () => renderer && update(renderer));

  useEffect(() => {
    if (!div) {
      return;
    }

    stats = THREEStats();
    stats.dom.style.position = "relative";
    stats.dom.style.zIndex = "auto";
    drawCallsPanel = THREEStats.Panel("draws", "red", "black");
    trianglesPanel = THREEStats.Panel("tris", "cyan", "black");
    stats.addPanel(drawCallsPanel);
    stats.addPanel(trianglesPanel);
    div.appendChild(stats.dom);
    stats.showPanel(0);
    return () => stats && void div.removeChild(stats.dom);
  }, [div]);

  return <div ref={setDiv} />;
}
